const express = require('express')
const { postAnomalyDetect } = require('../controllers/mlController')

const router = express.Router()

// Deprecated compatibility route.
// This endpoint now forwards into canonical /api/ai/risk-analysis via the controller/service.
router.post('/anomaly-detect', postAnomalyDetect)
router.post('/anomaly-detect/', postAnomalyDetect)

module.exports = router
