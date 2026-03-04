/**
 * Federal Entry Intelligence Report Engine
 * Routes: POST /run, GET /:reportRunId/data, GET /:reportRunId/summary, GET /:reportRunId/pdf, GET /:reportRunId/leads.csv
 *
 * OVERRIDE RULES:
 * - Custom naics[] OVERRIDES industry NAICS when provided and non-empty.
 * - When naics[] is empty, backend derives from industryKey via industryNaicsMap.
 * - "Other" has no default NAICS; user must send custom naics[].
 *
 * DEBUG OUTPUT (when debug=true in request):
 * - resolvedFilters: final naics, agency, fy, etc. used for all queries
 * - samQuery: SAM.gov opportunities API params (ncode = first NAICS; API supports single only)
 * - samCount, awardsCount, spendCount: row counts from each data source
 * - Use to verify NAICS filtering is applied to SAM.gov and USAspending.
 */
const express = require('express')
const rateLimit = require('express-rate-limit')
const crypto = require('crypto')
const OpenAI = require('openai')
const { getSupabaseAdmin } = require('../../utils/supabaseAdmin')
const {
  fetchSamgovOpportunities,
  fetchSamgovAgencyReport,
  fetchUsaspendingSpendingOverTime,
  fetchUsaspendingRecentAwards,
} = require('../../utils/govconFetchers')
const { formatMmDdYyyy } = require('../../utils/dateParsing')
const { getNaicsForIndustry, expandNaicsForApi } = require('../../govcon/industryNaicsMap')
const { resolveSignals } = require('../../signalEngine/resolver')
const { addToReviewQueueIfNeeded } = require('../../signalEngine/reviewQueue')

const router = express.Router()
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

// IP-based usage limit: 5 report runs per hour (no login required, but limits abuse)
const runRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Usage limit reached', message: 'You can run up to 5 reports per hour. Sign in with a Pro or Enterprise account for higher limits.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const FETCH_TIMEOUT_MS = 25000
const LIMIT_CAP = 500
const SHORTLIST_SIZE = 20

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Fetch timeout')), ms)),
  ])
}

function parseIsoOrFlexibleDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  if (!s) return null
  const parsed = Date.parse(s)
  return Number.isNaN(parsed) ? null : new Date(parsed)
}

function daysUntilDeadline(responseDeadLine) {
  const d = parseIsoOrFlexibleDate(responseDeadLine)
  if (!d) return null
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

/**
 * Compute growth rate: ((mfy25 - mfy24) / mfy24) * 100, rounded to 1 decimal.
 * Returns null if mfy24 is null, 0, or mfy25 is null (display "N/A").
 */
function computeGrowthRatePercent(mfy24, mfy25) {
  if (mfy24 == null || mfy24 === 0 || mfy25 == null) return null
  return Math.round(((mfy25 - mfy24) / mfy24) * 1000) / 10
}

/**
 * Compute confidence from data coverage: oppCount, awardsCount, spendCount.
 * Returns { confidenceLevel: 'High'|'Medium'|'Low', confidenceReason: string }
 */
function computeConfidenceFromCoverage(oppCount, awardsCount, spendCount) {
  const opp = Number(oppCount) || 0
  const awards = Number(awardsCount) || 0
  const spend = Number(spendCount) || 0

  if (awards < 10) {
    return { confidenceLevel: 'Low', confidenceReason: `Low: only ${awards} awards returned for selected filters` }
  }
  if (awards < 25 || opp < 25) {
    return { confidenceLevel: 'Medium', confidenceReason: `Medium: ${awards} awards, ${opp} opportunities—moderate sample size` }
  }
  if (spend < 2) {
    return { confidenceLevel: 'Medium', confidenceReason: `Medium: limited spend-over-time data (${spend} rows)` }
  }
  return { confidenceLevel: 'High', confidenceReason: `High: ${opp} opportunities, ${awards} awards, ${spend} spend rows—good coverage` }
}

/**
 * Compute market-level entry barrier score (0-100) using weighted formula.
 * Weights: concentration 40%, avg award size 25%, growth trend 15%, opportunity volume 20%.
 * Higher score = harder to enter. Pure deterministic math.
 *
 * EXACT INPUTS:
 * - FY obligations: spend_over_time from fetchUsaspendingSpendingOverTime()
 *   (USAspending spending_over_time API, filtered by agency + fy + naics)
 * - recent_awards: from fetchUsaspendingRecentAwards()
 *   (USAspending spending_by_award API, filtered by fy + naics only, NOT agency)
 * - topRecipients, avgAwardSize, concentrationPercent: ALL from recent_awards
 * - opportunities_feed: from fetchSamgovOpportunities() for oppCount
 */
function computeEntryBarrierScore(data) {
  const awards = data.recent_awards || []
  const spendOverTime = data.spend_over_time || []
  const opportunities = data.opportunities_feed || []
  const oppCount = opportunities.length

  // Concentration: top 3 recipients' share of total awards. Higher share = higher barrier.
  const recipientTotals = new Map()
  let totalAwardAmount = 0
  for (const a of awards) {
    const name = (a.recipientName || a.recipient_name || 'Unknown').toString().trim()
    const amt = Number(a.awardAmount || a.award_amount || 0)
    if (amt > 0) {
      recipientTotals.set(name, (recipientTotals.get(name) || 0) + amt)
      totalAwardAmount += amt
    }
  }
  const top3Amount = [...recipientTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .reduce((s, [, amt]) => s + amt, 0)
  const concentrationShare = totalAwardAmount > 0 ? (top3Amount / totalAwardAmount) * 100 : 0
  const concentrationScore = Math.min(100, Math.max(0, concentrationShare))

  // Avg award size: larger awards favor incumbents. Scale: 0-50M→0, 50M-200M→25, 200M-500M→50, 500M-2B→75, 2B+→100
  const awardAmounts = awards.map((a) => Number(a.awardAmount || a.award_amount || 0)).filter((n) => n > 0)
  const avgAwardSize = awardAmounts.length > 0 ? awardAmounts.reduce((s, n) => s + n, 0) / awardAmounts.length : 0
  let avgAwardScore = 0
  if (avgAwardSize >= 2e9) avgAwardScore = 100
  else if (avgAwardSize >= 5e8) avgAwardScore = 50 + (avgAwardSize - 5e8) / 1.5e9 * 50
  else if (avgAwardSize >= 2e8) avgAwardScore = 25 + (avgAwardSize - 2e8) / 3e8 * 25
  else if (avgAwardSize >= 5e7) avgAwardScore = (avgAwardSize - 5e7) / 1.5e8 * 25
  avgAwardScore = Math.min(100, Math.max(0, avgAwardScore))

  // Growth trend: negative growth = higher barrier. -20%→100, 0%→50, +20%→0
  const spendByFY = {}
  for (const r of spendOverTime) {
    const fy = r.fiscal_year
    if (fy != null) spendByFY[fy] = (spendByFY[fy] || 0) + (Number(r.obligations) || 0)
  }
  const fyYears = Object.keys(spendByFY).map(Number).filter(Number.isFinite).sort((a, b) => a - b)
  let growthScore = 50
  if (fyYears.length >= 2) {
    const prev = spendByFY[fyYears[fyYears.length - 2]] || 0
    const curr = spendByFY[fyYears[fyYears.length - 1]] || 0
    if (prev > 0) {
      const growthPct = ((curr - prev) / prev) * 100
      growthScore = growthPct <= -20 ? 100 : growthPct >= 20 ? 0 : 50 - growthPct * 2.5
    }
  }
  growthScore = Math.min(100, Math.max(0, growthScore))

  // Opportunity volume: fewer opps = higher barrier. 0→100, 25→80, 50→60, 100→40, 150→20, 200+→0
  let volumeScore = 100
  if (oppCount >= 200) volumeScore = 0
  else if (oppCount >= 150) volumeScore = 20
  else if (oppCount >= 100) volumeScore = 40
  else if (oppCount >= 50) volumeScore = 60
  else if (oppCount >= 25) volumeScore = 80
  else if (oppCount > 0) volumeScore = 100 - oppCount * 4
  volumeScore = Math.min(100, Math.max(0, volumeScore))

  const barrierScore = concentrationScore * 0.4 + avgAwardScore * 0.25 + growthScore * 0.15 + volumeScore * 0.2
  const barrierLevel = barrierScore >= 70 ? 'High' : barrierScore >= 40 ? 'Medium' : 'Low'

  // Growth rate: ((marketSizeFY2025 - marketSizeFY2024) / marketSizeFY2024) * 100, 1 decimal
  const mfy24 = spendByFY[2024] != null ? spendByFY[2024] : null
  const mfy25 = spendByFY[2025] != null ? spendByFY[2025] : null
  const growthRatePercent = computeGrowthRatePercent(mfy24, mfy25)

  const marketSizeByFY = {}
  for (const fy of fyYears) {
    marketSizeByFY[fy] = Math.round((spendByFY[fy] || 0) * 100) / 100
  }
  const topRecipients = [...recipientTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amt]) => ({ name, amount: Math.round(amt * 100) / 100 }))

  return {
    barrierScore: Math.round(barrierScore * 100) / 100,
    barrierLevel,
    marketSizeByFY,
    marketSizeFY2024: mfy24 != null ? Math.round(mfy24 * 100) / 100 : null,
    marketSizeFY2025: mfy25 != null ? Math.round(mfy25 * 100) / 100 : null,
    growthRatePercent,
    avgAwardSize: Math.round(avgAwardSize * 100) / 100,
    concentrationPercent: Math.round(concentrationShare * 100) / 100,
    topRecipients,
  }
}

