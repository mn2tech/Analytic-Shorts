/**
 * Publish a link post to the feed (Hospital Bed Command Center, Federal Entry Report, etc.)
 * Used when "Add to Feed" is clicked on template pages.
 */
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import { createPost } from '../services/postsService'

/** Command center blueprint image - used as thumbnail when sharing to feed */
const HOSPITAL_BLUEPRINT_IMAGE = (() => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || ''
  const path = `${base}/hospital-blueprint.png`
  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).href
  }
  return path
})()

const MEDSTAR_ER_IMAGE = (() => {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || ''
  const path = `${base}/medstar-montgomery-er2.png`
  if (typeof window !== 'undefined') {
    return new URL(path, window.location.origin).href
  }
  return path
})()

const TEMPLATES = {
  'hospital-bed': {
    title: 'Hospital Bed Command Center',
    caption: 'Visual blueprint of hospital rooms — color-coded by bed status',
    linkUrl: '/hospital-bed-command-center',
    tags: ['hospital', 'healthcare', 'command-center'],
    thumbnailUrl: HOSPITAL_BLUEPRINT_IMAGE,
  },
  'hospital-er-causation-poll': {
    title: 'ER Overcrowding Poll: Primary Delay Cause?',
    caption: 'Live poll for ER causation review. Vote in comments with one option: A) Waiting Provider, B) Boarding Hold, C) Awaiting Results, D) Consult Pending, E) Transfer/Transport Delay, F) Disposition Pending. Include a short why.',
    linkUrl: '/hospital-bed-command-center',
    tags: ['hospital', 'er', 'poll', 'delay-causation', 'command-center'],
    thumbnailUrl: HOSPITAL_BLUEPRINT_IMAGE,
  },
  'medstar-er-command-center': {
    title: 'MedStar Montgomery ER Command Center',
    caption: 'Interactive MedStar Montgomery ER floor-map operations view with live room status overlays',
    linkUrl: '/medstar-montgomery-er-command-center',
    tags: ['hospital', 'er', 'medstar', 'command-center'],
    thumbnailUrl: MEDSTAR_ER_IMAGE,
  },
  'medstar-er-causation-poll': {
    title: 'MedStar ER Poll: Primary Delay Cause?',
    caption: 'Live poll for MedStar Montgomery ER operations review. Vote in comments with one option: A) Waiting Provider, B) Boarding Hold, C) Awaiting Results, D) Consult Pending, E) Transfer/Transport Delay, F) Disposition Pending. Include a short why.',
    linkUrl: '/medstar-montgomery-er-command-center',
    tags: ['hospital', 'er', 'medstar', 'poll', 'delay-causation', 'command-center'],
    thumbnailUrl: MEDSTAR_ER_IMAGE,
  },
  'federal-entry': {
    title: 'Federal Entry Intelligence Report',
    caption: 'SAM.gov market posture assessment, first-win shortlist, and capture strategy',
    linkUrl: '/reports/federal-entry',
    tags: ['federal', 'govcon', 'SAM.gov'],
  },
}

export default function PublishLink() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useNotification()
  const templateKey = searchParams.get('template') || 'hospital-bed'
  const template = TEMPLATES[templateKey] || TEMPLATES['hospital-bed']

  const [title, setTitle] = useState(template.title)
  const [caption, setCaption] = useState(template.caption)
  const [tagsStr, setTagsStr] = useState(template.tags.join(', '))
  const [visibility, setVisibility] = useState('public')
  const [thumbnailUrl, setThumbnailUrl] = useState(template.thumbnailUrl || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const tags = tagsStr.trim() ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : []
      const linkUrl = template.linkUrl.startsWith('/') ? template.linkUrl : `/${template.linkUrl}`
      const post = await createPost({
        linkUrl,
        link_url: linkUrl, // backend accepts both camelCase and snake_case
        title: title.trim(),
        caption: caption.trim() || undefined,
        tags,
        visibility,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
      })
      notify('Added to Feed!', 'success')
      navigate(`/post/${post.id}`)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to add to feed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Add to Feed</h1>
      <p className="text-sm text-gray-500 mb-6">
        Share <strong>{template.title}</strong> with the community. This will create a post linking to the page.
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
            placeholder="Post title"
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
            placeholder="e.g. hospital, healthcare"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="thumbnailUrl" className="block text-sm font-medium text-gray-700 mb-1">
            Thumbnail URL <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="thumbnailUrl"
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder="https://..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
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
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
            <option value="org">Org</option>
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Adding…' : 'Add to Feed'}
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
