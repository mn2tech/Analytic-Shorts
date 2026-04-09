import { useMemo, useState } from 'react'

const FILTERS = ['All Alerts', 'High Risk', 'Sepsis Watch', 'Staffing Related', 'Escalation Likely']

function severityBadge(severity) {
  if (severity === 'red') return 'bg-red-500/20 text-red-200 border-red-400/40'
  if (severity === 'orange') return 'bg-orange-500/20 text-orange-200 border-orange-400/40'
  if (severity === 'yellow') return 'bg-amber-500/20 text-amber-200 border-amber-400/40'
  return 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
}

export default function DeteriorationAlertsPanel({ alerts = [] }) {
  const [filter, setFilter] = useState('All Alerts')
  const filtered = useMemo(() => {
    if (filter === 'All Alerts') return alerts
    return alerts.filter((a) => a.type === filter || (filter === 'High Risk' && a.severity === 'red'))
  }, [alerts, filter])

  return (
    <div className="rounded-xl border border-white/10 bg-slate-800/70 p-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-semibold">Early Warning / Deterioration Alerts</p>
        <span className="text-xs text-slate-400">{filtered.length} active</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`px-2 py-1 rounded text-[11px] border ${
              filter === option
                ? 'border-cyan-300/60 bg-cyan-500/20 text-cyan-100'
                : 'border-white/10 bg-slate-700/60 text-slate-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
        {filtered.map((alert) => (
          <div key={alert.id} className="rounded-lg border border-white/10 bg-slate-900/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${severityBadge(alert.severity)}`}>
                {alert.severity}
              </span>
              <span className="text-[11px] text-slate-400">{alert.type}</span>
            </div>
            <p className="text-xs mt-1">{alert.patientId} • {alert.roomId} • {alert.department}</p>
            <p className="text-[11px] text-slate-300 mt-1">{(alert.reasons || []).join(' • ') || 'Clinical reassessment suggested'}</p>
            <p className="text-[11px] text-slate-400 mt-1">Risk {alert.riskScore} • Updated {alert.minsSinceClinicalUpdate}m ago</p>
            <p className="text-[11px] text-cyan-200 mt-1">{alert.recommendedAction}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
