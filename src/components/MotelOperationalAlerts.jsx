/**
 * Motel Operational Alerts - Capacity, dirty rooms, occupancy alerts.
 */
import { useMemo } from 'react'
import { INFRASTRUCTURE_ROOM_IDS, NON_GUEST_ROOM_TYPES } from '../config/motelData'

const PRIORITY_ORDER = { HIGH: 3, MEDIUM: 2, LOW: 1 }

function formatShortDate(value) {
  if (!value) return '—'
  let d = null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const [y, m, day] = value.trim().split('-').map(Number)
    d = new Date(y, m - 1, day, 12, 0, 0)
  } else {
    d = new Date(value)
  }
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function MotelOperationalAlerts({
  selectedTime,
  roomOverlays = [],
  roomStatusMap = {},
  roomIdToUnit = new Map(),
  highlightAlerts = false,
  metrics = {},
}) {
  const guestRooms = useMemo(
    () =>
      roomOverlays.filter(
        (r) => !INFRASTRUCTURE_ROOM_IDS.has(r.id) && !NON_GUEST_ROOM_TYPES.has((r.type || '').toLowerCase())
      ),
    [roomOverlays]
  )

  const queue = useMemo(() => {
    return guestRooms
      .map((r) => roomStatusMap[r.id])
      .filter((room) => room && room.status !== 'maintenance')
      .sort((a, b) => {
        const pa = a.priority ? PRIORITY_ORDER[a.priority] || 0 : 0
        const pb = b.priority ? PRIORITY_ORDER[b.priority] || 0 : 0
        if (pb !== pa) return pb - pa
        const aTime = a.checkOut ? new Date(a.checkOut).getTime() : Number.MAX_SAFE_INTEGER
        const bTime = b.checkOut ? new Date(b.checkOut).getTime() : Number.MAX_SAFE_INTEGER
        return aTime - bTime
      })
      .slice(0, 8)
  }, [guestRooms, roomStatusMap])

  const alerts = useMemo(() => {
    const list = []
    const maintenanceRooms = guestRooms
      .map((r) => roomStatusMap[r.id])
      .filter((room) => room?.status === 'maintenance')
    const needsCleaningNow = guestRooms
      .map((r) => roomStatusMap[r.id])
      .filter((room) => room?.status === 'dirty' || room?.priority === 'HIGH')
      .length
    const staleDirty = guestRooms
      .map((r) => roomStatusMap[r.id])
      .filter((room) => {
        if (!room || room.status !== 'dirty' || !room.updatedAt) return false
        const ageMs = Date.now() - new Date(room.updatedAt).getTime()
        return ageMs > 60 * 60 * 1000
      })
      .length

    if (needsCleaningNow > 0) {
      list.push({ id: 'clean-now', msg: `⚠️ ${needsCleaningNow} rooms need cleaning now`, severity: 'warning' })
    }
    if (maintenanceRooms.length > 0) {
      const room = maintenanceRooms[0]
      list.push({
        id: 'maintenance',
        msg: `🚨 Room ${room.roomNumber || room.room || 'N/A'} marked Out of Order`,
        severity: 'critical',
      })
    }
    if (staleDirty > 0) {
      list.push({ id: 'stale-dirty', msg: `⏳ ${staleDirty} rooms pending cleaning > 1 hour`, severity: 'warning' })
    }
    if ((metrics.turningOverToday || 0) >= 8) {
      list.push({
        id: 'turnover-spike',
        msg: `📈 High turnover today: ${metrics.turningOverToday} checkouts`,
        severity: 'warning',
      })
    }
    return list
  }, [guestRooms, metrics.turningOverToday, roomStatusMap])

  const containerClass = `rounded-lg border border-white/10 px-4 py-3 ${highlightAlerts ? 'bg-slate-800/60' : 'bg-slate-800/40'}`

  return (
    <div className="space-y-3">
      <div className={containerClass}>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Alerts</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500">No active alerts</p>
        ) : (
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
        )}
      </div>
      <div className={containerClass}>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Housekeeping Priority Queue</h3>
        <div className="space-y-2">
          {queue.length === 0 ? (
            <p className="text-sm text-slate-500">No rooms queued</p>
          ) : (
            queue.map((room) => (
              <div key={room.id || room.room || room.roomNumber} className="rounded-md bg-slate-900/70 border border-white/10 px-2.5 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white">Room {room.roomNumber || room.room}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      room.priority === 'HIGH' ? 'bg-red-500/20 text-red-300 border border-red-400/30' :
                      room.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' :
                      'bg-slate-700 text-slate-200 border border-white/10'
                    }`}
                  >
                    {room.priority || 'LOW'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate">{room.guestName || room.guest_name || 'No guest assigned'}</div>
                <div className="text-xs text-slate-500 mt-1">Checkout: {formatShortDate(room.checkOut || room.check_out)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
