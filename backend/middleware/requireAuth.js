const { getSupabaseAdmin } = require('../utils/supabaseAdmin')

/**
 * Sets req.user from Authorization: Bearer <token> using Supabase auth.
 * Use on routes that require an authenticated user.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const token = authHeader.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' })
    }
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error) {
      return res.status(401).json({ error: 'Invalid or expired token', details: error.message })
    }
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Invalid token - no user found' })
    }
    req.user = user
    next()
  } catch (err) {
    console.error('requireAuth error:', err)
    return res.status(401).json({ error: 'Authentication failed', details: err.message })
  }
}

/**
 * Optional auth: sets req.user if Bearer token present, otherwise req.user = null.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null
      return next()
    }
    const token = authHeader.split(' ')[1]
    if (!token) {
      req.user = null
      return next()
    }
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      req.user = null
      return next()
    }
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user?.id) {
      req.user = null
      return next()
    }
    req.user = user
    next()
  } catch (_) {
    req.user = null
    next()
  }
}

module.exports = { requireAuth, optionalAuth }
