/**
 * Legend - Status color pills for ER Command Map
 */
import { getStatusColor } from '../../utils/roomStyles'
import type { RoomStatus } from '../../types/er'

const LEGEND_ITEMS: { status: RoomStatus; label: string }[] = [
  { status: 'occupied', label: 'Occupied' },
  { status: 'available', label: 'Available' },
  { status: 'dirty', label: 'Dirty' },
  { status: 'closed', label: 'Closed' },
]

export default function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 rounded-lg bg-slate-800/80 border border-slate-600/50">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Legend</span>
      {LEGEND_ITEMS.map((item) => (
        <div key={item.status} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border border-white/30 shrink-0"
            style={{ backgroundColor: getStatusColor(item.status) }}
          />
          <span className="text-sm text-slate-300">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
