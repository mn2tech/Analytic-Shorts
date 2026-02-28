const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { requireAuth } = require('../middleware/requireAuth')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null

// Update current user's last_seen_at (presence heartbeat). Call periodically when app is open.
// Never returns 500 so the frontend doesn't break; logs errors and returns 200 with ok: false.
router.post('/me/seen', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId || !supabase) {
      return res.status(400).json({ error: 'Invalid request' })
    }
    const now = new Date().toISOString()
    const name = req.user?.user_metadata?.name || req.user?.email || 'Anonymous'

    const updatePayload = { last_seen_at: now, updated_at: now }
    const { data: byUser, error: errUser } = await supabase
      .from('shorts_user_profiles')
      .update(updatePayload)
      .eq('user_id', userId)
      .select('user_id, last_seen_at')
      .maybeSingle()

    if (byUser) {
      return res.json({ ok: true, last_seen_at: byUser.last_seen_at })
    }
    if (!errUser) {
      // No error but no row: try by id
      const { data: byId } = await supabase
        .from('shorts_user_profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select('last_seen_at')
        .maybeSingle()
      if (byId) return res.json({ ok: true, last_seen_at: byId.last_seen_at })
    } else {
      console.warn('profiles me/seen update error:', errUser.message || errUser)
    }

    // No row or update failed: ensure profile exists then set last_seen_at (upsert with last_seen_at)
    const { error: upsertErr } = await supabase
      .from('shorts_user_profiles')
      .upsert(
        { id: userId, user_id: userId, name, last_seen_at: now, updated_at: now },
        { onConflict: 'id' }
      )
    if (upsertErr) {
      console.warn('profiles me/seen upsert error:', upsertErr.message || upsertErr)
      return res.json({ ok: false, hint: 'Run database/migration_add_last_seen.sql if last_seen_at column is missing' })
    }
    return res.json({ ok: true, last_seen_at: now })
  } catch (e) {
    console.error('profiles me/seen:', e)
    return res.json({ ok: false })
  }
})

// Ensure current user has a profile row (creates one if missing). Call after signup so "joining" = profile exists.
router.post('/ensure', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id
    if (!userId || !supabase) {
      return res.status(400).json({ error: 'Invalid request' })
    }
    const name = req.user?.user_metadata?.name || req.user?.email || 'Anonymous'
    await supabase
      .from('shorts_user_profiles')
      .upsert(
        { id: userId, user_id: userId, name },
        { onConflict: 'id', ignoreDuplicates: true }
      )
    const { data, error } = await supabase
      .from('shorts_user_profiles')
      .select('user_id, name, avatar_url')
      .eq('user_id', userId)
      .single()
    if (error || !data) {
      console.error('profiles ensure:', error)
      return res.status(500).json({ error: 'Failed to ensure profile' })
    }
    return res.json(data)
  } catch (e) {
    console.error('profiles ensure:', e)
    return res.status(500).json({ error: 'Failed to ensure profile' })
  }
})

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
      .select('user_id, name, avatar_url, preferences, last_seen_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (!error && !data) {
      const byId = await supabase
        .from('shorts_user_profiles')
        .select('user_id, name, avatar_url, preferences, last_seen_at')
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

    // Get email and last_sign_in_at from auth (service role can use admin API)
    let email = null
    let last_login_at = null
    try {
      if (typeof supabase.auth?.admin?.getUserById === 'function') {
        const { data: authData } = await supabase.auth.admin.getUserById(data.user_id)
        const user = authData?.user ?? authData
        if (user?.email) email = String(user.email)
        if (user?.last_sign_in_at) last_login_at = user.last_sign_in_at
      }
    } catch (_) {
      // ignore
    }

    const lastSeenAt = data.last_seen_at || null
    const ONLINE_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes
    const is_online = lastSeenAt && (Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS)

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
      email: email || null,
      avatar_url: data.avatar_url || null,
      avatar_focal: focal || null,
      last_login_at: last_login_at || null,
      last_seen_at: lastSeenAt || null,
      is_online: !!is_online,
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
