/**
 * POST /api/studio/report - Executive AI reporting with CanonicalIR + mode + voice.
 * Input: buildResponse (from POST /api/studio/build), mode, voice
 * Output: canonicalIR, report, narrative
 */

const express = require('express')
const router = express.Router()
const { studioRunToCanonicalIR } = require('../studio-ai/schema/canonicalIR')
const { transformIRToReport } = require('../studio-ai/reportTransformers')
const { generateExecutiveRecommendations } = require('../studio-ai/prescriptive/recommendations')
const { generateEvidenceNarration } = require('./insights')

/**
 * POST /api/studio/report
 * Body: {
 *   buildResponse: object - from POST /api/studio/build (required)
 *   mode?: 'descriptive'|'diagnostic'|'predictive'|'prescriptive' (default: descriptive)
 *   voice?: 'analyst'|'agency'|'executive' (default: executive)
 * }
 */
router.post(['/', ''], async (req, res) => {
  try {
    const body = req.body || {}
    const {
      buildResponse,
      mode = 'descriptive',
      voice = 'executive',
    } = body

    if (!buildResponse || typeof buildResponse !== 'object') {
      return res.status(400).json({
        error: 'Missing build data',
        message: 'Provide buildResponse from POST /api/studio/build. Call build first, then pass the response here.',
      })
    }

    const validModes = ['descriptive', 'diagnostic', 'predictive', 'prescriptive']
    const reportMode = validModes.includes(mode) ? mode : 'descriptive'

    const validVoices = ['analyst', 'agency', 'executive']
    const narrativeVoice = validVoices.includes(voice) ? voice : 'executive'

    let recommendations = []
    if (reportMode === 'prescriptive') {
      const irForRec = studioRunToCanonicalIR(buildResponse)
      recommendations = await generateExecutiveRecommendations(irForRec)
    }

    const canonicalIR = studioRunToCanonicalIR(buildResponse, { recommendations })

    const report = transformIRToReport(canonicalIR, reportMode)

    const evidenceForNarrative = buildResponse.evidence || {}
    const narrative = await generateEvidenceNarration(evidenceForNarrative, narrativeVoice)

    res.json({
      runId: buildResponse.runId || canonicalIR.runId,
      canonicalIR,
      report: {
        mode: reportMode,
        reportBlocks: report,
      },
      narrative: {
        voice: narrativeVoice,
        executiveSummary: narrative.executiveSummary,
        topInsights: narrative.topInsights,
        suggestedQuestions: narrative.suggestedQuestions,
      },
    })
  } catch (error) {
    console.error('[studio/report] Error:', error)
    if (res.headersSent) return
    res.status(500).json({
      error: 'Report failed',
      message: error.message || 'Failed to generate report',
    })
  }
})

module.exports = router
