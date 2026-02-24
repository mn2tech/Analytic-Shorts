const crypto = require('crypto')
const { getSupabaseAdmin } = require('../utils/supabaseAdmin')

function nanoidLike() {
  return crypto.randomBytes(8).toString('hex')
}

function getAdmin() {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Database not configured')
  return admin
}

// POST /api/posts
async function createPost(req, res) {
  try {
    const { dashboardId, title, caption, tags, visibility, thumbnailUrl, shareId } = req.body
    if (!dashboardId || !title) {
      return res.status(400).json({ error: 'dashboardId and title are required' })
    }
    const db = getAdmin()
    const insert = {
      dashboard_id: String(dashboardId),
      author_id: req.user.id,
      title: String(title).trim(),
      caption: caption != null ? String(caption).trim() : null,
      tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      visibility: ['private', 'org', 'public', 'unlisted'].includes(visibility) ? visibility : 'public'
    }
    if (thumbnailUrl != null && String(thumbnailUrl).trim()) {
      insert.thumbnail_url = String(thumbnailUrl).trim()
    }
    if (shareId != null && String(shareId).trim()) {
      insert.share_id = String(shareId).trim()
    }
    const { data, error } = await db.from('posts').insert(insert).select().single()
    if (error) throw error
    res.status(201).json(data)
  } catch (err) {
    console.error('createPost:', err)
    res.status(500).json({ error: err.message || 'Failed to create post' })
  }
}

// GET /api/feed?scope=public|mine|all|following|saved|trending
async function getFeed(req, res) {
  try {
    const scope = (req.query.scope || 'public').toLowerCase().trim()
    const db = getAdmin()
    const userId = req.user ? req.user.id : null

    let query = db.from('posts').select('*')
    if (scope === 'mine') {
      if (!userId) return res.status(401).json({ error: 'Authentication required for scope=mine' })
      query = query.eq('author_id', userId)
    } else if (scope === 'following') {
      if (!userId) return res.status(401).json({ error: 'Authentication required for scope=following' })
      const { data: followRows } = await db.from('follows').select('following_id').eq('follower_id', userId)
      const followingIds = (followRows || []).map(r => r.following_id).filter(Boolean)
      if (followingIds.length === 0) {
        return res.json({ posts: [], scope: 'following' })
      }
      query = query.in('author_id', followingIds).eq('visibility', 'public')
    } else if (scope === 'all') {
      if (!userId) return res.status(401).json({ error: 'Authentication required for scope=all' })
      query = query.or(`visibility.eq.public,author_id.eq.${userId}`)
    } else if (scope === 'saved') {
      if (!userId) return res.status(401).json({ error: 'Authentication required for scope=saved' })
      const { data: saveRows } = await db.from('post_saves').select('post_id').eq('user_id', userId)
      const savedPostIds = (saveRows || []).map(r => r.post_id).filter(Boolean)
      if (savedPostIds.length === 0) {
        return res.json({ posts: [], scope: 'saved' })
      }
      query = query.in('id', savedPostIds)
    } else {
      // public | trending (trending re-sorts by likes later)
      query = query.eq('visibility', 'public')
    }
    const { data: posts, error: postsErr } = await query.order('created_at', { ascending: false })
    if (postsErr) throw postsErr
    if (!posts || posts.length === 0) {
      return res.json({ posts: [], scope })
    }

    const authorIds = [...new Set(posts.map(p => p.author_id).filter(Boolean))]
    let authorNames = {}
    let authorAvatars = {}
    let authorFocals = {}
    if (authorIds.length > 0) {
      const { data: profiles } = await db.from('shorts_user_profiles').select('user_id, name, avatar_url, preferences').in('user_id', authorIds)
      if (profiles) {
        profiles.forEach(p => {
          authorNames[p.user_id] = p.name || null
          authorAvatars[p.user_id] = p.avatar_url || null
          const focal = p.preferences?.avatar_focal
          authorFocals[p.user_id] = focal && typeof focal.x === 'number' && typeof focal.y === 'number' ? focal : null
        })
      }
    }

    const postIds = posts.map(p => p.id)
    const [likesRes, commentsRes, savesRes] = await Promise.all([
      db.from('post_likes').select('post_id').in('post_id', postIds),
      db.from('post_comments').select('post_id').in('post_id', postIds),
      userId ? db.from('post_saves').select('post_id').eq('user_id', userId).in('post_id', postIds) : Promise.resolve({ data: [] })
    ])
    const likeCounts = {}
    const commentCounts = {}
    const savedSet = new Set((savesRes.data || []).map(r => r.post_id))
    ;(likesRes.data || []).forEach(r => { likeCounts[r.post_id] = (likeCounts[r.post_id] || 0) + 1 })
    ;(commentsRes.data || []).forEach(r => { commentCounts[r.post_id] = (commentCounts[r.post_id] || 0) + 1 })

    const likeRows = likesRes.data || []
    const likeCountByPost = {}
    likeRows.forEach(r => { likeCountByPost[r.post_id] = (likeCountByPost[r.post_id] || 0) + 1 })
    const likedByMe = new Set()
    const followedAuthors = new Set()
    if (userId) {
      const [myLikesRes, myFollowsRes] = await Promise.all([
        db.from('post_likes').select('post_id').eq('user_id', userId).in('post_id', postIds),
        db.from('follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds)
      ])
      ;(myLikesRes.data || []).forEach(r => likedByMe.add(r.post_id))
      ;(myFollowsRes.data || []).forEach(r => followedAuthors.add(r.following_id))
    }

    let postsWithCounts = posts.map(p => ({
      ...p,
      author_display_name: authorNames[p.author_id] || null,
      author_avatar_url: authorAvatars[p.author_id] || null,
      author_avatar_focal: authorFocals[p.author_id] || null,
      like_count: likeCountByPost[p.id] || 0,
      comment_count: commentCounts[p.id] || 0,
      saved_by_me: savedSet.has(p.id),
      liked_by_me: likedByMe.has(p.id),
      author_followed_by_me: followedAuthors.has(p.author_id)
    }))
    if (scope === 'trending') {
      postsWithCounts = postsWithCounts.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
    }
    res.json({ posts: postsWithCounts, scope })
  } catch (err) {
    console.error('getFeed:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch feed' })
  }
}

