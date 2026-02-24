import { useState } from 'react'
import { API_BASE_URL } from '../config/api'

/** Resolve relative thumbnail URL (e.g. /api/uploads/...) to full URL in prod when API is on another origin. */
function resolveThumbnailUrl(url) {
  if (!url || !String(url).trim()) return ''
  const u = String(url).trim()
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  const base = (typeof API_BASE_URL === 'string' && API_BASE_URL.trim()) ? API_BASE_URL.replace(/\/$/, '') : ''
  return base ? `${base}${u.startsWith('/') ? u : `/${u}`}` : u
}

/**
 * Thumbnail area for feed/post cards. Shows image when url provided, otherwise a styled placeholder.
 */
export default function PostThumbnail({ url, title = 'Analytics Short', className = '' }) {
  const [failed, setFailed] = useState(false)
  const resolved = resolveThumbnailUrl(url)
  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt=""
        className={`w-full h-full object-cover ${className}`}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div
      className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 ${className}`}
      aria-hidden
    >
      <svg
        className="w-12 h-12 mb-1 opacity-70"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <span className="text-xs font-medium">{title || 'Dashboard'}</span>
    </div>
  )
}
