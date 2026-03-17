/**
 * SmartHoverCard - Hover card with dynamic positioning to avoid blocking room/map.
 * Preferred: top-right, top-left, bottom-right, bottom-left of hovered area.
 * Arrow points toward room. Optional: predicted discharge, turnover risk, next action.
 */
import { useMemo, useRef, useEffect, useState } from 'react'
import { STATUS_LABELS } from '../config/hospitalBedData'
import { getRoomPressureLevel, PRESSURE_LABELS } from '../utils/losPressure'

const CARD_WIDTH = 280
const CARD_HEIGHT_EST = 320
const OFFSET = 12
const ARROW_SIZE = 8

function getNextAction(roomData, unit) {
  if (!roomData) return null
  const status = roomData.status
  if (status === 'cleaning') return 'Prepare cleaning'
  if (unit === 'ER' && status === 'occupied' && !roomData.provider_seen_time) return 'Await provider'
  if (status === 'occupied' && (roomData.predictedInMinutes ?? roomData.predicted_in_minutes) != null) return 'Ready for transfer'
  if (roomData.predictedInMinutes != null || roomData.predicted_in_minutes != null) return 'Monitor delay'
  return null
}

function formatPredictionMins(mins) {
  if (mins >= 60) return `${Math.floor(mins / 60)}h`
  return `${mins}m`
}

