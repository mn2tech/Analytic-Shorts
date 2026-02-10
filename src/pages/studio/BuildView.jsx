/**
 * BuildView – Manual drag-and-drop builder: palette, style, save & share.
 * For AI-driven report creation use Report Chat.
 */

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReportWidgetPalette from '../../components/aiVisualBuilder/ReportWidgetPalette'

export default function BuildView({
  datasetId,
  schema,
  data,
  uploadedData,
  spec,
  setSpec,
  loadSavedSpec,
  clearSpec,
  savedApps,
  dashboardTitle,
  setDashboardTitle,
  handleSaveDashboard,
  handleShare,
  handleGetPublicLink,
  saving,
  saveError,
  savedDashboardId,
  shareCopied,
  publicLinkCopied,
  // Unused here (AI lives in Report Chat); kept for prop compatibility
  loading,
  error,
  prompt,
  setPrompt,
  promptHistory,
  handleGenerate,
  onSuggestionClick
}) {
  const navigate = useNavigate()
  const paletteSectionRef = useRef(null)
  const hasData = !!(data?.length || uploadedData?.length)

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ minHeight: 480 }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {schema && (
          <div ref={paletteSectionRef} className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Drag & Drop Builder</h2>
            <p className="text-xs text-gray-500 mb-3">
              Drag filters and charts onto the report canvas to build your dashboard. Use <strong>Report Chat</strong> for AI-generated reports.
            </p>
            <ReportWidgetPalette disabled={!hasData} />
          </div>
        )}
        {!schema && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            <p className="font-medium">No data schema yet</p>
            <p className="mt-1">Go to <strong>Data</strong> to load or upload a dataset, or use <strong>Report Chat</strong> to generate a report with AI.</p>
          </div>
        )}
        <details className="bg-white rounded-lg border border-gray-200 p-4">
          <summary className="cursor-pointer font-semibold text-gray-900">Style (Advanced)</summary>
          {spec && (
            <div className="mt-3 space-y-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Theme</span>
                <div className="flex flex-col gap-1">
                  {['light', 'dark', 'executive'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSpec((s) => ({ ...s, style: { ...(s?.style || {}), theme: t } }))}
                      className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.theme || 'light') === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}
                    >
                      {t === 'executive' ? 'Executive' : t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Bar look</span>
                <div className="flex flex-col gap-1">
                  {['sheen', 'flat'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSpec((s) => ({ ...s, style: { ...(s?.style || {}), barStyle: b } }))}
                      className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.barStyle || 'sheen') === b ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Palette</span>
                <div className="flex flex-col gap-1">
                  {['default', 'minimal', 'pastel'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSpec((s) => ({ ...s, style: { ...(s?.style || {}), palette: p } }))}
                      className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.palette || 'default') === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Measure size</span>
                <div className="flex flex-col gap-1">
                  {[
                    { id: 'small', label: 'Small' },
                    { id: 'medium', label: 'Medium' },
                    { id: 'large', label: 'Large' }
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSpec((s) => ({ ...s, style: { ...(s?.style || {}), measureSize: id } }))}
                      className={`px-2 py-1.5 text-sm rounded text-left ${(spec?.style?.measureSize || 'medium') === id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">Font</span>
                <div className="flex flex-col gap-1">
                  {[
                    { id: 'system', label: 'System' },
                    { id: 'sans', label: 'Sans' },
                    { id: 'serif', label: 'Serif' },
                    { id: 'mono', label: 'Monospace' }
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSpec((s) => ({ ...s, style: { ...(s?.style || {}), fontFamily: id } }))}
                      className={`px-2 py-1.5 text-sm rounded text-left ${(spec?.style?.fontFamily || 'system') === id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </details>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadSavedSpec}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            Load saved
          </button>
          <button type="button" onClick={clearSpec} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded">
            Clear spec
          </button>
        </div>
        {savedApps?.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Your saved dashboards</h2>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {savedApps.map((app) => (
                <li key={app.id} className="flex items-center gap-2 group">
                  <button
                    type="button"
                    onClick={() => navigate(`/studio/chat?open=${app.id}`)}
                    className="text-left text-sm text-blue-600 hover:underline flex-1 min-w-0 py-1.5 px-2 rounded hover:bg-blue-50 truncate"
                    title={app.name}
                  >
                    {app.name}
                  </button>
                  <a
                    href={`/apps/${app.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-500 hover:text-blue-600 shrink-0 py-1.5 px-2 rounded hover:bg-blue-50"
                    title="View in new tab"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Save & share</h2>
          <label className="block text-xs text-gray-500 mb-1">Dashboard title</label>
          <input
            type="text"
            value={dashboardTitle}
            onChange={(e) => {
              setDashboardTitle(e.target.value)
              if (spec) setSpec((s) => (s ? { ...s, title: e.target.value } : null))
            }}
            placeholder="e.g. Sales by Region"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm mb-3"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveDashboard}
              disabled={saving || !spec}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : 'Save dashboard'}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={!savedDashboardId}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={savedDashboardId ? 'Copy link to clipboard' : 'Save first to share'}
            >
              {shareCopied ? 'Copied!' : 'Share link'}
            </button>
            <button
              type="button"
              onClick={handleGetPublicLink}
              disabled={!spec}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy view-only link (works without login)"
            >
              {publicLinkCopied ? 'Copied!' : 'Get public link'}
            </button>
          </div>
          {saveError && <p className="mt-2 text-xs text-red-600">{saveError}</p>}
          {savedDashboardId && <p className="mt-2 text-xs text-green-700">Saved. Share link copies the view URL.</p>}
        </div>
      </div>
    </div>
  )
}
