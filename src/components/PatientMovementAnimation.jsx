/**
 * PatientMovementAnimation - Animated patient movement layer
 * Shows glowing patient markers moving between rooms and departments
 * Supports: Waiting Room → ER → GW → OR → ICU → Discharge
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import { getRoomCenter } from '../data/patientMovements'

const ANIMATION_DURATION_MS = 1500 // 1.5 seconds
const MARKER_RADIUS = 5
const GLOW_RADIUS = 12

// Color coding by department transition type
const TRANSITION_COLORS = {
  'WAITING→ER': '#f59e0b', // Amber for intake
  'ER→GW': '#22d3ee', // Cyan for ER to ward
  'GW→OR': '#3b82f6', // Blue for procedure
  'OR→ICU': '#a855f7', // Purple for post-op
  'ICU→Discharge': '#10b981', // Green for discharge
  'ER→ICU': '#ec4899', // Pink for direct admit
  default: '#60a5fa', // Light blue for other transitions
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Single animated patient marker
 */
function PatientMarker({ transition, onComplete, roomOverlays }) {
  const { id, patientId, from, to, startX, startY, endX, endY, transitionType, timestamp } = transition
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)
  const startTimeRef = useRef(null)
  const rafRef = useRef(null)

  // Determine color based on transition type
  const color = TRANSITION_COLORS[transitionType] || TRANSITION_COLORS.default

  useEffect(() => {
    // Start animation after a small delay to allow rendering
    const timer = setTimeout(() => {
      setStarted(true)
      startTimeRef.current = performance.now()
    }, 50)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!started) return

    const tick = (now) => {
      const elapsed = now - startTimeRef.current
      const p = Math.min(1, elapsed / ANIMATION_DURATION_MS)
      setProgress(easeInOutCubic(p))

      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Animation complete
        onComplete?.(id)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [started, id, onComplete])

  const x = startX + (endX - startX) * progress
  const y = startY + (endY - startY) * progress

  // Calculate path for trail
  const pathLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
  const strokeDashoffset = pathLength * (1 - progress)

  return (
    <g className="pointer-events-none">
      {/* Animated trail/path */}
      {progress > 0.05 && (
        <line
          x1={startX}
          y1={startY}
          x2={x}
          y2={y}
          stroke={color}
          strokeWidth={2}
          strokeDasharray="8 4"
          opacity={0.6}
          strokeLinecap="round"
        />
      )}

      {/* Glowing patient marker */}
      <g>
        {/* Outer glow */}
        <circle
          cx={x}
          cy={y}
          r={GLOW_RADIUS}
          fill={color}
          opacity={0.2 - progress * 0.1}
          style={{
            filter: 'blur(4px)',
            transition: 'opacity 0.1s',
          }}
        />
        {/* Middle glow */}
        <circle
          cx={x}
          cy={y}
          r={GLOW_RADIUS - 3}
          fill={color}
          opacity={0.4 - progress * 0.2}
        />
        {/* Core marker */}
        <circle
          cx={x}
          cy={y}
          r={MARKER_RADIUS}
          fill={color}
          opacity={0.95}
          style={{
            filter: 'drop-shadow(0 0 4px ' + color + ')',
          }}
        />
        {/* Pulsing ring */}
        <circle
          cx={x}
          cy={y}
          r={MARKER_RADIUS + 4}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.6 - progress * 0.4}
          style={{
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </g>

      {/* Patient ID label (optional, can be toggled) */}
      {progress > 0.1 && progress < 0.9 && (
        <text
          x={x}
          y={y - MARKER_RADIUS - 8}
          textAnchor="middle"
          style={{
            fontSize: 9,
            fill: color,
            fontWeight: 600,
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          }}
        >
          {patientId}
        </text>
      )}
    </g>
  )
}

/**
 * Main Patient Movement Animation Layer
 * @param {Object} props
 * @param {Array} props.activeTransitions - Array of active patient transitions
 * @param {Array} props.roomOverlays - Room overlay data for coordinate lookup
 * @param {Function} props.onTransitionComplete - Callback when animation completes
 * @param {boolean} props.enabled - Whether animations are enabled
 */
export default function PatientMovementAnimation({
  activeTransitions = [],
  roomOverlays = [],
  onTransitionComplete,
  enabled = true,
}) {
  const [completedTransitions, setCompletedTransitions] = useState(new Set())

  // Process transitions to add coordinates
  const processedTransitions = useMemo(() => {
    if (!enabled || !activeTransitions?.length) return []

    return activeTransitions
      .filter((t) => !completedTransitions.has(t.id))
      .map((transition) => {
        const fromRoom = roomOverlays.find((r) => r.id === transition.from)
        const toRoom = roomOverlays.find((r) => r.id === transition.to)

        const fromCenter = fromRoom ? getRoomCenter(fromRoom) : null
        const toCenter = toRoom ? getRoomCenter(toRoom) : null

        // If we can't find coordinates, skip this transition
        if (!fromCenter || !toCenter) {
          return null
        }

        // Determine transition type for color coding
        const fromDept = fromRoom?.unit || 'Unknown'
        const toDept = toRoom?.unit || 'Unknown'
        const transitionType = `${fromDept}→${toDept}`

        return {
          ...transition,
          startX: fromCenter.x,
          startY: fromCenter.y,
          endX: toCenter.x,
          endY: toCenter.y,
          transitionType,
        }
      })
      .filter(Boolean)
  }, [activeTransitions, roomOverlays, enabled, completedTransitions])

  const handleTransitionComplete = (transitionId) => {
    setCompletedTransitions((prev) => new Set([...prev, transitionId]))
    onTransitionComplete?.(transitionId)
  }

  // Clear completed transitions when active transitions change
  useEffect(() => {
    if (activeTransitions.length === 0) {
      setCompletedTransitions(new Set())
    }
  }, [activeTransitions.length])

  if (!enabled || processedTransitions.length === 0) return null

  return (
    <g className="patient-movement-layer">
      {processedTransitions.map((transition) => (
        <PatientMarker
          key={transition.id}
          transition={transition}
          onComplete={handleTransitionComplete}
          roomOverlays={roomOverlays}
        />
      ))}
    </g>
  )
}
