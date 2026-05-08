import { useEffect, useMemo, useState } from 'react'
import apiClient from '../config/api'
import MockInterviewTab from '../components/crackit/MockInterviewTab'
import CodeReviewTab from '../components/crackit/CodeReviewTab'
import PromptTrainerTab from '../components/crackit/PromptTrainerTab'
import TipsStrategyTab from '../components/crackit/TipsStrategyTab'
import ExampleReviewsSection from '../components/crackit/ExampleReviewsSection'

const TABS = [
  { id: 'mock', label: 'Mock Interview' },
  { id: 'review', label: 'Code Review' },
  { id: 'prompt', label: 'Prompt Trainer' },
  { id: 'tips', label: 'Tips & Strategy' },
  { id: 'examples', label: 'Engineering Reviews' },
]

const DEFAULT_META = {
  codeReviewSnippets: [
    {
      id: 'js-null-guard',
      title: 'Guard Missing on Nested Access',
      language: 'JavaScript',
      description: 'A production function crashes when profile data is incomplete.',
      buggyCode: 'function getUserCity(user) {\n  return user.profile.address.city.toLowerCase()\n}',
      hint: 'What happens when profile or address is undefined?',
      expectedFix: 'Add optional chaining or defensive null checks before accessing nested fields.',
    },
    {
      id: 'py-off-by-one',
      title: 'Off-by-One in Loop',
      language: 'Python',
      description: 'An interview-style helper skips the final element in a sorted list check.',
      buggyCode: 'def is_sorted(arr):\n    for i in range(len(arr) - 2):\n        if arr[i] > arr[i + 1]:\n            return False\n    return True',
      hint: 'Check loop bounds when comparing adjacent values.',
      expectedFix: 'Iterate to len(arr) - 1 so every adjacent pair is validated.',
    },
    {
      id: 'js-async-await',
      title: 'Missing Await on Async Step',
      language: 'JavaScript',
      description: 'A fetch helper returns before JSON parsing resolves.',
      buggyCode: "async function loadOrders() {\n  const res = await fetch('/api/orders')\n  const payload = res.json()\n  return payload.orders\n}",
      hint: 'One asynchronous call still returns a Promise.',
      expectedFix: 'Await res.json() before dereferencing payload.orders.',
    },
  ],
  promptChallenges: [
    {
      id: 'sql-analytics',
      task: 'Generate a SQL query for top 5 products by revenue in the last 30 days.',
      badExamplePrompt: 'Write SQL for revenue stuff fast.',
      hint: 'Specify schema fields, filters, ordering, and output columns.',
    },
    {
      id: 'refactor-code',
      task: 'Refactor a React component for readability and performance.',
      badExamplePrompt: 'Improve this component.',
      hint: 'Define coding standards, constraints, and expected output format.',
    },
    {
      id: 'debug-api',
      task: 'Debug a failing API response returning intermittent 500 errors.',
      badExamplePrompt: 'Fix this API bug.',
      hint: 'Include symptoms, logs, hypotheses, and required diagnostic steps.',
    },
  ],
}

const STORAGE_KEY = 'crackit_progress_v1'

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return {
      sessions: Number(parsed.sessions || 0),
      streak: Number(parsed.streak || 0),
      lastDay: parsed.lastDay || null,
    }
  } catch {
    return { sessions: 0, streak: 0, lastDay: null }
  }
}

