import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import apiClient, { API_BASE_URL } from '../../config/api'
import { getPageFilters, getQueries } from '../utils/schemaUtils'
import StudioKPIWidget from './widgets/StudioKPIWidget'
import StudioLineChartWidget from './widgets/StudioLineChartWidget'
import StudioBarChartWidget from './widgets/StudioBarChartWidget'
import FilterBar from './FilterBar'

/**
 * PageRenderer - Renders sections and widgets for the current page
 * @param {Object} props
 * @param {Object} props.schema - App schema
 * @param {string} props.pageId - Current page ID
 * @param {Object} props.globalFilters - Global filter values
 * @param {Function} props.onFilterChange - Callback when filters change
 * @param {Function} props.onDrilldown - Callback for drilldown navigation
 * @param {boolean} props.isReadOnly - Whether in read-only (published) mode
 */
export default function PageRenderer({
  schema,
  pageId,
  globalFilters = {},
  onFilterChange,
  onDrilldown,
  isReadOnly = false
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterValues, setFilterValues] = useState({})
  const [queryResults, setQueryResults] = useState({})
  const [queryLoading, setQueryLoading] = useState({})
  const [queryErrors, setQueryErrors] = useState({})
  const [dropdownOptions, setDropdownOptions] = useState({})

  // Get page and its filters
  const page = schema?.pages?.find(p => p.id === pageId) || schema?.pages?.[0]
  const pageFilters = getPageFilters(schema, pageId)
  const queries = getQueries(schema)
  
  // Also get global filters for initialization
  const globalFiltersFromSchema = schema?.global_filters || []

  // Initialize filter values from URL params and global filters
  useEffect(() => {
    const initialFilters = { ...globalFilters }
    
    // Load from URL params
    searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const filterId = key.replace('filter_', '')
        // Parse JSON strings (for time_range objects)
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

    // Set defaults from global filters first (they apply to all pages)
    globalFiltersFromSchema.forEach(filter => {
      if (filter.default !== undefined && initialFilters[filter.id] === undefined) {
        if (filter.type === 'time_range' && typeof filter.default === 'object') {
          initialFilters[filter.id] = filter.default
        } else {
          initialFilters[filter.id] = filter.default === 'All' ? null : filter.default
        }
      }
    })

    // Then set defaults from page-specific filters
    pageFilters.forEach(filter => {
      if (filter.default !== undefined && initialFilters[filter.id] === undefined) {
        if (filter.type === 'time_range' && typeof filter.default === 'object') {
          initialFilters[filter.id] = filter.default
        } else {
          initialFilters[filter.id] = filter.default === 'All' ? null : filter.default
        }
      }
    })

    console.log('Initialized filter values:', initialFilters)
    console.log('Global filters from schema:', globalFiltersFromSchema)
    console.log('Page filters:', pageFilters)
    setFilterValues(initialFilters)
  }, [pageId, globalFilters, pageFilters, globalFiltersFromSchema, searchParams])

  // Update URL params when filters change
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
    onFilterChange?.(filterValues)
  }, [filterValues, onFilterChange, searchParams, setSearchParams])

  // Load dropdown options
  useEffect(() => {
    const loadDropdownOptions = async () => {
      const options = {}
      
      for (const filter of pageFilters) {
        if (filter.type === 'dropdown' && filter.source === 'dimension') {
          try {
            const datasetId = getDatasetId(schema)
            if (datasetId) {
              console.log(`Loading options for filter ${filter.id}, datasetId: ${datasetId}, field: ${filter.dimension}`)
              console.log('API Base URL:', apiClient.defaults.baseURL || 'Not set (using relative)')
              const response = await apiClient.get('/api/studio/options', {
                params: {
                  datasetId,
                  field: filter.dimension
                }
              })
              // Backend returns { values: [...] } not { options: [...] }
              options[filter.id] = response.data.values || response.data.options || []
            }
          } catch (error) {
            console.error(`Error loading options for ${filter.id}:`, error)
            options[filter.id] = []
          }
        }
      }
      
      setDropdownOptions(options)
    }

    if (schema && pageFilters.length > 0) {
      loadDropdownOptions()
    }
  }, [schema, pageFilters])

  // Execute queries for current page
  useEffect(() => {
    const executeQueries = async () => {
      if (!schema || !page) {
        console.log('Skipping query execution - missing schema or page:', { hasSchema: !!schema, hasPage: !!page })
        return
      }

      const widgets = page.sections?.flatMap(s => s.widgets || []) || []
      const queryIds = new Set(widgets.map(w => w.query_ref).filter(Boolean))
      
      console.log('Executing queries for page:', pageId, 'Query IDs:', Array.from(queryIds))
      console.log('Current filter values:', filterValues)
      
      // Note: Queries will execute even if filterValues is empty - backend handles empty filters

      if (queryIds.size === 0) {
        console.warn('No queries found for widgets on this page')
        return
      }

      for (const queryId of queryIds) {
        const query = queries.find(q => q.id === queryId)
        if (!query) {
          console.warn(`Query ${queryId} not found in queries array`)
          continue
        }

        setQueryLoading(prev => ({ ...prev, [queryId]: true }))
        setQueryErrors(prev => ({ ...prev, [queryId]: null }))

        try {
          const datasetId = getDatasetId(schema)
          if (!datasetId) {
            console.warn(`No datasetId found for query ${queryId}, skipping`)
            setQueryLoading(prev => ({ ...prev, [queryId]: false }))
            setQueryErrors(prev => ({
              ...prev,
              [queryId]: 'No dataset configured'
            }))
            continue
          }

          // Use backend query API
          const apiUrl = `${API_BASE_URL || ''}/api/studio/query`
          console.log(`Executing query ${queryId} with datasetId: ${datasetId}, filters:`, filterValues)
          console.log('API Base URL:', API_BASE_URL || 'Not set (using relative)')
          console.log('Full API URL:', apiUrl)
          const response = await apiClient.post('/api/studio/query', {
            datasetId,
            query,
            filterValues
          })
          console.log(`Query ${queryId} response:`, response.data)
          
          // Extract result from response (backend returns { result: { data: [...] } or { value: ... }, queryId, rowCount })
          // The result object contains either { data: [...] } for charts or { value: ... } for KPIs
          const queryResult = response.data?.result || response.data
          console.log(`Query ${queryId} extracted result:`, queryResult)
          
          if (queryResult) {
            setQueryResults(prev => ({ ...prev, [queryId]: queryResult }))
          } else {
            console.warn(`Query ${queryId} returned no result`)
            setQueryErrors(prev => ({
              ...prev,
              [queryId]: 'Query returned no data'
            }))
          }
        } catch (error) {
          console.error(`Error executing query ${queryId}:`, error)
          console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          })
          setQueryErrors(prev => ({
            ...prev,
            [queryId]: error.response?.data?.error || error.response?.data?.message || error.message || 'Query failed'
          }))
        } finally {
          setQueryLoading(prev => ({ ...prev, [queryId]: false }))
        }
      }
    }

    executeQueries()
  }, [schema, page, queries, filterValues, pageId])

  const handleFilterChange = (filterId, value) => {
    setFilterValues(prev => ({ ...prev, [filterId]: value }))
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

      {/* Sections */}
      {page.sections?.map((section) => (
        <div key={section.id} className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h2>
          
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
                onDrilldown: widget.actions?.onClick ? (data) => handleWidgetClick(widget, data) : null
              }

              switch (widget.type) {
                case 'kpi':
                  return <StudioKPIWidget key={widget.id} {...widgetProps} />
                case 'line_chart':
                  return <StudioLineChartWidget key={widget.id} {...widgetProps} />
                case 'bar_chart':
                  return <StudioBarChartWidget key={widget.id} {...widgetProps} />
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

// Helper to extract dataset ID from schema
function getDatasetId(schema) {
  if (!schema?.data_source?.endpoint) return null
  
  const endpoint = schema.data_source.endpoint
  // Extract dataset ID from endpoint like /api/example/sales -> sales
  const match = endpoint.match(/\/api\/example\/(\w+)/)
  return match ? match[1] : null
}
