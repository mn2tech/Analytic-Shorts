const express = require('express')
const OpenAI = require('openai')
const { AI_HEALTH_SYSTEM_PROMPT } = require('../utils/aiHealthPrompt')
const { sanitizeSnapshot } = require('../utils/buildDashboardSnapshot')

const router = express.Router()
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const MEDICAL_ADVICE_PATTERN = /\b(diagnos|treat|treatment|medication|medicine|drug|dose|prescri|symptom|clinical advice)\b/i

function formatOperationalFallback(snapshot) {
  const summary = snapshot.erOccupancy >= 90
    ? 'ER congestion is currently elevated.'
    : 'Hospital operations are currently stable with active throughput pressure.'

  const bulletLines = [
    `Boarding patients: ${snapshot.boardingPatients}`,
    `Average boarding delay: ${snapshot.avgBoardingDelay} minutes`,
    `ICU occupancy: ${snapshot.icuOccupancy}%`,
    `Transfers in progress: ${snapshot.transfersInProgress}`,
    `Scenario mode: ${snapshot.scenarioMode}`,
  ]
  return `${summary}\n\n${bulletLines.join('\n')}`
}

function sanitizeAnswer(answer, fallback) {
  const text = String(answer || '').trim()
  if (!text) return fallback
  if (MEDICAL_ADVICE_PATTERN.test(text)) {
    return 'I can only provide hospital operations insights (capacity, flow, throughput, LOS, and delays) and cannot provide diagnosis or treatment guidance.'
  }
  return text
}

router.post('/ai-health-chat', async (req, res) => {
  try {
    const question = String(req.body?.question || '').trim()
    const dashboardSnapshot = sanitizeSnapshot(req.body?.dashboardSnapshot)

    if (!question) {
      return res.status(400).json({ error: 'question is required' })
    }

    if (MEDICAL_ADVICE_PATTERN.test(question)) {
      return res.json({
        answer: 'I can only provide hospital operations insights (capacity, flow, throughput, LOS, and delays) and cannot provide diagnosis or treatment guidance.',
      })
    }

    const fallbackAnswer = formatOperationalFallback(dashboardSnapshot)
    if (!openai) {
      return res.json({ answer: fallbackAnswer })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 300,
      messages: [
        { role: 'system', content: AI_HEALTH_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            'Use this dashboard snapshot to answer the hospital operations question.',
            '',
            `Question: ${question}`,
            '',
            `Dashboard Snapshot: ${JSON.stringify(dashboardSnapshot, null, 2)}`,
            '',
            'Response format:',
            '1) Short summary sentence',
            '2) Optional supporting bullet lines',
          ].join('\n'),
        },
      ],
    })

    const answer = completion?.choices?.[0]?.message?.content
    return res.json({
      answer: sanitizeAnswer(answer, fallbackAnswer),
    })
  } catch (error) {
    console.error('[ai-health-chat] Error:', error?.message || error)
    return res.status(500).json({
      error: 'AI Health Chat failed',
      message: error?.message || 'Unknown error',
    })
  }
})

module.exports = router
