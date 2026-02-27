const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null

// Public profile by user id (name, avatar) for profile page and links
// Table may use id or user_id as lookup (both are set to auth user id)
router.get('/:userId', async (req, res) => {
  try {
    const userId = (req.params.userId || '').trim()
    if (!userId || !supabase) {
      return res.status(400).json({ error: 'Invalid request' })
    }
    let { data, error } = await supabase
      .from('shorts_user_profiles')
      .select('user_id, name, avatar_url, preferences')
      .eq('user_id', userId)
      .maybeSingle()

    if (!error && !data) {
      const byId = await supabase
        .from('shorts_user_profiles')
        .select('user_id, name, avatar_url, preferences')
        .eq('id', userId)
        .maybeSingle()
      if (byId.error) {
        error = byId.error
      } else {
        data = byId.data
      }
    }

    if (error) {
      console.error('profiles get:', error)
      return res.status(500).json({ error: 'Failed to load profile' })
    }
    if (!data) {
      return res.status(404).json({ error: 'Profile not found' })
    }
    const focal = data.preferences?.avatar_focal

    // Dashboards by this user (public list: id, name, updated_at) and total count
    const [dashboardsResult, countResult] = await Promise.all([
      supabase
        .from('shorts_dashboards')
        .select('id, name, updated_at')
        .eq('user_id', data.user_id)
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase.from('shorts_dashboards').select('id', { count: 'exact', head: true }).eq('user_id', data.user_id)
    ])
    const dashboardsRows = dashboardsResult.data || []
    const dashboard_count = countResult.count ?? 0

    // Post count (public posts by this user)
    const { count: post_count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', data.user_id)
      .eq('visibility', 'public')

    // Map dashboard_id -> share_id from their public posts that have a share
    const { data: postsWithShare } = await supabase
      .from('posts')
      .select('dashboard_id, share_id')
      .eq('author_id', data.user_id)
      .not('share_id', 'is', null)

    const shareByDashboard = {}
    ;(postsWithShare || []).forEach((p) => {
      if (p.dashboard_id && p.share_id) shareByDashboard[p.dashboard_id] = p.share_id
    })

    const dashboards = dashboardsRows.map((d) => ({
      id: d.id,
      name: d.name || 'Untitled',
      updated_at: d.updated_at,
      share_url: shareByDashboard[d.id] ? `/dashboard/shared/${shareByDashboard[d.id]}` : null
    }))

    return res.json({
      user_id: data.user_id,
      name: data.name || 'Anonymous',
      avatar_url: data.avatar_url || null,
      avatar_focal: focal || null,
      dashboard_count,
      dashboards,
      post_count: post_count ?? 0
    })
  } catch (e) {
    console.error('profiles:', e)
    return res.status(500).json({ error: 'Failed to load profile' })
  }
})

module.exports = router
