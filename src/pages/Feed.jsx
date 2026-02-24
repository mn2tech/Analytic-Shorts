import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loader from '../components/Loader'
import PostThumbnail from '../components/PostThumbnail'
import { getFeed, toggleLike, toggleSave, createOrGetLiveSession, deletePost } from '../services/postsService'
import { getDashboards } from '../services/dashboardService'
import { followUser, unfollowUser } from '../services/followService'
import { useNotification } from '../contexts/NotificationContext'

const FEED_TITLE = 'Analytics Shorts Feed'
const FEED_DESCRIPTION = 'Your analytics social feed — share dashboards, discover insights, and connect with the community.'

// Curated AI & analytics news links for sidebar (open in new tab)
const AI_ANALYTICS_NEWS = [
  { title: 'Latest in AI', source: 'TechCrunch', url: 'https://techcrunch.com/tag/artificial-intelligence/' },
  { title: 'AI & Machine Learning', source: 'VentureBeat', url: 'https://venturebeat.com/category/ai/' },
  { title: 'Data & Analytics', source: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/' },
  { title: 'AI News', source: 'Reuters', url: 'https://www.reuters.com/technology/artificial-intelligence/' },
  { title: 'Analytics & BI', source: 'CIO', url: 'https://www.cio.com/category/data-analytics/' },
]

function getFeedShareUrl() {
  if (typeof window === 'undefined') return ''
  return window.location.origin + '/feed'
}

async function copyFeedLink() {
  const url = getFeedShareUrl()
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url)
    return true
  }
  return false
}

function openLinkedInShare() {
  const url = encodeURIComponent(getFeedShareUrl())
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer,width=600,height=600')
}

