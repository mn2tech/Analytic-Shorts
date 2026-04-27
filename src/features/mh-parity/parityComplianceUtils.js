const REQUIRED_FIELDS = [
  'mco_name',
  'plan_type',
  'benefit_classification',
  'service_name',
  'submission_status',
  'reporting_period',
]

const HELP_DESK_STATUSES = new Set(['pending', 'rejected', 'needs correction'])

function normalize(value) {
  return String(value ?? '').trim()
}

function normalizeStatus(value) {
  return normalize(value).toLowerCase()
}

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function firstIssueType(row, flags) {
  const rawIssue = normalize(row.issue_type)
  if (rawIssue && rawIssue.toLowerCase() !== 'none') return rawIssue
  if (flags.nonCompliantReasons.length > 0) return flags.nonCompliantReasons[0].rule
  if (flags.dataQualityReasons.length > 0) return 'Data Quality'
  if (flags.helpdeskAttention) return 'Submission Follow-up'
  return 'None'
}

export function evaluateParityRecord(row) {
  const copayMh = toNumber(row.copay_mh)
  const copayMed = toNumber(row.copay_med)
  const visitLimitMh = toNumber(row.visit_limit_mh)
  const visitLimitMed = toNumber(row.visit_limit_med)
  const priorAuthMh = normalizeStatus(row.prior_auth_mh)
  const priorAuthMed = normalizeStatus(row.prior_auth_med)
  const submissionStatus = normalize(row.submission_status) || 'Missing'
  const submissionStatusNorm = normalizeStatus(submissionStatus)
  const existingCompliance = normalizeStatus(row.compliance_status)
  const note = normalizeStatus(row.notes)

  const nonCompliantReasons = []
  if (copayMh !== null && copayMed !== null && copayMh > copayMed) {
    nonCompliantReasons.push({
      rule: 'Copay Disparity',
      evidence: `MH copay (${copayMh}) exceeds medical copay (${copayMed}).`,
    })
  }
  if (visitLimitMh !== null && visitLimitMed !== null && visitLimitMh < visitLimitMed) {
    nonCompliantReasons.push({
      rule: 'Visit Limit Disparity',
      evidence: `MH visit limit (${visitLimitMh}) is more restrictive than medical (${visitLimitMed}).`,
    })
  }
  if (priorAuthMh === 'yes' && priorAuthMed === 'no') {
    nonCompliantReasons.push({
      rule: 'Prior Auth Mismatch',
      evidence: 'Mental health service requires prior auth while medical service does not.',
    })
  }

  const missingFields = REQUIRED_FIELDS.filter((field) => !normalize(row[field]))
  const dataQualityReasons = []
  if (missingFields.length > 0) {
    dataQualityReasons.push({
      rule: 'Required Field Missing',
      evidence: `Missing fields: ${missingFields.join(', ')}`,
    })
  }
  if (existingCompliance === 'compliant' && normalizeStatus(row.issue_type) === 'missing submission') {
    dataQualityReasons.push({
      rule: 'Status Inconsistency',
      evidence: 'Issue type indicates missing submission but compliance status is compliant.',
    })
  }
  if (note.includes('missing documentation')) {
    dataQualityReasons.push({
      rule: 'Missing Documentation',
      evidence: 'Notes explicitly mention missing documentation.',
    })
  }

  const helpdeskAttention = HELP_DESK_STATUSES.has(submissionStatusNorm)
  const isMissingSubmission = submissionStatusNorm === 'missing'
  const isNonCompliant = nonCompliantReasons.length > 0
  const hasDataQualityIssue = dataQualityReasons.length > 0

  const derivedComplianceStatus = hasDataQualityIssue
    ? 'Data Quality Issue'
    : isMissingSubmission
      ? 'Missing Submission'
      : isNonCompliant
        ? 'Non-Compliant'
        : 'Compliant'

  const flags = {
    nonCompliantReasons,
    dataQualityReasons,
    helpdeskAttention,
    isNonCompliant,
    hasDataQualityIssue,
    isMissingSubmission,
  }

  return {
    ...row,
    submission_status: submissionStatus,
    derived_compliance_status: derivedComplianceStatus,
    derived_issue_type: firstIssueType(row, flags),
    helpdesk_attention: helpdeskAttention,
    flag_evidence: [...nonCompliantReasons, ...dataQualityReasons],
    ...flags,
  }
}

export function applyParityFilters(records, filters) {
  return records.filter((row) => {
    if (filters.mco !== 'All' && row.mco_name !== filters.mco) return false
    if (filters.compliance !== 'All' && row.derived_compliance_status !== filters.compliance) return false
    if (filters.submission !== 'All' && row.submission_status !== filters.submission) return false
    if (filters.issueType !== 'All' && row.derived_issue_type !== filters.issueType) return false
    if (filters.reportingPeriod !== 'All' && row.reporting_period !== filters.reportingPeriod) return false
    return true
  })
}

function countBy(records, selector) {
  const counts = new Map()
  records.forEach((item) => {
    const key = selector(item)
    counts.set(key, (counts.get(key) || 0) + 1)
  })
  return counts
}

