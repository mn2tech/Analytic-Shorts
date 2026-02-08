import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { getDashboard, saveDashboard } from '../../studio/api/studioClient'
import { normalizeSchema, isPublished } from '../../studio/utils/schemaUtils'
import { buildStarterSchema, syncFiltersFromSchema } from '../../studio/utils/buildStarterSchema'
import { detectColumnTypes } from '../../studio/utils/dataAnalysis'
import AppShell from '../../studio/ui/AppShell'
import PageRenderer from '../../studio/ui/PageRenderer'
import apiClient from '../../config/api'

function getDataSourceFromSchema(schema) {
  if (!schema?.data_source?.endpoint) return { datasetId: null, customEndpoint: null }
  const endpoint = String(schema.data_source.endpoint).trim()
  const match = endpoint.match(/\/api\/example\/(.+)$/)
  if (match) {
    return { datasetId: match[1].replace(/%2F/g, '/'), customEndpoint: null }
  }
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return { datasetId: null, customEndpoint: endpoint }
  }
  if (endpoint && !endpoint.includes('/')) {
    return { datasetId: endpoint, customEndpoint: null }
  }
  return { datasetId: null, customEndpoint: endpoint || null }
}

// Clean-slate schema for new multi-page apps (no example data)
const getEmptyAppSchema = () => ({
  version: '2.0',
  app_title: 'Untitled App',
  metadata: {
    name: 'Untitled App',
    description: '',
    status: 'draft',
    version: '1.0.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  data_source: {
    type: 'api',
    endpoint: '',
    refresh_interval: 3600
  },
  global_filters: [],
  queries: [],
  pages: [
    {
      id: 'page-1',
      title: 'Page 1',
      description: '',
      sections: []
    }
  ]
})

/**
 * StudioAppEditor - Editor mode for multi-page apps
 * Allows editing schema, adding pages/widgets, and publishing
 */
