/**
 * ZoneHeatOverlay - Translucent heat overlays by department/zone.
 * Intensity based on pressure score. Pulsing glow when high/critical.
 * Rendered on top of blueprint, under room overlays; rooms remain visible.
 */
import { useMemo } from 'react'
import { computeAllDepartmentPressures, PRESSURE_LEVELS } from '../utils/zonePressure'
import { INFRASTRUCTURE_ROOM_IDS, NON_PATIENT_ROOM_TYPES } from '../config/hospitalBedData'

const ZONE_COLORS = {
  normal: { fill: 'rgba(34, 197, 94, 0.08)', stroke: 'rgba(34, 197, 94, 0.15)' },
  watch: { fill: 'rgba(234, 179, 8, 0.12)', stroke: 'rgba(234, 179, 8, 0.25)' },
  high: { fill: 'rgba(249, 115, 22, 0.18)', stroke: 'rgba(249, 115, 22, 0.35)' },
  critical: { fill: 'rgba(239, 68, 68, 0.22)', stroke: 'rgba(239, 68, 68, 0.45)' },
}

/** Compute bounding box (with padding) for rooms in a unit */
function getZoneBounds(roomOverlays, unit) {
  const matching = roomOverlays.filter(
    (r) =>
      r.unit === unit &&
      !INFRASTRUCTURE_ROOM_IDS.has(r.id) &&
      !NON_PATIENT_ROOM_TYPES.has(r.type) &&
      r.type !== 'waiting_slot'
  )
  if (matching.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  matching.forEach((r) => {
    const w = r.width ?? 50
    const h = r.height ?? 50
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + w)
    maxY = Math.max(maxY, r.y + h)
  })
  const pad = 8
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + 2 * pad,
    height: maxY - minY + 2 * pad,
  }
}

/** Waiting room uses WR slots + ROOM_011 area */
function getWaitingZoneBounds(roomOverlays) {
  const wrSlots = roomOverlays.filter((r) => r.unit === 'WAITING')
  const room011 = roomOverlays.find((r) => r.id === 'ROOM_011')
  const all = [...wrSlots]
  if (room011) all.push(room011)
  if (all.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  all.forEach((r) => {
    const w = r.width ?? 50
    const h = r.height ?? 50
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + w)
    maxY = Math.max(maxY, r.y + h)
  })
  const pad = 6
  return { x: minX - pad, y: minY - pad, width: maxX - minX + 2 * pad, height: maxY - minY + 2 * pad }
}

const ZONE_LABELS = {
  ER: 'ER',
  'General Ward': 'GW',
  OR: 'OR',
  ICU: 'ICU',
  WAITING: 'Waiting Room',
}

