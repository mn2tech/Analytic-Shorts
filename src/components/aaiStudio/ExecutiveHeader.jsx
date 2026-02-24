import React from 'react'

const CONFIDENCE_STYLES = {
  High: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function ExecutiveHeader({
  projectTitle = 'Executive Intelligence',
  runTimestamp = null,
  confidence = 'Medium',
  templateName = null,
  themeName = null,
  onRegenerate,
  onExplainMethods,
  onExport,
  onSavePrivate,
  onShareToFeed,
  savedDashboardId = null,
  saveLoading = false,
  loading = false,
}) {
  const confidenceLabel = CONFIDENCE_STYLES[confidence] ? confidence : 'Medium'
  const confidenceClass = CONFIDENCE_STYLES[confidenceLabel] || CONFIDENCE_STYLES.Medium

  return (
    <header className="border-b px-4 py-4 shadow-sm" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: 'var(--text)' }}>{projectTitle}</h1>
          {runTimestamp != null && (
            <span className="text-sm" style={{ color: 'var(--muted)' }} title="Last run">
              {typeof runTimestamp === 'string' ? runTimestamp : new Date(runTimestamp).toLocaleString()}
            </span>
          )}
          {themeName && (
            <span className="text-xs px-2 py-1 rounded-full border" style={{ background: 'var(--card-2)', color: 'var(--muted)', borderColor: 'var(--border)' }}>
              {themeName}
            </span>
          )}
          {templateName && (
            <span className="text-xs px-2 py-1 rounded-full border" style={{ background: 'var(--card-2)', color: 'var(--text)', borderColor: 'var(--border)' }}>
              Template: {templateName}
            </span>
          )}
          <span className={`text-xs px-2 py-1 rounded-full border ${confidenceClass}`}>
            Confidence: {confidenceLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {typeof onSavePrivate === 'function' && (
            <button
              type="button"
              onClick={onSavePrivate}
              disabled={loading || saveLoading}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50"
              style={{ background: savedDashboardId ? 'var(--card-2)' : 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }}
            >
              {saveLoading ? 'Saving…' : savedDashboardId ? 'Saved' : 'Save private'}
            </button>
          )}
          {typeof onShareToFeed === 'function' && (
            <button
              type="button"
              onClick={onShareToFeed}
              disabled={loading || saveLoading}
              className="px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
            >
              Share to feed
            </button>
          )}
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50"
            style={{ background: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={onExplainMethods}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50"
            style={{ background: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            Explain Methods
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border disabled:opacity-50"
            style={{ background: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }}
          >
            Export
          </button>
        </div>
      </div>
    </header>
  )
}
