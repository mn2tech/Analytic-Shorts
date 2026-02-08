/**
 * Chart type selector with icons for Studio / AI Visual Builder.
 * Clicking an icon appends that chart type to the prompt.
 */

const CHART_TYPES = [
  {
    id: 'line',
    label: 'Line chart',
    prompt: 'Add a line chart (trend over time).',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    )
  },
  {
    id: 'bar',
    label: 'Bar chart',
    prompt: 'Add a bar chart by category (top 10).',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <rect x="3" y="12" width="4" height="8" rx="1" />
        <rect x="10" y="8" width="4" height="12" rx="1" />
        <rect x="17" y="4" width="4" height="16" rx="1" />
      </svg>
    )
  },
  {
    id: 'pie',
    label: 'Pie chart',
    prompt: 'Add a pie chart (breakdown by category).',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 2v10h10A10 10 0 0 0 12 2z" opacity="0.85" />
        <path d="M12 12V2a10 10 0 0 1 0 20V12z" opacity="0.5" />
      </svg>
    )
  },
  {
    id: 'table',
    label: 'Table',
    prompt: 'Add a table of top rows.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    )
  },
  {
    id: 'kpi',
    label: 'KPI',
    prompt: 'Add KPI tiles (sum/avg/count).',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="5" y="9" width="14" height="10" rx="1" />
        <path d="M8 9V6a2 2 0 012-2h4a2 2 0 012 2v3" />
      </svg>
    )
  }
]

export default function ChartTypeIcons({ onSelect, disabled }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-500">Quick add chart</span>
      <div className="flex flex-wrap gap-2">
        {CHART_TYPES.map(({ id, label, prompt, icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={label}
          >
            <span className="text-gray-500 hover:text-inherit">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export { CHART_TYPES }
