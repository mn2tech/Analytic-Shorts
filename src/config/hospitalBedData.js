/**
 * Hospital Bed Command Center - Data model and sample data.
 * Structure supports real-time updates, alerts, and predictive availability.
 */

export const ROOM_STATUS = {
  available: 'available',
  occupied: 'occupied',
  dirty: 'dirty',
}

export const STATUS_LABELS = {
  [ROOM_STATUS.available]: 'Available',
  [ROOM_STATUS.occupied]: 'Occupied',
  [ROOM_STATUS.dirty]: 'Dirty / Needs Cleaning',
}

export const STATUS_COLORS = {
  [ROOM_STATUS.available]: {
    bg: 'bg-emerald-500',
    bgHover: 'hover:bg-emerald-600',
    border: 'border-emerald-600',
    text: 'text-emerald-900',
  },
  [ROOM_STATUS.occupied]: {
    bg: 'bg-rose-500',
    bgHover: 'hover:bg-rose-600',
    border: 'border-rose-600',
    text: 'text-rose-900',
  },
  [ROOM_STATUS.dirty]: {
    bg: 'bg-amber-400',
    bgHover: 'hover:bg-amber-500',
    border: 'border-amber-500',
    text: 'text-amber-900',
  },
}

/** Sample data for rooms 101–120. North: 101–110, South: 111–120. Mock names for demo only. */
export const SAMPLE_ROOMS = [
  { room_id: '101', wing: 'North', status: 'occupied', patient_name: 'Patient A', age: 72, reason_for_visit: 'Pneumonia', length_of_stay: '2d 4h', doctor: 'Dr. Smith' },
  { room_id: '102', wing: 'North', status: 'available', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '103', wing: 'North', status: 'occupied', patient_name: 'Patient B', age: 45, reason_for_visit: 'Appendectomy', length_of_stay: '1d 8h', doctor: 'Dr. Jones' },
  { room_id: '104', wing: 'North', status: 'dirty', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '105', wing: 'North', status: 'occupied', patient_name: 'Patient C', age: 58, reason_for_visit: 'Hip fracture', length_of_stay: '4d 12h', doctor: 'Dr. Williams' },
  { room_id: '106', wing: 'North', status: 'available', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '107', wing: 'North', status: 'occupied', patient_name: 'Patient D', age: 34, reason_for_visit: 'Concussion', length_of_stay: '6h 20m', doctor: 'Dr. Brown' },
  { room_id: '108', wing: 'North', status: 'dirty', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '109', wing: 'North', status: 'occupied', patient_name: 'Patient E', age: 52, reason_for_visit: 'Gallbladder', length_of_stay: '2d 18h', doctor: 'Dr. Smith' },
  { room_id: '110', wing: 'North', status: 'available', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '111', wing: 'South', status: 'occupied', patient_name: 'Patient F', age: 61, reason_for_visit: 'Cardiac monitoring', length_of_stay: '1d 2h', doctor: 'Dr. Jones' },
  { room_id: '112', wing: 'South', status: 'occupied', patient_name: 'Patient G', age: 66, reason_for_visit: 'Seizure', length_of_stay: '3h 14m', doctor: 'Dr. Jones' },
  { room_id: '113', wing: 'South', status: 'dirty', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '114', wing: 'South', status: 'available', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '115', wing: 'South', status: 'occupied', patient_name: 'Patient H', age: 48, reason_for_visit: 'Sepsis', length_of_stay: '5d 6h', doctor: 'Dr. Williams' },
  { room_id: '116', wing: 'South', status: 'available', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '117', wing: 'South', status: 'occupied', patient_name: 'Patient I', age: 71, reason_for_visit: 'Stroke', length_of_stay: '3d 10h', doctor: 'Dr. Brown' },
  { room_id: '118', wing: 'South', status: 'dirty', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
  { room_id: '119', wing: 'South', status: 'occupied', patient_name: 'Patient J', age: 39, reason_for_visit: 'C-section', length_of_stay: '1d 14h', doctor: 'Dr. Smith' },
  { room_id: '120', wing: 'South', status: 'available', patient_name: null, age: null, reason_for_visit: null, length_of_stay: null, doctor: null },
]

/** Hospital-level config for metrics (extensible for real-time API). */
export const HOSPITAL_CONFIG = {
  maxCapacity: 20,
  avgCleaningTimeMinutes: 35,
  avgWaitWhenNoBedsMinutes: 120,
}

export function computeBedMetrics(rooms) {
  const list = Array.isArray(rooms) ? rooms : []
  const occupied = list.filter((r) => r.status === 'occupied').length
  const available = list.filter((r) => r.status === 'available').length
  const dirty = list.filter((r) => r.status === 'dirty').length
  const total = list.length
  const capacityPct = total > 0 ? Math.round((occupied / total) * 100) : 0
  const maxCapacity = HOSPITAL_CONFIG.maxCapacity
  // Estimated wait for next bed: 0 if available, else ~cleaning time if dirty, else avg wait
  let estWaitMinutes = 0
  let estWaitLabel = 'No wait'
  if (available > 0) {
    estWaitLabel = 'Immediate'
  } else if (dirty > 0) {
    estWaitMinutes = HOSPITAL_CONFIG.avgCleaningTimeMinutes
    estWaitLabel = estWaitMinutes >= 60
      ? `~${Math.floor(estWaitMinutes / 60)}h ${estWaitMinutes % 60}m`
      : `~${estWaitMinutes}m`
  } else {
    estWaitMinutes = HOSPITAL_CONFIG.avgWaitWhenNoBedsMinutes
    estWaitLabel = estWaitMinutes >= 60
      ? `~${Math.floor(estWaitMinutes / 60)}h ${estWaitMinutes % 60}m`
      : `~${estWaitMinutes}m`
  }
  return {
    occupied,
    available,
    dirty,
    total,
    capacityPct,
    maxCapacity,
    estWaitMinutes,
    estWaitLabel,
  }
}
