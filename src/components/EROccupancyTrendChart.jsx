/**
 * ER Occupancy Trend Chart
 * Small line chart showing ER occupancy over the last 2 hours
 */
import { useMemo } from 'react'
import { getEROccupancyHistory, getEROccupancy } from '../utils/erOccupancyPrediction'

const CHART_WIDTH = 200
const CHART_HEIGHT = 60
const PADDING = { top: 5, right: 5, bottom: 5, left: 5 }

export default function EROccupancyTrendChart({
  roomStatusHistory = [],
  roomOverlays = [],
  roomIdToUnit = new Map(),
  currentRooms = [], // Current room data (may include scenario updates)
  currentScenarioId = null, // If scenario is active, add current state to chart
}) {
  const history = useMemo(() => {
    const historicalData = getEROccupancyHistory(2, roomStatusHistory, roomOverlays, roomIdToUnit)
    
    // If scenario is active, calculate current ER occupancy and add it as latest data point
    if (currentScenarioId && currentRooms.length > 0) {
      const currentOccupancy = getEROccupancy(currentRooms, roomIdToUnit)
      
      if (currentOccupancy && currentOccupancy.totalBeds > 0) {
        const currentOccupancyPct = (currentOccupancy.occupiedBeds / currentOccupancy.totalBeds) * 100
        
        // Get the latest time from historical data, or use current time
        const latestTime = historicalData.length > 0 
          ? historicalData[historicalData.length - 1].time 
          : '14:00'
        
        // Add current state as the latest point
        historicalData.push({
          time: latestTime, // Use same time as latest snapshot, or could use "Now"
          occupancyPct: Math.round(currentOccupancyPct),
        })
      }
    }
    
    return historicalData
  }, [roomStatusHistory, roomOverlays, roomIdToUnit, currentRooms, currentScenarioId])

  const chartData = useMemo(() => {
    if (history.length === 0) return null

    const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
    const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom

    const maxOccupancy = Math.max(100, ...history.map((h) => h.occupancyPct))
    const minOccupancy = Math.min(0, ...history.map((h) => h.occupancyPct))
    const range = maxOccupancy - minOccupancy || 100

    const points = history.map((point, index) => {
      const x = PADDING.left + (index / (history.length - 1 || 1)) * plotWidth
      const y = PADDING.top + plotHeight - ((point.occupancyPct - minOccupancy) / range) * plotHeight
      return { x, y, occupancyPct: point.occupancyPct, time: point.time }
    })

    // Create path for line
    const pathData = points
      .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
      .join(' ')

    return {
      points,
      pathData,
      maxOccupancy,
      minOccupancy,
    }
  }, [history])

  if (!chartData || history.length === 0) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded p-2">
        <div className="text-xs text-slate-500 text-center py-4">
          No historical data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/40 border border-slate-700/50 rounded p-2">
      <div className="text-xs text-slate-400 mb-1">ER Occupancy Trend (2h)</div>
      <svg width={CHART_WIDTH} height={CHART_HEIGHT} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <linearGradient id="erTrendGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.2)" />
            <stop offset="50%" stopColor="rgba(234, 179, 8, 0.2)" />
            <stop offset="100%" stopColor="rgba(239, 68, 68, 0.2)" />
          </linearGradient>
        </defs>

        {/* Area under curve */}
        <path
          d={`${chartData.pathData} L ${chartData.points[chartData.points.length - 1].x} ${CHART_HEIGHT - PADDING.bottom} L ${PADDING.left} ${CHART_HEIGHT - PADDING.bottom} Z`}
          fill="url(#erTrendGradient)"
          opacity={0.3}
        />

        {/* Line */}
        <path
          d={chartData.pathData}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 95% threshold line */}
        <line
          x1={PADDING.left}
          y1={PADDING.top + (CHART_HEIGHT - PADDING.top - PADDING.bottom) * 0.05}
          x2={CHART_WIDTH - PADDING.right}
          y2={PADDING.top + (CHART_HEIGHT - PADDING.top - PADDING.bottom) * 0.05}
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="4 4"
          opacity={0.5}
        />

        {/* Data points */}
        {chartData.points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={2}
            fill="#22d3ee"
            className="hover:r-3 transition-all"
          />
        ))}

        {/* Labels */}
        <text
          x={PADDING.left}
          y={PADDING.top - 2}
          className="text-[8px] fill-slate-400"
        >
          {Math.round(chartData.maxOccupancy)}%
        </text>
        <text
          x={PADDING.left}
          y={CHART_HEIGHT - PADDING.bottom + 10}
          className="text-[8px] fill-slate-400"
        >
          {Math.round(chartData.minOccupancy)}%
        </text>
      </svg>
    </div>
  )
}
