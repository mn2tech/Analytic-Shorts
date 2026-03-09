/**
 * MedStar Montgomery Medical Center - ED Bed Map
 * Interactive blueprint-style floor map with live room status overlay.
 */
import { useState, useCallback, useEffect } from 'react'
import type { RoomData } from '../types/edRoom'
import { mockRooms } from '../data/mockEdRooms'
import { BlueprintMap } from '../components/ed/BlueprintMap'
import RoomTooltip from '../components/ed/RoomTooltip'
import RoomDetailsPanel from '../components/ed/RoomDetailsPanel'
import Legend from '../components/ed/Legend'
import SummaryCards from '../components/ed/SummaryCards'

/** Simulate live updates by randomly changing a few room statuses */
function simulateUpdate(rooms: RoomData[]): RoomData[] {
  const statuses: RoomData['status'][] = ['occupied', 'available', 'dirty', 'closed']
  const idx = Math.floor(Math.random() * rooms.length)
  const newStatus = statuses[Math.floor(Math.random() * statuses.length)]
  return rooms.map((r, i) =>
    i === idx ? { ...r, status: newStatus, lastUpdated: new Date().toISOString() } : r
  )
}

export default function EDBedMapPage() {
  const [rooms, setRooms] = useState<RoomData[]>(() => mockRooms)
  const [lastUpdated, setLastUpdated] = useState<string>(() => new Date().toISOString())
  const [hoveredRoom, setHoveredRoom] = useState<RoomData | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null)
  const [simulating, setSimulating] = useState(false)

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

  const handleSimulateToggle = useCallback(() => {
    setSimulating((s) => !s)
  }, [])

  useEffect(() => {
    if (!simulating) return
    const interval = setInterval(() => {
      setRooms((prev) => simulateUpdate(prev))
      setLastUpdated(new Date().toISOString())
    }, 5000)
    return () => clearInterval(interval)
  }, [simulating])

  return (
    <div className="min-h-screen bg-slate-950 text-white" data-testid="ed-bed-map-page">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              MedStar Montgomery Medical Center - ED Bed Map
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSimulateToggle}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                simulating
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {simulating ? 'Stop Simulation' : 'Simulate Live Updates'}
            </button>
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
