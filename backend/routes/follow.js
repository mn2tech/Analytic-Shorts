const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/requireAuth')
const followController = require('../controllers/followController')

router.get('/follow/check', requireAuth, followController.check)
router.post('/follow/:userId', requireAuth, followController.follow)
router.delete('/follow/:userId', requireAuth, followController.unfollow)

module.exports = router