// GET /api/posts/:id
async function getPost(req, res) {
  try {
    const { id } = req.params
    const db = getAdmin()
    const { data: post, error } = await db.from('posts').select('*').eq('id', id).single()
    if (error || !post) {
      return res.status(404).json({ error: 'Post not found' })
    }
    if (post.visibility !== 'public' && post.author_id !== (req.user && req.user.id)) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const authorFollowed = req.user && post.author_id && post.author_id !== req.user.id
      ? await db.from('follows').select('id').eq('follower_id', req.user.id).eq('following_id', post.author_id).maybeSingle()
      : { data: null }
    const [likeCount, commentCount, saved, liked, profile] = await Promise.all([
      db.from('post_likes').select('id', { count: 'exact', head: true }).eq('post_id', id),
      db.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', id),
      req.user ? db.from('post_saves').select('id').eq('post_id', id).eq('user_id', req.user.id).maybeSingle() : Promise.resolve({ data: null }),
      req.user ? db.from('post_likes').select('id').eq('post_id', id).eq('user_id', req.user.id).maybeSingle() : Promise.resolve({ data: null }),
      post.author_id ? db.from('shorts_user_profiles').select('name, avatar_url, preferences').eq('user_id', post.author_id).maybeSingle() : Promise.resolve({ data: null })
    ])
    const focal = profile.data?.preferences?.avatar_focal
    const authorAvatarFocal = focal && typeof focal.x === 'number' && typeof focal.y === 'number' ? focal : null
    res.json({
      ...post,
      author_display_name: profile.data?.name || null,
      author_avatar_url: profile.data?.avatar_url || null,
      author_avatar_focal: authorAvatarFocal,
      like_count: likeCount.count ?? 0,
      comment_count: commentCount.count ?? 0,
      saved_by_me: !!saved.data,
      liked_by_me: !!liked.data,
      author_followed_by_me: !!authorFollowed.data
    })
  } catch (err) {
    console.error('getPost:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch post' })
  }
}

