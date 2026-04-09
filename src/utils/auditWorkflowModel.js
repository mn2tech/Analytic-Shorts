/**
 * TTB-style audit workflow: enrich uploaded rows with case metadata, recommended actions, and KPIs.
 */

import { formatAiInsightsTopReasons } from './aiInsightsTopReasons'

const STORAGE_CASES = 'auditWorkflowCases'
const STORAGE_AI = 'aiRiskAnalysisLastResult'

export function saveAiRiskResultToStorage(result) {
  try {
    sessionStorage.setItem(STORAGE_AI, JSON.stringify(result))
  } catch {
    /* quota */
  }
}

const AUDITORS = ['J. Martinez', 'A. Chen', 'R. Okafor', 'S. Patel', 'Unassigned']
const STATUSES = ['Open', 'Assigned', 'In Review', 'Pending', 'Closed']

function parseNum(v) {
  if (v === null || v === undefined || v === '') return NaN
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/**
 * Business rules for recommended_action.
 * @param {'High'|'Medium'|'Low'} riskLevel
 * @param {number} taxGap
 * @returns {'Immediate Audit'|'Review'|'Monitor'}
 */
export function deriveRecommendedAction(riskLevel, taxGap) {
  const tg = Number.isFinite(taxGap) ? taxGap : 0
  const L = normalizeRiskLevel(riskLevel)
  if (L === 'High') return 'Immediate Audit'
  if (L === 'Medium' && tg > 2500) return 'Review'
  return 'Monitor'
}

function normalizeRiskLevel(rl) {
  const s = String(rl ?? '').trim().toLowerCase()
  if (s === 'high' || s === 'h') return 'High'
  if (s === 'medium' || s === 'med' || s === 'm') return 'Medium'
  if (s === 'low' || s === 'l') return 'Low'
  return 'Medium'
}

function riskLevelFromScore(score) {
  if (score >= 60) return 'High'
  if (score >= 30) return 'Medium'
  return 'Low'
}

function mockLastUpdated(index) {
  const d = new Date()
  d.setDate(d.getDate() - (index % 14))
  d.setHours(9 + (index % 8), (index * 7) % 60, 0, 0)
  return d.toISOString()
}

function mockReportMonth(row) {
  if (row.report_month) return String(row.report_month)
  const fd = row.filing_date || row.due_date
  if (fd) {
    const d = new Date(fd)
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }
  }
  return '2026-03'
}

/**
 * Merge AI risk API record with source row.
 */
function findAiRecord(aiRecords, row, index) {
  if (!Array.isArray(aiRecords) || !aiRecords.length) return null
  const idKeys = ['entity_id', 'company_id', 'id', 'record_id', 'case_id']
  for (const k of idKeys) {
    if (row[k] != null && row[k] !== '') {
      const hit = aiRecords.find((r) => String(r.record_id) === String(row[k]))
      if (hit) return hit
    }
  }
  return aiRecords[index] || null
}

/**
 * Build a full audit case from a data row + optional AI record.
 */
