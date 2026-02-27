/**
 * MVP: Generate a simple trend chart as SVG, return as data URL for embedding in PDF.
 * Deterministic, no external deps (no canvas/chart.js). Puppeteer renders SVG in img src.
 */
const seriesToPoints = (trend) => {
  const arr = trend?.series || []
  return arr
    .filter((s) => s != null && (s.t != null || s.period != null))
    .map((s) => ({
      t: String(s.t ?? s.period ?? ''),
      value: Number(s.sum ?? s.count ?? 0),
    }))
    .filter((p) => Number.isFinite(p.value))
}

/**
 * Render trend chart as SVG data URL.
 * @param {Object} trend - evidence.trends[0] shape: { series: [{ t, sum, count }], measure, grain }
 * @returns {string|null} data:image/svg+xml;base64,... or null if no data
 */
function renderTrendChartImage(trend) {
  const points = seriesToPoints(trend)
  if (points.length === 0) return null
  const w = 700
  const h = 220
  const padding = { top: 20, right: 20, bottom: 32, left: 48 }
  const chartW = w - padding.left - padding.right
  const chartH = h - padding.top - padding.bottom
  const values = points.map((p) => p.value)
  const minV = Math.min(...values, 0)
  const maxV = Math.max(...values, 0)
  const range = maxV - minV || 1
  const xScale = chartW / Math.max(1, points.length - 1)
  const yScale = chartH / range
  const toX = (i) => padding.left + i * xScale
  const toY = (v) => padding.top + chartH - (v - minV) * yScale
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.value)}`)
    .join(' ')
  const strokeColor = '#2563eb'
  const gridColor = '#e5e7eb'
  const textColor = '#374151'
  const labels = points.map((p) => p.t)
  const step = Math.max(1, Math.floor(labels.length / 6))
  const tickLabels = labels.filter((_, i) => i % step === 0 || i === labels.length - 1)
  const tickPositions = points
    .map((_, i) => i)
    .filter((_, i) => i % step === 0 || i === points.length - 1)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="gr" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.3"/><stop offset="100%" stop-color="${strokeColor}" stop-opacity="0"/></linearGradient></defs>
  <path fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="${pathD}"/>
  <path fill="url(#gr)" d="${pathD} L ${toX(points.length - 1)} ${chartH + padding.top} L ${padding.left} ${chartH + padding.top} Z"/>
  ${Array.from({ length: 5 }, (_, i) => {
    const y = padding.top + (chartH * (4 - i)) / 4
    return `<line x1="${padding.left}" y1="${y}" x2="${w - padding.right}" y2="${y}" stroke="${gridColor}" stroke-dasharray="4 2"/>`
  }).join('\n  ')}
  ${tickPositions.map((i) => `<line x1="${toX(i)}" y1="${padding.top + chartH}" x2="${toX(i)}" y2="${padding.top + chartH + 6}" stroke="${textColor}"/>`).join('\n  ')}
  ${tickLabels.map((label, idx) => {
    const x = toX(tickPositions[idx] ?? 0)
    return `<text x="${x}" y="${h - 8}" font-family="system-ui,sans-serif" font-size="10" fill="${textColor}" text-anchor="middle">${escapeXml(String(label).slice(0, 10))}</text>`
  }).join('\n  ')}
</svg>`
  const base64 = Buffer.from(svg, 'utf8').toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

module.exports = { renderTrendChartImage }
