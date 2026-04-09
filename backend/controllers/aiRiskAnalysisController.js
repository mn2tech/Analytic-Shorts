const { runAiRiskAnalysis } = require('../services/aiRiskAnalysisService')

async function postRiskAnalysis(req, res) {
  try {
    const { dataset, schema, options } = req.body || {}
    if (!Array.isArray(dataset)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'dataset must be an array of JSON records',
      })
    }
    if (dataset.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'dataset must not be empty',
      })
    }

    const result = await runAiRiskAnalysis({ dataset, schema, options })
    return res.json(result)
  } catch (error) {
    const status = Number.isFinite(error?.status) ? error.status : 500
    return res.status(status).json({
      error: 'AI risk analysis failed',
      message:
        error?.message ||
        'Failed to run canonical AI risk analysis engine',
    })
  }
}

module.exports = {
  postRiskAnalysis,
}