export function deriveParityDashboard(records) {
  const totalMcos = new Set(records.map((r) => r.mco_name)).size
  const submissionCounts = countBy(records, (r) => r.submission_status)
  const issueCounts = countBy(records, (r) => r.derived_issue_type)

  const nonCompliantCount = records.filter((r) => r.isNonCompliant).length
  const compliantCount = records.filter((r) => r.derived_compliance_status === 'Compliant').length
  const pendingCount = records.filter((r) => normalizeStatus(r.submission_status) === 'pending').length
  const rejectedCount = records.filter((r) => normalizeStatus(r.submission_status) === 'rejected').length
  const dataQualityIssueCount = records.filter((r) => r.hasDataQualityIssue).length

  const mcoRiskMap = new Map()
  records.forEach((record) => {
    let score = 0
    if (record.isNonCompliant) score += 3
    if (normalizeStatus(record.submission_status) === 'rejected') score += 2
    if (normalizeStatus(record.submission_status) === 'pending' || record.hasDataQualityIssue) score += 1
    const existing = mcoRiskMap.get(record.mco_name) || { mco_name: record.mco_name, risk_score: 0, records: 0 }
    existing.risk_score += score
    existing.records += 1
    mcoRiskMap.set(record.mco_name, existing)
  })

  const mcoRiskScore = [...mcoRiskMap.values()].sort((a, b) => b.risk_score - a.risk_score || a.mco_name.localeCompare(b.mco_name))

  const nonCompliantByMco = [...countBy(records.filter((r) => r.isNonCompliant), (r) => r.mco_name)]
    .map(([mco_name, non_compliant_findings]) => ({ mco_name, non_compliant_findings }))
    .sort((a, b) => b.non_compliant_findings - a.non_compliant_findings)

  const issueTypeByMcoMap = new Map()
  records.forEach((record) => {
    if (record.derived_issue_type === 'None') return
    const existing = issueTypeByMcoMap.get(record.mco_name) || { mco_name: record.mco_name }
    existing[record.derived_issue_type] = (existing[record.derived_issue_type] || 0) + 1
    issueTypeByMcoMap.set(record.mco_name, existing)
  })

  const issueTypeByMco = [...issueTypeByMcoMap.values()].sort((a, b) => a.mco_name.localeCompare(b.mco_name))
  const topIssueTypes = [...issueCounts.entries()]
    .filter(([key]) => key !== 'None')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([issue_type, count]) => ({ issue_type, count }))

  const submissionStatusDistribution = [...submissionCounts.entries()].map(([status, count]) => ({ status, count }))
  const followUpMcos = mcoRiskScore.slice(0, 3).map((item) => item.mco_name)
  const mostCommonIssue = topIssueTypes[0]?.issue_type || 'No major issue type'

  const executiveSummary = [
    `${mcoRiskScore[0]?.mco_name || 'An MCO'} has the highest parity review risk score due to repeated non-compliant copay, visit-limit, and prior authorization findings.`,
    `Several MCO submissions remain pending or require correction, which may delay readiness for CMS reporting.`,
    `The most frequent issue pattern is ${mostCommonIssue.toLowerCase()} across current reporting periods.`,
  ]

  return {
    metrics: {
      total_mcos: totalMcos,
      total_records: records.length,
      compliant_count: compliantCount,
      non_compliant_count: nonCompliantCount,
      pending_count: pendingCount,
      rejected_count: rejectedCount,
      data_quality_issue_count: dataQualityIssueCount,
      top_issue_types: topIssueTypes,
      mco_risk_score: mcoRiskScore,
    },
    nonCompliantByMco,
    issueTypeByMco,
    submissionStatusDistribution,
    executiveSummary,
    topFollowUpMcos: followUpMcos,
    mostCommonIssue,
    helpdeskQueue: records.filter((r) => r.helpdesk_attention || r.isMissingSubmission),
  }
}

export function buildParityDemoState(rawData, filters) {
  const evaluated = rawData.map(evaluateParityRecord)
  const filteredRecords = applyParityFilters(evaluated, filters)
  const derived = deriveParityDashboard(filteredRecords)

  return {
    allRecords: evaluated,
    filteredRecords,
    ...derived,
    insightBlocks: {
      ComplianceOverviewBlock: {
        title: 'Parity Readiness Overview',
        summary: derived.executiveSummary[0],
      },
      SubmissionStatusBlock: {
        title: 'Submission Status',
        summary: `Pending: ${derived.metrics.pending_count}, Rejected: ${derived.metrics.rejected_count}`,
      },
      RiskRankingBlock: {
        title: 'Highest Risk MCOs',
        items: derived.metrics.mco_risk_score.slice(0, 3),
      },
      RecordEvidenceBlock: {
        title: 'Flagged Record Evidence',
        items: filteredRecords.filter((record) => record.flag_evidence.length > 0).slice(0, 5),
      },
    },
  }
}

export function exportRecordsToCsv(records) {
  if (!records.length) return ''
  const columns = Object.keys(records[0]).filter((key) => !['nonCompliantReasons', 'dataQualityReasons'].includes(key))
  const escape = (value) => {
    const text = String(value ?? '')
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }
  const rows = records.map((record) => columns.map((column) => escape(record[column])).join(','))
  return [columns.join(','), ...rows].join('\n')
}
