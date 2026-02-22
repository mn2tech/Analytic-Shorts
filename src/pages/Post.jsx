import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotification } from '../contexts/NotificationContext'
import Loader from '../components/Loader'
import DashboardRenderer from '../components/aiVisualBuilder/DashboardRenderer'
import LegacyDashboardPreview from '../components/LegacyDashboardPreview'
import {
  getPost,
  getPostDashboard,
  getComments,
  addComment,
  toggleLike,
  toggleSave,
  createOrGetLiveSession,
  getPostActiveSession,
  deletePost
} from '../services/postsService'
import { followUser, unfollowUser } from '../services/followService'

const VISIBILITY_LABELS = { public: 'Public', private: 'Private', org: 'Org', unlisted: 'Unlisted' }

export default function Post() {
  const { id } = useParams()
  const { user } = useAuth()
  const { notify } = useNotification()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [saved, setSaved] = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  const [filterValues, setFilterValues] = useState({})
  const [legacyChartFilter, setLegacyChartFilter] = useState(null)
  const [dashboardError, setDashboardError] = useState(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [followed, setFollowed] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      setError(null)
      setDashboardError(null)
      try {
        const [postRes, commentsRes] = await Promise.all([getPost(id), getComments(id)])
        if (cancelled) return
        setPost(postRes)
        setComments(commentsRes.comments || [])
        setLiked(!!postRes.liked_by_me)
        setLikeCount(postRes.like_count ?? 0)
        setSaved(!!postRes.saved_by_me)
        setFollowed(!!postRes.author_followed_by_me)
        try {
          const dash = await getPostDashboard(id)
          if (!cancelled) {
            setDashboard(dash)
            setDashboardError(null)
          }
        } catch (dashErr) {
          if (!cancelled) {
            setDashboard(null)
            setDashboardError(dashErr.response?.data?.error || dashErr.message || 'Dashboard failed to load')
          }
        }
        try {
          const data = await getPostActiveSession(id)
          if (!cancelled && data?.session?.status === 'active') setActiveSession(data.session)
        } catch {
          // ignore
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || err.message || 'Failed to load post')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, user])

  useEffect(() => {
    setIframeLoaded(false)
  }, [post?.share_id])

  const handleLike = async () => {
    if (!user) return
    setLiked((p) => !p)
    setLikeCount((c) => (liked ? c - 1 : c + 1))
    try {
      const res = await toggleLike(id)
      setLiked(res.liked)
      setLikeCount(res.like_count)
    } catch {
      setLiked(liked)
      setLikeCount(likeCount)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaved((p) => !p)
    try {
      const res = await toggleSave(id)
      setSaved(res.saved)
    } catch {
      setSaved(saved)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!user || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      const newComment = await addComment(id, commentText.trim())
      setComments((prev) => [...prev, newComment])
      setCommentText('')
    } catch (err) {
      console.error(err)
    } finally {
      setSubmittingComment(false)
    }
  }

  const handleGoLive = async () => {
    if (!user) return
    try {
      const { sessionId } = await createOrGetLiveSession(id)
      navigate(`/live/${sessionId}`)
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!user || !post || String(post.author_id) !== String(user.id)) return
    if (!window.confirm('Delete this post? This cannot be undone.')) return
    try {
      await deletePost(id)
      notify('Post deleted.', 'success')
      navigate('/feed')
    } catch (err) {
      console.error(err)
      notify(err.response?.data?.error || err.message || 'Failed to delete post', 'error')
    }
  }

  const isAuthor = !!user && !!post && String(post.author_id) === String(user.id)

  if (loading && !post) return <Loader />
  if (error || !post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3">
          {error || 'Post not found'}
        </div>
        <Link to="/feed" className="mt-4 inline-block text-blue-600 hover:underline">← Back to Feed</Link>
      </div>
    )
  }

  const spec = dashboard?.schema
    ? (typeof dashboard.schema === 'string' ? JSON.parse(dashboard.schema) : dashboard.schema)
    : null
  const rows = Array.isArray(dashboard?.data) ? dashboard.data : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4">
        <Link to="/feed" className="text-blue-600 hover:underline">← Feed</Link>
      </div>
      <header className="mb-6">
        {post.thumbnail_url && (
          <div className="aspect-video rounded-lg overflow-hidden bg-slate-100 mb-4 max-w-2xl">
            <img src={post.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
            {post.author_avatar_url ? (
              <img
                src={post.author_avatar_url}
                alt=""
                className="w-full h-full object-cover"
                style={
                  post.author_avatar_focal
                    ? { objectPosition: `${post.author_avatar_focal.x}% ${post.author_avatar_focal.y}%` }
                    : undefined
                }
              />
            ) : (
              (() => {
                const n = post.author_display_name || (post.author_id ? String(post.author_id).slice(0, 8) + '…' : 'Anonymous')
                const parts = String(n).trim().split(/\s+/)
                return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2) : String(n).slice(0, 2).toUpperCase()
              })()
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{post.author_display_name || (post.author_id ? String(post.author_id).slice(0, 8) + '…' : 'Anonymous')}</p>
            <p className="text-sm text-gray-500">
              {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
              {post.visibility && post.visibility !== 'public' && ` · ${VISIBILITY_LABELS[post.visibility] || post.visibility}`}
            </p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
        {post.caption && <p className="mt-2 text-gray-600">{post.caption}</p>}
        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.tags.map((t) => (
              <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{t}</span>
            ))}
          </div>
        )}
        <div id="comments" className="flex items-center gap-4 mt-4 flex-wrap">
          {isAuthor && (
            <>
              <Link
                to={`/post/${id}/edit`}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                Edit post
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="text-sm text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                Delete post
              </button>
            </>
          )}
          {!isAuthor && user?.id && post.author_id && String(post.author_id) !== String(user.id) && (
            <>
              <button
                type="button"
                onClick={async () => {
                  setFollowLoading(true)
                  const prev = followed
                  setFollowed(!followed)
                  try {
                    const res = await (followed ? unfollowUser(post.author_id) : followUser(post.author_id))
                    setFollowed(!!res.following)
                  } catch {
                    setFollowed(prev)
                  } finally {
                    setFollowLoading(false)
                  }
                }}
                disabled={followLoading}
                className={`text-sm border px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 disabled:opacity-50 ${
                  followed ? 'text-gray-600 bg-gray-100 border-gray-200 hover:bg-gray-200' : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                }`}
              >
                {followLoading ? '…' : followed ? 'Following' : 'Follow'}
              </button>
              <Link
                to={`/messages?with=${post.author_id}`}
                className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Message
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={handleLike}
            disabled={!user}
            className={`flex items-center gap-1 text-sm ${liked ? 'text-red-600' : 'text-gray-500'}`}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{likeCount}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!user}
            className={`flex items-center gap-1 text-sm ${saved ? 'text-blue-600' : 'text-gray-500'}`}
          >
            {saved ? '🔖 Saved' : '📑 Save'}
          </button>
          {user && (
            <button
              type="button"
              onClick={handleGoLive}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700"
            >
              {activeSession ? 'Join Live' : 'Go Live'}
            </button>
          )}
        </div>
      </header>

      {post.share_id ? (
        <>
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Full dashboard below — use filters, map, and tables interactively.
            </p>
            <a
              href={`/dashboard/shared/${post.share_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm text-blue-600 hover:underline"
            >
              Open in new tab →
            </a>
          </div>
          <section className="mb-8 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm relative">
            {!iframeLoaded && (
              <div
                className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-xl z-10"
                style={{ minHeight: 400 }}
              >
                <div className="animate-pulse text-slate-400 text-sm">Loading dashboard…</div>
              </div>
            )}
            <iframe
              key={`dashboard-${post.share_id}`}
              title="Full dashboard"
              src={`/dashboard/shared/${post.share_id}`}
              className="w-full border-0 rounded-xl"
              style={{ minHeight: 'min(1200px, 85vh)' }}
              onLoad={() => {
                setTimeout(() => setIframeLoaded(true), 150)
              }}
            />
          </section>
        </>
      ) : (
        <section className="mb-8 rounded-lg border border-gray-200 bg-white overflow-hidden">
          {spec && rows.length > 0 ? (
            <DashboardRenderer
              spec={spec}
              data={rows}
              filterValues={filterValues}
              onFilterChange={setFilterValues}
            />
          ) : dashboard && !spec ? (
            <LegacyDashboardPreview dashboard={dashboard} chartFilter={legacyChartFilter} onChartFilter={setLegacyChartFilter} />
          ) : !dashboard ? (
            <div className="p-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-center">
              <p className="font-medium">Dashboard could not be loaded.</p>
              {dashboardError && <p className="mt-2 text-sm">{dashboardError}</p>}
              <p className="mt-3 text-sm">Make sure the dashboard is still in <Link to="/dashboards" className="text-blue-600 hover:underline">My Dashboards</Link> and was saved with data.</p>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">No data to display.</div>
          )}
        </section>
      )}

      <section className="border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Comments ({comments.length})</h2>
        {user && (
          <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submittingComment}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submittingComment ? '…' : 'Post'}
            </button>
          </form>
        )}
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="text-sm text-gray-700 border-b border-gray-100 pb-2">
              <span className="text-gray-500">{c.user_id ? String(c.user_id).slice(0, 8) + '…' : 'Anonymous'}</span>
              {' · '}
              {c.comment}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
