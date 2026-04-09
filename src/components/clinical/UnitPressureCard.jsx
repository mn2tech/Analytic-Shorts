import RiskTrendMiniChart from './RiskTrendMiniChart'

function badgeClass(unit) {
  const warning = unit.workloadIndex > 75 || unit.staffingGap < 0 || unit.acuityStaffMismatch
  return warning ? 'border-red-500/50 bg-red-500/10' : 'border-emerald-500/30 bg-emerald-500/10'
}

export default function UnitPressureCard({ unit }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${badgeClass(unit)}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-sm">{unit.unitName}</p>
        <p className="text-xs text-slate-300">Occupancy {unit.occupiedBeds}/{unit.staffedBeds}</p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
        <p>Avg Acuity: <span className="text-cyan-300">{unit.avgAcuity}</span></p>
        <p>Staffing Gap: <span className={unit.staffingGap < 0 ? 'text-red-300' : 'text-emerald-300'}>{unit.staffingGap}</span></p>
        <p>Workload: <span className={unit.workloadIndex > 75 ? 'text-red-300' : 'text-slate-200'}>{unit.workloadIndex}</span></p>
        <p>High-Risk: <span className="text-orange-300">{unit.highRiskPatientCount}</span></p>
      </div>
      <div className="mt-2">
        <RiskTrendMiniChart values={unit.workloadSeries || []} tone="workload" />
      </div>
      {unit.alertReasons?.length > 0 && (
        <p className="text-[11px] text-amber-300 mt-1">{unit.alertReasons[0]}</p>
      )}
    </div>
  )
}