async function computeNaicsBarrierRanking(naicsList, agency, fy, limit, postedFrom, postedTo) {
  if (!naicsList || naicsList.length <= 1) return []
  const results = []
  for (const naics of naicsList) {
    try {
      const [opportunities, spendOverTime, recentAwards] = await Promise.all([
        withTimeout(
          fetchSamgovOpportunities({ limit: 100, ptype: 'o', postedFrom, postedTo, naics: [naics] }),
          FETCH_TIMEOUT_MS,
        ),
        withTimeout(
          fetchUsaspendingSpendingOverTime({ agency, fy, naics: [naics] }),
          FETCH_TIMEOUT_MS,
        ),
        withTimeout(
          fetchUsaspendingRecentAwards({ limit: 50, fy, naics: [naics], agency }),
          FETCH_TIMEOUT_MS,
        ),
      ])
      const rawData = {
        opportunities_feed: opportunities.data || [],
        spend_over_time: spendOverTime.data || [],
        recent_awards: recentAwards.data || [],
      }
      const metrics = computeEntryBarrierScore(rawData)
      results.push({
        naics,
        barrierScore: metrics.barrierScore,
        barrierLevel: metrics.barrierLevel,
        growthRatePercent: metrics.growthRatePercent,
        concentrationPercent: metrics.concentrationPercent,
        marketSizeFY2024: metrics.marketSizeFY2024,
        marketSizeFY2025: metrics.marketSizeFY2025,
      })
    } catch (err) {
      console.warn('[federal-entry] NAICS ranking fetch failed for', naics, err?.message)
      results.push({ naics, barrierScore: 100, barrierLevel: 'High', growthRatePercent: null, concentrationPercent: null, error: err?.message })
    }
  }
  return results.sort((a, b) => (a.barrierScore ?? 100) - (b.barrierScore ?? 100))
}

const SET_ASIDE_BOOST_PATTERN = /small\s*business|8a|8\s*\(\s*a\s*\)|wosb|sdvosb|hubzone/i
const JANITORIAL_PATTERN = /janitorial|custodial|cleaning/i
const VEHICLE_EXCLUSION_PATTERN = /gsa\s*schedule|task\s*order\s*under\s*idiq|vehicle\s*required|idiq\s*task\s*order/i
const SIMPLE_SERVICE_PATTERN = /staffing|janitorial|help\s*desk|it\s*support|custodial|cleaning/i
const ANTI_FIRST_WIN_PATTERN = /enterprise|ehrm|recompete|multi-?award|idiq|gwac|on-?ramp/i