// POST /api/posts/:id/like (toggle)
async function toggleLike(req, res) {
  try {
    const { id } = req.params
    const db = getAdmin()
    const userId = req.user.id
    const { data: existing } = await db.from('post_likes').select('id').eq('post_id', id).eq('user_id', userId).maybeSingle()
    if (existing) {
      await db.from('post_likes').delete().eq('post_id', id).eq('user_id', userId)
      const { count } = await db.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', id)
      return res.json({ liked: false, like_count: count ?? 0 })
    }
    await db.from('post_likes').insert({ post_id: id, user_id: userId })
    const { count } = await db.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', id)
    res.json({ liked: true, like_count: count ?? 0 })
  } catch (err) {
    console.error('toggleLike:', err)
    res.status(500).json({ error: err.message || 'Failed to toggle like' })
  }
}

// POST /api/posts/:id/save (toggle)
async function toggleSave(req, res) {
  try {
    const { id } = req.params
    const db = getAdmin()
    const userId = req.user.id
    const { data: existing } = await db.from('post_saves').select('id').eq('post_id', id).eq('user_id', userId).maybeSingle()
    if (existing) {
      await db.from('post_saves').delete().eq('post_id', id).eq('user_id', userId)
      return res.json({ saved: false })
    }
    await db.from('post_saves').insert({ post_id: id, user_id: userId })
    res.json({ saved: true })
  } catch (err) {
    console.error('toggleSave:', err)
    res.status(500).json({ error: err.message || 'Failed to toggle save' })
  }
}

// GET /api/posts/:id/comments
async function getComments(req, res) {
  try {
    const { id } = req.params
    const db = getAdmin()
    const { data: post } = await db.from('posts').select('id, visibility, author_id').eq('id', id).single()
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.visibility !== 'public' && post.author_id !== (req.user && req.user.id)) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const { data: comments, error } = await db
      .from('post_comments')
      .select('id, post_id, user_id, comment, created_at')
      .eq('post_id', id)
      .order('created_at', { ascending: true })
    if (error) throw error
    const list = comments || []
    const userIds = [...new Set(list.map((c) => c.user_id).filter(Boolean))]
    let namesByUser = {}
    if (userIds.length > 0) {
      const { data: profiles } = await db.from('shorts_user_profiles').select('user_id, name').in('user_id', userIds)
      ;(profiles || []).forEach((p) => { namesByUser[p.user_id] = p.name || null })
    }
    const commentsWithNames = list.map((c) => ({
      ...c,
      author_display_name: namesByUser[c.user_id] || null
    }))
    res.json({ comments: commentsWithNames })
  } catch (err) {
    console.error('getComments:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch comments' })
  }
}

// POST /api/posts/:id/comments
async function addComment(req, res) {
  try {
    const { id } = req.params
    const { comment } = req.body
    if (!comment || !String(comment).trim()) {
      return res.status(400).json({ error: 'comment is required' })
    }
    const db = getAdmin()
    const { data: post } = await db.from('posts').select('id, visibility, author_id').eq('id', id).single()
    if (!post) return res.status(404).json({ error: 'Post not found' })
    if (post.visibility !== 'public' && post.author_id !== req.user.id) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const { data: row, error } = await db
      .from('post_comments')
      .insert({ post_id: id, user_id: req.user.id, comment: String(comment).trim() })
      .select()
      .single()
    if (error) throw error
    const { data: profile } = await db.from('shorts_user_profiles').select('name').eq('user_id', req.user.id).maybeSingle()
    res.status(201).json({ ...row, author_display_name: profile?.name || null })
  } catch (err) {
    console.error('addComment:', err)
    res.status(500).json({ error: err.message || 'Failed to add comment' })
  }
}

