/**
 * Frontend agency view model: same semantics as backend buildAgencyReportModel (evidence-only, no min/max).
 * Used by AgencyReportView to render client-ready report UI.
 */

const CURRENCY_MEASURES = new Set(
  ['revenue', 'price', 'unit_price', 'amount', 'sales', 'total', 'gross', 'unit_cost', 'selling_price', 'list_price'].map((s) => s.toLowerCase())
)

// ---------------------------------------------------------------------------
// 1) Normalization helpers (evidence.breakdowns / evidence.drivers compatible)
// ---------------------------------------------------------------------------

function getDimensionName(obj) {
  const raw =
    obj?.dimension ??
    obj?.payload?.dimension ??
    obj?.dimensionName ??
    obj?.field ??
    obj?.dim ??
    (Array.isArray(obj?.topDrivers) && obj.topDrivers.length > 0 ? obj.topDrivers[0]?.dimension : undefined) ??
    ''
  return raw.toString().trim().toLowerCase()
}

function getRowName(row) {
  return (
    row?.name ??
    row?.key ??
    row?.group ??
    row?.label ??
    ''
  ).toString()
}

function getRowValue(row) {
  return Number(
    row?.value ??
    row?.total ??
    row?.amount ??
    0
  ) || 0
}

// ---------------------------------------------------------------------------
// 2) pickTopNByDimension — normalize from breakdowns + drivers
// ---------------------------------------------------------------------------

function pickTopNByDimension(evidence, dimensionName, n = 5) {
  const target = dimensionName.toString().trim().toLowerCase()

  const breakdowns = Array.isArray(evidence?.breakdowns) ? evidence.breakdowns : []
  const drivers = Array.isArray(evidence?.drivers) ? evidence.drivers : []

  const rows = []

  // From breakdowns: match by source dimension (payload.dimension)
  for (const src of breakdowns) {
    if (getDimensionName(src) !== target) continue
    const arr = src?.rows ?? src?.payload?.rows ?? []
    for (const r of arr) {
      rows.push({ name: getRowName(r), rawValue: getRowValue(r) })
    }
  }

  // From drivers: each topDriver has its own dimension; take rows where row.dimension matches
  for (const src of drivers) {
    const topDrivers = src?.topDrivers ?? []
    for (const r of topDrivers) {
      const dim = (r?.dimension ?? '').toString().trim().toLowerCase()
      if (dim !== target) continue
      rows.push({
        name: getRowName(r),
        rawValue: getRowValue(r),
      })
    }
  }

  rows.sort((a, b) => b.rawValue - a.rawValue)

  return rows.slice(0, n)
}

