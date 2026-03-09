/**
 * Mock data for Hospital Bed Command Center
 * Diverse patient and doctor names for demo
 */

export const MOCK_PATIENT_NAMES = [
  'Emma Thompson', 'Liam O\'Brien', 'Sofia Rodriguez', 'Noah Kim', 'Olivia Patel',
  'Ethan Martinez', 'Ava Chen', 'Mason Williams', 'Isabella Garcia', 'Lucas Johnson',
  'Mia Anderson', 'Alexander Taylor', 'Charlotte Lee', 'James Wilson', 'Amelia Brown',
  'Benjamin Davis', 'Harper Moore', 'Henry Thomas', 'Evelyn Jackson', 'Sebastian White',
  'Abigail Harris', 'Jack Martin', 'Elizabeth Clark', 'Aiden Lewis', 'Emily Robinson',
  'Samuel Walker', 'Ella Young', 'Joseph Hall', 'Scarlett Allen', 'David King',
  'Chloe Wright', 'Daniel Scott', 'Victoria Green', 'Matthew Adams', 'Grace Baker',
  'Andrew Nelson', 'Ryan Campbell', 'Zoey Mitchell', 'Nathan Roberts', 'Lily Evans', 'Owen Phillips',
]

export const MOCK_DOCTOR_NAMES = [
  'Dr. Sarah Patel', 'Dr. Michael Chen', 'Dr. Elena Rodriguez', 'Dr. David Kim', 'Dr. Jennifer Thompson',
  'Dr. James Adams', 'Dr. Rachel Foster', 'Dr. Daniel Hayes', 'Dr. Amanda Morgan', 'Dr. Carlos Rivera',
  'Dr. Nicole Bennett', 'Dr. Kevin Hughes', 'Dr. Laura Coleman', 'Dr. Paul Sullivan', 'Dr. Megan Brooks',
  'Dr. Ryan Phillips', 'Dr. Christina Lee', 'Dr. Andrew Walker', 'Dr. Jessica Martinez', 'Dr. Brandon Scott',
  'Dr. Hannah Wilson', 'Dr. Tyler Brown', 'Dr. Ashley Davis', 'Dr. Justin Moore', 'Dr. Samantha Taylor',
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

export function pickPatientForRoom(roomId, index) {
  const i = (hash(roomId) + index) % MOCK_PATIENT_NAMES.length
  return MOCK_PATIENT_NAMES[i]
}

export function pickDoctorForRoom(roomId, index) {
  const i = (hash(roomId) + index) % MOCK_DOCTOR_NAMES.length
  return MOCK_DOCTOR_NAMES[i]
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
