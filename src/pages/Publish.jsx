import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { createPost } from '../services/postsService'
import { getDashboard } from '../services/dashboardService'
import { generateShareId, saveSharedDashboard } from '../utils/shareUtils'
import apiClient from '../config/api'
import html2canvas from 'html2canvas'
import DashboardRenderer from '../components/aiVisualBuilder/DashboardRenderer'
import LegacyDashboardPreview from '../components/LegacyDashboardPreview'
import SharedAAIStudioRunView from '../components/SharedAAIStudioRunView'

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public' },
  { value: 'unlisted', label: 'Unlisted' },
  { value: 'private', label: 'Private' },
  { value: 'org', label: 'Org' }
]

export default function Publish() {
  const { dashboardId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useNotification()
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [capturing, setCapturing] = useState(false)
  const [previewDashboard, setPreviewDashboard] = useState(null)
  const captureRef = useRef(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  const handleCaptureThumbnail = async () => {
    if (!dashboardId) return
    setCapturing(true)
    setError(null)
    try {
      const dashboard = await getDashboard(dashboardId)
      setPreviewDashboard(dashboard)
      await new Promise((r) => setTimeout(r, 1200))
      const el = captureRef.current
      if (!el) {
        setError('Could not find dashboard preview to capture.')
        setPreviewDashboard(null)
        setCapturing(false)
        return
      }
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      })
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.9))
      if (!blob) {
        setError('Failed to create thumbnail image.')
        setPreviewDashboard(null)
        setCapturing(false)
        return
      }
      const form = new FormData()
      form.append('thumbnail', blob, 'thumbnail.png')
      const { data } = await apiClient.post('/api/thumbnail-upload', form)
      const url = data?.url
      if (url) {
        // Store URL as returned (relative path); PostThumbnail resolves with API_BASE_URL when displaying.
        setThumbnailUrl(url)
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to capture thumbnail')
    } finally {
      setPreviewDashboard(null)
      setCapturing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!dashboardId || !title.trim()) {
      setError('Title is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const tags = tagsStr.trim() ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : []
      let shareId = null
      try {
        const dashboard = await getDashboard(dashboardId)
        const isStudio = dashboard.dashboard_view === 'studio' || dashboard.schema
        let payload
        if (isStudio && dashboard.schema) {
          let spec = dashboard.schema
          if (typeof spec === 'string') {
            try { spec = JSON.parse(spec) } catch (_) {}
          }
          if (spec?.type === 'aaiStudioRun') {
            payload = {
              dashboardType: 'aaiStudioRun',
              runId: spec.runId,
              templateId: spec.templateId,
              insightBlocks: spec.insightBlocks,
              sceneGraph: spec.sceneGraph,
              datasetProfile: spec.datasetProfile,
              filters: spec.filters,
              dashboardTitle: dashboard.name,
            }
          } else {
            let rows = dashboard.data || []
            const datasetId = spec?.datasetId
            if ((!Array.isArray(rows) || rows.length === 0) && typeof datasetId === 'string' && datasetId && datasetId !== 'upload') {
              try {
                const resp = await apiClient.get(`/api/ai/dataset-data?dataset=${encodeURIComponent(datasetId)}`)
                rows = resp?.data?.data || rows
              } catch (_) {}
            }
            if (Array.isArray(rows) && rows.length > 0) {
              payload = { dashboardType: 'dashboardSpec', spec, data: rows }
            }
          }
        } else {
          payload = {
            name: dashboard.name,
            dashboardTitle: dashboard.name,
            data: dashboard.data,
            columns: dashboard.columns,
            numericColumns: dashboard.numeric_columns,
            categoricalColumns: dashboard.categorical_columns,
            dateColumns: dashboard.date_columns,
            selectedNumeric: dashboard.selected_numeric,
            selectedCategorical: dashboard.selected_categorical,
            selectedDate: dashboard.selected_date,
            opportunityKeyword: dashboard.opportunity_keyword || '',
            dashboardView: dashboard.dashboard_view || 'advanced'
          }
        }
        if (payload) {
          shareId = generateShareId()
          const result = await saveSharedDashboard(shareId, payload)
          if (!result?.ok) shareId = null
        }
      } catch (_) {
        shareId = null
      }
      const post = await createPost({
        dashboardId,
        title: title.trim(),
        caption: caption.trim() || undefined,
        tags,
        visibility,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        shareId: shareId || undefined
      })
      notify('Post published!', 'success')
      navigate(`/post/${post.id}`)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to publish')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Publish Analytics Short</h1>
      <p className="text-sm text-gray-500 mb-6">Make sure your dashboard is saved (Studio or My Dashboards) so the full dashboard is available when others view this post.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short title for your dashboard"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label htmlFor="caption" className="block text-sm font-medium text-gray-700 mb-1">
            Caption
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Optional description"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags (comma-separated)
          </label>
          <input
            id="tags"
            type="text"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
            placeholder="e.g. sales, Q4, revenue"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Thumbnail <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleCaptureThumbnail}
              disabled={capturing || !dashboardId}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {capturing ? 'Capturing dashboard…' : 'Capture thumbnail from dashboard'}
            </button>
            <input
              id="thumbnailUrl"
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="Or paste image URL"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        {previewDashboard && (
          <div
            ref={captureRef}
            className="fixed left-[-9999px] top-0 z-[-1] overflow-auto rounded-lg border border-gray-200 bg-slate-50"
            style={{ width: 640, height: 360 }}
          >
            {previewDashboard.schema ? (
              (() => {
                const spec = typeof previewDashboard.schema === 'string' ? (() => { try { return JSON.parse(previewDashboard.schema) } catch (_) { return null } })() : previewDashboard.schema
                const rows = Array.isArray(previewDashboard.data) ? previewDashboard.data : []
                if (spec?.type === 'aaiStudioRun') {
                  const sharedData = {
                    dashboardType: 'aaiStudioRun',
                    templateId: spec.templateId,
                    insightBlocks: spec.insightBlocks,
                    sceneGraph: spec.sceneGraph,
                    filters: spec.filters,
                    dashboardTitle: previewDashboard.name,
                  }
                  return (
                    <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: 1280, height: 720 }}>
                      <SharedAAIStudioRunView sharedData={sharedData} />
                    </div>
                  )
                }
                if (spec && rows.length) {
                  return (
                    <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: 1280, height: 720 }}>
                      <DashboardRenderer spec={spec} data={rows} filterValues={{}} onFilterChange={() => {}} />
                    </div>
                  )
                }
                return (
                  <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No preview for this dashboard. Use &quot;Or paste image URL&quot; below to add a thumbnail.
                  </div>
                )
              })()
            ) : (
              <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: 1280, height: 720 }}>
                <LegacyDashboardPreview dashboard={previewDashboard} chartFilter={null} onChartFilter={() => {}} />
              </div>
            )}
          </div>
        )}
        <div>
          <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
            Visibility
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Publishing…' : 'Publish'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
