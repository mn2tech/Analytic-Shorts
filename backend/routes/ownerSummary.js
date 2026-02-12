const express = require('express')
const OpenAI = require('openai')
const { applyOwnerSummaryGuardrails, fallbackOwnerSummary } = require('../utils/ownerSummaryGuardrails')

const router = express.Router()

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// Simple in-memory cache for summaries (key -> summary). Keeps process-local cache under PM2.
const summaryCache = new Map()

function normalizeKpis(kpis) {
  const n = (v) => {
    if (v == null || v === '') return null
    const num = Number(v)
    return Number.isFinite(num) ? num : null
  }
  return {
    occupancy_rate: n(kpis?.occupancy_rate),
    revenue_today: n(kpis?.revenue_today),
    arrivals_today: n(kpis?.arrivals_today),
    adr: n(kpis?.adr),
    revpar: n(kpis?.revpar)
  }
}

function buildUserPrompt(kpis) {
  // Use the EXACT prompt template requested.
  return `Write a 2–4 sentence owner-friendly summary using today’s KPIs below.
Rules:
- Do NOT include a title.
- Do NOT mention dashboards, charts, filters, UI, or the word "Insight".
- Use plain English (no analytics jargon).
- Be confident and concise.
- End with: "Action needed: Yes/No — <short reason>"

KPIs:
occupancy_rate=${kpis.occupancy_rate}%
revenue_today=$${kpis.revenue_today}
arrivals_today=${kpis.arrivals_today}
adr=$${kpis.adr}
revpar=$${kpis.revpar}
---`
}

router.post(['/', ''], async (req, res) => {
  try {
    const { kpis, cacheKey } = req.body || {}
    if (!kpis || typeof kpis !== 'object') {
      return res.status(400).json({ error: 'kpis object is required' })
    }

    const normalized = normalizeKpis(kpis)

    // Validate required KPI fields are present (numbers)
    const required = ['occupancy_rate', 'revenue_today', 'arrivals_today', 'adr', 'revpar']
    const missing = required.filter((k) => normalized[k] == null)
    if (missing.length) {
      return res.status(400).json({ error: `Missing KPI(s): ${missing.join(', ')}` })
    }

    const key = (typeof cacheKey === 'string' && cacheKey.trim())
      ? cacheKey.trim()
      : JSON.stringify(normalized)

    if (summaryCache.has(key)) {
      return res.json({ summary: summaryCache.get(key), cached: true })
    }

    // If AI isn't configured, return fallback (still cached).
    if (!openai) {
      const safe = fallbackOwnerSummary(normalized)
      summaryCache.set(key, safe)
      return res.json({ summary: safe, cached: false, ai: false })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You write concise executive updates for hotel owners.' },
        { role: 'user', content: buildUserPrompt(normalized) }
      ],
      max_tokens: 200,
      temperature: 0.4
    })

    const raw = completion?.choices?.[0]?.message?.content ?? ''
    const safe = applyOwnerSummaryGuardrails(raw, normalized)
    summaryCache.set(key, safe)

    res.json({ summary: safe, cached: false, ai: true })
  } catch (error) {
    console.error('Owner summary error:', error)
    // On error, return fallback so UI still works.
    try {
      const { kpis } = req.body || {}
      const normalized = normalizeKpis(kpis || {})
      const safe = fallbackOwnerSummary(normalized)
      return res.status(200).json({ summary: safe, cached: false, ai: false, error: 'fallback' })
    } catch {
      return res.status(500).json({ error: error.message || 'Failed to generate owner summary' })
    }
  }
})

module.exports = router

