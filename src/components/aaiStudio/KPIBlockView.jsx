import { formatNum as formatNumBase, isCurrencyMeasure } from './formatUtils'

function formatNum(v, currency) {
  return formatNumBase(v, { currency: !!currency })
}

function DeltaArrow({ value }) {
  if (value == null || !Number.isFinite(value)) return null
  const up = value >= 0
  const pct = Math.abs(value) < 1 ? (value * 100).toFixed(1) : value.toFixed(1)
  return (
    <span style={{ color: up ? 'var(--chart-positive)' : 'var(--chart-negative)' }} title={`${up ? '+' : ''}${pct}%`}>
      {up ? '↑' : '↓'} {pct}%
    </span>
  )
}

function KPICard({ label, value, delta, subLabel, className = '' }) {
  return (
    <div className={`p-4 rounded-xl shadow-sm ${className}`} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-medium uppercase tracking-wide truncate" style={{ color: 'var(--muted)' }} title={label}>{label}</div>
      <div className="text-[clamp(1.45rem,2vw,2.2rem)] font-bold mt-1 leading-tight break-words" style={{ color: 'var(--text)' }}>{value}</div>
      {(delta != null || subLabel) && (
        <div className="text-xs mt-1 flex items-start gap-2 flex-wrap" style={{ color: 'var(--muted)' }}>
          {delta != null && <DeltaArrow value={delta} />}
          {subLabel && <span>{subLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default function KPIBlockView({ block }) {
  const payload = block?.payload || {}
  const rowCount = payload.rowCount
  const executiveKpis = payload.executiveKpis
  const metricSummaries = Array.isArray(payload.metricSummaries) ? payload.metricSummaries : []
  const dueSoon = payload.dueSoon
  const avgDays = payload.avgDays ?? payload.averageDays

  const cards = []
  const primaryMeasureLabel =
    payload.primaryMeasure && String(payload.primaryMeasure).trim()
      ? String(payload.primaryMeasure)
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Total'
  const anyMetricIsCurrency = metricSummaries.some((m) => isCurrencyMeasure(m?.name))
  const useCurrency = isCurrencyMeasure(payload.primaryMeasure) || anyMetricIsCurrency

  // Total / primary measure: row count or latest value
  const totalValue = executiveKpis?.latest?.value != null
    ? formatNum(executiveKpis.latest.value, useCurrency)
    : (rowCount != null ? Number(rowCount).toLocaleString() : '—')
  cards.push({ key: 'total', label: primaryMeasureLabel, value: totalValue, delta: null, subLabel: executiveKpis?.latest?.period ? `Period: ${executiveKpis.latest.period}` : null })

  // Due Soon (if applicable)
  if (dueSoon != null && (typeof dueSoon === 'number' || (typeof dueSoon === 'object' && dueSoon.value != null))) {
    const v = typeof dueSoon === 'object' ? dueSoon.value : dueSoon
    cards.push({ key: 'dueSoon', label: 'Due Soon', value: Number.isFinite(v) ? Number(v).toLocaleString() : String(v), delta: null, subLabel: null })
  }

  // Avg Days
  if (avgDays != null && Number.isFinite(Number(avgDays))) {
    cards.push({ key: 'avgDays', label: 'Avg Days', value: formatNum(avgDays), delta: null, subLabel: null })
  }

  // Top Contributor
  if (executiveKpis?.topContributor) {
    const tc = executiveKpis.topContributor
    const sharePct = (tc.share * 100).toFixed(1)
    cards.push({
      key: 'topContributor',
      label: `Top ${tc.dimension || 'Contributor'}`,
      value: tc.group || '—',
      delta: null,
      subLabel: `${sharePct}% of total`,
    })
  }

  // Change vs Prior
  if (executiveKpis?.change) {
    const ch = executiveKpis.change
    cards.push({
      key: 'change',
      label: 'Change vs Prior',
      value: formatNum(ch.abs, useCurrency),
      delta: ch.pct,
      subLabel: null,
    })
  }

  // Metric summaries (fill up to 6 cards)
  for (const m of metricSummaries) {
    if (cards.length >= 6) break
    const mean = m.summary?.mean
    const mCurrency = isCurrencyMeasure(m.name)
    cards.push({
      key: `metric-${m.name}`,
      label: m.name || 'Metric',
      value: formatNum(mean, mCurrency),
      delta: null,
      subLabel: m.summary != null ? `min ${formatNum(m.summary.min, mCurrency)} · max ${formatNum(m.summary.max, mCurrency)}` : null,
    })
  }

  if (cards.length === 0) {
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <KPICard label="Total" value="—" />
      </div>
    )
  }

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
      {cards.map((c) => (
        <KPICard key={c.key} label={c.label} value={c.value} delta={c.delta} subLabel={c.subLabel} />
      ))}
    </div>
  )
}
