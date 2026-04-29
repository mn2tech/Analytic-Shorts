/**
 * Operational Alerts - Threshold-based hospital alerts.
 * Updates with timeline selectedTime.
 */
import { useMemo } from 'react'
import { patientMovements, getPatientLocationAtTime, getWaitingRoomMetricsAtTime } from '../data/patientMovements'
import { INFRASTRUCTURE_ROOM_IDS, NON_PATIENT_ROOM_TYPES } from '../config/hospitalBedData'
import { ER_DELAY_REASON_DEFS, mapFlowStatusToDelayReason, normalizeFlowStatus } from '../data/erDelayReasonMap'

function parseTime(t) {
  if (!t) return 0
  const [h, m] = String(t).split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

const WR_CONGESTION_THRESHOLD = 8
const WR_MAX_WAIT_THRESHOLD_MIN = 60
const ER_DELAY_CAUSE_MIN_ROOMS = 2
const ER_DELAY_REASON_LABELS = Object.fromEntries(
  Object.entries(ER_DELAY_REASON_DEFS).map(([k, v]) => [k, v.label])
)

function deriveErDelayReasonSummary(erRooms = [], roomStatusMap = {}, { scenarioActive = false } = {}) {
  const counts = {
    waitingProvider: 0,
    boarding: 0,
    transfer: 0,
    results: 0,
    consult: 0,
    cleaning: 0,
    disposition: 0,
    staffing: 0,
    registration: 0,
    behaviorHealth: 0,
    operationalHold: 0,
  }

  erRooms.forEach((r) => {
    const data = roomStatusMap[r.id] || {}
    const flowStatus = normalizeFlowStatus(data.flow_status)
    const status = normalizeFlowStatus(data.status)
    const isOccupied = status === 'occupied'
    const explicitWaitingProvider = isOccupied && (data.waiting_for_provider === true || flowStatus.includes('waiting provider'))
    const inferredWaitingProvider = !scenarioActive && status === 'occupied' && !data.provider_seen_time
    const waitingProvider = explicitWaitingProvider || inferredWaitingProvider
    if (waitingProvider) {
      counts.waitingProvider += 1
      return
    }
    if (status === 'cleaning') {
      counts.cleaning += 1
      return
    }
    const mappedReason = mapFlowStatusToDelayReason(flowStatus)
    if (mappedReason && counts[mappedReason] != null) counts[mappedReason] += 1
  })

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  const breakdown = sorted
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      key,
      label: ER_DELAY_REASON_LABELS[key] || 'Unknown',
      count,
    }))
  const [topKey, topCount] = sorted[0] || []
  if (!topKey || !topCount || topCount < ER_DELAY_CAUSE_MIN_ROOMS) {
    return { breakdown }
  }
  const label = ER_DELAY_REASON_LABELS[topKey] || 'Unknown'
  const contributing = breakdown.length
  return { key: topKey, label, count: topCount, contributing, counts, breakdown }
}

