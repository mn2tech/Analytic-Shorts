function fallbackOwnerSummary(kpis) {
  const occupancy_rate = kpis?.occupancy_rate ?? ''
  const revenue_today = kpis?.revenue_today ?? ''
  const adr = kpis?.adr ?? ''
  const revpar = kpis?.revpar ?? ''

  return `Today’s performance is strong with ${occupancy_rate}% occupancy and $${revenue_today} in revenue. Pricing remains healthy with ADR $${adr} and RevPAR $${revpar}. Action needed: No — operations look stable today.`
}

function containsBannedWords(text) {
  if (!text) return false
  const banned = ['insight', 'dashboard', 'filter', 'chart']
  const lower = String(text).toLowerCase()
  return banned.some((w) => lower.includes(w))
}

/**
 * Apply guardrails to model output.
 * - Trim
 * - Replace empty or banned output with fallback
 */
function applyOwnerSummaryGuardrails(rawOutput, kpis) {
  const trimmed = (rawOutput ?? '').toString().trim()
  if (!trimmed) return fallbackOwnerSummary(kpis)
  if (containsBannedWords(trimmed)) return fallbackOwnerSummary(kpis)
  return trimmed
}

module.exports = {
  fallbackOwnerSummary,
  containsBannedWords,
  applyOwnerSummaryGuardrails
}

