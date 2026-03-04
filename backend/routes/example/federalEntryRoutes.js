/**
 * Federal Entry Engine report.
 * POST /api/example/govcon/federal-entry-report
 */
const express = require('express')
const crypto = require('crypto')
const OpenAI = require('openai')
const {
  fetchSamgovOpportunities,
  fetchSamgovAgencyReport,
  fetchUsaspendingSpendingOverTime,
  fetchUsaspendingRecentAwards,
} = require('../../utils/govconFetchers')
const { formatMmDdYyyy } = require('../../utils/dateParsing')
const { getNaicsForIndustry, expandNaicsForApi } = require('../../govcon/industryNaicsMap')
const { suggestNaicsFromDescription } = require('../../govcon/naicsClassifier')

const router = express.Router()
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

const FETCH_TIMEOUT_MS = 20000
const LIMIT_CAP = 500

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), ms)),
  ])
}

function validateBody(body) {
  const naics = body.naics
  if (naics != null && !Array.isArray(naics)) return { error: 'naics must be an array', details: 'e.g. ["541512"]' }
  const keywords = body.keywords
  if (keywords != null && !Array.isArray(keywords)) return { error: 'keywords must be an array', details: 'e.g. ["data analytics"]' }
  const fy = body.fy
  if (fy != null && !Array.isArray(fy)) return { error: 'fy must be an array', details: 'e.g. ["2024","2025"]' }
  const limit = parseInt(body.limit, 10)
  if (body.limit != null && (Number.isNaN(limit) || limit < 1 || limit > LIMIT_CAP)) {
    return { error: 'Invalid limit', details: `limit must be 1-${LIMIT_CAP}` }
  }
  return null
}

