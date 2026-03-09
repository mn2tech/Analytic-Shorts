/**
 * ER Command Map - Production-grade hospital command center
 * Dark blueprint aesthetic, room status overlay, predictions, tooltips, details panel
 */

import { useState, useCallback } from 'react'
import type { RoomState } from '../types/er'
import type { RoomDef } from '../types/er'
import { ROOM_DEFS } from '../data/roomDefs'
import { MOCK_ROOM_STATES } from '../data/mockRoomStates'
import ERBlueprintMap from '../components/er/ERBlueprintMap'
import Legend from '../components/er/Legend'
import SummaryCards from '../components/er/SummaryCards'
import RoomTooltip from '../components/er/RoomTooltip'
import RoomDetailsPanel from '../components/er/RoomDetailsPanel'

function buildStateMap(states: RoomState[], defs: RoomDef[]): Record<string, RoomState> {
  const map: Record<string, RoomState> = {}
  for (const s of states) map[s.roomId] = s
  for (const d of defs) {
    if (!map[d.id]) map[d.id] = { roomId: d.id, status: 'closed' }
  }
  return map
}

export default function ERCommandMapPage() {
  const [states, setStates] = useState<RoomState[]>(() => MOCK_ROOM_STATES)
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)

  const stateMap = buildStateMap(states, ROOM_DEFS)
  const roomDefMap = Object.fromEntries(ROOM_DEFS.map((d) => [d.id, d]))

  const handleRoomHover = useCallback(
    (roomId: string | null, e?: React.MouseEvent) => {
      setHoveredRoomId(roomId)
      if (e) setTooltipPos({ x: e.clientX, y: e.clientY })
    },
    []
  )

  const handleTooltipMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleRoomClick = useCallback((roomId: string) => {
    setSelectedRoomId((prev) => (prev === roomId ? null : roomId))
  }, [])

  const handleClosePanel = useCallback(() => setSelectedRoomId(null), [])

  const hoveredState = hoveredRoomId ? stateMap[hoveredRoomId] : null
  const hoveredDef = hoveredRoomId ? roomDefMap[hoveredRoomId] : null
  const selectedState = selectedRoomId ? stateMap[selectedRoomId] : null
  const selectedDef = selectedRoomId ? roomDefMap[selectedRoomId] : null
  const roomsForSummary = ROOM_DEFS.map((d) => stateMap[d.id]).filter(Boolean)

  return (
    <div className="min-h-screen bg-slate-950 text-white" data-testid="er-command-map-page">
      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-4">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              MedStar Montgomery Medical Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Predictive Emergency Department Command Map
            </p>
          </div>
        </header>

        <Legend />

        <SummaryCards states={roomsForSummary} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div
            className="relative rounded-xl border border-slate-700/50 overflow-hidden bg-[#0a1628] shadow-2xl"
            onMouseMove={handleTooltipMove}
          >
            <ERBlueprintMap
              roomDefs={ROOM_DEFS}
              stateMap={stateMap}
              hoveredRoomId={hoveredRoomId}
              selectedRoomId={selectedRoomId}
              onRoomHover={handleRoomHover}
              onRoomClick={handleRoomClick}
            />
          </div>
          <RoomDetailsPanel
            def={selectedDef}
            state={selectedState}
            onClose={handleClosePanel}
            isEmpty={!selectedRoomId}
          />
        </div>
      </div>

      {hoveredState && hoveredDef && (
        <RoomTooltip def={hoveredDef} state={hoveredState} x={tooltipPos.x} y={tooltipPos.y} />
      )}
    </div>
  )
}
