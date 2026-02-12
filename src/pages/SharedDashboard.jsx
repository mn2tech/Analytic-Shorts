import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Loader from '../components/Loader'
import DashboardCharts from '../components/DashboardCharts'
import AdvancedDashboard from '../components/AdvancedDashboard'
import TabNavigation from '../components/TabNavigation'
import MetricCards from '../components/MetricCards'
import Filters from '../components/Filters'
import AIInsights from '../components/AIInsights'
import { loadSharedDashboard } from '../utils/shareUtils'
import SharedStudioDashboardView from '../components/SharedStudioDashboardView'
import DashboardRenderer from '../components/aiVisualBuilder/DashboardRenderer'
import { applyQuickSwitchToSpec } from '../studio/utils/specQuickSwitch'

function inferFieldsFromRows(rows) {
  const sample = Array.isArray(rows) ? rows.slice(0, 200) : []
  const columns = sample.length ? Object.keys(sample[0] || {}) : []
  const looksLikeDate = (v) => {
    if (v == null || v === '') return false
    const s = String(v).trim()
    if (!s) return false
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return true
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) return true
    const d = new Date(s)
    return !Number.isNaN(d.getTime())
  }
  const looksLikeNumber = (v) => {
    if (v == null || v === '') return false
    if (typeof v === 'number') return Number.isFinite(v)
    const s = String(v).trim()
    if (!s) return false
    const cleaned = s
      .replace(/^\((.*)\)$/, '-$1')
      .replace(/[$€£¥₦₹₩₫฿₽₺₴₱,\s]/g, '')
      .replace(/^"|"$/g, '')
    return /^-?\d+(\.\d+)?$/.test(cleaned)
  }

  const numericFields = []
  const dateFields = []
  const categoricalFields = []
  for (const col of columns) {
    let attempted = 0
    let numOk = 0
    let dateOk = 0
    for (const r of sample) {
      const v = r?.[col]
      if (v == null || v === '') continue
      attempted++
      if (looksLikeNumber(v)) numOk++
      if (looksLikeDate(v)) dateOk++
    }
    const numRatio = attempted ? numOk / attempted : 0
    const dateRatio = attempted ? dateOk / attempted : 0
    if (dateRatio >= 0.6) dateFields.push(col)
    else if (numRatio >= 0.6) numericFields.push(col)
    else categoricalFields.push(col)
  }

  return { columns, numericFields, dateFields, categoricalFields }
}

