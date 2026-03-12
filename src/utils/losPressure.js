/**
 * LOS (Length of Stay) and Time-Pressure utilities for Hospital Command Center.
 * Reusable helpers for pressure level calculation, LOS formatting, and KPI aggregation.
 *
 * Pressure thresholds (LOS-based for occupied rooms):
 * - < 60 min = normal
 * - 60 to < 180 min = warning
 * - 180 to < 300 min = high
 * - >= 300 min = critical
 */

/** Pressure level thresholds in minutes */
export const PRESSURE_THRESHOLDS = {
  warning: 60,
  high: 180,
  critical: 300,
}

/**
 * Calculate LOS from admitted_at timestamp (ISO string).
 * @param {string} admittedAt - ISO timestamp e.g. "2026-03-08T17:15:00Z"
 * @returns {{ losMinutes: number, losLabel: string } | null}
 */
export function calculateLOS(admittedAt) {
  if (!admittedAt) return null
  const admitted = new Date(admittedAt).getTime()
  if (Number.isNaN(admitted)) return null
  const now = Date.now()
  const losMinutes = Math.max(0, Math.floor((now - admitted) / 60_000))
  return {
    losMinutes,
    losLabel: formatMinutesToLOS(losMinutes),
  }
}

/**
 * Format minutes to human-readable LOS string.
 * @param {number} minutes
 * @returns {string} e.g. "1h 32m", "45m", "2h"
 */
