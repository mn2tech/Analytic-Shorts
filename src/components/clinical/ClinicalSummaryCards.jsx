export default function ClinicalSummaryCards({ summary, unitMetrics = [] }) {
  const cards = [
    { label: 'Total High-Risk Patients', value: summary?.totalHighRiskPatients ?? 0 },
    { label: 'Likely Escalate in 60 Min', value: summary?.likelyEscalations ?? 0 },
    { label: 'Units Under Staffing Pressure', value: summary?.unitsUnderStaffingPressure ?? 0 },
    { label: 'Open Deterioration Alerts', value: summary?.openDeteriorationAlerts ?? 0 },
    { label: 'Transfer Bottlenecks', value: summary?.transferBottlenecks ?? 0 },
    {
      label: 'Avg Acuity by Unit',
      value: unitMetrics.length
        ? unitMetrics.map((u) => `${u.unitName} ${u.avgAcuity}`).join(' • ')
        : '—',
    },
  ]
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-cyan-500/20 bg-slate-800/70 px-3 py-2">
          <p className="text-[11px] text-slate-400">{card.label}</p>
          <p className="text-sm font-semibold text-cyan-100 mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