export default function StudioAppEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [schema, setSchema] = useState(null)
  const [currentPageId, setCurrentPageId] = useState(null)
  const [globalFilters, setGlobalFilters] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showDataSourceModal, setShowDataSourceModal] = useState(false)
  const [builtInDatasets, setBuiltInDatasets] = useState([])
  const [dataSourceForm, setDataSourceForm] = useState({
    appName: '',
    sourceType: 'builtin',
    builtinId: 'sales',
    customUrl: ''
  })
  const [generatingStarterDashboard, setGeneratingStarterDashboard] = useState(false)
  const [showDataMetadataModal, setShowDataMetadataModal] = useState(false)
  const [dataMetadata, setDataMetadata] = useState(null)
  const [loadingDataMetadata, setLoadingDataMetadata] = useState(false)
  const [dataMetadataView, setDataMetadataView] = useState('table')
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [inlineAiPrompt, setInlineAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [pendingAiPrompt, setPendingAiPrompt] = useState(null)
  const lastSyncedEndpointRef = useRef(null)

  // When opened via "Create with AI" from Studio home, capture prompt and clear nav state
  useEffect(() => {
    const prompt = location.state?.createWithAiPrompt
    if (prompt && typeof prompt === 'string' && prompt.trim()) {
      setPendingAiPrompt(prompt.trim())
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

  // When we have a pending AI prompt and schema with data source, fetch data for columns
  useEffect(() => {
    if (!pendingAiPrompt || !schema?.data_source?.endpoint || loading || id === 'new') return
    const { datasetId, customEndpoint } = getDataSourceFromSchema(schema)
    if (!datasetId && !customEndpoint) return
    if (dataMetadata?.data?.length) return // already have data

    let cancelled = false
    setLoadingDataMetadata(true)
    ;(async () => {
      try {
        let data = []
        if (customEndpoint) {
          const res = await apiClient.get('/api/studio/fetch', { params: { url: customEndpoint } })
          data = res.data?.data || res.data || []
        } else {
          const res = await apiClient.get(`/api/example/${encodeURIComponent(datasetId).replace(/%2F/g, '/')}`)
          data = res.data?.data || res.data || []
        }
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          const columns = Object.keys(data[0] || {})
          setDataMetadata({
            endpoint: customEndpoint || `/api/example/${datasetId}`,
            rowCount: data.length,
            columns,
            data
          })
        }
      } catch (err) {
        if (!cancelled) setAiError(err.message || 'Failed to load data for AI')
      } finally {
        if (!cancelled) setLoadingDataMetadata(false)
      }
    })()
    return () => { cancelled = true }
  }, [pendingAiPrompt, schema?.data_source?.endpoint, loading, id])

  // When we have pending prompt and data, run AI once and clear pending
  useEffect(() => {
    if (!pendingAiPrompt || !dataMetadata?.data?.length || aiLoading) return
    const prompt = pendingAiPrompt
    setPendingAiPrompt(null)
    handleAiSubmit(prompt)
  }, [pendingAiPrompt, dataMetadata?.data?.length, aiLoading]) // eslint-disable-line react-hooks/exhaustive-deps -- run AI once when data ready

  // Load app schema
  useEffect(() => {
    const loadApp = async () => {
      try {
        setLoading(true)
        setError(null)

        if (id === 'new') {
          // Create new app with clean slate (no example content)
          const emptySchema = getEmptyAppSchema()
          const normalized = normalizeSchema(emptySchema)
          setSchema(normalized)
          const firstPageId = normalized.pages?.[0]?.id || 'page-1'
          setCurrentPageId(firstPageId)
          setGlobalFilters({})
        } else {
          // Load existing app
          const dashboardSchema = await getDashboard(id)
          if (!dashboardSchema) {
            setError('App not found')
            return
          }

          // Check if published (should redirect to view mode)
          if (isPublished(dashboardSchema)) {
            navigate(`/apps/${id}`, { replace: true })
            return
          }

          const normalized = normalizeSchema(dashboardSchema)
          setSchema(normalized)
          
          // Get initial page from URL or use first page
          const urlParams = new URLSearchParams(window.location.search)
          const pageParam = urlParams.get('page')
          const firstPageId = normalized.pages && normalized.pages.length > 0 
            ? normalized.pages[0].id 
            : 'default'
          setCurrentPageId(pageParam || firstPageId)
          
          // Initialize global filters from URL params or schema defaults
          try {
            const initialFilters = {}
            
            // Load from URL params first
            urlParams.forEach((value, key) => {
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
            
            // Fill in defaults from schema if not in URL (only if global_filters exist)
            if (normalized.global_filters && Array.isArray(normalized.global_filters) && normalized.global_filters.length > 0) {
              normalized.global_filters.forEach(filter => {
                if (filter && filter.id && !initialFilters.hasOwnProperty(filter.id)) {
                  if (filter.default !== undefined) {
                    initialFilters[filter.id] = filter.default
                  } else if (filter.type === 'time_range') {
                    initialFilters[filter.id] = { start: '', end: '' }
                  } else {
                    initialFilters[filter.id] = null
                  }
                }
              })
            }
            setGlobalFilters(initialFilters)
          } catch (filterError) {
            console.error('Error initializing filters:', filterError)
            // Set empty filters if initialization fails
            setGlobalFilters({})
          }
        }
      } catch (err) {
        console.error('Error loading app:', err)
        setError(err.message || 'Failed to load app')
      } finally {
        setLoading(false)
      }
    }

    loadApp()
  }, [id, navigate])

  // Sync filters from schema's data source: add time_range, Region, Product, etc. when schema has endpoint
  useEffect(() => {
    const endpoint = schema?.data_source?.endpoint ? String(schema.data_source.endpoint).trim() : ''
    if (!endpoint || loading) return
    if (lastSyncedEndpointRef.current === endpoint) return

    const fetchAndSyncFilters = async () => {
      const { datasetId, customEndpoint } = getDataSourceFromSchema(schema)
      if (!datasetId && !customEndpoint) return
      try {
        let data = []
        if (customEndpoint) {
          const res = await apiClient.get('/api/studio/fetch', { params: { url: customEndpoint } })
          data = res.data?.data || res.data || []
        } else {
          const res = await apiClient.get(`/api/example/${encodeURIComponent(datasetId).replace(/%2F/g, '/')}`)
          data = res.data?.data || res.data || []
        }
        if (!data || data.length === 0) return
        const { schema: updatedSchema, addedFilterIds } = syncFiltersFromSchema(schema, data)
        if (addedFilterIds.length === 0) {
          lastSyncedEndpointRef.current = endpoint
          return
        }
        setSchema(updatedSchema)
        const defaults = {}
        updatedSchema.global_filters.forEach((f) => {
          if (addedFilterIds.includes(f.id)) {
            if (f.type === 'time_range' && f.default && typeof f.default === 'object') defaults[f.id] = f.default
            else if (f.type === 'dropdown') defaults[f.id] = 'All'
          }
        })
        setGlobalFilters((prev) => ({ ...prev, ...defaults }))
        lastSyncedEndpointRef.current = endpoint
      } catch (err) {
        console.error('Sync filters from schema:', err)
        lastSyncedEndpointRef.current = endpoint
      }
    }

    fetchAndSyncFilters()
  }, [schema?.data_source?.endpoint, schema?.global_filters, loading])

  // Fetch built-in datasets when Data Source modal opens
  useEffect(() => {
    if (!showDataSourceModal) return
    const fetchDatasets = async () => {
      try {
        const res = await apiClient.get('/api/studio/datasets')
        setBuiltInDatasets(res.data?.datasets || [])
      } catch (err) {
        console.error('Failed to fetch datasets:', err)
        setBuiltInDatasets([])
      }
    }
    fetchDatasets()
  }, [showDataSourceModal])

  // Open Data Source modal and init form from schema
  const handleOpenDataSource = () => {
    if (!schema) return
    const endpoint = schema?.data_source?.endpoint || ''
    const isCustom = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    let builtinId = 'sales'
    if (!isCustom && endpoint) {
      const m = endpoint.match(/\/api\/example\/(.+)$/)
      if (m) builtinId = m[1]
    }
    setDataSourceForm({
      appName: schema?.app_title || schema?.metadata?.name || '',
      sourceType: isCustom ? 'custom' : 'builtin',
      builtinId,
      customUrl: isCustom ? endpoint : ''
    })
    setShowDataSourceModal(true)
  }

  // Save Data Source settings into schema
  const handleSaveDataSource = () => {
    if (!schema) return
    const { appName, sourceType, builtinId, customUrl } = dataSourceForm
    const endpoint = sourceType === 'custom'
      ? (customUrl || '').trim()
      : `${builtInDatasets.find(d => d.id === builtinId)?.endpoint || `/api/example/${builtinId}`}`
    if (sourceType === 'custom' && !endpoint) {
      alert('Please enter a valid API URL for Custom API.')
      return
    }
    setSchema({
      ...schema,
      app_title: appName || schema.app_title,
      metadata: {
        ...schema.metadata,
        name: appName || schema.metadata?.name
      },
      data_source: {
        type: 'api',
        endpoint: endpoint || '/api/example/sales',
        refresh_interval: schema?.data_source?.refresh_interval ?? 3600
      }
    })
    setShowDataSourceModal(false)
  }

  // Generate starter dashboard from current data source
  const handleGenerateStarterDashboard = async () => {
    if (!schema) return
    const { datasetId, customEndpoint } = getDataSourceFromSchema(schema)
    if (!datasetId && !customEndpoint) {
      alert('Configure a data source first (click "Data source" and choose a dataset or enter an API URL).')
      return
    }
    setGeneratingStarterDashboard(true)
    try {
      let data = []
      if (customEndpoint) {
        const res = await apiClient.get('/api/studio/fetch', { params: { url: customEndpoint } })
        data = res.data?.data || res.data || []
      } else {
        const res = await apiClient.get(`/api/example/${encodeURIComponent(datasetId).replace(/%2F/g, '/')}`)
        data = res.data?.data || res.data || []
      }
      if (!Array.isArray(data) || data.length === 0) {
        alert('No data returned from the data source. Check the API or try another dataset.')
        return
      }
      const updatedSchema = buildStarterSchema({ ...schema }, data)
      setSchema(updatedSchema)
      // Initialize global filter values from new filters
      const initial = {}
      ;(updatedSchema.global_filters || []).forEach((f) => {
        if (f.type === 'time_range') initial[f.id] = f.default || { start: '', end: '' }
        else initial[f.id] = f.default ?? 'All'
      })
      setGlobalFilters(initial)
    } catch (err) {
      console.error('Generate starter dashboard failed:', err)
      alert('Failed to load data: ' + (err.message || err.response?.data?.message || 'Unknown error'))
    } finally {
      setGeneratingStarterDashboard(false)
    }
  }

  const handleOpenDataMetadata = async () => {
    if (!schema) return
    const { datasetId, customEndpoint } = getDataSourceFromSchema(schema)
    if (!datasetId && !customEndpoint) {
      setDataMetadata({ error: 'No data source configured. Set a data source first.' })
      setShowDataMetadataModal(true)
      return
    }
    setShowDataMetadataModal(true)
    setLoadingDataMetadata(true)
    setDataMetadata(null)
    try {
      let data = []
      let endpoint = ''
      if (customEndpoint) {
        endpoint = customEndpoint
        const res = await apiClient.get('/api/studio/fetch', { params: { url: customEndpoint } })
        data = res.data?.data || res.data || []
      } else {
        endpoint = `/api/example/${encodeURIComponent(datasetId).replace(/%2F/g, '/')}`
        const res = await apiClient.get(endpoint)
        data = res.data?.data || res.data || []
      }
      const columns = data.length > 0 ? Object.keys(data[0]) : []
      setDataMetadata({
        endpoint,
        rowCount: Array.isArray(data) ? data.length : 0,
        columns,
        data: Array.isArray(data) ? data : []
      })
    } catch (err) {
      setDataMetadata({
        error: err.message || err.response?.data?.message || 'Failed to load data'
      })
    } finally {
      setLoadingDataMetadata(false)
    }
  }

  const handleRefreshDataMetadata = () => {
    if (schema) handleOpenDataMetadata()
  }

  /** Open AI modal; ensure we have source data for columns (fetch if needed) */
  const handleOpenAiPrompt = async () => {
    if (!schema) return
    const { datasetId, customEndpoint } = getDataSourceFromSchema(schema)
    if (!datasetId && !customEndpoint) {
      setAiError('Configure a data source first.')
      setShowAiModal(true)
      return
    }
    setShowAiModal(true)
    setAiError(null)
    setAiPrompt('')
    if (!dataMetadata?.data?.length && !dataMetadata?.error) {
      setLoadingDataMetadata(true)
      try {
        let data = []
        if (customEndpoint) {
          const res = await apiClient.get('/api/studio/fetch', { params: { url: customEndpoint } })
          data = res.data?.data || res.data || []
        } else {
          const res = await apiClient.get(`/api/example/${encodeURIComponent(datasetId).replace(/%2F/g, '/')}`)
          data = res.data?.data || res.data || []
        }
        const columns = data.length > 0 ? Object.keys(data[0]) : []
        setDataMetadata({
          endpoint: customEndpoint || `/api/example/${datasetId}`,
          rowCount: Array.isArray(data) ? data.length : 0,
          columns,
          data: Array.isArray(data) ? data : []
        })
      } catch (err) {
        setAiError(err.message || err.response?.data?.message || 'Failed to load data for columns')
      } finally {
        setLoadingDataMetadata(false)
      }
    }
  }

  /** Call AI schema API and merge filters, queries, and optionally create tabs (pages) from sections */
  const handleAiSubmit = async (promptOverride) => {
    const prompt = (promptOverride ?? aiPrompt || '').trim()
    if (!prompt || !schema) return
    if (!dataMetadata?.data?.length) {
      setAiError('No data available. Configure data source and try again.')
      return
    }
    const { numeric, categorical, date } = detectColumnTypes(dataMetadata.data)
    const columns = [
      ...numeric.map(name => ({ name, type: 'numeric' })),
      ...categorical.map(name => ({ name, type: 'categorical' })),
      ...date.map(name => ({ name, type: 'date' }))
    ]
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await apiClient.post('/api/studio/ai-schema', {
        prompt,
        schema: { global_filters: schema.global_filters, queries: schema.queries },
        columns
      })
      const {
        filters: newFilters = [],
        queries: newQueries = [],
        widgets: newWidgets = [],
        sections: aiSections = []
      } = res.data

      const existingFilterIds = new Set((schema.global_filters || []).map(f => f.id))
      const normalizedNewFilters = newFilters
        .filter(f => f.id && !existingFilterIds.has(f.id))
        .map(f => {
          const base = { id: f.id, type: f.type, label: f.label || f.id, default: f.default }
          if (f.type === 'dropdown') {
            return { ...base, source: 'dimension', dimension: f.dimension || f.label || f.id, default: f.default ?? 'All', required: false, multi_select: false }
          }
          if (f.type === 'time_range') {
            return { ...base, default: f.default || { start: '2024-01-01', end: '2024-12-31' }, required: false }
          }
          return base
        })
      const mergedFilters = [...(schema.global_filters || []), ...normalizedNewFilters]
      const allFilterRefs = {}
      mergedFilters.forEach(f => { allFilterRefs[f.id] = `{{filters.${f.id}}}` })

      const existingQueryIds = new Set((schema.queries || []).map(q => q.id))
      const mergedQueries = [...(schema.queries || [])]
      newQueries.forEach(q => {
        if (!q.id || existingQueryIds.has(q.id)) return
        existingQueryIds.add(q.id)
        mergedQueries.push({
          ...q,
          filters: { ...allFilterRefs, ...(q.filters || {}) }
        })
      })

      let newPages = schema.pages || []

      if (aiSections.length > 0) {
        // AI returned tabs (sections) → each section becomes a page (tab)
        const slug = (t) => (t || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'section'
        newPages = aiSections.map((s) => ({
          id: s.id || `page-${slug(s.title)}`,
          title: s.title || 'Untitled',
          description: '',
          sections: [{
            id: s.id || slug(s.title),
            title: s.title || '',
            layout: s.layout || 'grid',
            columns: s.columns ?? 1,
            widgets: Array.isArray(s.widgets) ? s.widgets : []
          }]
        }))
      } else {
        // Widgets-only: merge into first page
        const firstPage = schema.pages?.[0]
        const firstSection = firstPage?.sections?.[0]
        const existingWidgetIds = new Set((firstSection?.widgets || []).map(w => w.id))
        const widgetsToAdd = newWidgets.filter(w => w.id && w.query_ref && !existingWidgetIds.has(w.id))
        const mergedWidgets = [...(firstSection?.widgets || []), ...widgetsToAdd]
        const section = firstSection
          ? { ...firstSection, widgets: mergedWidgets }
          : { id: 'ai-section', title: 'Overview', layout: 'grid', columns: 1, widgets: widgetsToAdd }
        const sections = firstSection
          ? [section, ...(firstPage.sections || []).slice(1)]
          : [section]
        newPages = (schema.pages || []).map((p, i) => (i === 0 ? { ...p, sections } : p))
      }

      const updatedSchema = {
        ...schema,
        global_filters: mergedFilters,
        queries: mergedQueries,
        pages: newPages
      }
      setSchema(updatedSchema)
      const nextFilters = { ...globalFilters }
      normalizedNewFilters.forEach(f => {
        if (f.type === 'dropdown' && nextFilters[f.id] === undefined) nextFilters[f.id] = 'All'
        if (f.type === 'time_range' && nextFilters[f.id] === undefined) nextFilters[f.id] = f.default
      })
      setGlobalFilters(nextFilters)
      setShowAiModal(false)
      setAiPrompt('')
      setInlineAiPrompt('')
      if (newPages.length > 0) setCurrentPageId(newPages[0].id)
    } catch (err) {
      const data = err.response?.data
      const message = data?.message || data?.error || err.message || 'AI request failed'
      setAiError(message)
    } finally {
      setAiLoading(false)
    }
  }

  /** Add Region/Product dropdowns and fix metric so charts show data (using current Data & Metadata) */
  const handleSyncFiltersFromData = () => {
    if (!schema || !dataMetadata?.data?.length || dataMetadata.error) return
    const data = dataMetadata.data
    const { numeric, categorical } = detectColumnTypes(data)
    const existingFilterIds = new Set((schema.global_filters || []).map((f) => f.id))
    const newFilters = [...(schema.global_filters || [])]
    const newRefs = {}
    ;(schema.global_filters || []).forEach((f) => {
      if (f.id) newRefs[f.id] = `{{filters.${f.id}}}`
    })
    const addDropdown = (dim) => {
      const filterId = dim.toLowerCase().replace(/\s+/g, '_')
      if (existingFilterIds.has(filterId)) return
      const uniqueCount = new Set(data.map((r) => r[dim]).filter(Boolean)).size
      if (uniqueCount < 2 || uniqueCount > 100) return
      existingFilterIds.add(filterId)
      newFilters.push({
        id: filterId,
        type: 'dropdown',
        label: dim,
        source: 'dimension',
        dimension: dim,
        default: 'All',
        required: false,
        multi_select: false
      })
      newRefs[filterId] = `{{filters.${filterId}}}`
    }
    ;['Region', 'Product', 'Category'].forEach((name) => {
      const col = categorical.find((c) => c.toLowerCase() === name.toLowerCase())
      if (col) addDropdown(col)
    })
    const firstNumeric = numeric[0]
    const isNumericColumn = (name) => name && numeric.some((n) => n.toLowerCase() === String(name).toLowerCase())
    const updatedQueries = (schema.queries || []).map((q) => {
      const filters = { ...(q.filters || {}), ...newRefs }
      const metric = firstNumeric && !isNumericColumn(q.metric) ? firstNumeric : q.metric
      return { ...q, filters, metric: metric || q.metric }
    })
    const updatedSchema = { ...schema, global_filters: newFilters, queries: updatedQueries }
    setSchema(updatedSchema)
    const nextFilters = { ...globalFilters }
    newFilters.forEach((f) => {
      if (f.type === 'dropdown' && nextFilters[f.id] === undefined) nextFilters[f.id] = 'All'
    })
    setGlobalFilters(nextFilters)
    setShowDataMetadataModal(false)
  }

  // Handle save
  const handleSave = async () => {
    if (!schema) return

    try {
      setSaving(true)
      const saved = await saveDashboard(schema, id === 'new' ? null : id)
      if (id === 'new' && saved?.id) {
        navigate(`/studio/app/${saved.id}`, { replace: true })
      }
      // Show success message (could use a toast library)
      console.log('App saved successfully')
    } catch (err) {
      console.error('Error saving app:', err)
      setError(err.message || 'Failed to save app')
    } finally {
      setSaving(false)
    }
  }

  // Start from scratch: go to new app (confirm if current app has content)
  const handleStartFromScratch = () => {
    const hasContent =
      (schema?.global_filters?.length > 0) ||
      (schema?.queries?.length > 0) ||
      (schema?.pages?.some((p) => (p.sections?.flatMap((s) => s.widgets || []).length ?? 0) > 0)) ||
      (schema?.data_source?.endpoint ?? '') !== ''
    if (hasContent && !window.confirm('Start from scratch? Current app will not be saved.')) {
      return
    }
    lastSyncedEndpointRef.current = null
    navigate('/studio/app/new', { replace: true })
  }

  // Handle duplicate app
  const handleDuplicate = async () => {
    if (!schema) return

    try {
      setSaving(true)
      
      // Generate new ID and update metadata
      const newSchema = {
        ...schema,
        app_id: undefined, // Will be generated on save
        metadata: {
          ...schema.metadata,
          id: undefined, // Will be generated on save
          name: `${schema.metadata?.name || 'Untitled App'} (Copy)`,
          description: schema.metadata?.description || '',
          status: 'draft',
          version: '1.0.0',
          published_at: undefined,
          is_template: false
        }
      }

      // Save as new dashboard
      const saved = await saveDashboard(newSchema, null)
      
      // Navigate to new app
      navigate(`/studio/app/${saved.id}`, { replace: true })
    } catch (err) {
      console.error('Error duplicating app:', err)
      setError(err.message || 'Failed to duplicate app')
    } finally {
      setSaving(false)
    }
  }

  // Handle save as template
  const handleSaveAsTemplate = async () => {
    if (!schema) return

    try {
      setSaving(true)
      
      // Update schema to mark as template
      const templateSchema = {
        ...schema,
        metadata: {
          ...schema.metadata,
          is_template: true,
          name: schema.metadata?.name || 'Untitled Template',
          description: schema.metadata?.description || 'A reusable app template'
        }
      }

      // Save template
      await saveDashboard(templateSchema, id === 'new' ? null : id)
      
      // Show success message
      alert('App saved as template! Others can now use this as a starting point.')
    } catch (err) {
      console.error('Error saving template:', err)
      setError(err.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Handle publish
  const handlePublish = async () => {
    if (!schema) return

    try {
      setSaving(true)
      
      // Update schema metadata
      const updatedSchema = {
        ...schema,
        metadata: {
          ...schema.metadata,
          status: 'published',
          version: schema.metadata?.version || '1.0.0',
          published_at: new Date().toISOString()
        }
      }

      // Call publish endpoint
      const response = await apiClient.post(`/api/dashboards/${id}/publish`, {
        schema: updatedSchema
      })

      // Redirect to view mode
      navigate(`/apps/${id}`, { replace: true })
    } catch (err) {
      console.error('Error publishing app:', err)
      setError(err.message || 'Failed to publish app')
    } finally {
      setSaving(false)
    }
  }

  // Handle page change
  const handlePageChange = (pageId) => {
    setCurrentPageId(pageId)
    // Update URL without navigation
    window.history.replaceState({}, '', `/studio/app/${id}?page=${pageId}`)
  }

  // Handle filter change
  const handleFilterChange = (filters) => {
    setGlobalFilters(filters)
  }

  // Handle drilldown navigation
  const handleDrilldown = (targetPageId, filters) => {
    setCurrentPageId(targetPageId)
    setGlobalFilters(filters)
    // Update URL with filters
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== 'All') {
        params.set(`filter_${key}`, String(value))
      }
    })
    window.history.replaceState({}, '', `/studio/app/${id}?page=${targetPageId}&${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-600">Loading app...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => navigate('/studio')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Studio
          </button>
        </div>
      </div>
    )
  }

  if (!schema) {
    return null
  }

  return (
    <>
      <AppShell
        schema={schema}
        currentPageId={currentPageId}
        onPageChange={handlePageChange}
        onSave={handleSave}
        onPublish={handlePublish}
        onOpenDataSource={handleOpenDataSource}
        onOpenDataMetadata={handleOpenDataMetadata}
        onOpenAiPrompt={handleOpenAiPrompt}
        onStartFromScratch={handleStartFromScratch}
        onDuplicate={id !== 'new' ? handleDuplicate : null}
        onSaveAsTemplate={handleSaveAsTemplate}
        isPublished={false}
        isSaving={saving}
      >
        <div className="flex flex-col min-h-0">
          <PageRenderer
            schema={schema}
            pageId={currentPageId}
            globalFilters={globalFilters}
            onFilterChange={handleFilterChange}
            onDrilldown={handleDrilldown}
            isReadOnly={false}
            onOpenDataSource={handleOpenDataSource}
            onGenerateStarterDashboard={handleGenerateStarterDashboard}
            isGeneratingStarterDashboard={generatingStarterDashboard}
          />
          {/* Persistent AI prompt box (ChatGPT-style) - always visible in editor */}
          {(
            <div className="sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <div className="max-w-4xl mx-auto px-4 py-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={inlineAiPrompt}
                      onChange={e => setInlineAiPrompt(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAiSubmit(inlineAiPrompt.trim())
                        }
                      }}
                      placeholder="Ask AI to build your app… e.g. Create a Data tab with a table and a Graph tab with bar chart and pie chart like Tableau"
                      rows={2}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none text-sm placeholder-gray-400"
                      disabled={aiLoading}
                    />
                    <button
                      type="button"
                      onClick={() => handleAiSubmit(inlineAiPrompt.trim())}
                      disabled={aiLoading || !inlineAiPrompt.trim()}
                      className="absolute right-2 bottom-2 p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Send"
                    >
                      {aiLoading ? (
                        <span className="inline-block w-5 h-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 2 9 18z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                {aiError && !showAiModal && (
                  <p className="mt-2 text-sm text-red-600">{aiError}</p>
                )}
                {dataMetadata?.columns?.length > 0 && (
                  <p className="mt-1.5 text-xs text-gray-500 truncate">
                    Columns: {dataMetadata.columns.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </AppShell>

      {/* Data Source / API configuration modal */}
      {showDataSourceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data source &amp; API</h3>
            <p className="text-sm text-gray-600 mb-4">
              Configure where your report gets its data. Use a built-in dataset or your own API that returns JSON (array or &#123; data: [] &#125;).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">App name</label>
                <input
                  type="text"
                  value={dataSourceForm.appName}
                  onChange={e => setDataSourceForm(prev => ({ ...prev, appName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Sales Report"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data source</label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={dataSourceForm.sourceType === 'builtin'}
                      onChange={() => setDataSourceForm(prev => ({ ...prev, sourceType: 'builtin' }))}
                      className="text-blue-600"
                    />
                    <span>Built-in dataset</span>
                  </label>
                  {dataSourceForm.sourceType === 'builtin' && (
                    <select
                      value={dataSourceForm.builtinId}
                      onChange={e => setDataSourceForm(prev => ({ ...prev, builtinId: e.target.value }))}
                      className="ml-6 w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {builtInDatasets.map(d => (
                        <option key={d.id} value={d.id}>{d.id}</option>
                      ))}
                      {builtInDatasets.length === 0 && (
                        <option value={dataSourceForm.builtinId}>{dataSourceForm.builtinId}</option>
                      )}
                    </select>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sourceType"
                      checked={dataSourceForm.sourceType === 'custom'}
                      onChange={() => setDataSourceForm(prev => ({ ...prev, sourceType: 'custom' }))}
                      className="text-blue-600"
                    />
                    <span>Custom API URL</span>
                  </label>
                  {dataSourceForm.sourceType === 'custom' && (
                    <input
                      type="url"
                      value={dataSourceForm.customUrl}
                      onChange={e => setDataSourceForm(prev => ({ ...prev, customUrl: e.target.value }))}
                      placeholder="https://api.example.com/data or /api/my-data"
                      className="ml-6 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDataSourceModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDataSource}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Add filters/widgets modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add with AI</h3>
              <button
                type="button"
                onClick={() => { setShowAiModal(false); setAiError(null); setAiPrompt(''); }}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Describe what you want to add: filters (dropdown, date range, checkbox), KPIs, or charts. Use column names from your data.
              </p>
              {loadingDataMetadata && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-emerald-600 border-t-transparent" />
                  Loading data to get columns…
                </div>
              )}
              {dataMetadata?.columns?.length > 0 && (
                <p className="text-xs text-gray-500">
                  Available columns: {dataMetadata.columns.join(', ')}
                </p>
              )}
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Add a Region dropdown, a date range filter, and a KPI for Total Sales"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={aiLoading || loadingDataMetadata}
              />
              {aiError && (
                <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{aiError}</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => { setShowAiModal(false); setAiError(null); setAiPrompt(''); }}
                className="px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAiSubmit}
                disabled={aiLoading || !(aiPrompt || '').trim() || loadingDataMetadata || !dataMetadata?.data?.length}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {aiLoading ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Adding…
                  </>
                ) : (
                  'Add to dashboard'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data & Metadata modal */}
      {showDataMetadataModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Data &amp; Metadata</h3>
              <div className="flex items-center gap-2">
                {dataMetadata && !dataMetadata.error && (
                  <button
                    type="button"
                    onClick={handleRefreshDataMetadata}
                    disabled={loadingDataMetadata}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    Refresh
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDataMetadataModal(false)}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex-1 min-h-0">
              {loadingDataMetadata && (
                <div className="flex items-center justify-center py-12">
                  <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
                  <span className="ml-3 text-gray-600">Loading source data...</span>
                </div>
              )}
              {!loadingDataMetadata && dataMetadata?.error && (
                <div className="py-6 text-center text-red-600">{dataMetadata.error}</div>
              )}
              {!loadingDataMetadata && dataMetadata && !dataMetadata.error && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 uppercase">Endpoint</div>
                      <div className="text-sm text-gray-900 truncate" title={dataMetadata.endpoint}>{dataMetadata.endpoint}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 uppercase">Rows</div>
                      <div className="text-sm font-semibold text-gray-900">{dataMetadata.rowCount}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 uppercase">Columns</div>
                      <div className="text-sm font-semibold text-gray-900">{dataMetadata.columns?.length ?? 0}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-gray-500 uppercase">Column names</div>
                      <div className="text-xs text-gray-700 truncate" title={dataMetadata.columns?.join(', ')}>{dataMetadata.columns?.slice(0, 3).join(', ')}{(dataMetadata.columns?.length ?? 0) > 3 ? '…' : ''}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setDataMetadataView('table')}
                      className={`px-3 py-1.5 text-sm rounded-lg ${dataMetadataView === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      Table
                    </button>
                    <button
                      type="button"
                      onClick={() => setDataMetadataView('json')}
                      className={`px-3 py-1.5 text-sm rounded-lg ${dataMetadataView === 'json' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      JSON
                    </button>
                    <button
                      type="button"
                      onClick={handleSyncFiltersFromData}
                      className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
                    >
                      Add Region &amp; Product filters + fix chart data
                    </button>
                  </div>
                  {dataMetadataView === 'table' && (
                    <div className="border border-gray-200 rounded-lg overflow-auto max-h-[50vh]">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {(dataMetadata.columns || []).map(col => (
                              <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(dataMetadata.data || []).slice(0, 200).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {(dataMetadata.columns || []).map(col => (
                                <td key={col} className="px-3 py-2 text-gray-900 max-w-xs truncate" title={String(row[col] ?? '')}>{String(row[col] ?? '')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {(dataMetadata.data?.length ?? 0) > 200 && (
                        <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t">Showing first 200 of {dataMetadata.data.length} rows</div>
                      )}
                    </div>
                  )}
                  {dataMetadataView === 'json' && (
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-auto max-h-[50vh]">
                      {JSON.stringify((dataMetadata.data || []).slice(0, 50), null, 2)}
                      {(dataMetadata.data?.length ?? 0) > 50 && `\n\n... and ${dataMetadata.data.length - 50} more rows`}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
