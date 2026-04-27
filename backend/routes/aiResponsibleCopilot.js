const express = require('express')
const { postResponsibleCopilotQuery } = require('../controllers/responsibleAiCopilotController')

const router = express.Router()

router.post('/responsible-banking-copilot/query', postResponsibleCopilotQuery)
router.post('/responsible-banking-copilot/query/', postResponsibleCopilotQuery)

module.exports = router
