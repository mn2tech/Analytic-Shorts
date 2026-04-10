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
  maintenance: 'maintenance',
}

export const STATUS_LABELS = {
  [ROOM_STATUS.available]: 'Available',
  [ROOM_STATUS.occupied]: 'Occupied',
  [ROOM_STATUS.dirty]: 'Dirty',
  [ROOM_STATUS.reserved]: 'Reserved / Check-in Pending',
  [ROOM_STATUS.maintenance]: 'Maintenance',
}

/** Status → fill color for SVG blueprint rooms */
export const STATUS_FILL_COLORS = {
  [ROOM_STATUS.available]: '#2ECC71',
  [ROOM_STATUS.occupied]: '#E74C3C',
  [ROOM_STATUS.dirty]: '#F1C40F',
  [ROOM_STATUS.reserved]: '#3498DB',
  [ROOM_STATUS.maintenance]: '#6B7280',
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

function isSameDay(a, b) {
  if (!a || !b) return false
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function toDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function estimateCleaningBufferMinutes(room) {
  const typeText = `${room?.type || ''} ${room?.label || ''} ${room?.remarks || ''}`.toLowerCase()
  const isSuite = typeText.includes('suite')
  const isMaintenanceHeavy = typeText.includes('kitchen') || typeText.includes('family')
  const checkIn = toDate(room.checkIn || room.check_in)
  const checkOut = toDate(room.checkOut || room.check_out)
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
    : 0

  let buffer = isSuite ? 55 : 35
  if (isMaintenanceHeavy) buffer += 8
  if (nights >= 7) buffer += 12
  else if (nights >= 4) buffer += 6
  return buffer
}

function estimatePredictedMinutes(room, now = new Date()) {
  const status = room.status
  if (status !== 'occupied' && status !== 'dirty') return null

  const checkOut = toDate(room.checkOut || room.check_out)
  const updatedAt = toDate(room.updatedAt)
  const cleaningBuffer = estimateCleaningBufferMinutes(room)
  const estimatedCleaningMins = status === 'dirty' ? cleaningBuffer : cleaningBuffer + 10

  // Dirty room: estimate remaining clean time by how long it has already been pending.
  if (status === 'dirty') {
    if (updatedAt) {
      const elapsed = Math.max(0, Math.round((now.getTime() - updatedAt.getTime()) / 60000))
      return Math.max(10, estimatedCleaningMins - elapsed)
    }
    return estimatedCleaningMins
  }

  // Occupied room with checkout: availability = time to checkout + cleaning.
  if (checkOut) {
    let minsToCheckout = Math.round((checkOut.getTime() - now.getTime()) / 60000)
    if (minsToCheckout < 0) {
      // If checkout is recorded as today (date-only feeds), treat it as imminently turning over.
      minsToCheckout = isSameDay(checkOut, now) ? 15 : 0
    }
    return Math.max(20, minsToCheckout + estimatedCleaningMins)
  }

  // Occupied without checkout is uncertain; provide conservative placeholder.
  return 180
}

/** Add predicted availability based on operational timing. */
export function addMockPredictions(rooms) {
  if (!Array.isArray(rooms)) return rooms || []
  const now = new Date()
  return rooms.map((r) => {
    if (r.predictedInMinutes != null || r.predicted_in_minutes != null) return r
    const mins = estimatePredictedMinutes(r, now)
    if (mins != null) return { ...r, predictedInMinutes: mins }
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
  const maintenance = list.filter((r) => r.status === 'maintenance').length
  const total = list.length
  const utilizationPct = total > 0 ? Math.round((occupied / total) * 100) : 0
  const avgLOS = calculateAvgLOS(list)
  const predictedAvailable = list.filter((r) => r.predictedInMinutes != null || r.predicted_in_minutes != null).length
  const today = new Date()
  const turningOverToday = list.filter((r) => {
    if (!r.check_out) return false
    const d = new Date(r.check_out)
    return !Number.isNaN(d.getTime()) &&
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
  }).length

  return {
    total,
    occupied,
    available,
    dirty,
    reserved,
    maintenance,
    utilizationPct,
    avgLOS,
    predictedAvailable,
    turningOverToday,
    occupancyRatePct: utilizationPct,
  }
}