export default function OperationalAlerts({
  selectedTime,
  roomOverlays = [],
  roomStatusMap = {},
  roomIdToUnit = new Map(),
  highlightAlerts = false,
  scenarioAlerts = null,
  erOccupancyPrediction = null,
}) {
  const { alerts, delayBreakdown } = useMemo(() => {
    // Calculate ER utilization for percentage display
    const erRooms = roomOverlays.filter(
      (r) => roomIdToUnit.get(r.id) === 'ER' && !INFRASTRUCTURE_ROOM_IDS.has(r.id) && !NON_PATIENT_ROOM_TYPES.has(r.type)
    )
    let erOccupied = 0
    erRooms.forEach((r) => {
      const s = roomStatusMap[r.id]?.status
      if (s === 'occupied' || s === 'reserved') erOccupied++
    })
    const erUtilizationPct = erRooms.length > 0 ? Math.round((erOccupied / erRooms.length) * 100) : 0
    const scenarioActive = Array.isArray(scenarioAlerts)
    const erDelaySummary = deriveErDelayReasonSummary(erRooms, roomStatusMap, { scenarioActive })
    
    // Use scenario alerts if provided, otherwise compute from data
    if (scenarioAlerts && Array.isArray(scenarioAlerts)) {
      // Add percentage to ER-related scenario alerts
      const scenarioList = scenarioAlerts.map((alert) => {
        if (alert.filterUnit === 'ER' && (alert.msg.includes('ER') || alert.msg.includes('capacity') || alert.msg.includes('Pressure'))) {
          return {
            ...alert,
            msg: `${alert.msg} (${erUtilizationPct}%)`,
          }
        }
        return alert
      })
      if (erDelaySummary?.count >= ER_DELAY_CAUSE_MIN_ROOMS) {
        scenarioList.push({
          id: 'er-delay-cause',
          msg: `Overall delay cause: ${erDelaySummary.label} (${erDelaySummary.count} room${erDelaySummary.count === 1 ? '' : 's'})`,
          severity: erDelaySummary.count >= 4 ? 'warning' : 'info',
          filterUnit: 'ER',
        })
      }
      return {
        alerts: scenarioList,
        delayBreakdown: erDelaySummary?.breakdown || [],
      }
    }
    
    const list = []
    const time = selectedTime ?? '14:00'
    const sel = parseTime(time)

    const wrMetrics = getWaitingRoomMetricsAtTime(time)
    if (wrMetrics.waitingCount >= WR_CONGESTION_THRESHOLD) {
      list.push({ id: 'wr-congestion', msg: 'Waiting room congestion', severity: 'warning' })
    }
    if (wrMetrics.maxWaitMins >= WR_MAX_WAIT_THRESHOLD_MIN && wrMetrics.waitingCount > 0) {
      list.push({ id: 'wr-delay', msg: 'Excessive waiting room delay (>60 min)', severity: 'critical' })
    }
    for (const p of patientMovements) {
      const loc = getPatientLocationAtTime(p, time)
      if (loc?.department === 'WAITING' && loc.lastEvent?.time) {
        const waitMins = sel - parseTime(loc.lastEvent.time)
        if (waitMins >= 45) {
          list.push({
            id: `wr-patient-${p.patientId}`,
            msg: `Patient ${p.patientId} waiting > 45 min for room`,
            severity: 'warning',
          })
          break
        }
      }
    }

    // Build occupancy from roomStatusMap (or roomStatusHistory when in timeline)
    // Reuse erRooms and erOccupied already calculated above
    const erTotal = erRooms.length
    const icuRooms = roomOverlays.filter(
      (r) => roomIdToUnit.get(r.id) === 'ICU' && !INFRASTRUCTURE_ROOM_IDS.has(r.id)
    )

    let icuAvailable = 0
    let icuTotal = 0
    icuRooms.forEach((r) => {
      icuTotal++
      const s = roomStatusMap[r.id]?.status
      if (s === 'available') icuAvailable++
    })

    // Rule 1: ER congestion > 90% (use pre-calculated erUtilizationPct)
    if (erTotal > 0 && erUtilizationPct >= 90) {
      list.push({ 
        id: 'er-capacity', 
        msg: `ER capacity above 90% (${erUtilizationPct}%)`, 
        severity: 'critical' 
      })
    }
    if (erDelaySummary?.count >= ER_DELAY_CAUSE_MIN_ROOMS) {
      list.push({
        id: 'er-delay-cause',
        msg: `Overall delay cause: ${erDelaySummary.label} (${erDelaySummary.count} room${erDelaySummary.count === 1 ? '' : 's'})`,
        severity: erDelaySummary.count >= 4 ? 'warning' : 'info',
        filterUnit: 'ER',
      })
    }

    // Rule: ER occupancy prediction - alert if predicted to reach 95% in < 60 minutes
    if (erOccupancyPrediction && !selectedTime) {
      const { prediction } = erOccupancyPrediction
      if (prediction.willReach95 && prediction.minutesTo95 !== null && prediction.minutesTo95 < 60) {
        list.push({
          id: 'er-prediction-95',
          msg: `ER occupancy predicted to reach 95% in ${prediction.minutesTo95} minutes`,
          severity: 'warning',
          filterUnit: 'ER',
        })
      }
    }

    // Rule 2: ICU full
    if (icuTotal > 0 && icuAvailable === 0) {
      list.push({ id: 'icu-full', msg: 'ICU beds full', severity: 'critical' })
    }

    // Rule 3: Patient ER LOS > 4 hours (240 min)
    for (const p of patientMovements) {
      const loc = getPatientLocationAtTime(p, time)
      if (loc?.department === 'ER' && loc.room) {
        const admitted = loc.lastEvent?.time
        if (admitted) {
          const los = sel - parseTime(admitted)
          if (los >= 240) {
            list.push({
              id: `er-wait-${p.patientId}`,
              msg: `Patient ${p.patientId} waiting > 4 hours in ER`,
              severity: 'warning',
            })
            break
          }
        }
      }
    }

    // Rule 4: Transfer delay > 2 hours (simplified: patient in GW/OR waiting for next step > 2h)
    for (const p of patientMovements) {
      const loc = getPatientLocationAtTime(p, time)
      if (!loc) continue
      if (loc.department === 'GW' && loc.nextEvent && loc.nextEvent.department === 'OR') {
        const waitStart = parseTime(loc.lastEvent?.time)
        const waitMins = sel - waitStart
        if (waitMins >= 120) {
          list.push({
            id: `transfer-delay-${p.patientId}`,
            msg: 'Transfer delay detected',
            severity: 'warning',
          })
          break
        }
      }
    }

    return {
      alerts: list,
      delayBreakdown: erDelaySummary?.breakdown || [],
    }
  }, [selectedTime, roomOverlays, roomStatusMap, roomIdToUnit, erOccupancyPrediction])

  if (alerts.length === 0 && delayBreakdown.length === 0) return null

  return (
    <div className={`rounded-2xl border px-4 py-3 space-y-2 bg-[#0b1728] text-[#e5f0ff] shadow-[0_0_10px_rgba(0,0,0,0.4)] transition-colors ${highlightAlerts ? 'border-amber-500/70 ring-2 ring-amber-500/30' : 'border-[#1e3a5f]'}`}>
      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Operational Alerts</h3>
      <ul className="space-y-1.5">
        {alerts.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm text-amber-200">
            <span className="text-amber-400">⚠</span>
            <span>{a.msg}</span>
          </li>
        ))}
      </ul>
      {delayBreakdown.length > 0 && (
        <div className="pt-2 border-t border-amber-500/20">
          <h4 className="text-[11px] font-semibold text-amber-300/90 uppercase tracking-wider mb-1.5">
            Delay Causes (Top 3)
          </h4>
          <ul className="space-y-1 text-xs text-amber-100/90">
            {delayBreakdown.slice(0, 3).map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3">
                <span>{item.label}</span>
                <span className="font-semibold text-amber-200">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
