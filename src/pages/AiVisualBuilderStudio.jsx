/**
 * AI Visual Builder Studio
 * Select dataset, type natural-language prompt, generate/refine DashboardSpec, preview in renderer.
 * Save/Load spec via localStorage (MVP).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams, useNavigate, useLocation, Navigate } from 'react-router-dom'
import StudioShell from './studio/StudioShell'
import TabHeader from './studio/components/TabHeader'
import ReportChatView from './studio/ReportChatView'
import DataView from './studio/DataView'
import PreviewView from './studio/PreviewView'
import ErrorBoundary from '../components/ErrorBoundary'
import { getDashboard, saveDashboard, listDashboards } from '../studio/api/studioClient'
import { generateShareId, saveSharedDashboard, getShareableUrl, copyToClipboard } from '../utils/shareUtils'
import { normalizeSchema, isDashboardSpec, getSpecContent } from '../studio/utils/schemaUtils'
import apiClient from '../config/api'

const STORAGE_KEY_SPEC = 'aiVisualBuilder_spec'
const STORAGE_KEY_DATASET = 'aiVisualBuilder_dataset'
const STORAGE_KEY_FULLSCREEN = 'aiVisualBuilder_fullScreen'

// Example datasets (ids that work with /api/example/:id or /api/ai/dataset-schema?dataset=)
const EXAMPLE_DATASET_IDS = [
  'sales',
  'attendance',
  'donations',
  'medical',
  'banking',
  'yearly-income',
  'nfl-schedule',
  'pharmacy',
  'superbowl-winners',
  'today-snapshot',
  'revenue-trends',
  'alters-insights',
  'samgov/live'
]
const UPLOAD_DATASET_ID = 'upload'

/** Build schema shape from upload API response */
function buildSchemaFromUpload(res) {
  const { data, columns = [], numericColumns = [], dateColumns = [], rowCount } = res
  const fields = (columns || []).map((name) => ({
    name,
    type: (dateColumns || []).includes(name) ? 'date' : (numericColumns || []).includes(name) ? 'number' : 'string',
    examples: []
  }))
  return { rowCount: rowCount ?? (data?.length ?? 0), fields }
}

/** Build a friendly assistant summary from a dashboard spec (for chat bubble). No backend. */
function buildAssistantSummary(spec) {
  if (!spec) return 'Your report is ready. Check the preview.'
  const title = spec.title || 'Untitled Dashboard'
  const { filters, kpis, charts } = getSpecContent(spec)
  const kCount = kpis.length
  const cCount = charts.length
  const fCount = filters.length

  const parts = []
  parts.push(`**${title}** is ready.`)
  if (kCount + cCount + fCount === 0) {
    parts.push('The report is empty; try adding filters, KPIs, or charts in a follow-up message.')
  } else {
    const items = []
    if (kCount) items.push(`${kCount} KPI${kCount !== 1 ? 's' : ''}`)
    if (cCount) items.push(`${cCount} chart${cCount !== 1 ? 's' : ''}`)
    if (fCount) items.push(`${fCount} filter${fCount !== 1 ? 's' : ''}`)
    if (spec.tabs && spec.tabs.length >= 2) items.push(`${spec.tabs.length} tabs`)
    parts.push(`It has ${items.join(', ')}.`)
  }

  if (charts.length > 0) {
    const chartLines = charts.slice(0, 6).map((c) => {
      const type = (c.type || 'chart').replace(/_/g, ' ')
      const dim = c.xField || c.dimension || c.field
      const met = c.yField || c.metric || c.measure
      const desc = [dim, met].filter(Boolean).join(' by ')
      return desc ? `• ${type}: ${desc}` : `• ${type}`
    })
    parts.push('')
    parts.push('Charts:')
    parts.push(chartLines.join('\n'))
  }

  if (filters.length > 0) {
    parts.push('')
    parts.push('You can filter the data using the controls above the report. Charts that support it can also be used to cross-filter (click segments or bars).')
  }

  // Contextual follow-up suggestions (2–3)
  const followUps = []
  const hasTime = charts.some((c) => (c.xField || c.dimension || '').toLowerCase().includes('date') || (c.xField || c.dimension || '').toLowerCase().includes('month'))
  const hasCategory = charts.some((c) => c.xField || c.dimension)
  if (charts.length > 0 && !hasTime) followUps.push('Add a trend over time (e.g. by date or month).')
  if (hasCategory && charts.length < 4) followUps.push('Add another chart breaking down by a different dimension.')
  if (kpis.length === 0 && charts.length > 0) followUps.push('Add headline KPIs for the main metrics.')
  if (filters.length < 2 && (charts.length > 0 || kpis.length > 0)) followUps.push('Add a filter to slice the data (e.g. region or category).')
  if (followUps.length === 0) followUps.push('Try "Add a table of top 10 rows" or "Show a pie chart by category".')
  const suggested = followUps.slice(0, 3)
  parts.push('')
  parts.push('**Suggested follow-ups:**')
  suggested.forEach((s) => parts.push(`• ${s}`))

  return parts.join('\n')
}

