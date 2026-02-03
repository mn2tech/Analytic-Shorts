import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { parseNumericValue } from '../../utils/numberUtils'
import sampleDashboardJson from '../../studio/examples/sample_dashboard.json'
import apiClient from '../../config/api'
import { getDashboard, saveDashboard } from '../../studio/api/studioClient'

// Studio Widget Components
function StudioKPIWidget({ widget, queryData, format }) {
  if (!queryData || queryData.value === undefined) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Loading...
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
      <div className="text-sm text-gray-600 mb-2">{widget.title}</div>
      <div className="text-3xl font-bold text-gray-900">
        {formatValue(queryData.value)}
      </div>
      {widget.trend?.enabled && queryData.trend && (
        <div className={`text-sm mt-2 ${queryData.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {queryData.trend >= 0 ? '↑' : '↓'} {Math.abs(queryData.trend).toFixed(1)}%
        </div>
      )}
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

  return (
    <div className="h-full p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{widget.title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={queryData.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={config.x_axis} 
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
            type={config.curve || 'monotone'}
            dataKey={config.y_axis}
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

  return (
    <div className="h-full p-4 flex flex-col">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{widget.title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={queryData.data}
          layout={config.orientation === 'horizontal' ? 'vertical' : 'default'}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          {config.orientation === 'horizontal' ? (
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
              <YAxis type="category" dataKey={config.y_axis} width={100} stroke="#6b7280" style={{ fontSize: '12px' }} />
            </>
          ) : (
            <>
              <XAxis dataKey={config.x_axis} stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }}
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
            </>
          )}
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
            formatter={(value) => {
              const axisFormat = config.orientation === 'horizontal' ? format?.x_axis : format?.y_axis
              if (axisFormat?.type === 'currency') {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: axisFormat.currency || 'USD',
                  minimumFractionDigits: axisFormat.decimals || 0
                }).format(value)
              }
              return value
            }}
          />
          <Bar 
            dataKey={config.orientation === 'horizontal' ? config.x_axis : config.y_axis}
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}

function StudioWidget({ widget, queryResults }) {
  const queryData = queryResults[widget.query_ref]

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

  // Set appropriate height based on widget type
  const getWidgetHeight = () => {
    switch (widget.type) {
      case 'kpi':
        return 'h-32' // Smaller for KPIs
      case 'line_chart':
      case 'bar_chart':
        return 'h-80' // Fixed height for charts (320px)
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

function StudioDashboard() {
  const { dashboardId } = useParams()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [filterValues, setFilterValues] = useState({})
  const [queryResults, setQueryResults] = useState({})
  const [data, setData] = useState(null)
  const [currentDashboardId, setCurrentDashboardId] = useState(null)

  // Load dashboard schema
  useEffect(() => {
    const loadDashboardConfig = (dashboardConfig) => {
      setDashboard(dashboardConfig)
      setLoading(false)
      
      // Initialize filter values from defaults
      const initialFilters = {}
      if (dashboardConfig.filters) {
        dashboardConfig.filters.forEach(filter => {
          if (filter.default) {
            initialFilters[filter.id] = filter.default
          } else {
            initialFilters[filter.id] = filter.type === 'time_range' ? { start: '', end: '' } : ''
          }
        })
      }
      setFilterValues(initialFilters)
    }

    const loadDashboard = async () => {
      try {
        setLoading(true)
        
        if (dashboardId === 'new' || dashboardId === 'sample') {
          // Load sample dashboard for new dashboards
          loadDashboardConfig(sampleDashboardJson)
          setCurrentDashboardId(null)
        } else {
          // Try to load from backend
          try {
            const schema = await getDashboard(dashboardId)
            if (schema) {
              loadDashboardConfig(schema)
              setCurrentDashboardId(dashboardId)
            } else {
              // Fallback to sample if not found
              console.warn('Dashboard not found, loading sample')
              loadDashboardConfig(sampleDashboardJson)
              setCurrentDashboardId(null)
            }
          } catch (error) {
            console.error('Error loading dashboard:', error)
            // If it's a 404 or auth error, still load sample but show message
            if (error.message?.includes('not found')) {
              loadDashboardConfig(sampleDashboardJson)
              setCurrentDashboardId(null)
            } else {
              // For other errors, still try to load sample
              loadDashboardConfig(sampleDashboardJson)
              setCurrentDashboardId(null)
            }
          }
        }
      } catch (error) {
        console.error('Error in loadDashboard:', error)
        // Fallback to sample on any error
        loadDashboardConfig(sampleDashboardJson)
        setCurrentDashboardId(null)
      }
    }

    loadDashboard()
  }, [dashboardId])

  // Load data from data source
  useEffect(() => {
    if (!dashboard?.data_source) return

    const loadData = async () => {
      try {
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
      }
    }

    loadData()
  }, [dashboard])

  // Execute queries based on filter values and data
  useEffect(() => {
    if (!dashboard || !data || data.length === 0) {
      console.log('Query execution skipped:', { hasDashboard: !!dashboard, hasData: !!data, dataLength: data?.length })
      return
    }

    console.log('Executing queries with data:', data.length, 'rows')
    console.log('Available columns:', data.length > 0 ? Object.keys(data[0]) : [])

    const executeQueries = () => {
      const results = {}

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
              // Try multiple date column name variations
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

  const handleSave = async () => {
    if (!dashboard) return

    try {
      setSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      // Update metadata with current timestamp
      const dashboardToSave = {
        ...dashboard,
        metadata: {
          ...dashboard.metadata,
          updated_at: new Date().toISOString(),
          id: currentDashboardId || dashboard.metadata?.id || `dashboard-${Date.now()}`
        }
      }

      const saved = await saveDashboard(dashboardToSave, currentDashboardId)
      
      // Update current dashboard ID if it was a new dashboard
      if (!currentDashboardId && saved.id) {
        setCurrentDashboardId(saved.id)
        // Update URL without reload
        window.history.replaceState({}, '', `/studio/${saved.id}`)
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving dashboard:', error)
      setSaveError(error.message || 'Failed to save dashboard')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading dashboard...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-500">
            <p>Dashboard not found</p>
            <button
              onClick={() => navigate('/studio')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Studio
            </button>
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
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/studio')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Studio
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {dashboard.metadata.name}
            </h1>
            {dashboard.metadata.description && (
              <p className="text-gray-600 mt-1">{dashboard.metadata.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => navigate('/studio')}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => navigate('/studio')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Publish
            </button>
          </div>
        </div>

        {/* Save Status Messages */}
        {saveSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm">Dashboard saved successfully!</p>
          </div>
        )}
        {saveError && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{saveError}</p>
          </div>
        )}

        {/* Filters */}
        {dashboard.filters && dashboard.filters.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Filters</h2>
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
                        value={filterValues[filter.id]?.start || ''}
                        onChange={(e) => handleFilterChange(filter.id, {
                          ...filterValues[filter.id],
                          start: e.target.value
                        })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="date"
                        value={filterValues[filter.id]?.end || ''}
                        onChange={(e) => handleFilterChange(filter.id, {
                          ...filterValues[filter.id],
                          end: e.target.value
                        })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  ) : filter.type === 'dropdown' ? (
                    <select
                      value={filterValues[filter.id] || filter.default || 'All'}
                      onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="All">All</option>
                      {data && filter.dimension && (() => {
                        const uniqueValues = [...new Set(data.map(row => row[filter.dimension] || row[filter.dimension.toLowerCase()]).filter(Boolean))]
                        return uniqueValues.map(value => (
                          <option key={value} value={value}>{value}</option>
                        ))
                      })()}
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {dashboard.sections && dashboard.sections.map(section => (
          <div key={section.id} className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{section.title}</h2>
            <div 
              className={`grid gap-6 ${
                section.columns === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                section.columns === 2 ? 'grid-cols-1 md:grid-cols-2' :
                'grid-cols-1'
              }`}
            >
              {section.widgets.map(widget => (
                <StudioWidget
                  key={widget.id}
                  widget={widget}
                  queryResults={queryResults}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StudioDashboard
