const express = require('express')
const router = express.Router()
const { requireAuth, optionalAuth } = require('../middleware/requireAuth')
const postsController = require('../controllers/postsController')
const liveController = require('../controllers/liveController')

// Active live session for a post (optional auth) - must be before /posts/:id
router.get('/posts/:id/active-session', optionalAuth, (req, res) => {
  req.params.postId = req.params.id
  liveController.getActiveSessionForPost(req, res)
})

// Feed: optional auth (public feed without login)
router.get('/feed', optionalAuth, postsController.getFeed)

// Single post and dashboard data: optional auth (dashboard before :id so /posts/:id/dashboard matches)
router.get('/posts/:id/dashboard', optionalAuth, postsController.getPostDashboard)
router.get('/posts/:id', optionalAuth, postsController.getPost)

// Comments: get is optional auth, add is requireAuth
router.get('/posts/:id/comments', optionalAuth, postsController.getComments)
router.post('/posts/:id/comments', requireAuth, postsController.addComment)

// Create post, like, save: require auth
router.post('/posts', requireAuth, postsController.createPost)
router.patch('/posts/:id', requireAuth, postsController.updatePost)
router.delete('/posts/:id', requireAuth, postsController.deletePost)
router.post('/posts/:id/like', requireAuth, postsController.toggleLike)
router.post('/posts/:id/save', requireAuth, postsController.toggleSave)

// Live: create requires auth
router.post('/posts/:id/live-sessions', requireAuth, liveController.createOrGetLiveSession)

module.exports = router