/**
 * Compute first-win friendliness score (0-100) and breakdown.
 * Components: set-aside +25, complexity low +20/medium +10/high -25, vehicle -30, simple service +10, anti-first-win -15.
 */
function computeFirstWinScore(opportunity) {
  const titleDesc = `${opportunity.title || ''} ${opportunity.description || ''} ${opportunity.solicitationNumber || ''}`.toLowerCase()
  const breakdown = {}

  let firstWinScore = 50
  const setAsideDetected =
    (opportunity.setAside && String(opportunity.setAside).trim().length > 0 && !/none|n\/a/i.test(opportunity.setAside) && SET_ASIDE_BOOST_PATTERN.test(opportunity.setAside)) ||
    opportunity.signals?.set_aside_preferred?.value === true
  if (setAsideDetected) {
    firstWinScore += 25
    breakdown.setAside = '+25'
  }

  const complexity = opportunity.signals?.complexity_level?.value || 'medium'
  if (complexity === 'low') {
    firstWinScore += 20
    breakdown.complexityLevel = '+20 (low)'
  } else if (complexity === 'medium') {
    firstWinScore += 10
    breakdown.complexityLevel = '+10 (medium)'
  } else if (complexity === 'high') {
    firstWinScore -= 25
    breakdown.complexityLevel = '-25 (high)'
  }

  const vehicleRequired = opportunity.signals?.vehicle_required?.value === true || VEHICLE_EXCLUSION_PATTERN.test(titleDesc)
  if (vehicleRequired) {
    firstWinScore -= 30
    breakdown.vehicleRequired = '-30'
  }

  if (SIMPLE_SERVICE_PATTERN.test(titleDesc)) {
    firstWinScore += 10
    breakdown.simpleService = '+10'
  }

  if (ANTI_FIRST_WIN_PATTERN.test(titleDesc)) {
    firstWinScore -= 15
    breakdown.antiFirstWin = '-15'
  }

  firstWinScore = Math.round(Math.min(100, Math.max(0, firstWinScore)))
  return { firstWinScore, breakdown }
}

/**
 * Compute win score (0-100) for a single opportunity.
 * fit_score: NAICS/keyword/agency/set-aside match.
 * first_win_score: First-win friendliness (set-aside, complexity, vehicle, simple service).
 * win_score: 0.55*fit + 0.45*firstWinScore.
 */
function computeOpportunityWinScore(opportunity, companyProfile) {
  const naicsSet = new Set((companyProfile.naics || []).map((s) => String(s).trim()).filter(Boolean))
  const keywords = (companyProfile.keywords || []).map((s) => String(s).toLowerCase()).filter(Boolean)
  const targetAgency = (companyProfile.agency || '').toString().toLowerCase()
  const preferSetAsides = !!companyProfile.preferSetAsides

  const titleDesc = `${opportunity.title || ''} ${opportunity.solicitationNumber || ''}`.toLowerCase()
  let vehiclePenalty = 0
  const signalVehicleRequired = opportunity.signals?.vehicle_required?.value === true
  const regexVehicleRequired = VEHICLE_EXCLUSION_PATTERN.test(titleDesc)
  if (signalVehicleRequired || regexVehicleRequired) vehiclePenalty = 20

  let fitScore = 0
  if (naicsSet.size > 0 && opportunity.naicsCode) {
    const oppNaics = String(opportunity.naicsCode).trim()
    const match = [...naicsSet].some((n) => oppNaics.startsWith(n) || n.startsWith(oppNaics))
    if (match) fitScore += 35
  } else if (naicsSet.size === 0) fitScore += 15

  let keywordHits = 0
  for (const kw of keywords) {
    if (titleDesc.includes(kw)) keywordHits++
  }
  if (keywords.length > 0) fitScore += Math.min(30, keywordHits * 15)
  else fitScore += 15

  if (targetAgency && opportunity.organization) {
    if (opportunity.organization.toLowerCase().includes(targetAgency) || targetAgency.includes(opportunity.organization.toLowerCase())) {
      fitScore += 25
    }
  } else fitScore += 12

  if (opportunity.setAside && String(opportunity.setAside).trim().length > 0 && !/none|n\/a/i.test(opportunity.setAside)) {
    fitScore += 5
    if (SET_ASIDE_BOOST_PATTERN.test(opportunity.setAside)) fitScore += 15
    if (preferSetAsides) fitScore += 10
  } else fitScore += 5
  if (preferSetAsides && opportunity.signals?.set_aside_preferred?.value === true && !(opportunity.setAside && String(opportunity.setAside).trim().length > 0 && !/none|n\/a/i.test(opportunity.setAside))) {
    fitScore += 10
  }

  if (JANITORIAL_PATTERN.test(titleDesc)) fitScore += 10

  fitScore = Math.max(0, fitScore - vehiclePenalty)
  fitScore = Math.min(100, fitScore)

  const daysLeft = daysUntilDeadline(opportunity.responseDeadLine)
  let barrierScore = 50
  if (daysLeft != null) {
    if (daysLeft <= 0) barrierScore = 100
    else if (daysLeft <= 7) barrierScore = 90
    else if (daysLeft <= 14) barrierScore = 70
    else if (daysLeft <= 30) barrierScore = 40
    else barrierScore = Math.max(0, 100 - daysLeft)
  }
  barrierScore = Math.min(100, Math.max(0, barrierScore))

  const { firstWinScore, breakdown } = computeFirstWinScore(opportunity)
  const winScore = Math.round((0.55 * fitScore + 0.45 * firstWinScore) * 100) / 100

  return {
    winScore,
    fit_score: Math.round(fitScore),
    first_win_score: firstWinScore,
    firstWinBreakdown: breakdown,
    barrier_score: Math.round(barrierScore),
    days_until_deadline: daysLeft,
  }
}

/**
 * Compute opportunity_scores using computeOpportunityWinScore.
 * Optionally filters by usOnly (US state codes only) and excludeVehicleRequired.
 */
