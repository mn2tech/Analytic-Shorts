import React from 'react'

function Card({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-700'
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  )
}

export default function RiskSummaryCards({ summary }) {
  if (!summary) return null
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <Card label="Total Records" value={summary.total_records ?? 0} />
      <Card label="High Risk" value={summary.high_risk_count ?? 0} tone="danger" />
      <Card label="Medium Risk" value={summary.medium_risk_count ?? 0} tone="warning" />
      <Card label="Low Risk" value={summary.low_risk_count ?? 0} tone="success" />
      <Card label="Anomalies" value={summary.anomaly_count ?? 0} />
      <Card label="Mode" value={summary.analysis_mode || '—'} />
    </div>
  )
}
