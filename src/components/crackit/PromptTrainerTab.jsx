import { useMemo, useState } from 'react'
import apiClient from '../../config/api'

export default function PromptTrainerTab({ challenges = [], onPracticeComplete }) {
  const [index, setIndex] = useState(0)
  const [promptText, setPromptText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const current = useMemo(() => (challenges.length ? challenges[index % challenges.length] : null), [challenges, index])

  const nextChallenge = () => {
    if (!challenges.length) return
    setIndex((prev) => (prev + 1) % challenges.length)
    setPromptText('')
    setResult(null)
    setError('')
  }

  const evaluatePrompt = async () => {
    if (!current || !promptText.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.post('/api/crackit/evaluate-prompt', {
        challengeId: current.id,
        task: current.task,
        userPromptText: promptText,
      })
      setResult(data)
      if (typeof onPracticeComplete === 'function') onPracticeComplete()
    } catch (err) {
      const fallback = err?.response?.data?.fallback
      if (fallback) setResult(fallback)
      setError(err?.response?.data?.message || 'Prompt evaluation failed. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  if (!challenges.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-300">
        No prompt challenges are available yet.
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr,1fr]">
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/25">
        <h2 className="text-lg font-semibold text-white">Prompt Trainer</h2>
        <p className="mt-1 text-sm text-slate-300">Improve prompt clarity and constraints for AI-assisted software workflows.</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Task</p>
            <p className="mt-1 text-sm text-slate-200">{current.task}</p>
          </div>
          <div className="rounded-lg border border-rose-500/25 bg-rose-950/20 p-3">
            <p className="text-xs uppercase tracking-wide text-rose-300">Bad Example Prompt</p>
            <p className="mt-1 text-sm text-rose-100">{current.badExamplePrompt}</p>
          </div>
          <div className="rounded-lg border border-indigo-500/25 bg-indigo-950/30 p-3">
            <p className="text-xs uppercase tracking-wide text-indigo-300">Hint</p>
            <p className="mt-1 text-sm text-indigo-100">{current.hint}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/25">
        <h3 className="text-lg font-semibold text-white">Your Improved Prompt</h3>
        <textarea
          rows={9}
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="Write a high-quality prompt with context, constraints, output format, and validation criteria."
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={evaluatePrompt}
            disabled={loading || !promptText.trim()}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Evaluating...' : 'Evaluate'}
          </button>
          <button
            type="button"
            onClick={nextChallenge}
            className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Next
          </button>
        </div>
        {error && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-100">{error}</p>}

        {!result && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            Submit your improved prompt to receive a score and a stronger ideal version.
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <div className="inline-flex rounded-full border border-indigo-400/30 bg-indigo-900/30 px-3 py-1 text-sm font-semibold text-indigo-100">
              Score: {result.score ?? 0}/10
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">What Works</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                {(result.whatWorks || []).map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">What To Improve</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                {(result.whatToImprove || []).map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-indigo-500/25 bg-indigo-950/30 p-3 text-sm text-indigo-100">
              <p className="text-xs uppercase tracking-wide text-indigo-300">Ideal Prompt</p>
              <p className="mt-1 whitespace-pre-wrap">{result.idealPrompt}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
