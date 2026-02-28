import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { parseNumericValue } from '../utils/numberUtils'
import Loader from '../components/Loader'
import DashboardCharts from '../components/DashboardCharts'
import AdvancedDashboard from '../components/AdvancedDashboard'
import AdvancedDashboardGrid from '../components/AdvancedDashboardGrid'
import MetricCards from '../components/MetricCards'
import Filters from '../components/Filters'
import AIInsights from '../components/AIInsights'
import ForecastChart from '../components/ForecastChart'
import DataMetadataEditor from '../components/DataMetadataEditor'
import TimeSeriesReport from '../components/TimeSeriesReport'
import ContractMapWidget, { getStateAbbr, getStateDisplayLabel } from '../components/widgets/ContractMapWidget'
import DateRangeSlider from '../components/DateRangeSlider'
import SubawardDrilldownModal from '../components/SubawardDrilldownModal'
import UpgradePrompt from '../components/UpgradePrompt'
import { useAuth } from '../contexts/AuthContext'
import { getSubscription } from '../services/subscriptionService'
import { PLANS } from '../config/pricing'
import { saveAs } from 'file-saver'
import { generateShareId, saveSharedDashboard, getShareableUrl, copyToClipboard } from '../utils/shareUtils'
import { clearAnalyticsDataAndReload } from '../utils/analyticsStorage'
import { saveDashboard, updateDashboard } from '../services/dashboardService'
import apiClient from '../config/api'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import * as XLSX from 'xlsx'
import { createDashboardShortVideo, downloadVideoBlob, getVideoFileExtension, getShortsExportCapabilities, saveVideoBlobAs } from '../utils/shortsVideoExport'
import * as savedShortsStorage from '../utils/savedShortsStorage'
import { getGoogleYouTubeUploadToken, uploadVideoToYouTube, isYouTubeUploadConfigured } from '../utils/youtubeUpload'
import { API_BASE_URL } from '../config/api'
import { startScreenRecording, isScreenRecordingSupported } from '../utils/screenRecorder'

