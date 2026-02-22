import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loader from '../components/Loader'
import JitsiMeeting from '../components/JitsiMeeting'
import DashboardRenderer from '../components/aiVisualBuilder/DashboardRenderer'
import LegacyDashboardPreview from '../components/LegacyDashboardPreview'
import { getLiveSession, getPost, getPostDashboard, endLiveSession } from '../services/postsService'

export default function Live() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [session, setSession] = useState(null)
  const [post, setPost] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ending, setEnding] = useState(false)
  const [filterValues, setFilterValues] = useState({})
  const [legacyChartFilter, setLegacyChartFilter] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!sessionId) return
      try {
        const sess = await getLiveSession(sessionId)
        if (cancelled) return
        setSession(sess)
        const postRes = await getPost(sess.post_id)
        if (cancelled) return
        setPost(postRes)
        try {
          const dash = await getPostDashboard(sess.post_id)
          if (!cancelled) setDashboard(dash)
        } catch {
          if (!cancelled) setDashboard(null)
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || err.message || 'Failed to load session')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId])

  const handleEndSession = async () => {
    if (!session || session.created_by !== user?.id) return
    setEnding(true)
    try {
      await endLiveSession(sessionId)
      navigate(`/post/${session.post_id}`)
    } catch (err) {
      console.error(err)
    } finally {
      setEnding(false)
    }
  }

  const inviteUrl = typeof window !== 'undefined' ? window.location.href : ''

  if (loading) return <Loader />
  if (error || !session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 px-4 py-3">
          {error || 'Session not found'}
        </div>
        <button type="button" onClick={() => navigate('/feed')} className="mt-4 text-blue-600 hover:underline">
          ← Back to Feed
        </button>
      </div>
    )
  }

  const spec = dashboard?.schema
    ? (typeof dashboard.schema === 'string' ? JSON.parse(dashboard.schema) : dashboard.schema)
    : null
  const rows = Array.isArray(dashboard?.data) ? dashboard.data : []
  const isHost = user?.id === session.created_by
  const useSharedDashboard = !!post?.share_id

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white text-sm shrink-0">
        <span className="font-medium">Live: {post?.title || 'Analytics Short'}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="w-64 px-2 py-1 text-gray-800 text-xs rounded bg-white"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(inviteUrl)}
              className="px-2 py-1 bg-gray-600 rounded text-xs hover:bg-gray-500"
            >
              Copy link
            </button>
          </div>
          {isHost && (
            <button
              type="button"
              onClick={handleEndSession}
              disabled={ending}
              className="px-3 py-1 bg-red-600 rounded text-xs hover:bg-red-500 disabled:opacity-50"
            >
              {ending ? 'Ending…' : 'End session'}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r border-gray-700 overflow-auto bg-white min-h-0 flex flex-col">
          {useSharedDashboard ? (
            <iframe
              key={`live-dashboard-${post.share_id}`}
              title="Live dashboard"
              src={`/dashboard/shared/${post.share_id}`}
              className="w-full flex-1 min-h-0 border-0"
            />
          ) : spec && rows.length > 0 ? (
            <DashboardRenderer
              spec={spec}
              data={rows}
              filterValues={filterValues}
              onFilterChange={setFilterValues}
            />
          ) : dashboard && Array.isArray(dashboard.data) && dashboard.data.length > 0 ? (
            <LegacyDashboardPreview
              dashboard={dashboard}
              chartFilter={legacyChartFilter}
              onChartFilter={setLegacyChartFilter}
            />
          ) : (
            <div className="p-8 text-gray-500 text-center">No dashboard preview</div>
          )}
        </div>
        <div className="w-1/2 flex flex-col min-h-0">
          <JitsiMeeting
            roomName={session.room_name}
            displayName={user?.email?.split('@')[0] || user?.id?.slice(0, 8) || 'Guest'}
            email={user?.email || ''}
            className="flex-1 min-h-0"
          />
        </div>
      </div>
    </div>
  )
}
