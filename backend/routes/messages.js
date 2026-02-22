const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/requireAuth')
const messagesController = require('../controllers/messagesController')

router.get('/messages/unread-count', requireAuth, messagesController.getUnreadCount)
router.get('/messages', requireAuth, (req, res) => {
  if (req.query.with) return messagesController.getThread(req, res)
  return messagesController.getConversations(req, res)
})
router.post('/messages', requireAuth, messagesController.sendMessage)

module.exports = router
