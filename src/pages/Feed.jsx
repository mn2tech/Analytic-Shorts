import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loader from '../components/Loader'
import PostThumbnail from '../components/PostThumbnail'
import SaaSAdSection from '../components/SaaSAdSection'
import { getFeed, toggleLike, toggleSave, createOrGetLiveSession, deletePost } from '../services/postsService'
import { getDashboards } from '../services/dashboardService'
import { followUser, unfollowUser } from '../services/followService'
import { useNotification } from '../contexts/NotificationContext'
import apiClient from '../config/api'
import { TD } from '../constants/terminalDashboardPalette'

const FEED_TITLE = 'Analytics Shorts Feed'
const FEED_DESCRIPTION = 'Your analytics social feed — share dashboards, discover insights, and connect with the community.'

// Special title for notable community members (e.g. Bryan Harris — CTO of SAS)
function getMemberTitle(displayName) {
  if (!displayName || typeof displayName !== 'string') return null
  const n = displayName.trim().toLowerCase()
  if (n === 'bryan harris' || n === 'bryan.harris') return 'CTO, SAS'
  return null
}

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes
function isUserOnline(lastSeenAt) {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS
}

// Curated AI & analytics news links for sidebar (open in new tab)
const AI_ANALYTICS_NEWS = [
  { title: 'SAS CTO Bryan Harris: AI requires pragmatism, not hype', source: 'Techzine', url: 'https://www.techzine.eu/blogs/analytics/138925/sas-cto-bryan-harris-ai-requires-pragmatism-not-hype/' },
  { title: '2025 will be “explosive” for SAS – CTO Bryan Harris', source: 'IT Brief', url: 'https://itbrief.co.nz/story/2025-will-be-explosive-for-sas-cto-bryan-harris' },
  { title: 'SAS CTO Bryan Harris named to NC AI Leadership Council', source: 'SAS', url: 'https://www.sas.com/en_us/news/press-releases/2025/september/bryan-harris-nc-ai-leadership-council.html' },
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

function getPostShareUrl(postId) {
  if (typeof window === 'undefined' || !postId) return ''
  return `${window.location.origin}/post/${postId}`
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

function PostCard({ post, onLike, onSave, onGoLive, onDelete, onFollow, onNotify, isAuthenticated, isAuthor, navigate, currentUserId }) {
  const [liked, setLiked] = useState(post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0)
  const [saved, setSaved] = useState(post.saved_by_me)
  const [followed, setFollowed] = useState(post.author_followed_by_me)
  const [followLoading, setFollowLoading] = useState(false)
  const [liveLoading, setLiveLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

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

  const popoverCls =
    'absolute z-20 py-1 rounded-lg shadow-lg border'
  const popoverStyle = {
    background: TD.CARD_BG,
    borderColor: TD.CARD_BORDER,
    borderWidth: '0.5px',
  }

  return (
    <article
      className="rounded-xl overflow-hidden transition-shadow hover:shadow-lg/20"
      style={{
        background: TD.CARD_BG,
        border: `0.5px solid ${TD.CARD_BORDER}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
      }}
    >
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
            <p className="font-semibold truncate" style={{ color: TD.TEXT_1 }}>
              {authorLabel}
            </p>
            <p className="text-xs" style={{ color: TD.TEXT_3 }}>
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                style={
                  followed
                    ? { color: TD.TEXT_2, background: 'rgba(255,255,255,0.08)' }
                    : { color: TD.ACCENT_MID, background: 'rgba(59,130,246,0.12)' }
                }
                title={followed ? `Unfollow ${authorLabel}` : `Follow ${authorLabel}`}
              >
                {followLoading ? '…' : followed ? 'Following' : 'Follow'}
              </button>
              <Link
                to={`/messages?with=${post.author_id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-white/10"
                style={{ color: TD.TEXT_2 }}
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
              className="p-1.5 rounded-full transition-colors hover:bg-white/10"
              style={{ color: TD.TEXT_3 }}
              aria-label="Post options"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setMenuOpen(false)} />
                <div className={`${popoverCls} right-0 top-full mt-1 w-40`} style={popoverStyle}>
                  <Link
                    to={`/post/${post.id}/edit`}
                    className="block px-3 py-2 text-sm hover:bg-white/10"
                    style={{ color: TD.TEXT_1 }}
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
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-red-500/15"
                    style={{ color: TD.DANGER }}
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
        <Link
          to={`/post/${post.id}`}
          className="block rounded-lg overflow-hidden aspect-video focus:ring-2 focus:outline-none focus:ring-offset-2 focus:ring-offset-slate-900"
          style={{
            border: `0.5px solid ${TD.CARD_BORDER}`,
            background: TD.PAGE_BG,
          }}
        >
          <PostThumbnail url={post.thumbnail_url ?? post.thumbnailUrl} title={post.title} className="w-full h-full" />
        </Link>
        <p className="font-semibold mt-2 line-clamp-1 text-sm" style={{ color: TD.TEXT_1 }}>
          {post.title}
        </p>
      </div>

      {/* Action bar - like LinkedIn */}
      <div className="flex items-center px-2" style={{ borderTop: `0.5px solid ${TD.CARD_BORDER}` }}>
        <button
          type="button"
          onClick={handleLike}
          disabled={!isAuthenticated}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm rounded-lg transition-colors hover:bg-white/5"
          style={{ color: liked ? TD.DANGER : TD.TEXT_3 }}
        >
          <span className="text-lg">{liked ? '❤️' : '🤍'}</span>
          <span>{likeCount > 0 ? likeCount : 'Like'}</span>
        </button>
        <Link
          to={`/post/${post.id}#comments`}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm rounded-lg transition-colors hover:bg-white/5"
          style={{ color: TD.TEXT_3 }}
        >
          <span className="text-lg">💬</span>
          <span>{post.comment_count ?? 0} Comments</span>
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isAuthenticated}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm rounded-lg transition-colors hover:bg-white/5"
          style={{ color: saved ? TD.ACCENT_MID : TD.TEXT_3 }}
        >
          <span className="text-lg">{saved ? '🔖' : '📑'}</span>
          <span>Save</span>
        </button>
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={() => setShareOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-3 text-sm rounded-lg transition-colors hover:bg-white/5"
            style={{ color: TD.TEXT_3 }}
            title="Share post"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
          </button>
          {shareOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setShareOpen(false)} />
              <div
                className="absolute right-0 bottom-full mb-1 z-20 w-48 py-1 rounded-xl shadow-lg border"
                style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
              >
                <button
                  type="button"
                  onClick={async () => {
                    const url = getPostShareUrl(post.id)
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(url)
                      onNotify?.('Link copied', 'success')
                    }
                    setShareOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10 rounded-t-xl"
                  style={{ color: TD.TEXT_1 }}
                >
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getPostShareUrl(post.id))}`, '_blank', 'noopener,noreferrer,width=600,height=600')
                    setShareOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                  style={{ color: TD.TEXT_1 }}
                >
                  LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = getPostShareUrl(post.id)
                    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(post.title || 'Check out this post')}`, '_blank', 'noopener,noreferrer,width=550,height=420')
                    setShareOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                  style={{ color: TD.TEXT_1 }}
                >
                  𝕏 X
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getPostShareUrl(post.id))}`, '_blank', 'noopener,noreferrer,width=600,height=400')
                    setShareOpen(false)
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10 rounded-b-xl"
                  style={{ color: TD.TEXT_1 }}
                >
                  Facebook
                </button>
              </div>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={handleGoLive}
          disabled={!isAuthenticated || liveLoading}
          className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            color: TD.SUCCESS_ALT,
            background: 'rgba(16,185,129,0.15)',
          }}
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
  const [isAdminFeed, setIsAdminFeed] = useState(false)
  const [newMembersSummary, setNewMembersSummary] = useState(null)
  const [communitySummary, setCommunitySummary] = useState(null)
  const [communityLoading, setCommunityLoading] = useState(true)
  const [communityError, setCommunityError] = useState(false)
  const [communityAvatarErrors, setCommunityAvatarErrors] = useState(() => new Set())

  // Community stats: public endpoint, fetch for everyone so sidebar shows all (incl. avatars)
  const fetchCommunity = useCallback(() => {
    setCommunityError(false)
    apiClient.get('/api/analytics/community', { timeout: 5000 })
      .then((res) => {
        setCommunitySummary(res?.data ?? null)
        setCommunityError(false)
      })
      .catch(() => {
        setCommunityError(true)
        setCommunitySummary(null)
      })
      .finally(() => setCommunityLoading(false))
  }, [])

  useEffect(() => {
    setCommunityLoading(true)
    fetchCommunity()
  }, [fetchCommunity])

  // Refetch community when Feed is visible again (e.g. after editing profile) so avatars stay up to date
  useEffect(() => {
    const onVisible = () => { fetchCommunity() }
    window.addEventListener('focus', onVisible)
    return () => window.removeEventListener('focus', onVisible)
  }, [fetchCommunity])

  // When user logs out or session is missing, reset scope to public so we don't request scope=all|mine|following|saved
  useEffect(() => {
    if (!user && (scope === 'all' || scope === 'mine' || scope === 'following' || scope === 'saved')) {
      setScope('public')
    }
  }, [user, scope])

  useEffect(() => {
    if (!user) {
      setIsAdminFeed(false)
      setNewMembersSummary(null)
      return
    }
    let cancelled = false
    // Admin check and new-members for admin-only banner
    apiClient.get('/api/analytics/admin-check', { timeout: 8000 }).then((res) => {
      if (cancelled || !res?.data?.isAdmin) return
      setIsAdminFeed(true)
      return apiClient.get('/api/analytics/new-members', { timeout: 5000 })
    }).then((res) => {
      if (cancelled || !res?.data) return
      setNewMembersSummary(res.data)
    }).catch(() => { if (!cancelled) setIsAdminFeed(false) })
    return () => { cancelled = true }
  }, [user?.id])

  const loadFeed = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFeed(scope)
      setPosts(data.posts || [])
    } catch (err) {
      const msg = err.response?.data?.error || err.message || ''
      const authRequired = /authentication required for scope=/i.test(msg)
      if (authRequired && scope !== 'public') {
        setScope('public')
        setError(null)
      } else {
        setError(msg || 'Failed to load feed')
      }
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
    <div className="min-h-screen" style={{ background: TD.PAGE_BG }}>
      <header
        className="sticky top-0 z-10"
        style={{
          background: TD.PAGE_BG,
          borderBottom: `0.5px solid ${TD.CARD_BORDER}`,
        }}
      >
        <div className="max-w-5xl mx-auto px-4">
          {/* Top row: title + actions */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {user ? (
                <Link
                  to="/profile"
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden transition-shadow hover:ring-2 hover:ring-blue-500/40"
                  style={{ boxShadow: `0 0 0 1px ${TD.CARD_BORDER}` }}
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
                <h1 className="text-lg font-bold truncate" style={{ color: TD.TEXT_1 }}>
                  Feed
                </h1>
                {!user && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: TD.TEXT_3 }}>
                    Share dashboards & discover insights
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShareOpen((o) => !o)}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: TD.TEXT_3 }}
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
                    <div
                      className="absolute right-0 top-full mt-1 z-20 w-52 py-1 rounded-xl shadow-lg border"
                      style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          openLinkedInShare()
                          setShareOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10 rounded-t-xl"
                        style={{ color: TD.TEXT_1 }}
                      >
                        in LinkedIn
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          openTwitterShare()
                          setShareOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                        style={{ color: TD.TEXT_1 }}
                      >
                        𝕏 X
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          openFacebookShare()
                          setShareOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                        style={{ color: TD.TEXT_1 }}
                      >
                        Facebook
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyLink()
                          setShareOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10"
                        style={{ color: TD.TEXT_1 }}
                      >
                        {linkCopied ? '✓ Copied' : 'Copy link'}
                      </button>
                      {typeof navigator.share === 'function' && (
                        <button
                          type="button"
                          onClick={handleNativeShare}
                          className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-white/10 border-t"
                          style={{ color: TD.TEXT_1, borderColor: TD.CARD_BORDER }}
                        >
                          More…
                        </button>
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                    style={{ background: TD.ACCENT_BLUE }}
                    aria-expanded={createMenuOpen}
                    aria-haspopup="true"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Create
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {createMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setCreateMenuOpen(false)} />
                      <div
                        className="absolute right-0 top-full mt-1 z-20 w-52 py-1 rounded-xl shadow-lg border"
                        style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
                      >
                        <Link
                          to="/studio/chat"
                          onClick={() => setCreateMenuOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 rounded-t-xl"
                          style={{ color: TD.TEXT_1 }}
                        >
                          Upload data & create dashboard
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateMenuOpen(false)
                            openCompose()
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 border-t"
                          style={{ color: TD.TEXT_2, borderColor: TD.CARD_BORDER }}
                        >
                          Share existing dashboard
                        </button>
                        <Link
                          to="/publish/link?template=hospital-bed"
                          onClick={() => setCreateMenuOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 border-t"
                          style={{ color: TD.TEXT_2, borderColor: TD.CARD_BORDER }}
                        >
                          Add Hospital Bed Command Center
                        </Link>
                        <Link
                          to="/publish/link?template=hospital-er-causation-poll"
                          onClick={() => setCreateMenuOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 border-t"
                          style={{ color: TD.TEXT_2, borderColor: TD.CARD_BORDER }}
                        >
                          Add ER Causation Poll
                        </Link>
                        <Link
                          to="/publish/link?template=federal-entry"
                          onClick={() => setCreateMenuOpen(false)}
                          className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm hover:bg-white/10 border-t"
                          style={{ color: TD.TEXT_2, borderColor: TD.CARD_BORDER }}
                        >
                          Add Federal Entry Report
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Link to="/login" className="px-3 py-2 text-sm font-medium transition-colors hover:text-white" style={{ color: TD.TEXT_2 }}>
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-3 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90"
                    style={{ background: TD.ACCENT_BLUE }}
                  >
                    Join
                  </Link>
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
                className="flex-shrink-0 px-3 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap"
                style={
                  scope === tab.value
                    ? {
                        color: TD.ACCENT_MID,
                        borderBottomColor: TD.ACCENT_MID,
                        background: 'rgba(59,130,246,0.08)',
                      }
                    : {
                        color: TD.TEXT_3,
                        borderBottomColor: 'transparent',
                      }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Admin: new members summary on Feed */}
      {isAdminFeed && newMembersSummary && (newMembersSummary.new_signups_7d > 0 || newMembersSummary.new_signups_30d > 0) && (
        <div
          className="border-b"
          style={{
            background: 'rgba(99,102,241,0.12)',
            borderColor: TD.CARD_BORDER,
          }}
        >
          <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
            <span className="text-sm" style={{ color: '#c7d2fe' }}>
              <strong>{newMembersSummary.new_signups_7d}</strong> new member{newMembersSummary.new_signups_7d !== 1 ? 's' : ''} this week
              {newMembersSummary.new_signups_30d > 0 && (
                <span className="ml-1 opacity-90">({newMembersSummary.new_signups_30d} in 30 days)</span>
              )}
            </span>
            <Link to="/admin/analytics" className="text-sm font-medium whitespace-nowrap hover:underline" style={{ color: TD.ACCENT_MID }}>
              View in Admin →
            </Link>
          </div>
        </div>
      )}

      {/* Feed content: main column + right sidebar */}
      <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col lg:flex-row gap-6">
        <main className="flex-1 min-w-0 max-w-2xl">
          {!user && (
            <div className="mb-5 rounded-xl overflow-hidden border" style={{ borderColor: TD.CARD_BORDER, background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)' }}>
              <div className="px-5 py-6 text-white">
                <h2 className="text-lg font-bold mb-1">Join the community</h2>
                <p className="text-blue-100/90 text-sm mb-4">Share dashboards, save favorites, and connect with others.</p>
                <div className="flex gap-2">
                  <Link to="/signup" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-blue-800 rounded-lg font-medium text-sm hover:bg-blue-50">
                    Join free
                  </Link>
                  <Link to="/login" className="inline-flex items-center px-4 py-2 text-white/90 hover:text-white text-sm font-medium">
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          )}

          {loading && <Loader />}
        {error && (
          <div
            className="rounded-xl px-4 py-3 mb-4 border"
            style={{
              background: 'rgba(239,68,68,0.12)',
              borderColor: 'rgba(239,68,68,0.35)',
              color: '#fecaca',
            }}
          >
            {error}
          </div>
        )}
        {!loading && !error && posts.length === 0 && (
          <div
            className="text-center py-20 px-4 rounded-xl border"
            style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
          >
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
              style={{ background: TD.PAGE_BG, color: TD.TEXT_3 }}
            >
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
                className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90"
                style={{ background: TD.ACCENT_BLUE }}
              >
                Create dashboard in Studio
              </Link>
            ) : (
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90"
                  style={{ background: TD.ACCENT_BLUE }}
                >
                  Join free
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors hover:bg-white/5"
                  style={{ borderColor: TD.CARD_BORDER, color: TD.TEXT_1 }}
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
                onNotify={notify}
                isAuthenticated={!!user}
                isAuthor={!!user && (isPostByCurrentUser(post, user) || scope === 'mine')}
                navigate={navigate}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
        </main>

        <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-20 self-start space-y-3" data-testid="feed-sidebar">
          <div
            className="rounded-lg overflow-hidden border"
            style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
            data-testid="community-block"
          >
            <div className="px-3 py-2.5 border-b" style={{ borderColor: TD.CARD_BORDER }}>
              <h3 className="text-sm font-semibold" style={{ color: TD.TEXT_1 }}>
                Community
              </h3>
            </div>
            <div className="p-3 space-y-3">
              {communityLoading ? (
                <p className="text-sm" style={{ color: TD.TEXT_3 }}>
                  Loading…
                </p>
              ) : communityError ? (
                <p className="text-xs" style={{ color: TD.TEXT_3 }}>
                  Couldn&apos;t load community stats.
                </p>
              ) : null}
              {!communityLoading && (
                <>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-2xl font-bold" style={{ color: TD.TEXT_1 }}>
                      {communitySummary?.total_users ?? '—'}
                    </span>
                    <span className="text-sm" style={{ color: TD.TEXT_3 }}>
                      members
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: TD.TEXT_3 }}>
                    {communitySummary ? (
                      <>{communitySummary.new_signups_7d ?? 0} new this week · {communitySummary.new_signups_30d ?? 0} in 30 days</>
                    ) : (
                      '— new this week · — in 30 days'
                    )}
                  </p>
                  {Array.isArray(communitySummary?.recent_signups) && communitySummary.recent_signups.length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-2" style={{ color: TD.TEXT_2 }}>
                        Who joined (recent)
                      </p>
                      <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                        {communitySummary.recent_signups.map((u, i) => {
                          const displayName = u.name || 'Anonymous'
                          const initials = getInitials(displayName)
                          const avatarUrl = u.avatar_url
                          const avatarFailed = communityAvatarErrors.has(u.user_id)
                          const showImg = avatarUrl && !avatarFailed
                          return (
                            <li key={u.user_id || i} className="flex items-center gap-2 text-sm">
                              <div className="flex-shrink-0 relative">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex flex-col items-center justify-center text-white overflow-hidden" title={displayName}>
                                {showImg ? (
                                  <img
                                    src={avatarUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={() => setCommunityAvatarErrors((prev) => new Set(prev).add(u.user_id))}
                                  />
                                ) : (
                                  <>
                                    <span className="text-[10px] font-semibold leading-none">{initials}</span>
                                    <span className="text-[8px] opacity-90 leading-none">Click</span>
                                  </>
                                )}
                                </div>
                                {isUserOnline(u.last_seen_at) && (
                                  <span
                                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2"
                                    style={{ borderColor: TD.CARD_BG }}
                                    title="Online"
                                    aria-label="Online"
                                  />
                                )}
                              </div>
                              <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  {u.user_id ? (
                                    <Link
                                      to={`/profile/${u.user_id}`}
                                      className="truncate font-medium hover:underline"
                                      style={{ color: TD.TEXT_1 }}
                                    >
                                      {displayName}
                                    </Link>
                                  ) : (
                                    <span className="truncate" style={{ color: TD.TEXT_1 }}>
                                      {displayName}
                                    </span>
                                  )}
                                  {getMemberTitle(displayName) && (
                                    <span
                                      className="block text-[10px] font-medium mt-0.5"
                                      style={{ color: '#a5b4fc' }}
                                      title="Chief Technology Officer, SAS"
                                    >
                                      {getMemberTitle(displayName)}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs flex-shrink-0" style={{ color: TD.TEXT_3 }}>
                                  {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                                </span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* News from the feed: welcome new members */}
          {Array.isArray(communitySummary?.recent_signups) && communitySummary.recent_signups.length > 0 && (
            <div
              className="rounded-lg overflow-hidden border"
              style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
            >
              <div
                className="px-3 py-2.5 border-b"
                style={{
                  borderColor: TD.CARD_BORDER,
                  background: `linear-gradient(90deg, rgba(59,130,246,0.12) 0%, ${TD.CARD_BG} 100%)`,
                }}
              >
                <h3 className="text-sm font-semibold" style={{ color: TD.TEXT_1 }}>
                  News from the feed
                </h3>
                <p className="text-xs mt-0.5" style={{ color: TD.TEXT_3 }}>
                  Welcome, new members
                </p>
              </div>
              <ul className="divide-y" style={{ borderColor: TD.CARD_BORDER }}>
                {communitySummary.recent_signups.slice(0, 8).map((u, i) => {
                  const displayName = u.name || 'Anonymous'
                  const joinedDate = u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
                  const memberTitle = getMemberTitle(displayName)
                  const online = isUserOnline(u.last_seen_at)
                  return (
                    <li key={u.user_id || i}>
                      {u.user_id ? (
                        <Link
                          to={`/profile/${u.user_id}`}
                          className="block px-3 py-2.5 hover:bg-white/5 group transition-colors"
                        >
                          <span
                            className="text-sm inline-flex items-center gap-2 flex-wrap group-hover:opacity-95"
                            style={{ color: TD.TEXT_1 }}
                          >
                            <strong>{displayName}</strong>
                            {online && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" aria-label="Online" />}
                            joined the feed
                          </span>
                          {memberTitle && (
                            <span
                              className="block text-xs font-medium mt-0.5"
                              style={{ color: '#a5b4fc' }}
                              title="Chief Technology Officer, SAS"
                            >
                              {memberTitle}
                            </span>
                          )}
                          {joinedDate && (
                            <span className="block text-xs mt-0.5" style={{ color: TD.TEXT_3 }}>
                              {joinedDate}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <div className="px-3 py-2.5">
                          <span className="text-sm" style={{ color: TD.TEXT_1 }}>
                            <strong>{displayName}</strong> joined the feed
                          </span>
                          {memberTitle && (
                            <span className="block text-xs font-medium mt-0.5" style={{ color: '#a5b4fc' }}>
                              {memberTitle}
                            </span>
                          )}
                          {joinedDate && (
                            <span className="block text-xs mt-0.5" style={{ color: TD.TEXT_3 }}>
                              {joinedDate}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          <SaaSAdSection />
          <div
            className="rounded-lg overflow-hidden border"
            style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
          >
            <div className="px-3 py-2.5 flex items-center justify-between border-b" style={{ borderColor: TD.CARD_BORDER }}>
              <span className="text-xs font-medium" style={{ color: TD.WARNING }}>
                Careers
              </span>
              <Link to="/careers" className="text-xs hover:underline" style={{ color: TD.TEXT_3 }}>
                View all
              </Link>
            </div>
            <div className="p-3">
              <p className="text-sm" style={{ color: TD.TEXT_2 }}>
                Upload your resume and browse jobs in the community.
              </p>
              <Link
                to="/careers"
                className="mt-3 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90"
                style={{ background: TD.SUCCESS }}
              >
                Resume & jobs
              </Link>
            </div>
          </div>
          <div
            className="rounded-lg overflow-hidden border"
            style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
          >
            <div className="px-3 py-2.5 border-b" style={{ borderColor: TD.CARD_BORDER }}>
              <h3 className="text-sm font-semibold" style={{ color: TD.TEXT_1 }}>
                AI & Analytics News
              </h3>
            </div>
            <ul className="divide-y" style={{ borderColor: TD.CARD_BORDER }}>
              {AI_ANALYTICS_NEWS.map((item, i) => (
                <li key={i}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-3 py-2.5 hover:bg-white/5 group transition-colors"
                  >
                    <span className="block text-sm line-clamp-2 group-hover:opacity-90" style={{ color: TD.TEXT_1 }}>
                      {item.title}
                    </span>
                    <span className="block text-xs mt-0.5" style={{ color: TD.TEXT_3 }}>
                      {item.source}
                    </span>
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
          <div className="fixed inset-0 bg-black/60 z-40" aria-hidden="true" onClick={() => setComposeOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              className="rounded-xl shadow-xl max-w-md w-full max-h-[85vh] overflow-hidden pointer-events-auto border"
              style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="compose-dialog-title"
            >
              <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: TD.CARD_BORDER }}>
                <h2 id="compose-dialog-title" className="text-lg font-semibold" style={{ color: TD.TEXT_1 }}>
                  Create a post
                </h2>
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="p-2 rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: TD.TEXT_3 }}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <p className="px-4 pt-2 pb-3 text-sm" style={{ color: TD.TEXT_3 }}>
                Choose a saved dashboard to share with the feed
              </p>
              <div className="overflow-y-auto max-h-[50vh] px-4 pb-4">
                {dashboardsLoading ? (
                  <div className="py-8 flex justify-center"><Loader /></div>
                ) : dashboards.length === 0 ? (
                  <div className="py-8 text-center text-sm" style={{ color: TD.TEXT_3 }}>
                    <p className="mb-4">You don&apos;t have any dashboards yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setComposeOpen(false)
                        navigate('/studio/chat')
                      }}
                      className="font-medium hover:underline"
                      style={{ color: TD.ACCENT_MID }}
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
                          className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border text-left transition-colors hover:bg-white/5"
                          style={{ borderColor: TD.CARD_BORDER }}
                        >
                          <div
                            className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ background: TD.PAGE_BG, color: TD.TEXT_3 }}
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate" style={{ color: TD.TEXT_1 }}>
                              {d.name || 'Untitled dashboard'}
                            </p>
                            <p className="text-xs truncate" style={{ color: TD.TEXT_3 }}>
                              {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : ''}
                            </p>
                          </div>
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: TD.TEXT_3 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div
                className="px-4 py-3 flex justify-end gap-2 border-t"
                style={{ borderColor: TD.CARD_BORDER, background: TD.PAGE_BG }}
              >
                <button
                  type="button"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: TD.TEXT_2 }}
                >
                  Cancel
                </button>
                <Link
                  to="/studio/chat"
                  onClick={() => setComposeOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors hover:bg-white/10"
                  style={{ color: TD.ACCENT_MID }}
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
