/**
 * Assemble a normalized Evidence DTO from profile, intent, primaryMetric, and executePlan blocks.
 * Stable ids/labels; strips internal engine metadata.
 */

/**
 * @param {Object} opts
 * @param {Object} opts.profile - Dataset profile
 * @param {string} opts.intent - "sales"|"financial"|"opportunity"|"operations"|"generic"
 * @param {string|null} opts.primaryMetric - Primary measure column name
 * @param {Array<Object>} opts.blocks - InsightBlocks from executePlan
 * @returns {Object} Evidence DTO
 */
function assembleEvidence({ profile, intent, primaryMetric, blocks }) {
  const kpis = []
  const trends = []
  const breakdowns = []
  const drivers = []

  for (const b of blocks || []) {
    const payload = b?.payload || {}
    if (b.type === 'KPIBlock') {
      const exec = payload.executiveKpis
      const summaries = Array.isArray(payload.metricSummaries) ? payload.metricSummaries : []
      const periodTotal = exec?.rangeCompare?.current?.total
      kpis.push({
        id: b.id || 'kpi-01',
        label: 'Key metrics',
        rowCount: payload.rowCount,
        primaryMeasure: payload.primaryMeasure || primaryMetric || null,
        latest: exec?.latest ? { period: exec.latest.period, value: exec.latest.value } : null,
        change: exec?.change ? { abs: exec.change.abs, pct: exec.change.pct, previousPeriod: exec.previous?.period } : null,
        topContributor: exec?.topContributor ? { dimension: exec.topContributor.dimension, group: exec.topContributor.group, share: exec.topContributor.share } : null,
        metricSummaries: summaries.map((m) => ({ name: m.name, summary: m.summary })),
        timeKpis: payload.timeKpis || null,
        periodTotal: typeof periodTotal === 'number' && Number.isFinite(periodTotal) ? periodTotal : undefined,
        rangeCompare: exec?.rangeCompare || undefined,
      })
    }
    if (b.type === 'TrendBlock' && payload.series) {
      trends.push({
        id: b.id || 'trend-01',
        label: b.title || 'Trend over time',
        timeColumn: payload.timeColumn,
        grain: payload.grain,
        measure: payload.measure,
        series: Array.isArray(payload.series) ? payload.series.map((s) => ({ t: s.t, sum: s.sum, count: s.count })) : [],
        anomalies: Array.isArray(payload.anomalies) ? payload.anomalies : [],
      })
    }
    if ((b.type === 'TopNBlock' || b.type === 'BreakdownBlock' || b.type === 'GeoLikeBlock') && payload.rows) {
      breakdowns.push({
        id: b.id || `breakdown-${breakdowns.length + 1}`,
        label: b.title || (payload.dimension ? `By ${payload.dimension}` : 'Breakdown'),
        dimension: payload.dimension,
        measure: payload.measure,
        agg: payload.agg,
        rows: Array.isArray(payload.rows) ? payload.rows.map((r) => ({ key: r.key, value: r.value ?? r.sum ?? r.count })) : [],
      })
    }
    if (b.type === 'DriverBlock' && payload.topDrivers) {
      drivers.push({
        id: b.id || 'drivers-01',
        label: b.title || 'Top drivers',
        measure: payload.measure,
        topDrivers: Array.isArray(payload.topDrivers)
          ? payload.topDrivers.map((d) => ({
              dimension: d.dimension,
              group: d.group,
              total: d.total,
              share: d.share,
              lift: d.lift,
              count: d.count,
            }))
          : [],
      })
    }
  }

  const schemaSummary = (profile?.columns || []).map((c) => ({
    name: c.name,
    inferredType: c.inferredType,
    roleCandidate: c.roleCandidate,
  }))

  return {
    intent: intent || 'generic',
    primaryMetric: primaryMetric || null,
    kpis,
    trends,
    breakdowns,
    drivers,
    schemaSummary,
  }
}

module.exports = { assembleEvidence }
