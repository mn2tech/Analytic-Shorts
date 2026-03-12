/**
 * TransferAnimation - Animated dot moving from source to destination room.
 * Used during timeline playback to visualize patient transfers.
 */
import { useState, useEffect, useRef } from 'react'

const DURATION_MS = 1500
const DOT_RADIUS = 6
const TRAIL_STROKE = 1.5

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/** Single transfer dot with optional trail. isIntake (WR→ER) uses amber/dashed style. */
function TransferDot({ transfer, onComplete, showTrail = true }) {
  const { id, patientId, startX, startY, endX, endY, staggerMs = 0, action } = transfer
  const isIntake = action === 'roomed'
  const strokeColor = isIntake ? '#f59e0b' : '#22d3ee'
  const [progress, setProgress] = useState(0)
  const [started, setStarted] = useState(false)
  const startTimeRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const begin = () => {
      setStarted(true)
      startTimeRef.current = performance.now()
    }
    if (staggerMs > 0) {
      const t = setTimeout(begin, staggerMs)
      return () => clearTimeout(t)
    }
    begin()
  }, [staggerMs])

  useEffect(() => {
    if (!started) return
    const tick = (now) => {
      const elapsed = now - startTimeRef.current
      const p = Math.min(1, elapsed / DURATION_MS)
      setProgress(easeInOutCubic(p))
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        onComplete?.(id)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [started, id, onComplete])

  const x = startX + (endX - startX) * progress
  const y = startY + (endY - startY) * progress

  return (
    <g className="pointer-events-none">
      {showTrail && progress > 0.02 && (
        <line
          x1={startX}
          y1={startY}
          x2={x}
          y2={y}
          stroke={strokeColor}
          strokeWidth={isIntake ? TRAIL_STROKE + 0.5 : TRAIL_STROKE}
          strokeDasharray="6 4"
          opacity={0.8}
        />
      )}
      <g>
        <circle
          cx={x}
          cy={y}
          r={DOT_RADIUS}
          fill={strokeColor}
          opacity={0.95}
        />
        <circle
          cx={x}
          cy={y}
          r={DOT_RADIUS + 4}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          opacity={0.5 - progress * 0.3}
        />
      </g>
      <text
        x={x}
        y={y - DOT_RADIUS - 6}
        textAnchor="middle"
        style={{ fontSize: 8, fill: strokeColor, fontWeight: 700 }}
      >
        {isIntake ? 'Roomed' : patientId}
      </text>
    </g>
  )
}

/**
 * Renders transfer animations inside the map SVG.
 * Receives activeTransfers with { id, patientId, from, to, startX, startY, endX, endY }
 */
export default function TransferAnimation({ activeTransfers, onTransferComplete, showTrail = true }) {
  if (!activeTransfers?.length) return null

  return (
    <g>
      {activeTransfers.map((t) => (
        <TransferDot
          key={t.id}
          transfer={t}
          onComplete={onTransferComplete}
          showTrail={showTrail}
        />
      ))}
    </g>
  )
}
