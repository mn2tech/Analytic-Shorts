/**
 * Motel Operational Alerts - Capacity, dirty rooms, occupancy alerts.
 */
import { useMemo } from 'react'
import { INFRASTRUCTURE_ROOM_IDS, NON_GUEST_ROOM_TYPES } from '../config/motelData'

const CAPACITY_THRESHOLD_PCT = 95
const DIRTY_COUNT_THRESHOLD = 5

export default function MotelOperationalAlerts({
  selectedTime,
  roomOverlays = [],
  roomStatusMap = {},
  roomIdToUnit = new Map(),
  highlightAlerts = false,
}) {
  const alerts = useMemo(() => {
    const list = []
    const guestRooms = roomOverlays.filter(
      (r) => !INFRASTRUCTURE_ROOM_IDS.has(r.id) && !NON_GUEST_ROOM_TYPES.has((r.type || '').toLowerCase())
    )
    let occupied = 0
    let dirty = 0
    guestRooms.forEach((r) => {
      const s = roomStatusMap[r.id]?.status
      if (s === 'occupied' || s === 'reserved') occupied++
      if (s === 'dirty') dirty++
    })
    const total = guestRooms.length
    const utilizationPct = total > 0 ? Math.round((occupied / total) * 100) : 0

    if (utilizationPct >= CAPACITY_THRESHOLD_PCT) {
      list.push({ id: 'capacity', msg: 'Occupancy above 95%', severity: 'critical' })
    } else if (utilizationPct >= 90) {
      list.push({ id: 'capacity-warn', msg: 'Occupancy above 90%', severity: 'warning' })
    }
    if (dirty >= DIRTY_COUNT_THRESHOLD) {
      list.push({ id: 'dirty', msg: `${dirty} dirty rooms`, severity: 'warning' })
    }
    return list
  }, [selectedTime, roomOverlays, roomStatusMap, roomIdToUnit])

  if (alerts.length === 0) {
    return (
      <div className={`rounded-lg border border-white/10 px-4 py-3 ${highlightAlerts ? 'bg-slate-800/60' : 'bg-slate-800/40'}`}>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Alerts</h3>
        <p className="text-sm text-slate-500">No alerts</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-white/10 px-4 py-3 ${highlightAlerts ? 'bg-slate-800/60' : 'bg-slate-800/40'}`}>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Alerts</h3>
      <ul className="space-y-1.5">
        {alerts.map((a) => (
          <li
            key={a.id}
            className={`text-sm flex items-center gap-2 ${
              a.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
            }`}
          >
            <span className="shrink-0">{a.severity === 'critical' ? '●' : '⚠'}</span>
            {a.msg}
          </li>
        ))}
      </ul>
    </div>
  )
}
