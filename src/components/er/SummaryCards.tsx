/**
 * SummaryCards - Total, Occupied, Available, Dirty, Closed for ER Command Map
 */
import type { RoomState } from '../../types/er'

type Props = {
  states: RoomState[]
}

export default function SummaryCards({ states }: Props) {
  const total = states.length
  const occupied = states.filter((s) => s.status === 'occupied').length
  const available = states.filter((s) => s.status === 'available').length
  const dirty = states.filter((s) => s.status === 'dirty').length
  const closed = states.filter((s) => s.status === 'closed').length

  const cards = [
    { label: 'Total', value: total, color: 'text-slate-300' },
    { label: 'Occupied', value: occupied, color: 'text-red-400' },
    { label: 'Available', value: available, color: 'text-emerald-400' },
    { label: 'Dirty', value: dirty, color: 'text-amber-400' },
    { label: 'Closed', value: closed, color: 'text-slate-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-slate-600/50 bg-slate-800/80 px-4 py-3"
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
