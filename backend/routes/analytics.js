const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })
  : null

function getAdminEmails() {
  return process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : ['admin@nm2tech-sas.com', 'demo@nm2tech-sas.com']
}

// Middleware to get user from JWT token
const getUserFromToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    const token = authHeader.split(' ')[1]
    
    if (!token || !supabase) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

// Check if user is admin
const isAdmin = (req, res, next) => {
  const ADMIN_EMAILS = getAdminEmails()
  
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  
  next()
}

// Lightweight admin status endpoint for UI visibility checks (200 + isAdmin so frontend avoids 403 noise)
router.get('/admin-check', getUserFromToken, (req, res) => {
  const adminEmails = getAdminEmails()
  const email = req.user?.email?.toLowerCase()
  const isAdminUser = !!email && adminEmails.includes(email)
  return res.json({ isAdmin: !!isAdminUser })
})

// Get visitor statistics
router.get('/visitors', getUserFromToken, isAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(days))
    
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' })
    }
    
    // Get access logs
    const { data: logs, error } = await supabase
      .from('shorts_access_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000)
    
    if (error) {
      // Some environments may not have the optional access-log table yet.
      // Return an empty analytics payload so admin page can still load.
      const isMissingTable = error.code === 'PGRST205' || /shorts_access_logs/i.test(String(error.message || ''))
      if (isMissingTable) {
        console.warn('shorts_access_logs table missing; returning empty visitor stats')
        return res.json({
          total_visits: 0,
          unique_visitors: 0,
          unique_logged_in: 0,
          top_paths: [],
          top_users: [],
          visits_by_day: [],
          average_response_time: 0,
          recent_visits: [],
          warning: 'Visitor logs table is not configured yet.'
        })
      }
      console.error('Error fetching access logs:', error)
      return res.status(500).json({ error: 'Failed to fetch access logs' })
    }
    
    if (!logs || logs.length === 0) {
      return res.json({
        total_visits: 0,
        unique_visitors: 0,
        unique_logged_in: 0,
        top_paths: [],
        top_users: [],
        visits_by_day: [],
        average_response_time: 0
      })
    }
    
    // Aggregate statistics
    const uniqueVisitors = new Set()
    const uniqueLoggedIn = new Set()
    
    logs.forEach(log => {
      if (log.user_id) {
        uniqueLoggedIn.add(log.user_id)
        uniqueVisitors.add(log.user_id)
      } else if (log.ip_address) {
        uniqueVisitors.add(log.ip_address)
      }
    })
    
    const stats = {
      total_visits: logs.length,
      unique_visitors: uniqueVisitors.size,
      unique_logged_in: uniqueLoggedIn.size,
      top_paths: getTopPaths(logs),
      top_users: getTopUsers(logs),
      visits_by_day: getVisitsByDay(logs),
      average_response_time: Math.round(
        logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length
      ),
      recent_visits: logs.slice(0, 50).map(log => ({
        timestamp: log.created_at,
        user_email: log.user_email || 'Anonymous',
        path: log.path,
        method: log.method,
        status_code: log.status_code,
        response_time_ms: log.response_time_ms
      }))
    }
    
    res.json(stats)
  } catch (error) {
    console.error('Error fetching visitor stats:', error)
    res.status(500).json({ error: 'Failed to fetch visitor statistics' })
  }
})

