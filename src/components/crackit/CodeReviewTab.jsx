import { useMemo, useState } from 'react'
import apiClient from '../../config/api'

function languageBadgeClass(language) {
  return language === 'Python'
    ? 'border-emerald-500/30 bg-emerald-900/20 text-emerald-200'
    : 'border-amber-500/30 bg-amber-900/20 text-amber-200'
}

export default function CodeReviewTab({ snippets = [], onPracticeComplete }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [showHint, setShowHint] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const current = useMemo(() => (snippets.length ? snippets[index % snippets.length] : null), [index, snippets])

  const nextSnippet = () => {
    if (!snippets.length) return
    setIndex((prev) => (prev + 1) % snippets.length)
    setAnswer('')
    setShowHint(false)
    setResult(null)
    setError('')
  }

  const checkAnswer = async () => {
    if (!current || !answer.trim()) return
    setLoading(true)
    setError('')
    try {
      const { data } = await apiClient.post('/api/crackit/check-answer', {
        snippetId: current.id,
        userAnswer: answer,
      })
      setResult(data)
      if (typeof onPracticeComplete === 'function') onPracticeComplete()
    } catch (err) {
      const fallback = err?.response?.data?.fallback
      if (fallback) setResult(fallback)
      setError(err?.response?.data?.message || 'Unable to validate answer. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  if (!snippets.length) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-300">
        No code review snippets are available yet.
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr,1fr]">
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">{current.title}</h2>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${languageBadgeClass(current.language)}`}>
            {current.language}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">{current.description}</p>
        <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-700 bg-black/40 p-3 text-xs text-slate-200">
          <code>{current.buggyCode}</code>
        </pre>
        <button
          type="button"
          onClick={() => setShowHint((prev) => !prev)}
          className="mt-3 text-sm font-medium text-indigo-300 hover:text-indigo-200"
        >
          {showHint ? 'Hide hint' : 'Show hint'}
        </button>
        {showHint && <p className="mt-2 rounded-lg border border-indigo-500/30 bg-indigo-900/20 px-3 py-2 text-sm text-indigo-100">{current.hint}</p>}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/25">
        <h3 className="text-lg font-semibold text-white">Your Code Review</h3>
        <textarea
          rows={8}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Describe the root cause and how you'd fix it."
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={checkAnswer}
            disabled={loading || !answer.trim()}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Answer'}
          </button>
          <button
            type="button"
            onClick={nextSnippet}
            className="rounded-lg border border-slate-600 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            Next
          </button>
        </div>

        {error && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-100">{error}</p>}

        {!result && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            Submit your diagnosis to see whether you identified the real issue.
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <div className={`rounded-lg border px-3 py-2 text-sm font-medium ${result.correct ? 'border-emerald-500/40 bg-emerald-900/20 text-emerald-100' : 'border-rose-500/40 bg-rose-900/20 text-rose-100'}`}>
              {result.correct ? 'Correct diagnosis.' : 'Not quite right yet.'}
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-wide text-slate-400">Explanation</p>
              <p className="mt-1">{result.explanation}</p>
            </div>
            {result.fixedCode && (
              <pre className="overflow-x-auto rounded-lg border border-slate-700 bg-black/40 p-3 text-xs text-slate-200">
                <code>{result.fixedCode}</code>
              </pre>
            )}
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/30 p-3 text-sm text-indigo-100">
              <p className="text-xs uppercase tracking-wide text-indigo-300">Learning tip</p>
              <p className="mt-1">{result.tip}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