// PATCH /api/posts/:id - update post (author only)
async function updatePost(req, res) {
  try {
    const { id } = req.params
    const db = getAdmin()
    const userId = req.user.id
    const { data: post, error: postErr } = await db.from('posts').select('*').eq('id', id).single()
    if (postErr || !post) return res.status(404).json({ error: 'Post not found' })
    if (post.author_id !== userId) return res.status(403).json({ error: 'Only the author can edit this post' })
    const { title, caption, tags, visibility, thumbnailUrl } = req.body
    const updates = {}
    if (title !== undefined) updates.title = String(title).trim() || post.title || 'Untitled'
    if (caption !== undefined) updates.caption = caption == null ? null : String(caption).trim()
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : post.tags)
    if (visibility !== undefined && ['private', 'org', 'public', 'unlisted'].includes(visibility)) updates.visibility = visibility
    if (thumbnailUrl !== undefined) updates.thumbnail_url = thumbnailUrl == null || thumbnailUrl === '' ? null : String(thumbnailUrl).trim()
    if (Object.keys(updates).length === 0) return res.json(post)
    const { data: updated, error: updErr } = await db.from('posts').update(updates).eq('id', id).eq('author_id', userId).select().single()
    if (updErr) throw updErr
    res.json(updated)
  } catch (err) {
    console.error('updatePost:', err)
    res.status(500).json({ error: err.message || 'Failed to update post' })
  }
}

// DELETE /api/posts/:id - delete post (author only)
async function deletePost(req, res) {
  try {
    const { id } = req.params
    const db = getAdmin()
    const userId = req.user?.id
    if (!userId) return res.status(401).json({ error: 'Authentication required' })
    const { data: post, error: postErr } = await db.from('posts').select('id, author_id').eq('id', id).single()
    if (postErr || !post) return res.status(404).json({ error: 'Post not found' })
    const authorId = post.author_id?.toString?.() ?? post.author_id
    if (authorId !== (userId?.toString?.() ?? userId)) {
      return res.status(403).json({ error: 'Only the author can delete this post' })
    }
    const { error: deleteErr } = await db.from('posts').delete().eq('id', id).eq('author_id', userId)
    if (deleteErr) {
      console.error('deletePost Supabase error:', deleteErr)
      return res.status(500).json({ error: deleteErr.message || 'Failed to delete post' })
    }
    res.json({ deleted: true, id })
  } catch (err) {
    console.error('deletePost:', err)
    res.status(500).json({ error: err.message || 'Failed to delete post' })
  }
}

// GET /api/posts/:id/dashboard - return dashboard data for embedding (only if post visible)
async function getPostDashboard(req, res) {
  try {
    const { id } = req.params
    const db = getAdmin()
    const { data: post, error: postErr } = await db.from('posts').select('id, dashboard_id, visibility, author_id').eq('id', id).single()
    if (postErr || !post) return res.status(404).json({ error: 'Post not found' })
    if (post.visibility !== 'public' && post.author_id !== (req.user && req.user.id)) {
      return res.status(404).json({ error: 'Post not found' })
    }
    const { data: dashboard, error: dashErr } = await db
      .from('shorts_dashboards')
      .select('*')
      .eq('id', post.dashboard_id)
      .single()
    if (dashErr || !dashboard) {
      return res.status(404).json({ error: 'Dashboard not found or no longer available' })
    }
    if (dashboard.user_id !== post.author_id) {
      return res.status(403).json({ error: 'Dashboard does not belong to post author' })
    }
    res.json(dashboard)
  } catch (err) {
    console.error('getPostDashboard:', err)
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard' })
  }
}

module.exports = {
  createPost,
  getFeed,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleSave,
  getComments,
  addComment,
  getPostDashboard
}
