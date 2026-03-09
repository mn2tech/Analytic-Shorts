/**
 * BlueprintMap - SVG floor map for ED
 * Each room is a group with rect + label, mapped to room data by id
 */

import type { RoomData } from '../../types/edRoom'
import { getStatusFill } from '../../utils/edStatusColors'

type RoomShape = {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
}

const ROOM_SHAPES: RoomShape[] = [
  { id: 'trauma1', x: 20, y: 120, width: 140, height: 120, label: 'TRAUMA 1' },
  { id: 'trauma2', x: 170, y: 120, width: 140, height: 120, label: 'TRAUMA 2' },
  { id: 'trauma3', x: 20, y: 250, width: 140, height: 120, label: 'TRAUMA 3' },
  { id: 'trauma4', x: 170, y: 250, width: 140, height: 120, label: 'TRAUMA 4' },
  { id: 'ct_xray', x: 330, y: 120, width: 120, height: 100, label: 'CT/X-RAY' },
  { id: 'nurse_station', x: 330, y: 230, width: 140, height: 90, label: 'NURSE STATION' },
  { id: 'er101', x: 500, y: 120, width: 75, height: 85, label: 'ER101' },
  { id: 'er102', x: 585, y: 120, width: 75, height: 85, label: 'ER102' },
  { id: 'er103', x: 670, y: 120, width: 75, height: 85, label: 'ER103' },
  { id: 'er104', x: 500, y: 215, width: 75, height: 85, label: 'ER104' },
  { id: 'er105', x: 585, y: 215, width: 75, height: 85, label: 'ER105' },
  { id: 'er106', x: 670, y: 215, width: 75, height: 85, label: 'ER106' },
  { id: 'triage1', x: 770, y: 120, width: 100, height: 85, label: 'TRIAGE 1' },
  { id: 'triage2', x: 880, y: 120, width: 100, height: 85, label: 'TRIAGE 2' },
  { id: 'registration', x: 20, y: 400, width: 180, height: 70, label: 'REGISTRATION' },
  { id: 'waiting_room', x: 210, y: 400, width: 250, height: 70, label: 'WAITING ROOM' },
  { id: 'lab', x: 480, y: 400, width: 120, height: 70, label: 'LAB' },
  { id: 'consult', x: 620, y: 400, width: 140, height: 70, label: 'CONSULT' },
  { id: 'supply', x: 780, y: 400, width: 100, height: 70, label: 'SUPPLY' },
]

type Props = {
  roomDataMap: Record<string, RoomData>
  hoveredRoomId: string | null
  onRoomHover: (id: string | null, e?: React.MouseEvent) => void
  onRoomClick: (id: string) => void
}

export function BlueprintMap({ roomDataMap, hoveredRoomId, onRoomHover, onRoomClick }: Props) {
  return (
    <svg
      viewBox="0 0 1000 500"
      preserveAspectRatio="xMidYMid meet"
      className="w-full max-w-4xl mx-auto rounded-lg border border-slate-600/50 shadow-2xl"
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
    >
      {/* Corridor lines - blueprint style */}
      <g stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none">
        <path d="M 320 110 L 320 340" />
        <path d="M 490 110 L 490 340" />
        <path d="M 760 110 L 760 340" />
        <path d="M 20 390 L 980 390" />
      </g>

      {ROOM_SHAPES.map((shape) => {
        const data = roomDataMap[shape.id]
        const fill = data ? getStatusFill(data.status) : 'rgba(100,116,139,0.3)'
        const isHovered = hoveredRoomId === shape.id
        const isCritical = data?.critical ?? false
        const isIsolation = data?.isolation ?? false

        return (
          <g
            key={shape.id}
            id={shape.id}
            className="cursor-pointer transition-opacity duration-150"
            onMouseEnter={(e) => onRoomHover(shape.id, e)}
            onMouseLeave={() => onRoomHover(null)}
            onClick={() => onRoomClick(shape.id)}
          >
            {/* Room fill - status color */}
            <rect
              x={shape.x + 2}
              y={shape.y + 2}
              width={shape.width - 4}
              height={shape.height - 4}
              fill={fill}
              stroke="white"
              strokeWidth={isHovered ? 2.5 : 1}
              rx={2}
            />
            {/* Room label */}
            <text
              x={shape.x + shape.width / 2}
              y={shape.y + shape.height / 2 - 4}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="600"
            >
              {shape.label}
            </text>
            {/* Critical alert icon */}
            {isCritical && (
              <g transform={`translate(${shape.x + shape.width - 18}, ${shape.y + 8})`}>
                <circle cx="0" cy="0" r="6" fill="#dc2626" opacity="0.9" />
                <text x="0" y="4" textAnchor="middle" fill="white" fontSize="8">!</text>
              </g>
            )}
            {/* Isolation badge */}
            {isIsolation && (
              <g transform={`translate(${shape.x + 8}, ${shape.y + shape.height - 12})`}>
                <rect x="-2" y="-2" width="24" height="12" rx="2" fill="#7c3aed" opacity="0.9" />
                <text x="10" y="8" textAnchor="middle" fill="white" fontSize="7">ISO</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
