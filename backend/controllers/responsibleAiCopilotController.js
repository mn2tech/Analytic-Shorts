const { runResponsibleCopilot } = require('../services/responsibleAiCopilotService')

async function postResponsibleCopilotQuery(req, res) {
  const query = String(req.body?.query || '').trim()
  if (!query) {
    return res.status(400).json({ error: 'Query is required' })
  }

  const result = runResponsibleCopilot(query)
  return res.json(result)
}

module.exports = {
  postResponsibleCopilotQuery,
}