function computeOpportunityScores(opportunities, companyProfile) {
  const usOnly = !!companyProfile.usOnly
  const excludeVehicleRequired = !!companyProfile.excludeVehicleRequired

  let scored = opportunities.map((opp) => {
    const result = computeOpportunityWinScore(opp, companyProfile)
    return {
      ...opp,
      fit_score: result.fit_score,
      first_win_score: result.first_win_score,
      firstWinBreakdown: result.firstWinBreakdown,
      barrier_score: result.barrier_score,
      win_score: result.winScore,
      days_until_deadline: result.days_until_deadline,
    }
  })

  if (usOnly) {
    scored = scored.filter((opp) => {
      const s = (opp.state || '').toString().trim()
      return s.length === 2 && /^[A-Za-z]{2}$/.test(s)
    })
  }

  if (excludeVehicleRequired) {
    scored = scored.filter((opp) => {
      if (opp.signals?.vehicle_required?.value === true) return false
      const text = `${opp.title || ''} ${opp.solicitationNumber || ''}`.toLowerCase()
      return !VEHICLE_EXCLUSION_PATTERN.test(text)
    })
  }

  return scored
}

async function generateAISummary(dataPayload) {
  if (!openai) return null
  const opps = dataPayload.opportunity_scores || []
  const agencyRollup = dataPayload.agency_rollup || []
  const shortlist = dataPayload.first_win_shortlist || []
  const topAgencies = agencyRollup.slice(0, 15).map((a) => ({ agency: a.agency, opportunity_count: a.opportunity_count, total_award_amount: a.total_award_amount }))
  const topOppsSample = shortlist.slice(0, 10).map((o) => ({
    noticeId: o.noticeId || o.notice_id,
    title: o.title,
    organization: o.organization,
    win_score: o.win_score,
    fit_score: o.fit_score,
    first_win_score: o.first_win_score,
    barrier_score: o.barrier_score,
    complexity_level: o.signals?.complexity_level?.value,
    vehicle_required: o.signals?.vehicle_required?.value,
    setAside: o.setAside,
    responseDeadLine: o.responseDeadLine,
    pointOfContact: o.pointOfContact || null,
  }))

  const metricInconsistency = !!dataPayload.metricInconsistency
  const avgAwardSizeConfidence = dataPayload.avgAwardSizeConfidence || 'Medium'
  const avgAwardSizeFlag = dataPayload.avgAwardSizeFlag
  const coverageConfidence = dataPayload.coverageConfidence || {}

  let confidence = coverageConfidence.confidenceLevel || 'Medium'
  let confidenceReason = coverageConfidence.confidenceReason || 'Computed from data coverage'
  if (metricInconsistency || avgAwardSizeConfidence === 'Low') {
    confidence = 'Low'
    confidenceReason = metricInconsistency
      ? (avgAwardSizeFlag || 'Metric inconsistency: avgAwardSize exceeds marketSizeFY2024')
      : (avgAwardSizeFlag || 'Low sample size or data quality')
  }

  const keyMetrics = {
    marketSizeFY2024: dataPayload.marketSizeFY2024,
    marketSizeFY2025: dataPayload.marketSizeFY2025,
    growthRatePercent: dataPayload.growthRatePercent,
    avgAwardSize: dataPayload.avgAwardSize,
    concentrationPercent: dataPayload.concentrationPercent,
  }

  const prompt = `You are a senior federal capture strategist with 20+ years of GovCon experience. Generate a premium Federal Capture Strategy Brief. This is a consultant deliverable — analytical, decisive, no filler. Return JSON ONLY. No markdown.

RULES:
- Cite EXACT numeric values. Do not round or invent data.
- growthRatePercent is PRE-COMPUTED. Use exactly as given. If null, write "N/A".
- Use ONLY the structured data provided. No generic advice.
- recommendedEntryPath.path: Prime|Subcontract|Teaming|Micro-pilot.
- Tone: consultant-level, analytical, no motivational language, no "you should consider", decisive.

CAPTURE STRATEGY BRIEF (captureStrategyBrief) — 5 sections:

SECTION 1 marketPositionAssessment: Interpret market size trend, growth, concentration, avg award size, entry barrier. Explain implications for new prime entrants, subcontract pathway, competitive density. Conclude with market posture: Favorable|Competitive|Incumbent-Dominated|Contracting.

SECTION 2 incumbentLandscape: Using concentrationPercent and avgAwardSize, explain if integrator-dominated. Assess likelihood of winning as prime without past performance. Recommend: Prime (limited scope)|Structured teaming|Subcontract entry|Vehicle pursuit. RULE: If concentrationPercent>30 OR avgAwardSize>100M → default Teaming/Subcontract unless barrierScore<40.

SECTION 3 opportunityCaptureStrategy: Select top 3 from shortlist. For each: recommendation (Prime|Team|Avoid), why (fit, barrier, complexity, vehicle_required), riskLevel (Low|Medium|High), tacticalNextStep (14 days), bidNoBid (Bid|No-Bid).

SECTION 4 captureRoadmap: 0-30 days: agency positioning, partner ID, qualification. 30-60 days: proposal readiness, capability gap closure, compliance. 60-90 days: first bid execution or teaming finalization. Tie actions to computed metrics.

SECTION 5 structuralRiskMitigation: List each with mitigation: incumbentDominanceRisk, marketContractionRisk, awardSizeBarrierRisk, vehicleLockInRisk. Concise. Numeric evidence.

targetList: For each target include contact when available. When target derives from a shortlist opportunity, include noticeId (so user can open notice on SAM.gov) and pointOfContact email/phone/pocName when present. For agency/recipient targets include noticeId=null. Schema: [{target, type, reason, noticeId?, email?, phone?, pocName?}]

Schema:
{"executiveSummary":{"marketStatement":"string","whyItMatters":"string"},"scores":{"barrierScore":number,"barrierLevel":"string","confidence":"string","confidenceReason":"string"},"keyMetrics":{"marketSizeFY2024":number|null,"marketSizeFY2025":number|null,"growthRatePercent":number|null,"avgAwardSize":number,"concentrationPercent":number},"topRecipients":[{"name":"string","amount":number}],"recommendedEntryPath":{"path":"Prime|Subcontract|Teaming|Micro-pilot","why":"string"},"nextActions":[{"action":"string","owner":"Company","timelineDays":number}],"targetList":[{"target":"string","type":"string","reason":"string","noticeId":null,"email":null,"phone":null,"pocName":null}],"tactical30DayPlan":{"agencyPositioning":[{"agency":"string","whyAttractive":"string","action":"string","timelineDays":number}],"immediateBidTargets":[{"noticeId":"string","title":"string","recommendation":"string","why":"string","immediateAction":"string","riskLevel":"string"}],"entryStrategyRecommendation":{"path":"string","why":"string"},"riskFlags":["string"]},"captureStrategyBrief":{"marketPositionAssessment":{"interpretation":"string","implications":"string","marketPosture":"Favorable|Competitive|Incumbent-Dominated|Contracting"},"incumbentLandscape":{"integratorDominance":"string","primeWinLikelihood":"string","positioningRecommendation":"string","recommendationReason":"string"},"opportunityCaptureStrategy":[{"noticeId":"string","title":"string","recommendation":"Prime|Team|Avoid","why":"string","riskLevel":"Low|Medium|High","tacticalNextStep":"string","bidNoBid":"Bid|No-Bid"}],"captureRoadmap":{"days0to30":["string"],"days30to60":["string"],"days60to90":["string"]},"structuralRiskMitigation":[{"risk":"string","mitigation":"string"}]}

Data (use ONLY this):
marketSizeFY2024: ${dataPayload.marketSizeFY2024 ?? 'null'}
marketSizeFY2025: ${dataPayload.marketSizeFY2025 ?? 'null'}
growthRatePercent: ${dataPayload.growthRatePercent ?? 'null'}
avgAwardSize: ${dataPayload.avgAwardSize ?? 'null'}
concentrationPercent: ${dataPayload.concentrationPercent ?? 'null'}
barrierScore: ${dataPayload.barrierScore ?? 'null'}
barrierLevel: ${dataPayload.barrierLevel ?? 'Unknown'}
opportunityCount: ${dataPayload.opportunityCount ?? 0}
awardsCount: ${dataPayload.awardsCount ?? 0}
recommendedNaics: ${JSON.stringify(dataPayload.recommendedNaics ?? null)}
topRecipients: ${JSON.stringify(dataPayload.topRecipients || [])}
agency_rollup: ${JSON.stringify(topAgencies)}
shortlist (top 10): ${JSON.stringify(topOppsSample)}

Output valid JSON only.`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    })
    const text = completion?.choices?.[0]?.message?.content?.trim() || '{}'
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    // Safeguard: replace AI-generated growth rate with our computed value in marketStatement
    let computedGrowth = dataPayload.growthRatePercent
    if (computedGrowth == null && dataPayload.marketSizeFY2024 != null && dataPayload.marketSizeFY2025 != null && dataPayload.marketSizeFY2024 !== 0) {
      computedGrowth = computeGrowthRatePercent(dataPayload.marketSizeFY2024, dataPayload.marketSizeFY2025)
    }
    const replacement = computedGrowth != null ? `${computedGrowth}%` : 'N/A'
    if (parsed?.executiveSummary?.marketStatement) {
      const growthRegex = /growth\s+rate\s*(?::|(?:of|is|at)\s+)-?\d+(?:\.\d+)?\s*%?/gi
      parsed.executiveSummary.marketStatement = parsed.executiveSummary.marketStatement.replace(
        growthRegex,
        `growth rate of ${replacement}`
      )
    }
    return parsed
  } catch (err) {
    console.error('[federal-entry] AI summary failed:', err?.message)
    return null
  }
}

