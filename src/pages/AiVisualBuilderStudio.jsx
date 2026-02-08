/**
 * AI Visual Builder Studio
 * Select dataset, type natural-language prompt, generate/refine DashboardSpec, preview in renderer.
 * Save/Load spec via localStorage (MVP).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import DashboardRenderer from '../components/aiVisualBuilder/DashboardRenderer'
import ErrorBoundary from '../components/ErrorBoundary'
import ChartTypeIcons from '../components/aiVisualBuilder/ChartTypeIcons'
import FilterTypeIcons from '../components/aiVisualBuilder/FilterTypeIcons'
import { getSuggestedPrompts } from '../studio/utils/datasetPrompts'
import { getDashboard, saveDashboard, listDashboards } from '../studio/api/studioClient'
import { generateShareId, saveSharedDashboard, getShareableUrl, copyToClipboard } from '../utils/shareUtils'
import { normalizeSchema, isDashboardSpec } from '../studio/utils/schemaUtils'
import apiClient from '../config/api'

const STORAGE_KEY_SPEC = 'aiVisualBuilder_spec'
const STORAGE_KEY_DATASET = 'aiVisualBuilder_dataset'
const STORAGE_KEY_FULLSCREEN = 'aiVisualBuilder_fullScreen'
const STORAGE_KEY_PANEL_LAYOUT = 'aiVisualBuilder_panelLayout'
const COLLAPSED_PANEL_WIDTH = 48
const DEFAULT_PANEL_WIDTHS = [22, 32, 46] // left %, center %, right %

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
  'superbowl-winners'
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

export default function AiVisualBuilderStudio() {
  const [datasetId, setDatasetId] = useState(() => localStorage.getItem(STORAGE_KEY_DATASET) || 'sales')
  const [schema, setSchema] = useState(null)
  const [data, setData] = useState(null)
  const [uploadedData, setUploadedData] = useState(null)
  const [uploadedSchema, setUploadedSchema] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
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
      return localStorage.getItem(STORAGE_KEY_FULLSCREEN) === 'true'
    } catch { return false }
  })
  const [panelCollapsed, setPanelCollapsed] = useState({ left: false, center: false, right: false })
  const [styleDockCollapsed, setStyleDockCollapsed] = useState(false)
  const [panelWidths, setPanelWidths] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY_PANEL_LAYOUT)
      if (s) {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed) && parsed.length === 3 && parsed.every((n) => n >= 10 && n <= 60)) {
          return parsed
        }
      }
    } catch (_) {}
    return DEFAULT_PANEL_WIDTHS
  })
  const [resizing, setResizing] = useState(null)
  const containerRef = useRef(null)
  const startXRef = useRef(0)

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const openId = searchParams.get('open')

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
      return
    }
    if (datasetId === UPLOAD_DATASET_ID) {
      setData(uploadedData || null)
      return
    }
    let cancelled = false
    setData(null)
    apiClient
      .get('/api/ai/dataset-data', { params: { dataset: datasetId } })
      .then((res) => {
        if (!cancelled && res.data && res.data.data) setData(res.data.data)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
    return () => { cancelled = true }
  }, [datasetId, uploadedData])

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_FULLSCREEN, String(fullScreen))
    } catch (_) {}
  }, [fullScreen])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PANEL_LAYOUT, JSON.stringify(panelWidths))
    } catch (_) {}
  }, [panelWidths])

  const togglePanel = (panel) => {
    setPanelCollapsed((c) => ({ ...c, [panel]: !c[panel] }))
  }

  /** Expand one panel to take more space (50%), others share the rest */
  const expandPanel = (panel) => {
    setPanelCollapsed((c) => ({ ...c, [panel]: false }))
    if (panel === 'left') setPanelWidths([50, 25, 25])
    else if (panel === 'center') setPanelWidths([25, 50, 25])
    else setPanelWidths([25, 25, 50])
  }

  const resetPanelLayout = () => {
    setPanelCollapsed({ left: false, center: false, right: false })
    setPanelWidths(DEFAULT_PANEL_WIDTHS)
  }

  const startResize = (divider) => (e) => {
    e.preventDefault()
    setResizing(divider)
    startXRef.current = e.clientX
  }

  useEffect(() => {
    if (!resizing || !containerRef.current) return
    document.body.classList.add('select-none')
    document.body.style.cursor = 'col-resize'
    const onMove = (e) => {
      const dx = e.clientX - startXRef.current
      startXRef.current = e.clientX
      const total = containerRef.current?.offsetWidth || 1000
      const deltaPercent = (dx / total) * 100
      setPanelWidths((w) => {
        const next = [...w]
        if (resizing === 'left') {
          next[0] = Math.min(50, Math.max(10, w[0] + deltaPercent))
          next[1] = Math.min(50, Math.max(15, w[1] - deltaPercent))
        } else {
          next[1] = Math.min(50, Math.max(15, w[1] + deltaPercent))
          next[2] = Math.min(60, Math.max(25, w[2] - deltaPercent))
        }
        return next
      })
    }
    const onUp = () => {
      setResizing(null)
      document.body.classList.remove('select-none')
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.classList.remove('select-none')
      document.body.style.cursor = ''
    }
  }, [resizing])

  const handleGenerate = useCallback(async () => {
    const userPrompt = (prompt || '').trim()
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
        setPromptHistory((h) => [...h, { prompt: userPrompt, at: new Date().toISOString() }])
      } else {
        setError('No spec returned.')
      }
    } catch (err) {
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

  const handleSaveDashboard = useCallback(async () => {
    if (!spec) {
      setSaveError('Generate a dashboard first.')
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      const title = dashboardTitle.trim() || 'Untitled Dashboard'
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
      const saved = await saveDashboard(fullSpec, savedDashboardId)
      setSavedDashboardId(saved?.id ?? null)
    } catch (err) {
      setSaveError(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [spec, dashboardTitle, datasetId, savedDashboardId])

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
    const payload = {
      dashboardType: 'dashboardSpec',
      spec,
      datasetId: datasetId || spec.datasetId || 'sales',
      data: data || null
    }
    const shareId = generateShareId()
    const ok = await saveSharedDashboard(shareId, payload)
    if (!ok) {
      setSaveError('Could not create public link.')
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
  }, [spec, datasetId, data])

  const panelLeftW = panelCollapsed.left ? COLLAPSED_PANEL_WIDTH : `${panelWidths[0]}%`
  const panelCenterW = panelCollapsed.center ? COLLAPSED_PANEL_WIDTH : `${panelWidths[1]}%`
  const panelRightW = panelCollapsed.right ? COLLAPSED_PANEL_WIDTH : `${panelWidths[2]}%`

  const wrapperClass = fullScreen
    ? 'fixed inset-0 z-40 bg-gray-50 flex flex-col overflow-hidden'
    : 'min-h-screen bg-gray-50'

  return (
    <div className={wrapperClass}>
      {!fullScreen && <Navbar />}
      {loadedMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in">
          Loaded: {loadedMessage}
        </div>
      )}
      <div className={fullScreen ? 'flex-1 flex flex-col overflow-hidden' : 'max-w-[1920px] mx-auto px-4 py-6'}>
        <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Visual Builder Studio</h1>
            <p className="text-gray-600 text-sm mt-0.5">
              Select a dataset, describe the dashboard in plain language, and refine with follow-up prompts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetPanelLayout}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              title="Reset panel layout"
            >
              Reset layout
            </button>
            <button
              type="button"
              onClick={() => setFullScreen((f) => !f)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              title={fullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {fullScreen ? 'Exit full screen' : 'Full screen'}
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className={`flex min-h-0 ${fullScreen ? 'flex-1 gap-0' : 'gap-4'} overflow-hidden`}
          style={fullScreen ? { height: 'calc(100vh - 120px)' } : { minHeight: 480 }}
        >
          {/* Left panel: dataset + schema */}
          <div
            className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0"
            style={{ width: panelLeftW, minWidth: panelCollapsed.left ? COLLAPSED_PANEL_WIDTH : 160 }}
          >
            <div className="flex items-center border-b border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => togglePanel('left')}
                className="flex-1 flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-100 text-sm font-semibold text-gray-900"
              >
                <span>Dataset &amp; schema</span>
                <span className="text-gray-500" title={panelCollapsed.left ? 'Expand panel' : 'Collapse panel'}>{panelCollapsed.left ? '▶' : '▼'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); expandPanel('left') }}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0"
                title="Expand this panel"
              >
                <span className="text-lg leading-none">⊞</span>
              </button>
            </div>
            {!panelCollapsed.left && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-lg border border-gray-200 p-3 bg-white">
              <h2 className="font-semibold text-gray-900 mb-2">Dataset</h2>
              <select
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select…</option>
                {uploadedData && (
                  <optgroup label="Your upload">
                    <option value={UPLOAD_DATASET_ID}>
                      Your uploaded file{uploadedFileName ? ` (${uploadedFileName})` : ''}
                    </option>
                  </optgroup>
                )}
                <optgroup label="Example datasets">
                  {EXAMPLE_DATASET_IDS.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </optgroup>
                {userDashboards.length > 0 && (
                  <optgroup label="Your dashboards">
                    {userDashboards.map((d) => (
                      <option key={d.id} value={`dashboard:${d.id}`}>
                        {d.name || d.id}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Use your data</h2>
              <p className="text-xs text-gray-500 mb-2">CSV or Excel. Max 500 MB. Schema is inferred from your file.</p>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-700">Upload file</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploadLoading}
                  className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </label>
              {uploadLoading && <p className="mt-1 text-sm text-gray-500">Uploading…</p>}
              {uploadError && (
                <p className="mt-1 text-sm text-red-600">
                  {uploadError}
                  {uploadError.toLowerCase().includes('limit') || uploadError.toLowerCase().includes('size') || uploadError.toLowerCase().includes('too large')
                    ? ' (max 500 MB)'
                    : ''}
                </p>
              )}
              {uploadedData && (
                <p className="mt-2 text-sm text-green-700">
                  {uploadedSchema?.rowCount ?? uploadedData.length} rows loaded. Select &quot;Your uploaded file&quot; above.
                </p>
              )}
              {uploadedData && (
                <button
                  type="button"
                  onClick={clearUploadedData}
                  className="mt-2 text-xs text-gray-500 hover:text-red-600"
                >
                  Clear uploaded data
                </button>
              )}
            </div>
            {schema && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-2">Schema</h2>
                <p className="text-xs text-gray-500 mb-2">{schema.rowCount} rows</p>
                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                  {schema.fields.map((f) => (
                    <li key={f.name} className="flex justify-between gap-2">
                      <span className="font-medium text-gray-700">{f.name}</span>
                      <span className="text-gray-500">{f.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={loadSavedSpec}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Load saved
              </button>
              <button
                type="button"
                onClick={clearSpec}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Clear spec
              </button>
            </div>
            {savedApps.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-2">Your saved dashboards</h2>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {savedApps.map((app) => (
                    <li key={app.id} className="flex items-center gap-2 group">
                      <button
                        type="button"
                        onClick={() => navigate(`/studio?open=${app.id}`)}
                        className="text-left text-sm text-blue-600 hover:underline flex-1 min-w-0 py-1.5 px-2 rounded hover:bg-blue-50 truncate"
                        title={app.name}
                      >
                        {app.name}
                      </button>
                      <a
                        href={`/apps/${app.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-500 hover:text-blue-600 shrink-0 py-1.5 px-2 rounded hover:bg-blue-50"
                        title="View in new tab"
                      >
                        View
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Save & share</h2>
              <label className="block text-xs text-gray-500 mb-1">Dashboard title</label>
              <input
                type="text"
                value={dashboardTitle}
                onChange={(e) => {
                  setDashboardTitle(e.target.value)
                  if (spec) setSpec((s) => (s ? { ...s, title: e.target.value } : null))
                }}
                placeholder="e.g. Sales by Region"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm mb-3"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveDashboard}
                  disabled={saving || !spec}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save dashboard'}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!savedDashboardId}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={savedDashboardId ? 'Copy link to clipboard' : 'Save first to share'}
                >
                  {shareCopied ? 'Copied!' : 'Share link'}
                </button>
                <button
                  type="button"
                  onClick={handleGetPublicLink}
                  disabled={!spec}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Copy view-only link (works without login)"
                >
                  {publicLinkCopied ? 'Copied!' : 'Get public link'}
                </button>
              </div>
              {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
              {savedDashboardId && (
                <p className="mt-2 text-xs text-green-700">Saved. Share link copies the view URL.</p>
              )}
            </div>
              </div>
            )}
          </div>

          {fullScreen && (
            <div
              role="separator"
              aria-label="Resize panels"
              onMouseDown={startResize('left')}
              className={`w-1 flex-shrink-0 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors ${resizing === 'left' ? 'bg-blue-500' : ''}`}
            />
          )}

          {/* Center panel: prompt + history */}
          <div
            className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0"
            style={{ width: panelCenterW, minWidth: panelCollapsed.center ? COLLAPSED_PANEL_WIDTH : 220 }}
          >
            <div className="flex items-center border-b border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => togglePanel('center')}
                className="flex-1 flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-100 text-sm font-semibold text-gray-900"
              >
                <span>Prompt</span>
                <span className="text-gray-500" title={panelCollapsed.center ? 'Expand panel' : 'Collapse panel'}>{panelCollapsed.center ? '▶' : '▼'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); expandPanel('center') }}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0"
                title="Expand this panel"
              >
                <span className="text-lg leading-none">⊞</span>
              </button>
            </div>
            {!panelCollapsed.center && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="rounded-lg border border-gray-200 p-4 bg-white">
              <h2 className="font-semibold text-gray-900 mb-2">Prompt</h2>
              <div className="mb-3">
                <ChartTypeIcons
                  disabled={!datasetId}
                  onSelect={(phrase) => setPrompt((p) => (p ? `${p} ${phrase}` : phrase))}
                />
                <div className="mt-2">
                  <FilterTypeIcons
                    disabled={!datasetId}
                    onSelect={(phrase) => setPrompt((p) => (p ? `${p} ${phrase}` : phrase))}
                  />
                </div>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    if (!loading && prompt.trim() && datasetId) handleGenerate()
                  }
                }}
                placeholder="e.g. Show revenue by month for 2025, add a date range filter, and a bar chart by product top 10"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !prompt.trim() || !datasetId}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {loading ? 'Generating…' : 'Generate'}
              </button>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Suggested prompts</h2>
              <p className="text-xs text-gray-500 mb-2">Based on dataset: {datasetId}</p>
              <ul className="space-y-1">
                {getSuggestedPrompts(datasetId, schema).map((label, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setPrompt(label)}
                      className="text-left text-sm text-blue-600 hover:underline w-full py-1.5 px-2 rounded hover:bg-blue-50 transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {promptHistory.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-2">History</h2>
                <ul className="text-sm space-y-1 max-h-32 overflow-y-auto">
                  {promptHistory.slice().reverse().map((h, i) => (
                    <li key={i} className="text-gray-600 truncate" title={h.prompt}>
                      {h.prompt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
              </div>
            )}
          </div>

          {fullScreen && (
            <div
              role="separator"
              aria-label="Resize panels"
              onMouseDown={startResize('right')}
              className={`w-1 flex-shrink-0 cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors ${resizing === 'right' ? 'bg-blue-500' : ''}`}
            />
          )}

          {/* Right panel: preview */}
          <div
            className="flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 flex-1 min-w-0"
            style={{ width: panelRightW, minWidth: panelCollapsed.right ? COLLAPSED_PANEL_WIDTH : 280 }}
          >
            <div className="flex items-center border-b border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={() => togglePanel('right')}
                className="flex-1 flex items-center justify-between w-full px-4 py-2 text-left hover:bg-gray-100 text-sm font-semibold text-gray-900 min-w-0"
              >
                <span className="truncate">{dashboardTitle || spec?.title || 'Dashboard preview'}</span>
                <span className="text-gray-500 shrink-0 ml-1" title={panelCollapsed.right ? 'Expand panel' : 'Collapse panel'}>{panelCollapsed.right ? '▶' : '▼'}</span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); expandPanel('right') }}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded shrink-0"
                title="Expand this panel"
              >
                <span className="text-lg leading-none">⊞</span>
              </button>
            </div>
            {!panelCollapsed.right && (
              <div className="flex-1 flex min-h-0">
                <div className="flex-1 overflow-y-auto p-4 min-w-0">
              {loading ? (
                <div className="min-h-[200px] flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
                  <p className="mt-4 text-gray-600 text-sm">Generating…</p>
                </div>
              ) : (
                <ErrorBoundary>
                  <DashboardRenderer
                    spec={spec}
                    data={data}
                    filterValues={filterValues}
                    onFilterChange={setFilterValues}
                    onLayoutChange={(newLayout) => setSpec((s) => (s ? { ...s, layout: newLayout } : null))}
                    onRemoveWidget={(id, type) =>
                      setSpec((s) => {
                        if (!s) return s
                        if (type === 'kpi') return { ...s, kpis: (s.kpis || []).filter((k) => k.id !== id) }
                        return { ...s, charts: (s.charts || []).filter((c) => c.id !== id) }
                      })
                    }
                    onChartOptionChange={(chartId, options) =>
                      setSpec((s) =>
                        s
                          ? {
                              ...s,
                              charts: (s.charts || []).map((ch) => (ch.id === chartId ? { ...ch, ...options } : ch))
                            }
                          : null
                      )
                    }
                  />
                </ErrorBoundary>
              )}
                </div>
                <div
                  className={`flex-shrink-0 border-l border-gray-200 bg-gray-50/80 flex flex-col overflow-hidden transition-[width] duration-200 ${styleDockCollapsed ? 'w-10' : 'w-44'}`}
                >
                  <button
                    type="button"
                    onClick={() => setStyleDockCollapsed((v) => !v)}
                    className={`flex items-center border-gray-200 hover:bg-gray-100 min-h-10 ${styleDockCollapsed ? 'justify-center p-2 w-full border-b border-gray-200' : 'justify-between gap-1 p-2 text-left border-b border-gray-200'}`}
                    title={styleDockCollapsed ? 'Expand style panel' : 'Collapse style panel'}
                  >
                    {styleDockCollapsed ? (
                      <span className="text-gray-500 text-xs">▶</span>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Style</span>
                        <span className="text-gray-400 text-xs">◀</span>
                      </>
                    )}
                  </button>
                  {!styleDockCollapsed && (
                    <div className="flex flex-col p-3 gap-4 overflow-y-auto flex-1 min-h-0">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-700">Theme</span>
                        <div className="flex flex-col gap-1">
                          {['light', 'dark', 'executive'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                if (spec) setSpec((s) => ({ ...s, style: { ...(s?.style || {}), theme: t } }))
                              }}
                              className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.theme || 'light') === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                            >
                              {t === 'executive' ? 'Executive' : t}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-700">Bar look</span>
                        <div className="flex flex-col gap-1">
                          {['sheen', 'flat'].map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => {
                                if (spec) setSpec((s) => ({ ...s, style: { ...(s?.style || {}), barStyle: b } }))
                              }}
                              className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.barStyle || 'sheen') === b ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                            >
                              {b}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-700">Palette</span>
                        <div className="flex flex-col gap-1">
                          {['default', 'minimal', 'pastel'].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                if (spec) setSpec((s) => ({ ...s, style: { ...(s?.style || {}), palette: p } }))
                              }}
                              className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.palette || 'default') === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {!fullScreen && <Footer />}
    </div>
  )
}
