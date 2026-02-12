/**
 * Quick "View metric" / "View by category" overrides for DashboardSpec.
 * This is used to let users switch the primary metric/dimension without re-prompting.
 */

export function preferredAggregationForMetric(field) {
  const s = String(field || '').toLowerCase()
  if (!s) return 'sum'
  if (
    s.includes('rate') ||
    s.includes('pct') ||
    s.includes('percent') ||
    s.includes('ratio') ||
    s.includes('adr') ||
    s.includes('revpar') ||
    s.includes('occupancy') ||
    s.includes('available') ||
    s.includes('capacity') ||
    s.includes('inventory') ||
    s.includes('utilization')
  ) return 'avg'
  return 'sum'
}

export function formatFieldLabel(field) {
  const raw = String(field || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (lower === 'adr') return 'ADR'
  if (lower === 'revpar') return 'RevPAR'
  if (lower === 'occupancy_rate') return 'Occupancy Rate'

  const withSpaces = raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()

  return withSpaces
    .split(/\s+/)
    .map((w) => {
      const wl = w.toLowerCase()
      if (wl === 'id') return 'ID'
      if (wl === 'api') return 'API'
      if (wl === 'usd') return 'USD'
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

function chartSupportsDimension(type) {
  const t = String(type || '').toLowerCase()
  return t.includes('bar') || t === 'pie' || t === 'radial_bar' || t === 'table'
}

function chartSupportsMetric(type) {
  const t = String(type || '').toLowerCase()
  return t.includes('line') || t.includes('area') || t.includes('bar') || t === 'pie' || t === 'radial_bar' || t === 'scatter'
}

function withMetric(chart, metric) {
  if (!metric) return chart
  const agg = preferredAggregationForMetric(metric)
  const out = { ...chart }
  // Common aliases supported by renderer
  out.yField = metric
  out.metric = metric
  out.field = metric
  out.aggregation = out.aggregation || agg
  // If it was explicitly sum/avg, override to sensible default for the metric
  if (out.aggregation === 'sum' || out.aggregation === 'avg') out.aggregation = agg
  if (out.title) {
    const dim = out.xField || out.dimension
    if (dim) {
      const aggLabel = out.aggregation === 'avg' ? 'Average' : out.aggregation === 'count' ? 'Count' : 'Total'
      out.title = `${aggLabel} ${formatFieldLabel(metric)} by ${formatFieldLabel(dim)}`
    } else {
      out.title = `${formatFieldLabel(metric)}`
    }
  }
  return out
}

function withDimension(chart, dimension) {
  if (!dimension) return chart
  const out = { ...chart }
  out.xField = dimension
  out.dimension = dimension
  if (out.title) {
    const met = out.yField || out.metric || out.field
    if (met) {
      const agg = out.aggregation || preferredAggregationForMetric(met)
      const aggLabel = agg === 'avg' ? 'Average' : agg === 'count' ? 'Count' : 'Total'
      out.title = `${aggLabel} ${formatFieldLabel(met)} by ${formatFieldLabel(dimension)}`
    } else {
      out.title = `${formatFieldLabel(dimension)}`
    }
  }
  return out
}

function updateCharts(charts, { metric, dimension }) {
  const arr = Array.isArray(charts) ? charts : []
  return arr.map((c) => {
    let out = { ...c }
    if (metric && chartSupportsMetric(out.type)) out = withMetric(out, metric)
    if (dimension && chartSupportsDimension(out.type)) out = withDimension(out, dimension)
    return out
  })
}

function updateKpis(kpis, metric) {
  const arr = Array.isArray(kpis) ? kpis : []
  if (!metric) return arr
  const agg = preferredAggregationForMetric(metric)
  return arr.map((k) => ({
    ...k,
    field: metric,
    aggregation: (k.aggregation === 'sum' || k.aggregation === 'avg' || !k.aggregation) ? agg : k.aggregation,
    label: k.label ? k.label : `KPI (${formatFieldLabel(metric)})`,
  }))
}

/**
 * Returns a new DashboardSpec with best-effort overrides applied.
 * Does NOT mutate the input object.
 */
export function applyQuickSwitchToSpec(spec, { metric, dimension } = {}) {
  if (!spec || typeof spec !== 'object') return spec
  const out = { ...spec }

  if (out.tabs && Array.isArray(out.tabs)) {
    out.tabs = out.tabs.map((t) => ({
      ...t,
      kpis: updateKpis(t.kpis, metric),
      charts: updateCharts(t.charts, { metric, dimension }),
    }))
  }

  out.kpis = updateKpis(out.kpis, metric)
  out.charts = updateCharts(out.charts, { metric, dimension })
  return out
}

