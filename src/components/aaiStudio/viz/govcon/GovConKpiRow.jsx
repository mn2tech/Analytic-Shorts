/**
 * GovCon Executive: 5 KPI cards – Total Opportunities, Due in Next 10 Days (risk badge),
 * Avg Days to Due, Top Agency share, New vs Prior Period (%).
 */
import KPIStatCard from '../KPIStatCard'

function formatNum(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const n = Number(v)
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return Number.isInteger(n) ? n.toLocaleString() : `${Math.round(n * 100) / 100}`
}

export default function GovConKpiRow({ block }) {
  const p = block?.payload || {}
  const rowCount = p.rowCount ?? 0
  const dueInNext10DaysCount = p.dueInNext10DaysCount
  const avgDaysToDue = p.avgDaysToDue
  const topAgencyKey = p.topAgencyKey
  const topAgencyShare = p.topAgencyShare
  const newVsPriorPct = p.newVsPriorPct
  const exec = p.executiveKpis

  const cards = [
    {
      label: 'Total Opportunities',
      value: formatNum(rowCount),
      subtitle: null,
      delta: null,
      risk: false,
    },
    {
      label: 'Due in Next 10 Days',
      value: dueInNext10DaysCount != null ? formatNum(dueInNext10DaysCount) : 'N/A',
      subtitle: null,
      delta: null,
      risk: dueInNext10DaysCount != null && dueInNext10DaysCount > 0,
    },
    {
      label: 'Avg Days to Due',
      value: avgDaysToDue != null ? `${avgDaysToDue} days` : 'N/A',
      subtitle: null,
      delta: null,
      risk: false,
    },
    {
      label: 'Top Agency',
      value: topAgencyKey || '—',
      subtitle: topAgencyShare != null ? `${(topAgencyShare * 100).toFixed(1)}% of total` : null,
      delta: null,
      risk: false,
    },
    {
      label: 'New vs Prior Period',
      value: newVsPriorPct != null ? `${newVsPriorPct >= 0 ? '+' : ''}${(newVsPriorPct * 100).toFixed(1)}%` : (exec?.change?.pct != null ? `${(exec.change.pct * 100).toFixed(1)}%` : '—'),
      subtitle: null,
      delta: newVsPriorPct ?? exec?.change?.pct,
      risk: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c, i) => (
        <div
          key={c.label + i}
          className="relative p-4 rounded-xl shadow-sm"
          style={{
            background: 'var(--card)',
            border: `1px solid ${c.risk ? 'var(--warning)' : 'var(--border)'}`,
          }}
        >
          {c.risk && (
            <span
              className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--warning)', color: 'var(--card)' }}
            >
              Risk
            </span>
          )}
          <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            {c.label}
          </div>
          <div className="text-xl font-bold mt-1" style={{ color: 'var(--text)' }}>
            {c.value}
          </div>
          {c.subtitle && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {c.subtitle}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
