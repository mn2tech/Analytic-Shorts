/**
 * Command Center Summary - Executive-level overview card.
 * Census, bottleneck, next room, most pressured unit, incoming demand.
 */
import { useMemo } from 'react'
import { computeRoomMetrics } from '../config/hospitalBedData'
import { computeAllDepartmentPressures, PRESSURE_LEVELS } from '../utils/zonePressure'
import {
  getWaitingRoomSummaryAtTime,
  getInboundArrivalsAtTime,
} from '../data/hospitalDemoData'

export default function CommandCenterSummary({
  rooms,
  roomIdToUnit,
  selectedTime,
  roomStatusMap = {},
  roomOverlays = [],
}) {
  const summary = useMemo(() => {
    const metrics = computeRoomMetrics(rooms, { roomIdToUnit })
    const roomList = Object.values(roomStatusMap).filter(Boolean)
    const deptPressures = computeAllDepartmentPressures(roomList, roomIdToUnit)
    const wrSummary = getWaitingRoomSummaryAtTime(selectedTime, roomStatusMap, roomOverlays)
    const inbound = getInboundArrivalsAtTime(selectedTime)

    let bottleneck = 'None'
    if (wrSummary.totalWaiting >= 10) bottleneck = 'Waiting room'
    else if (metrics.waitingForProvider >= 4) bottleneck = 'Waiting provider'
    else if (metrics.cleaning >= 3) bottleneck = 'Room turnover'
    else if (deptPressures.ER?.pressureLevel === 'critical') bottleneck = 'ER capacity'
    else if (deptPressures.ICU?.pressureLevel === 'critical') bottleneck = 'ICU capacity'

    let mostPressured = 'None'
    let maxScore = 0
    ;['ER', 'General Ward', 'OR', 'ICU'].forEach((u) => {
      const s = deptPressures[u]
      if (s?.pressureScore > maxScore && s.pressureLevel !== 'normal') {
        maxScore = s.pressureScore
        mostPressured = u === 'General Ward' ? 'GW' : u
      }
    })
    if (mostPressured === 'None' && deptPressures.WAITING?.pressureScore > 0.3) {
      mostPressured = 'WR'
    }

    return {
      totalCensus: metrics.occupied ?? 0,
      bottleneck,
      nextRoom: wrSummary.nextAvailableRoom,
      nextRoomMins: wrSummary.nextAvailableInMinutes,
      pressureUnit: mostPressured,
      incomingPatients: inbound.estimatedPatients,
    }
  }, [rooms, roomIdToUnit, selectedTime, roomStatusMap, roomOverlays])

  return (
    <div className="rounded-lg border border-white/10 bg-slate-800/60 px-4 py-3">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
        Command Center Summary
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Total Census</span>
          <span className="font-bold text-white">{summary.totalCensus}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Bottleneck</span>
          <span className="font-semibold text-amber-400">{summary.bottleneck}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Next Room</span>
          <span className="font-semibold text-teal-400">
            {summary.nextRoom} in {summary.nextRoomMins}m
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs">Pressure</span>
          <span className="font-semibold text-orange-400">{summary.pressureUnit}</span>
        </div>
        <div className="col-span-2 flex flex-col">
          <span className="text-slate-400 text-xs">Incoming</span>
          <span className="font-semibold text-cyan-400">{summary.incomingPatients} patients</span>
        </div>
      </div>
    </div>
  )
}
