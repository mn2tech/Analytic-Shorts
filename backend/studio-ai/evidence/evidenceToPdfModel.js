/**
 * Convert Evidence DTO + narrative + branding to the PDF HTML template view model.
 */
const { renderTrendChartImage } = require('../../utils/renderTrendChartPng')

const CURRENCY_MEASURES = new Set(['revenue', 'price', 'unit_price', 'amount', 'sales', 'total', 'gross', 'unit_cost', 'selling_price', 'list_price'].map((s) => s.toLowerCase()))
const GEO_DIMENSION_HINTS = ['state', 'country', 'region', 'geo', 'location', 'territory']
const PRODUCT_DIMENSION_HINTS = ['product', 'product_name', 'item', 'sku', 'category', 'product_category']

function formatKpiValue(v) {
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

function formatKpiValueCurrency(v) {
  if (v == null || v === '') return '—'
  const raw = formatKpiValue(v)
  return raw === '—' ? raw : `$${raw}`
}

/**
 * Build view model for agency_report.html.
 * @param {Object} opts
 * @param {Object} opts.evidence - Evidence DTO from assembleEvidence
 * @param {Object} opts.narrative - { executiveSummary, topInsights, suggestedQuestions }
 * @param {Object} opts.branding - { agencyName, agencyLogoUrl?, agencyTagline? }
 * @param {Object} opts.reportMeta - { clientName?, reportTitle?, dateRange? }
 * @returns {Promise<Object>} Template data (kpis, topInsights, trendChartImageUrl, etc.)
 */
async function buildPdfModel({ evidence, narrative = {}, branding = {}, reportMeta = {} }) {
  const agencyName = String(branding.agencyName || 'Agency').trim() || 'Agency'
  const agencyLogoUrl = branding.agencyLogoUrl && String(branding.agencyLogoUrl).trim() ? String(branding.agencyLogoUrl).trim() : null
  const agencyTagline = branding.agencyTagline ? String(branding.agencyTagline).trim() : null
  const reportTitle = String(reportMeta.reportTitle || 'Analytics Report').trim() || 'Analytics Report'
  const clientName = reportMeta.clientName ? String(reportMeta.clientName).trim() : null
  const dateRange = reportMeta.dateRange ? String(reportMeta.dateRange).trim() : null
  const generatedAt = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })

  const executiveSummary = typeof narrative.executiveSummary === 'string' ? narrative.executiveSummary : 'Review the key metrics and insights below.'
  const topInsights = Array.isArray(narrative.topInsights) ? narrative.topInsights.slice(0, 5) : []
  const suggestedQuestions = Array.isArray(narrative.suggestedQuestions) ? narrative.suggestedQuestions.slice(0, 3) : []

  const primaryMetric = evidence?.primaryMetric ? String(evidence.primaryMetric).toLowerCase() : null
  const evidenceKpis = evidence?.kpis || []
  const kpiCards = []
  const primaryFirst = evidenceKpis.filter((k) => k.primaryMeasure && String(k.primaryMeasure).toLowerCase() === primaryMetric)
  const rest = evidenceKpis.filter((k) => !k.primaryMeasure || String(k.primaryMeasure).toLowerCase() !== primaryMetric)
  const ordered = [...primaryFirst, ...rest].slice(0, 8)
  for (const k of ordered) {
    const latest = k.latest?.value
    const valueStr = latest != null ? formatKpiValue(latest) : (k.rowCount != null ? String(k.rowCount) : '—')
    const useCurrency = k.primaryMeasure && CURRENCY_MEASURES.has(String(k.primaryMeasure).toLowerCase())
    const value = useCurrency && latest != null ? formatKpiValueCurrency(latest) : valueStr
    const label = (k.primaryMeasure && String(k.primaryMeasure).replace(/_/g, ' ')) || k.label || 'Metric'
    const change = k.change
    let changePct = null
    let changeClass = ''
    if (change && typeof change.pct === 'number' && Number.isFinite(change.pct)) {
      changePct = (change.pct >= 0 ? '+' : '') + (change.pct * 100).toFixed(1) + '%'
      changeClass = change.pct >= 0 ? 'positive' : 'negative'
    }
    kpiCards.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
      changePct: changePct || undefined,
      changeClass: changeClass || undefined,
    })
  }

  let trendTitle = ''
  let trendSubtitle = ''
  let trendChartImageUrl = null
  const firstTrend = (evidence?.trends || [])[0]
  if (firstTrend && firstTrend.series && firstTrend.series.length > 0) {
    trendTitle = firstTrend.label || 'Trend over time'
    const measure = firstTrend.measure || evidence?.primaryMetric || 'Value'
    trendSubtitle = `By ${measure} · ${firstTrend.grain || 'period'}`
    trendChartImageUrl = await renderTrendChartImage(firstTrend)
  }

  const breakdowns = evidence?.breakdowns || []
  const drivers = evidence?.drivers || []
  const productBreakdown = breakdowns.find((b) => {
    const dim = (b.dimension && String(b.dimension).toLowerCase()) || ''
    return PRODUCT_DIMENSION_HINTS.some((h) => dim.includes(h))
  })
  const topProducts = []
  if (productBreakdown && productBreakdown.rows && productBreakdown.rows.length > 0) {
    for (const r of productBreakdown.rows.slice(0, 15)) {
      const val = r.value ?? r.sum ?? r.count
      topProducts.push({ name: String(r.key ?? ''), value: val != null ? formatKpiValue(val) : '—' })
    }
  } else if (drivers.length > 0 && drivers[0].topDrivers && drivers[0].topDrivers.length > 0) {
    for (const d of drivers[0].topDrivers.slice(0, 15)) {
      topProducts.push({
        name: String(d.group ?? ''),
        value: d.total != null ? formatKpiValue(d.total) : (d.share != null ? (d.share * 100).toFixed(1) + '%' : '—'),
      })
    }
  } else if (breakdowns.length > 0 && breakdowns[0].rows && breakdowns[0].rows.length > 0) {
    for (const r of breakdowns[0].rows.slice(0, 15)) {
      const val = r.value ?? r.sum ?? r.count
      topProducts.push({ name: String(r.key ?? ''), value: val != null ? formatKpiValue(val) : '—' })
    }
  }

  const geoBreakdown = breakdowns.find((b) => {
    const dim = (b.dimension && String(b.dimension).toLowerCase()) || ''
    return GEO_DIMENSION_HINTS.some((h) => dim.includes(h))
  })
  const geoRows = []
  let showGeo = false
  if (geoBreakdown && geoBreakdown.rows && geoBreakdown.rows.length > 0) {
    showGeo = true
    for (const r of geoBreakdown.rows.slice(0, 20)) {
      const val = r.value ?? r.sum ?? r.count
      geoRows.push({ name: String(r.key ?? ''), value: val != null ? formatKpiValue(val) : '—' })
    }
  }

  return {
    agencyName,
    agencyLogoUrl: agencyLogoUrl || undefined,
    agencyTagline: agencyTagline || undefined,
    reportTitle,
    clientName: clientName || undefined,
    dateRange: dateRange || undefined,
    generatedAt,
    executiveSummary,
    topInsights,
    hasTopInsights: topInsights.length > 0,
    kpis: kpiCards,
    hasKpis: kpiCards.length > 0,
    trendTitle: trendTitle || undefined,
    trendSubtitle: trendSubtitle || undefined,
    trendChartImageUrl: trendChartImageUrl || undefined,
    topProducts,
    hasTopProducts: topProducts.length > 0,
    geoRows,
    hasGeoRows: geoRows.length > 0,
    showGeo,
    suggestedQuestions,
    hasSuggestedQuestions: suggestedQuestions.length > 0,
  }
}

module.exports = { buildPdfModel }
