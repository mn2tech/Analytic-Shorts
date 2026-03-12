/**
 * Zone Highlight Overlay - Visual emphasis for highlighted zones during scenarios
 * Adds a subtle pulsing highlight around a department/zone
 */
import { useMemo } from 'react'

const ZONE_COLORS = {
  ER: 'rgba(239, 68, 68, 0.15)',
  'General Ward': 'rgba(34, 197, 94, 0.15)',
  OR: 'rgba(59, 130, 246, 0.15)',
  ICU: 'rgba(168, 85, 247, 0.15)',
  WAITING: 'rgba(245, 158, 11, 0.15)',
}

export default function ZoneHighlightOverlay({
  highlightedZone,
  roomOverlays = [],
  roomIdToUnit = new Map(),
}) {
  const zoneBounds = useMemo(() => {
    if (!highlightedZone) return null

    const zoneRooms = roomOverlays.filter(
      (r) => roomIdToUnit.get(r.id) === highlightedZone
    )

    if (zoneRooms.length === 0) return null

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    zoneRooms.forEach((r) => {
      const w = r.width ?? 50
      const h = r.height ?? 50
      minX = Math.min(minX, r.x)
      minY = Math.min(minY, r.y)
      maxX = Math.max(maxX, r.x + w)
      maxY = Math.max(maxY, r.y + h)
    })

    const pad = 12
    return {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + 2 * pad,
      height: maxY - minY + 2 * pad,
    }
  }, [highlightedZone, roomOverlays, roomIdToUnit])

  if (!highlightedZone || !zoneBounds) return null

  const fillColor = ZONE_COLORS[highlightedZone] || 'rgba(255, 255, 255, 0.1)'

  return (
    <g className="pointer-events-none">
      <rect
        x={zoneBounds.x}
        y={zoneBounds.y}
        width={zoneBounds.width}
        height={zoneBounds.height}
        fill={fillColor}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={2}
        strokeDasharray="4 4"
        rx={6}
        className="animate-pulse"
        style={{
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      />
    </g>
  )
}
