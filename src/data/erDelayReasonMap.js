/**
 * Standardized ER delay-cause mapping.
 * Maps raw flow status text from scenario/feed data to canonical categories.
 */

export const ER_DELAY_REASON_DEFS = {
  waitingProvider: { label: 'Waiting Provider' },
  boarding: { label: 'Boarding Hold' },
  transfer: { label: 'Transfer/Transport Delay' },
  results: { label: 'Awaiting Results' },
  consult: { label: 'Consult Pending' },
  cleaning: { label: 'Room Cleaning Delay' },
  disposition: { label: 'Disposition Pending' },
  staffing: { label: 'Staffing Delay' },
  registration: { label: 'Registration/Authorization Hold' },
  behaviorHealth: { label: 'Behavioral Health Placement Delay' },
  operationalHold: { label: 'Operational Throughput Hold' },
}

const KEYWORD_RULES = [
  { key: 'waitingProvider', terms: ['waiting provider', 'provider pending'] },
  { key: 'boarding', terms: ['boarding', 'awaiting bed', 'bed assignment', 'admit hold'] },
  { key: 'transfer', terms: ['transfer', 'transport'] },
  { key: 'results', terms: ['result', 'imaging', 'lab', 'radiology'] },
  { key: 'consult', terms: ['consult'] },
  { key: 'cleaning', terms: ['cleaning', 'turnover', 'evs'] },
  { key: 'disposition', terms: ['disposition', 'pending discharge', 'ready for discharge'] },
  { key: 'staffing', terms: ['staffing', 'nurse unavailable', 'provider unavailable'] },
  { key: 'registration', terms: ['registration', 'authorization', 'insurance', 'admin hold'] },
  { key: 'behaviorHealth', terms: ['behavioral', 'psychiatric', 'mental health placement'] },
]

export function normalizeFlowStatus(value) {
  return String(value || '').trim().toLowerCase()
}

export function mapFlowStatusToDelayReason(flowStatus) {
  const normalized = normalizeFlowStatus(flowStatus)
  if (!normalized) return null
  for (const rule of KEYWORD_RULES) {
    if (rule.terms.some((term) => normalized.includes(term))) {
      return rule.key
    }
  }
  return 'operationalHold'
}

