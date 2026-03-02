/**
 * Canonical Intermediate Representation (IR) for multi-skin Executive AI reporting.
 * Derived from Studio run output: evidence + insightBlocks + sceneGraph + datasetProfile.
 *
 * @typedef {Object} CanonicalIR
 * @property {Object} dataset_profile - Schema, rowCount, intent, columns
 * @property {Array<Object>} metrics - KPI/metric summaries
 * @property {Array<Object>} segments - Breakdowns, drivers, compare-period contributions
 * @property {Array<Object>} time_series - Trend series with optional forecast
 * @property {Array<string>} anomalies - Period identifiers flagged as anomalous
 * @property {Array<Object>} blocks - All insight blocks (KPI, Trend, Driver, ComparePeriods, etc.)
 * @property {Object} scene_graph - Nodes, filters, pages
 * @property {Array<Object>} [charts] - Optional chart specs for rendering
 * @property {Object} confidence - Overall and per-block confidence
 * @property {Array<Object>} [forecasts] - Forecast data from ForecastBlock
 * @property {Array<Object>} [recommendations] - Prescriptive actions (when requested)
 */

/**
 * Convert Studio run response to CanonicalIR.
 * Includes all block types by folding insightBlocks into blocks[].
 *
 * @param {Object} studioRunResponse - Response from POST /api/studio/build
 * @param {Object} [options] - Options
 * @param {Array<Object>} [options.forecasts] - Forecast data from ForecastBlock
 * @param {Array<Object>} [options.recommendations] - Prescriptive recommendations
 * @returns {CanonicalIR}
 */
function studioRunToCanonicalIR(studioRunResponse, options = {}) {
  const {
    evidence,
    insightBlocks = [],
    sceneGraph = {},
    datasetProfile = {},
    semanticGraph = {},
    runId,
    template = {},
  } = studioRunResponse || {}

  // Extract forecasts from insightBlocks (ForecastBlock) or options
  let profiles = options.forecasts || []
  if (profiles.length === 0) {
    const forecastBlocks = (insightBlocks || []).filter((b) => b.type === 'ForecastBlock' && b.payload?.forecast)
    profiles = forecastBlocks.map((b) => ({
      id: b.id,
      measure: b.payload.measure,
      grain: b.payload.grain,
      timeColumn: b.payload.timeColumn,
      series: b.payload.series,
      forecast: b.payload.forecast,
      trend: b.payload.trend,
    }))
  }
  const recommendations = options.recommendations || []

  // Build metrics from evidence.kpis
  const metrics = (evidence?.kpis || []).map((k) => ({
    id: k.id,
    label: k.label,
    primaryMeasure: k.primaryMeasure,
    rowCount: k.rowCount,
    latest: k.latest,
    change: k.change,
    topContributor: k.topContributor,
    metricSummaries: k.metricSummaries,
    periodTotal: k.periodTotal,
    rangeCompare: k.rangeCompare,
    timeKpis: k.timeKpis,
  }))

  // Build segments from evidence.breakdowns + drivers + ComparePeriods contributions
  const segments = []
  for (const b of evidence?.breakdowns || []) {
    segments.push({
      type: 'breakdown',
      id: b.id,
      label: b.label,
      dimension: b.dimension,
      measure: b.measure,
      agg: b.agg,
      rows: b.rows || [],
    })
  }
  for (const d of evidence?.drivers || []) {
    segments.push({
      type: 'driver',
      id: d.id,
      label: d.label,
      measure: d.measure,
      topDrivers: d.topDrivers || [],
    })
  }
  // Add ComparePeriodsBlock contributions from insightBlocks
  const compareBlocks = (insightBlocks || []).filter((b) => b.type === 'ComparePeriodsBlock')
  for (const cb of compareBlocks) {
    const p = cb?.payload || {}
    if (p.contributions && typeof p.contributions === 'object') {
      for (const [dim, rows] of Object.entries(p.contributions)) {
        if (Array.isArray(rows) && rows.length > 0) {
          segments.push({
            type: 'compare_periods',
            id: cb.id,
            dimension: dim,
            measure: p.measure,
            periodA: p.periodA,
            periodB: p.periodB,
            delta: p.delta,
            pct: p.pct,
            rows,
          })
        }
      }
    }
  }

  // Build time_series from evidence.trends
  const time_series = (evidence?.trends || []).map((t) => ({
    id: t.id,
    label: t.label,
    timeColumn: t.timeColumn,
    grain: t.grain,
    measure: t.measure,
    series: t.series || [],
    anomalies: t.anomalies || [],
    forecast: null, // Populated by ForecastBlock when present
  }))

  // Merge forecasts into time_series if measure/grain match
  if (profiles.length > 0 && time_series.length > 0) {
    const first = profiles[0]
    const ts = time_series.find(
      (t) =>
        (t.measure === first.measure || !first.measure) &&
        (t.grain === first.grain || !first.grain)
    )
    if (ts) ts.forecast = first
    else time_series[0].forecast = first
  }

  // Anomalies across all trend blocks
  const anomalies = [...new Set(time_series.flatMap((t) => t.anomalies || []))]

  // Blocks: all insightBlocks normalized (includes ComparePeriods, Distribution, DataQuality, DetailsTable)
  const blocks = (insightBlocks || []).map((b) => ({
    id: b.id,
    type: b.type,
    title: b.title,
    questionAnswered: b.questionAnswered,
    status: b.status,
    confidence: b.confidence,
    assumptions: b.assumptions,
    sampleSize: b.sampleSize,
    badges: b.badges,
    blockNarrative: b.blockNarrative,
    payload: b.payload,
  }))

  // Chart specs (optional) derived from blocks
  const charts = []
  for (const t of time_series) {
    if (t.series?.length) {
      charts.push({
        type: 'trend',
        id: t.id,
        dataRef: 'time_series',
        encoding: { x: t.timeColumn || 't', y: t.measure || 'value', grain: t.grain },
      })
    }
  }
  for (const s of segments) {
    if (s.type === 'breakdown' && s.rows?.length) {
      charts.push({
        type: 'breakdown',
        id: s.id,
        dataRef: 'segments',
        encoding: { dimension: s.dimension, value: s.measure || 'value' },
      })
    }
  }

  // Confidence
  const confidences = blocks.map((b) => b.confidence).filter((c) => typeof c === 'number')
  const overallConfidence =
    confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0.5
  const confidence = {
    overall: Math.round(overallConfidence * 100) / 100,
    perBlock: Object.fromEntries(blocks.map((b) => [b.id, b.confidence])),
  }

  return {
    runId: runId || null,
    dataset_profile: {
      columns: datasetProfile?.columns || evidence?.schemaSummary || [],
      rowCount: datasetProfile?.datasetStats?.rowCount ?? datasetProfile?.metadata?.rowCount ?? 0,
      intent: evidence?.intent || datasetProfile?.intent || 'generic',
      primaryMetric: evidence?.primaryMetric || semanticGraph?.primaryMeasure || null,
      schemaSummary: evidence?.schemaSummary || [],
    },
    metrics,
    segments,
    time_series,
    anomalies,
    blocks,
    scene_graph: {
      version: sceneGraph?.version || '1.0',
      nodes: sceneGraph?.nodes || [],
      filters: sceneGraph?.filters || [],
      pages: sceneGraph?.pages || [],
    },
    charts,
    confidence,
    forecasts: profiles.length ? profiles : undefined,
    recommendations: recommendations.length ? recommendations : undefined,
    template: template?.id ? { id: template.id, name: template.name } : undefined,
  }
}

module.exports = {
  studioRunToCanonicalIR,
}
