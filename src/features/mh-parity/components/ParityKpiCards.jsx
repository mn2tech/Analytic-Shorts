function KpiCard({ label, value, accent }) {
  return (
    <article className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </article>
  )
}

export default function ParityKpiCards({ metrics }) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <KpiCard label="Total MCOs" value={metrics.total_mcos} accent="text-cyan-300" />
      <KpiCard label="Non-Compliant Findings" value={metrics.non_compliant_count} accent="text-rose-300" />
      <KpiCard label="Pending / Rejected Submissions" value={`${metrics.pending_count} / ${metrics.rejected_count}`} accent="text-amber-300" />
      <KpiCard label="Data Quality Issues" value={metrics.data_quality_issue_count} accent="text-violet-300" />
    </section>
  )
}
