import { useState } from 'react'
import CaseInputPanel from '../features/responsible-ai-copilot/components/CaseInputPanel'
import AnswerPanel from '../features/responsible-ai-copilot/components/AnswerPanel'
import ObservabilityPanel from '../features/responsible-ai-copilot/components/ObservabilityPanel'
import { runResponsibleBankingCopilot } from '../services/responsibleAiCopilotService'

export default function ResponsibleAiCopilotBanking() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleRun = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await runResponsibleBankingCopilot(query)
      setResult(data)
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || 'Unable to run copilot demo.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-[1500px] mx-auto px-5 py-6">
        <header className="mb-6">
          <p className="text-cyan-300 text-xs tracking-[0.2em] uppercase mb-1">Enterprise AI Demo</p>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-50">Responsible AI Copilot for Banking Operations</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Grounded Q&A with mock similarity retrieval, guardrails, governance signals, and observability metadata.
          </p>
        </header>

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-700 bg-rose-950/40 text-rose-200 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-3">
            <CaseInputPanel
              query={query}
              onQueryChange={setQuery}
              onSubmit={handleRun}
              loading={loading}
            />
          </div>
          <div className="xl:col-span-6">
            <AnswerPanel result={result} />
          </div>
          <div className="xl:col-span-3">
            <ObservabilityPanel result={result} />
          </div>
        </div>
      </div>
    </div>
  )
}
