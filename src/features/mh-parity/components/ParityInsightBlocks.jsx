export default function ParityInsightBlocks({ insightBlocks }) {
  const riskItems = insightBlocks.RiskRankingBlock.items || []
  const evidenceItems = insightBlocks.RecordEvidenceBlock.items || []

  return (
    <section className="grid grid-cols-1 xl:grid-cols-4 gap-3">
      <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="text-sm font-semibold text-cyan-200 mb-2">ComplianceOverviewBlock</h3>
        <p className="text-xs text-slate-300">{insightBlocks.ComplianceOverviewBlock.summary}</p>
      </article>
      <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="text-sm font-semibold text-amber-200 mb-2">SubmissionStatusBlock</h3>
        <p className="text-xs text-slate-300">{insightBlocks.SubmissionStatusBlock.summary}</p>
      </article>
      <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="text-sm font-semibold text-violet-200 mb-2">RiskRankingBlock</h3>
        <ul className="text-xs text-slate-300 space-y-1">
          {riskItems.map((item) => (
            <li key={item.mco_name}>{item.mco_name}: {item.risk_score}</li>
          ))}
        </ul>
      </article>
      <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="text-sm font-semibold text-rose-200 mb-2">RecordEvidenceBlock</h3>
        <ul className="text-xs text-slate-300 space-y-1 max-h-24 overflow-auto pr-1">
          {evidenceItems.map((item) => (
            <li key={`${item.mco_name}-${item.service_name || 'missing'}-${item.reporting_period}`}>
              {item.mco_name} - {item.derived_issue_type}
            </li>
          ))}
        </ul>
      </article>
    </section>
  )
}
