/**
 * Evidence → Agency ViewModel: client-ready report model (KPIs, tables by dimension, no internal metadata).
 * Used when mode === "agency" for PDF/HTML export.
 */
const { renderTrendChartImage } = require('../../utils/renderTrendChartPng')

const CURRENCY_MEASURES = new Set(['revenue', 'price', 'unit_price', 'amount', 'sales', 'total', 'gross', 'unit_cost', 'selling_price', 'list_price'].map((s) => s.toLowerCase()))
const PRODUCT_DIMENSION_HINTS = ['product', 'product_name', 'item', 'sku']
const CATEGORY_DIMENSION_HINTS = ['category', 'product_category', 'category_name']
const GEO_DIMENSION_HINTS = ['state', 'country', 'region', 'geo', 'location', 'territory']
const PAYMENT_DIMENSION_HINTS = ['payment_method', 'payment_type', 'payment', 'method']

const DIMENSION_TABLE_ORDER = [
  { key: 'product', hints: PRODUCT_DIMENSION_HINTS, title: 'Top Products' },
  { key: 'category', hints: CATEGORY_DIMENSION_HINTS, title: 'Top Categories' },
  { key: 'region', hints: GEO_DIMENSION_HINTS, title: 'Top Regions' },
  { key: 'payment', hints: PAYMENT_DIMENSION_HINTS, title: 'Payment Methods' },
]

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

/** Format share as percent from value and period total; never "1" unless exactly 100.0%. */
function formatSharePct(value, periodTotal) {
  if (value == null || periodTotal == null || periodTotal === 0) return '—'
  const pct = (Number(value) / Number(periodTotal)) * 100
  if (!Number.isFinite(pct)) return '—'
  if (pct >= 99.95 && pct <= 100.05) return '100.0%'
  return `${pct.toFixed(1)}%`
}

/** Pick top N rows by dimension from evidence (breakdowns first, then drivers). */
function pickTopNByDimension(evidence, dimensionName, n = 5) {
  const breakdowns = evidence?.breakdowns || []
  const drivers = evidence?.drivers || []
  const dimLower = String(dimensionName || '').toLowerCase()

  const rows = []

  // From breakdowns: match by source dimension
  const fromBreakdown = breakdowns.find((b) => {
    const d = (b.dimension && String(b.dimension).toLowerCase()) || ''
    return d === dimLower || dimLower.split(/_/).every((p) => d.includes(p))
  })
  if (fromBreakdown && fromBreakdown.rows && fromBreakdown.rows.length > 0) {
    fromBreakdown.rows.forEach((r) => {
      rows.push({ key: r.key ?? '', value: r.value ?? r.sum ?? r.count })
    })
  }

  // From drivers: each topDriver may have its own dimension, or use driver-level dimension
  for (const d of drivers) {
    const driverDim = (d.dimension && String(d.dimension).toLowerCase()) || ''
    const topDrivers = d.topDrivers || []
    for (const row of topDrivers) {
      const rowDim = (row.dimension && String(row.dimension).toLowerCase()) || driverDim
      const matches = rowDim && (rowDim === dimLower || dimLower.split(/_/).every((p) => rowDim.includes(p)))
      if (!matches) continue
      rows.push({ key: row.group ?? '', value: row.total })
    }
  }

  return rows
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .slice(0, n)
}

/**
 * Build AgencyReportModel from evidence + narrative + reportMeta + branding.
 * - KPI 1 = period total (not latest day); no min/max; tables by dimension (top 5); share as percent.
 */
