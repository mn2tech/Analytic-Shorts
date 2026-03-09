import { useState, useCallback } from 'react'
import { generateRoomId, createEmptyRoom } from '../utils/roomUtils'

export function useFloorMap() {
  const [floorPlanImage, setFloorPlanImage] = useState(null)
  const [rooms, setRooms] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState(null)

  const addRoom = useCallback((bboxOrX, y, w, h) => {
    const bbox = typeof bboxOrX === 'object'
      ? bboxOrX
      : { x: bboxOrX, y, width: w, height: h }
    const room = createEmptyRoom(bbox)
    setRooms((prev) => {
      const exists = prev.some((r) => r.room_id === room.room_id)
      if (exists) {
        room.room_id = generateRoomId(prev)
      }
      return [...prev, room]
    })
    setSelectedRoomId(room.room_id)
  }, [])

  const updateRoom = useCallback((roomId, updates) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.room_id === roomId ? { ...r, ...updates } : r
      )
    )
  }, [])

  const deleteRoom = useCallback((roomId) => {
    setRooms((prev) => prev.filter((r) => r.room_id !== roomId))
    setSelectedRoomId((id) => (id === roomId ? null : id))
  }, [])

  const clearAll = useCallback(() => {
    if (confirm('Clear all rooms? This cannot be undone.')) {
      setRooms([])
      setSelectedRoomId(null)
    }
  }, [])

  return {
    floorPlanImage,
    rooms,
    selectedRoomId,
    setFloorPlanImage,
    setRooms,
    setSelectedRoomId,
    addRoom,
    updateRoom,
    deleteRoom,
    clearAll,
  }
}
