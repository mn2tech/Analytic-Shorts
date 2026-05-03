/**
 * Seed react-grid-layout items from an AI Visual Builder / shared dashboard spec
 * when no explicit layout is stored.
 */
const COLS = 12

function chartId(chart, index) {
  if (chart?.id != null) return String(chart.id)
  if (chart?.chartId != null) return String(chart.chartId)
  return `chart-${index}`
}

/**
 * @param {{ charts?: Array<Record<string, unknown>> }} spec
 * @returns {Array<{ i: string, x: number, y: number, w: number, h: number, minW?: number, minH?: number }>}
 */
export function generateLayoutFromSpec(spec) {
  if (!spec || !Array.isArray(spec.charts) || spec.charts.length === 0) return []
  const charts = spec.charts
  if (charts.length === 1) {
    const id = chartId(charts[0], 0)
    return [{ i: id, x: 0, y: 0, w: COLS, h: 12, minW: 4, minH: 6 }]
  }
  return charts.map((chart, index) => {
    const id = chartId(chart, index)
    const col = index % 2
    const row = Math.floor(index / 2)
    return {
      i: id,
      x: col * 6,
      y: row * 12,
      w: 6,
      h: 12,
      minW: 3,
      minH: 6,
    }
  })
}