function computeMetrics({ opportunities, agencyReport, spendOverTime, recentAwards }) {
  const opps = opportunities.data || []
  const agencyData = agencyReport.data || []
  const spendData = spendOverTime.data || []
  const awards = recentAwards.data || []

  const marketSizeByFY = {}
  for (const r of spendData) {
    const fy = r.fiscal_year
    if (fy != null) marketSizeByFY[fy] = (marketSizeByFY[fy] || 0) + (Number(r.obligations) || 0)
  }

  const fyYears = Object.keys(marketSizeByFY).map(Number).sort((a, b) => a - b)
  let growthRate = null
  if (fyYears.length >= 2) {
    const prev = marketSizeByFY[fyYears[fyYears.length - 2]] || 0
    const curr = marketSizeByFY[fyYears[fyYears.length - 1]] || 0
    if (prev > 0) growthRate = ((curr - prev) / prev) * 100
  }

  const awardAmounts = awards.map((a) => Number(a.awardAmount) || 0).filter((n) => n > 0)
  const totalAwardAmount = awardAmounts.reduce((s, n) => s + n, 0)
  const avgAwardSize = awardAmounts.length > 0 ? totalAwardAmount / awardAmounts.length : null

  const oppCount = opps.length
  const topAgencies = agencyData.slice(0, 10).map((a) => ({
    agency: a.agency,
    opportunity_count: a.opportunity_count,
    total_award_amount: a.total_award_amount,
  }))

  const recipientTotals = new Map()
  for (const a of awards) {
    const name = (a.recipientName || 'Unknown').toString().trim()
    const amt = Number(a.awardAmount) || 0
    recipientTotals.set(name, (recipientTotals.get(name) || 0) + amt)
  }
  const sortedRecipients = [...recipientTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const top5Amount = sortedRecipients.reduce((s, [, amt]) => s + amt, 0)
  const concentrationProxy = totalAwardAmount > 0 ? (top5Amount / totalAwardAmount) * 100 : null

  return {
    marketSizeByFY,
    growthRate,
    avgAwardSize,
    opportunityCount: oppCount,
    topAgencies,
    concentrationProxy,
    totalAwardAmount,
    awardCount: awards.length,
  }
}

async function generateNarrative(metrics, opportunitiesSample, awardsSample, inputs) {
  if (!openai) return null
  const metricsText = JSON.stringify(metrics, null, 2)
  const oppSample = JSON.stringify(opportunitiesSample.slice(0, 20).map((o) => ({ title: o.title, organization: o.organization, award_amount: o.award_amount })), null, 2)
  const awardSample = JSON.stringify(awardsSample.slice(0, 15).map((a) => ({ recipientName: a.recipientName, awardAmount: a.awardAmount, awardingAgency: a.awardingAgency })), null, 2)

  const prompt = `You are a federal market analyst. Write a concise 2-4 paragraph executive summary for a Federal Entry Report.

**CRITICAL: Do not invent facts. Use ONLY the computed metrics and sample rows provided. If a metric is null or zero, say so.**

Computed metrics:
${metricsText}

Top 20 opportunities sample:
${oppSample}

Top 15 awards sample:
${awardSample}

Input filters: agency=${inputs.agency}, fy=${JSON.stringify(inputs.fy)}, naics=${JSON.stringify(inputs.naics)}, keywords=${JSON.stringify(inputs.keywords)}

Write a factual narrative that summarizes market size, growth, top agencies, and competitive landscape. Be specific with numbers. Do not hallucinate.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    })
    return completion?.choices?.[0]?.message?.content?.trim() || null
  } catch (err) {
    console.error('[federal-entry-report] OpenAI narrative failed:', err?.message)
    return null
  }
}

router.post('/federal-entry-report', express.json(), async (req, res) => {
  try {
    const body = req.body || {}
    const validationError = validateBody(body)
    if (validationError) {
      return res.status(400).json({ error: validationError.error, details: validationError.details })
    }

    let naics = Array.isArray(body.naics) ? body.naics.filter((s) => typeof s === 'string' && s.trim()) : []
    const industryKey = (body.industryKey || body.industryCategory || '').toString().trim().toUpperCase()
    const businessDescription = (body.businessDescription || '').toString().trim()
    if (naics.length === 0 && industryKey && industryKey !== 'OTHER') naics = getNaicsForIndustry(industryKey)
    if (naics.length === 0 && businessDescription) {
      const suggested = suggestNaicsFromDescription(businessDescription)
      if (suggested.length > 0) naics = [...suggested]
    }
    naics = expandNaicsForApi(naics)
    if (naics.length === 0) {
      return res.status(400).json({ error: 'NAICS required', message: 'Select an industry category or provide custom NAICS/business description.' })
    }
    const keywords = Array.isArray(body.keywords) ? body.keywords.filter((s) => typeof s === 'string' && s.trim()) : []
    const agency = (body.agency || 'TREASURY').toString().trim()
    const fy = Array.isArray(body.fy) && body.fy.length > 0 ? body.fy.map(String) : ['2024', '2025']
    const limit = Math.min(Math.max(parseInt(body.limit, 10) || 200, 1), LIMIT_CAP)

    const inputs = { naics, keywords, agency, fy, limit }

    const now = new Date()
    const postedFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 364); return formatMmDdYyyy(d) })()
    const postedTo = formatMmDdYyyy(now)

    const fetchOpts = {
      limit,
      ptype: 'o',
      postedFrom,
      postedTo,
      title: keywords.length > 0 ? keywords[0] : undefined,
      naics: naics.length > 0 ? naics : undefined,
      agency,
      fy,
    }

    let opportunities, agencyReport, spendOverTime, recentAwards

    try {
      [opportunities, agencyReport, spendOverTime, recentAwards] = await Promise.all([
        withTimeout(fetchSamgovOpportunities(fetchOpts), FETCH_TIMEOUT_MS),
        withTimeout(fetchSamgovAgencyReport(fetchOpts), FETCH_TIMEOUT_MS),
        withTimeout(fetchUsaspendingSpendingOverTime({ agency, fy, naics: naics.length > 0 ? naics : undefined }), FETCH_TIMEOUT_MS),
        withTimeout(fetchUsaspendingRecentAwards({ limit, fy, naics: naics.length > 0 ? naics : undefined }), FETCH_TIMEOUT_MS),
      ])
    } catch (err) {
      console.error('[federal-entry-report] Fetch error:', err?.message)
      return res.status(502).json({
        error: 'Upstream error',
        details: err?.message || 'One or more data fetches failed or timed out.',
      })
    }

    const upstreamErrors = []
    if (opportunities.error && opportunities.status === 503) upstreamErrors.push('SAM.gov: ' + opportunities.error)
    if (agencyReport.error && agencyReport.status === 503) upstreamErrors.push('SAM.gov agency report: ' + agencyReport.error)
    if (upstreamErrors.length > 0) {
      return res.status(503).json({
        error: 'Upstream error',
        details: upstreamErrors.join('; '),
      })
    }

    const metrics = computeMetrics({
      opportunities,
      agencyReport,
      spendOverTime,
      recentAwards,
    })

    const oppData = opportunities.data || []
    const awardData = recentAwards.data || []
    const narrative = await generateNarrative(metrics, oppData, awardData, inputs)

    const report = {
      reportId: crypto.randomUUID ? crypto.randomUUID() : `report-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      generatedAt: now.toISOString(),
      inputs,
      scores: {
        growthRate: metrics.growthRate,
        concentrationProxy: metrics.concentrationProxy,
      },
      market: {
        marketSizeByFY: metrics.marketSizeByFY,
        growthRate: metrics.growthRate,
        avgAwardSize: metrics.avgAwardSize,
        opportunityCount: metrics.opportunityCount,
        totalAwardAmount: metrics.totalAwardAmount,
        awardCount: metrics.awardCount,
      },
      agencyTargets: metrics.topAgencies,
      competitors: metrics.concentrationProxy != null
        ? [{ description: 'Top 5 recipients share of awards', percentage: metrics.concentrationProxy }]
        : [],
      opportunities: oppData.slice(0, 50),
      strategy: {
        summary: 'Based on computed metrics. Refine filters (naics, keywords, agency, fy) for targeted analysis.',
      },
      actionPlan: [
        'Review opportunity count and top agencies to prioritize targets.',
        'Assess concentration proxy to understand competitive landscape.',
        'Use growth rate and market size by FY for budget planning.',
      ],
      narrative,
    }

    return res.json(report)
  } catch (err) {
    console.error('[federal-entry-report] Unexpected error:', err)
    return res.status(500).json({
      error: 'Federal entry report failed',
      details: err?.message || 'An unexpected error occurred.',
    })
  }
})

module.exports = router
