import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPost, updatePost } from '../services/postsService'

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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

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
            Thumbnail image URL <span className="text-gray-400 font-normal">(optional)</span>
          </label>
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
          <p className="mt-1 text-xs text-gray-500">Paste a new URL or clear to remove the thumbnail. Saving will update it.</p>
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
