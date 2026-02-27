import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import apiClient from '../config/api'
import Loader from '../components/Loader'

function getInitials(name) {
  if (!name || !String(name).trim()) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return String(name).slice(0, 2).toUpperCase()
}

export default function UserProfile() {
  const { userId } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    let cancelled = false
    apiClient
      .get(`/api/profiles/${encodeURIComponent(userId)}`, { timeout: 8000 })
      .then((res) => {
        if (!cancelled && res?.data) setProfile(res.data)
      })
      .catch((err) => {
        if (!cancelled) {
          const status = err.response?.status
          const msg = err.response?.data?.error
          setError(status === 404 ? (msg || 'Profile not found') : (msg || 'Failed to load profile. Try again from the Feed.'))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600 mb-4">{error || 'Profile not available'}</p>
        <Link to="/feed" className="text-blue-600 hover:underline font-medium">Back to Feed</Link>
      </div>
    )
  }

  const name = profile.name || 'Anonymous'
  const initials = getInitials(name)
  const avatarStyle = profile.avatar_focal
    ? { objectPosition: `${profile.avatar_focal.x}% ${profile.avatar_focal.y}%` }
    : undefined

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-shrink-0 w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-semibold overflow-hidden">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
                style={avatarStyle}
              />
            ) : (
              initials
            )}
          </div>
          <div className="text-center sm:text-left min-w-0">
            <h1 className="text-xl font-semibold text-gray-900 truncate">{name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Community member</p>
          </div>
        </div>

        {/* Stats: dashboards */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Stats</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <strong className="text-gray-900">{profile.dashboard_count ?? 0}</strong> dashboard{(profile.dashboard_count ?? 0) !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <strong className="text-gray-900">{profile.post_count ?? 0}</strong> post{(profile.post_count ?? 0) !== 1 ? 's' : ''} on Feed
            </span>
          </div>
          {Array.isArray(profile.dashboards) && profile.dashboards.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Dashboards</p>
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {profile.dashboards.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                    {d.share_url ? (
                      <Link
                        to={d.share_url}
                        className="truncate text-blue-600 hover:text-blue-700 hover:underline font-medium"
                      >
                        {d.name || 'Untitled'}
                      </Link>
                    ) : (
                      <span className="truncate text-gray-700">{d.name || 'Untitled'}</span>
                    )}
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {d.updated_at ? new Date(d.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <Link
            to="/feed"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Feed
          </Link>
        </div>
      </div>
    </div>
  )
}
