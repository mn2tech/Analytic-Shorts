const express = require('express')
const OpenAI = require('openai')
const {
  applyBusinessSummaryGuardrails,
  fallbackBusinessSummary
} = require('../utils/ownerSummaryGuardrails')

const router = express.Router()

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const summaryCache = new Map()

function normalizeBusinessMetric(m) {
  if (!m || typeof m !== 'object') return null
  const label = m.label != null ? String(m.label).trim() : ''
  if (!label) return null
  let value = m.value
  if (typeof value === 'number' && Number.isFinite(value)) {
    /* keep */
  } else if (value != null && value !== '') {
    const num = Number(String(value).replace(/,/g, ''))
    value = Number.isFinite(num) ? num : String(value).trim().slice(0, 120)
  } else {
    value = ''
  }
  return { label, value }
}

function buildBusinessUserPrompt(metrics) {
  const lines = metrics.map((m) => `- ${m.label}: ${m.value}`).join('\n')
  return `Write a 2-sentence business summary for a business owner based on this data.
Be specific — mention actual numbers.
Do NOT use hotel/hospitality language (no "occupancy", "arrivals", "guests", "ADR", "RevPAR").
Use neutral business language: revenue, orders, customers, products, units, etc.
Do NOT include a title.
Do NOT mention dashboards, charts, filters, UI, or the word "Insight".

Metrics:
${lines}`
}

router.post(['/', ''], async (req, res) => {
  try {
    const { businessMetrics, cacheKey } = req.body || {}
    let metrics = []

    if (Array.isArray(businessMetrics)) {
      metrics = businessMetrics.map(normalizeBusinessMetric).filter(Boolean)
    }

    if (metrics.length === 0) {
      return res.status(400).json({ error: 'businessMetrics array with at least one { label, value } is required' })
    }

    const key = typeof cacheKey === 'string' && cacheKey.trim() ? cacheKey.trim() : JSON.stringify(metrics)

    if (summaryCache.has(key)) {
      return res.json({ summary: summaryCache.get(key), cached: true })
    }

    if (!openai) {
      const safe = fallbackBusinessSummary(metrics)
      summaryCache.set(key, safe)
      return res.json({ summary: safe, cached: false, ai: false })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You write concise, factual business summaries for retail, e-commerce, and general operations—not hospitality-specific reports.'
        },
        { role: 'user', content: buildBusinessUserPrompt(metrics) }
      ],
      max_tokens: 200,
      temperature: 0.4
    })

    const raw = completion?.choices?.[0]?.message?.content ?? ''
    const safe = applyBusinessSummaryGuardrails(raw, metrics)
    summaryCache.set(key, safe)

    res.json({ summary: safe, cached: false, ai: true })
  } catch (error) {
    console.error('Owner summary error:', error)
    try {
      const { businessMetrics } = req.body || {}
      const metrics = (Array.isArray(businessMetrics) ? businessMetrics : [])
        .map(normalizeBusinessMetric)
        .filter(Boolean)
      const safe = metrics.length ? fallbackBusinessSummary(metrics) : 'Summary unavailable.'
      return res.status(200).json({ summary: safe, cached: false, ai: false, error: 'fallback' })
    } catch {
      return res.status(500).json({ error: error.message || 'Failed to generate owner summary' })
    }
  }
})

module.exports = router
