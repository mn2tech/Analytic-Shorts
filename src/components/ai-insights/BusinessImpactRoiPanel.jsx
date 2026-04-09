import React, { useMemo, useState } from 'react'

const DEFAULT_AVG_RECOVERY = 10_000
const HOURS_PER_RECORD = 3
const COST_PER_HOUR = 75

function formatCurrency(n) {
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatHours(n) {
  if (!Number.isFinite(n)) return '—'
  return `${Math.round(n).toLocaleString()} hrs`
}

export default function BusinessImpactRoiPanel({ summary }) {
  const [avgRecovery, setAvgRecovery] = useState(DEFAULT_AVG_RECOVERY)

  const metrics = useMemo(() => {
    const highRisk = Number(summary?.high_risk_count ?? 0)
    const totalRecords = Number(summary?.total_records ?? 0)
    const recovery = Math.max(0, avgRecovery)
    const taxRecovery = highRisk * recovery
    const auditHours = totalRecords * HOURS_PER_RECORD
    const costSavings = auditHours * COST_PER_HOUR
    return {
      estimatedTaxRecovery: taxRecovery,
      estimatedAuditHoursSaved: auditHours,
      estimatedCostSavings: costSavings,
    }
  }, [summary, avgRecovery])

  const tooltipText =
    'This is an estimated ROI based on detected risk and audit optimization.'

  return (
    <div
      className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-slate-50 shadow-md ring-1 ring-indigo-100"
      role="region"
      aria-label="Business impact and estimated ROI"
    >
      <div className="p-5 border-b border-indigo-100/80 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">Business Impact</h3>
          <span
            className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-500"
            title={tooltipText}
            aria-label={tooltipText}
          >
            ?
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor="ai-insights-avg-recovery" className="text-slate-600 whitespace-nowrap">
            Avg. recovery / high-risk ($)
          </label>
          <input
            id="ai-insights-avg-recovery"
            type="number"
            min={0}
            step={100}
            value={avgRecovery}
            onChange={(e) => setAvgRecovery(Number(e.target.value) || 0)}
            className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-medium text-slate-900"
          />
        </div>
      </div>
      <p className="px-5 pt-2 pb-3 text-xs text-slate-500" title={tooltipText}>
        {tooltipText}
      </p>
      <div className="grid gap-4 p-5 pt-0 sm:grid-cols-3">
        <div className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated tax recovery</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatCurrency(metrics.estimatedTaxRecovery)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            High-risk count × ${avgRecovery.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimated audit hours saved</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {formatHours(metrics.estimatedAuditHoursSaved)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Total records × {HOURS_PER_RECORD} hours
          </p>
        </div>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/80 p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-800">Estimated cost savings</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-950 tabular-nums">
            {formatCurrency(metrics.estimatedCostSavings)}
          </p>
          <p className="mt-1 text-xs text-indigo-700/90">
            Audit hours × ${COST_PER_HOUR}/hr
          </p>
        </div>
      </div>
    </div>
  )
}
