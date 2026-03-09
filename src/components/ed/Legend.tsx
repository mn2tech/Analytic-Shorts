/**
 * Legend component for ED Bed Map - shows status color meanings
 */
import { getStatusColor } from '../../utils/edStatusColors'

const LEGEND_ITEMS = [
  { status: 'occupied' as const, label: 'Occupied' },
  { status: 'available' as const, label: 'Available' },
  { status: 'dirty' as const, label: 'Dirty' },
  { status: 'closed' as const, label: 'Closed' },
  { special: 'critical', label: 'Critical / Alert', color: '#DC2626' },
] as const

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 rounded-lg bg-slate-800/80 border border-white/10">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Legend</span>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border border-white/30 shrink-0"
            style={{
              backgroundColor: 'special' in item ? item.color : getStatusColor(item.status),
            }}
          />
          <span className="text-sm text-slate-300">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
