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
  const displayTitle = title || 'Dashboard'
  return (
    <div
      className={`flex flex-col items-center justify-center p-2 text-center overflow-hidden relative ${className}`}
      aria-hidden
      style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 35%, #a855f7 65%, #7c3aed 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.12)',
      }}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, white 1px, transparent 1px),
            radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
            radial-gradient(circle at 40% 40%, white 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      <svg
        className="w-10 h-10 mb-1.5 flex-shrink-0 relative z-10 text-white/90"
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
      <span className="text-xs font-semibold text-white line-clamp-2 break-words w-full relative z-10 drop-shadow-sm">{displayTitle}</span>
      <span className="text-[10px] text-white/80 mt-0.5 relative z-10">Click here</span>
    </div>
  )
}