function SharedDashboard() {
  const navigate = useNavigate()
  const { shareId } = useParams()
  const [data, setData] = useState(null)
  const [filteredData, setFilteredData] = useState(null)
  const [columns, setColumns] = useState([])
  const [numericColumns, setNumericColumns] = useState([])
  const [categoricalColumns, setCategoricalColumns] = useState([])
  const [dateColumns, setDateColumns] = useState([])
  const [selectedNumeric, setSelectedNumeric] = useState('')
  const [selectedCategorical, setSelectedCategorical] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [chartFilter, setChartFilter] = useState(null)
  const [sidebarFilteredData, setSidebarFilteredData] = useState(null)
  const [dashboardView, setDashboardView] = useState('advanced') // Default to advanced
  const [activeTab, setActiveTab] = useState('Overview')
  const [dashboardTitle, setDashboardTitle] = useState('Analytics Dashboard')
  const [studioDashboardData, setStudioDashboardData] = useState(null)
  const [dashboardSpecData, setDashboardSpecData] = useState(null)
  const [dashboardSpecViewSpec, setDashboardSpecViewSpec] = useState(null)
  const [filterValues, setFilterValues] = useState({})
  const [fullScreen, setFullScreen] = useState(false)
  const lastAutoTitleMetric = useRef('')
  const MAX_METRIC_TABS = 10
  const MAX_CATEGORY_TABS = 12
  const [specQuickMetric, setSpecQuickMetric] = useState('')
  const [specQuickDimension, setSpecQuickDimension] = useState('')
  const specFields = useMemo(() => inferFieldsFromRows(dashboardSpecData?.data || []), [dashboardSpecData])

  const formatFieldLabel = useCallback((field) => {
    const raw = String(field || '').trim()
    if (!raw) return ''
    const lower = raw.toLowerCase()
    if (lower === 'adr') return 'ADR'
    if (lower === 'revpar') return 'RevPAR'
    if (lower === 'occupancy_rate') return 'Occupancy Rate'

    const withSpaces = raw
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .trim()

    return withSpaces
      .split(/\s+/)
      .map((w) => {
        const wl = w.toLowerCase()
        if (wl === 'id') return 'ID'
        if (wl === 'api') return 'API'
        if (wl === 'usd') return 'USD'
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      })
      .join(' ')
  }, [])

  // Match /dashboard behavior: auto-adjust title to the selected metric.
  useEffect(() => {
    if (!selectedNumeric) return
    const pretty = formatFieldLabel(selectedNumeric)
    if (!pretty) return
    if (lastAutoTitleMetric.current === selectedNumeric) return
    lastAutoTitleMetric.current = selectedNumeric
    setDashboardTitle(pretty)
  }, [selectedNumeric, formatFieldLabel])

  // Initialize spec quick-switch defaults when the shared spec loads.
  useEffect(() => {
    if (!dashboardSpecData) return
    if (!specQuickMetric && specFields.numericFields.length) setSpecQuickMetric(specFields.numericFields[0])
    if (!specQuickDimension && specFields.categoricalFields.length) setSpecQuickDimension(specFields.categoricalFields[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardSpecData, specFields.numericFields.join('|'), specFields.categoricalFields.join('|')])

  const metricTabs = useMemo(() => {
    const cols = Array.isArray(numericColumns) ? numericColumns : []
    if (cols.length < 2) return null

    const score = (col) => {
      const s = String(col || '').toLowerCase()
      if (!s) return -Infinity
      if (s.includes('id') || s.includes('uuid') || s.includes('code') || s.includes('zip') || s.includes('phone')) return -50
      let v = 0
      if (s.includes('revenue') || s.includes('sales') || s.includes('amount') || s.includes('total')) v += 100
      if (s.includes('cost') || s.includes('expense') || s.includes('spend')) v += 90
      if (s.includes('rooms_sold') || (s.includes('rooms') && s.includes('sold'))) v += 85
      if (s.includes('rooms_occupied') || (s.includes('rooms') && s.includes('occupied'))) v += 80
      if (s.includes('arrivals') || s.includes('departures') || s.includes('bookings')) v += 70
      if (s.includes('adr') || s.includes('revpar') || s.includes('occupancy')) v += 60
      if (s.includes('available') || s.includes('capacity') || s.includes('inventory')) v += 35
      return v
    }

    // Stable ordering to avoid flicker: do NOT re-order based on the active selection.
    const sorted = cols
      .map((c) => ({ c, s: score(c) }))
      .sort((a, b) => (b.s - a.s) || String(a.c).localeCompare(String(b.c)))
      .map(({ c }) => c)

    const values = sorted.slice(0, MAX_METRIC_TABS)
    // Ensure current selection is available without reordering the whole list.
    if (selectedNumeric && !values.includes(selectedNumeric)) {
      if (values.length < MAX_METRIC_TABS) values.push(selectedNumeric)
      else values[values.length - 1] = selectedNumeric
    }
    return {
      values,
      total: cols.length,
      truncated: cols.length > MAX_METRIC_TABS
    }
  }, [numericColumns, selectedNumeric])

  const MetricTabsBar = () => {
    if (!metricTabs?.values?.length) return null
    const active = selectedNumeric || metricTabs.values[0]
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-medium text-gray-700">
            View metric: <span className="font-semibold text-gray-900">{formatFieldLabel(active) || active}</span>
          </p>
          {metricTabs.truncated && (
            <p className="text-xs text-gray-500">Top {MAX_METRIC_TABS} of {metricTabs.total}</p>
          )}
        </div>
        <div
          className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 select-none"
          style={{ scrollbarGutter: 'stable' }}
        >
          {metricTabs.values.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={() => setSelectedNumeric(m)}
              onClick={() => setSelectedNumeric(m)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                active === m
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={`Switch metric to: ${m}`}
            >
              {formatFieldLabel(m) || m}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Category value tabs (like /dashboard): quick "separate dashboards" by category value
  const categoryTabs = useMemo(() => {
    if (!selectedCategorical) return null
    const base = (sidebarFilteredData !== null ? sidebarFilteredData : data) || []
    if (!Array.isArray(base) || base.length === 0) return null

    const counts = new Map()
    for (const row of base) {
      const raw = row?.[selectedCategorical]
      if (raw === null || raw === undefined || raw === '') continue
      const key = String(raw)
      counts.set(key, (counts.get(key) || 0) + 1)
    }
    if (counts.size < 2) return null

    const sorted = Array.from(counts.entries())
      .sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])))

    const values = sorted.slice(0, MAX_CATEGORY_TABS).map(([v]) => v)
    return {
      values,
      total: counts.size,
      truncated: counts.size > MAX_CATEGORY_TABS
    }
  }, [selectedCategorical, sidebarFilteredData, data])

  const activeCategoryTabValue = chartFilter?.type === 'category' ? String(chartFilter.value) : 'All'

  const CategoryTabsBar = () => {
    if (!categoryTabs?.values?.length) return null
    const label = formatFieldLabel(selectedCategorical)
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-medium text-gray-700">
            View by <span className="font-semibold text-gray-900">{label || selectedCategorical}</span>
          </p>
          {categoryTabs.truncated && (
            <p className="text-xs text-gray-500">
              Showing top {MAX_CATEGORY_TABS} of {categoryTabs.total}
            </p>
          )}
        </div>
        <div
          className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 select-none"
          style={{ scrollbarGutter: 'stable' }}
        >
          <button
            type="button"
            onClick={() => setChartFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              activeCategoryTabValue === 'All'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
            title="Show all categories"
          >
            All
          </button>
          {categoryTabs.values.map((v) => (
            <button
              key={v}
              type="button"
              onMouseDown={() => setChartFilter({ type: 'category', value: v })}
              onClick={() => setChartFilter({ type: 'category', value: v })}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                activeCategoryTabValue === v
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title={`Filter to: ${v}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    )
  }

  useEffect(() => {
    const loadDashboard = async () => {
      if (!shareId) {
        setError('Invalid share link')
        setLoading(false)
        return
      }

      console.log('Loading shared dashboard with shareId:', shareId)
      const sharedData = await loadSharedDashboard(shareId)
      console.log('Loaded shared data:', {
        hasData: !!sharedData,
        dashboardType: sharedData?.dashboardType,
        hasDashboard: !!sharedData?.dashboard,
        keys: sharedData ? Object.keys(sharedData) : [],
        fullData: sharedData
      })
      
      if (!sharedData) {
        console.error('Shared dashboard not found for shareId:', shareId)
        setError(`Shared dashboard not found or expired. Share ID: ${shareId}. Please check the share link and try again. If you just published this dashboard, check the browser console for save errors.`)
        setLoading(false)
        return
      }

      // Check if this is an AI Visual Builder (DashboardSpec) share
      if (sharedData.dashboardType === 'dashboardSpec' && sharedData.spec) {
        const rows = Array.isArray(sharedData.data) ? sharedData.data : []
        if (!rows.length) {
          setError('This shared Studio dashboard is missing a data snapshot. Ask the owner to re-share after saving the dashboard (so it embeds shareable rows).')
          setLoading(false)
          return
        }
        setDashboardSpecData({ spec: sharedData.spec, data: rows })
        setDashboardSpecViewSpec(sharedData.spec)
        setLoading(false)
        return
      }

      // Check if this is a Studio dashboard (legacy sections/widgets)
      const isStudioDashboard = sharedData.dashboardType === 'studio' ||
                                 (sharedData.dashboard && sharedData.dashboard.metadata && sharedData.dashboard.sections)

      if (isStudioDashboard) {
        setStudioDashboardData(sharedData)
        setLoading(false)
        return
      }

      console.log('Regular dashboard detected, rendering standard view')

      // Initialize data from shared dashboard
      setData(sharedData.data)
      setFilteredData(sharedData.data)
      setSidebarFilteredData(sharedData.data)
      setColumns(sharedData.columns || [])
      setNumericColumns(sharedData.numericColumns || [])
      setCategoricalColumns(sharedData.categoricalColumns || [])
      setDateColumns(sharedData.dateColumns || [])
      setSelectedNumeric(sharedData.selectedNumeric || '')
      setSelectedCategorical(sharedData.selectedCategorical || '')
      setSelectedDate(sharedData.selectedDate || '')
      
      // Restore dashboard view if saved
      if (sharedData.dashboardView) {
        setDashboardView(sharedData.dashboardView)
      }

      // Generate dashboard title
      const allColumns = sharedData.columns || []
    
    // First, check for specific dataset sources (API datasets)
    const getDatasetTitleFromSource = (source) => {
      if (!source) return null
      
      const sourceLower = source.toLowerCase()
      
      // Government Budget
      if (sourceLower.includes('treasury') || sourceLower.includes('fiscal data')) {
        return 'Government Budget'
      }
      
      // USA Spending
      if (sourceLower.includes('usaspending') || sourceLower.includes('usa spending')) {
        return 'USA Spending'
      }
      
      // Unemployment
      if (sourceLower.includes('labor statistics') || sourceLower.includes('bls') || sourceLower.includes('unemployment')) {
        return 'Unemployment Rate'
      }
      
      // CDC Health Data
      if (sourceLower.includes('cdc') || sourceLower.includes('disease control') || sourceLower.includes('centers for disease')) {
        return 'CDC Health Data'
      }
      
      return null
    }
    
    // Check for dataset name or source
    const datasetTitle = sharedData.datasetName || getDatasetTitleFromSource(sharedData.source)
    
    if (datasetTitle) {
      setDashboardTitle(datasetTitle)
    } else {
      // Detect domain from column names (fallback)
      const detectDomain = (columns) => {
        const lowerColumns = columns.map(col => col.toLowerCase())
        
        // Government Budget indicators
        if (lowerColumns.some(col => 
          (col.includes('budget') && col.includes('category')) || 
          (col.includes('budget') && col.includes('amount'))
        )) {
          return 'Government Budget'
        }
        
        // USA Spending indicators
        if (lowerColumns.some(col => 
          col.includes('award amount') || 
          (col.includes('awarding agency') && col.includes('recipient'))
        )) {
          return 'USA Spending'
        }
        
        // Unemployment indicators
        if (lowerColumns.some(col => 
          col.includes('unemployment rate') || col.includes('unemployment')
        )) {
          return 'Unemployment Rate'
        }
        
        // CDC Health indicators
        if (lowerColumns.some(col => 
          col.includes('health metric') || 
          (col.includes('metric') && (col.includes('death') || col.includes('birth') || col.includes('life expectancy')))
        )) {
          return 'CDC Health Data'
        }
        
        if (lowerColumns.some(col => 
          col.includes('patient') || col.includes('diagnosis') || 
          col.includes('treatment') || col.includes('medication') ||
          col.includes('department') && (col.includes('cardiology') || col.includes('orthopedic'))
        )) {
          return 'Medical Data'
        }
        if (lowerColumns.some(col => 
          col.includes('sales') || col.includes('revenue') || 
          col.includes('product') || col.includes('customer')
        )) {
          return 'Sales Data'
        }
        if (lowerColumns.some(col => 
          col.includes('student') || col.includes('school') || 
          col.includes('grade') || col.includes('attendance')
        )) {
          return 'Education Data'
        }
        if (lowerColumns.some(col => 
          col.includes('donation') || col.includes('fund') || 
          col.includes('amount') && col.includes('$')
        )) {
          return 'Financial Data'
        }
        return null
      }
      
      const domain = detectDomain(allColumns)
      if (domain) {
        setDashboardTitle(domain)
      } else if (sharedData.categoricalColumns && sharedData.categoricalColumns.length > 0) {
        const firstCategory = sharedData.categoricalColumns[0]
        const formattedTitle = firstCategory
          .split(/[\s_]+/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
        setDashboardTitle(`${formattedTitle} Analytics`)
      } else {
        setDashboardTitle('Analytics Dashboard')
      }
    }
    
    setLoading(false)
    }
    
    loadDashboard()
  }, [shareId])

  const applyChartFilter = (baseData) => {
    if (!baseData) return baseData
    if (!chartFilter) return baseData
    
    let result = [...baseData]
    
    if (chartFilter.type === 'category' && selectedCategorical) {
      result = result.filter((row) => row[selectedCategorical] === chartFilter.value)
    } else if (chartFilter.type === 'date' && selectedDate) {
      result = result.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        const filterDate = new Date(chartFilter.value)
        return rowDate.toDateString() === filterDate.toDateString()
      })
    }
    
    return result
  }

  const handleFilterChange = (filters, filtered) => {
    const sidebarFiltered = filtered || data
    setSidebarFilteredData(sidebarFiltered)
    const result = applyChartFilter(sidebarFiltered)
    setFilteredData(result)
  }

  const handleChartFilter = (filter) => {
    setChartFilter(filter)
  }

  const clearChartFilter = () => {
    setChartFilter(null)
  }

  const handleColumnChange = (type, value) => {
    if (type === 'numeric') {
      setSelectedNumeric(value)
    } else if (type === 'categorical') {
      setSelectedCategorical(value)
    } else if (type === 'date') {
      setSelectedDate(value)
    }
  }

  const calculateStats = () => {
    if (!filteredData || !selectedNumeric) return null

    const values = filteredData
      .map((row) => parseFloat(row[selectedNumeric]))
      .filter((val) => !isNaN(val) && isFinite(val))

    if (values.length === 0) return null

    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    const mid = Math.floor(values.length / 2)
    let trend = 0
    if (mid > 0) {
      const firstHalf = values.slice(0, mid)
      const secondHalf = values.slice(mid)
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      trend = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
    }

    return { sum, avg, min, max, trend, column: selectedNumeric }
  }

  useEffect(() => {
    const baseData = sidebarFilteredData !== null ? sidebarFilteredData : data
    if (baseData) {
      const result = applyChartFilter(baseData)
      setFilteredData(result)
    }
  }, [chartFilter, selectedCategorical, selectedDate])

  const stats = calculateStats()
  const currentDate = new Date()
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Render AI Visual Builder (DashboardSpec) public view
  if (dashboardSpecData && !loading) {
    const title = dashboardSpecData.spec?.title || dashboardSpecData.spec?.metadata?.name || 'Shared Dashboard'
    const wrapperClass = fullScreen
      ? 'fixed inset-0 z-40 bg-gray-50 flex flex-col overflow-hidden'
      : 'min-h-screen bg-gray-50'
    return (
      <div className={wrapperClass}>
        {!fullScreen && <Navbar />}
        <div className={fullScreen ? 'flex-1 flex flex-col overflow-hidden p-4' : 'max-w-7xl mx-auto px-4 py-6'}>
          <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
            <div>
              {!fullScreen && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm">
                    Shared dashboard (view-only, no login required)
                  </p>
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
            <button
              type="button"
              onClick={() => setFullScreen((f) => !f)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shrink-0"
              title={fullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {fullScreen ? 'Exit full screen' : 'Full screen'}
            </button>
          </div>
          <div
            className={fullScreen ? 'flex-1 min-h-0 overflow-auto' : undefined}
            style={fullScreen ? { scrollbarGutter: 'stable' } : undefined}
          >
            {(specFields.numericFields.length > 1 || specFields.categoricalFields.length > 1) && (
              <div className="mb-4 space-y-3">
                {specFields.numericFields.length > 1 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">View metric</p>
                    <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 select-none" style={{ scrollbarGutter: 'stable' }}>
                      {specFields.numericFields.slice(0, 10).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onMouseDown={() => {
                            setSpecQuickMetric(m)
                            setDashboardSpecViewSpec((s) => applyQuickSwitchToSpec(s || dashboardSpecData.spec, { metric: m, dimension: specQuickDimension }))
                          }}
                          onClick={() => {
                            setSpecQuickMetric(m)
                            setDashboardSpecViewSpec((s) => applyQuickSwitchToSpec(s || dashboardSpecData.spec, { metric: m, dimension: specQuickDimension }))
                          }}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            specQuickMetric === m
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                          title={`Switch metric to: ${m}`}
                        >
                          {formatFieldLabel(m) || m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {specFields.categoricalFields.length > 1 && (
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">View by</p>
                    <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 select-none" style={{ scrollbarGutter: 'stable' }}>
                      {specFields.categoricalFields.slice(0, 10).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onMouseDown={() => {
                            setSpecQuickDimension(d)
                            setDashboardSpecViewSpec((s) => applyQuickSwitchToSpec(s || dashboardSpecData.spec, { metric: specQuickMetric, dimension: d }))
                          }}
                          onClick={() => {
                            setSpecQuickDimension(d)
                            setDashboardSpecViewSpec((s) => applyQuickSwitchToSpec(s || dashboardSpecData.spec, { metric: specQuickMetric, dimension: d }))
                          }}
                          className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                            specQuickDimension === d
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                          title={`Switch dimension to: ${d}`}
                        >
                          {formatFieldLabel(d) || d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ contain: 'layout', minHeight: fullScreen ? 'min-content' : undefined }}>
              <DashboardRenderer
                spec={dashboardSpecViewSpec || dashboardSpecData.spec}
                data={dashboardSpecData.data}
                filterValues={filterValues}
                onFilterChange={setFilterValues}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render Studio dashboard if it's a Studio dashboard (legacy)
  if (studioDashboardData && !loading) {
    return <SharedStudioDashboardView sharedData={studioDashboardData} />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Loader />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Dashboard Not Found</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Tab Navigation */}
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        tabs={['Overview']}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {dashboardTitle}
            </h1>
            <p className="text-sm text-gray-600">
              {filteredData?.length || 0} records • {columns.length} columns
            </p>
            <p className="text-xs text-blue-600 font-medium mt-1">Shared Dashboard</p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => setDashboardView(dashboardView === 'advanced' ? 'simple' : 'advanced')}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              {dashboardView === 'advanced' ? 'Simple View' : 'Advanced View'}
            </button>
          </div>
        </div>

        {/* View Metric Tabs */}
        <MetricTabsBar />
        <CategoryTabsBar />

        {/* Active Filter Indicator */}
        {chartFilter && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 animate-slide-up">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-900">
                Filtered by: <span className="font-semibold">
                  {chartFilter.type === 'category' ? chartFilter.value : 
                   chartFilter.type === 'date' ? new Date(chartFilter.value).toLocaleDateString() : ''}
                </span>
              </span>
            </div>
            <button
              onClick={clearChartFilter}
              className="text-sm text-blue-700 hover:text-blue-900 font-medium px-3 py-1 rounded hover:bg-blue-100 transition-colors"
            >
              Clear Filter
            </button>
          </div>
        )}

        {/* Charts Section */}
        {dashboardView === 'advanced' ? (
          <AdvancedDashboard
            data={data}
            filteredData={filteredData}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
            onChartFilter={handleChartFilter}
            chartFilter={chartFilter}
            categoricalColumns={categoricalColumns}
            numericColumns={numericColumns}
            dateColumns={dateColumns}
          />
        ) : (
          <>
            <DashboardCharts
              data={data}
              filteredData={filteredData}
              selectedNumeric={selectedNumeric}
              selectedCategorical={selectedCategorical}
              selectedDate={selectedDate}
              onChartFilter={handleChartFilter}
              chartFilter={chartFilter}
            />

            {/* Metric Cards - Only in simple view */}
            <MetricCards
              data={filteredData}
              numericColumns={numericColumns}
              selectedNumeric={selectedNumeric}
              stats={stats}
            />
          </>
        )}

        {/* Filters and AI Insights */}
        <div className="mt-6 space-y-4">
          <details className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold text-gray-900 mb-4">
              Filters & AI Insights
            </summary>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              <div className="lg:col-span-1">
                <Filters
                  data={data}
                  numericColumns={numericColumns}
                  categoricalColumns={categoricalColumns}
                  dateColumns={dateColumns}
                  onFilterChange={handleFilterChange}
                  selectedNumeric={selectedNumeric}
                  selectedCategorical={selectedCategorical}
                  selectedDate={selectedDate}
                  onColumnChange={handleColumnChange}
                />
              </div>
              <div className="lg:col-span-2">
                <button
                  onClick={() => navigate('/')}
                  className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  Create Your Own Dashboard
                </button>
                <AIInsights 
                  data={filteredData} 
                  columns={columns} 
                  totalRows={data?.length || 0}
                  stats={stats}
                />
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

export default SharedDashboard

