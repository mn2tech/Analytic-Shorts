/**
 * Summary cards - Total, Occupied, Available, Dirty, Closed, Predicted Available
 */

import type { RoomData } from '../../types/predictiveRoom'

type Props = {
  rooms: RoomData[]
}

export default function SummaryCards({ rooms }: Props) {
  const total = rooms.length
  const occupied = rooms.filter((r) => r.status === 'occupied').length
  const available = rooms.filter((r) => r.status === 'available').length
  const dirty = rooms.filter((r) => r.status === 'dirty').length
  const closed = rooms.filter((r) => r.status === 'closed').length
  const predictedAvailable = rooms.filter((r) => r.predictedInMinutes != null).length

  const cards = [
    { label: 'Total Rooms', value: total, color: 'text-slate-300' },
    { label: 'Occupied', value: occupied, color: 'text-red-400' },
    { label: 'Available', value: available, color: 'text-emerald-400' },
    { label: 'Dirty', value: dirty, color: 'text-amber-400' },
    { label: 'Closed', value: closed, color: 'text-slate-400' },
    { label: 'Predicted Available', value: predictedAvailable, color: 'text-cyan-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-white/10 bg-slate-800/80 px-4 py-3"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {card.label}
          </div>
          <div className={`text-xl font-bold mt-0.5 ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  )
}
