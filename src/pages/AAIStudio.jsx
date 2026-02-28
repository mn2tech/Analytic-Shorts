import { useCallback, useEffect, useMemo, useRef, useState, Component } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import apiClient from '../config/api'
import { getDashboard } from '../services/dashboardService'
import { templates as studioTemplates, TEMPLATE_IDS } from '../config/studioTemplates'
import { getFirstCatalogIdForEngineId } from '../studio/templatesCatalog'
import StudioThemeProvider from '../components/aaiStudio/StudioThemeProvider'
import AAIStudioBlockRenderer from '../components/aaiStudio/AAIStudioBlockRenderer'
import GlobalFilterBar from '../components/aaiStudio/GlobalFilterBar'
import AnalystInsightsPanel from '../components/aaiStudio/AnalystInsightsPanel'
import AgencyReportView from '../components/aaiStudio/AgencyReportView'
import TemplateGallery from '../components/aaiStudio/TemplateGallery'
import TemplatePreviewPanel from '../components/aaiStudio/TemplatePreviewPanel'
import { KPIRowSkeleton } from '../components/aaiStudio/CardSkeleton'
import { parseCommand, applyCommand, HELP_LINES } from '../lib/studioCommands'
import { evidenceToBlocks } from '../utils/evidenceToBlocks'

