/**
 * GovCon: Top States list – ranked with counts (from GeoBlock rows).
 */
import { useMemo } from 'react'
import { aggregateByState } from '../usStateCodes'

function formatValue(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  return Number(v).toLocaleString()
}

export default function TopStatesList({ rows = [], title = 'Top States' }) {
  const topStates = useMemo(() => {
    const byState = aggregateByState(Array.isArray(rows) ? rows : [])
    return [...byState].sort((a, b) => b.value - a.value).slice(0, 10)
  }, [rows])

  if (topStates.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
          {title}
        </h4>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No state data
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        {title}
      </h4>
      <ol className="space-y-1.5">
        {topStates.map((s, i) => (
          <li
            key={s.stateCode + i}
            className="flex items-center justify-between text-sm"
            style={{ color: 'var(--text)' }}
          >
            <span className="font-medium">{i + 1}. {s.stateCode}</span>
            <span style={{ color: 'var(--muted)' }}>{formatValue(s.value)}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
