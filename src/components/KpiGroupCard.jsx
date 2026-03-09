/**
 * KpiGroupCard - Reusable KPI group for hospital command-center dashboards.
 * Displays a titled card with stacked metrics.
 * @param {object} metric - { label, value, filterKey?, valueColor? }
 */
export default function KpiGroupCard({ title, metrics = [], onMetricClick, activeFilter }) {
  return (
    <div
      className="rounded-[10px] bg-white p-4 shadow-md min-w-[220px] flex-shrink-0 text-slate-900"
      style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)' }}
    >
      <div
        className="font-bold text-xs tracking-wider uppercase mb-2"
        style={{ color: '#666', letterSpacing: '1px' }}
      >
        {title}
      </div>
      <div
        className="mb-3"
        style={{ height: 1, background: '#e5e5e5' }}
      />
      <div className="space-y-2">
        {metrics.map(({ label, value, filterKey, valueColor }, i) => {
          const isClickable = filterKey != null && onMetricClick
          const isActive = activeFilter === filterKey
          const valueStyle = {
            color: valueColor ?? (isActive ? '#3b82f6' : '#1e293b'),
            fontWeight: 700,
            fontSize: 20,
          }
          const content = (
            <div key={i} className="flex justify-between items-baseline gap-4">
              <span className="text-xs" style={{ color: '#777' }}>
                {label}
              </span>
              <span style={valueStyle}>
                {value ?? '—'}
              </span>
            </div>
          )
          if (isClickable) {
            return (
              <button
                key={i}
                type="button"
                onClick={() => onMetricClick(isActive ? null : filterKey)}
                className={`w-full text-left rounded px-2 py-1 -mx-2 -my-0.5 transition-colors ${
                  isActive ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                }`}
                title={filterKey ? `Filter map by ${label}` : undefined}
              >
                {content}
              </button>
            )
          }
          return <div key={i}>{content}</div>
        })}
      </div>
    </div>
  )
}
