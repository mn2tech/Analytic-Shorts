const OPTIONS = [
  { value: 'operational', label: 'Operational View' },
  { value: 'clinical', label: 'Clinical Intelligence View' },
  { value: 'combined', label: 'Combined View' },
]

export default function ClinicalOverlayToggle({ mode = 'combined', onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/70 p-1">
      {OPTIONS.map((option) => {
        const active = option.value === mode
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              active ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-300/50' : 'text-slate-300 hover:bg-slate-700/80'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