export default function ZoneHeatOverlay({
  roomOverlays,
  roomStatusMap,
  roomIdToUnit,
  showPressureLayer = true,
}) {
  const { zones, summaries } = useMemo(() => {
    const rooms = Object.values(roomStatusMap || {}).filter(Boolean)
    const summaries = computeAllDepartmentPressures(rooms, roomIdToUnit || new Map())
    const zones = []
    const units = ['ER', 'General Ward', 'OR', 'ICU', 'WAITING']
    units.forEach((unit) => {
      const bounds =
        unit === 'WAITING' ? getWaitingZoneBounds(roomOverlays || []) : getZoneBounds(roomOverlays || [], unit)
      if (bounds) {
        const s = summaries[unit]
        
        // For General Ward, calculate label position based on the main ward rooms
        // (excluding any rooms that might be near the entrance area like ROOM_022)
        let labelPosition = null
        if (unit === 'General Ward') {
          // Get ER bounds to ensure GW label doesn't appear in ER area
          const erBounds = getZoneBounds(roomOverlays || [], 'ER')
          
          const wardRooms = (roomOverlays || []).filter(
            (r) =>
              r.unit === 'General Ward' &&
              !INFRASTRUCTURE_ROOM_IDS.has(r.id) &&
              !NON_PATIENT_ROOM_TYPES.has(r.type) &&
              r.type !== 'waiting_slot' &&
              r.x >= 830 && // Filter out rooms in the entrance area (ROOM_022 is at x:632)
              r.id !== 'ROOM_022' // Explicitly exclude ROOM_022 which is near entrance
          )
          if (wardRooms.length > 0) {
            // Calculate position at the start of the main ward area (where ROOM_012+ are)
            let minX = Infinity
            let minY = Infinity
            wardRooms.forEach((r) => {
              minX = Math.min(minX, r.x)
              minY = Math.min(minY, r.y)
            })
            // Position label clearly within the General Ward area, not near entrance
            const proposedX = minX + 30
            const proposedY = minY + 12
            
            // Check if the proposed position would be in the ER area
            const isInERArea = erBounds && (
              proposedX >= erBounds.x &&
              proposedX <= erBounds.x + erBounds.width &&
              proposedY >= erBounds.y &&
              proposedY <= erBounds.y + erBounds.height
            )
            
            // Only set label position if it's not in the ER area
            if (!isInERArea) {
              labelPosition = { x: proposedX, y: proposedY }
            }
            // If it would be in ER area, labelPosition remains null, so no label will show
          }
        }
        
        zones.push({
          unit,
          bounds,
          pressureLevel: s?.pressureLevel ?? 'normal',
          pressureScore: s?.pressureScore ?? 0,
          summary: s,
          labelPosition,
        })
      }
    })
    return { zones, summaries }
  }, [roomOverlays, roomStatusMap, roomIdToUnit])

  if (!showPressureLayer) return null

  return (
    <g className="pointer-events-none">
      {zones.map((z) => {
        const style = ZONE_COLORS[z.pressureLevel] ?? ZONE_COLORS.normal
        const isHigh = z.pressureLevel === 'high' || z.pressureLevel === 'critical'
        const label = PRESSURE_LEVELS[z.pressureLevel]
        const displayLabel = ZONE_LABELS[z.unit] ?? z.unit
        const tooltipParts = []
        if (z.summary?.utilizationPct != null)
          tooltipParts.push(`Occupancy: ${z.summary.utilizationPct}%`)
        if (z.summary?.waitingProviderCount > 0)
          tooltipParts.push(`${z.summary.waitingProviderCount} waiting for provider`)
        if (z.summary?.criticalCount > 0) tooltipParts.push(`${z.summary.criticalCount} critical LOS`)
        if (z.summary?.avgLOS != null)
          tooltipParts.push(`Avg LOS: ${Math.round(z.summary.avgLOS)}m`)
        const tooltip = tooltipParts.length ? tooltipParts.join(' • ') : undefined

        return (
          <g key={z.unit}>
            <rect
              x={z.bounds.x}
              y={z.bounds.y}
              width={z.bounds.width}
              height={z.bounds.height}
              fill={style.fill}
              stroke={style.stroke}
              strokeWidth={1}
              rx={4}
              className={isHigh ? 'animate-pressure-pulse' : undefined}
              style={{ transition: 'fill 0.3s, stroke 0.3s' }}
            />
            {z.pressureLevel !== 'normal' && (() => {
              // Use calculated label position for General Ward, otherwise use default
              const labelX = z.labelPosition?.x ?? z.bounds.x + 6
              const labelY = z.labelPosition?.y ?? z.bounds.y + 12
              
              // Build the full status text
              const statusParts = []
              if (z.summary?.utilizationPct != null)
                statusParts.push(`Occupancy: ${z.summary.utilizationPct}%`)
              if (z.summary?.criticalCount > 0)
                statusParts.push(`${z.summary.criticalCount} critical LOS`)
              if (z.summary?.avgLOS != null)
                statusParts.push(`Avg LOS: ${Math.round(z.summary.avgLOS)}m`)
              
              const statusText = statusParts.length > 0
                ? `${displayLabel} — ${statusParts.join(' • ')}`
                : `${displayLabel} Pressure: ${label}`
              
              return (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="start"
                  style={{
                    fontSize: 9,
                    fill: 'rgba(255,255,255,0.9)',
                    fontWeight: 600,
                    pointerEvents: 'none',
                  }}
                >
                  {statusText}
                </text>
              )
            })()}
            {tooltip && (
              <title>{`${displayLabel} — ${tooltip}`}</title>
            )}
          </g>
        )
      })}
    </g>
  )
}
