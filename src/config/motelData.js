import { getRoomDisplayLabel } from './motelRoomDisplayLabels'

/**
 * Motel Command Center - Data model for blueprint floor map.
 * Supports room status: available | occupied | dirty | reserved
 *
 * Room layout from FloorMap export (src/data/motelFloorMapExport.json).
 * Matches the MOTEL OPERATIONS MAP blueprint.
 */

import motelFloorMapExport from '../data/motelFloorMapExport.json'

export const ROOM_STATUS = {
  available: 'available',
  occupied: 'occupied',
  dirty: 'dirty',
  reserved: 'reserved',
}

export const STATUS_LABELS = {
  [ROOM_STATUS.available]: 'Available',
  [ROOM_STATUS.occupied]: 'Occupied',
  [ROOM_STATUS.dirty]: 'Dirty',
  [ROOM_STATUS.reserved]: 'Reserved / Check-in Pending',
}

/** Status → fill color for SVG blueprint rooms */
export const STATUS_FILL_COLORS = {
  [ROOM_STATUS.available]: '#2ECC71',
  [ROOM_STATUS.occupied]: '#E74C3C',
  [ROOM_STATUS.dirty]: '#F1C40F',
  [ROOM_STATUS.reserved]: '#3498DB',
}

export const DEFAULT_ROOM_FILL = '#95A5A6'

/** Assign floor/unit from y-position when unit is missing. Image height for threshold calculation. */
export function assignUnitFromPosition(rooms, imageHeight = 1024) {
  const third = imageHeight / 3
  return rooms.map((r) => {
    const unit = r.unit || (() => {
      const y = r.bbox?.y ?? r.y ?? 0
      if (y < third) return 'Second Floor'
      if (y < third * 2) return 'First Floor'
      return 'Parking'
    })()
    return { ...r, unit }
  })
}

/**
 * Convert FloorMap export to overlay coordinates.
 * Format: { id, x, y, width, height, unit, type, label }
 */
export const ROOM_OVERLAY_COORDINATES = (() => {
  const imgH = motelFloorMapExport.image_height ?? 1024
  const withUnits = assignUnitFromPosition(motelFloorMapExport.rooms || [], imgH)
  return withUnits.map((r) => ({
    id: r.room_id,
    x: r.bbox?.x ?? 0,
    y: r.bbox?.y ?? 0,
    width: r.bbox?.width ?? 50,
    height: r.bbox?.height ?? 50,
    unit: r.unit,
    type: r.type || null,
    label: r.label || getRoomDisplayLabel(r.room_id),
  }))
})()

export const BLUEPRINT_DEFAULT_WIDTH = motelFloorMapExport.image_width ?? 1000
export const BLUEPRINT_DEFAULT_HEIGHT = motelFloorMapExport.image_height ?? 900
export const BLUEPRINT_OVERLAY_VIEWBOX = `0 0 ${BLUEPRINT_DEFAULT_WIDTH} ${BLUEPRINT_DEFAULT_HEIGHT}`

export const BLUEPRINT_IMAGE_PATH =
  (import.meta.env.BASE_URL || '/').replace(/\/$/, '') + '/motel-blueprint.png'

/** Non-guest spaces - rendered neutral, no occupancy status */
export const INFRASTRUCTURE_ROOM_IDS = new Set(
  ROOM_OVERLAY_COORDINATES
    .filter((r) => ['stairs', 'office', 'laundry'].includes((r.type || '').toLowerCase()))
    .map((r) => r.id)
)

export const NON_GUEST_ROOM_TYPES = new Set(['stairs', 'office', 'laundry'])

export function isInfrastructureByLabel(label) {
  if (!label || typeof label !== 'string') return false
  const lower = label.toLowerCase()
  return ['stairs', 'office', 'laundry', 'corridor', 'walkway', 'balcony', 'parking'].some((k) => lower.includes(k))
}

import { calculateAvgLOS } from '../utils/losPressure'

/** Add mock predicted availability for rooms. */
export function addMockPredictions(rooms) {
  if (!Array.isArray(rooms)) return rooms || []
  const predMap = {}
  const fallback = [45, 20, 90, 30, 60, 15, 25, 120, 35, 50]
  return rooms.map((r, i) => {
    const canPredict = r.status === 'occupied' || r.status === 'dirty'
    const mins = canPredict ? (predMap[r.room] ?? fallback[i % fallback.length]) : null
    if (r.predictedInMinutes != null || r.predicted_in_minutes != null) return r
    if (mins != null && canPredict) return { ...r, predictedInMinutes: mins }
    return r
  })
}

/**
 * Compute motel metrics from room status array.
 */
export function computeRoomMetrics(rooms, opts = {}) {
  const guestRooms = (Array.isArray(rooms) ? rooms : []).filter(
    (r) => !INFRASTRUCTURE_ROOM_IDS.has(r.room) && !NON_GUEST_ROOM_TYPES.has((r.type || '').toLowerCase())
  )

  const { unitFilters, roomIdToUnit } = opts
  let list = guestRooms
  if (unitFilters?.size > 0 && roomIdToUnit) {
    list = list.filter((r) => {
      const unit = roomIdToUnit.get(r.room)
      return unit != null && unitFilters.has(unit)
    })
  }

  const occupied = list.filter((r) => r.status === 'occupied').length
  const available = list.filter((r) => r.status === 'available').length
  const dirty = list.filter((r) => r.status === 'dirty').length
  const reserved = list.filter((r) => r.status === 'reserved').length
  const total = list.length
  const utilizationPct = total > 0 ? Math.round((occupied / total) * 100) : 0
  const avgLOS = calculateAvgLOS(list)
  const predictedAvailable = list.filter((r) => r.predictedInMinutes != null || r.predicted_in_minutes != null).length

  return {
    total,
    occupied,
    available,
    dirty,
    reserved,
    utilizationPct,
    avgLOS,
    predictedAvailable,
  }
}