function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
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
  const [chartFilter, setChartFilter] = useState(null) // { type: 'category' | 'date', value: string }
  const [shareId, setShareId] = useState(null)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [dashboardView, setDashboardView] = useState('simple') // 'simple', 'data', or 'timeseries'
  const [dashboardTitle, setDashboardTitle] = useState('Analytics Dashboard')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [isTitleCustomized, setIsTitleCustomized] = useState(false)
  // Store the sidebar-filtered data separately
  const [sidebarFilteredData, setSidebarFilteredData] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [savedDashboardId, setSavedDashboardId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveFeedbackMessage, setSaveFeedbackMessage] = useState('')
  const [lastPersistedTitle, setLastPersistedTitle] = useState('')
  const [shortDurationSeconds, setShortDurationSeconds] = useState(15)
  const [shortFormat, setShortFormat] = useState('webm')
  const [shortCallToAction, setShortCallToAction] = useState('Follow for more analytics updates')
  const [showShortGuide, setShowShortGuide] = useState(false)
  const [shortGuidePreset, setShortGuidePreset] = useState('youtube') // youtube | reels | tiktok
  const [lockShortGuideToExport, setLockShortGuideToExport] = useState(true)
  const [shortGuideRect, setShortGuideRect] = useState(null) // { xRatio, yRatio, wRatio, hRatio } relative to shortRootRef
  const [isDraggingGuide, setIsDraggingGuide] = useState(false)
  const [isResizingGuide, setIsResizingGuide] = useState(false)
  const [generatingShortVideo, setGeneratingShortVideo] = useState(false)
  const [lastShortVideo, setLastShortVideo] = useState(null) // { blob, filename, title }
  const [shortVideoError, setShortVideoError] = useState('')
  const [shortVideoProgress, setShortVideoProgress] = useState({ active: false, phase: '', progress: 0 })
  const [savedShortsList, setSavedShortsList] = useState([])
  const [uploadingToYouTubeId, setUploadingToYouTubeId] = useState(null)
  const [ytUploadError, setYtUploadError] = useState('')
  const [recordingStorySteps, setRecordingStorySteps] = useState(false)
  const [recordingCountdown, setRecordingCountdown] = useState(0)
  const [storySteps, setStorySteps] = useState([]) // { selector, label, waitMs }
  const [isRecordingScreen, setIsRecordingScreen] = useState(false)
  const [screenRecordingElapsed, setScreenRecordingElapsed] = useState(0)
  const [captureShorts916, setCaptureShorts916] = useState(true)
  const screenRecordControllerRef = useRef(null)
  const screenRecordingIntervalRef = useRef(null)
  const [showFilters, setShowFilters] = useState(false)
  const [dashboardLayouts, setDashboardLayouts] = useState(null) // Store widget layouts for sharing
  const [dashboardWidgetVisibility, setDashboardWidgetVisibility] = useState(null) // Store widget visibility for sharing
  const [subawardModalOpen, setSubawardModalOpen] = useState(false)
  const [subawardRecipient, setSubawardRecipient] = useState('')
  const [entityFilters, setEntityFilters] = useState({
    uei: '',
    businessName: '',
    naicsCode: '',
    registrationStatus: '',
    country: '',
    state: '',
  })
  const [agencyDrilldown, setAgencyDrilldown] = useState({
    agency: '',
    rows: [],
    loading: false,
    error: '',
  })
  const [agencySearch, setAgencySearch] = useState('')
  const [opportunityKeyword, setOpportunityKeyword] = useState('')
  const [opportunityDateRangeDays, setOpportunityDateRangeDays] = useState(30) // 7, 30, or 364 (last year)
  const [searchByIntent, setSearchByIntent] = useState(true)
  const [intentKeywords, setIntentKeywords] = useState([])
  const [selectedOpportunityNoticeType, setSelectedOpportunityNoticeType] = useState('')
  // Favorites: Set of IDs (for quick lookup) + array of full rows (so Favorites view shows them regardless of filters)
  const idFromRow = (x) => String(x?.noticeId || x?.uiLink || `${x?.title || ''}-${x?.solicitationNumber || ''}`)
  const [opportunityFavorites, setOpportunityFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem('nm2-opportunity-favorites')
      if (!raw) return new Set()
      const data = JSON.parse(raw)
      const ids = Array.isArray(data)
        ? data.map((x) => (typeof x === 'string' ? x : idFromRow(x)))
        : (data?.ids ?? (Array.isArray(data?.rows) ? data.rows.map(idFromRow) : []))
      return new Set(Array.isArray(ids) ? ids : [])
    } catch {
      return new Set()
    }
  })
  const [opportunityFavoriteRows, setOpportunityFavoriteRows] = useState(() => {
    try {
      const raw = localStorage.getItem('nm2-opportunity-favorites')
      if (!raw) return []
      const data = JSON.parse(raw)
      const rows = data?.rows ?? (Array.isArray(data) ? data.filter((x) => typeof x === 'object' && x !== null) : [])
      return Array.isArray(rows) ? rows.map((x) => ({ ...x })) : []
    } catch {
      return []
    }
  })
  const [opportunityViewFilter, setOpportunityViewFilter] = useState('all') // 'all' | 'favorites'
  const [selectedOpportunityOrg, setSelectedOpportunityOrg] = useState('') // when set, list shows only this org (used when a base type is selected)
  const deferredOpportunityKeyword = useDeferredValue(opportunityKeyword)
  const [apiKeywordOpportunityRows, setApiKeywordOpportunityRows] = useState([])
  const [apiKeywordLoading, setApiKeywordLoading] = useState(false)
  const [apiKeywordError, setApiKeywordError] = useState('')
  const [noDataReason, setNoDataReason] = useState(null) // 'no-storage' | 'invalid-data' when dashboard has nothing to show
  const [upgradePrompt, setUpgradePrompt] = useState(null)
  const [currentPlan, setCurrentPlan] = useState('free')
  const hasInitialized = useRef(false)
  const isUpdatingMetadata = useRef(false)
  const lastAutoTitleMetric = useRef('')
  const shortRootRef = useRef(null)
  const shortCaptureRef = useRef(null)
  const storyRecorderPanelRef = useRef(null)
  const lastStoryStepTsRef = useRef(0)
  const guideDragRef = useRef({ startX: 0, startY: 0, baseRect: null })
  const guideResizeRef = useRef({ startX: 0, startY: 0, baseRect: null })
  const shortVideoCancelRef = useRef(false)
  const shortVideoAbortRef = useRef(null)
  const opportunityDateRangePrevRef = useRef(opportunityDateRangeDays)
  const filterSnapshotRef = useRef(null) // Current sidebar filter state for sharing
  const MAX_CATEGORY_TABS = 12
  const MAX_METRIC_TABS = 10

  useEffect(() => {
    let mounted = true
    if (!user) {
      setCurrentPlan('free')
      return () => { mounted = false }
    }
    getSubscription()
      .then((sub) => {
        if (!mounted) return
        setCurrentPlan(sub?.plan || 'free')
      })
      .catch(() => {
        // default to free; keep UI working even if subscription endpoint fails
        if (!mounted) return
        setCurrentPlan('free')
      })
    return () => { mounted = false }
  }, [user])

  useEffect(() => {
    let mounted = true
    savedShortsStorage.listShorts().then((list) => {
      if (mounted) setSavedShortsList(list)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    return () => {
      if (screenRecordingIntervalRef.current) {
        clearInterval(screenRecordingIntervalRef.current)
        screenRecordingIntervalRef.current = null
      }
    }
  }, [])

  const formatFieldLabel = useCallback((field) => {
    const raw = String(field || '').trim()
    if (!raw) return ''
    const lower = raw.toLowerCase()
    // Known abbreviations
    if (lower === 'adr') return 'ADR'
    if (lower === 'revpar') return 'RevPAR'
    if (lower === 'occupancy_rate') return 'Occupancy Rate'

    // Split snake_case, kebab-case, and camelCase into words
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

  // Auto-adjust dashboard title based on the selected metric.
  // Example: selecting "food_revenue" -> "Food Revenue"
  useEffect(() => {
    if (!selectedNumeric) return
    if (isTitleCustomized) return
    const pretty = formatFieldLabel(selectedNumeric)
    if (!pretty) return
    // Avoid redundant state updates
    if (lastAutoTitleMetric.current === selectedNumeric) return
    lastAutoTitleMetric.current = selectedNumeric
    setDashboardTitle(pretty)
  }, [selectedNumeric, formatFieldLabel, isTitleCustomized])

  const startEditingTitle = useCallback(() => {
    setTitleDraft(dashboardTitle || '')
    setIsEditingTitle(true)
  }, [dashboardTitle])

  const cancelEditingTitle = useCallback(() => {
    setIsEditingTitle(false)
    setTitleDraft('')
  }, [])

  const saveEditedTitle = useCallback(() => {
    const next = String(titleDraft || '').trim()
    if (!next) {
      cancelEditingTitle()
      return
    }
    setDashboardTitle(next)
    setIsTitleCustomized(true)
    setIsEditingTitle(false)
  }, [titleDraft, cancelEditingTitle])

  const renderDashboardTitleEditor = useCallback(() => {
    if (isEditingTitle) {
      return (
        <div className="flex items-center gap-2 mb-1">
          <input
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEditedTitle()
              if (e.key === 'Escape') cancelEditingTitle()
            }}
            autoFocus
            className="text-2xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 min-w-[260px]"
            aria-label="Dashboard name"
          />
          <button
            type="button"
            onClick={saveEditedTitle}
            className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={cancelEditingTitle}
            className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-2xl font-bold text-gray-900">
          {dashboardTitle}
        </h1>
        <button
          type="button"
          onClick={startEditingTitle}
          className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          title="Rename dashboard"
        >
          Rename
        </button>
      </div>
    )
  }, [isEditingTitle, titleDraft, dashboardTitle, saveEditedTitle, cancelEditingTitle, startEditingTitle])

  // Build "category tabs" from the selected categorical column values.
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

  // Hide non-informative metrics from UI selectors (e.g., SAM.gov award_amount when all rows are 0/empty).
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

  // Metric tabs: quick switch between numeric measures inside the report
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

  // Debug: Check if layouts are saved
  useEffect(() => {
    console.log('Saved layouts:', localStorage.getItem('dashboard_layouts'))
    console.log('Saved visibility:', localStorage.getItem('dashboard_widget_visibility'))
  }, [dashboardLayouts, dashboardWidgetVisibility])

  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) {
      console.log('Dashboard: Already initialized, skipping')
      return
    }
    
    console.log('Dashboard: Starting initialization. Location state:', !!location.state?.analyticsData)
    
    // First check if data was passed via navigation state (for large files that exceed storage quota)
    if (location.state?.analyticsData) {
      console.log('Dashboard: Found data in location.state, initializing')
      hasInitialized.current = true
      const analyticsData = location.state.analyticsData
      // Clear navigation state AFTER capturing the data
      navigate(location.pathname, { replace: true, state: {} })
      // Initialize with captured data
      initializeData(analyticsData)
      return
    }

    // Otherwise, try to get from sessionStorage
    const storedData = sessionStorage.getItem('analyticsData')
    if (!storedData) {
      console.log('Dashboard: No data in sessionStorage or location.state')
      hasInitialized.current = true
      setNoDataReason('no-storage')
      setLoading(false)
      return
    }

    try {
      console.log('Dashboard: Found data in sessionStorage, parsing...')
      hasInitialized.current = true
      const parsed = JSON.parse(storedData)
      console.log('Dashboard: Parsed data:', {
        hasData: !!parsed?.data,
        dataLength: parsed?.data?.length,
        columns: parsed?.columns?.length
      })
      if (!parsed || !parsed.data || !Array.isArray(parsed.data)) {
        console.error('Invalid data in sessionStorage:', parsed)
        sessionStorage.removeItem('analyticsData')
        setNoDataReason('invalid-data')
        setLoading(false)
        return
      }
      initializeData(parsed)
    } catch (error) {
      console.error('Error parsing stored data:', error)
      sessionStorage.removeItem('analyticsData')
      setNoDataReason('invalid-data')
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - location.state is checked but not in deps to prevent re-runs

  // Re-apply chart filter when it changes
  useEffect(() => {
    const baseData = sidebarFilteredData !== null ? sidebarFilteredData : data
    if (baseData) {
      const result = applyChartFilter(baseData)
      setFilteredData(result)
    }
  }, [chartFilter, selectedCategorical, selectedDate, sidebarFilteredData, data])

  const initializeData = (parsedData) => {
    try {
      console.log('Initializing data:', {
        dataLength: parsedData?.data?.length,
        columns: parsedData?.columns?.length,
        numericColumns: parsedData?.numericColumns,
        categoricalColumns: parsedData?.categoricalColumns,
        dateColumns: parsedData?.dateColumns,
      })
      
      // Validate parsedData
      if (!parsedData || !parsedData.data || !Array.isArray(parsedData.data)) {
        console.error('Invalid data format:', parsedData)
        // Set empty state so the error message displays
        setData([])
        setFilteredData([])
        setColumns(parsedData?.columns || [])
        setNumericColumns(parsedData?.numericColumns || [])
        setCategoricalColumns(parsedData?.categoricalColumns || [])
        setDateColumns(parsedData?.dateColumns || [])
        setLoading(false)
        return
      }
      
      // Check if data array is empty
      if (parsedData.data.length === 0) {
        console.warn('Data array is empty')
        setData([])
        setFilteredData([])
        setColumns(parsedData.columns || [])
        setNumericColumns(parsedData.numericColumns || [])
        setCategoricalColumns(parsedData.categoricalColumns || [])
        setDateColumns(parsedData.dateColumns || [])
        setLoading(false)
        return
      }
      
      // For large datasets, aggressively sample the data for display
      // This ensures smooth performance and responsive UI
      const MAX_ROWS_FOR_DISPLAY = 10000 // Reduced from 100k for better performance
      let displayData = parsedData.data
      
      if (parsedData.data && parsedData.data.length > MAX_ROWS_FOR_DISPLAY) {
        console.warn(`Dataset has ${parsedData.data.length} rows. Sampling ${MAX_ROWS_FOR_DISPLAY} rows for display to ensure smooth performance.`)
        // Sample evenly across the dataset
        const step = Math.ceil(parsedData.data.length / MAX_ROWS_FOR_DISPLAY)
        displayData = parsedData.data.filter((_, index) => index % step === 0)
        console.log(`Sampled to ${displayData.length} rows for optimal performance`)
      }
      
      // Store full data and sampled data separately
      setData(displayData) // Use sampled data for display
      setFilteredData(displayData)
      setSidebarFilteredData(displayData)
      setColumns(parsedData.columns || [])
      setNumericColumns(parsedData.numericColumns || [])
      setCategoricalColumns(parsedData.categoricalColumns || [])
      setDateColumns(parsedData.dateColumns || [])

      const sourceDashboardId = parsedData?.dashboardId || parsedData?.id || null
      if (sourceDashboardId) {
        setSavedDashboardId(sourceDashboardId)
        setLastPersistedTitle(String(parsedData?.name || '').trim())
      } else {
        setSavedDashboardId(null)
        setLastPersistedTitle('')
      }

      // Restore dashboard view if saved (for shared dashboards)
      if (parsedData.dashboardView) {
        setDashboardView(parsedData.dashboardView)
      }

      // Generate dashboard title based on data context
      const allColumns = parsedData.columns || []
      setIsTitleCustomized(false)
      setIsEditingTitle(false)
      const savedName = String(parsedData?.name || '').trim()
      if (savedName) {
        setDashboardTitle(savedName)
        setIsTitleCustomized(true)
        if (sourceDashboardId) {
          setLastPersistedTitle(savedName)
        }
      }
      
      // First, check for specific dataset sources (API datasets)
      const getDatasetTitleFromSource = (source) => {
        if (!source) return null
        
        const sourceLower = source.toLowerCase()

        // SAM.gov Entity Data Bank
        if (sourceLower.includes('entity information') || sourceLower.includes('data bank')) {
          return 'SAM.gov Entity Data Bank'
        }
        
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
      const datasetTitle = parsedData.datasetName || getDatasetTitleFromSource(parsedData.source)
      
      if (!savedName && datasetTitle) {
        setDashboardTitle(datasetTitle)
      } else if (!savedName) {
        // Detect domain from column names (fallback)
        const detectDomain = (columns) => {
          const lowerColumns = columns.map(col => col.toLowerCase())

          // SAM.gov Entity Data Bank indicators
          if (lowerColumns.some(col =>
            col.includes('ueisam') ||
            col.includes('legalbusinessname') ||
            col.includes('registrationstatus')
          )) {
            return 'SAM.gov Entity Data Bank'
          }
          
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
          
          // Medical/Healthcare indicators
          if (lowerColumns.some(col => 
            col.includes('patient') || col.includes('diagnosis') || 
            col.includes('treatment') || col.includes('medication') ||
            col.includes('department') && (col.includes('cardiology') || col.includes('orthopedic'))
          )) {
            return 'Medical Data'
          }
          
          // Sales indicators
          if (lowerColumns.some(col => 
            col.includes('sales') || col.includes('revenue') || 
            col.includes('product') || col.includes('customer')
          )) {
            return 'Sales Data'
          }
          
          // Education indicators
          if (lowerColumns.some(col => 
            col.includes('student') || col.includes('school') || 
            col.includes('grade') || col.includes('attendance')
          )) {
            return 'Education Data'
          }
          
          // Financial indicators
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
        } else if (parsedData.categoricalColumns && parsedData.categoricalColumns.length > 0) {
          // Use first categorical column as fallback
          const firstCategory = parsedData.categoricalColumns[0]
          const formattedTitle = firstCategory
            .split(/[\s_]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ')
          setDashboardTitle(`${formattedTitle} Analytics`)
        } else {
          setDashboardTitle('Analytics Dashboard')
        }
      }

      // Auto-select first columns
      const pickBestNumeric = (numericCols) => {
        const cols = Array.isArray(numericCols) ? numericCols : []
        const score = (col) => {
          const s = String(col || '').toLowerCase()
          if (!s) return -Infinity
          // Strongly avoid ID-like fields
          if (s.includes('id') || s.includes('uuid') || s.includes('code') || s.includes('zip') || s.includes('phone')) return -50
          // Avoid SAM.gov/public-procurement identifier fields
          if (s.includes('naics') || s.includes('solicitation') || s.includes('classification') || s.includes('setaside') || s.includes('set_aside')) return -50
          let v = 0
          // Prefer counts as safe default metric when money field is sparse
          if (s.includes('count') || s.includes('opportunity_count') || s.includes('opportunities')) v += 95
          // Money/volume flows
          if (s.includes('revenue') || s.includes('sales') || s.includes('amount') || s.includes('total')) v += 100
          if (s.includes('cost') || s.includes('expense') || s.includes('spend')) v += 90
          // Hotel-ish volumes
          if (s.includes('rooms_sold') || (s.includes('rooms') && s.includes('sold'))) v += 85
          if (s.includes('rooms_occupied') || (s.includes('rooms') && s.includes('occupied'))) v += 80
          if (s.includes('arrivals') || s.includes('departures') || s.includes('bookings')) v += 70
          // Rates/snapshots (useful but less ideal as "total" metric)
          if (s.includes('adr') || s.includes('revpar') || s.includes('occupancy')) v += 60
          if (s.includes('available') || s.includes('capacity') || s.includes('inventory')) v += 35
          // Prefer common measure names
          if (s === 'revenue' || s === 'sales' || s === 'amount') v += 20
          return v
        }
        return cols
          .map((c) => ({ c, s: score(c) }))
          .sort((a, b) => b.s - a.s)[0]?.c || ''
      }

      const pickBestCategorical = (categoricalCols, sampleRows) => {
        const cols = Array.isArray(categoricalCols) ? categoricalCols : []
        const rows = Array.isArray(sampleRows) ? sampleRows : []
        const sample = rows.slice(0, 500)

        const card = (col) => {
          const set = new Set()
          for (const r of sample) {
            const v = r?.[col]
            if (v == null || v === '') continue
            set.add(String(v))
            if (set.size > 50) break
          }
          return set.size
        }

        const score = (col) => {
          const s = String(col || '').toLowerCase()
          if (!s) return -Infinity
          // Avoid date-like fields as categorical defaults
          if (s.includes('date') || s.includes('time') || s.includes('year') || s.includes('month')) return -20
          const distinct = card(col)
          // Prefer modest cardinality categories; avoid huge unique sets.
          if (distinct < 2) return -10
          if (distinct > 25) return -15
          let v = 0
          if (distinct <= 12) v += 25
          if (s.includes('category') || s.includes('type') || s.includes('status')) v += 30
          if (s.includes('region') || s.includes('department') || s.includes('product') || s.includes('segment')) v += 20
          return v
        }

        return cols
          .map((c) => ({ c, s: score(c) }))
          .sort((a, b) => b.s - a.s)[0]?.c || ''
      }

      // Restore saved selections when loading a saved/shared dashboard so it matches what was saved/shared
      if (parsedData.selectedNumeric != null && parsedData.selectedNumeric !== '' && (parsedData.numericColumns || []).includes(parsedData.selectedNumeric)) {
        setSelectedNumeric(parsedData.selectedNumeric)
      } else if (parsedData.numericColumns && parsedData.numericColumns.length > 0) {
        setSelectedNumeric(pickBestNumeric(parsedData.numericColumns))
      }
      if (parsedData.selectedCategorical != null && parsedData.selectedCategorical !== '' && (parsedData.categoricalColumns || []).includes(parsedData.selectedCategorical)) {
        setSelectedCategorical(parsedData.selectedCategorical)
      } else if (parsedData.categoricalColumns && parsedData.categoricalColumns.length > 0) {
        const budgetCategoryColumn = parsedData.categoricalColumns.find(col =>
          col.toLowerCase().includes('budget') && col.toLowerCase().includes('category')
        )
        const metricColumn = parsedData.categoricalColumns.find(col =>
          col.toLowerCase() === 'metric' || col === 'Metric'
        )
        const bestCategorical = pickBestCategorical(parsedData.categoricalColumns, displayData)
        const columnToSelect = budgetCategoryColumn || metricColumn || bestCategorical || parsedData.categoricalColumns[0]
        setSelectedCategorical(columnToSelect)
      }
      if (parsedData.selectedDate != null && parsedData.selectedDate !== '' && (parsedData.dateColumns || []).includes(parsedData.selectedDate)) {
        setSelectedDate(parsedData.selectedDate)
      } else if (parsedData.dateColumns && parsedData.dateColumns.length > 0) {
        const isSamgovOpportunitiesDataset =
          (parsedData.source && /sam\.gov opportunities/i.test(String(parsedData.source))) ||
          ((parsedData.columns || []).some((c) => ['noticeId', 'responseDeadLine', 'postedDate'].includes(c)))
        if (isSamgovOpportunitiesDataset) {
          const samgovDatePref = ['updatedDate', 'responseDeadLine', 'postedDate']
          const selectedSamgovDate =
            samgovDatePref.find((f) => (parsedData.dateColumns || []).includes(f)) ||
            parsedData.dateColumns[0]
          setSelectedDate(selectedSamgovDate)
        } else {
          setSelectedDate(parsedData.dateColumns[0])
        }
      }
      if (parsedData.opportunityKeyword != null && String(parsedData.opportunityKeyword).trim() !== '') {
        setOpportunityKeyword(String(parsedData.opportunityKeyword).trim())
      }
      if (parsedData.selectedOpportunityNoticeType != null && String(parsedData.selectedOpportunityNoticeType).trim() !== '') {
        const noticeType = String(parsedData.selectedOpportunityNoticeType).trim()
        setSelectedOpportunityNoticeType(noticeType)
        setChartFilter({ type: 'category', value: noticeType })
      }

      // Entity datasets are best explored via table + filters by default.
      const isEntityLikeDataset =
        (parsedData.source && /entity information|data bank/i.test(String(parsedData.source))) ||
        ((parsedData.columns || []).some((c) => ['ueiSAM', 'legalBusinessName', 'registrationStatus'].includes(c)))
      if (isEntityLikeDataset) {
        // Force a sensible default for entity datasets (table-first) to avoid empty chart mode.
        setDashboardView('data')
        const entityCatPref = ['registrationStatus', 'country', 'state', 'naicsCode', 'legalBusinessName', 'ueiSAM']
        const entityDatePref = ['registrationDate', 'expirationDate']
        const selectedEntityCategorical =
          entityCatPref.find((f) => (parsedData.categoricalColumns || []).includes(f)) ||
          (parsedData.categoricalColumns || [])[0] ||
          ''
        const selectedEntityDate =
          entityDatePref.find((f) => (parsedData.dateColumns || []).includes(f)) ||
          (parsedData.dateColumns || [])[0] ||
          ''
        setSelectedNumeric('')
        setSelectedCategorical(selectedEntityCategorical)
        setSelectedDate(selectedEntityDate)
      }

      // Ensure loading is set to false after initialization
      console.log('Setting loading to false. Display data length:', displayData?.length)
      setLoading(false)
      console.log('Data initialization complete. Data length:', displayData?.length, 'Columns:', parsedData.columns?.length, 'Numeric columns:', parsedData.numericColumns?.length)
    } catch (error) {
      console.error('Error initializing data:', error)
      setLoading(false)
      // Show error message to user
      alert(`Error loading data: ${error.message}. Please try uploading again.`)
    }
  }

  // Memoize applyChartFilter to ensure stable reference for useCallback
  const applyChartFilter = useCallback((baseData) => {
    if (!baseData) return baseData
    if (!chartFilter) return baseData
    
    // For large arrays, use slice instead of spread to avoid stack overflow
    let result = baseData.length > 50000 
      ? baseData.slice() 
      : [...baseData]
    
    // Apply chart filter if exists
    if (chartFilter.type === 'category') {
      const filterVal = chartFilter.value
      const stateCol = columns?.find((c) => String(c).toLowerCase() === 'state')
      const isStateAbbr = filterVal && String(filterVal).length === 2 && getStateAbbr(filterVal) === filterVal
      const useStateCol = stateCol && (selectedCategorical === 'state' || isStateAbbr)
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
    filterSnapshotRef.current = filters
    // Use requestAnimationFrame to make filtering non-blocking
    requestAnimationFrame(() => {
      // Store sidebar-filtered data
      const sidebarFiltered = filtered || data
      setSidebarFilteredData(sidebarFiltered)
      
      // Apply chart filter on top of sidebar filters
      requestAnimationFrame(() => {
        const result = applyChartFilter(sidebarFiltered)
        setFilteredData(result)
      })
    })
  }

  // Handle date range slider filter changes
  const handleDateRangeFilter = useCallback((filterInfo) => {
    if (filterInfo && filterInfo.filteredData) {
      // Date range filter applies to the base data
      const dateFiltered = filterInfo.filteredData
      
      // Update sidebar filtered data immediately
      setSidebarFilteredData(dateFiltered)
      
      // Apply chart filter and update filtered data immediately
      // This ensures charts update in real-time during animation
      const result = applyChartFilter(dateFiltered)
      setFilteredData(result)
    } else if (filterInfo && !filterInfo.filteredData) {
      // Reset filter if no filtered data
      setSidebarFilteredData(data)
      const result = applyChartFilter(data)
      setFilteredData(result)
    }
  }, [data, chartFilter, selectedCategorical, selectedDate, applyChartFilter])

  const handleChartFilter = (filter) => {
    setChartFilter(filter)
    // When pie is "by organization" (base type selected), sync pie slice click to org filter for the list
    if (isOpportunityDataset && selectedOpportunityNoticeType) {
      if (filter?.type === 'category' && filter?.value) setSelectedOpportunityOrg(filter.value)
      else setSelectedOpportunityOrg('')
    }
  }

  const openSubawardsForRecipient = useCallback((recipientName) => {
    setSubawardRecipient(recipientName || '')
    setSubawardModalOpen(true)
    
    // Debug: Log the Award IDs being collected
    const allData = sidebarFilteredData || filteredData || data || []
    const matchingRows = allData.filter((r) => {
      if (!r) return false
      const recipientNameField = r['Recipient Name'] || r['Recipient Name'] || r.recipientName
      return recipientNameField === recipientName
    })
    
    const awardIds = matchingRows.map((r) => {
      // Try multiple field name variations
      return r['Award ID'] || r['AwardID'] || r.awardId || r.award_id || r.id || ''
    }).filter((id) => id && id !== '')
    
    // Debug: Check if Award ID column exists
    const firstRow = allData[0]
    const hasAwardIdColumn = firstRow && ('Award ID' in firstRow || 'AwardID' in firstRow || 'awardId' in firstRow)
    const columnsList = columns || []
    const hasAwardIdInColumns = columnsList.includes('Award ID') || columnsList.includes('AwardID')
    
    console.log('openSubawardsForRecipient:', { 
      recipientName, 
      awardIds, 
      awardIdsCount: awardIds.length,
      matchingRowsCount: matchingRows.length,
      totalRows: allData.length,
      hasAwardIdColumn,
      hasAwardIdInColumns,
      columns: columnsList,
      firstRowKeys: firstRow ? Object.keys(firstRow) : []
    })
    
    if (awardIds.length === 0 && matchingRows.length > 0) {
      console.warn('No Award IDs found! Sample row:', matchingRows[0])
    }
  }, [sidebarFilteredData, filteredData, data, columns])

  const clearChartFilter = () => {
    setChartFilter(null)
  }

  const isOpportunityDataset = useMemo(() => {
    const colSet = new Set((columns || []).map((c) => String(c)))
    return (
      colSet.has('noticeId') &&
      colSet.has('title') &&
      colSet.has('uiLink')
    )
  }, [columns])

  const isEntityDataset = useMemo(() => {
    const colSet = new Set((columns || []).map((c) => String(c)))
    return (
      colSet.has('ueiSAM') &&
      colSet.has('legalBusinessName') &&
      colSet.has('registrationStatus')
    )
  }, [columns])

  const showMapTab = useMemo(() => {
    return (columns || []).some((c) => String(c).toLowerCase() === 'state')
  }, [columns])

  // Maritime/vessel data: has lat + lon and at least one vessel field (sog, cog, mmsi, vessel_type)
  const vesselMapConfig = useMemo(() => {
    const cols = (columns || []).map((c) => String(c))
    const lower = (c) => c.toLowerCase()
    const hasLat = cols.some((c) => lower(c) === 'lat' || lower(c) === 'latitude')
    const hasLon = cols.some((c) => lower(c) === 'lon' || lower(c) === 'longitude')
    const vesselFields = ['sog', 'cog', 'mmsi', 'vessel_type']
    const hasVesselField = vesselFields.some((f) => cols.some((c) => lower(c) === f))
    if (!hasLat || !hasLon || !hasVesselField) return { show: false, latCol: 'lat', lonCol: 'lon' }
    const latCol = cols.find((c) => lower(c) === 'lat') || cols.find((c) => lower(c) === 'latitude') || 'lat'
    const lonCol = cols.find((c) => lower(c) === 'lon') || cols.find((c) => lower(c) === 'longitude') || 'lon'
    return { show: true, latCol, lonCol }
  }, [columns])

  const samgovDateQuickOptions = useMemo(() => {
    if (!isOpportunityDataset) return []
    const options = [
      { key: 'updatedDate', label: 'Updated' },
      { key: 'responseDeadLine', label: 'Response Deadline' },
      { key: 'postedDate', label: 'Posted' },
    ]
    return options.filter((opt) => dateColumns.includes(opt.key))
  }, [isOpportunityDataset, dateColumns])

  // Build options from the pre-entity-filtered rows so users can explore all facets.
  const entityFilterOptions = useMemo(() => {
    const rows = Array.isArray(filteredData) ? filteredData : []
    const uniq = (field) => {
      const set = new Set()
      for (const r of rows) {
        const v = String(r?.[field] || '').trim()
        if (v) set.add(v)
        if (set.size > 300) break
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b))
    }
    return {
      naicsCode: uniq('naicsCode').slice(0, 200),
      registrationStatus: uniq('registrationStatus'),
      country: uniq('country'),
      state: uniq('state'),
    }
  }, [filteredData])

  const dashboardFilteredData = useMemo(() => {
    const rows = Array.isArray(filteredData) ? filteredData : []
    if (!isEntityDataset || !rows.length) return rows

    const qUei = String(entityFilters.uei || '').trim().toLowerCase()
    const qName = String(entityFilters.businessName || '').trim().toLowerCase()
    const qNaics = String(entityFilters.naicsCode || '').trim().toLowerCase()
    const qStatus = String(entityFilters.registrationStatus || '').trim().toLowerCase()
    const qCountry = String(entityFilters.country || '').trim().toLowerCase()
    const qState = String(entityFilters.state || '').trim().toLowerCase()

    return rows.filter((r) => {
      if (qUei && !String(r?.ueiSAM || '').toLowerCase().includes(qUei)) return false
      if (qName && !String(r?.legalBusinessName || '').toLowerCase().includes(qName)) return false
      if (qNaics && String(r?.naicsCode || '').toLowerCase() !== qNaics) return false
      if (qStatus && String(r?.registrationStatus || '').toLowerCase() !== qStatus) return false
      if (qCountry && String(r?.country || '').toLowerCase() !== qCountry) return false
      if (qState && String(r?.state || '').toLowerCase() !== qState) return false
      return true
    })
  }, [filteredData, isEntityDataset, entityFilters])

  useEffect(() => {
    if (!isEntityDataset) return
    setEntityFilters({
      uei: '',
      businessName: '',
      naicsCode: '',
      registrationStatus: '',
      country: '',
      state: '',
    })
  }, [isEntityDataset, columns])

  const allOpportunityRows = useMemo(() => {
    if (!isOpportunityDataset) return []
    const rows = Array.isArray(dashboardFilteredData) ? dashboardFilteredData : []
    if (!rows.length) return []

    // Deduplicate by stable keys to avoid repeated rows after reprocessing.
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
  }, [dashboardFilteredData, isOpportunityDataset])

  const predefinedOpportunityKeywords = useMemo(
    () => ['IT', 'AI', 'Data Analytics', 'House Keeping', 'Cybersecurity', 'Facilities'],
    []
  )

  useEffect(() => {
    const q = String(deferredOpportunityKeyword || '').trim()
    if (!isOpportunityDataset || q.length < 2) {
      setApiKeywordOpportunityRows([])
      setApiKeywordError('')
      setApiKeywordLoading(false)
      return
    }

    const formatMmDdYyyy = (d) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const yyyy = String(d.getFullYear())
      return `${mm}/${dd}/${yyyy}`
    }

    const now = new Date()
    const from = new Date(now)
    const days = Math.min(Math.max(Number(opportunityDateRangeDays) || 30, 1), 364)
    from.setDate(from.getDate() - days)

    const controller = new AbortController()
    setApiKeywordLoading(true)
    setApiKeywordError('')
    setIntentKeywords([])

    const baseParams = {
      postedFrom: formatMmDdYyyy(from),
      postedTo: formatMmDdYyyy(now),
      limit: 200,
    }

    const fetchByIntent = async () => {
      let keywords = [q]
      try {
        const intentRes = await apiClient.get('/api/example/samgov/expand-intent', {
          params: { q },
          timeout: 15000,
          signal: controller.signal,
        })
        const k = Array.isArray(intentRes?.data?.keywords) ? intentRes.data.keywords : [q]
        keywords = Array.isArray(k) && k.length ? k : [q]
      } catch (err) {
        if (controller.signal.aborted) return
        const status = err?.response?.status
        // If the intent-expansion route isn't available (404) or AI isn't configured (503),
        // silently fall back to the raw keyword without showing a warning.
        if (status === 404 || status === 503) {
          keywords = [q]
        } else {
          throw err
        }
      }
      if (controller.signal.aborted) return
      setIntentKeywords(keywords)
      const results = await Promise.all(
        keywords.map((kw) =>
          apiClient.get('/api/example/samgov/live', {
            params: { ...baseParams, title: kw },
            timeout: 30000,
            signal: controller.signal,
          }).then((r) => Array.isArray(r?.data?.data) ? r.data.data : []).catch(() => [])
        )
      )
      if (controller.signal.aborted) return
      const seen = new Set()
      const merged = []
      for (const rows of results) {
        for (const row of rows) {
          const id = row.noticeId || row.uiLink || row.title
          if (id && !seen.has(id)) {
            seen.add(id)
            merged.push(row)
          }
        }
      }
      setApiKeywordOpportunityRows(merged)
    }

    const fetchByKeyword = () =>
      apiClient.get('/api/example/samgov/live', {
        params: { ...baseParams, title: q },
        timeout: 30000,
        signal: controller.signal,
      })
        .then((res) => {
          const rows = Array.isArray(res?.data?.data) ? res.data.data : []
          setApiKeywordOpportunityRows(rows)
        })
        .catch((err) => {
          if (controller.signal.aborted) return
          const status = err?.response?.status
          if (status === 404) {
            setApiKeywordOpportunityRows([])
            setApiKeywordError('')
            return
          }
          setApiKeywordOpportunityRows([])
          setApiKeywordError(err?.response?.data?.message || err?.message || 'Keyword search API failed')
        })
        .finally(() => {
          if (!controller.signal.aborted) setApiKeywordLoading(false)
        })

    if (searchByIntent) {
      fetchByIntent()
        .catch(async (err) => {
          if (controller.signal.aborted) return
          setApiKeywordError(err?.response?.data?.message || err?.message || 'Intent search failed. Falling back to keyword.')
          await fetchByKeyword()
        })
        .finally(() => {
          if (!controller.signal.aborted) setApiKeywordLoading(false)
        })
    } else {
      fetchByKeyword()
    }

    return () => controller.abort()
  }, [deferredOpportunityKeyword, isOpportunityDataset, searchByIntent, opportunityDateRangeDays])

  // When user changes "Posted in" (7/30/364 days), refetch main opportunity data so the table reflects the selected range.
  useEffect(() => {
    if (!isOpportunityDataset || !data?.length) return
    if (opportunityDateRangePrevRef.current === opportunityDateRangeDays) return
    opportunityDateRangePrevRef.current = opportunityDateRangeDays

    const formatMmDdYyyy = (d) => {
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      const yyyy = String(d.getFullYear())
      return `${mm}/${dd}/${yyyy}`
    }
    const now = new Date()
    const from = new Date(now)
    const days = Math.min(Math.max(Number(opportunityDateRangeDays) || 30, 1), 364)
    from.setDate(from.getDate() - days)
    const postedFrom = formatMmDdYyyy(from)
    const postedTo = formatMmDdYyyy(now)

    const controller = new AbortController()
    apiClient
      .get('/api/example/samgov/live', {
        params: { postedFrom, postedTo, limit: 1000 },
        timeout: 30000,
        signal: controller.signal,
      })
      .then((res) => {
        const payload = res?.data
        if (!payload?.data || !Array.isArray(payload.data)) return
        const displayData = payload.data.length > 10000
          ? payload.data.filter((_, i) => i % Math.ceil(payload.data.length / 10000) === 0)
          : payload.data
        setData(displayData)
        setFilteredData(displayData)
        setSidebarFilteredData(displayData)
        if (payload.columns) setColumns(payload.columns)
        if (payload.numericColumns) setNumericColumns(payload.numericColumns)
        if (payload.categoricalColumns) setCategoricalColumns(payload.categoricalColumns)
        if (payload.dateColumns) setDateColumns(payload.dateColumns)
      })
      .catch(() => { /* keep current data on error */ })
    return () => controller.abort()
  }, [opportunityDateRangeDays, isOpportunityDataset, data?.length])

  useEffect(() => {
    try {
      localStorage.setItem('nm2-opportunity-favorites', JSON.stringify({
        ids: [...opportunityFavorites],
        rows: opportunityFavoriteRows
      }))
    } catch {
      // ignore quota or parse errors
    }
  }, [opportunityFavorites, opportunityFavoriteRows])

  const getOpportunityId = useCallback((row) => {
    return String(row?.noticeId || row?.uiLink || `${row?.title || ''}-${row?.solicitationNumber || ''}`)
  }, [])

  const toggleOpportunityFavorite = useCallback((row) => {
    const id = getOpportunityId(row)
    setOpportunityFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setOpportunityFavoriteRows((prev) => {
      if (prev.some((r) => getOpportunityId(r) === id)) return prev.filter((r) => getOpportunityId(r) !== id)
      return [...prev, { ...row }]
    })
  }, [getOpportunityId])

  const isOpportunityFavorite = useCallback((row) => opportunityFavorites.has(getOpportunityId(row)), [opportunityFavorites, getOpportunityId])

  const opportunityRows = useMemo(() => {
    const q = String(deferredOpportunityKeyword || '').trim().toLowerCase()
    const sourceRows = Array.isArray(allOpportunityRows) ? allOpportunityRows : []

    const normalize = (s) =>
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

    const matchTerm = (term, haystack, tokenSet) => {
      const t = normalize(term)
      if (!t) return false
      if (t.length <= 3 && !t.includes(' ')) return tokenSet.has(t)
      return haystack.includes(t)
    }

    // Align domain chips with how SAM opportunities are commonly classified:
    // NAICS (industry) + PSC/classificationCode (product/service) + textual scope.
    const domainProfiles = {
      it: {
        phrases: [
          'information technology',
          'it services',
          'it support',
          'software development',
          'application development',
          'systems integration',
          'network operations',
          'cloud migration',
        ],
        naicsPrefixes: ['518', '519', '541511', '541512', '541513', '541519'],
        pscPrefixes: ['D3', '7A'],
      },
      ai: {
        phrases: [
          'artificial intelligence',
          'machine learning',
          'generative ai',
          'large language model',
          'llm',
          'nlp',
          'natural language processing',
          'computer vision',
          'neural network',
        ],
        // AI does not have one universal NAICS/PSC bucket; require explicit AI language.
        requirePhrase: true,
      },
      'data analytics': {
        phrases: [
          'data analytics',
          'analytics',
          'business intelligence',
          'bi dashboard',
          'dashboarding',
          'data visualization',
          'reporting',
          'etl',
          'data engineering',
          'data science',
          'predictive analytics',
          'decision support',
        ],
        // Prefer explicit analytics language to avoid over-broad IT matches.
        requirePhrase: true,
      },
      cybersecurity: {
        phrases: [
          'cybersecurity',
          'cyber security',
          'zero trust',
          'incident response',
          'threat hunting',
          'vulnerability assessment',
          'penetration testing',
          'security operations center',
          'soc',
        ],
        naicsPrefixes: ['541512', '541519'],
        pscPrefixes: ['D310', 'D311', 'D312'],
      },
    }

    const synonymMap = {
      'house keeping': ['house keeping', 'housekeeping', 'janitorial', 'custodial', 'cleaning services'],
      facilities: ['facilities', 'facility', 'building maintenance', 'operations support'],
      software: ['software', 'application', 'platform', 'development', 'engineering'],
    }

    const expandedTerms = (() => {
      if (!q) return []
      const fromMap = synonymMap[q] || []
      const base = q.split(/\s+/).filter(Boolean)
      return Array.from(new Set([...base, ...fromMap.map(normalize).filter(Boolean)]))
    })()

    const filtered = !q
      ? sourceRows.map((row) => ({ ...row, _matchReason: '' }))
      : sourceRows.map((row) => {
          const haystackRaw = [
            row?.title,
            row?.solicitationNumber,
            row?.organization,
            row?.setAside,
            row?.type,
            row?.baseType,
            row?.noticeId,
            row?.naicsCode,
            row?.classificationCode,
            row?.description,
          ]
            .filter((v) => v !== null && v !== undefined)
            .map((v) => String(v))
            .join(' ')

          const haystack = normalize(haystackRaw)
          if (!haystack) return false

          const tokenSet = new Set(haystack.split(/\s+/).filter(Boolean))
          const qNorm = normalize(q)
          const profile = domainProfiles[qNorm]
          if (profile) {
            const naics = String(row?.naicsCode || '').replace(/\D+/g, '')
            const psc = String(row?.classificationCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
            const matchedPhrase = (profile.phrases || []).find((term) => matchTerm(term, haystack, tokenSet))
            if (profile.requirePhrase) {
              if (!matchedPhrase) return null
              return { ...row, _matchReason: `Matched phrase: ${matchedPhrase}` }
            }
            const naicsHitPrefix = (profile.naicsPrefixes || []).find((prefix) => naics.startsWith(prefix))
            const pscHitPrefix = (profile.pscPrefixes || []).find((prefix) => psc.startsWith(prefix))
            const reason =
              (matchedPhrase && `Matched phrase: ${matchedPhrase}`) ||
              (naicsHitPrefix && `Matched NAICS: ${naics}`) ||
              (pscHitPrefix && `Matched classification: ${psc}`) ||
              ''
            if (!reason) return null
            return { ...row, _matchReason: reason }
          }

          // Generic matching for non-domain keywords.
          const genericMatch = expandedTerms.find((term) => matchTerm(term, haystack, tokenSet))
          if (!genericMatch) return null
          return { ...row, _matchReason: `Matched keyword: ${genericMatch}` }
        }).filter(Boolean)

    const isStateFilterActive = !!(
      chartFilter?.type === 'category' &&
      chartFilter?.value &&
      String(chartFilter.value).length === 2 &&
      columns?.find((c) => String(c).toLowerCase() === 'state') &&
      getStateAbbr(chartFilter.value) === chartFilter.value
    )
    const rowLimit = !q ? (isStateFilterActive ? 200 : 20) : (isStateFilterActive ? 200 : 20)

    if (!q) return filtered.slice(0, rowLimit)

    const merged = []
    const seen = new Set()
    const pushUnique = (row) => {
      if (!row) return
      const key = String(row.noticeId || row.uiLink || `${row.title || ''}-${row.solicitationNumber || ''}`)
      if (seen.has(key)) return
      seen.add(key)
      merged.push(row)
    }

    for (const r of filtered) pushUnique(r)
    const stateAbbrFilter = isStateFilterActive ? chartFilter.value : null
    for (const r of apiKeywordOpportunityRows) {
      if (stateAbbrFilter && getStateAbbr(r?.state) !== stateAbbrFilter) continue
      pushUnique({ ...r, _matchReason: r?._matchReason || 'Matched via SAM API title search' })
    }
    return merged.slice(0, rowLimit)
  }, [allOpportunityRows, deferredOpportunityKeyword, apiKeywordOpportunityRows, chartFilter, columns])

  const getOpportunityNoticeType = useCallback((row) => {
    const rawType = String(row?.baseType || row?.type || '').trim()
    const t = rawType.toLowerCase()
    if (t.includes('sources sought') || t.includes('source sought')) return 'Sources Sought'
    if (t.includes('presolicitation') || t.includes('pre-solicitation')) return 'Presolicitation'
    if (t.includes('solicitation')) return 'Solicitation'
    return rawType || 'Unknown'
  }, [])

  // Normalize a category filter value (e.g. from "View by Base Type") to our notice type.
  const normalizeToNoticeType = useCallback((value) => {
    if (!value || typeof value !== 'string') return ''
    const t = String(value).trim().toLowerCase()
    if (t.includes('sources sought') || t.includes('source sought')) return 'Sources Sought'
    if (t.includes('presolicitation') || t.includes('pre-solicitation')) return 'Presolicitation'
    if (t.includes('solicitation')) return 'Solicitation'
    return ''
  }, [])

  // Default "View by" to Base Type for opportunity dataset so "View by Base Type" appears.
  useEffect(() => {
    if (!isOpportunityDataset || !columns?.length) return
    const catCols = Array.isArray(categoricalColumns) ? categoricalColumns : []
    if (!catCols.includes('baseType')) return
    const current = selectedCategorical
    if (!current || !catCols.includes(current)) setSelectedCategorical('baseType')
  }, [isOpportunityDataset, columns?.length, categoricalColumns, selectedCategorical])

  // Sync "View by Base Type" (CategoryTabsBar) selection -> selectedOpportunityNoticeType so pie/by-org work.
  useEffect(() => {
    if (!isOpportunityDataset) return
    const isBaseTypeColumn = selectedCategorical === 'baseType' || selectedCategorical === 'type'
    if (!isBaseTypeColumn) return
    const noticeType = chartFilter?.type === 'category' && chartFilter?.value
      ? normalizeToNoticeType(chartFilter.value)
      : ''
    setSelectedOpportunityNoticeType((prev) => (prev !== noticeType ? noticeType : prev))
    if (!noticeType) setSelectedOpportunityOrg('')
  }, [isOpportunityDataset, selectedCategorical, chartFilter, normalizeToNoticeType])

  const getOpportunityNoticeTypeClass = useCallback((label) => {
    const l = String(label || '').toLowerCase()
    if (l === 'solicitation') return 'bg-blue-100 text-blue-800 border border-blue-200'
    if (l === 'presolicitation') return 'bg-purple-100 text-purple-800 border border-purple-200'
    if (l === 'sources sought') return 'bg-amber-100 text-amber-800 border border-amber-200'
    return 'bg-gray-100 text-gray-700 border border-gray-200'
  }, [])

  // When a base type is selected, group opportunities by organization for "by agency/org" view.
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

  // When a base type is selected, pie chart should show breakdown by organization for that type only.
  const opportunityPieDataByOrg = useMemo(() => {
    if (!isOpportunityDataset || !selectedOpportunityNoticeType) return null
    const rows = Array.isArray(dashboardFilteredData) ? dashboardFilteredData : []
    const filtered = rows.filter((row) => getOpportunityNoticeType(row) === selectedOpportunityNoticeType)
    return filtered.length > 0 ? filtered : null
  }, [isOpportunityDataset, selectedOpportunityNoticeType, dashboardFilteredData, getOpportunityNoticeType])

  const renderOpportunityListPanel = () => {
    if (!isOpportunityDataset || allOpportunityRows.length === 0) return null
    const showKeywordTypeCounts = !!deferredOpportunityKeyword
    const noticeTypeCounts = opportunityRows.reduce((acc, row) => {
      const type = getOpportunityNoticeType(row)
      if (type === 'Solicitation') acc.solicitation += 1
      else if (type === 'Presolicitation') acc.presolicitation += 1
      else if (type === 'Sources Sought') acc.sourcesSought += 1
      return acc
    }, { solicitation: 0, presolicitation: 0, sourcesSought: 0 })
    let visibleOpportunityRows
    if (opportunityViewFilter === 'favorites') {
      // Favorites: show saved rows regardless of date/keyword/base type filters; merge in any from current data for legacy IDs
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
              {deferredOpportunityKeyword ? ` • API keyword matches: ${apiKeywordOpportunityRows.length}` : ''}
              {selectedOpportunityNoticeType ? ` • Base type: ${selectedOpportunityNoticeType}` : ''}
              {selectedOpportunityOrg ? ` • Org: ${selectedOpportunityOrg}` : ''}
            </p>
            {showKeywordTypeCounts && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = selectedOpportunityNoticeType === 'Solicitation' ? '' : 'Solicitation'
                    setSelectedOpportunityNoticeType(next)
                    if (next) setSelectedOpportunityOrg('')
                    setChartFilter(next ? { type: 'category', value: next } : null)
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
                    setSelectedOpportunityNoticeType(next)
                    if (next) setSelectedOpportunityOrg('')
                    setChartFilter(next ? { type: 'category', value: next } : null)
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
                    setSelectedOpportunityNoticeType(next)
                    if (next) setSelectedOpportunityOrg('')
                    setChartFilter(next ? { type: 'category', value: next } : null)
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
                      setSelectedOpportunityNoticeType('')
                      setSelectedOpportunityOrg('')
                      setChartFilter(null)
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
                    Showing top 20 of {opportunityByOrganization.length} organizations. Clear base type filter or select an org to see list below.
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
                  const stateCol = columns?.find((c) => String(c).toLowerCase() === 'state')
                  const isStateFilter = stateCol && chartFilter.value && String(chartFilter.value).length === 2 && getStateAbbr(chartFilter.value) === chartFilter.value
                  const colLabel = isStateFilter ? stateCol : selectedCategorical
                  return `${colLabel || 'Filter'}: ${isStateFilter ? getStateDisplayLabel(chartFilter.value) : chartFilter.value}`
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
          {(() => {
            const stateCol = columns?.find((c) => String(c).toLowerCase() === 'state')
            const isStateFilter = chartFilter?.type === 'category' && chartFilter?.value && stateCol && String(chartFilter.value).length === 2 && getStateAbbr(chartFilter.value) === chartFilter.value
            const stateLabel = chartFilter?.value || ''
            return (
              <>
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
              </>
            )
          })()}
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
        {apiKeywordLoading && deferredOpportunityKeyword ? (
          <div className="px-5 py-2 text-xs text-blue-700 bg-blue-50 border-b border-blue-100">
            Searching SAM API for keyword "{deferredOpportunityKeyword}"...
          </div>
        ) : null}
        {apiKeywordError && deferredOpportunityKeyword ? (
          <div className="px-5 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
            API keyword search warning: {apiKeywordError}
          </div>
        ) : null}
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

  const renderEntityFiltersPanel = () => {
    if (!isEntityDataset) return null
    return (
      <div className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Entity Filters</h3>
          <button
            type="button"
            onClick={() =>
              setEntityFilters({
                uei: '',
                businessName: '',
                naicsCode: '',
                registrationStatus: '',
                country: '',
                state: '',
              })
            }
            className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <input
            type="text"
            value={entityFilters.uei}
            onChange={(e) => setEntityFilters((p) => ({ ...p, uei: e.target.value }))}
            placeholder="UEI contains..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="text"
            value={entityFilters.businessName}
            onChange={(e) => setEntityFilters((p) => ({ ...p, businessName: e.target.value }))}
            placeholder="Business name contains..."
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <select
            value={entityFilters.registrationStatus}
            onChange={(e) => setEntityFilters((p) => ({ ...p, registrationStatus: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All statuses</option>
            {entityFilterOptions.registrationStatus.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={entityFilters.naicsCode}
            onChange={(e) => setEntityFilters((p) => ({ ...p, naicsCode: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All NAICS</option>
            {entityFilterOptions.naicsCode.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={entityFilters.country}
            onChange={(e) => setEntityFilters((p) => ({ ...p, country: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All countries</option>
            {entityFilterOptions.country.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <select
            value={entityFilters.state}
            onChange={(e) => setEntityFilters((p) => ({ ...p, state: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All states</option>
            {entityFilterOptions.state.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  const isAgencyOpportunitiesReport = useMemo(() => {
    const colSet = new Set((columns || []).map((c) => String(c)))
    const byColumns = colSet.has('agency') && colSet.has('opportunity_count')
    const bySource = /agency report/i.test(String((location.state?.analyticsData?.source || '') || ''))
    return byColumns || bySource
  }, [columns, location.state?.analyticsData?.source])

  const topAgencyRows = useMemo(() => {
    if (!isAgencyOpportunitiesReport) return []
    const rows = Array.isArray(dashboardFilteredData) ? dashboardFilteredData : []
    return rows
      .slice()
      .sort((a, b) => Number(b?.opportunity_count || 0) - Number(a?.opportunity_count || 0))
      .slice(0, 10)
  }, [isAgencyOpportunitiesReport, dashboardFilteredData])

  const renderTopAgenciesPanel = () => {
    if (!isAgencyOpportunitiesReport || topAgencyRows.length === 0) return null

    const query = String(agencySearch || '').trim().toLowerCase()
    const agencyAliasMap = {
      ttb: ['ttb', 'alcohol and tobacco tax and trade bureau', 'tax and trade bureau', 'treasury'],
      treasury: ['treasury', 'department of the treasury'],
      uscis: ['uscis', 'u.s. citizenship and immigration services', 'citizenship and immigration services'],
    }
    const expandedTerms = new Set([query])
    if (query && agencyAliasMap[query]) {
      for (const term of agencyAliasMap[query]) expandedTerms.add(term)
    } else if (query) {
      for (const token of query.split(/\s+/).filter(Boolean)) {
        if (agencyAliasMap[token]) {
          for (const term of agencyAliasMap[token]) expandedTerms.add(term)
        }
      }
    }

    const allAgencyRowsSorted = (Array.isArray(dashboardFilteredData) ? dashboardFilteredData : [])
      .slice()
      .sort((a, b) => Number(b?.opportunity_count || 0) - Number(a?.opportunity_count || 0))

    const acronymForAgency = (text) => String(text || '')
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .toLowerCase()

    const matchesAgencyQuery = (row) => {
      if (!query) return true
      const agencyText = String(row?.agency || '')
      const agency = agencyText.toLowerCase()
      const acronym = acronymForAgency(agencyText)
      return Array.from(expandedTerms).some((term) => {
        const t = String(term || '').toLowerCase()
        if (!t) return false
        return agency.includes(t) || acronym.includes(t)
      })
    }

    const matchedRows = allAgencyRowsSorted.filter(matchesAgencyQuery)
    const visibleRows = query ? matchedRows.slice(0, 50) : matchedRows.slice(0, 10)
    const maxOpp = Math.max(...visibleRows.map((r) => Number(r?.opportunity_count || 0)), 1)
    const totalOpp = visibleRows.reduce((sum, r) => sum + Number(r?.opportunity_count || 0), 0)
    const totalAmt = visibleRows.reduce((sum, r) => sum + Number(r?.total_award_amount || 0), 0)

    return (
      <div className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {query ? 'Agency Search Results (Filtered)' : 'Top 10 Agencies (Filtered)'}
            </h3>
            <div className="text-xs text-gray-600">
              Opportunities: <span className="font-semibold text-gray-900">{totalOpp.toLocaleString()}</span>
              {' • '}
              Total Award: <span className="font-semibold text-gray-900">${totalAmt.toLocaleString()}</span>
              {query ? ` • Matches: ${matchedRows.length.toLocaleString()}` : ''}
            </div>
          </div>
          <div className="w-full md:w-[320px]">
            <input
              type="text"
              value={agencySearch}
              onChange={(e) => setAgencySearch(e.target.value)}
              placeholder="Search agency (e.g., TTB, Treasury, USCIS)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="space-y-2">
          {visibleRows.map((row, idx) => {
            const agency = String(row?.agency || 'Unknown Agency')
            const opp = Number(row?.opportunity_count || 0)
            const pct = Math.max(2, Math.round((opp / maxOpp) * 100))
            const avg = Number(row?.avg_award_amount || 0)
            return (
              <div
                key={`${agency}-${idx}`}
                className="border border-gray-100 rounded-md p-2 cursor-pointer hover:bg-gray-50"
                onClick={async () => {
                  setAgencyDrilldown({ agency, rows: [], loading: true, error: '' })
                  try {
                    let rows = []
                    try {
                      // Preferred: dedicated backend drill-down route.
                      const resp = await apiClient.get('/api/example/samgov/agency-opportunities', {
                        // Do not force solicitation-only; include all notice types for better coverage.
                        params: { agency, limit: 500 },
                        timeout: 30000,
                      })
                      rows = Array.isArray(resp?.data?.data) ? resp.data.data : []
                    } catch (routeErr) {
                      // Backward-compatible fallback when backend has not been restarted yet.
                      const status = routeErr?.response?.status
                      const routeNotFound = status === 404 || /route not found/i.test(String(routeErr?.response?.data?.error || ''))
                      if (!routeNotFound) throw routeErr

                      const fallbackResp = await apiClient.get('/api/example/samgov/live', {
                        params: { limit: 500 },
                        timeout: 30000,
                      })
                      const allRows = Array.isArray(fallbackResp?.data?.data) ? fallbackResp.data.data : []
                      const agencyLower = String(agency).toLowerCase()
                      rows = allRows.filter((r) => String(r?.organization || '').toLowerCase().includes(agencyLower))
                    }

                    setAgencyDrilldown({ agency, rows, loading: false, error: '' })
                  } catch (err) {
                    const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to load agency opportunities'
                    setAgencyDrilldown({ agency, rows: [], loading: false, error: msg })
                  }
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate" title={agency}>{agency}</p>
                    <p className="text-xs text-gray-600">
                      {opp.toLocaleString()} opportunities • Avg award ${avg.toLocaleString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                    #{idx + 1}
                  </span>
                </div>
                <div className="mt-2 h-2 w-full bg-gray-100 rounded">
                  <div className="h-2 bg-blue-500 rounded" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {visibleRows.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-600 border border-dashed border-gray-300 rounded-md">
              No agencies match "{agencySearch}".
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderAgencyDrilldownPanel = () => {
    if (!isAgencyOpportunitiesReport) return null
    if (!agencyDrilldown.agency && !agencyDrilldown.loading && !agencyDrilldown.error) return null

    const rows = Array.isArray(agencyDrilldown.rows) ? agencyDrilldown.rows : []
    return (
      <div className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Agency Opportunities: {agencyDrilldown.agency || 'Selected agency'}
            </h3>
            <p className="text-xs text-gray-600">
              {agencyDrilldown.loading ? 'Loading opportunities...' : `${rows.length} opportunities`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAgencyDrilldown({ agency: '', rows: [], loading: false, error: '' })}
            className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
        {agencyDrilldown.error ? (
          <div className="px-4 py-4 text-sm text-red-700">{agencyDrilldown.error}</div>
        ) : agencyDrilldown.loading ? (
          <div className="px-4 py-4 text-sm text-gray-600">Fetching opportunities...</div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-4 text-sm text-gray-600">No opportunities returned for this agency.</div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
            {rows.slice(0, 50).map((r, i) => (
              <div key={String(r.noticeId || r.uiLink || i)} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words">{r.title || 'Untitled opportunity'}</p>
                    <p className="text-xs mt-1">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${getOpportunityNoticeTypeClass(getOpportunityNoticeType(r))}`}>
                        {getOpportunityNoticeType(r)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {r.solicitationNumber ? `Solicitation: ${r.solicitationNumber} • ` : ''}
                      Posted: {r.postedDate || 'N/A'}
                      {r.responseDeadLine ? ` • Due: ${r.responseDeadLine}` : ''}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {r.setAside ? `Set Aside: ${r.setAside} • ` : ''}
                      {r.state ? `State: ${r.state}` : ''}
                    </p>
                  </div>
                  {r.uiLink && (
                    <a
                      href={r.uiLink}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Open
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
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

  // Memoize stats calculation to prevent recalculation on every render
  const calculateStats = useMemo(() => {
    if (!dashboardFilteredData || !selectedNumeric) return null

    // Sample data if too large for performance
    const sampleSize = 5000
    const sampledData = dashboardFilteredData.length > sampleSize 
      ? dashboardFilteredData.filter((_, i) => i % Math.ceil(dashboardFilteredData.length / sampleSize) === 0)
      : dashboardFilteredData

      const values = sampledData
        .map((row) => {
          const value = parseNumericValue(row[selectedNumeric])
          const originalValue = row[selectedNumeric]
          return { value, originalValue }
        })
        .filter(({ value, originalValue }) => {
          // Keep zeros if they're valid (original value was '0' or '$0')
          return !isNaN(value) && isFinite(value) && (value !== 0 || originalValue === '0' || originalValue === '$0')
        })
        .map(({ value }) => value) // Extract just the numeric values

    if (values.length === 0) return null

    // Optimize min/max calculation for large arrays
    let min = Infinity
    let max = -Infinity
    let sum = 0
    
    for (let i = 0; i < values.length; i++) {
      const val = values[i]
      sum += val
      if (val < min) min = val
      if (val > max) max = val
    }

    const avg = sum / values.length

    // Calculate trend (compare first half vs second half) - sample if too large
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
  }, [dashboardFilteredData, selectedNumeric])

  const downloadSummaryCSV = () => {
    if (!dashboardFilteredData || dashboardFilteredData.length === 0) return

    const headers = columns.join(',')
    const rows = dashboardFilteredData.map((row) =>
      columns.map((col) => {
        const value = row[col] || ''
        return `"${String(value).replace(/"/g, '""')}"`
      }).join(',')
    )

    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, 'analytics-summary.csv')
  }

  const downloadSummaryExcel = () => {
    if (!dashboardFilteredData || dashboardFilteredData.length === 0) return

    try {
      // Prepare data for Excel
      const excelData = dashboardFilteredData.map(row => {
        const excelRow = {}
        columns.forEach(col => {
          excelRow[col] = row[col] || ''
        })
        return excelRow
      })

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics Data')

      // Generate Excel file
      XLSX.writeFile(workbook, 'analytics-summary.xlsx')
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Error exporting to Excel. Please try again.')
    }
  }

  const downloadDashboardPDF = async (event) => {
    try {
      // Find the main dashboard container
      const dashboardElement = document.querySelector('.min-h-screen')
      if (!dashboardElement) {
        alert('Could not find dashboard content to export.')
        return
      }

      // Show loading state
      const originalButton = event?.target
      if (originalButton) {
        originalButton.disabled = true
        originalButton.textContent = 'Generating PDF...'
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Save PDF
      pdf.save('analytics-dashboard.pdf')

      // Restore button
      if (originalButton) {
        originalButton.disabled = false
        originalButton.textContent = 'Export PDF'
      }
    } catch (error) {
      console.error('Error exporting to PDF:', error)
      alert('Error exporting to PDF. Please try again.')
      if (event?.target) {
        event.target.disabled = false
        event.target.textContent = 'Export PDF'
      }
    }
  }

  const handleSaveDashboard = async () => {
    if (!data || data.length === 0) return

    setSaving(true)
    setSaveSuccess(false)
    setSaveFeedbackMessage('')

    try {
      const wasUpdate = !!savedDashboardId
      const previousPersistedTitle = String(lastPersistedTitle || '').trim()
      const effectiveTitle = (() => {
        const editedTitle = String(titleDraft || '').trim()
        if (!isEditingTitle) return dashboardTitle
        setIsEditingTitle(false)
        if (!editedTitle) return dashboardTitle
        setDashboardTitle(editedTitle)
        setIsTitleCustomized(true)
        return editedTitle
      })()

      const dashboardData = {
        name: effectiveTitle,
        data: data,
        columns: columns,
        numericColumns: numericColumns,
        categoricalColumns: categoricalColumns,
        dateColumns: dateColumns,
        selectedNumeric: selectedNumeric,
        selectedCategorical: selectedCategorical,
        selectedDate: selectedDate,
        dashboardView: dashboardView,
        opportunityKeyword: opportunityKeyword || undefined,
        selectedOpportunityNoticeType: selectedOpportunityNoticeType || undefined
      }

      let result
      if (savedDashboardId) {
        // Update existing dashboard
        result = await updateDashboard(savedDashboardId, dashboardData)
      } else {
        // Create new dashboard
        result = await saveDashboard(dashboardData)
        setSavedDashboardId(result.id)
      }

      const renamedOnUpdate = wasUpdate && previousPersistedTitle && previousPersistedTitle !== effectiveTitle
      setSaveFeedbackMessage(
        renamedOnUpdate
          ? 'Renamed and updated.'
          : wasUpdate
          ? 'Dashboard updated.'
          : 'Dashboard saved.'
      )
      setLastPersistedTitle(effectiveTitle)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      setTimeout(() => setSaveFeedbackMessage(''), 3000)
    } catch (error) {
      console.error('Error saving dashboard:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save dashboard. Please try again.'
      const isLimit =
        error?.response?.status === 403 ||
        /dashboard limit reached/i.test(String(errorMessage || '')) ||
        /limit reached/i.test(String(errorMessage || ''))
      if (isLimit) {
        const planId = currentPlan || 'free'
        const planLimit = PLANS?.[planId]?.limits?.dashboards
        setUpgradePrompt({
          error: 'Dashboard limit reached',
          message: 'You’ve reached your dashboard limit. Please upgrade to create more dashboards.',
          currentPlan: planId,
          limit: typeof planLimit === 'number' ? planLimit : null,
          limitType: 'dashboards'
        })
        return
      }
      alert(`Failed to save dashboard: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  const getDefaultShortGuideRect = useCallback(() => {
    const root = shortRootRef.current
    if (!root) return null
    const w = root.clientWidth
    const h = root.clientHeight
    if (!w || !h) return null
    const target = 9 / 16
    const rootRatio = w / h
    let wRatio
    let hRatio
    if (rootRatio >= target) {
      // root is wider than 9:16: fit by height
      hRatio = 1
      wRatio = (target * h) / w
    } else {
      // root is narrower/taller: fit by width
      wRatio = 1
      hRatio = (w / target) / h
    }
    // Provide a little margin by default
    const shrink = 0.92
    wRatio = Math.max(0.2, Math.min(1, wRatio * shrink))
    hRatio = Math.max(0.2, Math.min(1, hRatio * shrink))
    return {
      xRatio: (1 - wRatio) / 2,
      yRatio: (1 - hRatio) / 2,
      wRatio,
      hRatio,
    }
  }, [])

  useEffect(() => {
    if (!showShortGuide) return
    if (shortGuideRect) return
    const rect = getDefaultShortGuideRect()
    if (rect) setShortGuideRect(rect)
  }, [showShortGuide, shortGuideRect, getDefaultShortGuideRect])

  useEffect(() => {
    const root = shortRootRef.current
    if (!root || !showShortGuide) return undefined
    const ro = new ResizeObserver(() => {
      setShortGuideRect((prev) => prev || getDefaultShortGuideRect())
    })
    ro.observe(root)
    return () => ro.disconnect()
  }, [showShortGuide, getDefaultShortGuideRect])

  const safeZoneInsets = useMemo(() => {
    // Approximate UI overlay safe zones (top/bottom) per platform.
    // Values are ratios relative to the 9:16 frame (not the page).
    if (shortGuidePreset === 'tiktok') return { top: 0.12, bottom: 0.26, side: 0.08 }
    if (shortGuidePreset === 'reels') return { top: 0.14, bottom: 0.22, side: 0.08 }
    return { top: 0.10, bottom: 0.18, side: 0.08 } // youtube
  }, [shortGuidePreset])

  const beginGuideDrag = useCallback((event) => {
    if (!showShortGuide) return
    const root = shortRootRef.current
    if (!root || !shortGuideRect) return
    const e = event
    e.preventDefault()
    e.stopPropagation()

    setIsDraggingGuide(true)
    guideDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseRect: shortGuideRect,
    }
  }, [showShortGuide, shortGuideRect])

  useEffect(() => {
    if (!isDraggingGuide) return undefined
    const root = shortRootRef.current
    if (!root) return undefined

    const onMove = (e) => {
      const base = guideDragRef.current.baseRect
      if (!base) return
      const dx = e.clientX - guideDragRef.current.startX
      const dy = e.clientY - guideDragRef.current.startY
      const w = root.clientWidth || 1
      const h = root.clientHeight || 1
      const nx = base.xRatio + dx / w
      const ny = base.yRatio + dy / h
      const maxX = 1 - base.wRatio
      const maxY = 1 - base.hRatio
      setShortGuideRect({
        ...base,
        xRatio: Math.max(0, Math.min(maxX, nx)),
        yRatio: Math.max(0, Math.min(maxY, ny)),
      })
    }

    const onUp = () => setIsDraggingGuide(false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [isDraggingGuide])

  const beginGuideResize = useCallback((event) => {
    if (!showShortGuide) return
    const root = shortRootRef.current
    if (!root || !shortGuideRect) return
    const e = event
    e.preventDefault()
    e.stopPropagation()

    setIsResizingGuide(true)
    guideResizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseRect: shortGuideRect,
    }
  }, [showShortGuide, shortGuideRect])

  useEffect(() => {
    if (!isResizingGuide) return undefined
    const root = shortRootRef.current
    if (!root) return undefined

    const target = 9 / 16
    const minWpx = Math.max(180, Math.round((root.clientWidth || 0) * 0.22))

    const onMove = (e) => {
      const base = guideResizeRef.current.baseRect
      if (!base) return
      const dx = e.clientX - guideResizeRef.current.startX
      const dy = e.clientY - guideResizeRef.current.startY

      const w = root.clientWidth || 1
      const h = root.clientHeight || 1

      const baseWpx = base.wRatio * w
      const baseHpx = base.hRatio * h

      const useDx = Math.abs(dx) >= Math.abs(dy)
      let nextWpx
      if (useDx) {
        nextWpx = baseWpx + dx
      } else {
        const nextH = baseHpx + dy
        nextWpx = nextH * target
      }

      // constrain to available space from current top-left
      const maxWpxFromX = (1 - base.xRatio) * w
      const maxHpxFromY = (1 - base.yRatio) * h
      const maxWpx = Math.min(maxWpxFromX, maxHpxFromY * target)

      const clampedWpx = Math.max(minWpx, Math.min(maxWpx, nextWpx))
      const clampedHpx = clampedWpx / target

      const wRatio = clampedWpx / w
      const hRatio = clampedHpx / h

      setShortGuideRect((prev) => ({
        ...(prev || base),
        xRatio: base.xRatio,
        yRatio: base.yRatio,
        wRatio,
        hRatio,
      }))
    }

    const onUp = () => setIsResizingGuide(false)

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [isResizingGuide])

  const buildElementSelector = useCallback((element) => {
    if (!element || !(element instanceof Element)) return null
    const esc = (value) => {
      const text = String(value || '')
      if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(text)
      }
      return text.replace(/["\\]/g, '\\$&')
    }

    if (element.id) return `#${esc(element.id)}`

    const testId = element.getAttribute('data-testid')
    if (testId) return `[data-testid="${esc(testId)}"]`

    const aria = element.getAttribute('aria-label')
    if (aria) return `[aria-label="${esc(aria)}"]`

    const path = []
    let current = element
    let depth = 0

    while (current && current.nodeType === 1 && current.tagName.toLowerCase() !== 'html' && depth < 5) {
      const tag = current.tagName.toLowerCase()
      const parent = current.parentElement
      if (!parent) break
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current.tagName)
      const index = siblings.indexOf(current)
      const part = siblings.length > 1 ? `${tag}:nth-of-type(${index + 1})` : tag
      path.unshift(part)
      current = parent
      depth += 1
    }

    if (!path.length) return null
    return path.join(' > ')
  }, [])

  const getElementLabel = useCallback((element) => {
    if (!element || !(element instanceof Element)) return 'Click'
    const candidates = [
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.textContent,
      element.getAttribute('data-testid'),
    ]
    const raw = candidates.find((v) => String(v || '').trim())
    const label = String(raw || element.tagName || 'Click').replace(/\s+/g, ' ').trim()
    return label.slice(0, 72)
  }, [])

  useEffect(() => {
    if (!recordingStorySteps) return undefined

    lastStoryStepTsRef.current = performance.now()

    const onClickCapture = (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const recordingScope = shortRootRef.current || shortCaptureRef.current
      if (!recordingScope?.contains(target)) return
      if (storyRecorderPanelRef.current?.contains(target)) return

      let selector = null
      try {
        selector = buildElementSelector(target)
      } catch (error) {
        console.warn('Story step selector capture failed:', error)
        selector = null
      }
      if (!selector) return

      const now = performance.now()
      const waitMs = Math.max(200, Math.min(5000, Math.round(now - lastStoryStepTsRef.current)))
      lastStoryStepTsRef.current = now

      setStorySteps((prev) => [
        ...prev,
        {
          selector,
          label: getElementLabel(target),
          waitMs: prev.length === 0 ? 450 : waitMs,
        },
      ])
    }

    document.addEventListener('click', onClickCapture, true)
    return () => {
      document.removeEventListener('click', onClickCapture, true)
    }
  }, [recordingStorySteps, buildElementSelector, getElementLabel])

  useEffect(() => {
    if (recordingCountdown <= 0) return undefined
    const timer = setTimeout(() => {
      if (recordingCountdown === 1) {
        setRecordingCountdown(0)
        setRecordingStorySteps(true)
      } else {
        setRecordingCountdown((v) => Math.max(0, v - 1))
      }
    }, 900)

    return () => clearTimeout(timer)
  }, [recordingCountdown])

  const buildStoryFrames = async (captureEl, onProgress) => {
    if (!captureEl || !storySteps.length) return []
    const frames = []
    const baseCanvas = await html2canvas(captureEl, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true,
      logging: false,
    })
    frames.push({ canvas: baseCanvas, cursor: null })

    for (let i = 0; i < storySteps.length; i++) {
      if (shortVideoCancelRef.current) {
        throw new Error('Short video generation cancelled.')
      }
      const step = storySteps[i]
      if (typeof onProgress === 'function') onProgress(i + 1, storySteps.length)
      await sleep(step.waitMs)
      const el = document.querySelector(step.selector)
      let cursor = null

      if (el && el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect()
        const parentRect = captureEl.getBoundingClientRect()
        const xRatio = parentRect.width > 0 ? (rect.left + rect.width / 2 - parentRect.left) / parentRect.width : 0.5
        const yRatio = parentRect.height > 0 ? (rect.top + rect.height / 2 - parentRect.top) / parentRect.height : 0.5
        cursor = {
          xRatio: Math.max(0, Math.min(1, xRatio)),
          yRatio: Math.max(0, Math.min(1, yRatio)),
          label: step.label,
        }
        el.click()
        await sleep(650)
      } else {
        await sleep(300)
      }

      const canvas = await html2canvas(captureEl, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      frames.push({ canvas, cursor })
    }

    return frames
  }

  const handleCreateShortVideo = async () => {
    // Capture only the report (charts/content area), not the whole screen or toolbar.
    const captureElement = shortCaptureRef.current || shortRootRef.current
    if (!captureElement) {
      alert('Could not find dashboard content to capture.')
      return
    }

    try {
      setGeneratingShortVideo(true)
      setShortVideoError('')
      shortVideoCancelRef.current = false
      const controller = new AbortController()
      shortVideoAbortRef.current = controller

      const caps = getShortsExportCapabilities()
      if (!caps.supported) {
        throw new Error('Your browser does not support video export. Try Chrome or Edge.')
      }
      if (shortFormat === 'mp4' && !caps.formats.includes('mp4')) {
        // Auto-fallback to webm instead of failing silently.
        setShortFormat('webm')
      }

      const title = String(dashboardTitle || 'Analytics Dashboard')
      const subtitle = `${dashboardFilteredData?.length || 0} records • ${columns.length} columns`
      const highlight = selectedNumeric ? `Primary metric: ${formatFieldLabel(selectedNumeric)}` : ''

      let frames = []
      if (storySteps.length) {
        setShortVideoProgress({ active: true, phase: 'Capturing clicks', progress: 0 })
        frames = await buildStoryFrames(captureElement, (cur, total) =>
          setShortVideoProgress({ active: true, phase: 'Capturing clicks', progress: total ? cur / total : 0 })
        )
      }

      setShortVideoProgress({ active: true, phase: 'Preparing', progress: 0 })
      const blob = await createDashboardShortVideo({
        title,
        subtitle,
        highlight,
        callToAction: shortCallToAction,
        format: shortFormat,
        durationSeconds: shortDurationSeconds,
        captureElement: captureElement,
        storyFrames: frames,
        cropRect: captureElement === shortRootRef.current && lockShortGuideToExport && shortGuideRect ? shortGuideRect : null,
        onProgress: (phase, progress) => setShortVideoProgress((p) => (p.active ? { ...p, phase, progress } : p)),
        signal: controller.signal,
      })
      const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const ext = getVideoFileExtension(blob)
      const filename = `${safeName || 'analytics-short'}.${ext}`
      setLastShortVideo({ blob, filename, title })
      try {
        await savedShortsStorage.saveShort(blob, filename, title)
        const list = await savedShortsStorage.listShorts()
        setSavedShortsList(list)
      } catch (_) {}
      downloadVideoBlob(blob, filename)
    } catch (error) {
      console.error('Error creating short video:', error)
      const msg = error?.message || 'Failed to create short video. Please try again.'
      const isCancelled = msg === 'Recording was cancelled.'
      setShortVideoError(isCancelled ? '' : msg)
      if (!isCancelled) alert(msg)
    } finally {
      setGeneratingShortVideo(false)
      setShortVideoProgress({ active: false, phase: '', progress: 0 })
      shortVideoAbortRef.current = null
    }
  }

  const handleShareShortToYouTube = async () => {
    if (!lastShortVideo?.blob) {
      alert('Generate a short video first.')
      return
    }

    const shareTitle = `${lastShortVideo.title || 'Analytics Dashboard'} #shorts`
    const shareText = `${lastShortVideo.title || 'Analytics Dashboard'} generated with NM2TECH Analytics Shorts`
    const ext = getVideoFileExtension(lastShortVideo.blob)
    const file = new File([lastShortVideo.blob], lastShortVideo.filename || `analytics-short.${ext}`, { type: lastShortVideo.blob.type || 'video/webm' })

    try {
      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: shareTitle,
          text: shareText,
        })
        return
      }
    } catch (error) {
      console.warn('Native share was cancelled or failed:', error)
    }

    const fallbackText = `${shareTitle}\n${shareText}`
    try {
      await copyToClipboard(fallbackText)
    } catch {
      // no-op fallback
    }
    window.open('https://studio.youtube.com', '_blank', 'noopener,noreferrer')
    alert('Opened YouTube Studio. Upload the downloaded short video file and paste the copied title/description.')
  }

  const handleSaveShortInApp = async () => {
    if (!lastShortVideo?.blob) {
      alert('Create a short video first.')
      return
    }
    try {
      await savedShortsStorage.saveShort(lastShortVideo.blob, lastShortVideo.filename, lastShortVideo.title)
      const list = await savedShortsStorage.listShorts()
      setSavedShortsList(list)
    } catch (e) {
      console.error(e)
      alert(e?.message || 'Failed to save in app.')
    }
  }

  const handleUploadToYouTube = async (source) => {
    const blob = source?.blob || lastShortVideo?.blob
    const title = source?.title ?? lastShortVideo?.title ?? 'Analytics Short'
    if (!blob) {
      alert('No video to upload. Create or select a short first.')
      return
    }
    setYtUploadError('')
    const id = source?.id ?? 'current'
    setUploadingToYouTubeId(id)
    try {
      const token = await getGoogleYouTubeUploadToken()
      const description = `${title} — created with NM2TECH Analytics Shorts`
      const result = await uploadVideoToYouTube(blob, `${title} #shorts`, description, 'public', token, API_BASE_URL)
      setUploadingToYouTubeId(null)
      if (result?.link) {
        window.open(result.link, '_blank')
        alert(`Uploaded! Video: ${result.title}`)
      }
    } catch (err) {
      setUploadingToYouTubeId(null)
      const msg = err?.message || 'Upload failed.'
      setYtUploadError(msg)
      if (msg.includes('not configured')) {
        alert(
          'Direct YouTube upload is not configured.\n\n' +
          '1. Go to Google Cloud Console → APIs & Services → Credentials\n' +
          '2. Create an OAuth 2.0 Client ID (Web application)\n' +
          '3. Add your app URL to Authorized origins (e.g. http://localhost:5173)\n' +
          '4. In your project root, add to .env.local:\n   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com\n' +
          '5. Restart the dev server.\n\n' +
          'Opening YouTube Studio so you can upload the file manually.'
        )
        window.open('https://studio.youtube.com', '_blank')
      } else {
        alert(msg)
      }
    }
  }

  const handleShareToLinkedIn = () => {
    if (!lastShortVideo?.blob) return
    downloadVideoBlob(lastShortVideo.blob, lastShortVideo.filename || 'capture.mp4')
    window.open('https://www.linkedin.com/feed/', '_blank', 'noopener,noreferrer')
  }

  const handleDeleteSavedShort = async (id) => {
    try {
      await savedShortsStorage.deleteShort(id)
      setSavedShortsList((prev) => prev.filter((s) => s.id !== id))
    } catch (e) {
      console.error(e)
      alert('Failed to delete.')
    }
  }

  const handleStartScreenRecord = async () => {
    try {
      const controller = await startScreenRecording({
        aspectRatio: captureShorts916 ? '9:16' : undefined,
      })
      screenRecordControllerRef.current = controller
      setIsRecordingScreen(true)
      setScreenRecordingElapsed(0)
      screenRecordingIntervalRef.current = setInterval(() => {
        setScreenRecordingElapsed((s) => s + 1)
      }, 1000)
    } catch (err) {
      if ((err?.message || '').includes('Permission') || (err?.name === 'NotAllowedError')) return
      console.error(err)
      alert(err?.message || 'Could not start screen recording.')
    }
  }

  const handleStopScreenRecord = async () => {
    const controller = screenRecordControllerRef.current
    if (!controller) {
      setIsRecordingScreen(false)
      return
    }
    if (screenRecordingIntervalRef.current) {
      clearInterval(screenRecordingIntervalRef.current)
      screenRecordingIntervalRef.current = null
    }
    screenRecordControllerRef.current = null
    setIsRecordingScreen(false)
    try {
      const blob = await controller.stop()
      if (!blob || blob.size === 0) {
        alert('Recording was too short or failed.')
        return
      }
      const title = String(dashboardTitle || 'Analytics Dashboard')
      const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const ext = getVideoFileExtension(blob)
      const filename = `${safeName || 'screen-recording'}-live.${ext}`
      setLastShortVideo({ blob, filename, title })
      try {
        await savedShortsStorage.saveShort(blob, filename, title)
        const list = await savedShortsStorage.listShorts()
        setSavedShortsList(list)
      } catch (_) {}
      downloadVideoBlob(blob, filename)
    } catch (e) {
      console.error(e)
      alert(e?.message || 'Failed to save recording.')
    }
  }

  const stats = calculateStats

  const handleMetadataUpdate = (newMetadata) => {
    try {
      // Set flag to prevent data loss during update
      isUpdatingMetadata.current = true
      
      // Validate new metadata
      if (!newMetadata || !newMetadata.numericColumns || !newMetadata.categoricalColumns || !newMetadata.dateColumns) {
        console.error('Invalid metadata update:', newMetadata)
        isUpdatingMetadata.current = false
        alert('Error: Invalid metadata format. Please try again.')
        return
      }

      // CRITICAL: Ensure data is preserved - never clear it during metadata updates
      console.log('Metadata update: Preserving data. Current data length:', data?.length)

      // Update column type arrays
      setNumericColumns(newMetadata.numericColumns || [])
      setCategoricalColumns(newMetadata.categoricalColumns || [])
      setDateColumns(newMetadata.dateColumns || [])
      
      // Preserve selected columns if they still exist in their new type arrays
      // If a column was moved to a different type, try to find it in the new arrays
      let newSelectedNumeric = selectedNumeric
      let newSelectedDate = selectedDate
      let newSelectedCategorical = selectedCategorical

      // Check if current selected numeric column is still numeric
      if (selectedNumeric && !newMetadata.numericColumns.includes(selectedNumeric)) {
        // Check if it moved to date or categorical
        if (newMetadata.dateColumns.includes(selectedNumeric)) {
          newSelectedDate = selectedNumeric
          newSelectedNumeric = newMetadata.numericColumns[0] || ''
        } else if (newMetadata.categoricalColumns.includes(selectedNumeric)) {
          newSelectedCategorical = selectedNumeric
          newSelectedNumeric = newMetadata.numericColumns[0] || ''
        } else {
          newSelectedNumeric = newMetadata.numericColumns[0] || ''
        }
      }

      // Check if current selected date column is still date
      if (selectedDate && !newMetadata.dateColumns.includes(selectedDate)) {
        // Check if it moved to numeric or categorical
        if (newMetadata.numericColumns.includes(selectedDate)) {
          newSelectedNumeric = selectedDate
          newSelectedDate = newMetadata.dateColumns[0] || ''
        } else if (newMetadata.categoricalColumns.includes(selectedDate)) {
          newSelectedCategorical = selectedDate
          newSelectedDate = newMetadata.dateColumns[0] || ''
        } else {
          newSelectedDate = newMetadata.dateColumns[0] || ''
        }
      }

      // Check if current selected categorical column is still categorical
      if (selectedCategorical && !newMetadata.categoricalColumns.includes(selectedCategorical)) {
        // Check if it moved to numeric or date
        if (newMetadata.numericColumns.includes(selectedCategorical)) {
          newSelectedNumeric = selectedCategorical
          newSelectedCategorical = newMetadata.categoricalColumns[0] || ''
        } else if (newMetadata.dateColumns.includes(selectedCategorical)) {
          newSelectedDate = selectedCategorical
          newSelectedCategorical = newMetadata.categoricalColumns[0] || ''
        } else {
          newSelectedCategorical = newMetadata.categoricalColumns[0] || ''
        }
      }

      // Update selected columns
      setSelectedNumeric(newSelectedNumeric)
      setSelectedDate(newSelectedDate)
      setSelectedCategorical(newSelectedCategorical)
      
      // Clear the flag after state updates complete
      setTimeout(() => {
        isUpdatingMetadata.current = false
        console.log('Metadata update complete. Data preserved:', data?.length)
      }, 500)
      
      // Show success message (use setTimeout to prevent blocking)
      setTimeout(() => {
        alert('Metadata updated successfully! Charts will now use the new column types.')
      }, 100)
    } catch (error) {
      console.error('Error updating metadata:', error)
      isUpdatingMetadata.current = false
      setTimeout(() => {
        alert('Error updating metadata. Please try again.')
      }, 100)
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isFullscreen])

  // Safety check: If we've been loading too long without initializing, show error
  useEffect(() => {
    if (loading && !hasInitialized.current) {
      const timeout = setTimeout(() => {
        if (loading && !hasInitialized.current) {
          console.error('Dashboard: Loading timeout - no data initialized')
          setLoading(false)
        }
      }, 5000) // 5 second timeout
      return () => clearTimeout(timeout)
    }
  }, [loading, hasInitialized])
  
  if (loading) {
    console.log('Dashboard: Still loading. Data:', data, 'Has initialized:', hasInitialized.current)
    return (
      <div className="min-h-screen bg-gray-50">
        <Loader />
      </div>
    )
  }

  // No analytics data: show explicit empty state so /dashboard is never blank
  if (noDataReason) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">No dashboard data</h1>
            <p className="text-gray-600 mb-6">
              {noDataReason === 'no-storage'
                ? 'Upload a file from the home page to build a dashboard, or open a saved dashboard from My Dashboards.'
                : 'The stored data could not be loaded. Upload a new file or open a saved dashboard.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Home
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboards')}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                My Dashboards
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  console.log('Dashboard: Rendering. Data length:', data?.length, 'Filtered data length:', filteredData?.length, 'Columns:', columns?.length, 'Selected numeric:', selectedNumeric, 'Selected categorical:', selectedCategorical)
  
  // Safety check: If not initialized and not loading, something went wrong
  if (!hasInitialized.current && !loading) {
    console.error('Dashboard: Not initialized and not loading - showing error message')
    const storedData = sessionStorage.getItem('analyticsData')
    let validation = null
    try {
      if (storedData) {
        const parsed = JSON.parse(storedData)
        validation = parsed.validation
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8">
            <div className="text-center mb-6">
              <svg className="w-16 h-16 text-red-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-semibold text-red-900 mb-2">Unable to Load Dashboard</h2>
              <p className="text-red-800 mb-6">There was an issue loading your data. This might be because:</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 mb-4 border border-red-200">
              <ul className="list-disc list-inside text-red-800 space-y-2 text-sm">
                <li>Your data file is empty or has no valid rows</li>
                <li>Your data has no numeric columns (charts require numbers)</li>
                <li>There was an error processing your file</li>
                <li>The data format is not supported</li>
              </ul>
            </div>
            
            {validation && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="text-yellow-900 font-semibold mb-2">Validation Results:</h3>
                {validation.errors && validation.errors.length > 0 && (
                  <div className="mb-3">
                    {validation.errors.map((error, index) => (
                      <div key={index} className="text-yellow-800 text-sm">
                        <strong>Error:</strong> {error.message}
                      </div>
                    ))}
                  </div>
                )}
                {validation.warnings && validation.warnings.length > 0 && (
                  <div className="mb-3">
                    {validation.warnings.map((warning, index) => (
                      <div key={index} className="text-yellow-800 text-sm">
                        <strong>Warning:</strong> {warning.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="text-center">
              <button
                onClick={clearAnalyticsDataAndReload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go Back to Upload
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  // Check if data exists - but don't redirect if we're in the middle of a metadata update
  if (!data || data.length === 0) {
    console.warn('Dashboard: No data available. Data:', data, 'Loading:', loading, 'Has initialized:', hasInitialized.current, 'Updating metadata:', isUpdatingMetadata.current)
    
    // CRITICAL: Never redirect during metadata updates - data might be temporarily unavailable during state updates
    if (isUpdatingMetadata.current) {
      console.log('Metadata update in progress - showing loading state to prevent blank page')
      return (
        <div className="min-h-screen bg-gray-50">
          <Loader />
        </div>
      )
    }
    
    // Only redirect if we've actually initialized and there's truly no data
    // This prevents blank page during metadata updates
    if (hasInitialized.current) {
      // Check if we have validation info to explain why
      const storedData = sessionStorage.getItem('analyticsData')
      let validation = null
      try {
        if (storedData) {
          const parsed = JSON.parse(storedData)
          validation = parsed.validation
        }
      } catch (e) {
        // Ignore parse errors
      }
      
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8">
              <div className="text-center mb-6">
                <svg className="w-16 h-16 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-2xl font-semibold text-yellow-900 mb-2">Dashboard Cannot Be Displayed</h2>
                <p className="text-yellow-800 mb-6">Your data was uploaded, but the dashboard cannot be generated. Here's why:</p>
              </div>
              
              {validation && validation.errors && validation.errors.length > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h3 className="text-red-900 font-semibold mb-3">❌ Critical Issues:</h3>
                  {validation.errors.map((error, index) => (
                    <div key={index} className="mb-3">
                      <p className="text-red-800 font-medium">{error.message}</p>
                      <p className="text-red-700 text-sm mt-1">{error.suggestion}</p>
                    </div>
                  ))}
                </div>
              ) : validation && validation.warnings && validation.warnings.length > 0 ? (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                  <h3 className="text-yellow-900 font-semibold mb-3">⚠️ Data Issues Found:</h3>
                  {validation.warnings.map((warning, index) => (
                    <div key={index} className="mb-3">
                      <p className="text-yellow-900 font-medium">{warning.message}</p>
                      <p className="text-yellow-800 text-sm mt-1">{warning.suggestion}</p>
                      {warning.fixSteps && warning.fixSteps.length > 0 && (
                        <div className="mt-2">
                          <p className="text-yellow-800 text-xs font-medium mb-1">How to fix:</p>
                          <ul className="list-disc list-inside text-xs text-yellow-800 space-y-1">
                            {warning.fixSteps.map((step, stepIndex) => (
                              <li key={stepIndex}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {warning.examples && warning.examples.length > 0 && (
                        <div className="mt-2">
                          <p className="text-yellow-800 text-xs font-medium mb-1">Examples:</p>
                          <div className="space-y-1">
                            {warning.examples.map((example, exIndex) => (
                              <div key={exIndex} className="text-xs bg-yellow-200 p-2 rounded">
                                <span className="text-red-600 line-through">{example.before}</span>
                                {' → '}
                                <span className="text-green-600 font-medium">{example.after}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="text-blue-900 font-semibold mb-2">Common Reasons for Blank Dashboard:</h3>
                  <ul className="list-disc list-inside text-blue-800 space-y-2 text-sm">
                    <li><strong>No numeric columns:</strong> Charts require at least one column with numbers (e.g., Sales, Amount, Quantity)</li>
                    <li><strong>Data format issues:</strong> Numbers with currency symbols ($1,200) or commas may not be detected</li>
                    <li><strong>Empty data:</strong> Your file might be empty or have no valid rows</li>
                    <li><strong>All text data:</strong> If all columns are text/categories, charts cannot be generated</li>
                  </ul>
                </div>
              )}
              
              {validation && validation.summary && (
                <div className="bg-gray-100 rounded-lg p-3 mb-4 text-sm">
                  <p className="text-gray-700">
                    <strong>Your Data Summary:</strong> {validation.summary.totalRows} rows, {validation.summary.totalColumns} columns
                    {validation.summary.numericColumns > 0 ? ` • ${validation.summary.numericColumns} numeric` : ' • 0 numeric (⚠️ This is the problem!)'}
                    {validation.summary.dateColumns > 0 && ` • ${validation.summary.dateColumns} date`}
                    {validation.summary.categoricalColumns > 0 && ` • ${validation.summary.categoricalColumns} categorical`}
                  </p>
                </div>
              )}
              
              <div className="text-center space-y-3">
                <div className="bg-white rounded-lg p-4 border border-yellow-300">
                  <p className="text-gray-800 font-medium mb-2">💡 What to do:</p>
                  <ol className="text-left text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Go back to the home page</li>
                    <li>Fix your data based on the recommendations above</li>
                    <li>Re-upload your corrected file</li>
                  </ol>
                </div>
                <button
                  onClick={clearAnalyticsDataAndReload}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Go Back to Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }
    // If not initialized yet, show loading
    return (
      <div className="min-h-screen bg-gray-50">
        <Loader />
      </div>
    )
  }
  
  // Check if we have data but no numeric columns (charts won't work).
  // Entity datasets are valid without numeric fields.
  const hasNoNumericColumns =
    data &&
    data.length > 0 &&
    (!numericColumns || numericColumns.length === 0) &&
    !isEntityDataset
  
  if (hasNoNumericColumns) {
    console.log('Dashboard: No numeric columns detected', {
      dataLength: data?.length,
      numericColumns,
      columns,
      selectedNumeric
    })
    
    const storedData = sessionStorage.getItem('analyticsData')
    let validation = null
    let numericInference = null
    try {
      if (storedData) {
        const parsed = JSON.parse(storedData)
        validation = parsed.validation
        numericInference = parsed.numericInference
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8">
            <div className="text-center mb-6">
              <svg className="w-16 h-16 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-semibold text-yellow-900 mb-2">No Charts Can Be Generated</h2>
              <p className="text-yellow-800 mb-6">Your data has {data.length} rows, but no numeric columns were detected.</p>
            </div>
            
            {validation && validation.warnings && validation.warnings.length > 0 ? (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                <h3 className="text-yellow-900 font-semibold mb-3">⚠️ How to Fix This:</h3>
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="mb-3">
                    <p className="text-yellow-900 font-medium">{warning.message}</p>
                    <p className="text-yellow-800 text-sm mt-1">{warning.suggestion}</p>
                    {warning.fixSteps && warning.fixSteps.length > 0 && (
                      <div className="mt-2">
                        <p className="text-yellow-800 text-xs font-medium mb-1">How to fix:</p>
                        <ul className="list-disc list-inside text-xs text-yellow-800 space-y-1">
                          {warning.fixSteps.map((step, stepIndex) => (
                            <li key={stepIndex}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {warning.examples && warning.examples.length > 0 && (
                      <div className="mt-2">
                        <p className="text-yellow-800 text-xs font-medium mb-1">Examples:</p>
                        <div className="space-y-1">
                          {warning.examples.map((example, exIndex) => (
                            <div key={exIndex} className="text-xs bg-yellow-200 p-2 rounded">
                              <span className="text-red-600 line-through">{example.before}</span>
                              {' → '}
                              <span className="text-green-600 font-medium">{example.after}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-blue-900 font-semibold mb-2">Why This Happened:</h3>
                <ul className="list-disc list-inside text-blue-800 space-y-2 text-sm">
                  <li>Your data only contains text/category columns (like names, descriptions, status)</li>
                  <li>Charts need at least one numeric column (numbers like sales, amounts, quantities)</li>
                  <li>Numbers with currency symbols ($1,200) or commas may not be detected as numeric</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="text-blue-900 font-medium mb-2">💡 Solution:</p>
                  <ol className="list-decimal list-inside text-blue-800 text-sm space-y-1">
                    <li>Add a column with numbers (e.g., Sales, Amount, Quantity, Count)</li>
                    <li>Or remove currency symbols and commas from existing number columns (Auto-clean runs on upload, but messy formats can still fail)</li>
                    <li>Re-upload your corrected file</li>
                  </ol>
                </div>
              </div>
            )}

            {numericInference && numericInference.columns && (
              <div className="bg-white border border-yellow-200 rounded-lg p-4 mb-4">
                <h3 className="text-gray-900 font-semibold mb-2">Numeric auto-clean results</h3>
                <p className="text-sm text-gray-700 mb-3">
                  We tried to auto-clean and convert columns to numbers. A column only converts if at least{' '}
                  <strong>{Math.round((numericInference.threshold ?? 0.7) * 100)}%</strong> of non-empty values parse as numbers.
                </p>
                {(() => {
                  const entries = Object.entries(numericInference.columns || {})
                  // Show lowest-success columns first to explain "why not converted"
                  entries.sort((a, b) => (a[1]?.ratio ?? 0) - (b[1]?.ratio ?? 0))
                  const shown = entries.slice(0, 12)
                  const remaining = entries.length - shown.length
                  return (
                    <>
                      <ul className="text-sm text-gray-800 space-y-1">
                        {shown.map(([col, info]) => {
                          const attempted = info?.attempted ?? 0
                          const parsed = info?.parsed ?? 0
                          const ratio = info?.ratio ?? 0
                          const pct = attempted === 0 ? 0 : Math.round(ratio * 100)
                          return (
                            <li key={col} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-gray-100 pb-1">
                              <span className="font-medium text-gray-900">&quot;{col}&quot;</span>
                              <span className="text-gray-700">
                                {pct}% numeric parse success ({parsed}/{attempted || 0}) — {info?.reason || 'Not converted'}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                      {remaining > 0 && (
                        <p className="text-xs text-gray-500 mt-2">And {remaining} more column(s).</p>
                      )}
                      <p className="text-xs text-gray-600 mt-3">
                        Tip: remove <code className="bg-gray-100 px-1 rounded">$</code> and commas (e.g. <code className="bg-gray-100 px-1 rounded">12,450</code> → <code className="bg-gray-100 px-1 rounded">12450</code>) or enable Auto-clean, then re-upload.
                      </p>
                    </>
                  )
                })()}
              </div>
            )}
            
            <div className="text-center">
              <button
                onClick={clearAnalyticsDataAndReload}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go Back to Fix Data
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get current date for header
  const currentDate = new Date()
  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Fullscreen content
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto">
        {/* Fullscreen Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                {renderDashboardTitleEditor()}
                <p className="text-sm text-gray-600">
                  {dashboardFilteredData?.length || 0} records • {columns.length} columns
                </p>
              </div>
              <div className="flex items-center gap-2 relative">
                {/* Filters Button & Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
                    title="Filters"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Filters
                    {showFilters && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    )}
                  </button>
                  
                  {/* Filters Dropdown Panel */}
                  {showFilters && (
                    <>
                      {/* Backdrop to close on outside click */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowFilters(false)}
                      ></div>
                      
                      {/* Dropdown Panel */}
                      <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Filters & Columns</h3>
                            <button
                              onClick={() => setShowFilters(false)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
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
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setDashboardView('simple')}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                      dashboardView === 'simple'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Charts
                  </button>
                  <button
                    onClick={() => setDashboardView('advanced')}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                      dashboardView === 'advanced'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Advanced
                  </button>
                  <button
                    onClick={() => setDashboardView('custom')}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                      dashboardView === 'custom'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Custom
                  </button>
                  <button
                    onClick={() => setDashboardView('timeseries')}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                      dashboardView === 'timeseries'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Time Series
                  </button>
                  <button
                    onClick={() => setDashboardView('data')}
                    className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                      dashboardView === 'data'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Data & Metadata
                  </button>
                </div>
                <button
                  onClick={toggleFullscreen}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm flex items-center gap-2"
                  title="Exit Fullscreen (ESC)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Exit Fullscreen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Fullscreen Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Active Filter Indicator */}
          {chartFilter && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
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

          {/* Category Tabs: quick "separate dashboards" by category */}
          <MetricTabsBar />
          <CategoryTabsBar />
          {renderTopAgenciesPanel()}
          {renderAgencyDrilldownPanel()}

          {renderEntityFiltersPanel()}

          {/* Charts Section */}
          {dashboardView === 'data' ? (
            <DataMetadataEditor
              data={data}
              columns={columns}
              numericColumns={effectiveNumericColumns}
              categoricalColumns={categoricalColumns}
              dateColumns={dateColumns}
              onMetadataUpdate={handleMetadataUpdate}
            />
          ) : dashboardView === 'timeseries' ? (
            <TimeSeriesReport
              data={dashboardFilteredData || data}
              numericColumns={effectiveNumericColumns}
              dateColumns={dateColumns}
              selectedNumeric={selectedNumeric}
              selectedDate={selectedDate}
            />
          ) : (
            <>
              {showMapTab && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 mb-6" style={{ minHeight: '360px' }}>
                  <ContractMapWidget
                    data={dashboardFilteredData || data}
                    selectedCategorical="state"
                    selectedNumeric={effectiveNumericColumns?.includes('award_amount') ? 'award_amount' : effectiveNumericColumns?.includes('opportunity_count') ? 'opportunity_count' : null}
                    chartFilter={chartFilter}
                    onChartFilter={handleChartFilter}
                  />
                </div>
              )}
              <DashboardCharts
                data={data}
                filteredData={dashboardFilteredData}
                selectedNumeric={selectedNumeric}
                selectedCategorical={selectedCategorical}
                selectedDate={selectedDate}
                onChartFilter={handleChartFilter}
                chartFilter={chartFilter}
                pieFilteredData={opportunityPieDataByOrg}
                pieDimensionOverride={opportunityPieDataByOrg ? 'organization' : undefined}
                pieTitleOverride={opportunityPieDataByOrg ? `By organization (${selectedOpportunityNoticeType})` : undefined}
                showVesselMap={vesselMapConfig.show}
                vesselMapData={dashboardFilteredData}
                vesselLatCol={vesselMapConfig.latCol}
                vesselLonCol={vesselMapConfig.lonCol}
              />
              {/* Metric Cards - Only in simple view */}
              {dashboardView === 'simple' && (
                <MetricCards
                  data={dashboardFilteredData}
                  numericColumns={effectiveNumericColumns}
                  selectedNumeric={selectedNumeric}
                  stats={stats}
                />
              )}
            </>
          )}

          {renderOpportunityListPanel()}
        </div>
      </div>
    )
  }

  // Final safety check: If we have data but no numeric columns, show error message.
  // Skip this for entity-style datasets where table/filter exploration is still valid.
  if (data && data.length > 0 && (!numericColumns || numericColumns.length === 0) && !isEntityDataset) {
    console.warn('Dashboard: Data exists but no numeric columns detected', {
      dataLength: data.length,
      numericColumns,
      columns
    })
    
    const storedData = sessionStorage.getItem('analyticsData')
    let validation = null
    try {
      if (storedData) {
        const parsed = JSON.parse(storedData)
        validation = parsed.validation
      }
    } catch (e) {
      // Ignore parse errors
    }
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8">
            <div className="text-center mb-6">
              <svg className="w-16 h-16 text-yellow-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-semibold text-yellow-900 mb-2">No Charts Can Be Generated</h2>
              <p className="text-yellow-800 mb-6">Your data has {data.length} rows, but no numeric columns were detected.</p>
            </div>
            
            {validation && validation.warnings && validation.warnings.length > 0 ? (
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                <h3 className="text-yellow-900 font-semibold mb-3">⚠️ How to Fix This:</h3>
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="mb-3">
                    <p className="text-yellow-900 font-medium">{warning.message}</p>
                    <p className="text-yellow-800 text-sm mt-1">{warning.suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-blue-900 font-semibold mb-2">Why This Happened:</h3>
                <ul className="list-disc list-inside text-blue-800 space-y-2 text-sm">
                  <li>Your data only contains text/category columns (like names, descriptions, status)</li>
                  <li>Charts need at least one numeric column (numbers like sales, amounts, quantities)</li>
                  <li>Numbers with currency symbols ($1,200) or commas may not be detected as numeric</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-blue-300">
                  <p className="text-blue-900 font-medium mb-2">💡 Solution:</p>
                  <ol className="list-decimal list-inside text-blue-800 text-sm space-y-1">
                    <li>Add a column with numbers (e.g., Sales, Amount, Quantity, Count)</li>
                    <li>Or remove currency symbols and commas from existing number columns</li>
                    <li>Re-upload your corrected file</li>
                  </ol>
                </div>
              </div>
            )}
            
            <div className="text-center mt-6">
              <button
                onClick={() => window.location.href = '/'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Upload New Data
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 watermark-bg relative">
      {/* Analytics Watermark Pattern */}
      <div className="analytics-watermark"></div>
      <div className="analytics-watermark-icons"></div>

      {recordingCountdown > 0 && (
        <div className="fixed inset-0 z-[120] pointer-events-none flex items-center justify-center">
          <div className="w-44 h-44 rounded-full bg-black/70 text-white flex items-center justify-center text-7xl font-bold shadow-2xl border-2 border-white/40">
            {recordingCountdown}
          </div>
        </div>
      )}

      {upgradePrompt && (
        <UpgradePrompt
          error={upgradePrompt.error}
          message={upgradePrompt.message}
          currentPlan={upgradePrompt.currentPlan}
          limit={upgradePrompt.limit}
          limitType={upgradePrompt.limitType}
          onClose={() => setUpgradePrompt(null)}
        />
      )}
      
      {/* Date Range Slider and Network View Button - Top of Dashboard */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              {selectedDate && dateColumns.includes(selectedDate) && (
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

      <div ref={shortRootRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center animate-fade-in">
          <div>
            {renderDashboardTitleEditor()}
            <p className="text-sm text-gray-600">
              {dashboardFilteredData?.length || 0} records • {columns.length} columns
            </p>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0 relative">
            {/* Filters Button & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
                title="Filters"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
                {showFilters && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
              
              {/* Filters Dropdown Panel */}
              {showFilters && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFilters(false)}
                  ></div>
                  
                  {/* Dropdown Panel */}
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Filters & Columns</h3>
                        <button
                          onClick={() => setShowFilters(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
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
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Enter Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setDashboardView('simple')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  dashboardView === 'simple'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                Charts
              </button>
              <button
                onClick={() => setDashboardView('advanced')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  dashboardView === 'advanced'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                Advanced
              </button>
              <button
                onClick={() => setDashboardView('custom')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  dashboardView === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                Custom
              </button>
              <button
                onClick={() => setDashboardView('data')}
                className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                  dashboardView === 'data'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                Data & Metadata
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs: quick "separate dashboards" by category */}
        <MetricTabsBar />
        <CategoryTabsBar />
        {renderTopAgenciesPanel()}
        {renderAgencyDrilldownPanel()}
        {renderEntityFiltersPanel()}

        {/* Save & Share Buttons */}
        <div className="mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveDashboard}
              disabled={saving || !data}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {savedDashboardId ? 'Update Dashboard' : 'Save Dashboard'}
                </>
              )}
            </button>
            <button
              onClick={async () => {
                const effectiveShareId = shareId || generateShareId()
                const dashboardData = {
                  name: dashboardTitle,
                  dashboardTitle: dashboardTitle,
                  data: data,
                  columns: columns,
                  numericColumns: numericColumns,
                  categoricalColumns: categoricalColumns,
                  dateColumns: dateColumns,
                  selectedNumeric: selectedNumeric,
                  selectedCategorical: selectedCategorical,
                  selectedDate: selectedDate,
                  opportunityKeyword: opportunityKeyword,
                  selectedOpportunityNoticeType: selectedOpportunityNoticeType || undefined, // Base type filter for pie/by-org
                  dashboardView: dashboardView, // Save the current view (advanced/simple)
                  layouts: dashboardLayouts, // Include widget layouts
                  widgetVisibility: dashboardWidgetVisibility, // Include widget visibility
                  filterSnapshot: filterSnapshotRef.current || undefined, // Sidebar filters so shared view matches
                  opportunityFavorites: opportunityFavorites.size > 0 ? [...opportunityFavorites] : undefined,
                  opportunityFavoriteRows: opportunityFavoriteRows.length > 0 ? opportunityFavoriteRows : undefined,
                }

                // Always re-save latest state/title so existing links stay current.
                const result = await saveSharedDashboard(effectiveShareId, dashboardData)
                if (!result?.ok) {
                  alert('Failed to update shared dashboard. Please try again.')
                  return
                }

                if (!shareId) {
                  setShareId(effectiveShareId)
                }

                const shareUrl = getShareableUrl(effectiveShareId)
                const copied = await copyToClipboard(shareUrl)
                if (copied) {
                  setShareLinkCopied(true)
                  setTimeout(() => setShareLinkCopied(false), 3000)
                }
                if (!result.backendSaved) {
                  // Not fatal: link will only work in this browser.
                  console.warn('Share link saved locally only (backend not configured).')
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {shareLinkCopied ? 'Link Copied!' : shareId ? 'Copy Share Link' : 'Share Dashboard'}
            </button>
            {shareId && (
              <span className="text-xs text-gray-500">
                Share ID: {shareId.split('_')[1]}
              </span>
            )}
            {saveFeedbackMessage && (
              <span className="text-xs text-green-700 font-medium">
                {saveFeedbackMessage}
              </span>
            )}
            <div className="hidden sm:block h-6 border-l border-gray-300 mx-1" />
            {isScreenRecordingSupported() && (
              <>
                {!isRecordingScreen ? (
                  <>
                    <button
                      type="button"
                      onClick={handleStartScreenRecord}
                      disabled={!data}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50"
                      title="Record your tab or screen in real time"
                    >
                      Live capture
                    </button>
                  </>
                ) : (
                  <>
                    <span className="px-3 py-2 rounded-lg bg-red-100 text-red-800 text-sm font-medium">
                      Recording {Math.floor(screenRecordingElapsed / 60)}:{String(screenRecordingElapsed % 60).padStart(2, '0')}
                    </span>
                    <button
                      type="button"
                      onClick={handleStopScreenRecord}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
                    >
                      Stop recording
                    </button>
                  </>
                )}
                {lastShortVideo?.blob && !isRecordingScreen && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUploadToYouTube()}
                      disabled={!!uploadingToYouTubeId}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm disabled:opacity-50"
                      title={isYouTubeUploadConfigured() ? 'Upload to YouTube' : 'Add VITE_GOOGLE_CLIENT_ID to enable'}
                    >
                      {uploadingToYouTubeId === 'current' ? 'Uploading…' : 'Upload to YouTube'}
                    </button>
                    <button
                      type="button"
                      onClick={handleShareToLinkedIn}
                      className="px-4 py-2 bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] font-medium text-sm"
                      title="Download video and open LinkedIn to post"
                    >
                      Share to LinkedIn
                    </button>
                  </>
                )}
              </>
            )}
            </div>
          </div>
        </div>

        <div ref={shortCaptureRef}>
          {/* Active Filter Indicator */}
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

          {/* Charts Section */}
          {dashboardView === 'data' ? (
            <DataMetadataEditor
              data={data}
              columns={columns}
              numericColumns={effectiveNumericColumns}
              categoricalColumns={categoricalColumns}
              dateColumns={dateColumns}
              onMetadataUpdate={handleMetadataUpdate}
            />
          ) : dashboardView === 'timeseries' ? (
            <TimeSeriesReport
              data={dashboardFilteredData || data}
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
                  <p><strong>Hover over field names</strong> (e.g. COG, SOG, base type, organization) in the chart titles above to see what they mean. COG = course over ground (direction in degrees). SOG = speed over ground (knots). MMSI = vessel ID. Base type = Solicitation / Presolicitation / Sources Sought.</p>
                </div>
              </details>
              <AdvancedDashboard
                data={data}
                filteredData={dashboardFilteredData}
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
          ) : dashboardView === 'custom' ? (
            <AdvancedDashboardGrid
              data={data}
              filteredData={dashboardFilteredData}
              selectedNumeric={selectedNumeric}
              selectedCategorical={selectedCategorical}
              selectedDate={selectedDate}
              onChartFilter={handleChartFilter}
              chartFilter={chartFilter}
              categoricalColumns={categoricalColumns}
              numericColumns={effectiveNumericColumns}
              dateColumns={dateColumns}
            />
          ) : (
            <>
              {showMapTab && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 mb-6" style={{ minHeight: '360px' }}>
                  <ContractMapWidget
                    data={dashboardFilteredData || data}
                    selectedCategorical="state"
                    selectedNumeric={effectiveNumericColumns?.includes('award_amount') ? 'award_amount' : effectiveNumericColumns?.includes('opportunity_count') ? 'opportunity_count' : null}
                    chartFilter={chartFilter}
                    onChartFilter={handleChartFilter}
                  />
                </div>
              )}
              <DashboardCharts
                data={data}
                filteredData={dashboardFilteredData}
                selectedNumeric={selectedNumeric}
                selectedCategorical={selectedCategorical}
                selectedDate={selectedDate}
                onChartFilter={handleChartFilter}
                chartFilter={chartFilter}
                onDateRangeFilter={handleDateRangeFilter}
                onSubawardDrilldown={openSubawardsForRecipient}
                pieFilteredData={opportunityPieDataByOrg}
                pieDimensionOverride={opportunityPieDataByOrg ? 'organization' : undefined}
                pieTitleOverride={opportunityPieDataByOrg ? `By organization (${selectedOpportunityNoticeType})` : undefined}
                showVesselMap={vesselMapConfig.show}
                vesselMapData={dashboardFilteredData}
                vesselLatCol={vesselMapConfig.latCol}
                vesselLonCol={vesselMapConfig.lonCol}
              />
            </>
          )}
        </div>

        {renderOpportunityListPanel()}

        {/* Metric Cards - Only in simple view */}
        {dashboardView === 'simple' && (
          <MetricCards
            data={dashboardFilteredData}
            numericColumns={effectiveNumericColumns}
            selectedNumeric={selectedNumeric}
            stats={stats}
          />
        )}

        {/* AI Insights Section */}
        <div className="mt-6 space-y-4">
          <details className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <summary className="cursor-pointer font-semibold text-gray-900 mb-4">
              AI Insights & Export
            </summary>
            <div className="mt-4">
              <div className="flex gap-2 mb-4 flex-wrap">
                <button
                  onClick={downloadSummaryCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  Export CSV
                </button>
                <button
                  onClick={downloadSummaryExcel}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Export Excel
                </button>
                <button
                  onClick={downloadDashboardPDF}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Export PDF
                </button>
                <button
                  onClick={clearAnalyticsDataAndReload}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                >
                  New Upload
                </button>
              </div>
              <AIInsights 
                data={dashboardFilteredData} 
                columns={columns} 
                totalRows={dashboardFilteredData?.length || 0}
                stats={stats}
              />
            </div>
          </details>
        </div>
      </div>

      <SubawardDrilldownModal
        isOpen={subawardModalOpen}
        onClose={() => setSubawardModalOpen(false)}
        recipientName={subawardRecipient}
        primeAwardIds={
          (sidebarFilteredData || filteredData || data || [])
            ?.filter((r) => {
              if (!r) return false
              const recipientName = r['Recipient Name'] || r['Recipient Name'] || r.recipientName
              return recipientName === subawardRecipient
            })
            ?.map((r) => {
              // Try multiple field name variations
              return r['Award ID'] || r['AwardID'] || r.awardId || r.award_id || r.id || ''
            })
            ?.filter((id) => id && id !== '') || []
        }
      />
    </div>
  )
}

export default Dashboard

