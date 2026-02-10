/**
 * Studio App - Editor for apps using DashboardSpec schema.
 * Replaces the old multi-page schema: dataset selector, prompt, Generate (POST /api/ai/dashboard-spec), DashboardRenderer, Save/Publish.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import { getDashboard, saveDashboard } from '../../studio/api/studioClient'
import { normalizeSchema, isPublished, isDashboardSpec } from '../../studio/utils/schemaUtils'
import DashboardRenderer from '../../components/aiVisualBuilder/DashboardRenderer'
import { getSuggestedPrompts } from '../../studio/utils/datasetPrompts'
import apiClient from '../../config/api'

const EXAMPLE_DATASET_IDS = ['sales', 'attendance', 'donations', 'medical', 'banking', 'yearly-income']
const UPLOAD_DATASET_ID = 'upload'

/** Build schema shape from upload API response for use with getSuggestedPrompts and renderer */
function buildSchemaFromUpload(res) {
  const { data, columns = [], numericColumns = [], dateColumns = [], rowCount } = res
  const fields = (columns || []).map((name) => ({
    name,
    type: (dateColumns || []).includes(name) ? 'date' : (numericColumns || []).includes(name) ? 'number' : 'string',
    examples: []
  }))
  return { rowCount: rowCount ?? (data?.length ?? 0), fields }
}