export function formatMinutesToLOS(minutes) {
  if (minutes == null || minutes < 0) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/**
 * Calculate Door-to-Provider (D2P) time in minutes.
 * If provider_seen_time exists: d2p = provider_seen_time - arrival_time
 * Else: d2p = now - arrival_time (still waiting)
 * @param {object} patient - { arrival_time?, provider_seen_time? } (ISO strings)
 * @returns {number|null} Minutes, or null if no arrival_time
 */
export function calculateD2P(patient) {
  const arrival = patient?.arrival_time ?? patient?.admitted_at_iso
  if (!arrival) return null
  const arrivalMs = new Date(arrival).getTime()
  if (Number.isNaN(arrivalMs)) return null
  const endMs = patient?.provider_seen_time
    ? new Date(patient.provider_seen_time).getTime()
    : Date.now()
  if (Number.isNaN(endMs)) return null
  return Math.max(0, Math.floor((endMs - arrivalMs) / 60_000))
}

/**
 * Calculate average D2P for a list of rooms (e.g. ER only).
 * @param {object[]} rooms - Must have unit/be pre-filtered
 * @returns {number|null} Average minutes, or null if no patients with arrival_time
 */
export function calculateAvgD2P(rooms) {
  if (!Array.isArray(rooms)) return null
  const occupied = rooms.filter((r) => r.status === 'occupied')
  const d2pValues = occupied
    .map((r) => calculateD2P(r))
    .filter((m) => m != null)
  if (d2pValues.length === 0) return null
  return Math.round(d2pValues.reduce((a, b) => a + b, 0) / d2pValues.length)
}

/**
 * Format minutes for D2P display (28m, 1h 05m).
 */
export function formatD2PMinutes(minutes) {
  return formatMinutesToLOS(minutes)
}

/**
 * Get pressure level from LOS in minutes.
 * @param {number} losMinutes
 * @returns {'normal'|'warning'|'high'|'critical'}
 */
export function getPressureLevelFromMinutes(losMinutes) {
  if (losMinutes == null || losMinutes < 0) return 'normal'
  if (losMinutes >= PRESSURE_THRESHOLDS.critical) return 'critical'
  if (losMinutes >= PRESSURE_THRESHOLDS.high) return 'high'
  if (losMinutes >= PRESSURE_THRESHOLDS.warning) return 'warning'
  return 'normal'
}

/**
 * Get pressure level for a room. Only occupied rooms use LOS-based pressure.
 * Cleaning/available/reserved return 'normal' unless explicitly supported later.
 * @param {object} room - Room with status, admitted_at/admitted_at_iso, length_of_stay_minutes
 * @returns {{ level: 'normal'|'warning'|'high'|'critical', losMinutes?: number, losLabel?: string }}
 */
export function getRoomPressureLevel(room) {
  if (!room) return { level: 'normal' }

  const status = room.status
  if (status !== 'occupied') return { level: 'normal' }

  // Check if room is explicitly marked as critical
  if (room.critical === true) {
    let losMinutes = room.length_of_stay_minutes ?? room.los_minutes ?? null
    if (losMinutes == null && (room.admitted_at_iso || room.patient?.admitted_at)) {
      const admitted = room.admitted_at_iso ?? room.patient?.admitted_at
      const los = calculateLOS(admitted)
      if (los) losMinutes = los.losMinutes
    }
    const losLabel = losMinutes != null ? formatMinutesToLOS(losMinutes) : null
    return { level: 'critical', losMinutes, losLabel }
  }

  let losMinutes = room.length_of_stay_minutes ?? room.los_minutes ?? null

  if (losMinutes == null && (room.admitted_at_iso || room.patient?.admitted_at)) {
    const admitted = room.admitted_at_iso ?? room.patient?.admitted_at
    const los = calculateLOS(admitted)
    if (los) losMinutes = los.losMinutes
  }

  const level = getPressureLevelFromMinutes(losMinutes)
  const losLabel = losMinutes != null ? formatMinutesToLOS(losMinutes) : null
  return { level, losMinutes, losLabel }
}

/**
 * Get pressure style for map rendering (border/glow/pulse).
 * @param {'normal'|'warning'|'high'|'critical'} level
 * @returns {{ stroke?: string, strokeWidth?: number, filter?: string, className?: string }}
 */
/** Pressure stroke colors - visible on both light (green) and dark (red) room fills */
export function getPressureStyle(level) {
  switch (level) {
    case 'warning':
      return { stroke: '#CA8A04', strokeWidth: 2 }
    case 'high':
      return { stroke: '#EA580C', strokeWidth: 2 }
    case 'critical':
      return { stroke: '#FCA5A5', strokeWidth: 2, className: 'animate-pressure-pulse' }
    default:
      return {}
  }
}

/**
 * Calculate average LOS across occupied rooms.
 * Uses length_of_stay_minutes or derived from admitted_at_iso.
 * @param {object[]} rooms
 * @returns {number|null} Average in minutes, or null if no occupied rooms
 */
export function calculateAvgLOS(rooms) {
  if (!Array.isArray(rooms)) return null
  const occupied = rooms.filter((r) => r.status === 'occupied')
  if (occupied.length === 0) return null

  const losValues = occupied
    .map((r) => {
      const mins = r.length_of_stay_minutes ?? r.los_minutes
      if (mins != null) return mins
      const admitted = r.admitted_at_iso ?? r.patient?.admitted_at
      const los = calculateLOS(admitted)
      return los?.losMinutes ?? null
    })
    .filter((m) => m != null)

  if (losValues.length === 0) return null
  return Math.round(losValues.reduce((a, b) => a + b, 0) / losValues.length)
}

/**
 * Count rooms by pressure level (high and critical).
 * @param {object[]} rooms
 * @returns {{ high: number, critical: number }}
 */
export function countPressureRooms(rooms) {
  if (!Array.isArray(rooms)) return { high: 0, critical: 0 }
  let high = 0
  let critical = 0
  rooms.forEach((r) => {
    const { level } = getRoomPressureLevel(r)
    if (level === 'high') high++
    if (level === 'critical') critical++
  })
  return { high, critical }
}

/** Pressure level display labels */
export const PRESSURE_LABELS = {
  normal: null,
  warning: 'Warning',
  high: 'High',
  critical: 'Critical',
}
