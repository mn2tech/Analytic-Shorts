const express = require('express')
const router = express.Router()
const { requireAuth, optionalAuth } = require('../middleware/requireAuth')
const liveController = require('../controllers/liveController')

router.get('/:sessionId', optionalAuth, liveController.getLiveSession)
router.post('/:sessionId/end', requireAuth, liveController.endLiveSession)

module.exports = router
