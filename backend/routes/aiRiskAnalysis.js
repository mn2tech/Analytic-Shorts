const express = require('express')
const { postRiskAnalysis } = require('../controllers/aiRiskAnalysisController')

const router = express.Router()

router.post('/risk-analysis', postRiskAnalysis)
router.post('/risk-analysis/', postRiskAnalysis)

module.exports = router
