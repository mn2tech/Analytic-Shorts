/**
 * Mock data for Hospital Bed Command Center
 * HIPAA-safe synthetic patient identifiers and operational metadata.
 */

export const MOCK_TRIAGE_LEVELS = [1, 2, 2, 3, 3, 3, 3, 4, 4, 5]

export const MOCK_VISIT_REASONS = [
  'Abdominal Pain',
  'Chest Pain',
  'Shortness of Breath',
  'Headache',
  'Fever',
  'Back Pain',
  'Laceration',
  'Dizziness',
  'Nausea and Vomiting',
  'Trauma Evaluation',
  'Syncope',
  'Dehydration',
]

/** Realistic admission times (hour 0–23, minute 0–59). LOS computed dynamically from current time. */
export const MOCK_ADMISSION_TIMES = [
  { hour: 6, minute: 20 }, { hour: 7, minute: 45 }, { hour: 8, minute: 15 }, { hour: 9, minute: 0 },
  { hour: 9, minute: 42 }, { hour: 10, minute: 30 }, { hour: 11, minute: 0 }, { hour: 11, minute: 42 },
  { hour: 12, minute: 20 }, { hour: 13, minute: 5 }, { hour: 13, minute: 50 }, { hour: 14, minute: 18 },
  { hour: 15, minute: 0 }, { hour: 15, minute: 45 }, { hour: 16, minute: 30 }, { hour: 17, minute: 15 },
  { hour: 18, minute: 0 }, { hour: 19, minute: 20 }, { hour: 5, minute: 30 }, { hour: 20, minute: 10 },
]

/** @deprecated Use getAdmittedAtIsoForRoom for dynamic LOS. Kept for DEMO_LOS rooms that need specific mins-ago. */
export const MOCK_LOS_MINUTES = [45, 120, 90, 35, 180, 65, 210, 55, 95, 140, 75, 165, 50, 110, 85]

/** Simple hash for deterministic per-room selection */
function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h = h & h
  }
  return Math.abs(h)
}

export function pickPatientIdForRoom(roomId, index) {
  const numeric = 10001 + ((hash(roomId) + index) % 90000)
  return `PT-${numeric}`
}

export function pickTriageLevelForRoom(roomId, index) {
  const i = (hash(roomId) + index) % MOCK_TRIAGE_LEVELS.length
  return MOCK_TRIAGE_LEVELS[i]
}

export function pickReasonForVisitForRoom(roomId, index) {
  const i = (hash(roomId) + index) % MOCK_VISIT_REASONS.length
  return MOCK_VISIT_REASONS[i]
}

/**
 * Returns admitted_at_iso for a realistic admission time. LOS is computed dynamically from current time.
 * Uses today or yesterday so the time is always in the past.
 */
export function getAdmittedAtIsoForRoom(roomId, index) {
  const i = (hash(roomId) + index) % MOCK_ADMISSION_TIMES.length
  const { hour, minute } = MOCK_ADMISSION_TIMES[i]
  const now = new Date()
  let admitted = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0)
  if (admitted.getTime() > now.getTime()) {
    admitted.setDate(admitted.getDate() - 1)
  }
  return admitted.toISOString()
}

export function pickLosForRoom(roomId, index) {
  const i = (hash(roomId) + index) % MOCK_LOS_MINUTES.length
  return MOCK_LOS_MINUTES[i]
}