// Community stats for Feed sidebar: public so all visitors (incl. non-admin) see member count and who joined
router.get('/community', async (req, res) => {
  try {
    if (!supabase) return res.json({ new_signups_7d: 0, new_signups_30d: 0, total_users: 0, recent_signups: [] })
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const [r7, r30, totalUsersResult, recentProfiles] = await Promise.all([
      supabase.from('shorts_user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('shorts_user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('shorts_user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('shorts_user_profiles').select('user_id, name, created_at, avatar_url').order('created_at', { ascending: false }).limit(10)
    ])
    const total_users = totalUsersResult?.count ?? 0
    return res.json({
      new_signups_7d: r7?.count ?? 0,
      new_signups_30d: r30?.count ?? 0,
      total_users: total_users,
      recent_signups: (recentProfiles?.data || []).map((p) => ({ name: p.name || 'Anonymous', created_at: p.created_at, user_id: p.user_id, avatar_url: p.avatar_url || null }))
    })
  } catch (e) {
    console.error('community:', e)
    return res.json({ new_signups_7d: 0, new_signups_30d: 0, total_users: 0, recent_signups: [] })
  }
})

// Lightweight "new members" summary for admin Feed banner (no full usage payload)
router.get('/new-members', getUserFromToken, isAdmin, async (req, res) => {
  try {
    if (!supabase) return res.json({ new_signups_7d: 0, new_signups_30d: 0, total_users: 0, recent_signups: [] })
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const [r7, r30, totalUsersResult, recentProfiles] = await Promise.all([
      supabase.from('shorts_user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('shorts_user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('shorts_user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('shorts_user_profiles').select('user_id, name, created_at, avatar_url').order('created_at', { ascending: false }).limit(10)
    ])
    const total_users = totalUsersResult?.count ?? 0
    return res.json({
      new_signups_7d: r7?.count ?? 0,
      new_signups_30d: r30?.count ?? 0,
      total_users: total_users,
      recent_signups: (recentProfiles?.data || []).map((p) => ({ name: p.name || 'Anonymous', created_at: p.created_at, user_id: p.user_id, avatar_url: p.avatar_url || null }))
    })
  } catch (e) {
    console.error('new-members:', e)
    return res.json({ new_signups_7d: 0, new_signups_30d: 0, total_users: 0, recent_signups: [] })
  }
})

// Get usage statistics (uploads, insights, etc.)
router.get('/usage', getUserFromToken, isAdmin, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' })
    }
    
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const now = new Date()
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Get total users
    const { count: totalUsers } = await supabase
      .from('shorts_user_profiles')
      .select('*', { count: 'exact', head: true })
    
    // New signups (profiles created in last 7 and 30 days)
    const [r7, r30, recentProfiles] = await Promise.all([
      supabase.from('shorts_user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('shorts_user_profiles').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
      supabase.from('shorts_user_profiles').select('user_id, name, created_at').order('created_at', { ascending: false }).limit(10)
    ])
    
    // Get active users this month (users who uploaded files)
    const { count: activeUsers } = await supabase
      .from('shorts_file_uploads')
      .select('user_id', { count: 'exact' })
      .gte('upload_date', startOfMonth.toISOString())
    
    // Get total uploads this month
    const { count: totalUploads } = await supabase
      .from('shorts_file_uploads')
      .select('*', { count: 'exact', head: true })
      .gte('upload_date', startOfMonth.toISOString())
    
    // Get total AI insights this month
    const { count: totalInsights } = await supabase
      .from('shorts_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'insight')
      .gte('created_at', startOfMonth.toISOString())
    
    // Get subscriptions by plan
    const { data: subscriptions } = await supabase
      .from('shorts_subscriptions')
      .select('plan, status')
    
    const planCounts = {
      free: 0,
      pro: 0,
      enterprise: 0,
      active: 0
    }
    
    subscriptions?.forEach(sub => {
      if (sub.plan) planCounts[sub.plan] = (planCounts[sub.plan] || 0) + 1
      if (sub.status === 'active') planCounts.active++
    })
    
    res.json({
      total_users: totalUsers || 0,
      new_signups_7d: r7?.count ?? 0,
      new_signups_30d: r30?.count ?? 0,
      recent_signups: (recentProfiles?.data || []).map((p) => ({ name: p.name || 'Anonymous', created_at: p.created_at, user_id: p.user_id })),
      active_users_this_month: activeUsers || 0,
      total_uploads_this_month: totalUploads || 0,
      total_insights_this_month: totalInsights || 0,
      subscriptions: planCounts
    })
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    res.status(500).json({ error: 'Failed to fetch usage statistics' })
  }
})

function getTopPaths(logs) {
  const pathCounts = {}
  logs.forEach(log => {
    const path = log.path || 'unknown'
    pathCounts[path] = (pathCounts[path] || 0) + 1
  })
  return Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))
}

function getTopUsers(logs) {
  const userCounts = {}
  logs
    .filter(l => l.user_email)
    .forEach(log => {
      userCounts[log.user_email] = (userCounts[log.user_email] || 0) + 1
    })
  return Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }))
}

function getVisitsByDay(logs) {
  const dayCounts = {}
  logs.forEach(log => {
    if (log.created_at) {
      const day = new Date(log.created_at).toISOString().split('T')[0]
      dayCounts[day] = (dayCounts[day] || 0) + 1
    }
  })
  return Object.entries(dayCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }))
}

module.exports = router