function formatFieldLabel(field) {
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
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function buildDatasetProfile({ datasetId, uploadedFileName, schema, data }) {
  const fields = schema?.fields || []
  const rowCount = Array.isArray(data) ? data.length : (schema?.rowCount ?? 0)
  const numeric = fields.filter((f) => (f.type || '').toLowerCase() === 'number').map((f) => f.name)
  const dates = fields.filter((f) => (f.type || '').toLowerCase() === 'date').map((f) => f.name)
  const categorical = fields
    .filter((f) => {
      const t = (f.type || '').toLowerCase()
      return t !== 'number' && t !== 'date'
    })
    .map((f) => f.name)

  // Lightweight cardinality preview for the first categorical field (if we have data).
  let topCategory = null
  if (Array.isArray(data) && categorical.length) {
    const dim = categorical[0]
    const counts = new Map()
    for (const r of data.slice(0, 500)) {
      const v = r?.[dim]
      if (v == null || v === '') continue
      const k = String(v)
      counts.set(k, (counts.get(k) || 0) + 1)
    }
    const sorted = Array.from(counts.entries()).sort((a, b) => (b[1] - a[1]) || String(a[0]).localeCompare(String(b[0])))
    topCategory = { field: dim, distinct: counts.size, top: sorted.slice(0, 5) }
  }

  return {
    key: `${datasetId || ''}:${uploadedFileName || ''}:${rowCount}:${fields.length}`,
    datasetId,
    uploadedFileName,
    rowCount,
    totalColumns: fields.length,
    numeric,
    dates,
    categorical,
    topCategory
  }
}

function buildDatasetSummaryMessage(profile) {
  if (!profile) return ''
  const name = profile.datasetId === 'upload'
    ? `your upload${profile.uploadedFileName ? ` (${profile.uploadedFileName})` : ''}`
    : `dataset "${profile.datasetId}"`
  const parts = []
  parts.push(`I’m ready to help with ${name}.`)
  parts.push(`**Data summary:** ${profile.rowCount} rows • ${profile.totalColumns} columns`)
  parts.push(`**Types:** ${profile.numeric.length} numeric • ${profile.dates.length} date • ${profile.categorical.length} categorical`)
  if (profile.numeric.length) parts.push(`**Numeric:** ${profile.numeric.slice(0, 8).map(formatFieldLabel).join(', ')}${profile.numeric.length > 8 ? '…' : ''}`)
  if (profile.dates.length) parts.push(`**Date:** ${profile.dates.slice(0, 4).map(formatFieldLabel).join(', ')}${profile.dates.length > 4 ? '…' : ''}`)
  if (profile.categorical.length) parts.push(`**Categorical:** ${profile.categorical.slice(0, 8).map(formatFieldLabel).join(', ')}${profile.categorical.length > 8 ? '…' : ''}`)
  if (profile.topCategory) {
    const top = profile.topCategory.top
      .map(([v, n]) => `${v} (${n})`)
      .join(', ')
    parts.push(`**Example categories (${formatFieldLabel(profile.topCategory.field)}):** ${profile.topCategory.distinct} distinct • top: ${top}`)
  }
  parts.push('')
  parts.push('Ask me things like:')
  parts.push('- “How many rows and columns?”')
  parts.push('- “What are the numeric columns?”')
  parts.push('- “What do you suggest?”')
  parts.push('- “Create a report for this dataset.”')
  return parts.join('\n')
}

function buildAutoReportPrompt(profile) {
  const dateField = profile?.dates?.[0]
  const metric = profile?.numeric?.[0]
  const dim = profile?.categorical?.[0]
  const lines = []
  lines.push('Create a sensible executive dashboard for this dataset.')
  lines.push('Requirements:')
  lines.push('- Add 3–5 KPI cards for the most important numeric metrics (use avg for rates like ADR/RevPAR/occupancy_rate, sum for revenue/cost/rooms_sold).')
  if (dateField) lines.push(`- Add a trend chart over time using date field "${dateField}".`)
  else lines.push('- If no date column exists, skip time trend and focus on categorical breakdowns.')
  if (dim) lines.push(`- Add a bar chart of the main metric by "${dim}" (top 10).`)
  lines.push('- Avoid pie charts over date/time.')
  if (metric) lines.push(`Prioritize metric "${metric}" if it makes sense.`)
  lines.push('Make titles human-friendly and readable.')
  return lines.join('\n')
}

function maybeAnswerLocally(text, profile) {
  const t = String(text || '').trim()
  const lower = t.toLowerCase()
  if (!t || !profile) return null

  const asksRows = /how many.*rows|number of rows|rows do we have/.test(lower)
  const asksCols = /how many.*columns|number of columns|what columns/.test(lower)
  const asksNumeric = /numeric columns|number columns|measures|metrics/.test(lower)
  const asksTypes = /data types|types|schema|what type/.test(lower)
  const asksCats = /categories|categorical|dimensions/.test(lower)
  const asksSuggest = /what do you suggest|suggest.*report|recommend|what should i do/.test(lower)
  const asksCreate = /create .*report|create .*dashboard|generate .*report|generate .*dashboard|build .*report|build .*dashboard|auto.*report/.test(lower)

  if (asksCreate) return { kind: 'generate' }

  if (asksRows || asksCols || asksNumeric || asksTypes || asksCats) {
    const lines = []
    if (asksRows || asksCols) lines.push(`This dataset has **${profile.rowCount} rows** and **${profile.totalColumns} columns**.`)
    if (asksTypes || asksNumeric || asksCats) {
      lines.push(`Types: **${profile.numeric.length} numeric**, **${profile.dates.length} date**, **${profile.categorical.length} categorical**.`)
    }
    if (asksNumeric) lines.push(`Numeric columns: ${profile.numeric.length ? profile.numeric.map(formatFieldLabel).join(', ') : 'None detected.'}`)
    if (asksCats) lines.push(`Categorical columns: ${profile.categorical.length ? profile.categorical.map(formatFieldLabel).join(', ') : 'None detected.'}`)
    if (asksTypes) {
      if (profile.dates.length) lines.push(`Date columns: ${profile.dates.map(formatFieldLabel).join(', ')}`)
    }
    return { kind: 'answer', content: lines.join('\n') }
  }

  if (asksSuggest) {
    const lines = []
    lines.push('Here are good next steps for this dataset:')
    lines.push('- Generate an executive dashboard (KPIs + trend + breakdown).')
    if (profile.dates.length) lines.push(`- Add a forecast for ${formatFieldLabel(profile.numeric[0] || 'your main metric')} over ${formatFieldLabel(profile.dates[0])}.`)
    if (profile.categorical.length) lines.push(`- Slice results by ${formatFieldLabel(profile.categorical[0])}.`)
    lines.push('')
    lines.push('If you want, say: **“Create a report for this dataset.”**')
    return { kind: 'answer', content: lines.join('\n') }
  }

  return null
}

export default function AiVisualBuilderStudio() {
  const [datasetId, setDatasetId] = useState(() => localStorage.getItem(STORAGE_KEY_DATASET) || 'sales')
  const [schema, setSchema] = useState(null)
  const [data, setData] = useState(null)
  const [uploadedData, setUploadedData] = useState(null)
  const [uploadedSchema, setUploadedSchema] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [dataLoadError, setDataLoadError] = useState(null)
  const [spec, setSpec] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_SPEC)
      return s ? JSON.parse(s) : null
    } catch {
      return null
    }
  })
  const [prompt, setPrompt] = useState('')
  const [promptHistory, setPromptHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filterValues, setFilterValues] = useState({})
  const [userDashboards, setUserDashboards] = useState([])
  const [dashboardTitle, setDashboardTitle] = useState('Untitled Dashboard')
  const [savedDashboardId, setSavedDashboardId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [savedApps, setSavedApps] = useState([])
  const [loadedMessage, setLoadedMessage] = useState(null)
  const [publicLinkCopied, setPublicLinkCopied] = useState(false)
  const [fullScreen, setFullScreen] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FULLSCREEN) === 'true'
      const urlForcesFullscreen = (typeof window !== 'undefined' && /(?:\?|&)fs=1(?:&|$)/.test(window.location.search))
      return stored || urlForcesFullscreen
    } catch { return false }
  })
  const [pendingConversationMessage, setPendingConversationMessage] = useState(null)
  const [activeTab, setActiveTab] = useState(() =>
    (typeof window !== 'undefined' && window.location.pathname.endsWith('/preview') ? 'preview' : 'chat')
  )
  const [chatTab, setChatTab] = useState('chat') // 'data' | 'chat' | 'preview' inside ReportChatView
  const [chatMessages, setChatMessages] = useState([]) // { id, role: 'user'|'assistant', content }
  const [conversationInputValue, setConversationInputValue] = useState('')
  const [dataLakeList, setDataLakeList] = useState([])
  const [dataLakeListLoading, setDataLakeListLoading] = useState(false)
  const [saveToLakeName, setSaveToLakeName] = useState('')
  const [saveToLakeLoading, setSaveToLakeLoading] = useState(false)
  const [dataByDatasetIdExtra, setDataByDatasetIdExtra] = useState({}) // data for tab.dataset ids (when different from primary)
  const uploadInputRef = useRef(null)
  const lastDatasetSummaryKeyRef = useRef('')

  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('open')
  const forceFullscreen = searchParams.get('fs') === '1'

  // If the URL forces fullscreen (e.g. from My Dashboards), persist it for this session.
  useEffect(() => {
    if (!forceFullscreen) return
    setFullScreen(true)
    try {
      localStorage.setItem(STORAGE_KEY_FULLSCREEN, 'true')
    } catch (_) {}
  }, [forceFullscreen])

  // Redirect /studio or /studio/ to /studio/chat (preserve search e.g. ?open=)
  if (location.pathname === '/studio' || location.pathname === '/studio/') {
    const search = location.search || ''
    return <Navigate to={`/studio/chat${search}`} replace />
  }

  // Nested Studio routes: /studio/chat | /studio/data | /studio/preview (build removed)
  const studioView = (() => {
    const p = location.pathname
    if (p.endsWith('/data')) return 'data'
    if (p.endsWith('/preview')) return 'preview'
    return 'chat' // /studio/chat or fallback
  })()

  const VIEW_META = {
    chat: { title: 'Report Chat', subtitle: "Describe the report. We'll build it instantly." },
    data: { title: 'Data', subtitle: 'Select, upload, or manage datasets.' },
    preview: { title: 'Preview & Publish', subtitle: 'Finalize style, save, and share.' },
    clear: { title: 'Clear', subtitle: 'Clear dashboard and start over.' }
  }

  // Load a saved dashboard when ?open=:id is in the URL (e.g. from /studio/app/:id redirect)
  useEffect(() => {
    if (!openId) return
    let cancelled = false
    getDashboard(openId)
      .then((raw) => {
        if (cancelled || !raw) return
        const normalized = normalizeSchema(raw)
        if (isDashboardSpec(normalized)) {
          setSpec(normalized)
          setSavedDashboardId(openId)
          setDatasetId(normalized.datasetId || 'sales')
          setDashboardTitle(normalized.title || 'Untitled Dashboard')
          setLoadedMessage(normalized.title || 'Dashboard')
        }
        setSearchParams({}, { replace: true })
      })
      .catch(() => { if (!cancelled) setError('Failed to load dashboard') })
    return () => { cancelled = true }
  }, [openId, setSearchParams])

  // Auto-dismiss "Loaded" message after 3 seconds
  useEffect(() => {
    if (!loadedMessage) return
    const t = setTimeout(() => setLoadedMessage(null), 3000)
    return () => clearTimeout(t)
  }, [loadedMessage])

  // Report Converse: clear pending user message once handleGenerate has added it to promptHistory
  useEffect(() => {
    if (!pendingConversationMessage) return
    const last = promptHistory[promptHistory.length - 1]
    if (last && last.prompt === pendingConversationMessage) {
      setPendingConversationMessage(null)
    }
  }, [promptHistory, pendingConversationMessage])

  // Load user dashboards (with data) for dataset selector
  useEffect(() => {
    apiClient
      .get('/api/dashboards')
      .then((res) => {
        const list = (res.data || []).filter((d) => d.data && Array.isArray(d.data) && d.data.length > 0)
        setUserDashboards(list)
      })
      .catch(() => setUserDashboards([]))
  }, [])

  // Load data lake list
  const fetchDataLakeList = useCallback(() => {
    setDataLakeListLoading(true)
    apiClient
      .get('/api/datalake')
      .then((res) => {
        setDataLakeList(Array.isArray(res.data?.datasets) ? res.data.datasets : [])
      })
      .catch(() => setDataLakeList([]))
      .finally(() => setDataLakeListLoading(false))
  }, [])
  useEffect(() => { fetchDataLakeList() }, [fetchDataLakeList])

  // Load saved Studio dashboards (for "Open" list)
  useEffect(() => {
    listDashboards()
      .then((data) => {
        const list = (data || []).map((d) => {
          let schema = d.schema
          if (typeof schema === 'string') {
            try { schema = JSON.parse(schema) } catch { schema = null }
          }
          return {
            id: d.id,
            name: d.name || schema?.title || schema?.metadata?.name || 'Untitled',
            updated_at: d.updated_at || d.created_at
          }
        })
        setSavedApps(list)
      })
      .catch(() => setSavedApps([]))
  }, [savedDashboardId])

  // Load schema when dataset changes (or use uploaded)
  useEffect(() => {
    if (!datasetId) {
      setSchema(null)
      return
    }
    if (datasetId === UPLOAD_DATASET_ID) {
      setSchema(uploadedSchema || null)
      return
    }
    let cancelled = false
    setSchema(null)
    apiClient
      .get('/api/ai/dataset-schema', { params: { dataset: datasetId } })
      .then((res) => {
        if (!cancelled) setSchema(res.data)
      })
      .catch(() => {
        if (!cancelled) setSchema(null)
      })
    return () => { cancelled = true }
  }, [datasetId, uploadedSchema])

  // Load data when dataset changes (for renderer)
  useEffect(() => {
    if (!datasetId) {
      setData(null)
      setDataLoadError(null)
      return
    }
    if (datasetId === UPLOAD_DATASET_ID) {
      setData(uploadedData || null)
      setDataLoadError(null)
      return
    }
    let cancelled = false
    setData(null)
    setDataLoadError(null)
    apiClient
      .get('/api/ai/dataset-data', { params: { dataset: datasetId } })
      .then((res) => {
        if (!cancelled && res.data && res.data.data) {
          setData(res.data.data)
          setDataLoadError(null)
        } else if (!cancelled) {
          setDataLoadError('Backend returned no data for this dataset.')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null)
          const msg = err.response?.status === 404
            ? 'Dataset not found.'
            : (err.response?.data?.error || err.message || 'Could not reach the API.')
          setDataLoadError(msg)
        }
      })
    return () => { cancelled = true }
  }, [datasetId, uploadedData])

  const datasetProfile = useMemo(() => {
    const s = schema || (uploadedSchema?.fields ? { fields: uploadedSchema.fields, rowCount: uploadedSchema.rowCount } : null)
    const d = datasetId === UPLOAD_DATASET_ID ? uploadedData : data
    if (!datasetId || !s) return null
    return buildDatasetProfile({ datasetId, uploadedFileName, schema: s, data: d })
  }, [datasetId, schema, uploadedSchema, uploadedData, data, uploadedFileName])

  // Post an automatic dataset summary message when a dataset is selected/loaded.
  useEffect(() => {
    if (!datasetProfile) return
    const key = datasetProfile.key
    if (lastDatasetSummaryKeyRef.current === key) return
    lastDatasetSummaryKeyRef.current = key
    const msg = buildDatasetSummaryMessage(datasetProfile)
    if (!msg) return
    const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setChatMessages((m) => [...m, { id: `msg-${uid}-assistant`, role: 'assistant', content: msg }])
  }, [datasetProfile])

  // Load data for tab.dataset ids when spec has tabs with different datasets (so each tab can use a different dataset)
  const tabDatasetIds = useMemo(() => {
    const ids = new Set()
    if (Array.isArray(spec?.tabs)) {
      spec.tabs.forEach((t) => { if (t && t.dataset) ids.add(t.dataset) })
    }
    return Array.from(ids).filter((id) => id !== datasetId && id !== UPLOAD_DATASET_ID)
  }, [spec?.tabs, datasetId])
  useEffect(() => {
    if (tabDatasetIds.length === 0) {
      setDataByDatasetIdExtra({})
      return
    }
    let cancelled = false
    const loaded = {}
    Promise.all(
      tabDatasetIds.map((id) =>
        apiClient.get('/api/ai/dataset-data', { params: { dataset: id } }).then((res) => {
          if (!cancelled && res.data?.data) loaded[id] = res.data.data
        }).catch(() => {})
      )
    ).then(() => {
      if (!cancelled) setDataByDatasetIdExtra((prev) => (Object.keys(loaded).length ? { ...prev, ...loaded } : {}))
    })
    return () => { cancelled = true }
  }, [tabDatasetIds.join(',')])

  const dataByDatasetId = useMemo(() => {
    const primary = datasetId && (data || (datasetId === UPLOAD_DATASET_ID ? uploadedData : null))
    if (!primary && Object.keys(dataByDatasetIdExtra).length === 0) return undefined
    return {
      ...(primary && datasetId ? { [datasetId]: primary } : {}),
      ...dataByDatasetIdExtra
    }
  }, [datasetId, data, uploadedData, dataByDatasetIdExtra])

  const onTabDatasetChange = useCallback((tabIndex, datasetIdForTab) => {
    setSpec((s) => {
      if (!s?.tabs || tabIndex < 0 || tabIndex >= s.tabs.length) return s
      return {
        ...s,
        tabs: s.tabs.map((t, i) => (i === tabIndex ? { ...t, dataset: datasetIdForTab || undefined } : t))
      }
    })
  }, [])

  // Sync title from spec when spec changes (e.g. after generate)
  useEffect(() => {
    if (spec?.title) setDashboardTitle(spec.title)
  }, [spec?.title])

  // Persist spec to localStorage
  useEffect(() => {
    if (spec) {
      try {
        localStorage.setItem(STORAGE_KEY_SPEC, JSON.stringify(spec))
      } catch (e) {
        console.warn('localStorage setItem failed', e)
      }
    }
  }, [spec])

  useEffect(() => {
    if (datasetId) localStorage.setItem(STORAGE_KEY_DATASET, datasetId)
  }, [datasetId])

  // When selected data changes, clear the generated report so it stays aligned with current data
  const prevDatasetIdRef = useRef(datasetId)
  useEffect(() => {
    if (prevDatasetIdRef.current !== datasetId) {
      prevDatasetIdRef.current = datasetId
      setSpec(null)
    }
  }, [datasetId])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FULLSCREEN, String(fullScreen))
    } catch (_) {}
  }, [fullScreen])

  const handleGenerate = useCallback(async (overridePrompt, displayPrompt) => {
    const userPrompt = (overridePrompt !== undefined ? String(overridePrompt || '') : (prompt || '')).trim()
    const shownPrompt = (displayPrompt !== undefined ? String(displayPrompt || '') : userPrompt).trim()
    if (!userPrompt) {
      setError('Enter a prompt.')
      return
    }
    if (!datasetId) {
      setError('Select a dataset first.')
      return
    }
    if (datasetId === UPLOAD_DATASET_ID && (!uploadedData || !uploadedData.length)) {
      setError('Upload a file first or select another dataset.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const body = datasetId === UPLOAD_DATASET_ID && uploadedData?.length
        ? { userPrompt, existingSpec: spec || undefined, data: uploadedData }
        : { datasetId, userPrompt, existingSpec: spec || undefined }
      const res = await apiClient.post('/api/ai/dashboard-spec', body)
      const newSpec = res.data?.spec
      if (newSpec) {
        setSpec(newSpec)
        setPromptHistory((h) => [...h, { prompt: shownPrompt, at: new Date().toISOString() }])
        const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        setChatMessages((m) => [
          ...m,
          { id: `msg-${uid}-user`, role: 'user', content: shownPrompt },
          { id: `msg-${uid}-assistant`, role: 'assistant', content: buildAssistantSummary(newSpec) }
        ])
        setActiveTab('preview')
      } else {
        setError('No spec returned.')
      }
    } catch (err) {
      setPendingConversationMessage(null)
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to generate dashboard'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [datasetId, prompt, spec, uploadedData])

  // Conversation Mode: send message (sets prompt, shows pending bubble, calls existing handleGenerate)
  const sendConversationMessage = useCallback(() => {
    const text = (conversationInputValue || '').trim()
    if (!text || loading) return
    if (!datasetId) {
      setError('Select a dataset first.')
      return
    }
    if (datasetId === UPLOAD_DATASET_ID && (!uploadedData || !uploadedData.length)) {
      setError('Upload a file first or select another dataset.')
      return
    }
    const local = maybeAnswerLocally(text, datasetProfile)
    if (local?.kind === 'answer') {
      const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setChatMessages((m) => [
        ...m,
        { id: `msg-${uid}-user`, role: 'user', content: text },
        { id: `msg-${uid}-assistant`, role: 'assistant', content: local.content }
      ])
      setConversationInputValue('')
      setError(null)
      return
    }

    // Auto-report generation: convert a generic request into a dataset-aware prompt.
    if (local?.kind === 'generate') {
      const sent = buildAutoReportPrompt(datasetProfile)
      setPrompt(text)
      setPendingConversationMessage(text)
      setConversationInputValue('')
      setError(null)
      handleGenerate(sent, text)
      return
    }

    // Dataset-aware Q&A via backend (ChatGPT-like on this dataset)
    const uid = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    const activeSchema = schema || (uploadedSchema?.fields ? { fields: uploadedSchema.fields, rowCount: uploadedSchema.rowCount } : null)
    const activeData = datasetId === UPLOAD_DATASET_ID ? (uploadedData || []) : (data || [])
    const safeSample = Array.isArray(activeData)
      ? activeData.slice(0, 40).map((r) => (r && typeof r === 'object' ? r : {}))
      : []

    setPendingConversationMessage(text)
    setConversationInputValue('')
    setError(null)
    setLoading(true)
    apiClient.post('/api/ai/dataset-chat', {
      message: text,
      datasetId,
      schema: activeSchema,
      rowCount: Array.isArray(activeData) ? activeData.length : (activeSchema?.rowCount ?? 0),
      sampleRows: safeSample
    }).then((res) => {
      const reply = (res.data?.reply || '').toString().trim() || 'No reply.'
      setChatMessages((m) => [
        ...m,
        { id: `msg-${uid}-user`, role: 'user', content: text },
        { id: `msg-${uid}-assistant`, role: 'assistant', content: reply }
      ])
      setPendingConversationMessage(null)
    }).catch((err) => {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Chat failed'
      setError(msg)
    }).finally(() => {
      setLoading(false)
    })
  }, [conversationInputValue, loading, datasetId, uploadedData, handleGenerate, datasetProfile])

  const loadSavedSpec = () => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_SPEC)
      if (s) setSpec(JSON.parse(s))
    } catch (e) {
      setError('Failed to load saved spec.')
    }
  }

  const clearSpec = () => {
    if (!window.confirm('Clear dashboard? This can\'t be undone.')) return
    setSpec(null)
    setPromptHistory([])
    setChatMessages([])
    setPendingConversationMessage(null)
    try {
      localStorage.removeItem(STORAGE_KEY_SPEC)
    } catch (_) {}
  }

  const handleFileUpload = useCallback(async (e) => {
    const file = e?.target?.files?.[0]
    if (!file) return
    setUploadLoading(true)
    setUploadError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await apiClient.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000
      })
      const schemaFromUpload = buildSchemaFromUpload(res.data)
      setUploadedData(res.data?.data ?? null)
      setUploadedSchema(schemaFromUpload)
      setUploadedFileName(file.name)
      setDatasetId(UPLOAD_DATASET_ID)
    } catch (err) {
      setUploadError(err.response?.data?.error || err.message || 'Upload failed')
    } finally {
      setUploadLoading(false)
      e.target.value = ''
    }
  }, [])

  const clearUploadedData = useCallback(() => {
    setUploadedData(null)
    setUploadedSchema(null)
    setUploadedFileName(null)
    setUploadError(null)
    if (datasetId === UPLOAD_DATASET_ID) setDatasetId('sales')
  }, [datasetId])

  const handleSaveToDataLake = useCallback(async () => {
    const rows = data || (datasetId === UPLOAD_DATASET_ID ? uploadedData : null)
    const schemaToUse = schema || (uploadedSchema?.fields ? { fields: uploadedSchema.fields } : null)
    if (!Array.isArray(rows) || rows.length === 0) {
      setSaveError('No data to save. Load or upload a dataset first.')
      return
    }
    if (!schemaToUse?.fields?.length) {
      setSaveError('No schema available. Load or upload a dataset first.')
      return
    }
    const name = (saveToLakeName || 'dataset').trim()
    setSaveToLakeLoading(true)
    setSaveError(null)
    try {
      const columns = schemaToUse.fields.map((f) => f.name)
      const numericColumns = schemaToUse.fields.filter((f) => (f.type || '').toLowerCase() === 'number').map((f) => f.name)
      const dateColumns = schemaToUse.fields.filter((f) => (f.type || '').toLowerCase() === 'date').map((f) => f.name)
      const categoricalColumns = schemaToUse.fields.filter((f) => {
        const t = (f.type || '').toLowerCase()
        return t !== 'number' && t !== 'date'
      }).map((f) => f.name)
      const res = await apiClient.post('/api/datalake', {
        name,
        data: rows,
        columns,
        numericColumns,
        categoricalColumns,
        dateColumns
      })
      setSaveToLakeName('')
      fetchDataLakeList()
      if (res.data?.id) setDatasetId(`datalake:${res.data.id}`)
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to save to Data Lake')
    } finally {
      setSaveToLakeLoading(false)
    }
  }, [data, datasetId, uploadedData, schema, uploadedSchema, saveToLakeName, fetchDataLakeList])

  const handleDeleteFromDataLake = useCallback(async (id) => {
    if (!id) return
    try {
      await apiClient.delete(`/api/datalake/${id}`)
      fetchDataLakeList()
      if (datasetId === `datalake:${id}`) setDatasetId('sales')
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message || 'Failed to delete from Data Lake')
    }
  }, [datasetId, fetchDataLakeList])

  const handleSaveDashboard = useCallback(async () => {
    if (!spec) {
      setSaveError('Generate a dashboard first.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const title = dashboardTitle.trim() || 'Untitled Dashboard'
      const activeRows = datasetId === UPLOAD_DATASET_ID ? (uploadedData || []) : (data || [])
      const fullSpec = {
        title,
        filters: Array.isArray(spec.filters) ? spec.filters : [],
        kpis: Array.isArray(spec.kpis) ? spec.kpis : [],
        charts: Array.isArray(spec.charts) ? spec.charts : [],
        layout: Array.isArray(spec.layout) ? spec.layout : [],
        style: spec.style && typeof spec.style === 'object' ? spec.style : { theme: 'executive_clean' },
        warnings: Array.isArray(spec.warnings) ? spec.warnings : [],
        datasetId: datasetId || spec.datasetId || 'sales',
        metadata: {
          ...(spec.metadata && typeof spec.metadata === 'object' ? spec.metadata : {}),
          name: title,
          updated_at: new Date().toISOString()
        }
      }
      const saved = await saveDashboard(fullSpec, savedDashboardId, { data: activeRows })
      setSavedDashboardId(saved?.id ?? null)
    } catch (err) {
      setSaveError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [spec, dashboardTitle, datasetId, savedDashboardId, data, uploadedData])

  const handleShare = useCallback(async () => {
    if (!savedDashboardId) {
      setSaveError('Save the dashboard first to get a share link.')
      return
    }
    const url = `${window.location.origin}/apps/${savedDashboardId}`
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setSaveError('Could not copy link.')
    }
  }, [savedDashboardId])

  const handleGetPublicLink = useCallback(async () => {
    if (!spec) {
      setSaveError('Generate a dashboard first.')
      return
    }
    const activeRows = datasetId === UPLOAD_DATASET_ID ? (uploadedData || []) : (data || null)
    const payload = {
      dashboardType: 'dashboardSpec',
      spec,
      datasetId: datasetId || spec.datasetId || 'sales',
      data: activeRows
    }
    const shareId = generateShareId()
    const result = await saveSharedDashboard(shareId, payload)
    if (!result?.ok) {
      setSaveError('Could not create public link.')
      return
    }
    if (!result.backendSaved) {
      setSaveError('Share link saved locally only (backend not configured). This link will only work in this browser.')
      return
    }
    const url = getShareableUrl(shareId)
    const copied = await copyToClipboard(url)
    if (copied) {
      setPublicLinkCopied(true)
      setTimeout(() => setPublicLinkCopied(false), 2000)
      setSaveError(null)
    } else {
      setSaveError('Could not copy link.')
    }
  }, [spec, datasetId, data, uploadedData])

  // Studio steps progress (non-blocking)
  const hasData = !!datasetId && (!!(data?.length) || !!(uploadedData?.length))
  const specHasContent = spec && ((spec.filters?.length ?? 0) + (spec.charts?.length ?? 0) + (spec.kpis?.length ?? 0) > 0)
  const hasReport = !!specHasContent
  const isSaved = !!savedDashboardId

  const handleLoadSampleData = useCallback(() => {
    setDatasetId((id) => (id && EXAMPLE_DATASET_IDS.includes(id) ? id : EXAMPLE_DATASET_IDS[0] || 'sales'))
  }, [])
  const focusFileInput = useCallback(() => {
    if (uploadInputRef.current) setTimeout(() => uploadInputRef.current?.click(), 100)
  }, [])

  const onSuggestionClick = (label) => {
    setPrompt(label)
    setPendingConversationMessage(label)
    setError(null)
    handleGenerate(label)
  }

  return (
    <ErrorBoundary>
      {loadedMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow-lg">
          Loaded: {loadedMessage}
        </div>
      )}
      <StudioShell
        fullScreen={fullScreen}
        view={studioView === 'data' ? studioView : activeTab}
        viewMeta={VIEW_META[studioView === 'data' ? studioView : activeTab]}
        dashboardName={dashboardTitle}
        onDashboardNameChange={(next) => {
          const name = String(next ?? '')
          setDashboardTitle(name)
          setSpec((s) => {
            if (!s) return s
            const trimmed = name.trim()
            const title = trimmed || 'Untitled Dashboard'
            return {
              ...s,
              title,
              metadata: {
                ...(s.metadata && typeof s.metadata === 'object' ? s.metadata : {}),
                name: title
              }
            }
          })
        }}
        onBackHome={() => {
          try { localStorage.setItem(STORAGE_KEY_FULLSCREEN, 'false') } catch (_) {}
          setFullScreen(false)
          navigate('/')
        }}
        onBackToDashboards={() => {
          try { localStorage.setItem(STORAGE_KEY_FULLSCREEN, 'false') } catch (_) {}
          setFullScreen(false)
          navigate('/dashboards')
        }}
        onSave={handleSaveDashboard}
        onShare={handleShare}
        onPublicLink={handleGetPublicLink}
        saving={saving}
        spec={spec}
        savedDashboardId={savedDashboardId}
        shareCopied={shareCopied}
        publicLinkCopied={publicLinkCopied}
      >
        {studioView === 'data' && (
        <DataView
          datasetId={datasetId}
          setDatasetId={setDatasetId}
          schema={schema}
          data={data}
          dataLoadError={dataLoadError}
          uploadedData={uploadedData}
          uploadedFileName={uploadedFileName}
          uploadLoading={uploadLoading}
          uploadError={uploadError}
          uploadInputRef={uploadInputRef}
          onFileUpload={handleFileUpload}
          onClearUploadedData={clearUploadedData}
          dataLakeListLoading={dataLakeListLoading}
          dataLakeList={dataLakeList}
          saveToLakeName={saveToLakeName}
          setSaveToLakeName={setSaveToLakeName}
          saveToLakeLoading={saveToLakeLoading}
          saveToLakeDisabled={!(data?.length || uploadedData?.length)}
          onSaveToDataLake={handleSaveToDataLake}
          onDeleteFromDataLake={handleDeleteFromDataLake}
          userDashboards={userDashboards}
          exampleDatasetIds={EXAMPLE_DATASET_IDS}
          uploadDatasetId={UPLOAD_DATASET_ID}
          onNext={() => navigate('/studio/chat')}
        />
      )}
        {(studioView === 'chat' || studioView === 'preview') && (
        <>
          <TabHeader activeTab={activeTab} setActiveTab={setActiveTab} hasSpec={!!spec} />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div
              style={{ display: activeTab === 'chat' ? 'flex' : 'none' }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
              aria-hidden={activeTab !== 'chat'}
            >
              <ReportChatView
                chatTab={chatTab}
                setChatTab={setChatTab}
                chatMessages={chatMessages}
                pendingConversationMessage={pendingConversationMessage}
                loading={loading}
                error={error}
                conversationInputValue={conversationInputValue}
                setConversationInputValue={setConversationInputValue}
                sendConversationMessage={sendConversationMessage}
                onSuggestionClick={onSuggestionClick}
                spec={spec}
                setSpec={setSpec}
                data={data}
                uploadedData={uploadedData}
                dataByDatasetId={dataByDatasetId}
                defaultDatasetId={datasetId}
                onTabDatasetChange={onTabDatasetChange}
                availableDatasetIds={EXAMPLE_DATASET_IDS}
                schema={schema}
                uploadedSchema={uploadedSchema}
                filterValues={filterValues}
                setFilterValues={setFilterValues}
                dashboardTitle={dashboardTitle}
                datasetId={datasetId}
                hasData={hasData}
                onGoToData={() => navigate('/studio/data')}
                onLoadSampleData={handleLoadSampleData}
                onUploadClick={focusFileInput}
                setDatasetId={setDatasetId}
                dataLoadError={dataLoadError}
                uploadedFileName={uploadedFileName}
                uploadLoading={uploadLoading}
                uploadError={uploadError}
                uploadInputRef={uploadInputRef}
                onFileUpload={handleFileUpload}
                onClearUploadedData={clearUploadedData}
                dataLakeListLoading={dataLakeListLoading}
                dataLakeList={dataLakeList}
                saveToLakeName={saveToLakeName}
                setSaveToLakeName={setSaveToLakeName}
                saveToLakeLoading={saveToLakeLoading}
                saveToLakeDisabled={!(data?.length || uploadedData?.length)}
                onSaveToDataLake={handleSaveToDataLake}
                onDeleteFromDataLake={handleDeleteFromDataLake}
                userDashboards={userDashboards}
                exampleDatasetIds={EXAMPLE_DATASET_IDS}
                uploadDatasetId={UPLOAD_DATASET_ID}
              />
            </div>
            <div
              style={{ display: activeTab === 'preview' ? 'flex' : 'none' }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
              aria-hidden={activeTab !== 'preview'}
            >
              <PreviewView
                spec={spec}
                setSpec={setSpec}
                data={data}
                uploadedData={uploadedData}
                dataByDatasetId={dataByDatasetId}
                defaultDatasetId={datasetId}
                onTabDatasetChange={onTabDatasetChange}
                availableDatasetIds={EXAMPLE_DATASET_IDS}
                schema={schema}
                uploadedSchema={uploadedSchema}
                filterValues={filterValues}
                setFilterValues={setFilterValues}
                loading={loading}
                onLoadSampleData={handleLoadSampleData}
                onUploadClick={focusFileInput}
              />
            </div>
            <div
              style={{ display: activeTab === 'clear' ? 'flex' : 'none' }}
              className="flex-1 flex flex-col min-h-0 overflow-hidden"
              aria-hidden={activeTab !== 'clear'}
            >
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center max-w-md mx-auto">
                <p className="text-gray-600 text-sm">
                  Clear the current report and chat to start over. This can&apos;t be undone.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearSpec()
                    setActiveTab('chat')
                  }}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  Clear dashboard
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      </StudioShell>
    </ErrorBoundary>
  )
}
