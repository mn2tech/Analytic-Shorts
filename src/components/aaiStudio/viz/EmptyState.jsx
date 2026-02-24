/**
 * Compact empty state for NOT_APPLICABLE or no-data blocks.
 * Uses theme vars only.
 */

export default function EmptyState({ title = 'No data', message, hint, icon }) {
  return (
    <div
      className="rounded-xl p-6 text-center"
      style={{
        background: 'var(--card-2)',
        border: '1px dashed var(--border)',
        color: 'var(--muted)',
      }}
    >
      {icon && <div className="mb-2 flex justify-center" style={{ color: 'var(--muted)' }}>{icon}</div>}
      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{title}</div>
      {message && <p className="mt-1 text-xs">{message}</p>}
      {hint && <p className="mt-2 text-xs opacity-80">{hint}</p>}
    </div>
  )
}

/** Preset for Geo when no region/state data. */
export function GeoEmptyState() {
  return (
    <EmptyState
      title="No geo fields found"
      message="No region or state column was detected in this dataset."
      hint="Add a column with US state names/codes, or lat/lon, to enable the map."
    />
  )
}
