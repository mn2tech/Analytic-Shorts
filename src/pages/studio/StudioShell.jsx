/**
 * StudioShell – Shared layout: collapsible Studio title + full-width main content.
 * Report Chat, Data, Preview are under Menu > Navigate > Studio (app sidebar).
 */

import { useState, useEffect } from 'react'

const STORAGE_PREFIX = 'studioShell_collapsed_'

function useCollapsed(key, defaultOpen = true) {
  const [open, setOpen] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_PREFIX + key)
      return v !== 'true' // stored as collapsed, we use open
    } catch { return defaultOpen }
  })
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, String(!open))
    } catch (_) {}
  }, [key, open])
  return [open, () => setOpen((o) => !o)]
}

export default function StudioShell({
  children,
  fullScreen,
  view,
  viewMeta,
  onBackToDashboards,
  onBackHome,
  dashboardName,
  onDashboardNameChange,
  onSave,
  onShare,
  onPublicLink,
  saving,
  spec,
  savedDashboardId,
  shareCopied,
  publicLinkCopied
}) {
  const [studioOpen, toggleStudio] = useCollapsed('studio')

  const wrapperClass = fullScreen
    ? 'fixed inset-0 z-40 bg-gray-50 flex flex-col overflow-hidden'
    : 'min-h-screen bg-gray-50 flex flex-col'

  const title = viewMeta?.title ?? 'Studio'
  const subtitle = viewMeta?.subtitle ?? ''

  return (
    <div className={wrapperClass}>
      {/* Collapsible header: Page title + subtitle + Save / Share */}
      <header className="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <button
              type="button"
              onClick={toggleStudio}
              className="flex items-center gap-1.5 text-left font-bold text-gray-900 hover:text-blue-600"
              aria-expanded={studioOpen}
            >
              <span className="text-sm text-gray-400">{studioOpen ? '▼' : '▶'}</span>
              <span>{title}</span>
            </button>
            {studioOpen && subtitle && (
              <p className="text-gray-500 text-sm mt-0.5 ml-5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {typeof onDashboardNameChange === 'function' && (
              <div className="flex items-center gap-2 min-w-[220px] max-w-[420px]">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Dashboard</span>
                <input
                  value={(dashboardName ?? '').toString()}
                  onChange={(e) => onDashboardNameChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                  }}
                  placeholder="Untitled Dashboard"
                  className="w-full px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Rename dashboard"
                />
              </div>
            )}
            {typeof onBackHome === 'function' && (
              <button
                type="button"
                onClick={onBackHome}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                title="Go to Home"
              >
                Home
              </button>
            )}
            {typeof onBackToDashboards === 'function' && (
              <button
                type="button"
                onClick={onBackToDashboards}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                title="Go to My Dashboards"
              >
                My Dashboards
              </button>
            )}
            <button type="button" onClick={onSave} disabled={saving || !spec} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50" title="Save dashboard">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onShare} disabled={!savedDashboardId} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50" title={savedDashboardId ? 'Copy share link' : 'Save first to share'}>
              {shareCopied ? 'Copied!' : 'Share'}
            </button>
            <button type="button" onClick={onPublicLink} disabled={!spec} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50" title="Copy public link">
              {publicLinkCopied ? 'Copied!' : 'Public link'}
            </button>
          </div>
        </div>
      </header>

      {/* Body: full-width main content (Studio sub-pages via app sidebar only) */}
      <div className="flex-1 flex min-h-0">
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden px-4 py-4">
          {children}
        </main>
      </div>
    </div>
  )
}