// POST /run — rate limited by IP (5/hour)
router.post('/run', runRateLimit, express.json(), async (req, res) => {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured', details: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required' })
  }

  const body = req.body || {}
  const debugFlag = !!body.debug

  // Resolve NAICS: frontend sends resolved naics[]; fallback to industryKey when empty
  let naics = Array.isArray(body.naics) ? body.naics.filter((s) => typeof s === 'string' && s.trim()) : []
  const industryKey = (body.industryKey || '').toString().trim().toUpperCase()
  if (naics.length === 0 && industryKey && industryKey !== 'OTHER') {
    naics = getNaicsForIndustry(industryKey)
  }
  naics = expandNaicsForApi(naics)

  if (naics.length === 0) {
    return res.status(400).json({
      error: 'NAICS required',
      message: 'Select an industry category with default NAICS, or provide custom NAICS (comma-separated).',
    })
  }

  const keywords = Array.isArray(body.keywords) ? body.keywords.filter((s) => typeof s === 'string' && s.trim()) : []
  const agency = (body.agency || '').toString().trim()
  const fy = Array.isArray(body.fy) && body.fy.length > 0 ? body.fy.map(String) : ['2024', '2025', '2026']
  const limit = Math.min(Math.max(parseInt(body.limit, 10) || 200, 1), LIMIT_CAP)
  const usOnly = !!body.usOnly
  const preferSetAsides = !!body.preferSetAsides
  const excludeVehicleRequired = !!body.excludeVehicleRequired

  const resolvedFilters = { industryKey: industryKey || undefined, naics, keywords, agency: agency || 'All (no filter)', fy, limit, usOnly, preferSetAsides, excludeVehicleRequired }

  // Structured logging: incoming request
  console.log('[federal-entry] Request body:', JSON.stringify({ ...body, naics: body.naics }, null, 2))

  const inputJson = { naics, keywords, agency, fy, limit, industryKey: industryKey || undefined, usOnly, preferSetAsides, excludeVehicleRequired }

  const now = new Date()
  const postedFrom = (() => { const d = new Date(); d.setDate(d.getDate() - 364); return formatMmDdYyyy(d) })()
  const postedTo = formatMmDdYyyy(now)
  const fetchOpts = { limit, ptype: 'o', postedFrom, postedTo, title: keywords[0], naics: naics.length > 0 ? naics : undefined, agency, fy }

  let reportId
  try {
    const { data: inserted, error: insertErr } = await supabase
      .from('report_runs')
      .insert({ input_json: { ...inputJson, debug: debugFlag }, status: 'running' })
      .select('id')
      .single()
    if (insertErr || !inserted) {
      return res.status(500).json({ error: 'Failed to create report run', details: insertErr?.message })
    }
    reportId = inserted.id
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create report run', details: err?.message })
  }

  (async () => {
    try {
      const samOpts = { ...fetchOpts }
      const spendOpts = { agency, fy, naics: naics.length > 0 ? naics : undefined }
      const awardsOpts = { limit, fy, naics: naics.length > 0 ? naics : undefined, agency }

      console.log('[federal-entry] SAM.gov opportunities request:', {
        url: 'https://api.sam.gov/opportunities/v2/search',
        payload: { limit: samOpts.limit, ptype: samOpts.ptype, postedFrom: samOpts.postedFrom, postedTo: samOpts.postedTo, ncode: samOpts.naics?.[0], title: samOpts.title },
      })
      console.log('[federal-entry] USAspending spend-over-time request:', {
        url: 'https://api.usaspending.gov/api/v2/search/spending_over_time/',
        payload: { agency: spendOpts.agency, fy: spendOpts.fy, naics: spendOpts.naics },
      })
      console.log('[federal-entry] USAspending spending-by-award request:', {
        url: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
        payload: { limit: awardsOpts.limit, fy: awardsOpts.fy, naics: awardsOpts.naics },
      })

      const naicsRankingPromise = computeNaicsBarrierRanking(naics, agency, fy, limit, postedFrom, postedTo)
      const [naicsComparison, opportunities, agencyReport, spendOverTime, recentAwardsFirst] = await Promise.all([
        naicsRankingPromise,
        withTimeout(fetchSamgovOpportunities(fetchOpts), FETCH_TIMEOUT_MS),
        withTimeout(fetchSamgovAgencyReport(fetchOpts), FETCH_TIMEOUT_MS),
        withTimeout(fetchUsaspendingSpendingOverTime(spendOpts), FETCH_TIMEOUT_MS),
        withTimeout(fetchUsaspendingRecentAwards(awardsOpts), FETCH_TIMEOUT_MS),
      ])
      let recentAwards = recentAwardsFirst
      if ((recentAwardsFirst.data || []).length === 0 && agency && !recentAwardsFirst.error) {
        const fallbackAwards = await withTimeout(fetchUsaspendingRecentAwards({ ...awardsOpts, agency: undefined }), FETCH_TIMEOUT_MS)
        if ((fallbackAwards.data || []).length > 0) {
          recentAwards = { ...fallbackAwards, _agencyFallback: true }
        }
      }

      const oppCount = (opportunities.data || []).length
      const awardsCount = (recentAwards.data || []).length
      const spendCount = (spendOverTime.data || []).length
      if (recentAwards._debug && recentAwards.status >= 400) {
        console.error('[federal-entry] USAspending spending_by_award error:', recentAwards._debug.statusCode, JSON.stringify(recentAwards._debug.responseBody))
      }
      if (spendOverTime._debug && spendOverTime.status >= 400) {
        console.error('[federal-entry] USAspending spending_over_time error:', spendOverTime._debug.statusCode, JSON.stringify(spendOverTime._debug.responseBody))
      }
      const coverageConfidence = computeConfidenceFromCoverage(oppCount, awardsCount, spendCount)
      console.log('[federal-entry] Counts returned: opportunities=%d, awards=%d, spend rows=%d', oppCount, awardsCount, spendCount)
      const rankedNaics = Array.isArray(naicsComparison) ? naicsComparison : []
      const recommendedNaics = rankedNaics[0]?.naics ?? naics[0] ?? null

      const now = new Date()
      let oppData = (opportunities.data || []).filter((opp) => {
        const d = parseIsoOrFlexibleDate(opp.responseDeadLine || opp.response_dead_line)
        return !d || d > now
      })
      const ruleHitsAgg = {}
      let vehicleFilteredCount = 0
      let uncertainCount = 0
      for (const opp of oppData) {
        const signals = resolveSignals(opp)
        opp.signals = {
          vehicle_required: { value: signals.vehicle_required.value, confidence: signals.vehicle_required.confidence },
          first_win_eligible: { value: signals.first_win_eligible.value, confidence: signals.first_win_eligible.confidence },
          set_aside_preferred: { value: signals.set_aside_preferred.value, confidence: signals.set_aside_preferred.confidence },
          complexity_level: { value: signals.complexity_level.value, confidence: signals.complexity_level.confidence },
        }
        if (signals._ruleHits) {
          for (const [name, cnt] of Object.entries(signals._ruleHits)) {
            ruleHitsAgg[name] = (ruleHitsAgg[name] || 0) + cnt
          }
        }
        if (signals.uncertain) uncertainCount++
        addToReviewQueueIfNeeded(opp, signals).catch(() => {})
      }
      const inputs = inputJson
      if (inputs.excludeVehicleRequired) {
        vehicleFilteredCount = oppData.filter((o) => o.signals?.vehicle_required?.value === true).length
      }
      const opportunity_scores = computeOpportunityScores(oppData, inputs)
      const sortedByWin = opportunity_scores.slice().sort((a, b) => (b.win_score || 0) - (a.win_score || 0))
      const first_win_shortlist = sortedByWin.slice(0, SHORTLIST_SIZE)

      const rawData = {
        opportunities_feed: oppData,
        agency_rollup: agencyReport.data || [],
        spend_over_time: spendOverTime.data || [],
        recent_awards: recentAwards.data || [],
      }
      let marketMetrics = computeEntryBarrierScore(rawData)
      // Fallback: compute growth from market sizes when entry-barrier returned null (e.g. API structure edge case)
      if (marketMetrics.growthRatePercent == null && marketMetrics.marketSizeFY2024 != null && marketMetrics.marketSizeFY2025 != null && marketMetrics.marketSizeFY2024 !== 0) {
        marketMetrics = {
          ...marketMetrics,
          growthRatePercent: computeGrowthRatePercent(marketMetrics.marketSizeFY2024, marketMetrics.marketSizeFY2025),
        }
      }
      const recentAwardsData = rawData.recent_awards || []

      const awardAmounts = recentAwardsData.map((a) => Number(a.awardAmount || a.award_amount || 0)).filter((n) => n > 0)
      const sampleAwardAmounts = awardAmounts.slice(0, 5)
      const sampleRecipients = recentAwardsData.slice(0, 5).map((a) => (a.recipientName || a.recipient_name || 'Unknown').toString().trim())

      const mfy24 = marketMetrics.marketSizeFY2024
      const mfy25 = marketMetrics.marketSizeFY2025
      const avg = marketMetrics.avgAwardSize
      const m24 = mfy24 != null ? mfy24 : 0
      let avgAwardSizeConfidence = 'Medium'
      let avgAwardSizeFlag = null
      let metricInconsistency = false

      if (avg > m24 && m24 > 0) {
        metricInconsistency = true
        avgAwardSizeConfidence = 'Low'
        avgAwardSizeFlag = 'avgAwardSize exceeds marketSizeFY2024 - data source mismatch'
      } else if (recentAwardsData.length < 10) {
        avgAwardSizeConfidence = 'Low'
        avgAwardSizeFlag = 'recent_awards count < 10 - low confidence'
      } else if (naics.includes('541512') && agency.toUpperCase().includes('TREASURY') && avg > 100000000) {
        avgAwardSizeFlag = 'avgAwardSize > 100M for NAICS 541512 Treasury - unusually high'
      }

      if (metricInconsistency) avgAwardSizeConfidence = 'Low'

      const debugBlock = {
        agency,
        naics,
        fyList: fy,
        marketSizeFY2024: mfy24,
        marketSizeFY2025: mfy25,
        growthRatePercent: marketMetrics.growthRatePercent,
        avgAwardSize: marketMetrics.avgAwardSize,
        concentrationPercent: marketMetrics.concentrationPercent,
        topRecipientsCount: marketMetrics.topRecipients?.length ?? 0,
        sampleAwardAmounts,
        sampleRecipients,
        avgAwardSizeConfidence,
        avgAwardSizeFlag,
        metricInconsistency,
      }
      console.log('[federal-entry] DEBUG metrics (no secrets):', JSON.stringify(debugBlock, null, 2))

      const sampleOppNaics = (first_win_shortlist || [])
        .slice(0, 3)
        .map((o) => o.naicsCode || o.naics_code || '')
        .filter(Boolean)

      const scoreBreakdown = (first_win_shortlist || [])
        .slice(0, 5)
        .map((o) => ({
          noticeId: o.noticeId || o.notice_id,
          title: (o.title || '').slice(0, 60),
          fit_score: o.fit_score,
          first_win_score: o.first_win_score,
          win_score: o.win_score,
          breakdown: o.firstWinBreakdown || {},
        }))

      const agencyLabel = agency ? agency : 'All (no filter)'
      const awardsQueryDebug = {
        url: 'https://api.usaspending.gov/api/v2/search/spending_by_award/',
        filters: { agency: agencyLabel, fy, naics },
        requestPayload: recentAwards._requestPayload ?? recentAwards._debug?.requestPayload,
        awardsCount,
        agencyFallbackUsed: !!recentAwards._agencyFallback,
      }
      if (recentAwards._debug && recentAwards.status >= 400) {
        awardsQueryDebug.error = { statusCode: recentAwards._debug.statusCode, responseBody: recentAwards._debug.responseBody }
      }
      const spendQueryDebug = {
        url: 'https://api.usaspending.gov/api/v2/search/spending_over_time/',
        filters: { agency: agencyLabel, fy, naics },
        requestPayload: spendOverTime._requestPayload || spendOverTime._debug?.requestPayload,
        spendCount,
      }
      if (spendOverTime._debug && spendOverTime.status >= 400) {
        spendQueryDebug.error = { statusCode: spendOverTime._debug.statusCode, responseBody: spendOverTime._debug.responseBody }
      }
      const debugOutput = debugFlag
        ? {
            resolvedFilters: { ...resolvedFilters },
            sampleOpportunityNaics: sampleOppNaics,
            samQuery: { url: 'https://api.sam.gov/opportunities/v2/search', params: { limit: fetchOpts.limit, ptype: fetchOpts.ptype, postedFrom, postedTo, ncode: naics[0], title: fetchOpts.title } },
            samCount: oppCount,
            awardsQuery: awardsQueryDebug,
            spendQuery: spendQueryDebug,
            signalEngine: {
              vehicleFilteredCount,
              uncertainCount,
              ruleHits: ruleHitsAgg,
            },
            scoreBreakdown,
          }
        : undefined

      const opportunityScores = sortedByWin.map((o) => ({ noticeId: o.noticeId || o.notice_id || '', winScore: o.win_score || 0 }))

      const dataJson = {
        ...rawData,
        ...marketMetrics,
        opportunityScores,
        opportunity_scores,
        first_win_shortlist,
        opportunityCount: opportunity_scores.length,
        awardsCount,
        avgAwardSizeConfidence,
        avgAwardSizeFlag,
        metricInconsistency,
        opportunityCountSource: 'solicitations',
        recommendedNaics,
        naicsComparison: rankedNaics,
        coverageConfidence,
        ...(debugOutput && { debug: debugOutput }),
      }

      const summaryJson = await generateAISummary(dataJson)

      await supabase
        .from('report_runs')
        .update({
          data_json: dataJson,
          summary_json: summaryJson,
          status: 'completed',
        })
        .eq('id', reportId)
    } catch (err) {
      console.error('[federal-entry] Run failed:', err)
      await supabase.from('report_runs').update({ status: 'failed' }).eq('id', reportId)
    }
  })()

  return res.status(202).json({ reportRunId: reportId, status: 'running', message: 'Report generation started. Poll GET /:reportRunId/data or /summary for results.' })
})

