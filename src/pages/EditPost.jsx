import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPost, updatePost } from '../services/postsService'
import { getDashboard } from '../services/dashboardService'
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

export default function EditPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [useCustomThumbnailUrl, setUseCustomThumbnailUrl] = useState(false)
  const [captureView, setCaptureView] = useState('graph') // graph | full
  const [thumbnailColorStyle, setThumbnailColorStyle] = useState('original') // original | vibrant | muted
  const [loading, setLoading] = useState(true)
  const [capturing, setCapturing] = useState(false)
  const [previewDashboard, setPreviewDashboard] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const captureRef = useRef(null)

  const applyColorStyle = (canvas) => {
    if (!canvas || thumbnailColorStyle === 'original') return canvas
    const out = document.createElement('canvas')
    out.width = canvas.width
    out.height = canvas.height
    const ctx = out.getContext('2d', { willReadFrequently: true })
    if (!ctx) return canvas
    ctx.drawImage(canvas, 0, 0)
    const img = ctx.getImageData(0, 0, out.width, out.height)
    const d = img.data
    const profile = thumbnailColorStyle === 'vibrant'
      ? { sat: 1.45, contrast: 1.12, brightness: 1.04 }
      : { sat: 0.62, contrast: 0.96, brightness: 1.02 }
    const clamp = (n) => (n < 0 ? 0 : n > 255 ? 255 : n)
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i]
      let g = d[i + 1]
      let b = d[i + 2]
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
      r = lum + (r - lum) * profile.sat
      g = lum + (g - lum) * profile.sat
      b = lum + (b - lum) * profile.sat
      r = (r - 128) * profile.contrast + 128
      g = (g - 128) * profile.contrast + 128
      b = (b - 128) * profile.contrast + 128
      r *= profile.brightness
      g *= profile.brightness
      b *= profile.brightness
      d[i] = clamp(r)
      d[i + 1] = clamp(g)
      d[i + 2] = clamp(b)
    }
    ctx.putImageData(img, 0, 0)
    return out
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id || !user) return
      try {
        const p = await getPost(id)
        if (cancelled) return
        if (String(p.author_id) !== String(user.id)) {
          navigate(`/post/${id}`)
          return
        }
        setPost(p)
        setTitle(p.title || '')
        setCaption(p.caption || '')
        setTagsStr(Array.isArray(p.tags) ? p.tags.join(', ') : '')
        setVisibility(p.visibility || 'public')
        setThumbnailUrl(p.thumbnail_url || '')
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message || 'Failed to load post')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, user, navigate])

  const handleCaptureThumbnail = async () => {
    const dashboardId = post?.dashboard_id
    if (!dashboardId) {
      setError('This post is not linked to a dashboard, so graph capture is unavailable.')
      return
    }
    setCapturing(true)
    setError(null)
    try {
      const dashboard = await getDashboard(dashboardId)
      setPreviewDashboard(dashboard)
      await new Promise((r) => setTimeout(r, 1200))
      const root = captureRef.current
      if (!root) {
        setError('Could not find dashboard preview to capture.')
        setPreviewDashboard(null)
        setCapturing(false)
        return
      }
      const graphCandidate = root.querySelector('.recharts-wrapper, svg, canvas')
      const targetEl = (captureView === 'graph' && graphCandidate) ? graphCandidate : root
      const canvasRaw = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc'
      })
      const canvas = applyColorStyle(canvasRaw)
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92))
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
      if (url) setThumbnailUrl(url)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to capture thumbnail')
    } finally {
      setPreviewDashboard(null)
      setCapturing(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!id || !title.trim()) {
      setError('Title is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const tags = tagsStr.trim() ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : []
      await updatePost(id, {
        title: title.trim(),
        caption: caption.trim() || null,
        tags,
        visibility,
        thumbnailUrl: thumbnailUrl.trim() || null
      })
      navigate(`/post/${id}`)
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to update post'
      const isNetworkError = !err.response && err.message === 'Network Error'
      setError(isNetworkError ? `${msg}. Check that the backend is running and reachable.` : msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null
  if (loading) return <div className="max-w-xl mx-auto px-4 py-8 text-gray-500">Loading…</div>
  if (!post) return <div className="max-w-xl mx-auto px-4 py-8 text-gray-500">Post not found.</div>

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit post</h1>
      <p className="text-sm text-gray-500 mb-6">
        <Link to={`/post/${id}`} className="text-blue-600 hover:underline">← Back to post</Link>
      </p>
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
            placeholder="Short title"
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
            placeholder="e.g. sales, Q4"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Thumbnail <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleCaptureThumbnail}
              disabled={capturing || !post?.dashboard_id}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {capturing ? 'Capturing dashboard graph…' : 'Generate thumbnail from dashboard graph'}
            </button>
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="text-xs text-gray-700">
                Capture view
                <select
                  value={captureView}
                  onChange={(e) => setCaptureView(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="graph">Graph only</option>
                  <option value="full">Full dashboard</option>
                </select>
              </label>
              <label className="text-xs text-gray-700">
                Display colors
                <select
                  value={thumbnailColorStyle}
                  onChange={(e) => setThumbnailColorStyle(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="original">Original</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="muted">Muted</option>
                </select>
              </label>
            </div>
            {thumbnailUrl && (
              <div className="rounded-lg border border-gray-200 p-2 bg-gray-50">
                <img src={thumbnailUrl} alt="" className="w-full h-36 object-cover rounded-md" />
                <p className="mt-1 text-xs text-gray-500">Thumbnail generated from {captureView === 'graph' ? 'graph view' : 'dashboard view'} ({thumbnailColorStyle}).</p>
              </div>
            )}
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={useCustomThumbnailUrl}
                onChange={(e) => setUseCustomThumbnailUrl(e.target.checked)}
              />
              Use custom image URL instead
            </label>
            {useCustomThumbnailUrl && (
              <div className="flex gap-2">
                <input
                  id="thumbnailUrl"
                  type="text"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://... or leave blank"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  autoComplete="url"
                />
                <button
                  type="button"
                  onClick={() => setThumbnailUrl('')}
                  className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  Clear
                </button>
              </div>
            )}
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
                    No preview available for this dashboard.
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
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          <Link
            to={`/post/${id}`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
