/**
 * Room data structure for ER bed map application.
 * Aligns with backend export format.
 */

/** @typedef {{ x: number; y: number }} Point */

/** @typedef {{ x: number; y: number; width: number; height: number }} BBox */

/**
 * @typedef {Object} Room
 * @property {string} room_id - Unique identifier (e.g. ROOM_001)
 * @property {string} label - Display label (e.g. "Room 1")
 * @property {string} type - Room type: patient_room | treatment | triage | nurse_station | utility | other
 * @property {string} status - Status: available | occupied | cleaning | maintenance | reserved
 * @property {BBox} bbox - Bounding box in image coordinates
 * @property {Point} center - Center point in image coordinates
 * @property {[number, number][]} polygon - Polygon vertices [[x,y], ...] in image coordinates
 */

export const ROOM_TYPES = [
  'patient_room',
  'treatment',
  'triage',
  'nurse_station',
  'utility',
  'other'
]

export const ROOM_STATUSES = [
  'available',
  'occupied',
  'cleaning',
  'maintenance',
  'reserved'
]

/**
 * Create a new room with defaults.
 * @param {Partial<Room> & { bbox: BBox }} partial
 * @returns {Room}
 */
export function createRoom(partial) {
  const { bbox } = partial
  const cx = bbox.x + bbox.width / 2
  const cy = bbox.y + bbox.height / 2
  const polygon = [
    [bbox.x, bbox.y],
    [bbox.x + bbox.width, bbox.y],
    [bbox.x + bbox.width, bbox.y + bbox.height],
    [bbox.x, bbox.y + bbox.height]
  ]
  return {
    room_id: partial.room_id ?? `ROOM_${Date.now()}`,
    label: partial.label ?? 'New Room',
    type: partial.type ?? 'patient_room',
    status: partial.status ?? 'available',
    bbox: { ...bbox },
    center: partial.center ?? { x: cx, y: cy },
    polygon: partial.polygon ?? polygon
  }
}