function getEmptyDashboardSpec() {
  return {
    title: 'Untitled App',
    filters: [],
    kpis: [],
    charts: [],
    layout: [],
    style: { theme: 'executive_clean' },
    warnings: [],
    datasetId: 'sales',
    metadata: {
      name: 'Untitled App',
      status: 'draft',
      version: '1.0.0',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
}

export default function StudioApp() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [schema, setSchema] = useState(null)
  const [datasetId, setDatasetId] = useState('sales')
  const [schemaPreview, setSchemaPreview] = useState(null)
  const [data, setData] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [promptHistory, setPromptHistory] = useState([])
  const [filterValues, setFilterValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)
  const [uploadedData, setUploadedData] = useState(null)
  const [uploadedSchema, setUploadedSchema] = useState(null)
  const [uploadedFileName, setUploadedFileName] = useState(null)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  // Load app
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        if (id === 'new') {
          const empty = getEmptyDashboardSpec()
          if (!cancelled) {
            setSchema(empty)
            setDatasetId(empty.datasetId || 'sales')
          }
        } else {
          const raw = await getDashboard(id)
          if (!raw) {
            if (!cancelled) setError('App not found')
            return
          }
          const normalized = normalizeSchema(raw)
          if (isPublished(normalized)) {
            navigate(`/apps/${id}`, { replace: true })
            return
          }
          if (!cancelled) {
            if (isDashboardSpec(normalized)) {
              setSchema(normalized)
              setDatasetId(normalized.datasetId || 'sales')
            } else {
              setSchema(getEmptyDashboardSpec())
              setDatasetId('sales')
            }
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load app')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  // Schema preview and data when dataset changes (or uploaded data)
  useEffect(() => {
    if (!datasetId) {
      setSchemaPreview(null)
      setData(null)
      return
    }
    if (datasetId === UPLOAD_DATASET_ID) {
      setSchemaPreview(uploadedSchema || null)
      setData(uploadedData || null)
      return
    }
    let cancelled = false
    setSchemaPreview(null)
    setData(null)
    apiClient.get('/api/ai/dataset-schema', { params: { dataset: datasetId } }).then((res) => {
      if (!cancelled) setSchemaPreview(res.data)
    }).catch(() => { if (!cancelled) setSchemaPreview(null) })
    apiClient.get('/api/ai/dataset-data', { params: { dataset: datasetId } }).then((res) => {
      if (!cancelled && res.data?.data) setData(res.data.data)
    }).catch(() => { if (!cancelled) setData(null) })
    return () => { cancelled = true }
  }, [datasetId, uploadedSchema, uploadedData])

  const handleGenerate = useCallback(async () => {
    const userPrompt = (prompt || '').trim()
    if (!userPrompt) {
      setGenError('Enter a prompt.')
      return
    }
    setGenerating(true)
    setGenError(null)
    try {
      const body = datasetId === UPLOAD_DATASET_ID && uploadedData?.length
        ? { userPrompt, existingSpec: schema || undefined, data: uploadedData }
        : { datasetId, userPrompt, existingSpec: schema || undefined }
      const res = await apiClient.post('/api/ai/dashboard-spec', body)
      const newSpec = res.data?.spec
      if (newSpec) {
        setSchema({
          ...newSpec,
          datasetId,
          metadata: {
            ...(schema?.metadata || {}),
            name: newSpec.title || schema?.metadata?.name || 'Untitled App',
            updated_at: new Date().toISOString()
          }
        })
        setPromptHistory((h) => [...h, { prompt: userPrompt }])
      } else {
        setGenError('No spec returned.')
      }
    } catch (err) {
      setGenError(err.response?.data?.message || err.response?.data?.error || err.message || 'Generate failed')
    } finally {
      setGenerating(false)
    }
  }, [datasetId, prompt, schema, uploadedData])

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

  const handleSave = async () => {
    if (!schema) return
    setSaving(true)
    try {
      const toSave = {
        ...schema,
        datasetId,
        metadata: {
          ...schema.metadata,
          name: schema.title || schema.metadata?.name || 'Untitled App',
          updated_at: new Date().toISOString()
        }
      }
      const saved = await saveDashboard(toSave, id === 'new' ? null : id)
      if (id === 'new') navigate(`/studio/app/${saved.id}`, { replace: true })
    } catch (err) {
      alert(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = useCallback(async () => {
    if (id === 'new') return
    const url = `${window.location.origin}/apps/${id}`
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch (_) {}
  }, [id])

  const handlePublish = async () => {
    if (!schema) return
    setSaving(true)
    try {
      const toSave = {
        ...schema,
        datasetId,
        metadata: {
          ...schema.metadata,
          name: schema.title || schema.metadata?.name || 'Untitled App',
          status: 'published',
          published_at: new Date().toISOString(),
          version: schema.metadata?.version || '1.0.0',
          updated_at: new Date().toISOString()
        }
      }
      const saved = await saveDashboard(toSave, id === 'new' ? null : id)
      navigate(`/apps/${saved.id}`, { replace: true })
    } catch (err) {
      alert(err.message || 'Failed to publish')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <p className="text-red-600">{error}</p>
        <button onClick={() => navigate('/studio')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
          Back to Studio
        </button>
      </div>
    )
  }

  if (!schema) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/studio')}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg"
              title="Back to Studio"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <input
              type="text"
              value={schema.title || ''}
              onChange={(e) => {
                const title = e.target.value || 'Untitled App'
                setSchema((s) => s ? {
                  ...s,
                  title,
                  metadata: { ...s.metadata, name: title, updated_at: new Date().toISOString() }
                } : null)
              }}
              placeholder="Untitled App"
              className="text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 py-0.5 min-w-[120px] max-w-[320px]"
              title="Dashboard title"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={id === 'new'}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
              title={id === 'new' ? 'Save first to share' : 'Copy link to clipboard'}
            >
              {shareCopied ? 'Copied!' : 'Share'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={saving}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
            >
              Publish
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: dataset + schema preview */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Dataset</h2>
              <select
                value={datasetId}
                onChange={(e) => setDatasetId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {uploadedData && (
                  <option value={UPLOAD_DATASET_ID}>
                    Your uploaded file{uploadedFileName ? ` (${uploadedFileName})` : ''}
                  </option>
                )}
                {EXAMPLE_DATASET_IDS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
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
            {schemaPreview && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-2">Schema</h2>
                <p className="text-xs text-gray-500 mb-2">{schemaPreview.rowCount} rows</p>
                <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                  {(schemaPreview.fields || []).map((f) => (
                    <li key={f.name} className="flex justify-between gap-2">
                      <span className="font-medium text-gray-700">{f.name}</span>
                      <span className="text-gray-500">{f.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Center: prompt + generate + suggested prompts */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Prompt</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Show revenue by month, add a date range filter and a bar chart by product top 10"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {generating ? 'Generating…' : 'Generate'}
              </button>
              {genError && <p className="mt-2 text-sm text-red-600">{genError}</p>}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Suggested prompts</h2>
              <p className="text-xs text-gray-500 mb-2">Based on dataset: {datasetId}</p>
              <ul className="space-y-1">
                {getSuggestedPrompts(datasetId, schemaPreview).map((label, i) => (
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
                <ul className="text-sm space-y-1 max-h-24 overflow-y-auto">
                  {promptHistory.slice().reverse().map((h, i) => (
                    <li key={i} className="text-gray-600 truncate">{h.prompt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right: preview */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-3">{schema.title || 'Preview'}</h2>
              <DashboardRenderer
                spec={schema}
                data={data}
                filterValues={filterValues}
                onFilterChange={setFilterValues}
                onFilterOrderChange={(newFilters) => setSchema((s) => (s ? { ...s, filters: newFilters } : null))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
