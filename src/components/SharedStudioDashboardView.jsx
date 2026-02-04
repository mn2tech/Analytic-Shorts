import { useState, useEffect } from 'react'
import Navbar from './Navbar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import apiClient from '../config/api'
import { parseNumericValue } from '../utils/numberUtils'

// Studio Widget Components (copied from StudioDashboard.jsx)
function StudioKPIWidget({ widget, queryData, format }) {
  if (!queryData || queryData.value === undefined) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No data
      </div>
    )
  }

  const formatValue = (value) => {
    if (format?.type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: format.currency || 'USD',
        minimumFractionDigits: format.decimals || 0,
        maximumFractionDigits: format.decimals || 0
      }).format(value)
    }
    if (format?.type === 'percentage') {
      return `${value.toFixed(format.decimals || 1)}%`
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: format.decimals || 0,
      maximumFractionDigits: format.decimals || 0
    }).format(value)
  }

  return (
    <div className="h-full flex flex-col justify-center p-4">
      <div className="text-sm text-gray-600 mb-1">{widget.title}</div>
      <div className="text-3xl font-bold text-gray-900">{formatValue(queryData.value)}</div>
    </div>
  )
}

function StudioLineChartWidget({ widget, queryData, config, format }) {
  if (!queryData || !queryData.data || queryData.data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    )
  }

  const xAxisKey = config?.x_axis || config?.xAxis || Object.keys(queryData.data[0] || {})[0] || 'x'
  const yAxisKey = config?.y_axis || config?.yAxis || Object.keys(queryData.data[0] || {})[1] || 'value'

  console.log('LineChart data keys:', {
    xAxisKey,
    yAxisKey,
    sampleData: queryData.data[0],
    dataLength: queryData.data.length
  })

  return (
    <div className="h-full p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{widget.title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={queryData.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey={xAxisKey} 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => {
                if (format?.y_axis?.type === 'currency') {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: format.y_axis.currency || 'USD',
                    notation: 'compact'
                  }).format(value)
                }
                return value
              }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              formatter={(value) => {
                if (format?.y_axis?.type === 'currency') {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: format.y_axis.currency || 'USD',
                    minimumFractionDigits: format.y_axis.decimals || 0
                  }).format(value)
                }
                return value
              }}
            />
            <Line 
              type={config?.curve || 'monotone'}
              dataKey={yAxisKey}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StudioBarChartWidget({ widget, queryData, config, format }) {
  if (!queryData || !queryData.data || queryData.data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    )
  }

  const xAxisKey = config?.x_axis || config?.xAxis || Object.keys(queryData.data[0] || {})[0] || 'x'
  const yAxisKey = config?.y_axis || config?.yAxis || Object.keys(queryData.data[0] || {})[1] || 'value'

  console.log('BarChart data keys:', {
    xAxisKey,
    yAxisKey,
    sampleData: queryData.data[0],
    dataLength: queryData.data.length
  })

  return (
    <div className="h-full p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{widget.title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={queryData.data}
            layout={config?.orientation === 'horizontal' ? 'vertical' : 'default'}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            {config?.orientation === 'horizontal' ? (
              <>
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }}
                  tickFormatter={(value) => {
                    if (format?.x_axis?.type === 'currency') {
                      return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: format.x_axis.currency || 'USD',
                        notation: 'compact'
                      }).format(value)
                    }
                    return value
                  }}
                />
                <YAxis type="category" dataKey={yAxisKey} width={100} stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Bar dataKey={xAxisKey} fill="#3b82f6" />
              </>
            ) : (
              <>
                <XAxis 
                  dataKey={xAxisKey}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => {
                    if (format?.y_axis?.type === 'currency') {
                      return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: format.y_axis.currency || 'USD',
                        notation: 'compact'
                      }).format(value)
                    }
                    return value
                  }}
                />
                <Bar dataKey={yAxisKey} fill="#3b82f6" />
              </>
            )}
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              formatter={(value) => {
                if (format?.y_axis?.type === 'currency') {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: format.y_axis.currency || 'USD',
                    minimumFractionDigits: format.y_axis.decimals || 0
                  }).format(value)
                }
                return value
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StudioWidget({ widget, queryResults }) {
  const queryData = queryResults[widget.query_ref]

  console.log(`Widget ${widget.id} (${widget.type}):`, {
    query_ref: widget.query_ref,
    hasQueryData: !!queryData,
    queryDataKeys: queryData ? Object.keys(queryData) : [],
    hasData: !!(queryData?.data),
    dataLength: queryData?.data?.length
  })

  const renderWidget = () => {
    switch (widget.type) {
      case 'kpi':
        return <StudioKPIWidget widget={widget} queryData={queryData} format={widget.format} />
      case 'line_chart':
        return <StudioLineChartWidget widget={widget} queryData={queryData} config={widget.config} format={widget.format} />
      case 'bar_chart':
        return <StudioBarChartWidget widget={widget} queryData={queryData} config={widget.config} format={widget.format} />
      default:
        return <div className="h-full flex items-center justify-center text-gray-400 text-sm">Unknown widget type: {widget.type}</div>
    }
  }

  const getWidgetHeight = () => {
    switch (widget.type) {
      case 'kpi':
        return 'h-32'
      case 'line_chart':
      case 'bar_chart':
        return 'h-80'
      default:
        return 'h-64'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${getWidgetHeight()}`}>
      {renderWidget()}
    </div>
  )
}

export default function SharedStudioDashboardView({ sharedData }) {
  const dashboard = sharedData?.dashboard
  const [filterValues, setFilterValues] = useState(sharedData?.filterValues || {})
  const [data, setData] = useState(sharedData?.data || null)
  const [queryResults, setQueryResults] = useState(sharedData?.queryResults || {})
  const [loading, setLoading] = useState(false)

  console.log('SharedStudioDashboardView initialized:', {
    hasDashboard: !!dashboard,
    hasFilterValues: !!sharedData?.filterValues,
    hasData: !!sharedData?.data,
    dataLength: sharedData?.data?.length,
    hasQueryResults: !!sharedData?.queryResults,
    queryResultsKeys: Object.keys(sharedData?.queryResults || {})
  })

  // Load data from data_source if available
  useEffect(() => {
    if (!dashboard?.data_source) {
      console.log('No data_source in dashboard, using saved data')
      return
    }

    const loadData = async () => {
      try {
        setLoading(true)
        if (dashboard.data_source.type === 'api' && dashboard.data_source.endpoint) {
          console.log('Loading data from:', dashboard.data_source.endpoint)
          const response = await apiClient.get(dashboard.data_source.endpoint)
          const result = response.data
          console.log('Data loaded:', result?.data?.length || 0, 'rows')
          if (result.data) {
            setData(result.data)
          } else {
            console.error('No data in response:', result)
          }
        }
      } catch (error) {
        console.error('Error loading data:', error)
        console.error('Error details:', error.response?.data || error.message)
        // If data loading fails, use saved data
        const savedData = sharedData?.data
        if (savedData) {
          console.log('Using saved data as fallback')
          setData(savedData)
        }
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [dashboard?.data_source, sharedData?.data])

  // Execute queries based on filter values and data
  useEffect(() => {
    const savedQueryResults = sharedData?.queryResults
    if (!dashboard || !data || data.length === 0) {
      console.log('Query execution skipped:', { 
        hasDashboard: !!dashboard, 
        hasData: !!data, 
        dataLength: data?.length,
        usingSavedQueryResults: Object.keys(savedQueryResults || {}).length > 0
      })
      // Use saved queryResults if available
      if (savedQueryResults && Object.keys(savedQueryResults).length > 0) {
        setQueryResults(savedQueryResults)
      }
      return
    }

    console.log('Executing queries with data:', data.length, 'rows')
    console.log('Available columns:', data.length > 0 ? Object.keys(data[0]) : [])
    console.log('Filter values:', filterValues)

    const executeQueries = () => {
      const results = {}

      if (!dashboard.queries || !Array.isArray(dashboard.queries)) {
        console.warn('No queries defined in dashboard')
        return
      }

      dashboard.queries.forEach(query => {
        try {
          // Replace filter references with actual values
          const resolvedFilters = {}
          Object.keys(query.filters || {}).forEach(key => {
            const filterValue = query.filters[key]
            if (typeof filterValue === 'string' && filterValue.startsWith('{{filters.')) {
              const filterId = filterValue.replace('{{filters.', '').replace('}}', '')
              resolvedFilters[key] = filterValues[filterId]
            } else {
              resolvedFilters[key] = filterValue
            }
          })

          // Apply filters to data
          let filteredData = [...data]
          
          if (resolvedFilters.time_range?.start && resolvedFilters.time_range?.end) {
            filteredData = filteredData.filter(row => {
              const rowDate = row['Date'] || row['date'] || row['Award Date'] || row['award_date'] || row['Record Date'] || row['record_date']
              if (!rowDate) return false
              try {
                const date = new Date(rowDate)
                const start = new Date(resolvedFilters.time_range.start)
                const end = new Date(resolvedFilters.time_range.end)
                return date >= start && date <= end
              } catch {
                return false
              }
            })
          }

          if (resolvedFilters.region && resolvedFilters.region !== 'All') {
            filteredData = filteredData.filter(row => {
              const region = row['Region'] || row['region'] || row['State'] || row['state']
              return region === resolvedFilters.region
            })
          }

          // Helper to find column name (case-insensitive)
          const findColumn = (name) => {
            const keys = Object.keys(filteredData[0] || {})
            return keys.find(k => k.toLowerCase() === name.toLowerCase()) || name
          }

          // Execute query based on type
          if (query.type === 'aggregation') {
            const metric = findColumn(query.metric)
            const values = filteredData
              .map(row => parseNumericValue(row[metric]))
              .filter(val => !isNaN(val) && isFinite(val))
            
            console.log(`Query ${query.id} (${query.type}): metric=${metric}, values found=${values.length}`)
            
            let value = 0
            if (query.aggregation === 'sum') {
              value = values.reduce((a, b) => a + b, 0)
            } else if (query.aggregation === 'avg') {
              value = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
            } else if (query.aggregation === 'count') {
              value = values.length
            } else if (query.aggregation === 'min') {
              value = values.length > 0 ? Math.min(...values) : 0
            } else if (query.aggregation === 'max') {
              value = values.length > 0 ? Math.max(...values) : 0
            }

            results[query.id] = { value }
          } else if (query.type === 'time_series') {
            const metric = findColumn(query.metric)
            const dimension = findColumn(query.dimension)
            const grouped = {}

            filteredData.forEach(row => {
              const key = row[dimension]
              const value = parseNumericValue(row[metric])
              if (key && !isNaN(value) && isFinite(value)) {
                grouped[key] = (grouped[key] || 0) + value
              }
            })

            const data = Object.entries(grouped)
              .map(([key, value]) => ({ [dimension]: key, [metric]: value }))
              .sort((a, b) => {
                try {
                  return new Date(a[dimension]) - new Date(b[dimension])
                } catch {
                  return a[dimension].localeCompare(b[dimension])
                }
              })

            console.log(`Query ${query.id} (${query.type}): metric=${metric}, dimension=${dimension}, data points=${data.length}`)
            results[query.id] = { data }
          } else if (query.type === 'breakdown') {
            const metric = findColumn(query.metric)
            const dimension = findColumn(query.dimension)
            const grouped = {}

            filteredData.forEach(row => {
              const key = row[dimension]
              const value = parseNumericValue(row[metric])
              if (key && !isNaN(value) && isFinite(value)) {
                grouped[key] = (grouped[key] || 0) + value
              }
            })

            let data = Object.entries(grouped)
              .map(([key, value]) => ({ [dimension]: key, [metric]: value }))

            if (query.order_by) {
              const orderByCol = findColumn(query.order_by)
              data.sort((a, b) => {
                const aVal = a[orderByCol] || a[metric]
                const bVal = b[orderByCol] || b[metric]
                if (query.order_direction === 'desc') {
                  return bVal - aVal
                }
                return aVal - bVal
              })
            }

            if (query.limit) {
              data = data.slice(0, query.limit)
            }

            console.log(`Query ${query.id} (${query.type}): metric=${metric}, dimension=${dimension}, data points=${data.length}`)
            results[query.id] = { data }
          }
        } catch (error) {
          console.error(`Error executing query ${query.id}:`, error)
          results[query.id] = { error: error.message }
        }
      })

      console.log('Query results:', results)
      setQueryResults(results)
    }

    executeQueries()
  }, [dashboard, data, filterValues])

  const handleFilterChange = (filterId, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterId]: value
    }))
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Dashboard Not Found</h2>
            <p className="text-red-700 mb-4">The shared Studio dashboard could not be loaded.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  const dashboardName = dashboard.metadata?.name || 'Untitled Dashboard'
  const dashboardDescription = dashboard.metadata?.description || ''

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-blue-800 text-sm">
              📊 <strong>Shared Studio Dashboard</strong> - This is a read-only view
            </p>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {dashboardName}
          </h1>
          {dashboardDescription && (
            <p className="text-gray-600 mt-1">{dashboardDescription}</p>
          )}
        </div>

        {/* Filters (Interactive but read-only note) */}
        {dashboard.filters && dashboard.filters.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
              <span className="text-xs text-gray-500 italic">Changes are for viewing only (not saved)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.filters.map(filter => (
                <div key={filter.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {filter.label}
                  </label>
                  {filter.type === 'time_range' ? (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={filterValues[filter.id]?.start || filter.default?.start || ''}
                        onChange={(e) => handleFilterChange(filter.id, { ...filterValues[filter.id], start: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={filterValues[filter.id]?.end || filter.default?.end || ''}
                        onChange={(e) => handleFilterChange(filter.id, { ...filterValues[filter.id], end: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ) : filter.type === 'select' && filter.options ? (
                    <select
                      value={filterValues[filter.id] || filter.default || 'All'}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="All">All</option>
                      {filter.options.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={filterValues[filter.id] || filter.default || 'All'}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {dashboard.sections && Array.isArray(dashboard.sections) && dashboard.sections.length > 0 ? (
          dashboard.sections.map(section => (
            <div key={section.id} className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.title || 'Section'}</h2>
              <div 
                className={`grid gap-6 ${
                  section.columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                  section.columns === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1'
                }`}
              >
                {section.widgets && Array.isArray(section.widgets) ? (
                  section.widgets.map(widget => (
                    <StudioWidget
                      key={widget.id}
                      widget={widget}
                      queryResults={queryResults}
                    />
                  ))
                ) : (
                  <div className="text-gray-400 text-sm">No widgets in this section</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              No sections defined in this dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
