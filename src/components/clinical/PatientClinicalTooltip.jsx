import ClinicalRiskBadge from './ClinicalRiskBadge'
import RiskTrendMiniChart from './RiskTrendMiniChart'

function formatMinutes(mins) {
  if (mins == null) return '—'
  if (mins <= 0) return 'Due now'
  return `${mins} min`
}

export default function PatientClinicalTooltip({ roomData, clinicalPatient, tooltipPos, unit }) {
  if (!roomData) return null
  const x = tooltipPos?.x ?? 0
  const y = tooltipPos?.y ?? 0
  const statusLabel = roomData?.status || 'unknown'
  const isOccupied = statusLabel === 'occupied'

  return (
    <div
      className="fixed z-50 min-w-[280px] max-w-[360px] rounded-xl shadow-2xl overflow-hidden border border-white/20 bg-slate-900/95 text-white pointer-events-none"
      style={{ left: x + 14, top: y - 8 }}
    >
      <div className="px-3 py-2 border-b border-white/10 bg-slate-800/80">
        <p className="text-xs uppercase tracking-wide text-slate-400">Room {roomData.room}</p>
        <p className="text-sm font-semibold">{unit || 'Unit'} • {statusLabel}</p>
      </div>
      {!isOccupied || !clinicalPatient ? (
        <div className="px-3 py-2 text-xs text-slate-300">Operational details only (room currently not occupied).</div>
      ) : (
        <div className="px-3 py-2 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span>{clinicalPatient.patientId}</span>
            <ClinicalRiskBadge riskBand={clinicalPatient.riskBand} riskScore={clinicalPatient.riskScore} statusLabel={clinicalPatient.statusLabel} compact />
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            <span className="text-slate-400">Acuity</span><span>ESI {clinicalPatient.acuityLevel}</span>
            <span className="text-slate-400">Risk Trend</span><span>{clinicalPatient.riskTrend}</span>
            <span className="text-slate-400">EWS</span><span>{clinicalPatient.earlyWarningScore}</span>
            <span className="text-slate-400">Sepsis / Fall</span><span>{clinicalPatient.sepsisRisk} / {clinicalPatient.fallRisk}</span>
            <span className="text-slate-400">Oxygen</span><span>{clinicalPatient.oxygenNeed}</span>
            <span className="text-slate-400">Care Intensity</span><span>{clinicalPatient.careIntensityLevel}</span>
            <span className="text-slate-400">Meds Due</span><span>{formatMinutes(clinicalPatient.medsDueInMinutes)}</span>
            <span className="text-slate-400">Pending Tasks</span><span>{clinicalPatient.pendingTasksCount} / Labs {clinicalPatient.pendingLabsCount}</span>
            <span className="text-slate-400">Assigned</span><span>{clinicalPatient.nurseAssigned} • {clinicalPatient.providerAssigned}</span>
          </div>
          <p className="text-[11px] text-cyan-100">Why flagged: {(clinicalPatient.explanation || []).join(' • ') || 'No active risk drivers'}</p>
          {clinicalPatient.expectedEscalationProbabilityNext60Min >= 0.6 && (
            <p className="text-[11px] text-red-200 font-semibold">Escalation Likely in 60 min</p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-slate-400 mb-1">Risk Trend</p>
              <RiskTrendMiniChart values={clinicalPatient.riskSeries || []} tone="risk" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 mb-1">Early Warning</p>
              <RiskTrendMiniChart values={clinicalPatient.earlyWarningSeries || []} tone="ews" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
