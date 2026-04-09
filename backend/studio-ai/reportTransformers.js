/**
 * Report mode transformers: convert CanonicalIR to report blocks by mode.
 * Modes: descriptive | diagnostic | predictive | prescriptive
 */

function formatNum(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const n = Number(v)
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return `${Math.round(n * 100) / 100}`
}

function formatPct(p) {
  if (!Number.isFinite(p)) return '—'
  return `${Math.round(p * 1000) / 10}%`
}

/**
 * @param {Object} ir - CanonicalIR
 * @returns {Array<{section: string, blocks: Array}>}
 */
function irToDescriptiveReport(ir) {
  const reportBlocks = []

  const overviewBlocks = []
  for (const m of ir.metrics || []) {
    if (m.latest) {
      overviewBlocks.push({
        type: 'KPI',
        label: m.label || m.primaryMeasure,
        value: m.latest.value,
        period: m.latest.period,
        change: m.change,
      })
    }
  }
  if (overviewBlocks.length) {
    reportBlocks.push({
      section: 'ExecutiveOverview',
      title: 'Key metrics',
      blocks: overviewBlocks,
      sourceRefs: ['metrics'],
    })
  }

  const trendBlocks = []
  for (const ts of ir.time_series || []) {
    if (ts.series?.length) {
      const last = ts.series[ts.series.length - 1]
      trendBlocks.push({
        type: 'Trend',
        measure: ts.measure,
        grain: ts.grain,
        lastPeriod: last?.t,
        lastValue: last?.sum ?? last?.count,
      })
    }
  }
  if (trendBlocks.length) {
    reportBlocks.push({
      section: 'PerformanceDrivers',
      title: 'Trend over time',
      blocks: trendBlocks,
      sourceRefs: ['time_series'],
    })
  }

  return reportBlocks
}

/**
 * @param {Object} ir - CanonicalIR
 * @returns {Array<{section: string, blocks: Array}>}
 */
function irToDiagnosticReport(ir) {
  const base = irToDescriptiveReport(ir)

  const driverBlocks = []
  for (const s of ir.segments || []) {
    if (s.type === 'driver' && s.topDrivers?.length) {
      driverBlocks.push({
        type: 'Driver',
        measure: s.measure,
        topDrivers: s.topDrivers.slice(0, 5),
      })
    }
  }
  if (driverBlocks.length) {
    base.push({
      section: 'PerformanceDrivers',
      title: 'Top drivers',
      blocks: driverBlocks,
      sourceRefs: ['segments.driver'],
    })
  }

  const compareBlocks = []
  for (const s of ir.segments || []) {
    if (s.type === 'compare_periods') {
      compareBlocks.push({
        type: 'ComparePeriods',
        dimension: s.dimension,
        measure: s.measure,
        delta: s.delta,
        pct: s.pct,
        topContributors: (s.rows || []).slice(0, 5),
      })
    }
  }
  if (compareBlocks.length) {
    base.push({
      section: 'PerformanceDrivers',
      title: 'Period comparison',
      blocks: compareBlocks,
      sourceRefs: ['segments.compare_periods'],
    })
  }

  return base
}

/**
 * @param {Object} ir - CanonicalIR
 * @returns {Array<{section: string, blocks: Array}>}
 */
function irToPredictiveReport(ir) {
  const base = irToDiagnosticReport(ir)

  const forecastBlocks = []
  for (const f of ir.forecasts || []) {
    if (f.forecast?.length && f.trend) {
      forecastBlocks.push({
        type: 'Forecast',
        measure: f.measure,
        grain: f.grain,
        forecast: f.forecast,
        trend: f.trend,
      })
    }
  }
  for (const ts of ir.time_series || []) {
    if (ts.forecast && !forecastBlocks.some((b) => b.measure === ts.measure)) {
      forecastBlocks.push({
        type: 'Forecast',
        measure: ts.measure,
        grain: ts.grain,
        forecast: ts.forecast.forecast || ts.forecast,
        trend: ts.forecast.trend || {},
      })
    }
  }
  if (forecastBlocks.length) {
    base.push({
      section: 'ForwardOutlook',
      title: 'Forecast',
      blocks: forecastBlocks,
      sourceRefs: ['forecasts', 'time_series.forecast'],
    })
  }

  const aiRiskBlocks = (ir.blocks || [])
    .filter((b) => b.type === 'AI_RISK_ANALYSIS' && b.payload)
    .map((b) => ({
      type: 'AIRiskAnalysis',
      summary: b.payload.summary || {},
      topRecords: (b.payload.records || []).slice(0, 10),
      features_used: b.payload.features_used || [],
      warnings: b.payload.warnings || [],
    }))
  if (aiRiskBlocks.length) {
    base.push({
      section: 'ForwardOutlook',
      title: 'AI Risk Analysis',
      blocks: aiRiskBlocks,
      sourceRefs: ['blocks.AI_RISK_ANALYSIS'],
    })
  }

  return base
}

/**
 * @param {Object} ir - CanonicalIR (must include recommendations)
 * @returns {Array<{section: string, blocks: Array}>}
 */
function irToPrescriptiveReport(ir) {
  const base = irToPredictiveReport(ir)

  const recs = ir.recommendations || []
  if (recs.length) {
    base.push({
      section: 'StrategicRecommendations',
      title: 'Recommendations',
      blocks: recs.map((r) => ({
        type: 'Recommendation',
        action: r.action,
        supportingMetricsRefs: r.supportingMetricsRefs,
        expectedImpact: r.expectedImpact,
        priority: r.priority,
        risk: r.risk,
      })),
      sourceRefs: ['recommendations'],
    })
  }

  return base
}

/**
 * @param {Object} ir - CanonicalIR
 * @param {'descriptive'|'diagnostic'|'predictive'|'prescriptive'} mode
 * @returns {Array<{section: string, title: string, blocks: Array, sourceRefs: string[]}>}
 */
function transformIRToReport(ir, mode) {
  switch (mode) {
    case 'descriptive':
      return irToDescriptiveReport(ir)
    case 'diagnostic':
      return irToDiagnosticReport(ir)
    case 'predictive':
      return irToPredictiveReport(ir)
    case 'prescriptive':
      return irToPrescriptiveReport(ir)
    default:
      return irToDescriptiveReport(ir)
  }
}

module.exports = {
  irToDescriptiveReport,
  irToDiagnosticReport,
  irToPredictiveReport,
  irToPrescriptiveReport,
  transformIRToReport,
}