export function buildAuditCase(row, index, aiRecord) {
  const raw = { ...row }
  const taxGap = parseNum(raw.tax_gap ?? raw.taxGap)
  const violations = parseNum(raw.violations_count ?? raw.violationsCount)
  const inspection = parseNum(raw.inspection_score ?? raw.inspectionScore)

  let riskScore = parseNum(aiRecord?.risk_score)
  let riskLevel = aiRecord?.risk_level != null ? normalizeRiskLevel(aiRecord.risk_level) : null
  let anomalyFlag = aiRecord?.anomaly_flag ?? false
  // Distinguish canonical AI output from local heuristic fallback.
  // Canonical path = aiRecord with a valid risk score.
  // Fallback path = no usable aiRecord score, so we synthesize a score from business heuristics.
  let usedHeuristicFallback = false

  if (!Number.isFinite(riskScore)) {
    usedHeuristicFallback = true
    let s = 25
    if (Number.isFinite(taxGap) && taxGap > 5000) s += 25
    if (Number.isFinite(violations) && violations >= 2) s += 20
    if (Number.isFinite(inspection) && inspection < 70) s += 15
    riskScore = Math.min(100, s + (index % 17))
  }
  if (!riskLevel) riskLevel = riskLevelFromScore(riskScore)

  const syntheticRecord = {
    raw,
    anomaly_flag: anomalyFlag,
    top_reasons: aiRecord?.top_reasons,
    fallback_rule_based: usedHeuristicFallback || Boolean(aiRecord?.fallback_rule_based),
  }
  const topReason = formatAiInsightsTopReasons(syntheticRecord) || aiRecord?.explanation_text?.slice(0, 80) || '—'

  const recommendedAction = deriveRecommendedAction(riskLevel, Number.isFinite(taxGap) ? taxGap : 0)

  const year = new Date().getFullYear()
  const caseId = `AUD-${year}-${String(index + 1).padStart(5, '0')}`
  const permitId = raw.permit_id != null && String(raw.permit_id).trim() !== ''
    ? String(raw.permit_id).trim()
    : `TTB-P-${100000 + (index % 900000)}`

  const companyName = raw.company_name || raw.company || raw.entity_name || `Entity ${raw.entity_id || index + 1}`
  const productType = raw.product_type || raw.product || '—'
  const state = raw.state || raw.region || '—'
  const assignedTo = AUDITORS[index % AUDITORS.length]
  const status = STATUSES[index % STATUSES.length]

  const narrative = [
    `Compliance review for ${companyName} (${state}).`,
    Number.isFinite(taxGap) && taxGap > 0 ? `Reported tax gap context: ${taxGap.toLocaleString()}.` : '',
    Number.isFinite(inspection) ? `Latest inspection score: ${inspection}.` : '',
    recommendedAction !== 'Monitor' ? `Recommended: ${recommendedAction}.` : '',
  ].filter(Boolean).join(' ')

  const priority =
    recommendedAction === 'Immediate Audit' ? 'P1 — Critical' : recommendedAction === 'Review' ? 'P2 — Elevated' : 'P3 — Watch'

  const due = new Date()
  due.setDate(due.getDate() + (recommendedAction === 'Immediate Audit' ? 3 : recommendedAction === 'Review' ? 14 : 45))

  const timeline = [
    { stage: 'Risk Detected', date: mockLastUpdated(index + 2), status: 'complete' },
    { stage: 'Case Created', date: mockLastUpdated(index + 1), status: 'complete' },
    { stage: 'Assigned', date: status !== 'Open' ? mockLastUpdated(index) : null, status: status !== 'Open' ? 'complete' : 'pending' },
    { stage: 'In Review', date: status === 'In Review' || status === 'Pending' ? mockLastUpdated(index - 1) : null, status: ['In Review', 'Pending', 'Closed'].includes(status) ? 'complete' : 'pending' },
    { stage: 'Audit Open', date: null, status: 'pending' },
    { stage: 'Findings Issued', date: null, status: 'pending' },
    { stage: 'Closed', date: status === 'Closed' ? mockLastUpdated(0) : null, status: status === 'Closed' ? 'complete' : 'pending' },
  ]

  return {
    case_id: caseId,
    permit_id: permitId,
    company_name: companyName,
    product_type: productType,
    state,
    risk_score: Math.round(riskScore * 10) / 10,
    risk_level: riskLevel,
    top_reason: topReason,
    tax_gap: Number.isFinite(taxGap) ? taxGap : null,
    violations_count: Number.isFinite(violations) ? violations : null,
    inspection_score: Number.isFinite(inspection) ? inspection : null,
    anomaly_flag: anomalyFlag,
    // Explicit transparency flags: this case needs canonical scoring if fallback was used.
    fallback_rule_based: usedHeuristicFallback || Boolean(aiRecord?.fallback_rule_based),
    needs_canonical_run: usedHeuristicFallback,
    scoring_source: usedHeuristicFallback ? 'heuristic_fallback' : 'canonical_ai',
    recommended_action: recommendedAction,
    assigned_to: assignedTo,
    assigned_auditor: assignedTo,
    status,
    case_status: status,
    last_updated: mockLastUpdated(index),
    report_month: mockReportMonth(raw),
    narrative,
    explanation_text: aiRecord?.explanation_text || narrative,
    priority,
    due_date: due.toISOString().slice(0, 10),
    escalation_note:
      recommendedAction === 'Immediate Audit'
        ? 'Escalate to regional lead if no response within 48h.'
        : recommendedAction === 'Review'
          ? 'Schedule desk review with product specialist.'
          : 'Continue periodic monitoring; no field visit required unless thresholds change.',
    estimated_recovery_case:
      riskLevel === 'High' ? 10000 : riskLevel === 'Medium' ? 4500 : 1200,
    company_profile: `${companyName} operates in ${state}; primary product category: ${productType}.`,
    filing_history: [
      { date: '2025-12-01', type: 'Quarterly', amount: raw.reported_volume ? String(raw.reported_volume) : '—' },
      { date: '2025-09-01', type: 'Quarterly', amount: '—' },
      { date: '2025-06-01', type: 'Annual summary', amount: '—' },
    ],
    prior_issues:
      (Number.isFinite(violations) && violations >= 2
        ? ['Prior late filing (2024)', 'Variance notice issued']
        : ['No major prior findings']
      ).slice(0, 3),
    evidence: {
      filingRecords: ['TTB-EXC-2025.pdf', 'Production log (redacted).xlsx'],
      inspectionHistory: ['Site visit 2024-Q3 (score on file)', 'Self-certification 2025-Q1'],
      aiSummary: topReason,
      notes: '',
    },
    outcome: {
      confirmed_issue: null,
      recovered_tax_amount: '',
      penalty_amount: '',
      time_spent_hours: '',
      resolution_status: 'Not resolved',
    },
    raw,
    _ai: aiRecord || null,
  }
}