/** Catches any render error in Studio so the page never goes completely white. */
class StudioPageErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  componentDidCatch(err, info) {
    if (typeof console !== 'undefined') console.error('[AAIStudio] Page error:', err, info?.componentStack)
  }
  render() {
    if (this.state.hasError) {
      const err = this.state.error
      const message = err?.message || 'Something went wrong while rendering. Try reloading the page.'
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
            <h1 className="text-lg font-semibold text-gray-900 mb-2">Studio failed to load</h1>
            <p className="text-sm text-gray-600 mb-2">{message}</p>
            {err?.stack && (
              <pre className="text-left text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded overflow-auto max-h-32 mb-4">
                {err.stack.split('\n').slice(0, 8).join('\n')}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function BlockCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function KeyValueTable({ rows, onSelectKey, selectedKey }) {
  const safe = Array.isArray(rows) ? rows : []
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="py-2 pr-4">Key</th>
            <th className="py-2 pr-4">Value</th>
          </tr>
        </thead>
        <tbody>
          {safe.map((r) => {
            const k = String(r.key ?? '')
            const isSel = selectedKey != null && String(selectedKey) === k
            return (
              <tr
                key={k}
                className={`border-t ${onSelectKey ? 'cursor-pointer hover:bg-gray-50' : ''} ${isSel ? 'bg-blue-50' : ''}`}
                onClick={() => onSelectKey && onSelectKey(k)}
              >
                <td className="py-2 pr-4 font-medium text-gray-900">{k}</td>
                <td className="py-2 pr-4 text-gray-700">{Number.isFinite(r.value) ? r.value : String(r.value ?? '')}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Turn a block payload into { columns, rows } for the data panel table. */
function getBlockTableData(block) {
  if (!block?.payload) return null
  const p = block.payload
  // Rows (TopN, Breakdown, Geo, Driver, etc.)
  const rows = Array.isArray(p.rows) ? p.rows : []
  if (rows.length > 0) {
    const first = rows[0]
    const cols = typeof first === 'object' && first !== null ? Object.keys(first) : ['key', 'value']
    return { columns: cols, rows: rows.map((r) => (typeof r === 'object' && r !== null ? r : { key: String(r), value: '' })) }
  }
  // Time series
  const series = Array.isArray(p.series) ? p.series : []
  if (series.length > 0) {
    const flat = []
    for (const s of series) {
      const name = s.name ?? s.id ?? 'Series'
      const data = Array.isArray(s.data) ? s.data : []
      for (const d of data) {
        flat.push({
          Series: name,
          Period: d.x ?? d.period ?? d.date ?? '—',
          Value: d.y ?? d.value ?? '—',
        })
      }
    }
    return flat.length ? { columns: ['Series', 'Period', 'Value'], rows: flat } : null
  }
  // ComparePeriods contributions
  const contrib = p.contributions && typeof p.contributions === 'object' ? p.contributions : null
  if (contrib && Object.keys(contrib).length > 0) {
    const rows = Object.entries(contrib).map(([label, value]) => ({ Label: label, Value: value }))
    return { columns: ['Label', 'Value'], rows }
  }
  // KPI summary as key-value
  if (block.type === 'KPIBlock' && (p.executiveKpis || p.rowCount != null)) {
    const rows = []
    if (p.executiveKpis?.latest != null) rows.push({ Metric: 'Latest value', Value: p.executiveKpis.latest.value ?? p.executiveKpis.latest.period })
    if (p.executiveKpis?.change != null) {
      const pct = Number(p.executiveKpis.change.pct)
      rows.push({ Metric: 'Change', Value: Number.isFinite(pct) ? `${p.executiveKpis.change.abs} (${(pct * 100).toFixed(1)}%)` : p.executiveKpis.change.abs })
    }
    if (p.rowCount != null) rows.push({ Metric: 'Row count', Value: p.rowCount })
    if (rows.length) return { columns: ['Metric', 'Value'], rows }
  }
  return null
}

/** Bottom panel: table of data for the selected graph. */
function StudioDataPanel({ selectedBlock, style: styleProp }) {
  const table = selectedBlock ? getBlockTableData(selectedBlock) : null
  return (
    <div
      className="border-t flex flex-col shrink-0"
      style={{ borderColor: 'var(--border)', background: 'var(--card)', ...styleProp }}
    >
      <div className="px-4 py-2 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
          {selectedBlock ? `Data: ${selectedBlock.title || selectedBlock.type}` : 'Data'}
        </span>
        {!selectedBlock && (
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Click a graph above to view its data</span>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {!selectedBlock && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Select a chart or table to see the underlying data here.</p>
        )}
        {selectedBlock && !table && (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>No tabular data for this block.</p>
        )}
        {table && (
          <div className="overflow-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--card-2)', color: 'var(--text)' }}>
                  {table.columns.map((c) => (
                    <th key={c} className="text-left py-2 px-3 font-medium whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    {table.columns.map((col) => (
                      <td key={col} className="py-1.5 px-3" style={{ color: 'var(--text)' }}>
                        {row[col] != null ? (Number.isFinite(row[col]) ? row[col] : String(row[col])) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }) {
  const s = String(status || '')
  const cls =
    s === 'OK'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : s === 'NOT_APPLICABLE'
        ? 'bg-gray-50 text-gray-700 border-gray-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
  return <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>{s || '—'}</span>
}

function TrustBadge({ badge }) {
  const b = badge || {}
  const s = String(b.status || '')
  const cls = s === 'OK' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${cls}`} title={b.id || ''}>
      {b.label || '—'}
    </span>
  )
}

export default function AAIStudio() {
  const [datasets, setDatasets] = useState([])
  const [datasetsLoading, setDatasetsLoading] = useState(false)
  const [sourceType, setSourceType] = useState('dataset') // dataset|api|samgov|db|csv
  const [datasetId, setDatasetId] = useState('sales')
  const [customApiUrl, setCustomApiUrl] = useState('')
  const [samgovLimit, setSamgovLimit] = useState('200')
  const [samgovPtype, setSamgovPtype] = useState('o')
  const [dbTable, setDbTable] = useState('')
  const [dbLimit, setDbLimit] = useState('5000')
  const [lakeList, setLakeList] = useState([])
  const [lakeLoading, setLakeLoading] = useState(false)
  const [lakeId, setLakeId] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [runId, setRunId] = useState(null)
  const [runDate, setRunDate] = useState(null)
  const [datasetProfile, setDatasetProfile] = useState(null)
  const [semanticGraph, setSemanticGraph] = useState(null)
  const [insightBlocks, setInsightBlocks] = useState([])
  const [evidence, setEvidence] = useState(null)
  const [narrative, setNarrative] = useState(null)
  const [sceneGraph, setSceneGraph] = useState(null)
  const [templateFromRun, setTemplateFromRun] = useState(null)

  // Global filters -> sent to backend to rebuild (cached connectors make this fast)
  const [filters, setFilters] = useState({ eq: {}, timeRange: null, search: '' })
  const searchValue = filters.search ?? ''
  const [templateId, setTemplateId] = useState('general')
  const [selectedTemplateId, setSelectedTemplateId] = useState('general')
  const [isStudioSidebarOpen, setIsStudioSidebarOpen] = useState(true)
  const uploadSectionRef = useRef(null)
  const [runConfigOverrides, setRunConfigOverrides] = useState({})
  const [commandInput, setCommandInput] = useState('')
  const [commandMessage, setCommandMessage] = useState(null)
  const [showCommandHelp, setShowCommandHelp] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState(null)
  const [savedDashboardId, setSavedDashboardId] = useState(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [dashboardName, setDashboardName] = useState('')
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfForm, setPdfForm] = useState({ clientName: '', reportTitle: 'Analytics Report', dateRange: '', agencyName: 'NM2TECH', agencyLogoUrl: '' })
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState(null)
  const [reportMode, setReportMode] = useState('analyst') // 'analyst' | 'agency'
  const [narrativeMode, setNarrativeMode] = useState(null) // 'analyst' | 'agency' when narrative was fetched for that mode
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const openDashboardId = searchParams.get('open')

  const trackEvent = useCallback((name, payload = {}) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studio:track', { detail: { name, ...payload } }))
    }
    if (typeof console !== 'undefined') console.debug('[AAIStudio event]', name, payload)
  }, [])

  useEffect(() => {
    setDatasetsLoading(true)
    apiClient
      .get('/api/studio/datasets')
      .then((res) => setDatasets(Array.isArray(res.data?.datasets) ? res.data.datasets : []))
      .catch(() => setDatasets([]))
      .finally(() => setDatasetsLoading(false))
  }, [])

  useEffect(() => {
    setSelectedTemplateId(getFirstCatalogIdForEngineId(templateId))
  }, [templateId])

  // Load saved dashboard when opening from My Dashboards (?open=:id)
  useEffect(() => {
    if (!openDashboardId) return
    let cancelled = false
    getDashboard(openDashboardId)
      .then((dashboard) => {
        if (cancelled || !dashboard) return
        let schema = dashboard.schema
        if (typeof schema === 'string') {
          try {
            schema = JSON.parse(schema)
          } catch {
            schema = null
          }
        }
        if (!schema || schema.type !== 'aaiStudioRun') return
        setRunId(schema.runId ?? null)
        setRunDate(schema.runId ? new Date() : null)
        setInsightBlocks(Array.isArray(schema.insightBlocks) ? schema.insightBlocks : [])
        setEvidence(schema.evidence ?? null)
        setSceneGraph(schema.sceneGraph ?? null)
        setTemplateId(schema.templateId || 'general')
        setReportMode(schema.reportMode === 'agency' ? 'agency' : 'analyst')
        setTemplateFromRun(schema.templateId ? { id: schema.templateId, name: studioTemplates[schema.templateId]?.name ?? schema.templateId } : null)
        setDatasetProfile(schema.datasetProfile ?? null)
        setFilters(schema.filters && typeof schema.filters === 'object' ? { eq: schema.filters.eq || {}, timeRange: schema.filters.timeRange ?? null, search: schema.filters.search ?? '' } : { eq: {}, timeRange: null, search: '' })
        setSavedDashboardId(dashboard.id)
        setDashboardName(dashboard.name || studioTemplates[schema.templateId]?.name || '')
        const sc = schema.sourceConfig
        if (sc && typeof sc === 'object') {
          if (sc.sourceType === 'api' && sc.url) {
            setSourceType('api')
            setCustomApiUrl(sc.url)
          } else if (sc.sourceType === 'samgov') {
            setSourceType('samgov')
            if (sc.query) {
              if (sc.query.limit != null) setSamgovLimit(String(sc.query.limit))
              if (sc.query.ptype != null) setSamgovPtype(String(sc.query.ptype))
            }
          } else if (sc.sourceType === 'db') {
            setSourceType('db')
            if (sc.table != null) setDbTable(String(sc.table))
            if (sc.limit != null) setDbLimit(String(sc.limit))
          } else if (sc.sourceType === 'csv' && sc.datasetId) {
            const id = String(sc.datasetId).replace(/^datalake:/, '')
            setSourceType('csv')
            setLakeId(id)
          } else if (sc.datasetId) {
            setSourceType('dataset')
            setDatasetId(sc.datasetId)
          }
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load dashboard for open=', openDashboardId, err)
      })
    return () => { cancelled = true }
  }, [openDashboardId])

  const sourceConfig = useMemo(() => {
    if (sourceType === 'api') {
      const url = customApiUrl.trim()
      return { sourceType: 'api', url, method: 'GET' }
    }
    if (sourceType === 'samgov') {
      const limit = Math.min(Math.max(parseInt(samgovLimit, 10) || 200, 1), 1000)
      const ptype = String(samgovPtype || '').trim() || 'o'
      return { sourceType: 'samgov', path: '/api/example/samgov/live', query: { limit, ptype } }
    }
    if (sourceType === 'db') {
      const table = String(dbTable || '').trim()
      const limit = Math.min(Math.max(parseInt(dbLimit, 10) || 5000, 1), 50000)
      return { sourceType: 'db', table, limit }
    }
    if (sourceType === 'csv') {
      const id = String(lakeId || '').trim()
      return { sourceType: 'csv', datasetId: id ? `datalake:${id}` : '' }
    }
    // dataset: internal registry (example + datasets + datalake fallback)
    if (datasetId && datasetId.startsWith('samgov/')) {
      return { sourceType: 'samgov', path: `/api/example/${datasetId}` }
    }
    return { datasetId }
  }, [sourceType, customApiUrl, samgovLimit, samgovPtype, dbTable, dbLimit, lakeId, datasetId])

  /** Trim schema for storage so it fits DB/body limits (cap block rows, shrink profile). */
  const buildSaveSchema = useCallback(() => {
    const MAX_ROWS_PER_BLOCK = 300
    const trimmedBlocks = (insightBlocks || []).map((b) => {
      if (!b?.payload) return b
      const p = { ...b.payload }
      if (Array.isArray(p.rows) && p.rows.length > MAX_ROWS_PER_BLOCK) {
        p.rows = p.rows.slice(0, MAX_ROWS_PER_BLOCK)
      }
      return { ...b, payload: p }
    })
    return {
      type: 'aaiStudioRun',
      runId,
      sourceConfig,
      templateId,
      insightBlocks: trimmedBlocks,
      evidence: evidence || null,
      sceneGraph,
      datasetProfile: datasetProfile ? { schema: datasetProfile.schema } : null,
      filters,
      reportMode: reportMode || 'analyst',
    }
  }, [runId, insightBlocks, evidence, sceneGraph, sourceConfig, templateId, datasetProfile, filters, reportMode])

  const doBuild = useCallback(
    async (nextFilters = filters, nextOverrides = runConfigOverrides) => {
      setLoading(true)
      setError(null)
      try {
        const effectiveTemplateId = (nextOverrides?.templateId != null && nextOverrides.templateId !== '') ? nextOverrides.templateId : (templateId || 'general')
        const res = await apiClient.post('/api/studio/build', {
          sourceConfig,
          templateId: effectiveTemplateId,
          filters: nextFilters,
          overrides: nextOverrides && Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
        })
        setRunId(res.data?.runId || null)
        setRunDate(res.data?.runId ? new Date() : null)
        setDatasetProfile(res.data?.datasetProfile || null)
        setSemanticGraph(res.data?.semanticGraph || null)
        setInsightBlocks(Array.isArray(res.data?.insightBlocks) ? res.data.insightBlocks : [])
        setEvidence(res.data?.evidence ?? null)
        setNarrative(null)
        setSceneGraph(res.data?.sceneGraph || null)
        const template = res.data?.template
        setTemplateFromRun(template ? { id: template.id, name: template.name } : null)
        setDashboardName((prev) => (prev && prev.trim() ? prev : (template?.name || studioTemplates[effectiveTemplateId]?.name || 'Studio dashboard')))
      } catch (e) {
        setError(e.response?.data?.message || e.response?.data?.error || e.message || 'Build failed')
      } finally {
        setLoading(false)
      }
    },
    [sourceConfig, filters, templateId, runConfigOverrides]
  )

  const handleCommandSubmit = useCallback(() => {
    const raw = String(commandInput || '').trim()
    setCommandMessage(null)
    if (!raw) return
    if (loading) {
      setCommandMessage({ type: 'error', text: 'Please wait for the current build to finish.' })
      return
    }
    const ast = parseCommand(raw)
    const result = applyCommand(runConfigOverrides, ast)
    if (result.error) {
      setCommandMessage({ type: 'error', text: result.error })
      return
    }
    if (result.helpText) {
      setCommandMessage({ type: 'help', text: result.helpText })
      setShowCommandHelp(true)
      return
    }
    if (result.overrides) {
      setRunConfigOverrides(result.overrides)
      setCommandInput('')
      if (result.overrides.templateId) setTemplateId(result.overrides.templateId)
      setCommandMessage({ type: 'success', text: 'Applied. Rebuilding…' })
      doBuild(filters, result.overrides)
      setTimeout(() => setCommandMessage(null), 3000)
    }
  }, [commandInput, runConfigOverrides, filters, doBuild, loading])

  // Clear saved state when run changes (new build)
  useEffect(() => {
    setSavedDashboardId(null)
  }, [runId])

  // Reset narrative mode when evidence changes so agency narrative refetches for new data
  useEffect(() => {
    setNarrativeMode(null)
  }, [evidence])

  // When agency mode and evidence exists, ensure narrative is fetched for agency tone
  useEffect(() => {
    if (reportMode !== 'agency' || !evidence || typeof evidence !== 'object') return
    if (narrative && narrativeMode === 'agency') return
    let cancelled = false
    setNarrativeLoading(true)
    apiClient
      .post('/api/insights', { evidence, mode: 'agency' })
      .then((res) => {
        if (cancelled || !res?.data) return
        setNarrative({
          executiveSummary: res.data.executiveSummary ?? '',
          topInsights: Array.isArray(res.data.topInsights) ? res.data.topInsights : [],
          suggestedQuestions: Array.isArray(res.data.suggestedQuestions) ? res.data.suggestedQuestions : [],
        })
        setNarrativeMode('agency')
      })
      .catch(() => { if (!cancelled) setNarrativeMode(null) })
      .finally(() => { if (!cancelled) setNarrativeLoading(false) })
    return () => { cancelled = true }
  }, [reportMode, evidence, narrativeMode])

  const saveDashboardPrivate = useCallback(async () => {
    if (!runId || !insightBlocks?.length) {
      setSaveError('Build a dashboard first (choose data source and click Build).')
      return
    }
    setSaveLoading(true)
    setSaveError(null)
    try {
      const name = templateId === 'govcon' ? 'SAM Opportunities – Executive Intelligence' : (templateFromRun?.name || studioTemplates[templateId]?.name || 'Studio dashboard')
      const { data } = await apiClient.post('/api/dashboards', {
        name: name || 'Studio dashboard',
        data: [],
        columns: [],
        numericColumns: [],
        categoricalColumns: [],
        dateColumns: [],
        dashboardView: 'studio',
        schema: buildSaveSchema(),
      })
      const id = data?.id
      if (id) {
        setSavedDashboardId(id)
      } else {
        setSaveError('Save succeeded but no dashboard id returned.')
      }
    } catch (err) {
      console.error('Save dashboard failed:', err?.response?.data || err)
      const status = err.response?.status
      const data = err.response?.data || {}
      let msg = data.message || data.error || err.message || 'Save failed'
      if (status === 401) msg = 'Sign in to save dashboards.'
      else if (status === 403) msg = data.message || 'Dashboard limit reached. Upgrade or delete an existing dashboard.'
      else if (status === 400 && data.message) msg = data.message
      else if (data.details) msg = `${msg}: ${data.details}`
      setSaveError(msg)
    } finally {
      setSaveLoading(false)
    }
  }, [runId, insightBlocks, templateId, templateFromRun, studioTemplates, buildSaveSchema, dashboardName])

  const openPdfModal = useCallback(() => {
    let dateRange = ''
    if (filters?.timeRange?.start && filters?.timeRange?.end) {
      dateRange = `${String(filters.timeRange.start).slice(0, 10)} – ${String(filters.timeRange.end).slice(0, 10)}`
    } else if (evidence?.trends?.[0]?.series?.length) {
      const s = evidence.trends[0].series
      const first = s[0]?.t ?? s[0]?.period
      const last = s[s.length - 1]?.t ?? s[s.length - 1]?.period
      if (first && last) dateRange = `${String(first).slice(0, 10)} – ${String(last).slice(0, 10)}`
    }
    setPdfForm((prev) => ({ ...prev, dateRange, reportTitle: prev.reportTitle || templateFromRun?.name || 'Analytics Report' }))
    setPdfError(null)
    setPdfLoading(false)
    setShowPdfModal(true)
  }, [filters, evidence, templateFromRun])

  const generatePdf = useCallback(async () => {
    if (!evidence || typeof evidence !== 'object') {
      setPdfError('Build a report first (evidence is required).')
      return
    }
    setPdfLoading(true)
    setPdfError(null)
    try {
      let narrative = { executiveSummary: '', topInsights: [], suggestedQuestions: [] }
      try {
        const insightRes = await apiClient.post('/api/insights', { evidence, mode: reportMode })
        if (insightRes.data && typeof insightRes.data === 'object') {
          narrative = {
            executiveSummary: insightRes.data.executiveSummary ?? narrative.executiveSummary,
            topInsights: Array.isArray(insightRes.data.topInsights) ? insightRes.data.topInsights : narrative.topInsights,
            suggestedQuestions: Array.isArray(insightRes.data.suggestedQuestions) ? insightRes.data.suggestedQuestions : narrative.suggestedQuestions,
          }
        }
      } catch (_) {
        // use defaults
      }
      const branding = {
        agencyName: pdfForm.agencyName?.trim() || 'NM2TECH',
        agencyTagline: undefined,
        agencyLogoUrl: pdfForm.agencyLogoUrl?.trim() || undefined,
      }
      const reportMeta = {
        clientName: pdfForm.clientName?.trim() || undefined,
        reportTitle: pdfForm.reportTitle?.trim() || 'Analytics Report',
        dateRange: pdfForm.dateRange?.trim() || undefined,
      }
      const res = await apiClient.post('/api/studio/pdf', { mode: reportMode, evidence, narrative, branding, reportMeta }, { responseType: 'blob', timeout: 120000 })
      const blob = res.data
      if (res.status !== 200 || !(blob instanceof Blob)) {
        const text = typeof blob?.text === 'function' ? await blob.text() : String(blob)
        let msg = 'PDF export failed'
        try {
          const j = JSON.parse(text)
          msg = j.message || j.error || msg
        } catch (_) {}
        setPdfError(msg)
        return
      }
      // Avoid saving a non-PDF (e.g. JSON error) as .pdf so the viewer doesn't show "Failed to load PDF document"
      if (blob.size === 0) {
        setPdfError('The server returned an empty file. Try "Download HTML" then Print → Save as PDF.')
        return
      }
      const contentType = (res.headers && res.headers['content-type']) || ''
      if (blob.type === 'application/json' || (contentType && contentType.toLowerCase().includes('application/json'))) {
        try {
          const text = await blob.text()
          const j = JSON.parse(text)
          setPdfError(j.message || j.error || 'PDF export failed.')
          return
        } catch (_) {}
      }
      // Ensure the file is actually a PDF (magic bytes) so we never save a corrupt/non-PDF file
      const pdfMagic = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-
      const head = await blob.slice(0, 5).arrayBuffer().then(ab => new Uint8Array(ab))
      const isPdf = head.length >= 5 && pdfMagic.every((b, i) => head[i] === b)
      if (!isPdf) {
        try {
          const text = await blob.text()
          const j = JSON.parse(text)
          // Recovery path: some servers stringify Uint8Array as {"0":37,"1":80,...}
          // Convert numeric-key object back to bytes and proceed if it is a real PDF.
          const numericKeys = j && typeof j === 'object'
            ? Object.keys(j).filter((k) => /^\d+$/.test(k)).map((k) => Number(k)).sort((a, b) => a - b)
            : []
          if (numericKeys.length > 0) {
            const recovered = new Uint8Array(numericKeys.length)
            for (let i = 0; i < numericKeys.length; i++) recovered[i] = Number(j[numericKeys[i]]) || 0
            const looksPdf = recovered.length >= 5 && pdfMagic.every((b, i) => recovered[i] === b)
            if (looksPdf) {
              const recoveredBlob = new Blob([recovered], { type: 'application/pdf' })
              const recoveredUrl = URL.createObjectURL(recoveredBlob)
              const recoveredA = document.createElement('a')
              recoveredA.href = recoveredUrl
              recoveredA.download = 'agency-report.pdf'
              document.body.appendChild(recoveredA)
              recoveredA.click()
              document.body.removeChild(recoveredA)
              URL.revokeObjectURL(recoveredUrl)
              setShowPdfModal(false)
              return
            }
          }
          setPdfError(j.message || j.error || 'The server did not return a valid PDF.')
        } catch (_) {
          setPdfError('The server returned an invalid or corrupt file. Use "Download HTML" then Print → Save as PDF.')
        }
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'agency-report.pdf'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowPdfModal(false)
    } catch (err) {
      let msg = 'PDF export failed'
      const data = err.response?.data
      if (data && typeof data.text === 'function') {
        try {
          const text = await data.text()
          const j = JSON.parse(text)
          msg = j.message || j.error || msg
        } catch (_) {}
      }
      if (!msg || msg === 'PDF export failed') {
        msg = err.response?.data?.message || err.response?.data?.error || err.message || msg
      }
      if (err.response?.status === 503) {
        msg = `${msg} Use "Download HTML" below, then open the file and choose Print → Save as PDF.`
      }
      console.error('[PDF export]', err)
      setPdfError(msg)
    } finally {
      setPdfLoading(false)
    }
  }, [evidence, pdfForm, reportMode])

  const generateHtmlExport = useCallback(async () => {
    if (!evidence || typeof evidence !== 'object') {
      setPdfError('Build a report first (evidence is required).')
      return
    }
    setPdfLoading(true)
    setPdfError(null)
    try {
      let narrative = { executiveSummary: '', topInsights: [], suggestedQuestions: [] }
      try {
        const insightRes = await apiClient.post('/api/insights', { evidence, mode: reportMode })
        if (insightRes.data && typeof insightRes.data === 'object') {
          narrative = {
            executiveSummary: insightRes.data.executiveSummary ?? narrative.executiveSummary,
            topInsights: Array.isArray(insightRes.data.topInsights) ? insightRes.data.topInsights : narrative.topInsights,
            suggestedQuestions: Array.isArray(insightRes.data.suggestedQuestions) ? insightRes.data.suggestedQuestions : narrative.suggestedQuestions,
          }
        }
      } catch (_) {
        // use defaults
      }
      const branding = {
        agencyName: pdfForm.agencyName?.trim() || 'NM2TECH',
        agencyTagline: undefined,
        agencyLogoUrl: pdfForm.agencyLogoUrl?.trim() || undefined,
      }
      const reportMeta = {
        clientName: pdfForm.clientName?.trim() || undefined,
        reportTitle: pdfForm.reportTitle?.trim() || 'Analytics Report',
        dateRange: pdfForm.dateRange?.trim() || undefined,
      }
      const res = await apiClient.post('/api/studio/pdf?format=html', { mode: reportMode, evidence, narrative, branding, reportMeta }, { responseType: 'blob', timeout: 60000 })
      const blob = res.data
      if (res.status !== 200 || !(blob instanceof Blob)) {
        const text = typeof blob?.text === 'function' ? await blob.text() : String(blob)
        let msg = 'HTML export failed'
        try {
          const j = JSON.parse(text)
          msg = j.message || j.error || msg
        } catch (_) {}
        setPdfError(msg)
        return
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'agency-report.html'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowPdfModal(false)
    } catch (err) {
      let msg = err.response?.data?.message || err.response?.data?.error || err.message || 'HTML export failed'
      if (err.response?.data && typeof err.response.data.text === 'function') {
        try {
          const text = await err.response.data.text()
          const j = JSON.parse(text)
          msg = j.message || j.error || msg
        } catch (_) {}
      }
      setPdfError(msg)
    } finally {
      setPdfLoading(false)
    }
  }, [evidence, pdfForm, reportMode])

  const shareToFeed = useCallback(async () => {
    if (!runId || !insightBlocks?.length) return
    let id = savedDashboardId
    if (!id) {
      setSaveLoading(true)
      setSaveError(null)
      try {
        const name = (dashboardName && dashboardName.trim()) || (templateId === 'govcon' ? 'SAM Opportunities – Executive Intelligence' : (templateFromRun?.name || studioTemplates[templateId]?.name || 'Studio dashboard'))
        const { data } = await apiClient.post('/api/dashboards', {
          name: name || 'Studio dashboard',
          data: [],
          columns: [],
          numericColumns: [],
          categoricalColumns: [],
          dateColumns: [],
          dashboardView: 'studio',
          schema: buildSaveSchema(),
        })
        id = data?.id
        if (id) setSavedDashboardId(id)
        else setSaveError('Save succeeded but no dashboard id returned.')
      } catch (err) {
        console.error('Save dashboard failed:', err)
        setSaveError(err.response?.data?.message || err.response?.data?.error || err.message || 'Save failed')
        return
      } finally {
        setSaveLoading(false)
      }
    }
    if (id) navigate(`/publish/${id}`)
  }, [runId, insightBlocks, savedDashboardId, navigate, templateId, templateFromRun, studioTemplates, buildSaveSchema, dashboardName])

  const handleCsvUploadToLake = useCallback(
    async (file) => {
      if (!file) return
      setUploadLoading(true)
      setUploadError(null)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const uploadRes = await apiClient.post('/api/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        })
        const payload = uploadRes.data || {}
        const rows = Array.isArray(payload.data) ? payload.data : []
        if (rows.length === 0) throw new Error('Upload returned no rows')

        const name = file.name || 'dataset'
        const lakeRes = await apiClient.post('/api/datalake', {
          name,
          data: rows,
          columns: payload.columns || Object.keys(rows[0] || {}),
          numericColumns: payload.numericColumns || [],
          categoricalColumns: payload.categoricalColumns || [],
          dateColumns: payload.dateColumns || [],
        })

        const newId = lakeRes.data?.id
        if (!newId) throw new Error('Data Lake did not return a dataset id')
        // Refresh list and select
        const listRes = await apiClient.get('/api/datalake')
        setLakeList(Array.isArray(listRes.data?.datasets) ? listRes.data.datasets : [])
        setSourceType('csv')
        setLakeId(newId)
      } catch (e) {
        setUploadError(e.response?.data?.message || e.response?.data?.error || e.message || 'Upload failed')
      } finally {
        setUploadLoading(false)
      }
    },
    [setSourceType]
  )

  const displayBlocks = useMemo(() => {
    const raw = insightBlocks || []
    if (!evidence) return raw
    try {
      const fromEvidence = evidenceToBlocks(evidence)
      const evidenceIds = new Set(fromEvidence.map((b) => b.id))
      const rest = raw.filter((b) => b && !evidenceIds.has(b.id))
      return [...fromEvidence, ...rest]
    } catch (e) {
      if (typeof console !== 'undefined') console.warn('[AAIStudio] evidenceToBlocks failed, using insightBlocks only:', e?.message || e)
      return raw
    }
  }, [evidence, insightBlocks])

  const orderedBlocks = useMemo(() => {
    const byId = new Map((displayBlocks || []).map((b) => [b.id, b]))
    const nodes = Array.isArray(sceneGraph?.nodes) ? sceneGraph.nodes : []
    const pages = Array.isArray(sceneGraph?.pages) ? sceneGraph.pages : null
    const nodeOrder = (nodeIds) =>
      (nodeIds || [])
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean)
        .map((n) => byId.get(n.blockId))
        .filter(Boolean)

    if (nodes.length && pages && pages.length) {
      const overview = pages.find((p) => p.id === 'overview') || pages[0]
      return nodeOrder(overview.nodeIds)
    }
    if (nodes.length) {
      return nodes.slice().sort((a, b) => (a.layout?.order ?? 0) - (b.layout?.order ?? 0)).map((n) => byId.get(n.blockId)).filter(Boolean)
    }
    return (displayBlocks || []).slice()
  }, [displayBlocks, sceneGraph])

  const pages = useMemo(() => (Array.isArray(sceneGraph?.pages) ? sceneGraph.pages : null), [sceneGraph])
  const [activePageId, setActivePageId] = useState('overview')
  useEffect(() => {
    if (!pages || pages.length === 0) return
    const hasOverview = pages.some((p) => p.id === 'overview')
    setActivePageId((current) => {
      const next = hasOverview ? 'overview' : pages[0].id
      return pages.some((p) => p.id === current) ? current : next
    })
  }, [runId, pages])

  const blocksForActivePage = useMemo(() => {
    if (!pages || pages.length === 0) return orderedBlocks
    const byId = new Map((displayBlocks || []).map((b) => [b.id, b]))
    const nodes = Array.isArray(sceneGraph?.nodes) ? sceneGraph.nodes : []
    const page = pages.find((p) => p.id === activePageId) || pages[0]
    const out = []
    for (const nid of page.nodeIds || []) {
      const node = nodes.find((n) => n.id === nid)
      const block = node ? byId.get(node.blockId) : null
      if (block) out.push(block)
    }
    return out
  }, [pages, activePageId, displayBlocks, sceneGraph, orderedBlocks])

  const topNDimension = useMemo(() => {
    const topn = (displayBlocks || []).find((b) => b.type === 'TopNBlock')
    return topn?.payload?.dimension || null
  }, [displayBlocks])

  const timeRangeColumn = useMemo(() => {
    const f = Array.isArray(sceneGraph?.filters) ? sceneGraph.filters.find((x) => x.id === 'time_range') : null
    return f?.column || null
  }, [sceneGraph])

  const dateExtent = useMemo(() => {
    const trend = (displayBlocks || []).find((b) => b?.type === 'TrendBlock')
    const series = trend?.payload?.series ?? []
    const periods = series.map((s) => s?.t).filter(Boolean)
    if (periods.length < 2) return null
    const sorted = [...periods].sort()
    return { min: sorted[0], max: sorted[sorted.length - 1] }
  }, [displayBlocks])

  const setEqFilter = useCallback(
    (col, value) => {
      const next = {
        ...filters,
        eq: { ...(filters.eq || {}) },
      }
      if (!value || value === '(missing)' || value === '(blank)') {
        delete next.eq[col]
      } else if (next.eq[col] === value) {
        delete next.eq[col]
      } else {
        next.eq[col] = value
      }
      setFilters(next)
      doBuild(next)
    },
    [filters, doBuild]
  )

  const clearFilters = useCallback(() => {
    const next = { eq: {}, timeRange: null, search: '' }
    setFilters(next)
    doBuild(next)
  }, [doBuild])

  const dimensionFilters = useMemo(() => {
    const blocks = displayBlocks || []
    const dims = []
    const seen = new Set()
    for (const b of blocks) {
      const dim = b?.payload?.dimension
      if (!dim || seen.has(dim)) continue
      const rows = Array.isArray(b?.payload?.rows) ? b.payload.rows : []
      const options = rows.map((r) => (typeof r === 'object' ? r.key : r)).filter((v) => v != null && String(v).trim() !== '')
      seen.add(dim)
      dims.push({
        id: dim,
        label: dim,
        value: filters.eq?.[dim] ?? null,
        options: [...new Set(options)].slice(0, 50),
        onChange: (v) => setEqFilter(dim, v),
      })
    }
    return dims
  }, [displayBlocks, filters.eq, setEqFilter])

  const setTimeRangeFilter = useCallback(
    (timeRange) => {
      const next = { ...filters, timeRange: timeRange || null }
      setFilters(next)
      doBuild(next)
    },
    [filters, doBuild]
  )

  const searchDebounceRef = useRef(null)
  const onSearchChange = useCallback(
    (v) => {
      const next = { ...filters, search: v ?? '' }
      setFilters(next)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        doBuild(next, runConfigOverrides)
        searchDebounceRef.current = null
      }, 400)
    },
    [filters, doBuild, runConfigOverrides]
  )

  const executiveConfidence = useMemo(() => {
    const blocks = insightBlocks || []
    for (const b of blocks) {
      const badges = Array.isArray(b?.badges) ? b.badges : []
      const ok = badges.some((x) => String(x?.status).toUpperCase() === 'OK')
      const notOk = badges.some((x) => x?.status != null && String(x.status).toUpperCase() !== 'OK')
      if (ok && !notOk) return 'High'
      if (notOk) return 'Low'
    }
    return 'Medium'
  }, [insightBlocks])

  const hasOverview = reportMode === 'agency' ? !!evidence : blocksForActivePage.length > 0
  const kpiBlocks = blocksForActivePage.filter((b) => b?.type === 'KPIBlock')
  const trendBlock = blocksForActivePage.find((b) => b?.type === 'TrendBlock')
  const insightBlocksForPanel = blocksForActivePage.filter((b) =>
    b && ['TrendBlock', 'ComparePeriodsBlock', 'DriverBlock'].includes(b.type)
  )
  const otherBlocks = blocksForActivePage.filter(
    (b) => b && !['KPIBlock'].includes(b.type)
  )

  const activeThemeId = studioTemplates[templateId]?.themeId ?? 'neutral'

  useEffect(() => {
    setLakeLoading(true)
    apiClient
      .get('/api/datalake')
      .then((res) => setLakeList(Array.isArray(res.data?.datasets) ? res.data.datasets : []))
      .catch(() => setLakeList([]))
      .finally(() => setLakeLoading(false))
  }, [])

  const selectedBlock = selectedBlockId && blocksForActivePage ? blocksForActivePage.find((b) => b.id === selectedBlockId) : null

  const sidebarBg = '#1a1d23'
  const sidebarBorder = '#2d323b'
  const sidebarText = '#e6edf3'
  const sidebarMuted = '#8b949e'
  const inputBg = '#21262d'
  const accent = '#58a6ff'
  const accentHover = '#79b8ff'
  const success = '#3fb950'
  const danger = '#f85149'

  const sourceTypes = [
    { value: 'dataset', label: 'Sample dataset', icon: '📊' },
    { value: 'api', label: 'REST API', icon: '🔗' },
    { value: 'samgov', label: 'SAM.gov', icon: '🏛️' },
    { value: 'db', label: 'Database', icon: '🗄️' },
    { value: 'csv', label: 'My uploads', icon: '📁' },
  ]

  const hasDatasetSelected = useMemo(() => {
    if (sourceType === 'dataset') return !!datasetId
    if (sourceType === 'csv') return !!lakeId
    if (sourceType === 'api') return !!String(customApiUrl || '').trim()
    if (sourceType === 'db') return !!String(dbTable || '').trim()
    if (sourceType === 'samgov') return true
    return false
  }, [sourceType, datasetId, lakeId, customApiUrl, dbTable])

  const handleSelectTemplateFromGallery = useCallback((catalogId, engineTemplateId) => {
    setSelectedTemplateId(catalogId || 'general')
    setTemplateId(engineTemplateId || 'general')
  }, [])

  const focusUploadSection = useCallback(() => {
    if (uploadSectionRef.current && typeof uploadSectionRef.current.scrollIntoView === 'function') {
      uploadSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  return (
    <StudioPageErrorBoundary>
      <StudioThemeProvider themeId={activeThemeId}>
        <div className="min-h-screen flex" style={{ background: '#0d1117', color: sidebarText }}>
          {/* Left sidebar - modern, scannable */}
          <aside
            className="shrink-0 flex flex-col border-r overflow-hidden transition-all duration-300"
            style={{
              width: isStudioSidebarOpen ? 260 : 0,
              background: sidebarBg,
              borderColor: isStudioSidebarOpen ? sidebarBorder : 'transparent',
            }}
          >
            <div className="p-5 border-b" style={{ borderColor: sidebarBorder }}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: 'linear-gradient(135deg,#58a6ff22,#58a6ff11)' }}>
                  <span aria-hidden>◇</span>
                </div>
                <div>
                  <h1 className="text-base font-semibold tracking-tight" style={{ color: sidebarText }}>Studio</h1>
                  <p className="text-[11px] mt-0.5" style={{ color: sidebarMuted }}>AI dashboard builder</p>
                </div>
              </div>
                <button
                  type="button"
                  onClick={() => setIsStudioSidebarOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-white/10 transition-colors"
                  style={{ color: sidebarMuted }}
                  title="Hide Studio sidebar"
                  aria-label="Hide Studio sidebar"
                >
                  ‹
                </button>
              </div>
            </div>
            <div className="p-4 flex-1 overflow-auto space-y-6">
              {/* Upload / Data */}
              <section ref={uploadSectionRef}>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: sidebarMuted }}>Data</p>
                <div
                  className="rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all duration-200 hover:border-[#58a6ff44] hover:bg-[#58a6ff08] focus-within:ring-2 focus-within:ring-[#58a6ff44]"
                  style={{ borderColor: sidebarBorder, background: 'rgba(255,255,255,0.02)' }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation()
                    if (uploadLoading || loading) return
                    const f = e.dataTransfer?.files?.[0]
                    if (f && (/\.(csv|xlsx|xls|json|pdf|xpt|sas7bdat)$/i.test(f.name) || f.type === 'text/csv' || f.type === 'application/json' || f.type === 'application/pdf' || f.type?.includes('spreadsheet'))) handleCsvUploadToLake(f)
                  }}
                >
                  <label className="cursor-pointer block">
                    <input type="file" accept=".csv,.xlsx,.xls,.json,.pdf,.xpt,.sas7bdat,application/json,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" disabled={uploadLoading || loading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleCsvUploadToLake(f) }} />
                    <span className="block text-2xl mb-1.5 opacity-80">📤</span>
                    <span className="text-sm font-medium" style={{ color: sidebarText }}>{uploadLoading ? 'Uploading…' : 'Drop file or click'}</span>
                    <span className="block text-[11px] mt-0.5" style={{ color: sidebarMuted }}>CSV, Excel, JSON, PDF, SAS XPORT (.xpt), or SAS dataset (.sas7bdat)</span>
                    <span className="block text-[10px] mt-1 opacity-80" style={{ color: sidebarMuted }}>JSON: array of objects or &#123; data: [...] &#125;</span>
                  </label>
                  {uploadError && <p className="text-[11px] mt-2 px-2 py-1 rounded" style={{ color: danger, background: 'rgba(248,81,73,0.15)' }}>{uploadError}</p>}
                </div>
              </section>

              {/* Source type */}
              <section>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-2" style={{ color: sidebarMuted }}>Source</p>
                <div className="rounded-lg p-0.5" style={{ background: inputBg }}>
                  <select
                    className="studio-select-options w-full rounded-lg px-3 py-2.5 text-sm font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#58a6ff44]"
                    style={{ background: 'transparent', border: 'none', color: sidebarText }}
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    disabled={loading}
                  >
                    {sourceTypes.map((s) => (
                      <option key={s.value} value={s.value} style={{ color: '#1f2937', backgroundColor: '#fff' }}>{s.icon} {s.label}</option>
                    ))}
                  </select>
                </div>
                {sourceType === 'dataset' && (
                  <div className="mt-2">
                    <select className="studio-select-options w-full rounded-lg px-3 py-2 text-sm" style={{ background: inputBg, border: `1px solid ${sidebarBorder}`, color: sidebarText }} value={datasetId} onChange={(e) => setDatasetId(e.target.value)} disabled={datasetsLoading || loading}>
                      {(datasets || []).map((d) => <option key={d.id} value={d.id} style={{ color: '#1f2937', backgroundColor: '#fff' }}>{d.id}</option>)}
                      {!datasetsLoading && datasets.length === 0 && (<><option value="sales" style={{ color: '#1f2937', backgroundColor: '#fff' }}>sales</option><option value="sas7bdat-sample" style={{ color: '#1f2937', backgroundColor: '#fff' }}>sas7bdat-sample</option><option value="samgov/live" style={{ color: '#1f2937', backgroundColor: '#fff' }}>samgov/live</option></>)}
                    </select>
                  </div>
                )}
                {sourceType === 'api' && (
                  <div className="mt-2">
                    <input className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: inputBg, border: `1px solid ${sidebarBorder}`, color: sidebarText }} value={customApiUrl} onChange={(e) => setCustomApiUrl(e.target.value)} placeholder="https://api.example.com/data" disabled={loading} />
                  </div>
                )}
                {sourceType === 'samgov' && (
                  <div className="mt-2 flex gap-2">
                    <input className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: inputBg, border: `1px solid ${sidebarBorder}`, color: sidebarText }} value={samgovPtype} onChange={(e) => setSamgovPtype(e.target.value)} placeholder="ptype" disabled={loading} />
                    <input className="w-20 rounded-lg px-3 py-2 text-sm" style={{ background: inputBg, border: `1px solid ${sidebarBorder}`, color: sidebarText }} value={samgovLimit} onChange={(e) => setSamgovLimit(e.target.value)} placeholder="limit" disabled={loading} />
                  </div>
                )}
                {sourceType === 'db' && (
                  <div className="mt-2 space-y-2">
                    <input className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: inputBg, border: `1px solid ${sidebarBorder}`, color: sidebarText }} value={dbTable} onChange={(e) => setDbTable(e.target.value)} placeholder="Table name" disabled={loading} />
                    <input className="w-24 rounded-lg px-3 py-2 text-sm" style={{ background: inputBg, border: `1px solid ${sidebarBorder}`, color: sidebarText }} value={dbLimit} onChange={(e) => setDbLimit(e.target.value)} placeholder="limit" disabled={loading} />
                  </div>
                )}
                {sourceType === 'csv' && (
                  <div className="mt-2">
                    <select className="studio-select-options w-full rounded-lg px-3 py-2 text-sm" style={{ background: inputBg, border: `1px solid ${sidebarBorder}`, color: sidebarText }} value={lakeId} onChange={(e) => setLakeId(e.target.value)} disabled={lakeLoading || loading}>
                      <option value="" style={{ color: '#1f2937', backgroundColor: '#fff' }}>Choose a dataset or upload CSV/JSON…</option>
                      {(lakeList || []).map((d) => <option key={d.id} value={d.id} style={{ color: '#1f2937', backgroundColor: '#fff' }}>{d.name || d.id} · {d.rowCount ?? 0} rows</option>)}
                    </select>
                    <label className="inline-flex items-center gap-1.5 mt-2 cursor-pointer text-[11px]" style={{ color: accent }} title="CSV, Excel, JSON, PDF, SAS XPORT (.xpt), or SAS dataset (.sas7bdat)">
                      <input type="file" accept=".csv,.xlsx,.xls,.json,.pdf,.xpt,.sas7bdat,application/json,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" disabled={uploadLoading || loading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; handleCsvUploadToLake(f) }} />
                      + Upload CSV, JSON, or SAS (.xpt / .sas7bdat)
                    </label>
                  </div>
                )}
              </section>

              {/* Build & Clear */}
              <section className="pt-1">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => doBuild(filters)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1d23]"
                    style={{ background: accent, color: '#fff' }}
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Building…
                      </span>
                    ) : (
                      'Build dashboard'
                    )}
                  </button>
                  <button type="button" onClick={clearFilters} disabled={loading} className="px-3 py-3 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors" style={{ background: inputBg, color: sidebarMuted, border: `1px solid ${sidebarBorder}` }} title="Clear filters">Clear</button>
                </div>
                {error && <p className="text-[11px] mt-2 px-2 py-1 rounded" style={{ color: danger, background: 'rgba(248,81,73,0.15)' }}>{error}</p>}
              </section>
            </div>
          </aside>

          {/* Main: top bar + content + bottom command bar */}
          <main className="flex-1 flex flex-col min-w-0 min-h-screen">
            <header className="shrink-0 h-14 flex items-center justify-between px-5 border-b" style={{ background: sidebarBg, borderColor: sidebarBorder }}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsStudioSidebarOpen((v) => !v)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold transition-colors hover:bg-white/10"
                  style={{ color: sidebarText, border: `1px solid ${sidebarBorder}` }}
                  title={isStudioSidebarOpen ? 'Hide Studio sidebar' : 'Show Studio sidebar'}
                  aria-label={isStudioSidebarOpen ? 'Hide Studio sidebar' : 'Show Studio sidebar'}
                >
                  {isStudioSidebarOpen ? '‹' : '›'}
                </button>
                {runId ? (
                  <>
                    <input
                      type="text"
                      value={dashboardName}
                      onChange={(e) => setDashboardName(e.target.value)}
                      placeholder={templateFromRun?.name ?? studioTemplates[templateId]?.name ?? 'Name your dashboard'}
                      className="flex-1 min-w-0 max-w-[280px] px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#58a6ff44]"
                      style={{ background: 'rgba(88,166,255,0.12)', border: '1px solid transparent', color: accent }}
                      title="Dashboard name (used when saving)"
                    />
                    {runDate && <span className="text-sm font-normal shrink-0 opacity-80" style={{ color: sidebarMuted }}>{runDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </>
                ) : (
                  <span className="text-sm" style={{ color: sidebarMuted }}>No dashboard yet</span>
                )}
                {runId && (
                  <>
                    <span className="text-xs font-medium" style={{ color: sidebarMuted }}>Report mode:</span>
                    <select
                      value={reportMode}
                      onChange={(e) => setReportMode(e.target.value)}
                      className="text-sm px-2 py-1.5 rounded-lg border"
                      style={{ color: sidebarText, borderColor: sidebarBorder, background: inputBg }}
                    >
                      <option value="analyst" style={{ color: '#1f2937', backgroundColor: '#fff' }}>Analyst</option>
                      <option value="agency" style={{ color: '#1f2937', backgroundColor: '#fff' }}>Agency</option>
                    </select>
                    <button type="button" onClick={saveDashboardPrivate} disabled={loading || saveLoading} className="text-sm px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 hover:bg-white/8" style={{ color: sidebarText }}>{saveLoading ? 'Saving…' : savedDashboardId ? '✓ Saved' : 'Save'}</button>
                    <button type="button" onClick={shareToFeed} disabled={loading || saveLoading} className="text-sm px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 hover:bg-white/8" style={{ color: success }}>Share to feed</button>
                    <button type="button" onClick={openPdfModal} disabled={loading || !evidence} className="text-sm px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 hover:bg-white/8" style={{ color: sidebarText }} title={!evidence ? 'Build a report first' : ''}>Export Branded PDF</button>
                    <button type="button" onClick={() => doBuild(filters)} disabled={loading} className="text-sm px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 hover:bg-white/8" style={{ color: sidebarText }}>Regenerate</button>
                    {saveError && <span className="text-xs max-w-[200px] truncate" style={{ color: danger }} title={saveError}>{saveError}</span>}
                  </>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-auto flex flex-col" style={{ background: '#0d1117' }}>
        <div className="max-w-5xl w-full mx-auto flex-1 px-5 py-6">
        {!hasOverview && !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4 pb-6">
            <div className="rounded-2xl border p-5" style={{ borderColor: sidebarBorder, background: 'rgba(255,255,255,0.02)' }}>
              <TemplateGallery
                selectedCatalogId={selectedTemplateId}
                onSelectTemplate={handleSelectTemplateFromGallery}
                trackEvent={trackEvent}
              />
            </div>
            <div className="hidden lg:block">
              <TemplatePreviewPanel
                selectedCatalogId={selectedTemplateId}
                hasDataset={hasDatasetSelected}
                loading={loading}
                onBuildDashboard={() => doBuild(filters)}
                onUploadData={focusUploadSection}
              />
            </div>
            <div className="lg:hidden">
              <TemplatePreviewPanel
                selectedCatalogId={selectedTemplateId}
                hasDataset={hasDatasetSelected}
                loading={loading}
                onBuildDashboard={() => doBuild(filters)}
                onUploadData={focusUploadSection}
              />
            </div>
          </div>
        )}
        {hasOverview && (
        <>
          <GlobalFilterBar
            timeRangeColumn={timeRangeColumn}
            timeRange={filters.timeRange}
            onTimeRangeChange={setTimeRangeFilter}
            dimensionFilters={dimensionFilters}
            searchValue={searchValue}
            onSearchChange={onSearchChange}
            onClear={clearFilters}
            loading={loading}
            dateExtent={dateExtent}
          />
          {pages && pages.length > 1 && (
            <div className="flex gap-1 border-b mb-4" style={{ borderColor: sidebarBorder }}>
              {pages.map((p) => (
                <button key={p.id} type="button" onClick={() => setActivePageId(p.id)} className="px-4 py-2.5 text-sm font-medium rounded-t border-b-2 -mb-px transition-colors" style={activePageId === p.id ? { background: 'transparent', color: sidebarText, borderColor: accent } : { background: 'transparent', color: sidebarMuted, borderColor: 'transparent' }}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </>
        )}

        {hasOverview && (
        <div className="space-y-4 pb-6" style={{ color: 'var(--text)' }}>
          {(saveError || savedDashboardId) && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${sidebarBorder}` }}>
              {saveError && <span style={{ color: '#f48771' }}>{saveError}</span>}
              {savedDashboardId && <Link to="/dashboards" className="font-medium" style={{ color: success }}>View in My Dashboards →</Link>}
            </div>
          )}
          {reportMode === 'agency' ? (
            <div className="px-5 py-5 rounded-2xl border transition-shadow duration-200" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <AgencyReportView
                evidence={evidence}
                narrative={narrative || {}}
                reportMeta={{}}
                branding={{}}
                narrativeLoading={narrativeLoading}
                loading={loading}
              />
            </div>
          ) : (
            <div
              key={activePageId}
              className="px-5 py-5 space-y-5 rounded-2xl border transition-shadow duration-200"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              {loading && <KPIRowSkeleton />}
              {!loading && kpiBlocks.length > 0 && (
                <div className="space-y-2">
                  {kpiBlocks.map((b) => (
                    <AAIStudioBlockRenderer
                      key={b.id}
                      block={b}
                      filterState={filters}
                      onFilterChange={{ setEq: setEqFilter, setTimeRange: setTimeRangeFilter }}
                      templateId={templateId}
                      isSelected={selectedBlockId === b.id}
                      onSelect={() => setSelectedBlockId((prev) => (prev === b.id ? null : b.id))}
                    />
                  ))}
                </div>
              )}

              {!loading && (trendBlock || insightBlocksForPanel.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 space-y-4">
                    {trendBlock && (
                      <AAIStudioBlockRenderer
                        key={trendBlock.id}
                        block={trendBlock}
                        filterState={filters}
                        onFilterChange={{ setEq: setEqFilter, setTimeRange: setTimeRangeFilter }}
                        templateId={templateId}
                        isSelected={selectedBlockId === trendBlock.id}
                        onSelect={() => setSelectedBlockId((prev) => (prev === trendBlock.id ? null : trendBlock.id))}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-1">
                    <AnalystInsightsPanel blocks={insightBlocksForPanel} confidence={executiveConfidence} maxBullets={5} narrative={narrative} />
                  </div>
                </div>
              )}

              {!loading && otherBlocks.filter((b) => b.type !== 'TrendBlock').length > 0 && (
                <div className="space-y-4">
                  {otherBlocks
                    .filter((b) => b.type !== 'TrendBlock')
                    .map((b) => (
                      <AAIStudioBlockRenderer
                        key={b.id}
                        block={b}
                        filterState={filters}
                        onFilterChange={{ setEq: setEqFilter, setTimeRange: setTimeRangeFilter }}
                        templateId={templateId}
                        isSelected={selectedBlockId === b.id}
                        onSelect={() => setSelectedBlockId((prev) => (prev === b.id ? null : b.id))}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {hasOverview && (
          <StudioDataPanel selectedBlock={selectedBlock} style={{ height: 'min(320px, 35vh)', minHeight: 180, marginTop: 16 }} />
        )}
        </div>
        </div>

        {/* Bottom command bar - only show when there's a run so it's clearly useful */}
        {runId && (
        <div className="shrink-0 relative px-5 py-3 border-t flex flex-col gap-2" style={{ background: sidebarBg, borderColor: sidebarBorder }}>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Try: grain month · add map · remove details"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCommandSubmit() } }}
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#58a6ff44]"
              style={{ background: inputBg, border: `1px solid ${sidebarBorder}`, color: sidebarText }}
              aria-label="Command input: type a command and press Enter"
            />
            <button type="button" onClick={handleCommandSubmit} disabled={loading} className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50" style={{ color: '#e6edf3', background: accent }} title="Run command (or press Enter)">Run</button>
            <button type="button" onClick={() => setShowCommandHelp((v) => !v)} className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-medium transition-colors hover:bg-white/8" style={{ color: sidebarMuted, background: inputBg }} title="All commands">?</button>
            {commandMessage && (
              <span className="text-sm shrink-0" style={{ color: commandMessage.type === 'error' ? danger : commandMessage.type === 'success' ? success : sidebarMuted }}>{commandMessage.text}</span>
            )}
          </div>
          <p className="text-[11px]" style={{ color: sidebarMuted }}>Press Enter to run. Type <kbd className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: inputBg }}>help</kbd> for commands.</p>
          {showCommandHelp && (
            <div className="absolute bottom-full left-5 right-5 mb-2 p-4 rounded-xl border text-left text-xs font-mono max-h-64 overflow-auto z-[100] shadow-xl" style={{ background: sidebarBg, borderColor: sidebarBorder, color: sidebarText }}>
              <div className="font-semibold mb-2" style={{ color: sidebarText }}>Commands</div>
              {HELP_LINES.map((line, i) => <div key={i} className="py-0.5" style={{ color: sidebarMuted }}>{line}</div>)}
              <button type="button" onClick={() => setShowCommandHelp(false)} className="mt-3 text-xs font-medium" style={{ color: accent }}>Close</button>
            </div>
          )}
        </div>
        )}
          </main>
        </div>

        {showPdfModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => !pdfLoading && setShowPdfModal(false)}>
            <div className="rounded-xl border shadow-xl max-w-md w-full max-h-[90vh] overflow-auto" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Export Branded PDF</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Generate a client-ready report with your branding.</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Client name</label>
                  <input type="text" value={pdfForm.clientName} onChange={(e) => setPdfForm((f) => ({ ...f, clientName: e.target.value }))} placeholder="Optional" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Report title</label>
                  <input type="text" value={pdfForm.reportTitle} onChange={(e) => setPdfForm((f) => ({ ...f, reportTitle: e.target.value }))} placeholder="Analytics Report" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Date range</label>
                  <input type="text" value={pdfForm.dateRange} onChange={(e) => setPdfForm((f) => ({ ...f, dateRange: e.target.value }))} placeholder="e.g. 2026-01-01 – 2026-02-20" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Agency name</label>
                  <input type="text" value={pdfForm.agencyName} onChange={(e) => setPdfForm((f) => ({ ...f, agencyName: e.target.value }))} placeholder="NM2TECH" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>Agency logo URL</label>
                  <input type="url" value={pdfForm.agencyLogoUrl} onChange={(e) => setPdfForm((f) => ({ ...f, agencyLogoUrl: e.target.value }))} placeholder="https://… or leave blank" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                </div>
                {pdfError && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium p-2 rounded" style={{ color: '#fff', background: 'var(--negative)' }} role="alert">{pdfError}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Tip: Use &quot;Download HTML&quot; then open in a browser and choose Print → Save as PDF if PDF is unavailable.</p>
                  </div>
                )}
              </div>
              <div className="p-5 pt-0 flex flex-wrap gap-2 justify-end">
                <button type="button" onClick={() => !pdfLoading && setShowPdfModal(false)} disabled={pdfLoading} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ color: 'var(--text)', background: 'var(--card-2)' }}>Cancel</button>
                <button
                  type="button"
                  disabled={pdfLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ color: 'var(--text)', background: 'var(--card-2)', border: '1px solid var(--border)' }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (pdfLoading) return
                    setPdfError(null)
                    setPdfLoading(true)
                    Promise.resolve().then(() => generateHtmlExport()).catch((err) => { setPdfError(err?.message || 'HTML export failed'); setPdfLoading(false) })
                  }}
                >
                  Download HTML
                </button>
                <button
                  type="button"
                  disabled={pdfLoading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: accent }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (pdfLoading) return
                    setPdfError(null)
                    setPdfLoading(true)
                    Promise.resolve()
                      .then(() => generatePdf())
                      .catch((err) => {
                        console.error('[PDF export] sync', err)
                        setPdfError(err?.message || 'PDF export failed')
                      })
                      .finally(() => setPdfLoading(false))
                  }}
                >
                  {pdfLoading ? 'Generating…' : 'Generate PDF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </StudioThemeProvider>
    </StudioPageErrorBoundary>
  )
}

