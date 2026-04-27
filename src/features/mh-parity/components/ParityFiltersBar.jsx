export default function ParityFiltersBar({ filters, options, onChange, onReset }) {
  const selectClassName = 'rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm px-3 py-2 w-full'

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-100">Filter Controls</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs px-3 py-1 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          Reset Filters
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <label className="text-xs text-slate-400">
          MCO
          <select className={selectClassName} value={filters.mco} onChange={(e) => onChange('mco', e.target.value)}>
            {options.mco.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Compliance Status
          <select className={selectClassName} value={filters.compliance} onChange={(e) => onChange('compliance', e.target.value)}>
            {options.compliance.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Submission Status
          <select className={selectClassName} value={filters.submission} onChange={(e) => onChange('submission', e.target.value)}>
            {options.submission.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Issue Type
          <select className={selectClassName} value={filters.issueType} onChange={(e) => onChange('issueType', e.target.value)}>
            {options.issueType.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">
          Reporting Period
          <select className={selectClassName} value={filters.reportingPeriod} onChange={(e) => onChange('reportingPeriod', e.target.value)}>
            {options.reportingPeriod.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </div>
    </section>
  )
}
