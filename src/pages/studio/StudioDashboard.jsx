import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { parseNumericValue } from '../../utils/numberUtils'
import sampleDashboardJson from '../../studio/examples/sample_dashboard.json'
import apiClient from '../../config/api'
import { getDashboard, saveDashboard } from '../../studio/api/studioClient'
import { generateShareId, saveSharedDashboard, getShareableUrl, copyToClipboard } from '../../utils/shareUtils'

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
  const [recommendations, setRecommendations] = useState(null)
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [shareId, setShareId] = useState(null)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Load dashboard schema
  useEffect(() => {
    const loadDashboardConfig = (dashboardConfig) => {
      try {
        console.log('Loading dashboard config:', dashboardConfig)
        if (!dashboardConfig) {
          console.error('Dashboard config is null or undefined')
          setLoading(false)
          return
        }
        setDashboard(dashboardConfig)
        setLoading(false)
        
        // Initialize filter values from defaults
        const initialFilters = {}
        if (dashboardConfig.filters && Array.isArray(dashboardConfig.filters)) {
          dashboardConfig.filters.forEach(filter => {
            if (filter.default) {
              initialFilters[filter.id] = filter.default
            } else {
              initialFilters[filter.id] = filter.type === 'time_range' ? { start: '', end: '' } : ''
            }
          })
        }
        setFilterValues(initialFilters)
      } catch (error) {
        console.error('Error in loadDashboardConfig:', error)
        setLoading(false)
      }
    }

    const loadDashboard = async () => {
      try {
        setLoading(true)
        console.log('Loading dashboard, dashboardId:', dashboardId)
        console.log('Sample dashboard JSON available:', !!sampleDashboardJson)
        console.log('Sample dashboard JSON content:', sampleDashboardJson)
        
        if (dashboardId === 'new' || dashboardId === 'sample') {
          // Load sample dashboard for new dashboards
          if (!sampleDashboardJson) {
            console.error('Sample dashboard JSON is not available')
            // Create a minimal dashboard as fallback
            const fallbackDashboard = {
              version: "1.0",
              metadata: {
                id: "new-dashboard",
                name: "New Dashboard",
                description: "Create your dashboard configuration",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              data_source: {
                type: "api",
                endpoint: "/api/example/sales",
                refresh_interval: 3600
              },
              filters: [],
              queries: [],
              sections: []
            }
            loadDashboardConfig(fallbackDashboard)
            setCurrentDashboardId(null)
            return
          }
          console.log('Loading sample dashboard')
          loadDashboardConfig(sampleDashboardJson)
          setCurrentDashboardId(null)
        } else {
          // Try to load from backend
          try {
            const schema = await getDashboard(dashboardId)
            console.log('Loaded schema from backend:', schema)
            if (schema) {
              // Schema might be a string (JSON) or already an object
              let parsedSchema = schema
              if (typeof schema === 'string') {
                try {
                  parsedSchema = JSON.parse(schema)
                } catch (parseError) {
                  console.error('Error parsing schema JSON:', parseError)
                  throw new Error('Invalid dashboard schema format')
                }
              }
              console.log('Parsed schema:', parsedSchema)
              loadDashboardConfig(parsedSchema)
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
        console.error('Error stack:', error.stack)
        // Fallback to minimal dashboard on any error
        const fallbackDashboard = {
          version: "1.0",
          metadata: {
            id: "error-dashboard",
            name: "Dashboard",
            description: "Error loading dashboard",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          data_source: {
            type: "api",
            endpoint: "/api/example/sales",
            refresh_interval: 3600
          },
          filters: [],
          queries: [],
          sections: []
        }
        loadDashboardConfig(fallbackDashboard)
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

  // Analyze data to detect column types
  const detectColumnTypes = (data) => {
    if (!data || data.length === 0) return { numeric: [], categorical: [], date: [] }
    
    const columns = Object.keys(data[0] || {})
    const numeric = []
    const categorical = []
    const date = []
    
    columns.forEach(col => {
      const values = data.slice(0, Math.min(100, data.length)).map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '')
      
      if (values.length === 0) return
      
      // Check if it's a date
      const datePattern = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}/
      const isDate = values.some(v => {
        const str = String(v)
        return datePattern.test(str) || !isNaN(Date.parse(str))
      })
      
      if (isDate) {
        date.push(col)
        return
      }
      
      // Check if it's numeric
      const numericCount = values.filter(v => {
        const num = parseNumericValue(v)
        return !isNaN(num) && isFinite(num)
      }).length
      
      if (numericCount / values.length > 0.8) {
        numeric.push(col)
      } else {
        categorical.push(col)
      }
    })
    
    return { numeric, categorical, date }
  }

  const handleGenerateDashboard = async () => {
    if (!data || data.length === 0) return

    try {
      setGeneratingRecommendations(true)
      setShowRecommendations(true)

      // Detect column types
      const { numeric, categorical, date } = detectColumnTypes(data)
      const columns = Object.keys(data[0] || {})

      // Call insights API for additional context
      let insightsText = ''
      try {
        const insightsResponse = await apiClient.post('/api/insights', {
          data: data.slice(0, 100), // Sample for insights
          columns: columns,
          isFiltered: false,
          totalRows: data.length,
          filteredRows: data.length,
          analyzedRows: Math.min(100, data.length)
        })
        insightsText = insightsResponse.data.insights?.join('\n') || ''
      } catch (error) {
        console.warn('Insights API call failed, continuing with recommendations:', error)
      }

      // Analyze and recommend measures (numeric columns)
      const recommendedMeasures = numeric
        .map(col => {
          const values = data.map(row => parseNumericValue(row[col])).filter(v => !isNaN(v) && isFinite(v))
          const sum = values.reduce((a, b) => a + b, 0)
          const avg = sum / values.length
          const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length
          const stdDev = Math.sqrt(variance)
          const cv = avg !== 0 ? (stdDev / avg) * 100 : 0 // Coefficient of variation
          
          // Prefer columns with meaningful names and good variance
          const isMetric = /amount|total|sum|count|quantity|price|cost|revenue|sales|income|value|score|rating|rate|percent/i.test(col)
          const score = (isMetric ? 10 : 0) + (cv > 10 ? 5 : 0) + (values.length > 0 ? 3 : 0)
          
          return { column: col, score, avg, sum, count: values.length }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.column)

      // Analyze and recommend dimensions (categorical columns)
      const recommendedDimensions = categorical
        .map(col => {
          const uniqueValues = new Set(data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== ''))
          const uniqueCount = uniqueValues.size
          const totalCount = data.length
          const ratio = uniqueCount / totalCount
          
          // Prefer columns with good cardinality (not too many, not too few unique values)
          const isDimension = /category|type|status|name|label|group|class|department|region|country|city|state|product|item/i.test(col)
          const score = (isDimension ? 10 : 0) + (ratio > 0.01 && ratio < 0.5 ? 5 : 0) + (uniqueCount > 2 && uniqueCount < 50 ? 3 : 0)
          
          return { column: col, score, uniqueCount, ratio }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.column)

      // Recommend filters (categorical and date columns with good cardinality)
      const recommendedFilters = [
        ...date.map(col => ({ column: col, type: 'date', priority: 10 })),
        ...categorical
          .filter(col => {
            const uniqueValues = new Set(data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== ''))
            const uniqueCount = uniqueValues.size
            return uniqueCount > 2 && uniqueCount < 20 // Good for dropdown filters
          })
          .map(col => {
            const isFilter = /region|state|country|category|type|status|department/i.test(col)
            return { column: col, type: 'dropdown', priority: isFilter ? 8 : 5 }
          })
      ]
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 5)

      setRecommendations({
        measures: recommendedMeasures,
        dimensions: recommendedDimensions,
        filters: recommendedFilters,
        insights: insightsText
      })
    } catch (error) {
      console.error('Error generating recommendations:', error)
      alert('Failed to generate recommendations: ' + (error.message || 'Unknown error'))
    } finally {
      setGeneratingRecommendations(false)
    }
  }

  const handleSave = async () => {
    if (!dashboard) return

    try {
      setSaving(true)
      setSaveError(null)
      setSaveSuccess(false)

      // Update filters with current filter values as defaults
      const updatedFilters = (dashboard.filters || []).map(filter => {
        const currentValue = filterValues[filter.id]
        if (currentValue !== undefined && currentValue !== null) {
          // For time_range filters, save both start and end
          if (filter.type === 'time_range' && typeof currentValue === 'object') {
            return {
              ...filter,
              default: {
                start: currentValue.start || filter.default?.start,
                end: currentValue.end || filter.default?.end
              }
            }
          }
          // For other filters, save the current value
          return {
            ...filter,
            default: currentValue
          }
        }
        return filter
      })

      // Update metadata with current timestamp
      const dashboardToSave = {
        ...dashboard,
        metadata: {
          ...dashboard.metadata,
          updated_at: new Date().toISOString(),
          id: currentDashboardId || dashboard.metadata?.id || `dashboard-${Date.now()}`
        },
        filters: updatedFilters
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

  const handlePublish = async () => {
    if (!dashboard) {
      console.error('Cannot publish: dashboard is null')
      setSaveError('Dashboard not loaded')
      return
    }

    try {
      setPublishing(true)
      setSaveError(null)
      setSaveSuccess(false)
      setShareLinkCopied(false)

      console.log('Starting publish process...')
      console.log('Dashboard:', dashboard)
      console.log('Current shareId:', shareId)

      // First, save the dashboard to ensure it's persisted
      console.log('Step 1: Saving dashboard...')
      await handleSave()
      console.log('Step 1: Dashboard saved successfully')

      // Generate a share ID if we don't have one
      let newShareId = shareId
      if (!newShareId) {
        console.log('Step 2: Generating new share ID...')
        newShareId = generateShareId()
        setShareId(newShareId)
        console.log('Step 2: Generated share ID:', newShareId)
      } else {
        console.log('Step 2: Using existing share ID:', newShareId)
      }

      // Prepare shared dashboard data
      console.log('Step 3: Preparing shared dashboard data...')
      const sharedData = {
        dashboard: dashboard,
        filterValues: filterValues,
        queryResults: queryResults,
        data: data,
        sharedAt: new Date().toISOString(),
        shareId: newShareId,
        dashboardType: 'studio'
      }
      console.log('Step 3: Shared data prepared:', {
        hasDashboard: !!sharedData.dashboard,
        hasFilterValues: !!sharedData.filterValues,
        hasData: !!sharedData.data,
        shareId: sharedData.shareId
      })

      // Save to localStorage for sharing
      console.log('Step 4: Saving to localStorage...')
      const saveResult = saveSharedDashboard(newShareId, sharedData)
      console.log('Step 4: Save result:', saveResult)
      
      if (saveResult) {
        const shareUrl = getShareableUrl(newShareId)
        console.log('Step 5: Share URL generated:', shareUrl)
        
        // Copy to clipboard
        console.log('Step 6: Copying to clipboard...')
        try {
          await navigator.clipboard.writeText(shareUrl)
          setShareLinkCopied(true)
          console.log('Step 6: Copied to clipboard successfully')
          setTimeout(() => setShareLinkCopied(false), 5000)
        } catch (err) {
          console.error('Failed to copy to clipboard:', err)
          // Don't fail the whole publish if clipboard fails
        }

        setSaveSuccess(true)
        console.log('Publish completed successfully!')
        setTimeout(() => setSaveSuccess(false), 5000)
      } else {
        console.error('Failed to save shared dashboard to localStorage')
        throw new Error('Failed to save shared dashboard. Please check browser console for details.')
      }
    } catch (error) {
      console.error('Error publishing dashboard:', error)
      console.error('Error stack:', error.stack)
      setSaveError(error.message || 'Failed to publish dashboard')
    } finally {
      setPublishing(false)
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

  // Get dashboard name and description safely
  const dashboardName = dashboard?.metadata?.name || dashboard?.name || 'Untitled Dashboard'
  const dashboardDescription = dashboard?.metadata?.description || dashboard?.description || ''

  // Wrap render in try-catch to prevent blank screen on errors
  try {
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
              {dashboardName}
            </h1>
            {dashboardDescription && (
              <p className="text-gray-600 mt-1">{dashboardDescription}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={handleSave}
              disabled={saving || !dashboard}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || saving || !dashboard}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {publishing ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Publishing...
                </>
              ) : (
                'Publish'
              )}
            </button>
            <button
              onClick={() => navigate('/studio')}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to Studio
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

        {/* Recommendations Panel */}
        {showRecommendations && recommendations && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Dashboard Recommendations</h2>
              <button
                onClick={() => setShowRecommendations(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Recommended Measures */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Recommended Measures
                </h3>
                <ul className="space-y-2">
                  {recommendations.measures.length > 0 ? (
                    recommendations.measures.map((measure, index) => (
                      <li key={measure} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-blue-600 font-medium">{index + 1}.</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{measure}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-400 italic">No numeric columns found</li>
                  )}
                </ul>
              </div>

              {/* Recommended Dimensions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Recommended Dimensions
                </h3>
                <ul className="space-y-2">
                  {recommendations.dimensions.length > 0 ? (
                    recommendations.dimensions.map((dimension, index) => (
                      <li key={dimension} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-purple-600 font-medium">{index + 1}.</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{dimension}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-400 italic">No categorical columns found</li>
                  )}
                </ul>
              </div>

              {/* Recommended Filters */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Recommended Filters
                </h3>
                <ul className="space-y-2">
                  {recommendations.filters.length > 0 ? (
                    recommendations.filters.map((filter, index) => (
                      <li key={filter.column} className="text-sm text-gray-600 flex items-center gap-2">
                        <span className="text-green-600 font-medium">{index + 1}.</span>
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{filter.column}</span>
                        <span className="text-xs text-gray-400">({filter.type})</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-400 italic">No suitable filter columns found</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Insights Preview (if available) */}
            {recommendations.insights && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Data Insights</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-600 whitespace-pre-line">{recommendations.insights}</p>
                </div>
              </div>
            )}
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
              No sections defined in dashboard. Use "Generate Dashboard" to get recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
    )
  } catch (error) {
    console.error('Error rendering StudioDashboard:', error)
    console.error('Error stack:', error.stack)
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Rendering Dashboard</h2>
            <p className="text-red-800 mb-4">{error.message || 'Unknown error occurred'}</p>
            <button
              onClick={() => navigate('/studio')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Studio
            </button>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-700 mb-2">Error Details (click to expand)</summary>
              <pre className="text-xs bg-red-100 p-2 rounded overflow-auto max-h-64">{error.stack}</pre>
            </details>
          </div>
        </div>
      </div>
    )
  }
}

export default StudioDashboard
