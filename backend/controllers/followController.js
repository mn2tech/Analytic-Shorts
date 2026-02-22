const { getSupabaseAdmin } = require('../utils/supabaseAdmin')

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

// POST /api/follow/:userId - follow a user
async function follow(req, res) {
  try {
    const followerId = req.user?.id
    if (!followerId) return res.status(401).json({ error: 'Authentication required' })
    const followingId = req.params.userId
    if (!followingId || followingId === followerId) {
      return res.status(400).json({ error: 'Cannot follow yourself' })
    }
    const db = getAdmin()
    const { error } = await db.from('follows').insert({
      follower_id: followerId,
      following_id: followingId
    })
    if (error) {
      if (error.code === '23505') return res.json({ following: true }) // already following
      throw error
    }
    res.status(201).json({ following: true })
  } catch (err) {
    console.error('follow:', err)
    res.status(500).json({ error: err.message || 'Failed to follow' })
  }
}

// DELETE /api/follow/:userId - unfollow a user
async function unfollow(req, res) {
  try {
    const followerId = req.user?.id
    if (!followerId) return res.status(401).json({ error: 'Authentication required' })
    const followingId = req.params.userId
    if (!followingId) return res.status(400).json({ error: 'user id required' })
    const db = getAdmin()
    const { error } = await db.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId)
    if (error) throw error
    res.json({ following: false })
  } catch (err) {
    console.error('unfollow:', err)
    res.status(500).json({ error: err.message || 'Failed to unfollow' })
  }
}

// GET /api/follow/check?user_id=xxx - am I following this user?
async function check(req, res) {
  try {
    const followerId = req.user?.id
    if (!followerId) return res.status(401).json({ error: 'Authentication required' })
    const followingId = req.query.user_id
    if (!followingId) return res.status(400).json({ error: 'user_id query required' })
    const db = getAdmin()
    const { data, error } = await db.from('follows').select('id').eq('follower_id', followerId).eq('following_id', followingId).maybeSingle()
    if (error) throw error
    res.json({ following: !!data })
  } catch (err) {
    console.error('follow check:', err)
    res.status(500).json({ error: err.message || 'Failed to check follow' })
  }
}

module.exports = { follow, unfollow, check }
