/**
 * GovCon: Opportunities Over Time (Weekly) – hero chart with anomaly marker + light band.
 */
import TrendHeroChart from '../TrendHeroChart'

export default function GovConTrendHero(props) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Opportunities Over Time (Weekly)
      </h4>
      <TrendHeroChart {...props} />
      {Array.isArray(props.block?.payload?.anomalies) && props.block.payload.anomalies.length > 0 && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>Anomaly markers:</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'var(--card-2)', color: 'var(--warning)', border: '1px solid var(--warning)' }}
          >
            {props.block.payload.anomalies.length} period(s)
          </span>
        </div>
      )}
    </div>
  )
}
