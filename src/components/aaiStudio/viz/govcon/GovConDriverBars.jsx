/**
 * GovCon: Top Drivers of Growth – horizontal bars with % lift labels.
 */
import { useMemo } from 'react'

function formatLiftLabel(liftPct) {
  if (liftPct == null || !Number.isFinite(liftPct)) return '—'
  const sign = liftPct >= 0 ? '+' : ''
  return `${sign}${Number(liftPct).toFixed(1)}%`
}

export default function GovConDriverBars({ block }) {
  const topDrivers = useMemo(() => {
    const raw = block?.payload?.topDrivers
    if (!Array.isArray(raw)) return []
    return raw.slice(0, 10).map((d) => ({
      label: d.label ?? d.group ?? '—',
      liftPct: d.liftPct != null ? d.liftPct : (d.lift != null ? d.lift * 100 : null),
      sharePct: d.sharePct != null ? d.sharePct : (d.share != null ? d.share * 100 : null),
      share: d.share ?? 0,
    }))
  }, [block?.payload?.topDrivers])

  const maxShare = useMemo(() => Math.max(...topDrivers.map((d) => d.share || 0), 0.01), [topDrivers])

  if (topDrivers.length === 0) {
    return (
      <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>
          Top Drivers of Growth
        </h4>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No driver data available.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Top Drivers of Growth
      </h4>
      <div className="space-y-2">
        {topDrivers.map((d, i) => (
          <div key={d.label + i} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>
                {d.label}
              </div>
              <div
                className="h-2 rounded-full mt-0.5 overflow-hidden"
                style={{ background: 'var(--card-2)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (d.share || 0) / maxShare * 100)}%`,
                    background: 'var(--chart-primary)',
                  }}
                />
              </div>
            </div>
            <div className="shrink-0 text-xs font-medium" style={{ color: 'var(--chart-positive)', minWidth: '3.5rem' }}>
              {d.liftPct != null ? formatLiftLabel(d.liftPct) : (d.lift != null ? formatLiftLabel(d.lift * 100) : '—')}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
        Lift % vs overall average. Bar = share of total.
      </p>
    </div>
  )
}
