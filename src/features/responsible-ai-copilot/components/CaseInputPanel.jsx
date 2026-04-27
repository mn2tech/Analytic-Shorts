const STARTER_QUERIES = [
  'A customer reported an unauthorized transfer to a new payee and cannot log in. What is the next action plan?',
  'How should operations respond to a card-not-present velocity spike across multiple states?',
  'We received a complaint about suspicious ATM withdrawals. What evidence should be gathered first?',
]

export default function CaseInputPanel({
  query,
  onQueryChange,
  onSubmit,
  loading,
}) {
  return (
    <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Case Input</h2>
        <span className="text-xs text-slate-400">Banking / Fraud / Customer Ops</span>
      </div>
      <textarea
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Enter an operations question..."
        className="w-full min-h-[180px] rounded-xl border border-slate-600 bg-slate-950 text-slate-100 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
      />
      <button
        onClick={onSubmit}
        disabled={loading || !query.trim()}
        className="mt-4 w-full rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? 'Running Copilot...' : 'Run Responsible AI Copilot'}
      </button>

      <div className="mt-5">
        <p className="text-xs font-semibold text-slate-400 mb-2">Starter Scenarios</p>
        <div className="space-y-2">
          {STARTER_QUERIES.map((sample) => (
            <button
              key={sample}
              onClick={() => onQueryChange(sample)}
              className="w-full text-left text-xs text-slate-300 bg-slate-800/70 hover:bg-slate-700 rounded-lg px-3 py-2 transition"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
