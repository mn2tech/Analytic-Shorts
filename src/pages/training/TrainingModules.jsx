import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, LineChart, Line } from 'recharts'
import apiClient from '../../config/api'

const COMPLETE_KEY = 'aiTrainingCompleted'

function loadCompletedIds() {
  try {
    const raw = localStorage.getItem(COMPLETE_KEY)
    const arr = JSON.parse(raw || '[]')
    return Array.isArray(arr) ? new Set(arr) : new Set()
  } catch {
    return new Set()
  }
}

function difficultyClass(d) {
  const x = String(d || '').toLowerCase()
  if (x.includes('advanced')) return 'bg-rose-100 text-rose-900 border-rose-300'
  if (x.includes('intermediate')) return 'bg-amber-100 text-amber-900 border-amber-300'
  return 'bg-emerald-100 text-emerald-900 border-emerald-300'
}

function actionLabelForModule(moduleId, index) {
  const labels = [
    'Run AI on this dataset',
    'Generate insights',
    'Build AI dashboard',
  ]
  const hit = labels[index % labels.length]
  if (moduleId === 'sales_prediction') return 'Run AI on this dataset'
  if (moduleId === 'kpi_deep_dive') return 'Generate insights'
  return hit
}

function learningPointsForModule(moduleId) {
  if (moduleId === 'sales_prediction') {
    return [
      'How to go from spreadsheet upload to AI-ready profile',
      'How KPI totals and trends are derived from raw rows',
      'How to explain results to business users in plain English',
    ]
  }
  if (moduleId === 'kpi_deep_dive') {
    return [
      'How to pick high-signal KPIs for a concise story',
      'How segment splits reveal top drivers and risks',
      'How to turn chart patterns into next-step actions',
    ]
  }
  return [
    'How to structure tabular data for faster AI analysis',
    'How to interpret automatically generated metrics',
    'How to turn insights into clear action plans',
  ]
}

function previewForModule(moduleId) {
  if (moduleId === 'kpi_deep_dive') {
    return {
      kpiLabel: 'Forecast Accuracy',
      kpiValue: '92%',
      chartData: [
        { x: 'W1', y: 72 },
        { x: 'W2', y: 80 },
        { x: 'W3', y: 76 },
        { x: 'W4', y: 88 },
        { x: 'W5', y: 92 },
      ],
    }
  }
  return {
    kpiLabel: 'Total Sales',
    kpiValue: '$120K',
    chartData: [
      { x: 'Jan', y: 16 },
      { x: 'Feb', y: 19 },
      { x: 'Mar', y: 21 },
      { x: 'Apr', y: 18 },
      { x: 'May', y: 24 },
      { x: 'Jun', y: 26 },
    ],
  }
}

export default function TrainingModules() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [completed, setCompleted] = useState(() => loadCompletedIds())

  const refreshCompleted = useCallback(() => setCompleted(loadCompletedIds()), [])

  useEffect(() => {
    refreshCompleted()
    const onUpdate = () => refreshCompleted()
    window.addEventListener('ai-training-updated', onUpdate)
    window.addEventListener('storage', onUpdate)
    return () => {
      window.removeEventListener('ai-training-updated', onUpdate)
      window.removeEventListener('storage', onUpdate)
    }
  }, [refreshCompleted])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get('/api/training/modules')
        if (!cancelled) setModules(data.modules || [])
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e?.response?.data?.error || e.message || 'Failed to load modules')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-full bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-10">
          <p className="text-sm font-medium text-blue-600 uppercase tracking-wide mb-2">Learn by doing</p>
          <h1 className="text-3xl font-bold text-slate-900">AI Learning</h1>
          <p className="mt-3 text-slate-800 max-w-3xl text-lg font-semibold leading-relaxed">
            Turn any Excel file into AI insights in seconds — and learn how it works step by step.
          </p>
        </header>

        <section className="mb-7 rounded-2xl border border-indigo-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">CrackIt by Analytics Shorts</p>
              <h2 className="mt-2 text-2xl font-bold">CrackIt Interview Prep</h2>
              <p className="mt-2 text-sm text-slate-200">
                Practice mock interviews, debugging, prompt engineering, and AI-assisted interview strategy.
              </p>
            </div>
            <Link
              to="/ai-learning/crackit"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              Start Practice
            </Link>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-slate-600">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" aria-hidden />
            Loading modules…
          </div>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {modules.map((m, index) => (
              <li key={m.id}>
                <article className="h-full flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:scale-[1.015] hover:shadow-xl hover:border-blue-300">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight">{m.title}</h2>
                    {completed.has(m.id) && (
                      <span className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        Completed
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex self-start text-xs font-semibold px-2.5 py-1 rounded-md border mb-4 ${difficultyClass(m.difficulty)}`}>
                    {m.difficulty || 'Beginner'}
                  </span>
                  <p className="text-slate-600 text-sm mb-5">{m.description}</p>

                  <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900 mb-2">You&apos;ll learn:</p>
                    <ul className="space-y-1.5 text-sm text-slate-700">
                      {learningPointsForModule(m.id).map((point) => (
                        <li key={point} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-6 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-blue-700 font-semibold mb-2">Preview outcome</p>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="rounded-lg border border-white/70 bg-white px-2.5 py-1.5 shadow-sm">
                        <p className="text-[11px] text-slate-500">{previewForModule(m.id).kpiLabel}</p>
                        <p className="text-lg font-bold text-slate-900">{previewForModule(m.id).kpiValue}</p>
                      </div>
                      <div className="h-16 w-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={previewForModule(m.id).chartData}>
                            <Line type="monotone" dataKey="y" stroke="#2563eb" strokeWidth={2.25} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <Link
                    to={`/training/${m.id}`}
                    className="inline-flex justify-center items-center rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-2.5 hover:bg-slate-800 transition-colors"
                  >
                    {actionLabelForModule(m.id, index)}
                  </Link>
                  <Link
                    to={`/training/${m.id}#upload`}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  >
                    Or upload your own Excel file
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}

        {!loading && modules.length === 0 && !error && (
          <p className="text-slate-600">No training modules are configured yet.</p>
        )}
      </div>
    </div>
  )
}
