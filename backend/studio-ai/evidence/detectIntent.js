/**
 * Deterministic intent detection from dataset profile (column names + roleCandidate).
 * Returns one of: "sales" | "financial" | "opportunity" | "operations" | "generic"
 */

const INTENTS = ['sales', 'financial', 'opportunity', 'operations', 'generic']

const KEYWORDS = {
  sales: ['order', 'customer', 'product', 'qty', 'quantity', 'unit_price', 'price', 'sales', 'sku', 'revenue'],
  financial: ['amount', 'expense', 'vendor', 'invoice', 'payment', 'balance', 'cost'],
  opportunity: ['opportunity', 'agency', 'naics', 'solicitation', 'notice', 'award', 'set_aside'],
  operations: ['ticket', 'case', 'call', 'duration', 'sla', 'agent', 'resolution'],
}

function scoreColumnForIntent(colName, roleCandidate) {
  const name = String(colName || '').toLowerCase().replace(/\s+/g, '_')
  const role = String(roleCandidate || '').toLowerCase()
  const scores = {}

  for (const [intent, keywords] of Object.entries(KEYWORDS)) {
    let s = 0
    for (const kw of keywords) {
      if (name.includes(kw)) s += 2
    }
    if (intent === 'sales' && (role === 'measure' && /revenue|sales|price|quantity|qty|unit_price/.test(name))) s += 1
    if (intent === 'financial' && role === 'measure' && /amount|cost|expense|balance/.test(name)) s += 1
    if (intent === 'opportunity' && (role === 'dimension' || role === 'id') && /agency|naics|set_aside|solicitation|notice/.test(name)) s += 1
    if (intent === 'operations' && (role === 'dimension' || role === 'measure') && /duration|sla|agent|ticket|case|call/.test(name)) s += 1
    scores[intent] = s
  }
  return scores
}

/**
 * @param {Object} profile - Dataset profile from profileDataset()
 * @returns {"sales"|"financial"|"opportunity"|"operations"|"generic"}
 */
function detectDatasetIntent(profile) {
  const columns = Array.isArray(profile?.columns) ? profile.columns : []
  const totals = { sales: 0, financial: 0, opportunity: 0, operations: 0 }

  for (const col of columns) {
    const name = col?.name
    const role = col?.roleCandidate
    const scores = scoreColumnForIntent(name, role)
    for (const [intent, s] of Object.entries(scores)) {
      if (intent !== 'generic') totals[intent] += s
    }
  }

  let best = 'generic'
  let bestScore = 0
  for (const intent of INTENTS) {
    if (intent === 'generic') continue
    const s = totals[intent] || 0
    if (s > bestScore) {
      bestScore = s
      best = intent
    }
  }
  if (bestScore === 0) return 'generic'
  return best
}

module.exports = { detectDatasetIntent, INTENTS, KEYWORDS }