export default function SmartHoverCard({
  roomData,
  tooltipPos,
  containerRef,
  showPressureLabel = true,
  unit,
  patientFlow,
  departmentPressure,
}) {
  const cardRef = useRef(null)
  const [measuredHeight, setMeasuredHeight] = useState(CARD_HEIGHT_EST)
  const [position, setPosition] = useState({ left: 0, top: 0, placement: 'top-right', arrow: null })

  useEffect(() => {
    if (!cardRef.current) return
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height ?? CARD_HEIGHT_EST
      setMeasuredHeight(h)
    })
    ro.observe(cardRef.current)
    return () => ro.disconnect()
  }, [roomData])

  useEffect(() => {
    const x = tooltipPos?.x ?? 0
    const y = tooltipPos?.y ?? 0
    const container = containerRef?.current
    if (!container) {
      setPosition({ left: x + OFFSET, top: y - 8, placement: 'top-right', arrow: null })
      return
    }
    const rect = container.getBoundingClientRect()
    const cardW = CARD_WIDTH
    const cardH = measuredHeight
    const pad = 8

    const placements = [
      { name: 'top-right', left: x + OFFSET, top: y - cardH - OFFSET, arrow: 'bottom-left' },
      { name: 'top-left', left: x - cardW - OFFSET, top: y - cardH - OFFSET, arrow: 'bottom-right' },
      { name: 'bottom-right', left: x + OFFSET, top: y + OFFSET, arrow: 'top-left' },
      { name: 'bottom-left', left: x - cardW - OFFSET, top: y + OFFSET, arrow: 'top-right' },
    ]

    for (const p of placements) {
      const inBounds =
        p.left >= rect.left + pad &&
        p.left + cardW <= rect.right - pad &&
        p.top >= rect.top + pad &&
        p.top + cardH <= rect.bottom - pad
      if (inBounds) {
        setPosition({ left: p.left, top: p.top, placement: p.name, arrow: p.arrow })
        return
      }
    }
    setPosition({
      left: Math.max(rect.left + pad, Math.min(rect.right - cardW - pad, x + OFFSET)),
      top: Math.max(rect.top + pad, Math.min(rect.bottom - cardH - pad, y - cardH / 2)),
      placement: 'auto',
      arrow: null,
    })
  }, [tooltipPos?.x, tooltipPos?.y, containerRef, measuredHeight])

  if (!roomData) return null

  const isWaitingSlot = unit === 'WAITING'
  const statusLabel = isWaitingSlot
    ? (patientFlow ? 'Waiting for ER room' : STATUS_LABELS[roomData.status] || roomData.status)
    : (STATUS_LABELS[roomData.status] || roomData.status)
  const waitingProvider = unit === 'ER' && roomData.status === 'occupied' && !roomData.provider_seen_time
  const admittedDisplay =
    roomData.admitted_at ??
    (roomData.admitted_at_iso
      ? new Date(roomData.admitted_at_iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : null)
  const { level: pressureLevel, losLabel } = getRoomPressureLevel(roomData)
  const pressureLabel = PRESSURE_LABELS[pressureLevel]
  const nextAction = getNextAction(roomData, unit)
  const turnoverRisk =
    roomData.status === 'cleaning' || roomData.status === 'occupied'
      ? roomData.turnoverRisk ?? (pressureLevel === 'critical' ? 'High' : pressureLevel === 'high' ? 'Medium' : null)
      : null
  const predMins = roomData.predictedInMinutes ?? roomData.predicted_in_minutes

  return (
    <div
      ref={cardRef}
      className="fixed z-50 pointer-events-none min-w-[220px] max-w-[280px] rounded-lg shadow-2xl overflow-hidden
        border border-white/20 bg-slate-900/95 backdrop-blur-sm text-white"
      style={{ left: position.left, top: position.top }}
    >
      {position.arrow && (
        <div
          className="absolute w-0 h-0"
          style={{
            borderWidth: 6,
            borderStyle: 'solid',
            borderColor: 'transparent',
            ...(position.arrow === 'bottom-left' && {
              left: 24,
              bottom: -10,
              borderTopColor: 'rgb(30 41 59)',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
            }),
            ...(position.arrow === 'bottom-right' && {
              right: 24,
              bottom: -10,
              borderTopColor: 'rgb(30 41 59)',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: 'transparent',
            }),
            ...(position.arrow === 'top-left' && {
              left: 24,
              top: -10,
              borderBottomColor: 'rgb(30 41 59)',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: 'transparent',
            }),
            ...(position.arrow === 'top-right' && {
              right: 24,
              top: -10,
              borderBottomColor: 'rgb(30 41 59)',
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: 'transparent',
            }),
          }}
        />
      )}
      <div className="px-4 py-2.5 bg-slate-800/90 border-b border-white/10">
        <span className="font-bold text-sm">Room: {roomData.room}</span>
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Patient ID</span>
          <span className="font-medium text-right">{roomData.patient_id || patientFlow?.patientId || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Triage Level</span>
          <span className="font-medium text-right">{roomData.triage_level != null ? `Level ${roomData.triage_level}` : '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Reason for Visit</span>
          <span className="font-medium text-right">{roomData.reason_for_visit || '—'}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Status</span>
          <span className="font-semibold">{statusLabel}</span>
        </div>
        {(roomData.waitingCount != null || roomData.waiting_count != null) && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Patients waiting</span>
            <span className="font-semibold text-amber-400">{roomData.waitingCount ?? roomData.waiting_count}</span>
          </div>
        )}
        {roomData.status !== 'reserved' && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">{isWaitingSlot ? 'Arrival' : 'Admitted'}</span>
            <span className="font-medium text-right">
              {(patientFlow?.arrivalTime ?? admittedDisplay) || '—'}
            </span>
          </div>
        )}
        {isWaitingSlot && patientFlow?.waitMins != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Current Wait</span>
            <span className="font-semibold text-amber-400">
              {patientFlow.waitMins < 60
                ? `${patientFlow.waitMins}m`
                : `${Math.floor(patientFlow.waitMins / 60)}h ${patientFlow.waitMins % 60}m`}
            </span>
          </div>
        )}
        {losLabel && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Length of Stay (LOS)</span>
            <span className="font-semibold text-cyan-400">{losLabel}</span>
          </div>
        )}
        {waitingProvider && (
          <div className="flex justify-between gap-4 items-center">
            <span className="text-slate-400">ER status</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/90 text-slate-900">
              Waiting Provider
            </span>
          </div>
        )}
        {predMins != null && (
          <div className="flex justify-between gap-4 items-center">
            <span className="text-slate-400">Predicted discharge</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/90 text-white border border-emerald-400/50">
              Avail ~{formatPredictionMins(predMins)}
            </span>
          </div>
        )}
        {turnoverRisk && (
          <div className="flex justify-between gap-4 items-center">
            <span className="text-slate-400">Turnover risk</span>
            <span className="text-xs font-semibold text-amber-400">{turnoverRisk}</span>
          </div>
        )}
        {departmentPressure && (
          <div className="flex justify-between gap-4 items-center">
            <span className="text-slate-400">Dept pressure</span>
            <span className="text-xs font-semibold text-orange-400">{departmentPressure}</span>
          </div>
        )}
        {patientFlow && (
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            {patientFlow.patientId && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Patient ID</span>
                <span className="font-medium">{patientFlow.patientId}</span>
              </div>
            )}
            {patientFlow.previous && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Previous</span>
                <span className="font-medium">{patientFlow.previous}</span>
              </div>
            )}
            {patientFlow.next && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Next</span>
                <span className="font-medium">
                  {patientFlow.next}
                  {patientFlow.nextEvent?.action === 'post_op_transfer'
                    ? ' (Reserved)'
                    : patientFlow.nextEvent?.action === 'roomed'
                      ? ' (Rooming)'
                      : ''}
                </span>
              </div>
            )}
            {patientFlow.nextTime && (
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">ETA</span>
                <span className="font-medium text-amber-400">~20 min</span>
              </div>
            )}
          </div>
        )}
        {nextAction && (
          <div className="flex justify-between gap-4 items-center pt-1 border-t border-white/10 mt-2">
            <span className="text-slate-400">Next action</span>
            <span className="text-xs font-semibold text-teal-400">{nextAction}</span>
          </div>
        )}
        {showPressureLabel && pressureLabel && (
          <div className="flex justify-between gap-4 items-center pt-1 border-t border-white/10 mt-2">
            <span className="text-slate-400">Pressure</span>
            <span
              className={`text-xs font-semibold ${
                pressureLevel === 'critical'
                  ? 'text-red-400'
                  : pressureLevel === 'high'
                    ? 'text-orange-400'
                    : 'text-amber-400'
              }`}
            >
              {pressureLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