/**
 * @returns {object[]} audit cases
 */
export function buildAuditCasesFromDataset(rows, aiRiskResult) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  const aiRecords = aiRiskResult?.records || []
  return rows.map((row, i) => buildAuditCase(row, i, findAiRecord(aiRecords, row, i)))
}

export function loadAiRiskResultFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_AI)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveAuditCasesToStorage(cases) {
  try {
    sessionStorage.setItem(STORAGE_CASES, JSON.stringify(cases))
  } catch {
    /* quota */
  }
}

export function loadAuditCasesFromStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_CASES)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadAnalyticsRowsFromStorage() {
  try {
    const raw = sessionStorage.getItem('analyticsData')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const data = parsed?.data
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * Refresh cases from current session data and persist.
 */
export function refreshAuditCases() {
  const rows = loadAnalyticsRowsFromStorage()
  const ai = loadAiRiskResultFromStorage()
  const cases = buildAuditCasesFromDataset(rows, ai)
  saveAuditCasesToStorage(cases)
  return cases
}

export function getAuditCaseById(caseId) {
  const cases = loadAuditCasesFromStorage() || []
  return cases.find((c) => c.case_id === caseId) || null
}

/**
 * KPI rollup for queue page.
 */
export function computeAuditQueueKpis(cases) {
  const list = Array.isArray(cases) ? cases : []
  const immediate = list.filter((c) => c.recommended_action === 'Immediate Audit').length
  const review = list.filter((c) => c.recommended_action === 'Review').length
  const monitor = list.filter((c) => c.recommended_action === 'Monitor').length
  const flagged = list.filter((c) => c.risk_level === 'High' || c.risk_level === 'Medium').length
  const openCases = list.filter((c) => c.status !== 'Closed' && c.case_status !== 'Closed').length
  const estimatedRecovery = list.reduce((sum, c) => sum + (Number(c.estimated_recovery_case) || 0), 0)
  return {
    total_flagged_cases: flagged,
    immediate_audit: immediate,
    review_needed: review,
    monitor,
    estimated_recovery: estimatedRecovery,
    open_cases: openCases,
  }
}

export function filterAuditCases(cases, filters) {
  if (!filters) return cases
  return cases.filter((c) => {
    if (filters.risk_level && c.risk_level !== filters.risk_level) return false
    if (filters.recommended_action && c.recommended_action !== filters.recommended_action) return false
    if (filters.state && String(c.state) !== filters.state) return false
    if (filters.product_type && String(c.product_type) !== filters.product_type) return false
    if (filters.assigned_auditor && c.assigned_to !== filters.assigned_auditor) return false
    if (filters.case_status && c.status !== filters.case_status) return false
    if (filters.report_month && c.report_month !== filters.report_month) return false
    return true
  })
}

export function uniqueValues(cases, key) {
  const s = new Set()
  cases.forEach((c) => {
    const v = c[key]
    if (v != null && v !== '') s.add(String(v))
  })
  return Array.from(s).sort()
}

/**
 * @param {string} caseId
 * @param {object} patch
 * @returns {object[]|null}
 */
export function patchAuditCase(caseId, patch) {
  const cases = loadAuditCasesFromStorage()
  if (!Array.isArray(cases)) return null
  const next = cases.map((c) =>
    c.case_id === caseId
      ? {
          ...c,
          ...patch,
          last_updated: new Date().toISOString(),
        }
      : c,
  )
  saveAuditCasesToStorage(next)
  return next
}
