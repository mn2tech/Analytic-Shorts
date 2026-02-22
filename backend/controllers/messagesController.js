const { getSupabaseAdmin } = require('../utils/supabaseAdmin')

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

// GET /api/messages - list my conversations (other user + last message)
async function getConversations(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const db = getAdmin()

    const { data: messages, error } = await db
      .from('direct_messages')
      .select('id, from_user_id, to_user_id, body, created_at, read_at')
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) throw error

    const seen = new Set()
    const conversations = []
    for (const m of messages || []) {
      const otherId = m.from_user_id === userId ? m.to_user_id : m.from_user_id
      const key = otherId
      if (seen.has(key)) continue
      seen.add(key)
      conversations.push({
        other_user_id: otherId,
        last_message: m.body,
        last_at: m.created_at,
        last_from_me: m.from_user_id === userId,
        unread: m.to_user_id === userId && !m.read_at
      })
    }

    if (conversations.length === 0) {
      return res.json({ conversations: [] })
    }

    const otherIds = [...new Set(conversations.map((c) => c.other_user_id))]
    const { data: profiles } = await db
      .from('shorts_user_profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', otherIds)

    const names = {}
    const avatars = {}
    ;(profiles || []).forEach((p) => {
      names[p.user_id] = p.name || null
      avatars[p.user_id] = p.avatar_url || null
    })

    const withNames = conversations.map((c) => ({
      ...c,
      other_display_name: names[c.other_user_id] || `User ${String(c.other_user_id).slice(0, 8)}…`,
      other_avatar_url: avatars[c.other_user_id] || null
    }))

    const total_unread = (conversations || []).filter((c) => c.unread).length
    res.json({ conversations: withNames, total_unread })
  } catch (err) {
    console.error('getConversations:', err)
    res.status(500).json({ error: err.message || 'Failed to load conversations' })
  }
}

// GET /api/messages/unread-count - lightweight count for nav badge
async function getUnreadCount(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const db = getAdmin()
    const { count, error } = await db
      .from('direct_messages')
      .select('id', { count: 'exact', head: true })
      .eq('to_user_id', userId)
      .is('read_at', null)
    if (error) throw error
    res.json({ unread_count: count ?? 0 })
  } catch (err) {
    console.error('getUnreadCount:', err)
    res.status(500).json({ error: err.message || 'Failed to get unread count' })
  }
}

// GET /api/messages?with=:userId - get thread with a user
async function getThread(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const withUserId = req.query.with
    if (!withUserId) return res.status(400).json({ error: 'Query "with" (user id) required' })
    if (withUserId === userId) return res.status(400).json({ error: 'Cannot load thread with yourself' })

    const db = getAdmin()
    // Mark as read: messages in this thread sent to the current user
    await db
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('to_user_id', userId)
      .eq('from_user_id', withUserId)
      .is('read_at', null)

    // Fetch messages in both directions (A->B or B->A). PostgREST expects quoted UUIDs in .or().
    const q1 = `from_user_id.eq.${userId},to_user_id.eq.${withUserId}`
    const q2 = `from_user_id.eq.${withUserId},to_user_id.eq.${userId}`
    const { data: messages, error } = await db
      .from('direct_messages')
      .select('id, from_user_id, to_user_id, body, created_at, read_at')
      .or(`and(${q1}),and(${q2})`)
      .order('created_at', { ascending: true })

    if (error) throw error

    const { data: profile } = await db
      .from('shorts_user_profiles')
      .select('user_id, name, avatar_url')
      .eq('user_id', withUserId)
      .maybeSingle()

    res.json({
      messages: messages || [],
      other_user_id: withUserId,
      other_display_name: profile?.name || `User ${String(withUserId).slice(0, 8)}…`,
      other_avatar_url: profile?.avatar_url || null
    })
  } catch (err) {
    console.error('getThread:', err)
    res.status(500).json({ error: err.message || 'Failed to load thread' })
  }
}

// POST /api/messages - send a message
async function sendMessage(req, res) {
  try {
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { to_user_id, body } = req.body
    if (!to_user_id || typeof body !== 'string') {
      return res.status(400).json({ error: 'to_user_id and body are required' })
    }
    if (to_user_id === userId) {
      return res.status(400).json({ error: 'Cannot message yourself' })
    }

    const db = getAdmin()
    const { data: msg, error } = await db
      .from('direct_messages')
      .insert({
        from_user_id: userId,
        to_user_id: to_user_id,
        body: String(body).trim().slice(0, 10000)
      })
      .select('id, from_user_id, to_user_id, body, created_at')
      .single()

    if (error) throw error
    res.status(201).json(msg)
  } catch (err) {
    console.error('sendMessage:', err)
    res.status(500).json({ error: err.message || 'Failed to send message' })
  }
}

module.exports = {
  getConversations,
  getThread,
  sendMessage,
  getUnreadCount
}
