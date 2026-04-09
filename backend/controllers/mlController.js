const { detectAnomalies } = require('../services/mlAnomalyService')

async function postAnomalyDetect(req, res) {
  try {
    const { rows, columns, contamination } = req.body || {}
    const result = await detectAnomalies({ rows, columns, contamination })
    res.set('Deprecation', 'true')
    res.set('Sunset', '2026-12-31')
    res.set('Link', '</api/ai/risk-analysis>; rel="successor-version"')
    return res.json(result)
  } catch (error) {
    const status = Number.isFinite(error?.status) ? error.status : 500
    return res.status(status).json({
      error: 'Anomaly detection failed',
      message: error?.message || 'Failed to run anomaly detection',
    })
  }
}

module.exports = {
  postAnomalyDetect,
}