function openTwitterShare() {
  const url = getFeedShareUrl()
  const text = encodeURIComponent(`${FEED_TITLE} – ${FEED_DESCRIPTION}`)
  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${text}`, '_blank', 'noopener,noreferrer,width=550,height=420')
}

function openFacebookShare() {
  const url = encodeURIComponent(getFeedShareUrl())
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'noopener,noreferrer,width=600,height=400')
}

const VISIBILITY_LABELS = { public: 'Public', private: 'Private', org: 'Org', unlisted: 'Unlisted' }

function getRelativeTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffM = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffM < 1) return 'Just now'
  if (diffM < 60) return `${diffM}m ago`
  if (diffH < 24) return `${diffH}h ago`
  if (diffD === 1) return 'Yesterday'
  if (diffD < 7) return `${diffD}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

function getInitials(name) {
  if (!name || !String(name).trim()) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return String(name).slice(0, 2).toUpperCase()
}

function isPostByCurrentUser(post, user) {
  if (!user?.id) return false
  const authorId = post.author_id ?? post.authorId
  if (authorId == null || authorId === '') return false
  return String(authorId).toLowerCase() === String(user.id).toLowerCase()
}

function PostCard({ post, onLike, onSave, onGoLive, onDelete, onFollow, isAuthenticated, isAuthor, navigate, currentUserId }) {
  const [liked, setLiked] = useState(post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0)
  const [saved, setSaved] = useState(post.saved_by_me)
  const [followed, setFollowed] = useState(post.author_followed_by_me)
  const [followLoading, setFollowLoading] = useState(false)
  const [liveLoading, setLiveLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLike = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return
    setLiked((prev) => !prev)
    setLikeCount((c) => (liked ? c - 1 : c + 1))
    try {
      const res = await onLike(post.id)
      setLiked(res.liked)
      setLikeCount(res.like_count)
    } catch {
      setLiked(liked)
      setLikeCount(likeCount)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return
    setSaved((prev) => !prev)
    try {
      const res = await onSave(post.id)
      setSaved(res.saved)
    } catch {
      setSaved(saved)
    }
  }

  const handleGoLive = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return
    setLiveLoading(true)
    try {
      const { sessionId } = await onGoLive(post.id)
      if (navigate) navigate(`/live/${sessionId}`)
      else window.location.href = `/live/${sessionId}`
    } catch (err) {
      console.error(err)
    } finally {
      setLiveLoading(false)
    }
  }

  const handleFollow = async (e) => {
    e.preventDefault()
    if (!isAuthenticated || !post.author_id || !onFollow) return
    setFollowLoading(true)
    const prev = followed
    setFollowed(!followed)
    try {
      const res = await onFollow(post.author_id, !followed)
      setFollowed(res.following)
    } catch {
      setFollowed(prev)
    } finally {
      setFollowLoading(false)
    }
  }

  const authorLabel = post.author_display_name || 'Anonymous'
  const relativeTime = getRelativeTime(post.created_at)
  const initials = getInitials(post.author_display_name || authorLabel)
  const avatarUrl = post.author_avatar_url
  const focal = post.author_avatar_focal
  const avatarStyle = avatarUrl && focal ? { objectPosition: `${focal.x}% ${focal.y}%` } : undefined

  return (
    <article className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Author row - like LinkedIn/social */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" style={avatarStyle} />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{authorLabel}</p>
            <p className="text-xs text-gray-500">
              {relativeTime}
              {post.visibility && post.visibility !== 'public' && (
                <span className="ml-1.5">· {VISIBILITY_LABELS[post.visibility] || post.visibility}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isAuthor && isAuthenticated && post.author_id && String(post.author_id) !== String(currentUserId) && (
            <>
              <button
                type="button"
                onClick={handleFollow}
                disabled={followLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  followed ? 'text-gray-600 bg-gray-100 hover:bg-gray-200' : 'text-blue-600 hover:bg-blue-50'
                }`}
                title={followed ? `Unfollow ${authorLabel}` : `Follow ${authorLabel}`}
              >
                {followLoading ? '…' : followed ? 'Following' : 'Follow'}
              </button>
              <Link
                to={`/messages?with=${post.author_id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                title={`Message ${authorLabel}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Message
              </Link>
            </>
          )}
        {isAuthor && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Post options"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-40 py-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  <Link
                    to={`/post/${post.id}/edit`}
                    className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      setMenuOpen(false)
                      if (window.confirm('Delete this post? This cannot be undone.')) onDelete?.(post.id)
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Content - thumbnail only; click goes to main report */}
      <div className="px-4 pb-3">
        <Link to={`/post/${post.id}`} className="block rounded-lg overflow-hidden border border-gray-100 aspect-video bg-slate-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
          <PostThumbnail url={post.thumbnail_url ?? post.thumbnailUrl} title={post.title} className="w-full h-full" />
        </Link>
        <p className="font-semibold text-gray-900 mt-2 line-clamp-1 text-sm">{post.title}</p>
      </div>

      {/* Action bar - like LinkedIn */}
      <div className="flex items-center border-t border-gray-100 px-2">
        <button
          type="button"
          onClick={handleLike}
          disabled={!isAuthenticated}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm rounded-lg transition-colors ${liked ? 'text-red-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
        >
          <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
          <span>{likeCount > 0 ? likeCount : 'Like'}</span>
        </button>
        <Link
          to={`/post/${post.id}#comments`}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 rounded-lg transition-colors"
        >
          <span className="text-lg">💬</span>
          <span>{post.comment_count ?? 0} Comments</span>
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isAuthenticated}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm rounded-lg transition-colors ${saved ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
        >
          <span className="text-lg">{saved ? '🔖' : '📑'}</span>
          <span>Save</span>
        </button>
        <button
          type="button"
          onClick={handleGoLive}
          disabled={!isAuthenticated || liveLoading}
          className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {liveLoading ? '…' : 'Go Live'}
        </button>
      </div>
    </article>
  )
}

export default function Feed() {
  const { user, userProfile } = useAuth()
  const { notify } = useNotification()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [scope, setScope] = useState('public')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [dashboards, setDashboards] = useState([])
  const [dashboardsLoading, setDashboardsLoading] = useState(false)

  const loadFeed = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFeed(scope)
      setPosts(data.posts || [])
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load feed')
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFeed()
  }, [scope])

  const handleLike = (postId) => toggleLike(postId)
  const handleSave = (postId) => toggleSave(postId)
  const handleGoLive = (postId) => createOrGetLiveSession(postId)
  const handleDelete = async (postId) => {
    try {
      await deletePost(postId)
      setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)))
      notify('Post deleted.', 'success')
    } catch (err) {
      console.error(err)
      const msg = err.response?.data?.error || err.message || 'Failed to delete post'
      notify(msg, 'error')
    }
  }

  const handleFollow = async (authorId, follow) => {
    if (follow) return await followUser(authorId)
    return await unfollowUser(authorId)
  }

  const handleCopyLink = async () => {
    const ok = await copyFeedLink()
    if (ok) {
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  const handleNativeShare = async () => {
    if (typeof navigator.share !== 'function') return
    try {
      await navigator.share({
        title: FEED_TITLE,
        text: FEED_DESCRIPTION,
        url: getFeedShareUrl()
      })
      setShareOpen(false)
    } catch (err) {
      if (err.name !== 'AbortError') console.error(err)
    }
  }

  const openCompose = () => {
    setComposeOpen(true)
    setDashboards([])
    setDashboardsLoading(true)
    getDashboards()
      .then((list) => setDashboards(Array.isArray(list) ? list : []))
      .catch(() => setDashboards([]))
      .finally(() => setDashboardsLoading(false))
  }

  const handleSelectDashboard = (dashboardId) => {
    setComposeOpen(false)
    navigate(`/publish/${dashboardId}`)
  }

  const composerDisplayName = userProfile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'You'
  const composerInitials = getInitials(composerDisplayName)
  const composerAvatarUrl = userProfile?.avatar_url
  const composerFocal = userProfile?.preferences?.avatar_focal

  const scopeTabs = [
    { value: 'public', label: 'For you' },
    ...(user ? [{ value: 'following', label: 'Following' }] : []),
    ...(user ? [{ value: 'saved', label: 'Saved' }] : []),
    ...(user ? [{ value: 'mine', label: 'Mine' }] : []),
    ...(user ? [{ value: 'all', label: 'All' }] : []),
    { value: 'trending', label: 'Trending' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200/80 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4">
          {/* Top row: title + actions */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {user ? (
                <Link
                  to="/profile"
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden ring-1 ring-gray-200/80 hover:ring-blue-300 transition-shadow"
                  title="Profile"
                >
                  {composerAvatarUrl ? (
                    <img
                      src={composerAvatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      style={composerFocal ? { objectPosition: `${composerFocal.x}% ${composerFocal.y}%` } : undefined}
                    />
                  ) : (
                    composerInitials
                  )}
                </Link>
              ) : null}
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">Feed</h1>
                {!user && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">Share dashboards & discover insights</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShareOpen((o) => !o)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                  aria-expanded={shareOpen}
                  aria-haspopup="true"
                  title="Share feed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                {shareOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setShareOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-52 py-1 bg-white border border-gray-200 rounded-xl shadow-lg">
                      <button type="button" onClick={() => { openLinkedInShare(); setShareOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl">in LinkedIn</button>
                      <button type="button" onClick={() => { openTwitterShare(); setShareOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">𝕏 X</button>
                      <button type="button" onClick={() => { openFacebookShare(); setShareOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Facebook</button>
                      <button type="button" onClick={() => { handleCopyLink(); setShareOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">
                        {linkCopied ? '✓ Copied' : 'Copy link'}
                      </button>
                      {typeof navigator.share === 'function' && (
                        <button type="button" onClick={handleNativeShare} className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100">More…</button>
                      )}
                    </div>
                  </>
                )}
              </div>
              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setCreateMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    aria-expanded={createMenuOpen}
                    aria-haspopup="true"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Create
                    <svg className="w-3.5 h-3.5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {createMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setCreateMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 z-20 w-52 py-1 bg-white border border-gray-200 rounded-xl shadow-lg">
                        <Link to="/studio/chat" onClick={() => setCreateMenuOpen(false)} className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-blue-50 rounded-t-xl">Upload data & create dashboard</Link>
                        <button type="button" onClick={() => { setCreateMenuOpen(false); openCompose() }} className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100">Share existing dashboard</button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link to="/login" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Sign in</Link>
                  <Link to="/signup" className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Join</Link>
                </div>
              )}
            </div>
          </div>
          {/* Scope tabs */}
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none -mb-px">
            {scopeTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setScope(tab.value)}
                className={`flex-shrink-0 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  scope === tab.value
                    ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Feed content: main column + right sidebar */}
      <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col lg:flex-row gap-6">
        <main className="flex-1 min-w-0 max-w-2xl">
          {!user && (
            <div className="mb-5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white overflow-hidden">
              <div className="px-5 py-6">
                <h2 className="text-lg font-bold mb-1">Join the community</h2>
                <p className="text-blue-100/90 text-sm mb-4">Share dashboards, save favorites, and connect with others.</p>
                <div className="flex gap-2">
                  <Link to="/signup" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-50">Join free</Link>
                  <Link to="/login" className="inline-flex items-center px-4 py-2 text-white/90 hover:text-white text-sm font-medium">Sign in</Link>
                </div>
              </div>
            </div>
          )}

          {loading && <Loader />}
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 mb-4">
            {error}
          </div>
        )}
        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-20 px-4 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              {user
                ? 'Upload your data in Studio, create a dashboard, then share it here or save it private.'
                : 'You\'re part of AI Analytics. Be the first to share a dashboard — join free to post your analytics shorts and connect with the community.'}
            </p>
            {user ? (
              <Link
                to="/studio/chat"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Create dashboard in Studio
              </Link>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Join free
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        )}
        {!loading && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={handleLike}
                onSave={handleSave}
                onGoLive={handleGoLive}
                onDelete={handleDelete}
                onFollow={handleFollow}
                isAuthenticated={!!user}
                isAuthor={!!user && (isPostByCurrentUser(post, user) || scope === 'mine')}
                navigate={navigate}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
        </main>

        <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-20 self-start space-y-3">
          <div className="rounded-lg bg-white border border-gray-200/80 overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between border-b border-gray-100">
              <span className="text-xs font-medium text-amber-600">Careers</span>
              <Link to="/careers" className="text-xs text-gray-500 hover:text-gray-700">View all</Link>
            </div>
            <div className="p-3">
              <p className="text-sm text-gray-700">Upload your resume and browse jobs in the community.</p>
              <Link to="/careers" className="mt-3 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                Resume & jobs
              </Link>
            </div>
          </div>
          <div className="rounded-lg bg-white border border-gray-200/80 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">AI & Analytics News</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {AI_ANALYTICS_NEWS.map((item, i) => (
                <li key={i}>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2.5 hover:bg-gray-50/80 group">
                    <span className="block text-sm text-gray-900 group-hover:text-blue-600 line-clamp-2">{item.title}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{item.source}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Create post modal: choose a dashboard to publish */}
      {composeOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" aria-hidden="true" onClick={() => setComposeOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden pointer-events-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="compose-dialog-title"
            >
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h2 id="compose-dialog-title" className="text-lg font-semibold text-gray-900">Create a post</h2>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="px-4 pt-2 pb-3 text-sm text-gray-500">Choose a saved dashboard to share with the feed</p>
              <div className="overflow-y-auto max-h-[50vh] px-4 pb-4">
                {dashboardsLoading ? (
                  <div className="py-8 flex justify-center"><Loader /></div>
                ) : dashboards.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 text-sm">
                    <p className="mb-4">You don&apos;t have any dashboards yet.</p>
                    <button
                      type="button"
                      onClick={() => { setComposeOpen(false); navigate('/studio/chat') }}
                      className="text-blue-600 font-medium hover:underline"
                    >
                      Create one in Studio
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {dashboards.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectDashboard(d.id)}
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-colors"
                        >
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{d.name || 'Untitled dashboard'}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <Link
                  to="/studio/chat"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  New in Studio
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