// GET /:reportRunId/data
router.get('/:reportRunId/data', async (req, res) => {
  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(503).json({ error: 'Database not configured' })

  const { reportRunId } = req.params
  const { data, error } = await supabase.from('report_runs').select('id, created_at, input_json, data_json, status').eq('id', reportRunId).single()

  if (error || !data) return res.status(404).json({ error: 'Report not found', details: error?.message })
  if (data.status === 'failed') return res.status(500).json({ error: 'Report failed', details: 'Run completed with errors' })

  return res.json({
    reportRunId: data.id,
    createdAt: data.created_at,
    inputs: data.input_json,
    data: data.data_json,
    status: data.status,
  })
})

// GET /:reportRunId/summary
router.get('/:reportRunId/summary', async (req, res) => {
  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(503).json({ error: 'Database not configured' })

  const { reportRunId } = req.params
  const { data, error } = await supabase.from('report_runs').select('id, created_at, input_json, summary_json, data_json, status').eq('id', reportRunId).single()

  if (error || !data) return res.status(404).json({ error: 'Report not found', details: error?.message })
  if (data.status === 'failed') return res.status(500).json({ error: 'Report failed' })

  const shortlist = data.data_json?.first_win_shortlist || []

  // Fix AI-hallucinated growth rate in summary before returning (catches stored + live reports)
  let summary = data.summary_json || {}
  let m24 = data.data_json?.marketSizeFY2024
  let m25 = data.data_json?.marketSizeFY2025
  let correctGrowth = data.data_json?.growthRatePercent
  if (correctGrowth == null && m24 != null && m25 != null && m24 !== 0) {
    correctGrowth = computeGrowthRatePercent(m24, m25)
  }
  // Fallback: parse FY2024/FY2025 amounts from summary text when data_json lacks them
  const stmt = summary?.executiveSummary?.marketStatement || ''
  if (correctGrowth == null && stmt) {
    const fy24Match = stmt.match(/FY2024\s+is\s+\$?([\d,]+(?:\.\d+)?)/i) || stmt.match(/FY\s*2024[^\d]*\$?([\d,]+(?:\.\d+)?)/i)
    const fy25Match = stmt.match(/FY2025\s+is\s+\$?([\d,]+(?:\.\d+)?)/i) || stmt.match(/FY\s*2025[^\d]*\$?([\d,]+(?:\.\d+)?)/i)
    const v24 = fy24Match ? parseFloat(fy24Match[1].replace(/,/g, '')) : null
    const v25 = fy25Match ? parseFloat(fy25Match[1].replace(/,/g, '')) : null
    if (v24 != null && v25 != null && v24 > 0) {
      correctGrowth = computeGrowthRatePercent(v24, v25)
    }
  }
  if (correctGrowth != null && stmt) {
    const repl = `${correctGrowth}%`
    const growthRegex = /growth\s+rate\s*(?::|(?:of|is|at)\s+)-?\d+(?:\.\d+)?\s*%?/gi
    summary = {
      ...summary,
      executiveSummary: {
        ...summary.executiveSummary,
        marketStatement: stmt.replace(growthRegex, `growth rate of ${repl}`),
      },
    }
  }

  const response = {
    reportRunId: data.id,
    createdAt: data.created_at,
    inputs: data.input_json,
    summary,
    barrierScore: data.data_json?.barrierScore,
    barrierLevel: data.data_json?.barrierLevel,
    recommendedNaics: data.data_json?.recommendedNaics,
    naicsComparison: data.data_json?.naicsComparison || [],
    first_win_shortlist: shortlist,
    status: data.status,
    confidenceLevel: data.data_json?.coverageConfidence?.confidenceLevel,
    confidenceReason: data.data_json?.coverageConfidence?.confidenceReason,
    growthRatePercent: correctGrowth ?? data.data_json?.growthRatePercent,
    marketSizeFY2024: data.data_json?.marketSizeFY2024,
    marketSizeFY2025: data.data_json?.marketSizeFY2025,
  }
  if (data.data_json?.debug) response.debug = data.data_json.debug
  return res.json(response)
})

