function Badge({ label, tone = 'neutral' }) {
  const toneClass = {
    good: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    neutral: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  }[tone]

  return <span className={`text-xs px-2 py-1 rounded-md border ${toneClass}`}>{label}</span>
}

export default function AnswerPanel({ result }) {
  if (!result) {
    return (
      <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg min-h-[560px]">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-4">AI Answer</h2>
        <p className="text-slate-400 text-sm">Run a case to generate grounded guidance and evidence-backed recommendations.</p>
      </section>
    )
  }

  const confidenceTone = result.trace.confidence >= 0.75 ? 'good' : result.trace.confidence >= 0.55 ? 'medium' : 'neutral'
  const groundednessTone = result.trace.groundedness >= 0.75 ? 'good' : result.trace.groundedness >= 0.55 ? 'medium' : 'neutral'

  return (
    <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg min-h-[560px]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">AI Answer</h2>
        <div className="flex items-center gap-2">
          <Badge label={`Confidence ${Math.round(result.trace.confidence * 100)}%`} tone={confidenceTone} />
          <Badge label={`Groundedness ${Math.round(result.trace.groundedness * 100)}%`} tone={groundednessTone} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Answer Summary</p>
          <p className="text-sm text-slate-100">{result.answer.answerSummary}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">Recommended Next Step</p>
          <p className="text-sm text-cyan-200">{result.answer.recommendedNextStep}</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">Similar Cases</p>
          <div className="space-y-3">
            {result.evidence.similarCases.map((item) => (
              <article key={item.id} className="border border-slate-700 rounded-lg p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-100">{item.id} - {item.title}</p>
                  <Badge label={item.riskLevel.toUpperCase()} tone={item.riskLevel === 'high' ? 'medium' : 'neutral'} />
                </div>
                <p className="text-xs text-slate-300 mt-1">{item.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">Cited Policy Text</p>
          <div className="space-y-3">
            {result.answer.citations.map((item) => (
              <article key={item.policyId} className="border border-slate-700 rounded-lg p-3">
                <p className="text-sm font-semibold text-slate-100">{item.policyId} - {item.policyTitle}</p>
                <p className="text-xs text-slate-300 mt-1">{item.excerpt}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
