import StatusChip from './StatusChip'

function SectionCard({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">{title}</p>
      {children}
    </div>
  )
}

function GuardrailItem({ label, data }) {
  const status = data?.status || (data?.passed ? 'passed' : 'review')
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold text-slate-200">{label}</p>
        <StatusChip status={status} />
      </div>
      <p className="text-xs text-slate-400">{data?.detail || 'No detail available.'}</p>
    </div>
  )
}

export default function ObservabilityPanel({ result }) {
  const emptyState = (
    <div className="space-y-4">
      <SectionCard title="Supporting Evidence">
        <p className="text-sm text-slate-400">Evidence appears after analysis runs.</p>
      </SectionCard>
      <SectionCard title="Guardrail Checks">
        <p className="text-sm text-slate-400">Guardrail checks appear after inference.</p>
      </SectionCard>
      <SectionCard title="Inference Trace / Observability">
        <p className="text-sm text-slate-400">Model and usage metadata appear after execution.</p>
      </SectionCard>
    </div>
  )

  return (
    <section className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-lg">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-4">Observability + Guardrails</h2>

      {!result ? emptyState : (
        <div className="space-y-4">
          <SectionCard title="Supporting Evidence">
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-700 p-3">
                <p className="text-xs font-semibold text-slate-200 mb-2">Retrieved Policy Snippets</p>
                <div className="space-y-2">
                  {result.evidence.citedPolicies.map((policy) => (
                    <article key={policy.id} className="text-xs text-slate-300">
                      <p className="font-semibold text-slate-200">{policy.id} - {policy.title}</p>
                      <p className="text-slate-400">{policy.text}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 p-3">
                <p className="text-xs font-semibold text-slate-200 mb-2">Similar Prior Cases</p>
                <div className="space-y-2">
                  {result.evidence.similarCases.map((item) => (
                    <article key={item.id} className="text-xs text-slate-300">
                      <p className="font-semibold text-slate-200">{item.id} - {item.title}</p>
                      <p className="text-slate-400">{item.summary}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-700 p-3">
                <p className="text-xs font-semibold text-slate-200 mb-2">Signals Used / Extracted Features</p>
                <div className="flex flex-wrap gap-2">
                  {result.evidence.signalsUsed.map((signal) => (
                    <span key={signal.name} className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {signal.name}: {signal.value}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-700 p-3">
                <span className="text-xs text-slate-300">Confidence / Groundedness</span>
                <div className="flex items-center gap-2">
                  <StatusChip status={result.trace.groundedness >= 0.75 ? 'passed' : result.trace.groundedness >= 0.55 ? 'review' : 'blocked'} />
                  <span className="text-xs text-slate-200">{Math.round(result.trace.confidence * 100)}% / {Math.round(result.trace.groundedness * 100)}%</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Guardrail Checks">
            <div className="space-y-2">
              <GuardrailItem label="PII Leakage Check" data={result.guardrails.piiLeakage} />
              <GuardrailItem label="Grounded In Evidence" data={result.guardrails.groundedInEvidence} />
              <GuardrailItem label="Unsupported Claims Check" data={result.guardrails.unsupportedClaims} />
              <GuardrailItem label="Policy Scope Check" data={result.guardrails.policyScope} />
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-200">Final Safety Status</p>
                <StatusChip status={result.guardrails.finalSafetyStatus} />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Inference Trace / Observability">
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-400">Trace ID</div><div className="text-slate-100 text-right">{result.trace.traceId}</div>
              <div className="text-slate-400">Model</div><div className="text-slate-100 text-right">{result.trace.model}</div>
              <div className="text-slate-400">Retrieval Hits</div><div className="text-slate-100 text-right">{result.trace.retrievalHits}</div>
              <div className="text-slate-400">Latency</div><div className="text-slate-100 text-right">{result.trace.durationMs} ms</div>
              <div className="text-slate-400">Prompt Tokens</div><div className="text-slate-100 text-right">{result.trace.promptTokens}</div>
              <div className="text-slate-400">Completion Tokens</div><div className="text-slate-100 text-right">{result.trace.completionTokens}</div>
              <div className="text-slate-400">Total Tokens</div><div className="text-slate-100 text-right">{result.trace.totalTokens}</div>
              <div className="text-slate-400">Retrieval</div><div className="text-slate-100 text-right">{result.trace.retrievalProvider}</div>
            </dl>
          </SectionCard>
        </div>
      )}
    </section>
  )
}
