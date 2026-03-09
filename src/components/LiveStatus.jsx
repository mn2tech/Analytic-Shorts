/**
 * LiveStatus - Reusable live data indicator for command-center dashboards.
 * Shows a colored dot and "Last updated" timestamp. Dot color reflects data freshness.
 */
import { useState, useEffect } from 'react'

const STALE_THRESHOLD_MS = 30_000 // Yellow after 30s
const VERY_STALE_THRESHOLD_MS = 60_000 // Red after 60s (optional, or same as above)

export default function LiveStatus({ lastUpdated, className = '' }) {
  const [now, setNow] = useState(() => Date.now())

  // Tick every second so timestamp and dot color update in place
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const ageMs = lastUpdated ? now - new Date(lastUpdated).getTime() : Infinity
  let dotColor = '#00c853' // green - live
  if (ageMs >= VERY_STALE_THRESHOLD_MS) dotColor = '#ef4444' // red - very stale
  else if (ageMs >= STALE_THRESHOLD_MS) dotColor = '#f59e0b' // amber - stale

  const formatted = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
    : '—'

  return (
    <div
      className={`flex items-center gap-2 font-semibold text-sm text-slate-200 ${className}`}
      aria-label={`Live. Last updated: ${formatted}`}
    >
      <span
        className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: dotColor }}
        title={ageMs < STALE_THRESHOLD_MS ? 'Data is current' : ageMs < VERY_STALE_THRESHOLD_MS ? 'Data may be stale' : 'Data may be outdated'}
      />
      <span className="text-slate-400 font-normal">LIVE</span>
      <span className="text-slate-500 font-normal">Last updated: {formatted}</span>
    </div>
  )
}
