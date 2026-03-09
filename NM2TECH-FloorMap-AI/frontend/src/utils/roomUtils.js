/**
 * Generate a unique room ID
 */
export function generateRoomId(existingRooms = []) {
  const ids = new Set(existingRooms.map((r) => r.room_id))
  let n = 1
  while (ids.has(`ROOM_${String(n).padStart(3, '0')}`)) n++
  return `ROOM_${String(n).padStart(3, '0')}`
}

/**
 * Create polygon from bbox [x, y, width, height]
 */
export function bboxToPolygon(bbox) {
  const [x, y, w, h] = [bbox.x, bbox.y, bbox.width, bbox.height]
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
}

/**
 * Compute center from bbox
 */
export function bboxToCenter(bbox) {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  }
}

/**
 * Create an empty room with given bbox
 */
export function createEmptyRoom(bbox) {
  const polygon = bboxToPolygon(bbox)
  const center = bboxToCenter(bbox)
  return {
    room_id: generateRoomId(),
    label: '',
    type: 'patient_room',
    status: 'available',
    bbox: { ...bbox },
    center: { ...center },
    polygon,
  }
}
