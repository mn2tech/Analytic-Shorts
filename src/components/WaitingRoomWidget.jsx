/**
 * Waiting Room Queue Widget - Connects waiting patients to room availability.
 * Shows: waiting count, avg/longest wait, next room, urgency state.
 */
import { useMemo } from 'react'
import { getWaitingRoomSummaryAtTime } from '../data/hospitalDemoData'

function formatMins(m) {
  if (m == null || m < 0) return '—'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return mm > 0 ? `${h}h ${mm}m` : `${h}h`
}

const URGENCY_STYLES = {
  Stable: 'border-emerald-500/30 bg-emerald-500/10',
  Busy: 'border-amber-500/30 bg-amber-500/10',
  Delayed: 'border-orange-500/40 bg-orange-500/15',
  Overflow: 'border-red-500/50 bg-red-500/20',
}

export default function WaitingRoomWidget({ selectedTime, roomStatusMap = {}, roomOverlays = [], scenarioWaitingRoom = null }) {
  const summary = useMemo(() => {
    const liveSummary = getWaitingRoomSummaryAtTime(selectedTime, roomStatusMap, roomOverlays)
    // Use scenario data if provided, otherwise use computed data
    if (scenarioWaitingRoom) {
      return {
        totalWaiting: scenarioWaitingRoom.totalWaiting ?? 0,
        avgWaitMinutes: scenarioWaitingRoom.avgWaitMinutes ?? 0,
        longestWaitMinutes: scenarioWaitingRoom.longestWaitMinutes ?? 0,
        waitingForProvider: scenarioWaitingRoom.waitingForProvider ?? 0,
        nextAvailableRoom: liveSummary.nextAvailableRoom,
        nextAvailableInMinutes: liveSummary.nextAvailableInMinutes,
        urgency: scenarioWaitingRoom.totalWaiting >= 15 ? 'Overflow' : scenarioWaitingRoom.totalWaiting >= 10 ? 'Delayed' : scenarioWaitingRoom.totalWaiting >= 6 ? 'Busy' : 'Stable',
      }
    }
    return liveSummary
  }, [selectedTime, roomStatusMap, roomOverlays, scenarioWaitingRoom])

  const urgencyStyle = URGENCY_STYLES[summary.urgency] ?? URGENCY_STYLES.Stable

  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${urgencyStyle}`}
      title={`Queue urgency: ${summary.urgency}`}
    >
      <h3 className="text-xs font-bold text-amber-500/90 uppercase tracking-widest mb-3">
        Waiting Room
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Patients</span>
          <span className="text-lg font-bold text-amber-400">{summary.totalWaiting}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Avg Wait</span>
          <span className="text-lg font-bold text-white">{formatMins(summary.avgWaitMinutes)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Longest Wait</span>
          <span className="text-lg font-bold text-amber-300">{formatMins(summary.longestWaitMinutes)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Waiting for Provider</span>
          <span className="text-lg font-bold text-white">{summary.waitingForProvider}</span>
        </div>
        <div className="col-span-2 flex flex-col pt-1 border-t border-white/10">
          <span className="text-slate-400 text-xs">Next Available</span>
          <span className="font-semibold text-teal-400">
            {summary.nextAvailableRoom} in {formatMins(summary.nextAvailableInMinutes)}
          </span>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-slate-400">Urgency</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded ${
            summary.urgency === 'Overflow'
              ? 'bg-red-500/30 text-red-300'
              : summary.urgency === 'Delayed'
                ? 'bg-orange-500/30 text-orange-300'
                : summary.urgency === 'Busy'
                  ? 'bg-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/30 text-emerald-300'
          }`}
        >
          {summary.urgency}
        </span>
      </div>
    </div>
  )
}