// GET /:reportRunId/pdf (stub)
router.get('/:reportRunId/pdf', async (req, res) => {
  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(503).json({ error: 'Database not configured' })

  const { reportRunId } = req.params
  const { data, error } = await supabase.from('report_runs').select('id, status').eq('id', reportRunId).single()

  if (error || !data) return res.status(404).json({ error: 'Report not found' })
  return res.status(501).json({ error: 'PDF export not yet implemented', reportRunId })
})

// GET /:reportRunId/leads.csv
router.get('/:reportRunId/leads.csv', async (req, res) => {
  const supabase = getSupabaseAdmin()
  if (!supabase) return res.status(503).json({ error: 'Database not configured' })

  const { reportRunId } = req.params
  const { data, error } = await supabase.from('report_runs').select('data_json, status').eq('id', reportRunId).single()

  if (error || !data) return res.status(404).json({ error: 'Report not found' })
  if (data.status !== 'completed') return res.status(400).json({ error: 'Report not ready', status: data.status })

  const shortlist = data.data_json?.first_win_shortlist || []
  const baseHeaders = ['noticeId', 'title', 'organization', 'solicitationNumber', 'postedDate', 'responseDeadLine', 'fit_score', 'first_win_score', 'win_score', 'barrier_score', 'days_until_deadline', 'naicsCode', 'setAside', 'pocName', 'pocEmail', 'pocPhone', 'uiLink']
  const signalHeaders = ['vehicle_required', 'first_win_eligible', 'set_aside_preferred', 'complexity_level']
  const headers = [...baseHeaders, ...signalHeaders.map((h) => `signals_${h}`)]
  const rows = shortlist.map((o) => {
    const poc = o.pointOfContact || {}
    const baseVals = baseHeaders.map((h) => {
      let v
      if (h === 'pocName') v = poc.fullName
      else if (h === 'pocEmail') v = poc.email
      else if (h === 'pocPhone') v = poc.phone
      else if (h === 'uiLink') v = o.uiLink || (o.noticeId ? `https://sam.gov/opp/${o.noticeId}/view` : null)
      else v = o[h]
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    })
    const signalVals = signalHeaders.map((h) => {
      const v = o.signals?.[h]?.value
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    })
    return [...baseVals, ...signalVals]
  })
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', `attachment; filename="federal-entry-leads-${reportRunId.slice(0, 8)}.csv"`)
  res.send(csv)
})

module.exports = router
module.exports.computeGrowthRatePercent = computeGrowthRatePercent
module.exports.computeEntryBarrierScore = computeEntryBarrierScore
module.exports.computeConfidenceFromCoverage = computeConfidenceFromCoverage