// KPI/trend formatting (unchanged)
function formatValue(v) {
  if (v == null || v === '') return '—'
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return '—'
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`
    if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`
    if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(2)}K`
    return String(Math.round(v * 100) / 100)
  }
  return String(v)
}

function formatCurrency(v) {
  if (v == null || v === '') return '—'
  const raw = formatValue(v)
  return raw === '—' ? raw : `$${raw}`
}

export function formatSharePct(value, periodTotal) {
  if (value == null || periodTotal == null || periodTotal === 0) return '—'
  const pct = (Number(value) / Number(periodTotal)) * 100
  if (!Number.isFinite(pct)) return '—'
  if (pct >= 99.95 && pct <= 100.05) return '100.0%'
  return `${pct.toFixed(1)}%`
}

// Table cell formatting (value as $ / K, share as percent)
function formatSharePctForTable(value, total) {
  if (!total || total === 0) return '0%'
  return ((value / total) * 100).toFixed(1) + '%'
}

function formatValueForTable(value) {
  const n = Number(value)
  if (n == null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1000) return '$' + (n / 1000).toFixed(2) + 'K'
  return '$' + n.toFixed(0)
}

/**
 * Build agency view model from evidence + narrative (sync, frontend).
 * - KPI 1 = period total; no min/max; tables by dimension (top 5); share as percent.
 */
export function buildAgencyViewModel(evidence, narrative = {}) {
  if (!evidence) {
    return {
      execSummary: { executiveSummary: '', bullets: [] },
      kpiCards: [],
      trend: null,
      tables: [],
      suggestedQuestions: [],
    }
  }

  const primaryMetric = evidence.primaryMetric ? String(evidence.primaryMetric).toLowerCase() : null
  const evidenceKpis = evidence.kpis || []
  const primaryFirst = evidenceKpis.filter((k) => k.primaryMeasure && String(k.primaryMeasure).toLowerCase() === primaryMetric)
  const rest = evidenceKpis.filter((k) => !k.primaryMeasure || String(k.primaryMeasure).toLowerCase() !== primaryMetric)
  const ordered = [...primaryFirst, ...rest]

  let periodTotal = null
  const firstWithPeriod = ordered.find((k) => k.periodTotal != null)
  if (firstWithPeriod != null && typeof firstWithPeriod.periodTotal === 'number' && Number.isFinite(firstWithPeriod.periodTotal)) {
    periodTotal = firstWithPeriod.periodTotal
  }
  if (periodTotal == null && evidence.trends?.[0]?.series?.length) {
    const series = evidence.trends[0].series
    periodTotal = series.reduce((sum, s) => sum + (Number(s.sum) ?? Number(s.count) ?? 0), 0)
  }

  const kpiCards = []
  const primaryKpi = ordered.find((k) => k.primaryMeasure && String(k.primaryMeasure).toLowerCase() === primaryMetric)
  const isPrimaryCurrency = primaryKpi?.primaryMeasure && CURRENCY_MEASURES.has(String(primaryKpi.primaryMeasure).toLowerCase())
  const periodTotalVal = primaryKpi?.periodTotal ?? periodTotal

  if (periodTotalVal != null && primaryKpi) {
    const measureLabel = (primaryKpi.primaryMeasure && String(primaryKpi.primaryMeasure).replace(/_/g, ' ')) || 'Metric'
    kpiCards.push({
      label: `Total ${measureLabel.charAt(0).toUpperCase() + measureLabel.slice(1)} (Period)`,
      value: isPrimaryCurrency ? formatCurrency(periodTotalVal) : formatValue(periodTotalVal),
      changePct: undefined,
      changeClass: undefined,
    })
  }
  if (primaryKpi?.change != null && typeof primaryKpi.change.pct === 'number' && Number.isFinite(primaryKpi.change.pct) && kpiCards.length < 8) {
    const changePct = (primaryKpi.change.pct >= 0 ? '+' : '') + (primaryKpi.change.pct * 100).toFixed(1) + '%'
    kpiCards.push({
      label: 'Change vs prior period',
      value: primaryKpi.change.abs != null ? (isPrimaryCurrency ? formatCurrency(primaryKpi.change.abs) : formatValue(primaryKpi.change.abs)) : changePct,
      changePct,
      changeClass: primaryKpi.change.pct >= 0 ? 'positive' : 'negative',
    })
  }
  const rowCountKpi = evidenceKpis.find((k) => k.rowCount != null)
  if (rowCountKpi != null && kpiCards.length < 8) {
    kpiCards.push({ label: 'Orders / Records', value: formatValue(rowCountKpi.rowCount), changePct: undefined, changeClass: undefined })
  }
  if (isPrimaryCurrency && periodTotalVal != null && rowCountKpi?.rowCount != null && rowCountKpi.rowCount > 0 && kpiCards.length < 8) {
    kpiCards.push({ label: 'AOV', value: formatCurrency(periodTotalVal / rowCountKpi.rowCount), changePct: undefined, changeClass: undefined })
  }
  for (const k of ordered) {
    if (kpiCards.length >= 8) break
    if (k === primaryKpi || k === rowCountKpi) continue
    const val = k.periodTotal ?? k.latest?.value
    if (val == null) continue
    const measureLabel = (k.primaryMeasure && String(k.primaryMeasure).replace(/_/g, ' ')) || k.label || 'Metric'
    const isCurrency = k.primaryMeasure && CURRENCY_MEASURES.has(String(k.primaryMeasure).toLowerCase())
    const changePct = k.change?.pct != null && Number.isFinite(k.change.pct) ? (k.change.pct >= 0 ? '+' : '') + (k.change.pct * 100).toFixed(1) + '%' : undefined
    kpiCards.push({
      label: measureLabel.charAt(0).toUpperCase() + measureLabel.slice(1),
      value: isCurrency ? formatCurrency(val) : formatValue(val),
      changePct,
      changeClass: k.change?.pct >= 0 ? 'positive' : 'negative',
    })
  }

  const firstTrend = evidence.trends?.[0]
  let trend = null
  if (firstTrend?.series?.length) {
    const measure = firstTrend.measure || evidence.primaryMetric || 'Value'
    const grain = firstTrend.grain || 'period'
    const title = `${measure.charAt(0).toUpperCase() + measure.replace(/_/g, ' ').slice(1)} Trend (${grain === 'week' ? 'Weekly' : grain === 'day' ? 'Daily' : grain.charAt(0).toUpperCase() + grain.slice(1)})`
    const subtitle = `By ${measure.replace(/_/g, ' ')}`
    trend = {
      title,
      subtitle,
      series: firstTrend.series,
      timeColumn: firstTrend.timeColumn,
      measure: firstTrend.measure,
      grain: firstTrend.grain,
    }
  }

  // 3) Tables: periodTotal from KPIs; try each dimension name; only push if rows.length > 0
  const periodTotalForTables =
    evidence?.kpis?.find((k) => k.scope === 'period_total')?.periodTotal ??
    evidence?.kpis?.[0]?.periodTotal ??
    periodTotal ??
    0

  const tableConfigs = [
    { dimensionKeysToTry: ['product_name', 'product', 'item', 'sku'], title: 'Top Products', testId: 'agency-table-products' },
    { dimensionKeysToTry: ['product_category', 'category', 'category_name'], title: 'Top Categories', testId: 'agency-table-categories' },
    { dimensionKeysToTry: ['state', 'region', 'country', 'geo', 'location', 'territory'], title: 'Top Regions', testId: 'agency-table-regions' },
    { dimensionKeysToTry: ['payment_method', 'payment_type', 'payment', 'method'], title: 'Payment Methods', testId: 'agency-table-payments' },
  ]

  const tables = []
  for (const { dimensionKeysToTry, title, testId } of tableConfigs) {
    let rowsRaw = []
    for (const dimKey of dimensionKeysToTry) {
      rowsRaw = pickTopNByDimension(evidence, dimKey, 5)
      if (rowsRaw.length > 0) break
    }
    if (rowsRaw.length === 0) continue

    const totalForShare = periodTotalForTables > 0 ? periodTotalForTables : rowsRaw.reduce((s, r) => s + r.rawValue, 0) || 1
    const rows = rowsRaw.map((r) => ({
      name: r.name,
      value: formatValueForTable(r.rawValue),
      share: formatSharePctForTable(r.rawValue, totalForShare),
    }))
    tables.push({ title, testId, rows })
  }

  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
    console.log('[AgencyModel] tables built:', tables)
  }

  const executiveSummary = typeof narrative.executiveSummary === 'string' ? narrative.executiveSummary : 'Review the key metrics and insights below.'
  const bullets = Array.isArray(narrative.topInsights) ? narrative.topInsights.slice(0, 5) : []
  const suggestedQuestions = Array.isArray(narrative.suggestedQuestions) ? narrative.suggestedQuestions.slice(0, 3) : []

  return {
    execSummary: { executiveSummary, bullets },
    kpiCards: kpiCards.slice(0, 8),
    trend,
    tables,
    suggestedQuestions,
  }
}
