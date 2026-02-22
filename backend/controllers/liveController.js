const crypto = require('crypto')
const { getSupabaseAdmin } = require('../utils/supabaseAdmin')

function randomRoomSuffix() {
  return crypto.randomBytes(8).toString('hex')
}

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

// POST /api/posts/:id/live-sessions - create or reuse active session
async function createOrGetLiveSession(req, res) {
  try {
    const { id: postId } = req.params
    const db = getAdmin()
    const userId = req.user.id

    const { data: post, error: postErr } = await db.from('posts').select('id, visibility, author_id').eq('id', postId).single()
    if (postErr || !post) return res.status(404).json({ error: 'Post not found' })
    if (post.visibility !== 'public' && post.author_id !== userId) {
      return res.status(403).json({ error: 'Not allowed to start live for this post' })
    }

    const { data: existing } = await db
      .from('live_sessions')
      .select('id, room_name')
      .eq('post_id', postId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (existing) {
      await db.from('live_session_participants').insert({
        session_id: existing.id,
        user_id: userId,
        role: 'viewer',
        display_name: req.user.email || req.user.id
      }).then(() => {}).catch(() => {})
      return res.json({ sessionId: existing.id, roomName: existing.room_name })
    }

    const roomName = `as-post-${postId}-${randomRoomSuffix()}`
    const { data: session, error: insErr } = await db
      .from('live_sessions')
      .insert({
        post_id: postId,
        room_name: roomName,
        created_by: userId,
        status: 'active'
      })
      .select()
      .single()
    if (insErr) throw insErr

    await db.from('live_session_participants').insert({
      session_id: session.id,
      user_id: userId,
      role: 'host',
      display_name: req.user.email || req.user.id
    }).then(() => {}).catch(() => {})

    res.status(201).json({ sessionId: session.id, roomName: session.room_name })
  } catch (err) {
    console.error('createOrGetLiveSession:', err)
    res.status(500).json({ error: err.message || 'Failed to create live session' })
  }
}

// GET /api/live/:sessionId
async function getLiveSession(req, res) {
  try {
    const { sessionId } = req.params
    const db = getAdmin()
    const { data: session, error } = await db
      .from('live_sessions')
      .select('id, post_id, room_name, created_by, status, created_at, ended_at')
      .eq('id', sessionId)
      .single()
    if (error || !session) return res.status(404).json({ error: 'Live session not found' })
    const { data: post } = await db.from('posts').select('id, visibility, author_id').eq('id', session.post_id).single()
    if (!post) return res.status(404).json({ error: 'Post not found' })
    const uid = req.user ? req.user.id : null
    if (post.visibility !== 'public' && post.author_id !== uid) {
      return res.status(404).json({ error: 'Live session not found' })
    }
    res.json(session)
  } catch (err) {
    console.error('getLiveSession:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch live session' })
  }
}

// POST /api/live/:sessionId/end
async function endLiveSession(req, res) {
  try {
    const { sessionId } = req.params
    const db = getAdmin()
    const userId = req.user.id
    const { data: session, error } = await db.from('live_sessions').select('id, created_by, status').eq('id', sessionId).single()
    if (error || !session) return res.status(404).json({ error: 'Live session not found' })
    if (session.created_by !== userId) {
      return res.status(403).json({ error: 'Only the host can end the session' })
    }
    if (session.status === 'ended') {
      return res.json({ message: 'Session already ended', status: 'ended' })
    }
    await db.from('live_sessions').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', sessionId)
    res.json({ message: 'Session ended', status: 'ended' })
  } catch (err) {
    console.error('endLiveSession:', err)
    res.status(500).json({ error: err.message || 'Failed to end session' })
  }
}

// GET /api/posts/:postId/active-session - get active live session for a post (if any)
async function getActiveSessionForPost(req, res) {
  try {
    const { postId } = req.params
    const db = getAdmin()
    const { data: session } = await db
      .from('live_sessions')
      .select('id, room_name, status')
      .eq('post_id', postId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()
    const { data: post } = session
      ? await db.from('posts').select('id, visibility, author_id').eq('id', postId).single()
      : { data: null }
    if (!post) return res.json({ session: null })
    const uid = req.user ? req.user.id : null
    if (post.visibility !== 'public' && post.author_id !== uid) return res.json({ session: null })
    res.json({ session: session || null })
  } catch (err) {
    console.error('getActiveSessionForPost:', err)
    res.status(500).json({ error: err.message || 'Failed to check session' })
  }
}

module.exports = {
  createOrGetLiveSession,
  getLiveSession,
  endLiveSession,
  getActiveSessionForPost
}
