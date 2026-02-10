/**
 * PreviewPanel – Dashboard preview canvas with drag/drop, loading and empty states.
 * Used by Report Chat (right column) and Preview page (full width).
 */

import { useCallback } from 'react'
import DashboardRenderer from '../../../components/aiVisualBuilder/DashboardRenderer'
import ErrorBoundary from '../../../components/ErrorBoundary'
import { applyWidgetDrop } from '../../../components/aiVisualBuilder/reportCanvasDropUtils'
import { DRAG_TYPE } from '../../../components/aiVisualBuilder/ReportWidgetPalette'
import { hasSpecContent } from '../../../studio/utils/schemaUtils'

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
        style={{ scrollbarGutter: 'stable' }}
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
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