async function buildAgencyReportModel({ evidence, narrative = {}, reportMeta = {}, branding = {} }) {
  const agencyName = String(branding.agencyName || 'Agency').trim() || 'Agency'
  const agencyLogoUrl = branding.agencyLogoUrl && String(branding.agencyLogoUrl).trim() ? String(branding.agencyLogoUrl).trim() : null
  const reportTitle = String(reportMeta.reportTitle || 'Analytics Report').trim() || 'Analytics Report'
  const clientName = reportMeta.clientName ? String(reportMeta.clientName).trim() : null
  const dateRange = reportMeta.dateRange ? String(reportMeta.dateRange).trim() : null
  const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const header = {
    agencyName,
    agencyLogoUrl: agencyLogoUrl || undefined,
    clientName: clientName || undefined,
    reportTitle,
    dateRange: dateRange || undefined,
    generatedAt,
  }

  const executiveSummary = typeof narrative.executiveSummary === 'string' ? narrative.executiveSummary : 'Review the key metrics and insights below.'
  const topInsights = Array.isArray(narrative.topInsights) ? narrative.topInsights.slice(0, 5) : []
  const execSummary = { executiveSummary, bullets: topInsights }

  const primaryMetric = evidence?.primaryMetric ? String(evidence.primaryMetric).toLowerCase() : null
  const evidenceKpis = evidence?.kpis || []
  const primaryFirst = evidenceKpis.filter((k) => k.primaryMeasure && String(k.primaryMeasure).toLowerCase() === primaryMetric)
  const rest = evidenceKpis.filter((k) => !k.primaryMeasure || String(k.primaryMeasure).toLowerCase() !== primaryMetric)
  const ordered = [...primaryFirst, ...rest]

  let periodTotal = null
  const firstWithPeriod = ordered.find((k) => k.periodTotal != null)
  if (firstWithPeriod != null && typeof firstWithPeriod.periodTotal === 'number' && Number.isFinite(firstWithPeriod.periodTotal)) {
    periodTotal = firstWithPeriod.periodTotal
  }
  if (periodTotal == null && evidence?.trends?.[0]?.series?.length) {
    const series = evidence.trends[0].series
    periodTotal = series.reduce((sum, s) => sum + (Number(s.sum) ?? Number(s.count) ?? 0), 0)
  }

  const kpiCards = []
  const primaryKpi = ordered.find((k) => k.primaryMeasure && String(k.primaryMeasure).toLowerCase() === primaryMetric)
  const isPrimaryCurrency = primaryKpi && primaryKpi.primaryMeasure && CURRENCY_MEASURES.has(String(primaryKpi.primaryMeasure).toLowerCase())
  const periodTotalVal = primaryKpi?.periodTotal ?? periodTotal

  if (periodTotalVal != null && primaryKpi) {
    const measureLabel = (primaryKpi.primaryMeasure && String(primaryKpi.primaryMeasure).replace(/_/g, ' ')) || 'Metric'
    const label = `Total ${measureLabel.charAt(0).toUpperCase() + measureLabel.slice(1)} (Period)`
    kpiCards.push({
      label,
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
    kpiCards.push({
      label: 'Orders / Records',
      value: formatValue(rowCountKpi.rowCount),
      changePct: undefined,
      changeClass: undefined,
    })
  }
  if (isPrimaryCurrency && periodTotalVal != null && rowCountKpi?.rowCount != null && rowCountKpi.rowCount > 0 && kpiCards.length < 8) {
    const aov = periodTotalVal / rowCountKpi.rowCount
    kpiCards.push({
      label: 'AOV',
      value: formatCurrency(aov),
      changePct: undefined,
      changeClass: undefined,
    })
  }
  for (const k of ordered) {
    if (kpiCards.length >= 8) break
    if (k === primaryKpi || k === rowCountKpi) continue
    const measureLabel = (k.primaryMeasure && String(k.primaryMeasure).replace(/_/g, ' ')) || k.label || 'Metric'
    const isCurrency = k.primaryMeasure && CURRENCY_MEASURES.has(String(k.primaryMeasure).toLowerCase())
    const val = k.periodTotal ?? k.latest?.value
    if (val == null) continue
    const label = measureLabel.charAt(0).toUpperCase() + measureLabel.slice(1)
    const changePct = k.change?.pct != null && Number.isFinite(k.change.pct) ? (k.change.pct >= 0 ? '+' : '') + (k.change.pct * 100).toFixed(1) + '%' : undefined
    kpiCards.push({
      label,
      value: isCurrency ? formatCurrency(val) : formatValue(val),
      changePct,
      changeClass: k.change?.pct >= 0 ? 'positive' : 'negative',
    })
  }
  const kpiCardsFinal = kpiCards.slice(0, 8)

  let trendTitle = ''
  let trendSubtitle = ''
  let trendChartImageUrl = null
  const firstTrend = (evidence?.trends || [])[0]
  if (firstTrend && firstTrend.series && firstTrend.series.length > 0) {
    const measure = firstTrend.measure || evidence?.primaryMetric || 'Value'
    const grain = firstTrend.grain || 'period'
    trendTitle = `${measure.charAt(0).toUpperCase() + measure.replace(/_/g, ' ').slice(1)} Trend (${grain === 'week' ? 'Weekly' : grain === 'day' ? 'Daily' : grain.charAt(0).toUpperCase() + grain.slice(1)})`
    trendSubtitle = `By ${measure.replace(/_/g, ' ')}`
    trendChartImageUrl = await renderTrendChartImage(firstTrend)
  }
  const trend = {
    title: trendTitle || 'Revenue Trend (Weekly)',
    subtitle: trendSubtitle || undefined,
    trendChartImageUrl: trendChartImageUrl || undefined,
    series: firstTrend?.series || [],
  }

  const tables = []
  for (const { key, hints, title } of DIMENSION_TABLE_ORDER) {
    const breakdown = (evidence?.breakdowns || []).find((b) => {
      const dim = (b.dimension && String(b.dimension).toLowerCase()) || ''
      return hints.some((h) => dim.includes(h))
    })
    const dimensionName = breakdown?.dimension || hints[0]
    const rowsRaw = pickTopNByDimension(evidence, dimensionName, 5)
    if (rowsRaw.length === 0) continue
    const totalForShare = periodTotal != null ? periodTotal : rowsRaw.reduce((s, r) => s + (Number(r.value) || 0), 0) || 1
    const rows = rowsRaw.map((r) => {
      const val = r.value ?? r.sum ?? r.count
      const num = Number(val)
      const share = Number.isFinite(num) && totalForShare ? formatSharePct(num, totalForShare) : (typeof r.share === 'number' ? `${(r.share * 100).toFixed(1)}%` : '—')
      return {
        name: String(r.key ?? ''),
        value: formatValue(val),
        share,
      }
    })
    tables.push({ title, dimension: dimensionName, rows })
  }

  const suggestedQuestions = Array.isArray(narrative.suggestedQuestions) ? narrative.suggestedQuestions.slice(0, 3) : []

  return {
    header,
    execSummary,
    kpiCards: kpiCardsFinal,
    hasKpis: kpiCardsFinal.length > 0,
    trend,
    tables,
    suggestedQuestions,
    hasSuggestedQuestions: suggestedQuestions.length > 0,
  }
}

module.exports = { buildAgencyReportModel, pickTopNByDimension, formatSharePct, formatValue, formatCurrency }
