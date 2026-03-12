/**
 * Hospital Bed Command Center - Data model for blueprint floor map.
 * Supports real-time API updates with status: available | occupied | cleaning | reserved
 *
 * Room layout from FloorMap AI export (src/data/floorMapExport.json).
 * Coordinates match the blueprint image dimensions.
 */

import floorMapExport from '../data/floorMapExport.json'
import { calculateLOS, calculateAvgLOS, countPressureRooms, calculateAvgD2P, formatD2PMinutes } from '../utils/losPressure'

export { formatD2PMinutes }

export const ROOM_STATUS = {
  available: 'available',
  occupied: 'occupied',
  cleaning: 'cleaning',
  reserved: 'reserved',
}

export const STATUS_LABELS = {
  [ROOM_STATUS.available]: 'Available',
  [ROOM_STATUS.occupied]: 'Occupied',
  [ROOM_STATUS.cleaning]: 'Needs Cleaning',
  [ROOM_STATUS.reserved]: 'Incoming Patient / Reserved',
}

/** Status → fill color for SVG blueprint rooms */
export const STATUS_FILL_COLORS = {
  [ROOM_STATUS.available]: '#2ECC71',
  [ROOM_STATUS.occupied]: '#E74C3C',
  [ROOM_STATUS.cleaning]: '#F1C40F',
  [ROOM_STATUS.reserved]: '#3498DB',
}

/** Default fill when status unknown */
export const DEFAULT_ROOM_FILL = '#95A5A6'

/**
 * Convert FloorMap AI export to overlay coordinates.
 * Format: { id, x, y, width, height } for Command Center.
 */
export const ROOM_OVERLAY_COORDINATES = (floorMapExport.rooms || []).map((r) => ({
  id: r.room_id,
  x: r.bbox.x,
  y: r.bbox.y,
  width: r.bbox.width,
  height: r.bbox.height,
  unit: r.unit || null,
  type: r.type || null,
  label: r.label || null,
}))

/** ViewBox to encompass all rooms (from FloorMap export dimensions) */
export const BLUEPRINT_OVERLAY_VIEWBOX = '0 0 1320 720'

