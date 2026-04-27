export default function ParityExecutiveSummary({
  executiveSummary,
  topFollowUpMcos,
  mostCommonIssue,
}) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <h2 className="text-sm font-semibold text-slate-100 mb-3">Executive Summary</h2>
      <ul className="space-y-2 text-sm text-slate-300">
        {executiveSummary.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Top 3 MCOs Requiring Follow-Up</p>
          <div className="flex flex-wrap gap-2">
            {topFollowUpMcos.map((mco) => (
              <span key={mco} className="text-xs px-2 py-1 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/30">{mco}</span>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Most Common Compliance Issue</p>
          <p className="text-sm font-semibold text-rose-200">{mostCommonIssue}</p>
        </div>
      </div>
    </section>
  )
}
