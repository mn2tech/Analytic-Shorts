/**
 * Waiting Room Metrics - Waiting patients, avg wait, longest wait, pending room assignment.
 */
import { getWaitingRoomMetricsAtTime } from '../data/patientMovements'

function formatMins(m) {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`
}

export default function WaitingRoomMetrics({ selectedTime }) {
  const time = selectedTime ?? '14:00'
  const metrics = getWaitingRoomMetricsAtTime(time)

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
      <h3 className="text-xs font-bold text-amber-500/80 uppercase tracking-widest mb-3">Waiting Room</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Waiting</span>
          <span className="text-lg font-bold text-amber-400">{metrics.waitingCount}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Avg Wait</span>
          <span className="text-lg font-bold text-white">{formatMins(metrics.avgWaitMins)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Longest</span>
          <span className="text-lg font-bold text-amber-300">{formatMins(metrics.maxWaitMins)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Pending Room</span>
          <span className="text-lg font-bold text-white">{metrics.pendingRoomAssignment}</span>
        </div>
      </div>
    </div>
  )
}
