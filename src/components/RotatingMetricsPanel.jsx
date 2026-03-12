/**
 * Rotating Metrics Panel - Cycles through occupancy, LOS, waiting, transfers.
 * For Command Center Mode display.
 */
import { useState, useEffect } from 'react'
import { getTransferCountsAtTime, getWaitingRoomMetricsAtTime } from '../data/patientMovements'

const ROTATION_INTERVAL_MS = 5000

function formatMins(m) {
  if (m == null || isNaN(m)) return '—'
  if (m < 60) return `${Math.round(m)}m`
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`
}

export default function RotatingMetricsPanel({
  selectedTime,
  metrics,
}) {
  const [slideIndex, setSlideIndex] = useState(0)
  const time = selectedTime ?? '14:00'
  const transferCounts = getTransferCountsAtTime(time)
  const wrMetrics = getWaitingRoomMetricsAtTime(time)

  useEffect(() => {
    const t = setInterval(() => setSlideIndex((i) => (i + 1) % 4), ROTATION_INTERVAL_MS)
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
      title: 'Length of Stay',
      items: [
        { label: 'Avg LOS', value: formatMins(metrics?.avgLOS) },
        { label: 'High Pressure', value: metrics?.highPressureRooms ?? 0 },
        { label: 'Critical', value: metrics?.criticalRooms ?? 0 },
      ],
    },
    {
      title: 'Waiting Room',
      items: [
        { label: 'Waiting', value: wrMetrics.waitingCount },
        { label: 'Avg Wait', value: formatMins(wrMetrics.avgWaitMins) },
        { label: 'Longest', value: formatMins(wrMetrics.maxWaitMins) },
      ],
    },
    {
      title: 'Transfers',
      items: [
        { label: 'WR → ER', value: transferCounts.wrToEr ?? 0 },
        { label: 'ER → GW', value: transferCounts.erToGw },
        { label: 'GW → OR', value: transferCounts.gwToOr },
        { label: 'OR → ICU', value: transferCounts.orToIcu },
        { label: 'Discharges', value: transferCounts.discharges },
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
      <div className="flex gap-1.5 mt-4">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`block w-2 h-2 rounded-full transition-colors ${i === slideIndex ? 'bg-teal-400' : 'bg-slate-600'}`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  )
}
