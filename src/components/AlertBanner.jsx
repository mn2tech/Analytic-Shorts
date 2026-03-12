/**
 * Operational Alert Banner - Rotates/stacks active alerts.
 * Severity: Info | Warning | Critical. Click to filter/focus department.
 */
import { useMemo, useState, useEffect } from 'react'
import {
  patientMovements,
  getPatientLocationAtTime,
  getWaitingRoomMetricsAtTime,
} from '../data/patientMovements'
import { INFRASTRUCTURE_ROOM_IDS, NON_PATIENT_ROOM_TYPES } from '../config/hospitalBedData'
import { computeAllDepartmentPressures } from '../utils/zonePressure'

function parseTime(t) {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export default function AlertBanner({
  selectedTime,
  roomOverlays = [],
  roomStatusMap = {},
  roomIdToUnit = new Map(),
  onAlertClick,
  highlightAlerts = false,
  scenarioAlerts = null,
  erOccupancyPrediction = null,
}) {
  const [rotatingIndex, setRotatingIndex] = useState(0)

  const alerts = useMemo(() => {
    // Calculate ER utilization for percentage display (used for both scenario and computed alerts)
    const erRooms = roomOverlays.filter(
      (r) =>
        roomIdToUnit.get(r.id) === 'ER' &&
        !INFRASTRUCTURE_ROOM_IDS.has(r.id) &&
        !NON_PATIENT_ROOM_TYPES.has(r.type)
    )
    let erOccupied = 0
    erRooms.forEach((r) => {
      const s = roomStatusMap[r.id]?.status
      if (s === 'occupied' || s === 'reserved') erOccupied++
    })
    const erUtilizationPct = erRooms.length > 0 ? Math.round((erOccupied / erRooms.length) * 100) : 0
    
    // Use scenario alerts if provided, otherwise compute from data
    if (scenarioAlerts && Array.isArray(scenarioAlerts)) {
      // Add percentage to ER-related scenario alerts
      return scenarioAlerts.map((alert) => {
        if (alert.filterUnit === 'ER' && (alert.msg.includes('ER') || alert.msg.includes('capacity') || alert.msg.includes('Pressure'))) {
          return {
            ...alert,
            msg: `${alert.msg} (${erUtilizationPct}%)`,
          }
        }
        return alert
      })
    }
    
    const list = []
    const time = selectedTime ?? '14:00'
    const sel = parseTime(time)

    const wrMetrics = getWaitingRoomMetricsAtTime(time)
    if (wrMetrics.waitingCount >= 8) {
      list.push({
        id: 'wr-congestion',
        msg: 'Waiting room congestion',
        severity: 'warning',
        filterUnit: 'WAITING',
      })
    }
    if (wrMetrics.maxWaitMins >= 60 && wrMetrics.waitingCount > 0) {
      list.push({
        id: 'wr-delay',
        msg: 'Excessive waiting room delay (>60 min)',
        severity: 'critical',
        filterUnit: 'WAITING',
      })
    }

    // ER near capacity (use pre-calculated erUtilizationPct)
    if (erRooms.length > 0 && erUtilizationPct >= 90) {
      list.push({
        id: 'er-capacity',
        msg: `ER near capacity (${erUtilizationPct}%)`,
        severity: 'critical',
        filterUnit: 'ER',
      })
    }

    // Waiting for provider
    const waitingProviderCount = erRooms.filter(
      (r) => roomStatusMap[r.id]?.status === 'occupied' && !roomStatusMap[r.id]?.provider_seen_time
    ).length
    if (waitingProviderCount >= 1) {
      list.push({
        id: 'waiting-provider',
        msg: `${waitingProviderCount} waiting for provider`,
        severity: waitingProviderCount >= 4 ? 'critical' : 'warning',
        filterUnit: 'ER',
      })
    }

    // Dirty rooms
    const dirtyCount = Object.values(roomStatusMap).filter((r) => r?.status === 'cleaning').length
    if (dirtyCount >= 2) {
      list.push({
        id: 'dirty-rooms',
        msg: `${dirtyCount} dirty rooms delaying intake`,
        severity: dirtyCount >= 4 ? 'critical' : 'warning',
        filterUnit: null,
        filterStatus: 'cleaning',
      })
    }

    // ICU critical
    const icuRooms = roomOverlays.filter(
      (r) => roomIdToUnit.get(r.id) === 'ICU' && !INFRASTRUCTURE_ROOM_IDS.has(r.id)
    )
    let icuAvailable = 0
    icuRooms.forEach((r) => {
      if (roomStatusMap[r.id]?.status === 'available') icuAvailable++
    })
    if (icuRooms.length > 0 && icuAvailable === 0) {
      list.push({
        id: 'icu-full',
        msg: 'ICU critical load',
        severity: 'critical',
        filterUnit: 'ICU',
      })
    }

    // D2P above target
    const roomList = Object.values(roomStatusMap).filter(Boolean)
    const deptPressures = computeAllDepartmentPressures(roomList, roomIdToUnit)
    if (deptPressures.ER?.pressureLevel === 'high' || deptPressures.ER?.pressureLevel === 'critical') {
      list.push({
        id: 'er-pressure',
        msg: 'Door-to-provider above target',
        severity: 'warning',
        filterUnit: 'ER',
      })
    }

    // ER occupancy prediction alert
    if (erOccupancyPrediction && !selectedTime) {
      const { prediction } = erOccupancyPrediction
      if (prediction.willReach95 && prediction.minutesTo95 !== null && prediction.minutesTo95 < 60) {
        list.push({
          id: 'er-prediction-95',
          msg: `⚠ ER occupancy predicted to reach 95% in ${prediction.minutesTo95} minutes`,
          severity: 'warning',
          filterUnit: 'ER',
        })
      }
    }

    return list
  }, [selectedTime, roomOverlays, roomStatusMap, roomIdToUnit, erOccupancyPrediction])

  if (alerts.length === 0) return null

  useEffect(() => {
    if (alerts.length <= 3) return
    const id = setInterval(() => setRotatingIndex((i) => i + 1), 4000)
    return () => clearInterval(id)
  }, [alerts.length])

  const displayAlerts = alerts.length <= 3 ? alerts : [alerts[rotatingIndex % alerts.length]]

  const severityStyles = {
    info: 'border-slate-500/40 bg-slate-700/40 text-slate-300',
    warning: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
    critical: 'border-red-500/50 bg-red-500/20 text-red-200',
  }

  return (
    <div
      className={`rounded-lg border px-4 py-2.5 flex flex-wrap items-center gap-3 transition-colors ${
        highlightAlerts ? 'border-amber-500/70 bg-amber-500/20' : 'border-amber-500/30 bg-amber-500/10'
      }`}
    >
      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest shrink-0">
        Alerts
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {(alerts.length <= 3 ? alerts : displayAlerts).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onAlertClick?.({ filterUnit: a.filterUnit, filterStatus: a.filterStatus })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-90 ${
              severityStyles[a.severity] ?? severityStyles.warning
            } ${onAlertClick ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <span>{a.severity === 'critical' ? '🔴' : a.severity === 'warning' ? '⚠' : 'ℹ'}</span>
            <span>{a.msg}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
