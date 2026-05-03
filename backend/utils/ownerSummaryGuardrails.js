function formatMetricValue(val) {
  if (val == null) return '—'
  if (typeof val === 'number' && Number.isFinite(val)) return String(val)
  return String(val).trim() || '—'
}

function fallbackBusinessSummary(metrics) {
  const list = Array.isArray(metrics) ? metrics : []
  const parts = list
    .slice(0, 5)
    .map((m) => (m?.label ? `${m.label}: ${formatMetricValue(m.value)}` : null))
    .filter(Boolean)
  if (!parts.length) {
    return 'No data available yet. Explore your metrics using the filters and KPIs above.'
  }
  return `${parts.join('; ')}. Explore visual breakdowns using the other views in this report.`
}

function containsBannedWords(text) {
  if (!text) return false
  const banned = ['insight', 'dashboard', 'filter', 'chart']
  const lower = String(text).toLowerCase()
  return banned.some((w) => lower.includes(w))
}

function applyBusinessSummaryGuardrails(rawOutput, metrics) {
  const trimmed = (rawOutput ?? '').toString().trim()
  if (!trimmed) return fallbackBusinessSummary(metrics)
  if (containsBannedWords(trimmed)) return fallbackBusinessSummary(metrics)
  return trimmed
}

module.exports = {
  fallbackBusinessSummary,
  applyBusinessSummaryGuardrails,
  containsBannedWords
}
