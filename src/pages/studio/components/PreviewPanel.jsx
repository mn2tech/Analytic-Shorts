/**
 * PreviewPanel – Dashboard preview canvas with drag/drop, loading and empty states.
 * Used by Report Chat (right column) and Preview page (full width).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import DashboardRenderer from '../../../components/aiVisualBuilder/DashboardRenderer'
import ErrorBoundary from '../../../components/ErrorBoundary'
import { applyWidgetDrop } from '../../../components/aiVisualBuilder/reportCanvasDropUtils'
import { DRAG_TYPE } from '../../../components/aiVisualBuilder/ReportWidgetPalette'
import { hasSpecContent } from '../../../studio/utils/schemaUtils'
import { applyQuickSwitchToSpec, formatFieldLabel } from '../../../studio/utils/specQuickSwitch'

const STORAGE_KEY_QUICK_SWITCHERS = 'studio_preview_quickSwitchers' // { metric: boolean, dimension: boolean }
function hiddenFieldsStorageKey(datasetKey) {
  return `studio_preview_hiddenFields_${datasetKey || 'default'}` // { metrics: string[], dimensions: string[] }
}
function loadQuickSwitchers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUICK_SWITCHERS)
    if (!raw) return { metric: true, dimension: true }
    const v = JSON.parse(raw)
    return {
      metric: v?.metric !== false,
      dimension: v?.dimension !== false
    }
  } catch {
    return { metric: true, dimension: true }
  }
}
function saveQuickSwitchers(next) {
  try {
    localStorage.setItem(STORAGE_KEY_QUICK_SWITCHERS, JSON.stringify(next))
  } catch (_) {}
}

function loadHiddenFields(datasetKey) {
  try {
    const raw = localStorage.getItem(hiddenFieldsStorageKey(datasetKey))
    if (!raw) return { metrics: [], dimensions: [] }
    const v = JSON.parse(raw)
    return {
      metrics: Array.isArray(v?.metrics) ? v.metrics.filter((x) => typeof x === 'string') : [],
      dimensions: Array.isArray(v?.dimensions) ? v.dimensions.filter((x) => typeof x === 'string') : []
    }
  } catch {
    return { metrics: [], dimensions: [] }
  }
}
function saveHiddenFields(datasetKey, next) {
  try {
    localStorage.setItem(hiddenFieldsStorageKey(datasetKey), JSON.stringify(next))
  } catch (_) {}
}

export default function PreviewPanel({
  spec,
  setSpec,
  data,
  uploadedData,
  dataByDatasetId,
  defaultDatasetId,
  onTabDatasetChange,
  availableDatasetIds,
  schema,
  uploadedSchema,
  filterValues,
  setFilterValues,
  selectedWidget,
  onSelectWidget,
  loading,
  onLoadSampleData,
  onUploadClick,
  title = 'Dashboard preview',
  showTitleBar = true,
  className = ''
}) {
  const currentSchema = schema || (uploadedSchema?.fields && { fields: uploadedSchema.fields })
  const hasData = !!(data?.length || uploadedData?.length)
  const hasContent = spec && hasSpecContent(spec)

  const numericFields = useMemo(() => {
    const fields = currentSchema?.fields || []
    return fields.filter((f) => (f.type || '').toLowerCase() === 'number').map((f) => f.name)
  }, [currentSchema])
  const categoricalFields = useMemo(() => {
    const fields = currentSchema?.fields || []
    return fields
      .filter((f) => {
        const t = (f.type || '').toLowerCase()
        return t !== 'number' && t !== 'date'
      })
      .map((f) => f.name)
  }, [currentSchema])

  const [quickMetric, setQuickMetric] = useState('')
  const [quickDimension, setQuickDimension] = useState('')
  const [quickSwitchers, setQuickSwitchers] = useState(() => loadQuickSwitchers())
  const datasetKey = String(defaultDatasetId || 'default')
  const [hiddenFields, setHiddenFields] = useState(() => loadHiddenFields(datasetKey))
  const [showHiddenPanel, setShowHiddenPanel] = useState(false)

  // Initialize quick switchers when schema changes.
  useEffect(() => {
    if (!quickMetric && numericFields.length) setQuickMetric(numericFields[0])
    if (!quickDimension && categoricalFields.length) setQuickDimension(categoricalFields[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericFields.join('|'), categoricalFields.join('|')])

  useEffect(() => {
    saveQuickSwitchers(quickSwitchers)
  }, [quickSwitchers])

  useEffect(() => {
    // when dataset changes, reload per-dataset hidden fields
    setHiddenFields(loadHiddenFields(datasetKey))
    setShowHiddenPanel(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetKey])

  useEffect(() => {
    saveHiddenFields(datasetKey, hiddenFields)
  }, [datasetKey, hiddenFields])

  const applyQuickSwitch = useCallback((nextMetric, nextDim) => {
    setSpec((s) => applyQuickSwitchToSpec(s, { metric: nextMetric, dimension: nextDim }))
  }, [setSpec])

  const visibleNumericFields = useMemo(() => {
    const hidden = new Set(hiddenFields.metrics || [])
    return numericFields.filter((f) => !hidden.has(f))
  }, [numericFields, hiddenFields.metrics])
  const visibleCategoricalFields = useMemo(() => {
    const hidden = new Set(hiddenFields.dimensions || [])
    return categoricalFields.filter((f) => !hidden.has(f))
  }, [categoricalFields, hiddenFields.dimensions])

  // Ensure current selection is visible (after hiding or dataset changes)
  useEffect(() => {
    if (quickMetric && visibleNumericFields.length && !visibleNumericFields.includes(quickMetric)) {
      const next = visibleNumericFields[0]
      setQuickMetric(next)
      applyQuickSwitch(next, quickDimension)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNumericFields.join('|')])
  useEffect(() => {
    if (quickDimension && visibleCategoricalFields.length && !visibleCategoricalFields.includes(quickDimension)) {
      const next = visibleCategoricalFields[0]
      setQuickDimension(next)
      applyQuickSwitch(quickMetric, next)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCategoricalFields.join('|')])

  const onFilterOrderChange = useCallback((newFilters, tabIndex) => {
    setSpec((s) => {
      if (!s) return null
      if (tabIndex != null && s.tabs?.length) {
        return { ...s, tabs: s.tabs.map((t, i) => (i === tabIndex ? { ...t, filters: newFilters } : t)) }
      }
      return { ...s, filters: newFilters }
    })
  }, [setSpec])

  const onLayoutChange = useCallback((newLayout, tabIndex) => {
    setSpec((s) => {
      if (!s) return null
      if (tabIndex != null && s.tabs?.length) {
        return { ...s, tabs: s.tabs.map((t, i) => (i === tabIndex ? { ...t, layout: newLayout } : t)) }
      }
      return { ...s, layout: newLayout }
    })
  }, [setSpec])

  const onRemoveWidget = useCallback((id, type, tabIndex) => {
    setSpec((s) => {
      if (!s) return s
      if (tabIndex != null && s.tabs?.length) {
        return {
          ...s,
          tabs: s.tabs.map((t, i) => {
            if (i !== tabIndex) return t
            if (type === 'filter') return { ...t, filters: (t.filters || []).filter((f) => f.id !== id) }
            if (type === 'kpi') return { ...t, kpis: (t.kpis || []).filter((k) => k.id !== id) }
            return { ...t, charts: (t.charts || []).filter((c) => c.id !== id) }
          })
        }
      }
      if (type === 'filter') return { ...s, filters: (s.filters || []).filter((f) => f.id !== id) }
      if (type === 'kpi') return { ...s, kpis: (s.kpis || []).filter((k) => k.id !== id) }
      return { ...s, charts: (s.charts || []).filter((c) => c.id !== id) }
    })
  }, [setSpec])

  const onChartOptionChange = useCallback((chartId, options) => {
    setSpec((s) => {
      if (!s) return null
      if (s.tabs?.length) {
        const idx = s.tabs.findIndex((t) => (t.charts || []).some((c) => c.id === chartId))
        if (idx >= 0) {
          return {
            ...s,
            tabs: s.tabs.map((t, i) =>
              i === idx ? { ...t, charts: (t.charts || []).map((ch) => (ch.id === chartId ? { ...ch, ...options } : ch)) } : t
            )
          }
        }
      }
      return { ...s, charts: (s.charts || []).map((ch) => (ch.id === chartId ? { ...ch, ...options } : ch)) }
    })
  }, [setSpec])

  const handleDrop = (e) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData(DRAG_TYPE) || e.dataTransfer.getData('text/plain')
    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      return
    }
    if (!currentSchema?.fields?.length) return
    setSpec((s) => applyWidgetDrop(s, currentSchema, payload))
  }

  return (
    <div className={`flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 min-w-0 min-h-[320px] md:min-h-0 ${className}`}>
      {showTitleBar && (
        <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-2 shrink-0">
          <span className="font-semibold text-gray-900 text-sm truncate">{title}</span>
        </div>
      )}
      <div
        className="flex-1 overflow-y-auto p-4 min-w-0 min-h-[320px] relative"
        style={{ scrollbarGutter: 'stable', WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="min-h-[200px] flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
            <p className="mt-4 text-gray-600 text-sm">Generating…</p>
          </div>
        ) : !hasContent ? (
          <div className="min-h-[280px] flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 p-8 text-center">
            {!hasData ? (
              <>
                <p className="text-gray-700 font-medium">Choose a dataset on the Data page, or upload a file</p>
                <p className="text-sm text-gray-500 mt-1">Load data to start building your dashboard.</p>
                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                  {onLoadSampleData && (
                    <button type="button" onClick={onLoadSampleData} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                      Use sample dataset
                    </button>
                  )}
                  {onUploadClick && (
                    <button type="button" onClick={onUploadClick} className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                      Upload a file
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-700 font-medium">Ready to build</p>
                <p className="text-sm text-gray-500 mt-1">Send a message in Report Chat to generate your report.</p>
                <div className="flex flex-wrap gap-3 mt-6 justify-center">
                  <a href="/studio/chat" className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    Open Report Chat
                  </a>
                </div>
              </>
            )}
          </div>
        ) : (
          <ErrorBoundary>
            {(numericFields.length > 1 || categoricalFields.length > 1) && (
              <div className="mb-4 space-y-3">
                {numericFields.length > 1 && quickSwitchers.metric && (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-medium text-gray-600">View metric</p>
                      <div className="flex items-center gap-2">
                        {(hiddenFields.metrics?.length || hiddenFields.dimensions?.length) ? (
                          <button
                            type="button"
                            onClick={() => setShowHiddenPanel((v) => !v)}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                            title="Show hidden fields"
                          >
                            Hidden ({(hiddenFields.metrics?.length || 0) + (hiddenFields.dimensions?.length || 0)})
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setQuickSwitchers((q) => ({ ...q, metric: false }))}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                          title="Hide metric selector"
                          aria-label="Hide metric selector"
                        >
                          Hide
                        </button>
                      </div>
                    </div>
                    {showHiddenPanel && (
                      <div className="mb-2 p-2 rounded border border-gray-200 bg-gray-50 text-xs text-gray-700">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">Hidden buttons</span>
                          <button
                            type="button"
                            onClick={() => {
                              setHiddenFields({ metrics: [], dimensions: [] })
                              setShowHiddenPanel(false)
                            }}
                            className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                            title="Reset hidden fields"
                          >
                            Reset
                          </button>
                        </div>
                        {(hiddenFields.metrics?.length || 0) > 0 && (
                          <div className="mt-2">
                            <div className="text-[11px] text-gray-500 mb-1">Metrics</div>
                            <div className="flex flex-wrap gap-1.5">
                              {hiddenFields.metrics.map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setHiddenFields((h) => ({ ...h, metrics: (h.metrics || []).filter((x) => x !== m) }))}
                                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50"
                                  title="Restore metric button"
                                >
                                  Restore {formatFieldLabel(m) || m}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {(hiddenFields.dimensions?.length || 0) > 0 && (
                          <div className="mt-2">
                            <div className="text-[11px] text-gray-500 mb-1">Dimensions</div>
                            <div className="flex flex-wrap gap-1.5">
                              {hiddenFields.dimensions.map((d) => (
                                <button
                                  key={d}
                                  type="button"
                                  onClick={() => setHiddenFields((h) => ({ ...h, dimensions: (h.dimensions || []).filter((x) => x !== d) }))}
                                  className="px-2 py-1 rounded border border-gray-200 bg-white hover:bg-gray-50"
                                  title="Restore dimension button"
                                >
                                  Restore {formatFieldLabel(d) || d}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {(!hiddenFields.metrics?.length && !hiddenFields.dimensions?.length) ? (
                          <div className="mt-2 text-gray-500">No hidden fields.</div>
                        ) : null}
                      </div>
                    )}
                    <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 select-none" style={{ scrollbarGutter: 'stable' }}>
                      {visibleNumericFields.slice(0, 10).map((m) => {
                        const isLastVisible = visibleNumericFields.length <= 1
                        return (
                          <button
                            key={m}
                            type="button"
                            onMouseDown={() => {
                              setQuickMetric(m)
                              applyQuickSwitch(m, quickDimension)
                            }}
                            onClick={() => {
                              setQuickMetric(m)
                              applyQuickSwitch(m, quickDimension)
                            }}
                            className={`group flex items-center gap-2 flex-shrink-0 pl-3 pr-2 py-1.5 rounded-lg text-sm border transition-colors ${
                              quickMetric === m
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                            title={`Switch metric to: ${m}`}
                          >
                            <span className="truncate">{formatFieldLabel(m) || m}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isLastVisible) return
                                setHiddenFields((h) => ({ ...h, metrics: Array.from(new Set([...(h.metrics || []), m])) }))
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter' && e.key !== ' ') return
                                e.preventDefault()
                                e.stopPropagation()
                                if (isLastVisible) return
                                setHiddenFields((h) => ({ ...h, metrics: Array.from(new Set([...(h.metrics || []), m])) }))
                              }}
                              className={`w-5 h-5 inline-flex items-center justify-center rounded ${
                                isLastVisible ? 'opacity-30 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 hover:bg-black/10'
                              }`}
                              title={isLastVisible ? 'Keep at least one metric visible' : 'Remove this button'}
                              aria-label={`Remove metric button: ${m}`}
                            >
                              ×
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {categoricalFields.length > 1 && quickSwitchers.dimension && (
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-xs font-medium text-gray-600">View by</p>
                      <button
                        type="button"
                        onClick={() => setQuickSwitchers((q) => ({ ...q, dimension: false }))}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                        title="Hide dimension selector"
                        aria-label="Hide dimension selector"
                      >
                        Hide
                      </button>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 select-none" style={{ scrollbarGutter: 'stable' }}>
                      {visibleCategoricalFields.slice(0, 10).map((d) => {
                        const isLastVisible = visibleCategoricalFields.length <= 1
                        return (
                          <button
                            key={d}
                            type="button"
                            onMouseDown={() => {
                              setQuickDimension(d)
                              applyQuickSwitch(quickMetric, d)
                            }}
                            onClick={() => {
                              setQuickDimension(d)
                              applyQuickSwitch(quickMetric, d)
                            }}
                            className={`group flex items-center gap-2 flex-shrink-0 pl-3 pr-2 py-1.5 rounded-lg text-sm border transition-colors ${
                              quickDimension === d
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                            title={`Switch dimension to: ${d}`}
                          >
                            <span className="truncate">{formatFieldLabel(d) || d}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isLastVisible) return
                                setHiddenFields((h) => ({ ...h, dimensions: Array.from(new Set([...(h.dimensions || []), d])) }))
                              }}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter' && e.key !== ' ') return
                                e.preventDefault()
                                e.stopPropagation()
                                if (isLastVisible) return
                                setHiddenFields((h) => ({ ...h, dimensions: Array.from(new Set([...(h.dimensions || []), d])) }))
                              }}
                              className={`w-5 h-5 inline-flex items-center justify-center rounded ${
                                isLastVisible ? 'opacity-30 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100 hover:bg-black/10'
                              }`}
                              title={isLastVisible ? 'Keep at least one dimension visible' : 'Remove this button'}
                              aria-label={`Remove dimension button: ${d}`}
                            >
                              ×
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {(!quickSwitchers.metric || !quickSwitchers.dimension) && (
                  <div className="flex flex-wrap gap-2">
                    {!quickSwitchers.metric && numericFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuickSwitchers((q) => ({ ...q, metric: true }))}
                        className="text-xs px-2.5 py-1.5 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        title="Show metric selector"
                      >
                        Show metric selector
                      </button>
                    )}
                    {!quickSwitchers.dimension && categoricalFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuickSwitchers((q) => ({ ...q, dimension: true }))}
                        className="text-xs px-2.5 py-1.5 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        title="Show dimension selector"
                      >
                        Show dimension selector
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <DashboardRenderer
              spec={spec}
              data={data}
              dataByDatasetId={dataByDatasetId}
              defaultDatasetId={defaultDatasetId}
              onTabDatasetChange={onTabDatasetChange}
              availableDatasetIds={availableDatasetIds}
              filterValues={filterValues}
              onFilterChange={setFilterValues}
              onFilterOrderChange={onFilterOrderChange}
              onLayoutChange={onLayoutChange}
              onRemoveWidget={onRemoveWidget}
              onChartOptionChange={onChartOptionChange}
              selectedWidget={selectedWidget}
              onSelectWidget={onSelectWidget}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
