import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Loader from '../components/Loader'
import DashboardCharts from '../components/DashboardCharts'
import AdvancedDashboard from '../components/AdvancedDashboard'
import AdvancedDashboardGrid from '../components/AdvancedDashboardGrid'
import ContractMapWidget, { getStateAbbr, getStateDisplayLabel } from '../components/widgets/ContractMapWidget'
import MetricCards from '../components/MetricCards'
import Filters from '../components/Filters'
import AIInsights from '../components/AIInsights'
import DateRangeSlider from '../components/DateRangeSlider'
import DataMetadataEditor from '../components/DataMetadataEditor'
import TimeSeriesReport from '../components/TimeSeriesReport'
import { parseNumericValue } from '../utils/numberUtils'
import { loadSharedDashboard } from '../utils/shareUtils'
import SharedStudioDashboardView from '../components/SharedStudioDashboardView'

const SHARED_DASHBOARD_CACHE = new Map()
const CACHE_MAX = 5
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
  const [showLoader, setShowLoader] = useState(false)
  const [error, setError] = useState(null)
  const [chartFilter, setChartFilter] = useState(null)
  const [sidebarFilteredData, setSidebarFilteredData] = useState(null)
  const [dashboardView, setDashboardView] = useState('advanced') // Default to advanced
  const [dashboardTitle, setDashboardTitle] = useState('Analytics Dashboard')
  const [isTitleCustomized, setIsTitleCustomized] = useState(false)
  const [studioDashboardData, setStudioDashboardData] = useState(null)
  const [dashboardSpecData, setDashboardSpecData] = useState(null)
  const [dashboardSpecViewSpec, setDashboardSpecViewSpec] = useState(null)
  const [filterValues, setFilterValues] = useState({})
  const [sharedLayouts, setSharedLayouts] = useState(null)
  const [sharedWidgetVisibility, setSharedWidgetVisibility] = useState(null)
  const [sharedFilterSnapshot, setSharedFilterSnapshot] = useState(null)
  const [fullScreen, setFullScreen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [opportunityKeyword, setOpportunityKeyword] = useState('')
  const [selectedOpportunityOrg, setSelectedOpportunityOrg] = useState('')
  const [opportunityDateRangeDays, setOpportunityDateRangeDays] = useState(30)
  const [opportunityViewFilter, setOpportunityViewFilter] = useState('all')
  const [opportunityFavorites, setOpportunityFavorites] = useState(() => new Set())
  const [opportunityFavoriteRows, setOpportunityFavoriteRows] = useState(() => [])
  const lastAutoTitleMetric = useRef('')
  const MAX_METRIC_TABS = 10
  const MAX_CATEGORY_TABS = 12
  const [specQuickMetric, setSpecQuickMetric] = useState('')
  const [specQuickDimension, setSpecQuickDimension] = useState('')
  const specFields = useMemo(() => inferFieldsFromRows(dashboardSpecData?.data || []), [dashboardSpecData])
  const predefinedOpportunityKeywords = useMemo(
    () => ['IT', 'AI', 'Data Analytics', 'House Keeping', 'Cybersecurity', 'Facilities'],
    []
  )

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
    if (isTitleCustomized) return
    const pretty = formatFieldLabel(selectedNumeric)
    if (!pretty) return
    if (lastAutoTitleMetric.current === selectedNumeric) return
    lastAutoTitleMetric.current = selectedNumeric
    setDashboardTitle(pretty)
  }, [selectedNumeric, formatFieldLabel, isTitleCustomized])

  // Initialize spec quick-switch defaults when the shared spec loads.
  useEffect(() => {
    if (!dashboardSpecData) return
    if (!specQuickMetric && specFields.numericFields.length) setSpecQuickMetric(specFields.numericFields[0])
    if (!specQuickDimension && specFields.categoricalFields.length) setSpecQuickDimension(specFields.categoricalFields[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardSpecData, specFields.numericFields.join('|'), specFields.categoricalFields.join('|')])

  // Same as Dashboard: hide award_amount from selectors when all values are 0/empty
  const effectiveNumericColumns = useMemo(() => {
    const cols = Array.isArray(numericColumns) ? numericColumns : []
    if (!cols.includes('award_amount')) return cols
    const rows = Array.isArray(data) ? data : []
    if (!rows.length) return cols
    let hasNonZeroAwardAmount = false
    for (const row of rows) {
      const v = parseNumericValue(row?.award_amount)
      if (Number.isFinite(v) && v !== 0) {
        hasNonZeroAwardAmount = true
        break
      }
    }
    return hasNonZeroAwardAmount ? cols : cols.filter((c) => c !== 'award_amount')
  }, [numericColumns, data])

  useEffect(() => {
    if (selectedNumeric && !effectiveNumericColumns.includes(selectedNumeric)) {
      setSelectedNumeric(effectiveNumericColumns[0] || '')
    }
  }, [selectedNumeric, effectiveNumericColumns])

  const metricTabs = useMemo(() => {
    const cols = Array.isArray(effectiveNumericColumns) ? effectiveNumericColumns : []
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
  }, [effectiveNumericColumns, selectedNumeric])

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
    const isStateCol = selectedCategorical && String(selectedCategorical).toLowerCase() === 'state'
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
            onMouseDown={(e) => { e.preventDefault(); setChartFilter(null) }}
            onClick={() => setChartFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
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
              title={`Filter to: ${isStateCol ? getStateDisplayLabel(v) : v}`}
            >
              {isStateCol ? getStateDisplayLabel(v) : v}
            </button>
          ))}
        </div>
      </div>
    )
  }

  useEffect(() => {
    setShowLoader(false)
    const showLoaderTimer = setTimeout(() => setShowLoader(true), 300)

    const loadDashboard = async () => {
      if (!shareId) {
        setError('Invalid share link')
        setLoading(false)
        setShowLoader(false)
        return
      }

      let sharedData = SHARED_DASHBOARD_CACHE.get(shareId)
      if (!sharedData) {
        console.log('Loading shared dashboard with shareId:', shareId)
        sharedData = await loadSharedDashboard(shareId)
        if (sharedData) {
          SHARED_DASHBOARD_CACHE.set(shareId, sharedData)
          if (SHARED_DASHBOARD_CACHE.size > CACHE_MAX) {
            const firstKey = SHARED_DASHBOARD_CACHE.keys().next().value
            SHARED_DASHBOARD_CACHE.delete(firstKey)
          }
        }
      }
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
        setShowLoader(false)
        return
      }

      // Check if this is an AI Visual Builder (DashboardSpec) share
      if (sharedData.dashboardType === 'dashboardSpec' && sharedData.spec) {
        const rows = Array.isArray(sharedData.data) ? sharedData.data : []
        if (!rows.length) {
          setError('This shared Studio dashboard is missing a data snapshot. Ask the owner to re-share after saving the dashboard (so it embeds shareable rows).')
          setLoading(false)
          setShowLoader(false)
          return
        }
        setDashboardSpecData({ spec: sharedData.spec, data: rows })
        setDashboardSpecViewSpec(sharedData.spec)
        setLoading(false)
        setShowLoader(false)
        return
      }

      // Check if this is a Studio dashboard (legacy sections/widgets)
      const isStudioDashboard = sharedData.dashboardType === 'studio' ||
                                 (sharedData.dashboard && sharedData.dashboard.metadata && sharedData.dashboard.sections)

      if (isStudioDashboard) {
        setStudioDashboardData(sharedData)
        setLoading(false)
        setShowLoader(false)
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
      const allCols = sharedData.columns || []
      const stateCol = allCols.find((c) => String(c).toLowerCase() === 'state')
      const baseTypeCol = allCols.find((c) => { const l = String(c).toLowerCase(); return l === 'basetype' || l === 'type'; })
      const lowerCols = new Set(allCols.map((c) => String(c).toLowerCase()))
      const hasOpportunityCols = lowerCols.has('noticeid') && lowerCols.has('title') && lowerCols.has('uilink')
      const defaultCat = sharedData.selectedCategorical || stateCol || (hasOpportunityCols && baseTypeCol ? baseTypeCol : null) || ''
      setSelectedCategorical(defaultCat)
      setSelectedDate(sharedData.selectedDate || '')
      setOpportunityKeyword(sharedData.opportunityKeyword || '')
      if (sharedData.selectedOpportunityNoticeType) {
        setChartFilter({ type: 'category', value: sharedData.selectedOpportunityNoticeType })
      }

      const sharedCustomTitle = String(sharedData.dashboardTitle || sharedData.name || '').trim()
      if (sharedCustomTitle) {
        setDashboardTitle(sharedCustomTitle)
        setIsTitleCustomized(true)
      } else {
        setIsTitleCustomized(false)
      }
      
      // Restore dashboard view if saved
      if (sharedData.dashboardView) {
        setDashboardView(sharedData.dashboardView)
      }
      if (sharedData.layouts && typeof sharedData.layouts === 'object') {
        setSharedLayouts(sharedData.layouts)
      }
      if (sharedData.widgetVisibility && typeof sharedData.widgetVisibility === 'object') {
        setSharedWidgetVisibility(sharedData.widgetVisibility)
      }
      if (sharedData.filterSnapshot && typeof sharedData.filterSnapshot === 'object') {
        setSharedFilterSnapshot(sharedData.filterSnapshot)
      }
      if (Array.isArray(sharedData.opportunityFavorites) && sharedData.opportunityFavorites.length > 0) {
        setOpportunityFavorites(new Set(sharedData.opportunityFavorites))
      }
      if (Array.isArray(sharedData.opportunityFavoriteRows) && sharedData.opportunityFavoriteRows.length > 0) {
        setOpportunityFavoriteRows(sharedData.opportunityFavoriteRows.map((r) => ({ ...r })))
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

      // SAM.gov
      if (sourceLower.includes('sam.gov') || sourceLower.includes('samgov')) {
        return 'SAM.gov Opportunities'
      }
      
      return null
    }
    
    // Check for dataset name or source
    const datasetTitle = sharedData.datasetName || getDatasetTitleFromSource(sharedData.source)
    
    if (!sharedData.dashboardTitle && !sharedData.name && datasetTitle) {
      setDashboardTitle(datasetTitle)
    } else if (!sharedData.dashboardTitle && !sharedData.name) {
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

        // SAM.gov indicators
        if (lowerColumns.some(col =>
          col.includes('noticeid') ||
          col.includes('solicitationnumber') ||
          col.includes('naicscode') ||
          col.includes('classificationcode') ||
          col.includes('setaside') ||
          col.includes('uilink')
        )) {
          return 'SAM.gov Opportunities'
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
    setShowLoader(false)
    }
    
    loadDashboard()
    return () => clearTimeout(showLoaderTimer)
  }, [shareId])

  const isOpportunityDataset = useMemo(() => {
    const colSet = new Set((columns || []).map((c) => String(c)))
    return (
      colSet.has('noticeId') &&
      colSet.has('title') &&
      colSet.has('uiLink')
    )
  }, [columns])

  const getOpportunityNoticeType = useCallback((row) => {
    const rawType = String(row?.baseType || row?.type || '').trim()
    const t = rawType.toLowerCase()
    if (t.includes('sources sought') || t.includes('source sought')) return 'Sources Sought'
    if (t.includes('presolicitation') || t.includes('pre-solicitation')) return 'Presolicitation'
    if (t.includes('solicitation')) return 'Solicitation'
    return rawType || 'Other'
  }, [])

  const getOpportunityId = useCallback((row) => String(row?.noticeId || row?.uiLink || `${row?.title || ''}-${row?.solicitationNumber || ''}`), [])
  const toggleOpportunityFavorite = useCallback((row) => {
    const id = getOpportunityId(row)
    setOpportunityFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setOpportunityFavoriteRows((prev) => {
      const has = prev.some((r) => getOpportunityId(r) === id)
      if (has) return prev.filter((r) => getOpportunityId(r) !== id)
      return [...prev, { ...row }]
    })
  }, [getOpportunityId])
  const isOpportunityFavorite = useCallback((row) => opportunityFavorites.has(getOpportunityId(row)), [opportunityFavorites, getOpportunityId])

  const BASE_TYPE_VALUES = ['Solicitation', 'Presolicitation', 'Sources Sought']
  const selectedOpportunityNoticeType =
    chartFilter?.type === 'category' && BASE_TYPE_VALUES.includes(String(chartFilter?.value))
      ? String(chartFilter.value)
      : null

  const opportunityPieDataByOrg = useMemo(() => {
    if (!isOpportunityDataset || !selectedOpportunityNoticeType) return null
    const rows = Array.isArray(filteredData) ? filteredData : []
    const filtered = rows.filter((row) => getOpportunityNoticeType(row) === selectedOpportunityNoticeType)
    return filtered.length > 0 ? filtered : null
  }, [isOpportunityDataset, selectedOpportunityNoticeType, filteredData, getOpportunityNoticeType])

  const getOpportunityNoticeTypeClass = useCallback((label) => {
    const l = String(label || '').toLowerCase()
    if (l === 'solicitation') return 'bg-blue-100 text-blue-800 border border-blue-200'
    if (l === 'presolicitation') return 'bg-purple-100 text-purple-800 border border-purple-200'
    if (l === 'sources sought') return 'bg-amber-100 text-amber-800 border border-amber-200'
    return 'bg-gray-100 text-gray-700 border border-gray-200'
  }, [])

  const allOpportunityRows = useMemo(() => {
    if (!isOpportunityDataset) return []
    const rows = Array.isArray(filteredData) ? filteredData : []
    if (!rows.length) return []

    const seen = new Set()
    const out = []
    for (const row of rows) {
      if (!row) continue
      const key = String(row.noticeId || row.uiLink || `${row.title || ''}-${row.solicitationNumber || ''}`)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(row)
    }
    return out
  }, [filteredData, isOpportunityDataset])

  const dateFilteredOpportunityRows = useMemo(() => {
    if (!isOpportunityDataset || allOpportunityRows.length === 0) return allOpportunityRows
    const days = Math.min(Math.max(Number(opportunityDateRangeDays) || 30, 1), 364)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const postedKey = columns?.find((c) => String(c).toLowerCase() === 'posteddate' || String(c).toLowerCase() === 'posted_date') || 'postedDate'
    return allOpportunityRows.filter((row) => {
      const d = row?.[postedKey]
      if (!d) return true
      const date = new Date(d)
      return !Number.isNaN(date.getTime()) && date >= cutoff
    })
  }, [isOpportunityDataset, allOpportunityRows, opportunityDateRangeDays, columns])

  const opportunityRows = useMemo(() => {
    const q = String(opportunityKeyword || '').trim().toLowerCase()
    const sourceRows = Array.isArray(dateFilteredOpportunityRows) ? dateFilteredOpportunityRows : []
    if (!q) return sourceRows.slice(0, 20).map((row) => ({ ...row, _matchReason: '' }))

    const normalize = (s) =>
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

    const haystackFields = [
      'title',
      'solicitationNumber',
      'organization',
      'setAside',
      'type',
      'baseType',
      'noticeId',
      'naicsCode',
      'classificationCode',
      'description',
    ]

    const terms = q.split(/\s+/).filter(Boolean)
    const matches = sourceRows
      .map((row) => {
        const haystack = normalize(haystackFields.map((f) => row?.[f]).filter(Boolean).join(' '))
        if (!haystack) return null
        const matched = terms.find((t) => haystack.includes(normalize(t)))
        if (!matched) return null
        return { ...row, _matchReason: `Matched keyword: ${matched}` }
      })
      .filter(Boolean)

    return matches.slice(0, 20)
  }, [dateFilteredOpportunityRows, opportunityKeyword])

  const opportunityByOrganization = useMemo(() => {
    if (!selectedOpportunityNoticeType || !isOpportunityDataset) return []
    const typeFiltered = opportunityRows.filter((row) => getOpportunityNoticeType(row) === selectedOpportunityNoticeType)
    const byOrg = new Map()
    for (const row of typeFiltered) {
      const org = String(row?.organization || '').trim() || 'Unknown organization'
      if (!byOrg.has(org)) byOrg.set(org, [])
      byOrg.get(org).push(row)
    }
    return Array.from(byOrg.entries())
      .map(([organization, rows]) => ({ organization, count: rows.length, rows }))
      .sort((a, b) => b.count - a.count)
  }, [selectedOpportunityNoticeType, isOpportunityDataset, opportunityRows, getOpportunityNoticeType])

  const renderOpportunityListPanel = () => {
    if (!isOpportunityDataset || allOpportunityRows.length === 0) return null

    const showKeywordTypeCounts = !!opportunityKeyword
    const noticeTypeCounts = opportunityRows.reduce(
      (acc, row) => {
        const type = getOpportunityNoticeType(row)
        if (type === 'Solicitation') acc.solicitation += 1
        else if (type === 'Presolicitation') acc.presolicitation += 1
        else if (type === 'Sources Sought') acc.sourcesSought += 1
        return acc
      },
      { solicitation: 0, presolicitation: 0, sourcesSought: 0 }
    )

    let visibleOpportunityRows
    if (opportunityViewFilter === 'favorites') {
      const savedIds = new Set(opportunityFavoriteRows.map((r) => getOpportunityId(r)))
      const fromCurrent = (Array.isArray(allOpportunityRows) ? allOpportunityRows : []).filter(
        (row) => opportunityFavorites.has(getOpportunityId(row)) && !savedIds.has(getOpportunityId(row))
      )
      visibleOpportunityRows = [...opportunityFavoriteRows, ...fromCurrent]
      const postedKey = columns?.find((c) => String(c).toLowerCase() === 'posteddate' || String(c).toLowerCase() === 'posted_date') || 'postedDate'
      visibleOpportunityRows.sort((a, b) => {
        const da = a?.[postedKey] ? new Date(a[postedKey]).getTime() : 0
        const db = b?.[postedKey] ? new Date(b[postedKey]).getTime() : 0
        return db - da
      })
    } else {
      visibleOpportunityRows = selectedOpportunityNoticeType
        ? opportunityRows.filter((row) => getOpportunityNoticeType(row) === selectedOpportunityNoticeType)
        : opportunityRows
      if (selectedOpportunityOrg) {
        visibleOpportunityRows = visibleOpportunityRows.filter(
          (row) => (String(row?.organization || '').trim() || 'Unknown organization') === selectedOpportunityOrg
        )
      }
    }

    const stateCol = columns?.find((c) => String(c).toLowerCase() === 'state')
    const isStateFilter = chartFilter?.type === 'category' && chartFilter?.value && stateCol && String(chartFilter.value).length === 2 && getStateAbbr(chartFilter.value) === chartFilter.value
    const stateLabel = chartFilter?.value || ''

    return (
      <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Matching Opportunities</h3>
            <p className="text-sm text-gray-600">
              Showing {opportunityViewFilter === 'favorites'
                ? `${visibleOpportunityRows.length} favorites`
                : `${visibleOpportunityRows.length} of ${allOpportunityRows.length} filtered opportunities`}
              {chartFilter?.type === 'category' && chartFilter?.value && String(chartFilter.value).length === 2 ? ` in ${getStateDisplayLabel(chartFilter.value)}` : ''}
              {opportunityKeyword ? ` • API keyword matches: 0` : ''}
              {selectedOpportunityNoticeType ? ` • Base type: ${selectedOpportunityNoticeType}` : ''}
              {selectedOpportunityOrg ? ` • Org: ${selectedOpportunityOrg}` : ''}
            </p>
            {showKeywordTypeCounts && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedOpportunityNoticeType === 'Solicitation' ? '' : 'Solicitation'
                    setChartFilter(next ? { type: 'category', value: next } : null)
                    setSelectedOpportunityOrg('')
                    if (next && (columns?.includes('baseType') || columns?.includes('type'))) setSelectedCategorical(columns?.includes('baseType') ? 'baseType' : 'type')
                  }}
                  className={`px-2 py-0.5 rounded-full border ${
                    selectedOpportunityNoticeType === 'Solicitation'
                      ? 'bg-blue-600 text-white border-blue-700'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  Solicitation: {noticeTypeCounts.solicitation}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedOpportunityNoticeType === 'Presolicitation' ? '' : 'Presolicitation'
                    setChartFilter(next ? { type: 'category', value: next } : null)
                    setSelectedOpportunityOrg('')
                    if (next && (columns?.includes('baseType') || columns?.includes('type'))) setSelectedCategorical(columns?.includes('baseType') ? 'baseType' : 'type')
                  }}
                  className={`px-2 py-0.5 rounded-full border ${
                    selectedOpportunityNoticeType === 'Presolicitation'
                      ? 'bg-purple-600 text-white border-purple-700'
                      : 'bg-purple-100 text-purple-800 border-purple-200'
                  }`}
                >
                  Presolicitation: {noticeTypeCounts.presolicitation}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedOpportunityNoticeType === 'Sources Sought' ? '' : 'Sources Sought'
                    setChartFilter(next ? { type: 'category', value: next } : null)
                    setSelectedOpportunityOrg('')
                    if (next && (columns?.includes('baseType') || columns?.includes('type'))) setSelectedCategorical(columns?.includes('baseType') ? 'baseType' : 'type')
                  }}
                  className={`px-2 py-0.5 rounded-full border ${
                    selectedOpportunityNoticeType === 'Sources Sought'
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  Sources Sought: {noticeTypeCounts.sourcesSought}
                </button>
                {selectedOpportunityNoticeType && (
                  <button
                    type="button"
                    onClick={() => {
                      setChartFilter(null)
                      setSelectedOpportunityOrg('')
                    }}
                    className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300"
                  >
                    Clear base type filter
                  </button>
                )}
              </div>
            )}
            {selectedOpportunityNoticeType && opportunityByOrganization.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">By agency / organization</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOpportunityOrg && (
                    <button
                      type="button"
                      onClick={() => { setSelectedOpportunityOrg(''); setChartFilter(null) }}
                      className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Clear org filter
                    </button>
                  )}
                  {opportunityByOrganization.slice(0, 20).map(({ organization, count }) => {
                    const isSelected = selectedOpportunityOrg === organization
                    const maxCount = Math.max(...opportunityByOrganization.map((o) => o.count), 1)
                    const pct = Math.max(8, Math.round((count / maxCount) * 100))
                    return (
                      <button
                        key={organization}
                        type="button"
                        onClick={() => {
                          const next = isSelected ? '' : organization
                          setSelectedOpportunityOrg(next)
                          setChartFilter(next ? { type: 'category', value: next } : null)
                        }}
                        className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                        title={`${count} ${selectedOpportunityNoticeType}(s) • Click to ${isSelected ? 'clear' : 'filter by'} this organization`}
                      >
                        <span className="font-medium block truncate max-w-[200px]" title={organization}>{organization}</span>
                        <span className="text-[10px] opacity-90">{count} opportunities</span>
                        <div className="mt-1 h-1 w-full rounded bg-gray-200 overflow-hidden">
                          <div
                            className={`h-1 rounded ${isSelected ? 'bg-white' : 'bg-blue-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
                {opportunityByOrganization.length > 20 && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Showing top 20 of {opportunityByOrganization.length} organizations.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => setOpportunityViewFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${opportunityViewFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setOpportunityViewFilter('favorites')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${opportunityViewFilter === 'favorites' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <span aria-hidden>★</span> Favorites {opportunityFavorites.size > 0 ? `(${opportunityFavorites.size})` : ''}
              </button>
            </div>
            {chartFilter ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                {chartFilter.type === 'category' ? (() => {
                  const isStateF = stateCol && chartFilter.value && String(chartFilter.value).length === 2 && getStateAbbr(chartFilter.value) === chartFilter.value
                  const colLabel = isStateF ? stateCol : selectedCategorical
                  return `${colLabel || 'Filter'}: ${isStateF ? getStateDisplayLabel(chartFilter.value) : chartFilter.value}`
                })() : 'Date filter applied'}
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                All filtered opportunities
              </span>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-3 mb-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">
              Posted in
            </label>
            <select
              value={opportunityDateRangeDays}
              onChange={(e) => setOpportunityDateRangeDays(Number(e.target.value))}
              className="px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={364}>Last year</option>
            </select>
          </div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {isStateFilter ? 'Drill down by keyword' : 'Keyword Search'}
          </label>
          <input
            type="text"
            value={opportunityKeyword}
            onChange={(e) => setOpportunityKeyword(e.target.value)}
            placeholder={isStateFilter ? `Search within ${stateLabel} (title, org, solicitation…)` : 'Search title, solicitation, organization...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {predefinedOpportunityKeywords.map((kw) => {
              const active = opportunityKeyword.toLowerCase() === kw.toLowerCase()
              return (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setOpportunityKeyword(active ? '' : kw)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {kw}
                </button>
              )
            })}
          </div>
        </div>
        <div className="divide-y divide-gray-100 max-h-[420px] overflow-y-auto">
          {visibleOpportunityRows.length === 0 ? (
            <div className="px-5 py-8 text-sm text-gray-600">
              {opportunityViewFilter === 'favorites'
                ? 'No favorites yet. Click the star on any opportunity to add it here.'
                : 'No opportunities match this keyword/type in the current filtered set.'}
            </div>
          ) : visibleOpportunityRows.map((row, idx) => (
            <div key={String(row.noticeId || row.uiLink || idx)} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-gray-900 break-words">
                    {row.title || 'Untitled Opportunity'}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${getOpportunityNoticeTypeClass(getOpportunityNoticeType(row))}`}>
                      {getOpportunityNoticeType(row)}
                    </span>
                    {row.solicitationNumber && (
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        Solicitation: {row.solicitationNumber}
                      </span>
                    )}
                    {row.state && <span>State: {getStateDisplayLabel(row.state)}</span>}
                    {opportunityKeyword && row._matchReason && (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        {row._matchReason}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {row.organization && <p className="break-words">Organization: {row.organization}</p>}
                    <p>
                      Posted: {row.postedDate || 'N/A'}{row.responseDeadLine ? ` • Due: ${row.responseDeadLine}` : ''}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleOpportunityFavorite(row)}
                    className={`p-1.5 rounded-lg border transition-colors ${isOpportunityFavorite(row) ? 'bg-amber-50 border-amber-300 text-amber-600 hover:bg-amber-100' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-amber-200 hover:text-amber-500'}`}
                    title={isOpportunityFavorite(row) ? 'Remove from favorites' : 'Add to favorites'}
                    aria-label={isOpportunityFavorite(row) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <span className="text-lg leading-none">{isOpportunityFavorite(row) ? '★' : '☆'}</span>
                  </button>
                  {row.uiLink && (
                    <a
                      href={row.uiLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Same selection/filter framework as main Dashboard: resolve state column from schema so state click filters correctly (no default to 0)
  const applyChartFilter = useCallback((baseData) => {
    if (!baseData) return baseData
    if (!chartFilter) return baseData

    let result = baseData.length > 50000 ? baseData.slice() : [...baseData]

    if (chartFilter.type === 'category') {
      const filterVal = chartFilter.value
      const stateCol = columns?.find((c) => String(c).toLowerCase() === 'state')
      const isStateAbbr = filterVal && String(filterVal).length === 2 && getStateAbbr(filterVal) === filterVal
      const useStateCol = stateCol && (String(selectedCategorical || '').toLowerCase() === 'state' || isStateAbbr)
      const filterCol = useStateCol ? stateCol : selectedCategorical
      if (filterCol) {
        if (filterCol === stateCol) {
          const filterAbbr = getStateAbbr(filterVal)
          result = result.filter((row) => getStateAbbr(row[filterCol]) === filterAbbr)
        } else {
          result = result.filter((row) => row[filterCol] === filterVal)
        }
      }
    } else if (chartFilter.type === 'date' && selectedDate) {
      result = result.filter((row) => {
        const rowDate = new Date(row[selectedDate])
        const filterDate = new Date(chartFilter.value)
        return rowDate.toDateString() === filterDate.toDateString()
      })
    }

    return result
  }, [chartFilter, selectedCategorical, selectedDate, columns])

  const handleFilterChange = (filters, filtered) => {
    const sidebarFiltered = filtered || data
    setSidebarFilteredData(sidebarFiltered)
    const result = applyChartFilter(sidebarFiltered)
    setFilteredData(result)
  }

  const handleDateRangeFilter = (filterInfo) => {
    if (filterInfo && filterInfo.filteredData) {
      setSidebarFilteredData(filterInfo.filteredData)
      const result = applyChartFilter(filterInfo.filteredData)
      setFilteredData(result)
    } else {
      setSidebarFilteredData(data)
      setFilteredData(chartFilter ? applyChartFilter(data) : data)
    }
  }

  const samgovDateQuickOptions = useMemo(() => {
    if (!isOpportunityDataset) return []
    const options = [
      { key: 'updatedDate', label: 'Updated' },
      { key: 'responseDeadLine', label: 'Response Deadline' },
      { key: 'postedDate', label: 'Posted' },
    ]
    return options.filter((opt) => (dateColumns || []).includes(opt.key))
  }, [isOpportunityDataset, dateColumns])

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

  const toggleFullscreen = () => setFullScreen((f) => !f)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && fullScreen) setFullScreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullScreen])

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
  }, [chartFilter, selectedCategorical, selectedDate, applyChartFilter, sidebarFilteredData, data])

  const stats = calculateStats()
  const currentDate = new Date()
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Same as Dashboard: map only when 'state' column exists
  const showMapTab = useMemo(() => {
    return (columns || []).some((c) => String(c).toLowerCase() === 'state')
  }, [columns])

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
        {showLoader ? <Loader /> : <div className="flex-1 min-h-[200px]" />}
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

      {/* Date Range Slider and Date field - top of dashboard (same as main Dashboard) */}
      {data && (dateColumns || []).length > 0 && (
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                {selectedDate && (dateColumns || []).includes(selectedDate) && (
                  <DateRangeSlider
                    data={data}
                    selectedDate={selectedDate}
                    onFilterChange={handleDateRangeFilter}
                  />
                )}
              </div>
              {samgovDateQuickOptions.length > 0 && (
                <div className="flex items-center gap-2 md:ml-4">
                  <span className="text-xs font-medium text-gray-600">Date field:</span>
                  {samgovDateQuickOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setSelectedDate(opt.key)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        selectedDate === opt.key
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={fullScreen ? 'fixed inset-0 z-30 bg-gray-50 flex flex-col overflow-hidden' : ''}>
        {fullScreen && (
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">{dashboardTitle}</span>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
              title="Exit Fullscreen (ESC)"
            >
              Exit Fullscreen
            </button>
          </div>
        )}
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 ${fullScreen ? 'flex-1 overflow-auto' : ''}`}>
        {/* Header with Filters, Fullscreen, and view mode toolbar (same as main Dashboard) */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center animate-fade-in gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {dashboardTitle}
            </h1>
            <p className="text-sm text-gray-600">
              {filteredData?.length || 0} records • {columns.length} columns
            </p>
            <p className="text-xs text-blue-600 font-medium mt-1">Shared Dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Filters Button & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
                title="Filters"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {showFilters ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : null}
              </button>
              {showFilters && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Filters & Columns</h3>
                        <button type="button" onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <Filters
                        data={data}
                        numericColumns={effectiveNumericColumns}
                        categoricalColumns={categoricalColumns}
                        dateColumns={dateColumns}
                        onFilterChange={handleFilterChange}
                        selectedNumeric={selectedNumeric}
                        selectedCategorical={selectedCategorical}
                        selectedDate={selectedDate}
                        onColumnChange={handleColumnChange}
                        initialFilters={sharedFilterSnapshot}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
              title={fullScreen ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {fullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDashboardView('simple')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${dashboardView === 'simple' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                Charts
              </button>
              <button
                type="button"
                onClick={() => setDashboardView('advanced')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${dashboardView === 'advanced' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                Advanced
              </button>
              <button
                type="button"
                onClick={() => setDashboardView('custom')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${dashboardView === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                Custom
              </button>
              <button
                type="button"
                onClick={() => setDashboardView('timeseries')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${dashboardView === 'timeseries' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                Time Series
              </button>
              <button
                type="button"
                onClick={() => setDashboardView('data')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${dashboardView === 'data' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
              >
                Data & Metadata
              </button>
            </div>
          </div>
        </div>

        {/* Same order as main Dashboard: Metric/Category tabs then active filter then charts */}
        <MetricTabsBar />
        <CategoryTabsBar />

        {/* Active Filter Indicator - same as main Dashboard */}
        {chartFilter && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3 animate-slide-up">
            <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-900">
                  Filtered by: <span className="font-semibold">
                    {chartFilter.type === 'category' ? (String(chartFilter.value).length === 2 && getStateAbbr(chartFilter.value) === chartFilter.value ? getStateDisplayLabel(chartFilter.value) : chartFilter.value) :
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

        {/* Charts Section - exact same branching as main Dashboard: data | timeseries | advanced | custom | simple */}
        {dashboardView === 'data' ? (
          <DataMetadataEditor
            data={data}
            columns={columns}
            numericColumns={effectiveNumericColumns}
            categoricalColumns={categoricalColumns}
            dateColumns={dateColumns}
            onMetadataUpdate={() => {}}
          />
        ) : dashboardView === 'timeseries' ? (
          <TimeSeriesReport
            data={filteredData || data}
            numericColumns={effectiveNumericColumns}
            dateColumns={dateColumns}
            selectedNumeric={selectedNumeric}
            selectedDate={selectedDate}
          />
        ) : dashboardView === 'advanced' ? (
          <>
            <details className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <summary className="px-4 py-3 cursor-pointer list-none flex items-center gap-2 font-medium text-gray-700 hover:bg-gray-50 select-none">
                <span className="text-blue-600" aria-hidden>📖</span>
                Dashboard guide – what each view and term means
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 text-sm text-gray-600 space-y-3">
                <p><strong>Views:</strong> <em>Charts</em> = line + pie + metrics. <em>Advanced</em> = more charts at once (line, donut, bar, sunburst). <em>Custom</em> = your own layout. <em>Time Series</em> = trends over time. <em>Data &amp; Metadata</em> = raw table and column types.</p>
                <p><strong>Datasets:</strong> <em>Sales</em> = revenue by product/region. <em>Maritime AIS</em> = vessel positions and speed (SOG, COG). <em>SAM.gov</em> = federal contract opportunities. <em>USA Spending</em> = federal awards.</p>
                <p><strong>Hover over field names</strong> (e.g. COG, SOG, base type, organization) in the chart titles above to see what they mean.</p>
              </div>
            </details>
            <AdvancedDashboard
              data={data}
              filteredData={filteredData}
              selectedNumeric={selectedNumeric}
              selectedCategorical={selectedCategorical}
              selectedDate={selectedDate}
              onChartFilter={handleChartFilter}
              chartFilter={chartFilter}
              categoricalColumns={categoricalColumns}
              numericColumns={effectiveNumericColumns}
              dateColumns={dateColumns}
            />
          </>
        ) : dashboardView === 'custom' && sharedLayouts && Object.keys(sharedLayouts).length > 0 ? (
          <AdvancedDashboardGrid
            data={data}
            filteredData={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
            onChartFilter={handleChartFilter}
            chartFilter={chartFilter}
            categoricalColumns={categoricalColumns}
            numericColumns={effectiveNumericColumns}
            dateColumns={dateColumns}
            viewMode="readonly"
            initialLayouts={sharedLayouts}
            initialWidgetVisibility={sharedWidgetVisibility}
          />
        ) : (
          <>
            {showMapTab && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 mb-6" style={{ minHeight: '360px' }}>
                <ContractMapWidget
                  data={filteredData || data}
                  selectedCategorical="state"
                  selectedNumeric={effectiveNumericColumns?.includes('award_amount') ? 'award_amount' : effectiveNumericColumns?.includes('opportunity_count') ? 'opportunity_count' : null}
                  chartFilter={chartFilter}
                  onChartFilter={handleChartFilter}
                />
              </div>
            )}
            <DashboardCharts
              data={data}
              filteredData={filteredData}
              selectedNumeric={selectedNumeric}
              selectedCategorical={selectedCategorical}
              selectedDate={selectedDate}
              onChartFilter={handleChartFilter}
              chartFilter={chartFilter}
              pieFilteredData={opportunityPieDataByOrg}
              pieDimensionOverride={opportunityPieDataByOrg ? 'organization' : undefined}
              pieTitleOverride={opportunityPieDataByOrg ? `By organization (${selectedOpportunityNoticeType})` : undefined}
            />
          </>
        )}

        {/* Matching opportunities - same as main Dashboard (includes All / Favorites) */}
        {renderOpportunityListPanel()}

        {/* Metric Cards - Only in simple view, same position as unshared (bottom, before AI Insights) */}
        {dashboardView === 'simple' && (
          <MetricCards
            data={filteredData}
            numericColumns={effectiveNumericColumns}
            selectedNumeric={selectedNumeric}
            stats={stats}
          />
        )}

        {/* AI Insights - same section as main Dashboard (no duplicate Filters) */}
        <div className="mt-6 space-y-4">
          <details className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold text-gray-900 mb-4">
              AI Insights & Export
            </summary>
            <div className="mt-4">
              <button
                onClick={() => navigate('/')}
                className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
              >
                Create Your Own Dashboard
              </button>
              <AIInsights
                data={filteredData}
                columns={columns}
                totalRows={filteredData?.length || 0}
                stats={stats}
              />
            </div>
          </details>
        </div>
      </div>
      </div>
    </div>
  )
}

export default SharedDashboard

