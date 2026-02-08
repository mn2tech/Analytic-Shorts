import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient, { API_BASE_URL } from '../../config/api'
import { getPageFilters, getQueries } from '../utils/schemaUtils'
import StudioKPIWidget from './widgets/StudioKPIWidget'
import StudioLineChartWidget from './widgets/StudioLineChartWidget'
import StudioBarChartWidget from './widgets/StudioBarChartWidget'
import StudioDataTableWidget from './widgets/StudioDataTableWidget'
import StudioPieChartWidget from './widgets/StudioPieChartWidget'
import FilterBar from './FilterBar'

/**
 * PageRenderer - Renders sections and widgets for the current page
 * @param {Object} props
 * @param {Object} props.schema - App schema
 * @param {string} props.pageId - Current page ID
 * @param {Object} props.globalFilters - Global filter values
 * @param {Function} props.onFilterChange - Callback when filters change
 * @param {Function} props.onDrilldown - Callback for drilldown navigation
 * @param {Function} props.onOpenDataSource - Callback to open Data source settings (optional)
 * @param {boolean} props.isReadOnly - Whether in read-only (published) mode
 */
export default function PageRenderer({
  schema,
  pageId,
  globalFilters = {},
  onFilterChange,
  onDrilldown,
  isReadOnly = false,
  onOpenDataSource,
  onGenerateStarterDashboard,
  isGeneratingStarterDashboard = false,
  onAiCreate,
  aiLoading = false,
  aiError = null
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterValues, setFilterValues] = useState({})
  const [queryResults, setQueryResults] = useState({})
  const [queryLoading, setQueryLoading] = useState({})
  const [queryErrors, setQueryErrors] = useState({})
  const [dropdownOptions, setDropdownOptions] = useState({})
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [aiPrompt, setAiPrompt] = useState('')

  // Get page and its filters (memoize so effect deps are stable and don't change every render)
  const page = useMemo(
    () => schema?.pages?.find(p => p.id === pageId) || schema?.pages?.[0],
    [schema?.pages, pageId]
  )
  const pageFilters = useMemo(() => getPageFilters(schema, pageId), [schema, pageId])
  const queries = useMemo(() => getQueries(schema), [schema])
  const globalFiltersFromSchema = useMemo(() => schema?.global_filters ?? [], [schema?.global_filters])

  useEffect(() => {
    setActiveSectionIndex(0)
  }, [pageId])

  // Initialize filter values from URL params and global filters (only when page/schema/URL/parent filters change)
  useEffect(() => {
    const initialFilters = { ...globalFilters }
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const filterId = key.replace('filter_', '')
        if (value.startsWith('{') || value.startsWith('[')) {
          try {
            initialFilters[filterId] = JSON.parse(value)
          } catch {
            initialFilters[filterId] = value
          }
        } else {
          initialFilters[filterId] = value
        }
      }
    })
    globalFiltersFromSchema.forEach(filter => {
      if (filter.default !== undefined && initialFilters[filter.id] === undefined) {
        if (filter.type === 'time_range' && typeof filter.default === 'object') {
          initialFilters[filter.id] = filter.default
        } else {
          initialFilters[filter.id] = filter.default === 'All' ? null : filter.default
        }
      }
    })
    pageFilters.forEach(filter => {
      if (filter.default !== undefined && initialFilters[filter.id] === undefined) {
        if (filter.type === 'time_range' && typeof filter.default === 'object') {
          initialFilters[filter.id] = filter.default
        } else {
          initialFilters[filter.id] = filter.default === 'All' ? null : filter.default
        }
      }
    })
    setFilterValues(prev => {
      if (Object.keys(initialFilters).length !== Object.keys(prev).length) return initialFilters
      for (const k of Object.keys(initialFilters)) {
        const a = initialFilters[k]
        const b = prev[k]
        if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
          if (a?.start !== b?.start || a?.end !== b?.end) return initialFilters
        } else if (a !== b) return initialFilters
      }
      return prev
    })
  }, [pageId, globalFilters, pageFilters, globalFiltersFromSchema, searchParams])

  // Update URL params when filters change (do not call onFilterChange here to avoid loop with parent globalFilters)
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams)
    
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== 'All') {
        // Stringify objects (like time_range) for URL
        if (typeof value === 'object' && !Array.isArray(value)) {
          newParams.set(`filter_${key}`, JSON.stringify(value))
        } else {
          newParams.set(`filter_${key}`, String(value))
        }
      } else {
        newParams.delete(`filter_${key}`)
      }
    })

    setSearchParams(newParams, { replace: true })
  }, [filterValues, searchParams, setSearchParams])

  // Load dropdown options for every dropdown filter (use dimension/label/id as field name)
  useEffect(() => {
    const loadDropdownOptions = async () => {
      const options = {}
      const { datasetId, customEndpoint } = getDataSource(schema)
      const hasSource = datasetId || customEndpoint

      for (const filter of pageFilters) {
        if (filter.type !== 'dropdown') continue
        const fieldName = filter.dimension || filter.label || filter.id
        if (!fieldName) {
          options[filter.id] = []
          continue
        }
        if (!hasSource) {
          options[filter.id] = []
          continue
        }
        try {
          const response = await apiClient.get('/api/studio/options', {
            params: {
              ...(datasetId ? { datasetId } : {}),
              ...(customEndpoint ? { customEndpoint } : {}),
              field: fieldName
            }
          })
          options[filter.id] = response.data.values || response.data.options || []
        } catch (error) {
          console.error(`Error loading options for ${filter.id}:`, error)
          options[filter.id] = []
        }
      }

      setDropdownOptions(options)
    }

    if (schema && pageFilters.length > 0) {
      loadDropdownOptions()
    }
  }, [schema, pageFilters])

  // Execute queries for current page (debounced so date/filter changes don't cause endless loading)
  const queryTimeoutRef = useRef(null)

  useEffect(() => {
    if (!schema || !page) return

    const widgets = page.sections?.flatMap(s => s.widgets || []) || []
    const mergedFilterValues = { ...filterValues }
    globalFiltersFromSchema.forEach(f => {
      if (mergedFilterValues[f.id] === undefined) {
        if (f.type === 'time_range') mergedFilterValues[f.id] = f.default && typeof f.default === 'object' ? f.default : { start: '', end: '' }
        else mergedFilterValues[f.id] = f.default !== undefined ? f.default : 'All'
      }
    })
    pageFilters.forEach(f => {
      if (mergedFilterValues[f.id] === undefined) {
        if (f.type === 'time_range') mergedFilterValues[f.id] = f.default && typeof f.default === 'object' ? f.default : { start: '', end: '' }
        else mergedFilterValues[f.id] = f.default !== undefined ? f.default : 'All'
      }
    })
    const queryIds = Array.from(new Set(widgets.map(w => w.query_ref).filter(Boolean)))
    if (queryIds.length === 0) return

    const runQueries = async () => {
      queryIds.forEach(id => {
        setQueryLoading(prev => ({ ...prev, [id]: true }))
        setQueryErrors(prev => ({ ...prev, [id]: null }))
      })
      for (const queryId of queryIds) {
        const query = queries.find(q => q.id === queryId)
        if (!query) continue
        try {
          const { datasetId, customEndpoint } = getDataSource(schema)
          if (!datasetId && !customEndpoint) {
            setQueryLoading(prev => ({ ...prev, [queryId]: false }))
            setQueryErrors(prev => ({ ...prev, [queryId]: 'No dataset or API configured' }))
            continue
          }
          const response = await apiClient.post('/api/studio/query', {
            ...(datasetId ? { datasetId } : {}),
            ...(customEndpoint ? { customEndpoint } : {}),
            query,
            filterValues: mergedFilterValues
          })
          const queryResult = response.data?.result || response.data
          if (queryResult) {
            setQueryResults(prev => ({ ...prev, [queryId]: queryResult }))
          } else {
            setQueryErrors(prev => ({ ...prev, [queryId]: 'Query returned no data' }))
          }
        } catch (error) {
          const data = error.response?.data
          const msg = (data && (data.message || data.error)) || error.message || 'Query failed'
          setQueryErrors(prev => ({ ...prev, [queryId]: msg }))
        } finally {
          setQueryLoading(prev => ({ ...prev, [queryId]: false }))
        }
      }
    }

    if (queryTimeoutRef.current) clearTimeout(queryTimeoutRef.current)
    queryTimeoutRef.current = setTimeout(runQueries, 300)
    return () => clearTimeout(queryTimeoutRef.current)
  }, [schema, page, queries, filterValues, pageId, globalFiltersFromSchema, pageFilters])

  const handleFilterChange = (filterId, value) => {
    const updatedFilters = { ...filterValues, [filterId]: value }
    setFilterValues(updatedFilters)
    // Also notify parent component
    if (onFilterChange) {
      onFilterChange(updatedFilters)
    }
  }

  const handleWidgetClick = (widget, data) => {
    if (!widget.actions?.onClick) return

    const action = widget.actions.onClick
    if (action.type === 'navigate') {
      const drilldownFilters = { ...filterValues }

      // Pass specified filters
      if (action.passFilters) {
        action.passFilters.forEach(filterId => {
          if (filterValues[filterId] !== undefined) {
            drilldownFilters[filterId] = filterValues[filterId]
          }
        })
      }

      // Extract value from clicked data point
      if (action.passValueFrom && data) {
        const field = action.passValueFrom.field
        const filterId = action.passValueFrom.as || field
        const value = data[field] || data[field.toLowerCase()] || data[field.toUpperCase()]
        if (value !== undefined) {
          drilldownFilters[filterId] = value
        }
      }

      onDrilldown?.(action.targetPageId, drilldownFilters)
    }
  }

  if (!page) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-500">Page not found</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Filters */}
      {pageFilters.length > 0 && (
        <FilterBar
          filters={pageFilters}
          values={filterValues}
          options={dropdownOptions}
          onChange={handleFilterChange}
          isReadOnly={isReadOnly}
        />
      )}

      {/* Page Description */}
      {page.description && (
        <p className="text-gray-600 mb-6">{page.description}</p>
      )}

      {/* Empty state: no sections or all sections have no widgets */}
      {(() => {
        const hasNoContent = !page.sections?.length || page.sections.every((s) => !(s.widgets?.length))
        if (!hasNoContent) return null

        const hasDataSource = !!schema?.data_source?.endpoint

        if (hasDataSource && onAiCreate && !isReadOnly) {
          return (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white p-10 max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">What would you like to create?</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Describe in plain language. For example: &quot;Create a Data tab with a table, and a Graph tab with a pie chart, bar chart, and line chart.&quot;
              </p>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. Create a Data tab with a table, and a Graph tab with pie chart, bar chart, and line chart"
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={aiLoading}
              />
              {aiError && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{aiError}</div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onAiCreate(aiPrompt.trim())}
                  disabled={aiLoading || !aiPrompt.trim()}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Creating…
                    </>
                  ) : (
                    'Create'
                  )}
                </button>
                {onOpenDataSource && (
                  <button type="button" onClick={onOpenDataSource} className="text-sm text-gray-500 hover:text-gray-700">
                    Change data source
                  </button>
                )}
                {onGenerateStarterDashboard && (
                  <button
                    type="button"
                    onClick={onGenerateStarterDashboard}
                    disabled={isGeneratingStarterDashboard}
                    className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                  >
                    {isGeneratingStarterDashboard ? 'Generating…' : 'Or generate a starter Data + Graph'}
                  </button>
                )}
              </div>
            </div>
          )
        }

        return (
          <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No dashboard content yet</h3>
              <p className="text-gray-600 mb-6">
                {hasDataSource
                  ? 'Set a data source to describe what you want with AI (e.g. create a Data tab and a Graph tab with charts).'
                  : 'Choose a data source first, then describe what you want in plain language.'}
              </p>
              {!isReadOnly && onOpenDataSource && (
                <button
                  type="button"
                  onClick={onOpenDataSource}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Configure data source
                </button>
              )}
            </div>
          </div>
        )
      })()}

      {/* Data | Graph tabs when page has data-section + graph-section */}
      {page.sections?.length >= 2 &&
        page.sections.some((s) => s.id === 'data-section') &&
        page.sections.some((s) => s.id === 'graph-section') && (
          <div className="flex border-b border-gray-200 mb-6">
            {page.sections.map((section, idx) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionIndex(idx)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeSectionIndex === idx
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        )}

      {/* Sections (all if no tabs; only active if Data/Graph tabs) */}
      {(page.sections?.length >= 2 &&
       page.sections.some((s) => s.id === 'data-section') &&
       page.sections.some((s) => s.id === 'graph-section')
        ? [page.sections[activeSectionIndex]]
        : page.sections ?? []
      ).map((section) => (
        <div key={section.id} className="mb-8">
          {!(page.sections?.length >= 2 && page.sections.some((s) => s.id === 'data-section') && page.sections.some((s) => s.id === 'graph-section')) && (
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h2>
          )}
          <div
            className={`grid gap-6 ${
              section.layout === 'grid'
                ? `grid-cols-1 md:grid-cols-${section.columns || 2} lg:grid-cols-${section.columns || 3}`
                : 'grid-cols-1'
            }`}
          >
            {section.widgets?.map((widget) => {
              const queryId = widget.query_ref
              const queryResult = queryResults[queryId]
              const isLoading = queryLoading[queryId]
              const error = queryErrors[queryId]

              // Extract data from query result - backend returns { result: { data: [...] } or { value: ... } }
              // We already extracted result in executeQueries, so queryResult should be { data: [...] } or { value: ... }
              const queryData = queryResult || null

              // Create widget props object (no useMemo in map - violates Rules of Hooks)
              const widgetProps = {
                widget,
                queryData,
                isLoading: isLoading || false,
                error,
                config: widget.config,
                format: widget.format,
                onDrilldown: widget.actions?.onClick ? (data) => handleWidgetClick(widget, data) : null,
                dataSourceEndpoint: schema?.data_source?.endpoint ?? ''
              }

              switch (widget.type) {
                case 'kpi':
                  return <StudioKPIWidget key={widget.id} {...widgetProps} />
                case 'line_chart':
                  return <StudioLineChartWidget key={widget.id} {...widgetProps} />
                case 'bar_chart':
                  return <StudioBarChartWidget key={widget.id} {...widgetProps} />
                case 'data_table':
                  return <StudioDataTableWidget key={widget.id} {...widgetProps} />
                case 'pie_chart':
                  return <StudioPieChartWidget key={widget.id} {...widgetProps} />
                default:
                  return (
                    <div key={widget.id} className="bg-white rounded-lg shadow p-4">
                      <p className="text-gray-500">Unknown widget type: {widget.type}</p>
                    </div>
                  )
              }
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// Helper to get data source from schema: either built-in datasetId or custom API URL
function getDataSource(schema) {
  const endpoint = schema?.data_source?.endpoint ? String(schema.data_source.endpoint).trim() : ''
  // Fallback: if app has filters/queries but no endpoint (e.g. AI added filters first), use built-in sales
  const hasContent = (schema?.global_filters?.length || schema?.queries?.length) > 0
  if (!endpoint) {
    return hasContent ? { datasetId: 'sales', customEndpoint: null } : { datasetId: null, customEndpoint: null }
  }
  const isCustomUrl = endpoint.startsWith('http://') || endpoint.startsWith('https://')
  if (isCustomUrl) {
    // If URL points to our own /api/example/xxx, use datasetId so options/query use built-in data
    const match = endpoint.match(/\/api\/example\/(.+)$/)
    if (match) {
      const datasetId = match[1].replace(/%2F/g, '/')
      return { datasetId, customEndpoint: null }
    }
    return { datasetId: null, customEndpoint: endpoint }
  }
  // Built-in: extract dataset ID from endpoint like /api/example/sales -> sales, or plain "sales"
  const match = endpoint.match(/\/api\/example\/(.+)$/)
  const datasetId = match ? match[1].replace(/%2F/g, '/') : (endpoint.includes('/') ? null : endpoint)
  return { datasetId: datasetId || null, customEndpoint: datasetId ? null : (endpoint || null) }
}
