/**
 * ERBlueprintMap - Main SVG map with blueprint aesthetic
 * Renders room shapes from roomDefs with status overlay
 */

import { useState } from 'react'
import type { RoomDef } from '../../types/er'
import type { RoomState } from '../../types/er'
import PredictionBadge from './PredictionBadge'
import { getRoomFill, getRoomStroke } from '../../utils/roomStyles'
import { ROOM_DEFS, ER_BLUEPRINT_IMAGE, ER_BLUEPRINT_VIEWBOX, calibrateRoom } from '../../data/roomDefs'

type Props = {
  roomDefs: RoomDef[]
  stateMap: Record<string, RoomState>
  hoveredRoomId: string | null
  selectedRoomId: string | null
  onRoomHover: (id: string | null, e?: React.MouseEvent) => void
  onRoomClick: (id: string) => void
}

const VIEWBOX = `0 0 ${ER_BLUEPRINT_VIEWBOX.width} ${ER_BLUEPRINT_VIEWBOX.height}`

export default function ERBlueprintMap({
  roomDefs,
  stateMap,
  hoveredRoomId,
  selectedRoomId,
  onRoomHover,
  onRoomClick,
}: Props) {
  const [imageError, setImageError] = useState(false)
  const defs = roomDefs.length > 0 ? roomDefs : ROOM_DEFS
  const useImage = !imageError

  return (
    <div className="relative w-full aspect-[3/2] max-w-full rounded-lg overflow-hidden bg-[#0a1628]">
      {useImage ? (
        <img
          src={ER_BLUEPRINT_IMAGE}
          alt="Emergency Department blueprint"
          className="absolute inset-0 w-full h-full object-contain"
          onError={() => setImageError(true)}
        />
      ) : (
        <div
          className="absolute inset-0 bg-[#0a1628]"
          style={{
            backgroundImage: 'linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      )}
      <svg
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <rect width="100%" height="100%" fill="transparent" pointerEvents="auto" />
      </svg>
      <svg
        viewBox={VIEWBOX}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full"
      >
        {defs.map((def) => {
          const d = calibrateRoom(def)
          const state = stateMap[def.id]
          const isHovered = hoveredRoomId === def.id
          const isSelected = selectedRoomId === def.id
          const isCritical = state?.critical ?? false
          const hasAvailPred = (state?.predictedAvailableMinutes ?? 0) > 0
          const hasCleanPred = (state?.predictedCleanMinutes ?? 0) > 0

          return (
            <g
              key={def.id}
              className="cursor-pointer transition-opacity duration-150"
              onMouseEnter={(e) => onRoomHover(def.id, e)}
              onMouseLeave={() => onRoomHover(null)}
              onClick={() => onRoomClick(def.id)}
            >
              <rect
                x={d.x}
                y={d.y}
                width={d.width}
                height={d.height}
                fill={getRoomFill(state?.status ?? 'closed')}
                stroke={getRoomStroke(isSelected, isHovered)}
                strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1}
                rx={2}
              />
              <text
                x={d.x + d.width / 2}
                y={d.y + d.height / 2 - (hasAvailPred || hasCleanPred ? 10 : 0)}
                textAnchor="middle"
                fill="rgba(255,255,255,0.95)"
                fontSize="10"
                fontWeight="600"
              >
                {def.label}
              </text>
              {(hasAvailPred || hasCleanPred) && (
                <foreignObject
                  x={d.x + d.width / 2 - 35}
                  y={d.y + d.height / 2}
                  width="70"
                  height="20"
                  className="overflow-visible"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    {hasAvailPred && (
                      <PredictionBadge variant="avail" minutes={state!.predictedAvailableMinutes!} compact />
                    )}
                    {hasCleanPred && (
                      <PredictionBadge variant="clean" minutes={state!.predictedCleanMinutes!} compact />
                    )}
                  </div>
                </foreignObject>
              )}
              {isCritical && (
                <g transform={`translate(${d.x + d.width - 16}, ${d.y + 8})`}>
                  <circle cx="0" cy="0" r="6" fill="#dc2626" opacity="0.95" />
                  <text x="0" y="4" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">
                    !
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