function markPracticeDone(progress) {
  const today = new Date().toISOString().slice(0, 10)
  const prevDay = progress.lastDay
  const prevDate = prevDay ? new Date(`${prevDay}T00:00:00`) : null
  const currentDate = new Date(`${today}T00:00:00`)
  const dayDiff = prevDate ? Math.round((currentDate - prevDate) / (24 * 60 * 60 * 1000)) : null

  const streak =
    prevDay === today
      ? progress.streak
      : dayDiff === 1
        ? progress.streak + 1
        : 1

  const next = {
    sessions: progress.sessions + 1,
    streak,
    lastDay: today,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export default function CrackIt() {
  const [activeTab, setActiveTab] = useState('mock')
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState('')
  const [meta, setMeta] = useState(DEFAULT_META)
  const [progress, setProgress] = useState(() => loadProgress())
  const [mockPreset, setMockPreset] = useState(null)

  const fetchMeta = async () => {
    setMetaLoading(true)
    setMetaError('')
    try {
      const { data } = await apiClient.get('/api/crackit/meta')
      setMeta({
        codeReviewSnippets: Array.isArray(data?.codeReviewSnippets) ? data.codeReviewSnippets : DEFAULT_META.codeReviewSnippets,
        promptChallenges: Array.isArray(data?.promptChallenges) ? data.promptChallenges : DEFAULT_META.promptChallenges,
      })
    } catch (error) {
      setMeta(DEFAULT_META)
      setMetaError(error?.response?.data?.message || error?.message || 'Failed to load CrackIt metadata.')
    } finally {
      setMetaLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await fetchMeta()
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const completionRate = useMemo(() => {
    const capped = Math.min(progress.sessions, 12)
    return Math.round((capped / 12) * 100)
  }, [progress.sessions])

  return (
    <div className="min-h-full bg-gray-950 text-slate-100">
      <div className="sticky top-0 z-20 border-b border-indigo-500/20 bg-gray-950/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300/90">CrackIt by Analytics Shorts</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">CrackIt - AI Interview Prep</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300 sm:text-base">
                Practice AI-assisted coding interviews, debugging, and prompt engineering with AI feedback.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:w-auto">
              <div className="rounded-xl border border-indigo-500/30 bg-slate-900/70 px-3 py-2 text-center shadow-lg shadow-indigo-900/20">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Sessions</p>
                <p className="text-lg font-semibold text-white">{progress.sessions}</p>
              </div>
              <div className="rounded-xl border border-indigo-500/30 bg-slate-900/70 px-3 py-2 text-center shadow-lg shadow-indigo-900/20">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Streak</p>
                <p className="text-lg font-semibold text-indigo-300">{progress.streak}d</p>
              </div>
              <div className="rounded-xl border border-indigo-500/30 bg-slate-900/70 px-3 py-2 text-center shadow-lg shadow-indigo-900/20">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Progress</p>
                <p className="text-lg font-semibold text-emerald-300">{completionRate}%</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-900/40'
                    : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {metaLoading && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-4 text-sm text-slate-300">
            <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-indigo-400" />
            Loading CrackIt practice modules...
          </div>
        )}

        {!metaLoading && metaError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-900/20 px-4 py-4 text-sm text-rose-100">
            <p>{metaError}</p>
            <p className="mt-1 text-rose-200/90">Using built-in fallback content so you can continue practicing.</p>
            <button
              type="button"
              onClick={fetchMeta}
              className="mt-3 rounded-lg border border-rose-300/40 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-900/60"
            >
              Retry loading live metadata
            </button>
          </div>
        )}

        {!metaLoading && (
          <>
            {activeTab === 'mock' && (
              <MockInterviewTab
                onPracticeComplete={() => setProgress((prev) => markPracticeDone(prev))}
                presetScenario={mockPreset}
              />
            )}
            {activeTab === 'review' && (
              <CodeReviewTab
                snippets={meta.codeReviewSnippets}
                onPracticeComplete={() => setProgress((prev) => markPracticeDone(prev))}
              />
            )}
            {activeTab === 'prompt' && (
              <PromptTrainerTab
                challenges={meta.promptChallenges}
                onPracticeComplete={() => setProgress((prev) => markPracticeDone(prev))}
              />
            )}
            {activeTab === 'tips' && <TipsStrategyTab />}
            {activeTab === 'examples' && (
              <ExampleReviewsSection
                onStartPractice={(preset) => {
                  setMockPreset({ ...preset, ts: Date.now() })
                  setActiveTab('mock')
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
