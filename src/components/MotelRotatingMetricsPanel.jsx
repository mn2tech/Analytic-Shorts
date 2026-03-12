/**
 * Motel Rotating Metrics Panel - Cycles through occupancy, turnover, activity.
 * For Command Center Mode display.
 */
import { useState, useEffect } from 'react'
import { getTransferCountsAtTime } from '../data/motelGuestMovements'

const ROTATION_INTERVAL_MS = 5000

function formatMins(m) {
  if (m == null || isNaN(m)) return '—'
  if (m < 60) return `${Math.round(m)}m`
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`
}

export default function MotelRotatingMetricsPanel({ selectedTime, metrics }) {
  const [slideIndex, setSlideIndex] = useState(0)
  const time = selectedTime ?? '14:00'
  const transferCounts = getTransferCountsAtTime(time)

  useEffect(() => {
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % 3), ROTATION_INTERVAL_MS)
    return () => clearInterval(t)
  }, [])

  const slides = [
    {
      title: 'Occupancy',
      items: [
        { label: 'Total', value: metrics?.total ?? 0 },
        { label: 'Occupied', value: metrics?.occupied ?? 0 },
        { label: 'Available', value: metrics?.available ?? 0 },
        { label: 'Utilization', value: `${metrics?.utilizationPct ?? 0}%` },
      ],
    },
    {
      title: 'Turnover',
      items: [
        { label: 'Dirty', value: metrics?.dirty ?? 0 },
        { label: 'Reserved', value: metrics?.reserved ?? 0 },
      ],
    },
    {
      title: 'Activity Today',
      items: [
        { label: 'Check-ins', value: transferCounts.checkIns ?? 0 },
        { label: 'Check-outs', value: transferCounts.checkOuts ?? 0 },
        { label: 'Room Changes', value: transferCounts.roomChanges ?? 0 },
      ],
    },
  ]

  const slide = slides[slideIndex]

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/80 px-10 py-7 min-w-[360px]">
      <p className="text-base font-bold text-slate-500 uppercase tracking-widest mb-5">{slide.title}</p>
      <div className="grid grid-cols-2 gap-x-10 gap-y-4">
        {slide.items.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-baseline gap-4">
            <span className="text-slate-400 text-lg">{label}</span>
            <span className="font-bold text-white text-2xl tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
