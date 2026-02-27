/**
 * Build Studio block-shaped objects from Evidence DTO for rendering.
 * Ensures Studio report views consume evidence only (no client-side recompute).
 * Block payloads match what KPIBlockView, TrendBlockView, DriverBlockView, etc. expect.
 */

/**
 * @param {Object} evidence - Evidence DTO from /api/studio/build
 * @returns {Array<{ id: string, type: string, title: string, payload: Object, status: string, badges: Array, blockNarrative?: string }>}
 */
export function evidenceToBlocks(evidence) {
  if (!evidence) return []
  const blocks = []

  for (const k of evidence.kpis || []) {
    const exec = k.latest || k.change
      ? {
          latest: k.latest,
          change: k.change,
          previous: k.change ? { period: k.change.previousPeriod } : undefined,
          topContributor: k.topContributor,
          measure: k.primaryMeasure,
          grain: null,
        }
      : null
    blocks.push({
      id: k.id || 'kpi-01',
      type: 'KPIBlock',
      title: k.label || 'Key metrics',
      questionAnswered: 'What are the headline stats and key numeric measures?',
      status: 'OK',
      confidence: 0.85,
      badges: [],
      blockNarrative: k.latest
        ? `Latest ${k.primaryMeasure || 'metric'} in ${k.latest.period}: ${formatNum(k.latest.value)}.`
        : 'Key metrics from evidence.',
      payload: {
        rowCount: k.rowCount,
        primaryMeasure: k.primaryMeasure,
        executiveKpis: exec,
        metricSummaries: (k.metricSummaries || []).map((m) => ({ name: m.name, summary: m.summary })),
        timeKpis: k.timeKpis,
      },
    })
  }

  for (const t of evidence.trends || []) {
    blocks.push({
      id: t.id || 'trend-01',
      type: 'TrendBlock',
      title: t.label || 'Trend over time',
      questionAnswered: 'How does activity change over time?',
      status: t.series?.length ? 'OK' : 'INSUFFICIENT_DATA',
      confidence: t.series?.length ? 0.8 : 0.1,
      badges: [],
      blockNarrative: t.series?.length ? `Trend by ${t.grain || 'period'} for ${t.measure || 'value'}.` : 'No trend data.',
      payload: {
        timeColumn: t.timeColumn,
        grain: t.grain,
        measure: t.measure,
        series: t.series || [],
        anomalies: t.anomalies || [],
      },
    })
  }

  for (const b of evidence.breakdowns || []) {
    blocks.push({
      id: b.id || `breakdown-${blocks.length}`,
      type: 'TopNBlock',
      title: b.label || (b.dimension ? `By ${b.dimension}` : 'Breakdown'),
      questionAnswered: 'Which categories contribute the most?',
      status: b.rows?.length ? 'OK' : 'INSUFFICIENT_DATA',
      confidence: b.rows?.length ? 0.7 : 0.1,
      badges: [],
      blockNarrative: b.rows?.length ? `Breakdown by ${b.dimension}.` : 'No breakdown data.',
      payload: {
        dimension: b.dimension,
        measure: b.measure,
        agg: b.agg,
        rows: (b.rows || []).map((r) => ({ key: r.key, value: r.value })),
      },
    })
  }

  for (const d of evidence.drivers || []) {
    blocks.push({
      id: d.id || 'drivers-01',
      type: 'DriverBlock',
      title: d.label || 'Top drivers',
      questionAnswered: `Which groups drive ${d.measure}?`,
      status: d.topDrivers?.length ? 'OK' : 'INSUFFICIENT_DATA',
      confidence: d.topDrivers?.length ? 0.7 : 0.1,
      badges: [],
      blockNarrative: d.topDrivers?.length ? `Top drivers for ${d.measure}.` : 'No drivers data.',
      payload: {
        measure: d.measure,
        topDrivers: d.topDrivers || [],
      },
    })
  }

  return blocks
}

function formatNum(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const n = Number(v)
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return `${Math.round(n * 100) / 100}`
}
