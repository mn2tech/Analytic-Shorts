/**
 * Filter type quick-add icons for Studio / AI Visual Builder.
 * Clicking an icon appends that filter type to the prompt.
 */

const FILTER_TYPES = [
  {
    id: 'date_slider',
    label: 'Date slider',
    prompt: 'Add a date range filter (slider).',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    )
  },
  {
    id: 'dropdown',
    label: 'Dropdown filter',
    prompt: 'Add a dropdown filter by category.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M6 9l6 6 6-6" />
        <line x1="6" y1="3" x2="18" y2="3" />
        <line x1="6" y1="7" x2="18" y2="7" />
      </svg>
    )
  },
  {
    id: 'number_range',
    label: 'Number range',
    prompt: 'Add a number range filter (min–max).',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <line x1="4" y1="12" x2="20" y2="12" />
        <circle cx="8" cy="12" r="2" fill="currentColor" />
        <circle cx="16" cy="12" r="2" fill="currentColor" />
      </svg>
    )
  }
]

export default function FilterTypeIcons({ onSelect, disabled }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-gray-500">Quick add filter</span>
      <div className="flex flex-wrap gap-2">
        {FILTER_TYPES.map(({ id, label, prompt, icon }) => (
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

export { FILTER_TYPES }
