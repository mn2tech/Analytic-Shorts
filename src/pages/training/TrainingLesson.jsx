import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../../config/api'
import FileUploader from '../../components/FileUploader'
import DashboardRenderer from '../../components/aiVisualBuilder/DashboardRenderer'
import DashboardCharts from '../../components/DashboardCharts'
import MetricCards from '../../components/MetricCards'
import { parseNumericValue } from '../../utils/numberUtils'

const COMPLETE_KEY = 'aiTrainingCompleted'

function markModuleComplete(id) {
  try {
    const raw = localStorage.getItem(COMPLETE_KEY)
    const arr = Array.isArray(JSON.parse(raw || '[]')) ? JSON.parse(raw || '[]') : []
    if (!arr.includes(id)) {
      arr.push(id)
      localStorage.setItem(COMPLETE_KEY, JSON.stringify(arr))
      window.dispatchEvent(new Event('ai-training-updated'))
    }
  } catch {
    localStorage.setItem(COMPLETE_KEY, JSON.stringify([id]))
  }
}

function StepRow({ n, title, done, active }) {
  return (
    <li className={`flex gap-3 rounded-lg border px-3 py-2 text-sm ${active ? 'border-blue-300 bg-blue-50' : done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
        {done ? '✓' : n}
      </span>
      <span className={done ? 'text-slate-700' : 'text-slate-800'}>{title}</span>
    </li>
  )
}

function pickFirstExisting(candidates, columns) {
  for (const c of candidates || []) {
    if (columns.includes(c)) return c
  }
  return null
}

/** Very small markdown helper for ## headings from the LLM */
function FormattedExplanation({ text }) {
  const blocks = useMemo(() => {
    if (!text) return []
    const lines = text.split('\n')
    const out = []
    let cur = { type: 'p', lines: [] }
    for (const line of lines) {
      if (/^##\s+/.test(line)) {
        if (cur.lines.length) out.push({ ...cur, text: cur.lines.join('\n').trim() })
        cur = { type: 'h2', text: line.replace(/^##\s+/, '').trim(), lines: [] }
        out.push(cur)
        cur = { type: 'p', lines: [] }
      } else {
        cur.lines.push(line)
      }
    }
    if (cur.lines.length) out.push({ type: 'p', text: cur.lines.join('\n').trim() })
    return out.filter((b) => b.text)
  }, [text])

  return (
    <div className="prose prose-slate prose-sm max-w-none">
      {blocks.map((b, i) =>
        b.type === 'h2' ? (
          <h2 key={i} className="text-base font-semibold text-slate-900 mt-4 first:mt-0">
            {b.text}
          </h2>
        ) : (
          <p key={i} className="text-slate-700 whitespace-pre-wrap">
            {b.text}
          </p>
        )
      )}
    </div>
  )
}

export default function TrainingLesson() {
  const SPEC_PREVIEW_BASE_WIDTH = 1280
  const { id } = useParams()
  const [moduleMeta, setModuleMeta] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)

  const [dataset, setDataset] = useState(null)
  const [sampleLoading, setSampleLoading] = useState(false)
  const [runLoading, setRunLoading] = useState(false)
  const [explainLoading, setExplainLoading] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [explainError, setExplainError] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [actionError, setActionError] = useState(null)
  const [filterValues, setFilterValues] = useState({})
  const [specPreviewScale, setSpecPreviewScale] = useState(1)
  const specPreviewHostRef = useRef(null)

  useEffect(() => {
    const host = specPreviewHostRef.current
    if (!host || typeof ResizeObserver === 'undefined') return

    const computeScale = () => {
      const width = host.clientWidth || SPEC_PREVIEW_BASE_WIDTH
      const next = Math.min(1, Math.max(0.65, width / SPEC_PREVIEW_BASE_WIDTH))
      setSpecPreviewScale(next)
    }
    computeScale()

    const observer = new ResizeObserver(() => computeScale())
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setPageLoading(true)
      setLoadError(null)
      try {
        const { data } = await apiClient.get(`/api/training/modules/${encodeURIComponent(id)}`)
        if (!cancelled) setModuleMeta(data)
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.response?.data?.error || e.message || 'Failed to load lesson')
        }
      } finally {
        if (!cancelled) setPageLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const loadSample = useCallback(async () => {
    const name = moduleMeta?.sampleDataset
    if (!name) return
    setSampleLoading(true)
    setActionError(null)
    try {
      const { data } = await apiClient.get(`/api/training/dataset/${encodeURIComponent(name)}`)
      setDataset(data)
      setRunResult(null)
      setExplanation('')
      setExplainError(null)
    } catch (e) {
      setActionError(e?.response?.data?.error || e.message || 'Could not load sample dataset')
    } finally {
      setSampleLoading(false)
    }
  }, [moduleMeta])

  const runAnalysis = useCallback(async () => {
    if (!dataset?.data?.length) {
      setActionError('Load a dataset first (sample or upload).')
      return
    }
    setRunLoading(true)
    setActionError(null)
    setExplainError(null)
    setExplanation('')
    try {
      const { data } = await apiClient.post('/api/training/run', {
        module_id: id,
        dataset
      })
      setRunResult(data)
      markModuleComplete(id)
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.response?.data?.error || e.message || 'Run failed')
    } finally {
      setRunLoading(false)
    }
  }, [dataset, id])

  const explainResults = useCallback(async () => {
    if (!runResult) return
    setExplainLoading(true)
    setExplainError(null)
    try {
      const { data } = await apiClient.post('/api/training/explain', {
        moduleTitle: moduleMeta?.title,
        results: {
          summary: runResult.summary,
          kpis: runResult.kpis,
          charts: runResult.charts,
          profile: runResult.profile
        }
      })
      setExplanation(data.explanation || '')
    } catch (e) {
      setExplainError(e?.response?.data?.message || e?.response?.data?.error || e.message || 'Explain failed')
    } finally {
      setExplainLoading(false)
    }
  }, [runResult, moduleMeta])

  const steps = moduleMeta?.steps || []
  const step1 = !!dataset?.data?.length
  const step2 = !!runResult
  const step3 = !!explanation

  const stepTitles = [
    steps[0] || 'Load data',
    steps[1] || 'Run AI analysis',
    steps[2] || 'Review results',
    steps[3] || 'Explain results'
  ]

  const trainingColumns = useMemo(() => {
    if (Array.isArray(dataset?.columns) && dataset.columns.length) return dataset.columns
    const first = Array.isArray(dataset?.data) && dataset.data.length ? dataset.data[0] : null
    return first ? Object.keys(first) : []
  }, [dataset])

  const trainingNumericColumns = useMemo(() => {
    const fromRun = runResult?.datasetEcho?.numericColumns
    if (Array.isArray(fromRun) && fromRun.length) return fromRun
    if (Array.isArray(dataset?.numericColumns) && dataset.numericColumns.length) return dataset.numericColumns
    return []
  }, [runResult, dataset])

  const trainingSelectedNumeric = useMemo(() => {
    const cols = trainingColumns
    if (!cols.length) return trainingNumericColumns[0] || null
    if (id === 'sales_prediction') {
      return pickFirstExisting(['revenue', 'sales', 'amount', 'total_sales'], cols) || trainingNumericColumns[0] || null
    }
    if (id === 'kpi_deep_dive') {
      return pickFirstExisting(['units', 'quantity', 'count', 'volume'], cols) || trainingNumericColumns[1] || trainingNumericColumns[0] || null
    }
    return trainingNumericColumns[0] || null
  }, [id, trainingColumns, trainingNumericColumns])

  const trainingSelectedDate = useMemo(() => {
    const dateCols = Array.isArray(dataset?.dateColumns) ? dataset.dateColumns : []
    if (id === 'kpi_deep_dive') {
      // Keep lesson 2 focused on segment comparison rather than trend axis.
      return null
    }
    return dateCols[0] || null
  }, [id, dataset])

  const trainingSelectedCategorical = useMemo(() => {
    if (Array.isArray(dataset?.categoricalColumns) && dataset.categoricalColumns.length) {
      if (id === 'sales_prediction') {
        return pickFirstExisting(['region', 'market', 'state', 'country'], dataset.categoricalColumns) || dataset.categoricalColumns[0]
      }
      if (id === 'kpi_deep_dive') {
        return pickFirstExisting(['product', 'category', 'segment', 'department'], dataset.categoricalColumns) || dataset.categoricalColumns[0]
      }
      return dataset.categoricalColumns[0]
    }
    const rows = Array.isArray(dataset?.data) ? dataset.data : []
    if (!rows.length) return null
    return trainingColumns.find((col) => {
      for (let i = 0; i < Math.min(rows.length, 40); i++) {
        const v = rows[i]?.[col]
        if (typeof v === 'string' && v.trim()) return true
      }
      return false
    }) || null
  }, [dataset, trainingColumns])

  const trainingStats = useMemo(() => {
    if (!trainingSelectedNumeric || !Array.isArray(dataset?.data) || !dataset.data.length) return null
    const values = dataset.data
      .map((row) => parseNumericValue(row?.[trainingSelectedNumeric]))
      .filter((v) => Number.isFinite(v))
    if (!values.length) return null
    const sum = values.reduce((a, b) => a + b, 0)
    return {
      avg: sum / values.length
    }
  }, [dataset, trainingSelectedNumeric])

  if (pageLoading) {
    return (
      <div className="min-h-full flex items-center justify-center bg-slate-50 text-slate-600 gap-3 py-20">
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        Loading lesson…
      </div>
    )
  }

  if (loadError || !moduleMeta) {
    return (
      <div className="min-h-full bg-slate-50 px-4 py-12">
        <div className="max-w-lg mx-auto rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 text-sm">
          {loadError || 'Lesson not found.'}
          <div className="mt-4">
            <Link to="/training" className="text-blue-700 font-medium hover:underline">Back to modules</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link to="/training" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            ← All modules
          </Link>
        </div>

        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{moduleMeta.title}</h1>
          <p className="mt-2 text-slate-600 max-w-3xl">{moduleMeta.description}</p>
          {moduleMeta.valueProposition && (
            <p className="mt-3 max-w-3xl text-base font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              {moduleMeta.valueProposition}
            </p>
          )}
        </header>

        <div className="grid lg:grid-cols-5 gap-8">
          <aside className="lg:col-span-2 space-y-6">
            {Array.isArray(moduleMeta.concepts) && moduleMeta.concepts.length > 0 && (
              <section className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-blue-900 uppercase tracking-wide mb-3">AI concepts you are practicing</h2>
                <ul className="space-y-2">
                  {moduleMeta.concepts.map((concept) => (
                    <li key={concept} className="text-sm text-blue-900 flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{concept}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Your path</h2>
              <ol className="space-y-2">
                <StepRow n={1} title={stepTitles[0]} done={step1} active={!step1} />
                <StepRow n={2} title={stepTitles[1]} done={step2} active={step1 && !step2} />
                <StepRow n={3} title={stepTitles[2]} done={step2} active={false} />
                <StepRow n={4} title={stepTitles[3]} done={step3} active={step2 && !step3} />
              </ol>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Dataset</h2>
              {moduleMeta.sampleDataset && (
                <button
                  type="button"
                  onClick={loadSample}
                  disabled={sampleLoading}
                  className="w-full mb-4 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-60"
                >
                  {sampleLoading ? 'Loading sample…' : 'Use sample dataset'}
                </button>
              )}
              <p className="text-xs text-slate-500 mb-2">Try with your own data</p>
              <div className="rounded-xl border border-dashed border-slate-300 p-3 bg-slate-50/80">
                <FileUploader
                  onUploadSuccess={(d) => {
                    setDataset(d)
                    setRunResult(null)
                    setExplanation('')
                    setExplainError(null)
                    setActionError(null)
                  }}
                  onError={setActionError}
                />
              </div>
              {dataset?.rowCount != null && (
                <p className="mt-3 text-xs text-slate-600">
                  Loaded <strong>{dataset.rowCount}</strong> rows
                  {dataset.columns?.length ? ` · ${dataset.columns.length} columns` : ''}
                </p>
              )}
            </section>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={runAnalysis}
                disabled={runLoading || !dataset?.data?.length}
                className="flex-1 rounded-xl bg-blue-600 text-white text-sm font-semibold px-4 py-3 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runLoading ? 'Running analysis…' : 'Run AI analysis'}
              </button>
              <button
                type="button"
                onClick={() => window.alert('Certificates will be available in a future release. Complete lessons to build your transcript.')}
                className="rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-medium px-4 py-3 hover:bg-slate-50"
              >
                Certificate (soon)
              </button>
            </div>
          </aside>

          <div className="lg:col-span-3 space-y-6">
            {actionError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 whitespace-pre-wrap">
                {actionError}
              </div>
            )}

            {runResult?.aiWarning && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {runResult.aiWarning}
              </div>
            )}

            {runResult && (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-2">Summary</h2>
                  <p className="text-slate-700 text-sm">{runResult.summary}</p>
                  {Array.isArray(moduleMeta.outcomes) && moduleMeta.outcomes.length > 0 && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900 mb-1.5">Learning value</p>
                      <ul className="space-y-1">
                        {moduleMeta.outcomes.map((outcome) => (
                          <li key={outcome} className="text-sm text-emerald-900 flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                            <span>{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {runResult.kpis?.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {runResult.kpis.map((k) => (
                        <div key={k.column} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                          <div className="text-xs text-slate-500 font-medium truncate" title={k.column}>{k.column}</div>
                          <div className="text-lg font-semibold text-slate-900">
                            {k.sum != null ? Math.round(k.sum * 100) / 100 : '—'}
                          </div>
                          <div className="text-xs text-slate-500">
                            mean {k.mean != null ? Math.round(k.mean * 100) / 100 : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {dataset?.data?.length > 0 && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide px-1 mb-3">Guided visual summary</h2>
                    <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                      <MetricCards
                        data={dataset.data}
                        numericColumns={trainingNumericColumns}
                        selectedNumeric={trainingSelectedNumeric}
                        stats={trainingStats}
                      />
                      <DashboardCharts
                        data={dataset.data}
                        filteredData={dataset.data}
                        selectedNumeric={trainingSelectedNumeric}
                        selectedCategorical={trainingSelectedCategorical}
                        selectedDate={trainingSelectedDate}
                        onChartFilter={() => {}}
                        chartFilter={null}
                      />
                    </div>
                  </section>
                )}

                {runResult.spec && dataset?.data && (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
                    <details>
                      <summary className="cursor-pointer select-none text-sm font-semibold text-slate-900 uppercase tracking-wide px-1">
                        Full AI dashboard spec preview
                      </summary>
                      <div ref={specPreviewHostRef} className="mt-3 min-h-[320px] border border-slate-100 rounded-xl overflow-y-auto overflow-x-hidden bg-slate-50/50">
                        <div className="p-3">
                          <div
                            className="origin-top-left"
                            style={{
                              width: `${SPEC_PREVIEW_BASE_WIDTH}px`,
                              zoom: specPreviewScale,
                            }}
                          >
                          <DashboardRenderer
                            spec={runResult.spec}
                            data={dataset.data}
                            filterValues={filterValues}
                            onFilterChange={setFilterValues}
                          />
                          </div>
                        </div>
                      </div>
                    </details>
                  </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Explain results</h2>
                    <button
                      type="button"
                      onClick={explainResults}
                      disabled={explainLoading}
                      className="rounded-lg bg-slate-900 text-white text-sm font-medium px-4 py-2 hover:bg-slate-800 disabled:opacity-50"
                    >
                      {explainLoading ? 'Generating…' : 'Explain results'}
                    </button>
                  </div>
                  {explainError && (
                    <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{explainError}</div>
                  )}
                  {explanation ? (
                    <FormattedExplanation text={explanation} />
                  ) : (
                    <p className="text-sm text-slate-500">Run analysis, then generate a plain-English walkthrough of KPIs and charts.</p>
                  )}
                </section>
              </>
            )}

            {!runResult && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-slate-500 text-sm">
                Load data and run AI analysis to see KPIs, charts, and explanations here.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