export const BLUEPRINT_IMAGE_PATH =
  (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/hospital-blueprint.png'

/** ROOM_011 = WAITING AREA - excluded from predictions */
const WAITING_ROOM_ID = 'ROOM_011'

/** Waiting room slots (WR) - synthetic overlay positions for patient flow. Placed near ROOM_011 (x743,y87,w83,h128). */
export const WAITING_ROOM_SLOTS = [
  { id: 'WR01', x: 750, y: 100, width: 28, height: 32, unit: 'WAITING', type: 'waiting_slot', label: 'WR01' },
  { id: 'WR02', x: 780, y: 100, width: 28, height: 32, unit: 'WAITING', type: 'waiting_slot', label: 'WR02' },
  { id: 'WR03', x: 810, y: 100, width: 28, height: 32, unit: 'WAITING', type: 'waiting_slot', label: 'WR03' },
]

/** Elevators, stairs, corridors, nurse stations, storage, lobby/waiting, lab - no occupancy status; rendered neutral on map */
export const INFRASTRUCTURE_ROOM_IDS = new Set([
  'ROOM_011', 'ROOM_022', // Lobby / reception / waiting area
  'ROOM_026', 'ROOM_033', 'ROOM_034', 'ROOM_035', 'ROOM_036', // Elevators, corridor, stairs
  'ROOM_048', 'ROOM_055', 'ROOM_056', 'ROOM_063', 'ROOM_079', // Storage, other
  'ROOM_058', // Lab
  'ROOM_073', 'ROOM_078', // Nurse stations
])

/** Room types that should not show occupancy/pressure (used when overlay has type from FloorMap export) */
export const NON_PATIENT_ROOM_TYPES = new Set(['nurse_station', 'storage', 'other', 'treatment_room'])

/** Label substrings that indicate non-bed rooms (for custom floor maps) */
const INFRASTRUCTURE_LABELS = ['lobby', 'reception', 'waiting', 'elevator', 'stairs', 'corridor', 'nurse station', 'lab']
export function isInfrastructureByLabel(label) {
  if (!label || typeof label !== 'string') return false
  const lower = label.toLowerCase()
  return INFRASTRUCTURE_LABELS.some((key) => lower.includes(key))
}

/** Add mock ADT-derived predictions for rooms (occupied/cleaning). Used when API doesn't provide predictions. */
export function addMockPredictions(rooms) {
  if (!Array.isArray(rooms)) return rooms || []
  const predMap = {
    ROOM_001: 45, ROOM_003: 60, ROOM_005: 30, ROOM_007: 90, ROOM_009: 120,
    ROOM_010: 25, ROOM_027: 20,
    ROOM_012: 35, ROOM_014: 50, ROOM_016: 40, ROOM_025: 55, ROOM_029: 15, ROOM_065: 70,
    ROOM_040: 45, ROOM_047: 60, ROOM_075: 120, ROOM_060: 30,
    ROOM_037: 45, ROOM_044: 60,
  }
  const fallback = [45, 20, 90, 30, 60, 15, 25, 120, 35, 50]
  return rooms.map((r, i) => {
    const isWaitingRoom = r.room === WAITING_ROOM_ID
    const canPredict = !isWaitingRoom && (r.status === 'occupied' || r.status === 'cleaning')
    const losFromAdmitted = (r.admitted_at_iso ?? r.patient?.admitted_at) ? (calculateLOS(r.admitted_at_iso ?? r.patient?.admitted_at)?.losMinutes ?? null) : null
    const losMins = r.length_of_stay_minutes ?? r.los_minutes ?? losFromAdmitted
    let mins = canPredict ? (predMap[r.room] ?? fallback[i % fallback.length]) : null
    if (mins != null && losMins != null) {
      if (losMins >= 300) mins = Math.max(mins, 150)
      else if (losMins >= 180) mins = Math.max(mins, 90)
    }
    if (r.predictedInMinutes != null || r.predicted_in_minutes != null) return r
    if (mins != null && canPredict) return { ...r, predictedInMinutes: mins }
    return r
  })
}

/**
 * Compute summary metrics from API room status array.
 * Excludes infrastructure. When unitFilters/roomIdToUnit provided, filters to selected unit(s).
 * @param {object[]} rooms
 * @param {{ unitFilters?: Set<string>, roomIdToUnit?: Map<string, string> }} opts
 */
export function computeRoomMetrics(rooms, opts = {}) {
  let list = (Array.isArray(rooms) ? rooms : []).filter((r) => !INFRASTRUCTURE_ROOM_IDS.has(r.room))

  const { unitFilters, roomIdToUnit } = opts
  if (unitFilters?.size > 0 && roomIdToUnit) {
    list = list.filter((r) => {
      const unit = roomIdToUnit.get(r.room)
      return unit != null && unitFilters.has(unit)
    })
  }

  const occupied = list.filter((r) => r.status === 'occupied').length
  const available = list.filter((r) => r.status === 'available').length
  const cleaning = list.filter((r) => r.status === 'cleaning').length
  const reserved = list.filter((r) => r.status === 'reserved').length
  const total = list.length
  // Include reserved rooms in utilization calculation to match alert calculation
  const utilizationPct = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0
  const predictedAvailable = list.filter((r) => r.predictedInMinutes != null || r.predicted_in_minutes != null).length
  const avgLOS = calculateAvgLOS(list)
  const { high: highPressureRooms, critical: criticalRooms } = countPressureRooms(list)

  // D2P: ER patients only (always, regardless of unit filter)
  const erRooms = roomIdToUnit
    ? list.filter((r) => roomIdToUnit.get(r.room) === 'ER')
    : []
  const avgD2P = calculateAvgD2P(erRooms)
  const waitingForProvider = erRooms.filter(
    (r) => r.status === 'occupied' && !r.provider_seen_time
  ).length

  return {
    total,
    occupied,
    available,
    cleaning,
    reserved,
    utilizationPct,
    predictedAvailable,
    avgLOS,
    highPressureRooms,
    criticalRooms,
    avgD2P,
    waitingForProvider,
  }
}
