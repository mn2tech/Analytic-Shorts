/**
 * Hospital Predictive Bed Map - Command center dashboard
 * Blueprint-style floor map with ADT-derived availability predictions
 */
import { useState, useCallback } from 'react'
import type { RoomData } from '../types/predictiveRoom'
import { mockPredictiveRooms } from '../data/mockPredictiveRooms'
import { BlueprintMap } from '../components/predictive/BlueprintMap'
import RoomTooltip from '../components/predictive/RoomTooltip'
import RoomDetailsPanel from '../components/predictive/RoomDetailsPanel'
import Legend from '../components/predictive/Legend'
import SummaryCards from '../components/predictive/SummaryCards'

export default function PredictiveBedMapPage() {
  const [rooms] = useState<RoomData[]>(() => mockPredictiveRooms)
  const [lastUpdated] = useState<string>(() => new Date().toISOString())
  const [hoveredRoom, setHoveredRoom] = useState<RoomData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null)

  const roomMap = Object.fromEntries(rooms.map((r) => [r.id, r]))

  const handleRoomHover = useCallback((roomId: string | null, e?: React.MouseEvent) => {
    if (!roomId) {
      setHoveredRoom(null)
      return
    }
    const room = roomMap[roomId]
    if (room) {
      setHoveredRoom(room)
      if (e) setTooltipPos({ x: e.clientX, y: e.clientY })
    } else {
      setHoveredRoom(null)
    }
  }, [roomMap])

  const handleTooltipMove = useCallback((e: React.MouseEvent) => {
    if (hoveredRoom) setTooltipPos({ x: e.clientX, y: e.clientY })
  }, [hoveredRoom])

  const handleRoomClick = useCallback((roomId: string) => {
    const room = roomMap[roomId]
    if (room) setSelectedRoom(room)
  }, [roomMap])

  const handleClosePanel = useCallback(() => setSelectedRoom(null), [])

  return (
    <div className="min-h-screen bg-slate-950 text-white" data-testid="predictive-bed-map-page">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Hospital Predictive Bed Map
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()} · ADT-derived predictions
            </p>
          </div>
        </header>

        {/* Legend */}
        <Legend />

        {/* Summary Cards */}
        <SummaryCards rooms={rooms} />

        {/* Map Container */}
        <div
          className="relative rounded-xl border border-slate-700/50 overflow-hidden bg-[#0a1628] shadow-2xl"
          onMouseMove={handleTooltipMove}
        >
          <BlueprintMap
            roomDataMap={roomMap}
            hoveredRoomId={hoveredRoom?.id ?? null}
            onRoomHover={handleRoomHover}
            onRoomClick={handleRoomClick}
          />
        </div>
      </div>

      {/* Tooltip */}
      {hoveredRoom && (
        <RoomTooltip room={hoveredRoom} x={tooltipPos.x} y={tooltipPos.y} />
      )}

      {/* Details Panel */}
      {selectedRoom && (
        <RoomDetailsPanel room={selectedRoom} onClose={handleClosePanel} />
      )}
    </div>
  )
}
