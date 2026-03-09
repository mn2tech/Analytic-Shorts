/**
 * FloorMap AI - Room utilities
 */
export function generateRoomId(existingRooms = []) {
  const ids = new Set(existingRooms.map((r) => r.room_id))
  let n = 1
  while (ids.has(`ROOM_${String(n).padStart(3, '0')}`)) n++
  return `ROOM_${String(n).padStart(3, '0')}`
}

export function bboxToPolygon(bbox) {
  const [x, y, w, h] = [bbox.x, bbox.y, bbox.width, bbox.height]
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
}

export function bboxToCenter(bbox) {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  }
}

export function createEmptyRoom(bbox) {
  const polygon = bboxToPolygon(bbox)
  const center = bboxToCenter(bbox)
  return {
    room_id: generateRoomId(),
    label: '',
    type: 'patient_room',
    status: 'available',
    unit: null,
    bbox: { ...bbox },
    center: { ...center },
    polygon,
  }
}
