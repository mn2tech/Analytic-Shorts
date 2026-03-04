/**
 * NM2TECH Signal Engine - Resolve signals from rule votes.
 * Internal name: nm2SignalEngine
 */

const { runAllRules } = require('./rules')

const CONFIDENCE_THRESHOLD = 0.6

function aggregateVotes(votes, labelType) {
  const filtered = votes.filter((v) => v.labelType === labelType)
  if (filtered.length === 0) return { value: null, confidence: 0, totalWeight: 0 }

  const byValue = new Map()
  for (const v of filtered) {
    const key = String(v.value)
    const w = Number(v.weight) || 0
    byValue.set(key, (byValue.get(key) || 0) + w)
  }

  let maxWeight = 0
  let winner = null
  for (const [val, w] of byValue) {
    if (w > maxWeight) {
      maxWeight = w
      winner = val
    }
  }

  const totalWeight = [...byValue.values()].reduce((s, w) => s + w, 0)
  const confidence = totalWeight > 0 ? Math.min(1, maxWeight / Math.max(1, totalWeight)) : 0

  return { value: winner, confidence, totalWeight, byValue }
}

function resolveVehicleRequired(agg) {
  if (!agg.value) return { value: null, confidence: 0 }
  const val = agg.value === 'true' || agg.value === true
  return { value: val, confidence: agg.confidence }
}

function resolveFirstWinEligible(agg, votes) {
  const positive = votes.filter((v) => v.labelType === 'first_win_eligible' && v.value === 'yes')
  const negative = votes.filter((v) => v.labelType === 'first_win_eligible' && v.value === 'no')
  const posWeight = positive.reduce((s, v) => s + (v.weight || 0), 0)
  const negWeight = negative.reduce((s, v) => s + (v.weight || 0), 0)

  let value = 'maybe'
  if (posWeight > negWeight && posWeight >= 0.5) value = 'yes'
  else if (negWeight > posWeight && negWeight >= 0.5) value = 'no'

  const total = posWeight + negWeight
  const confidence = total > 0 ? Math.min(1, Math.max(posWeight, negWeight) / total) : 0.3

  return { value, confidence }
}

function resolveSetAsidePreferred(agg) {
  if (!agg.value) return { value: false, confidence: 0.5 }
  const val = agg.value === 'true' || agg.value === true
  return { value: val, confidence: agg.confidence }
}

function resolveComplexity(agg) {
  if (!agg.value) return { value: 'medium', confidence: 0.5 }
  const normalized = String(agg.value).toLowerCase()
  const valid = ['low', 'medium', 'high'].includes(normalized) ? normalized : 'medium'
  return { value: valid, confidence: agg.confidence }
}

/**
 * Resolve signals for an opportunity.
 * @param {Object} opportunity - Opportunity object (title, description, type, setAside, etc.)
 * @returns {Object} { vehicle_required, first_win_eligible, set_aside_preferred, complexity_level, uncertain, _ruleHits }
 */
function resolveSignals(opportunity) {
  const { votes, ruleHits } = runAllRules(opportunity)

  const vehicleAgg = aggregateVotes(votes, 'vehicle_required')
  const firstWinAgg = aggregateVotes(votes, 'first_win_eligible')
  const setAsideAgg = aggregateVotes(votes, 'set_aside_preferred')
  const complexityAgg = aggregateVotes(votes, 'complexity_level')

  const vehicle_required = resolveVehicleRequired(vehicleAgg)
  const first_win_eligible = resolveFirstWinEligible(firstWinAgg, votes)
  const set_aside_preferred = resolveSetAsidePreferred(setAsideAgg)
  const complexity_level = resolveComplexity(complexityAgg)

  let uncertain = false
  const signals = [vehicle_required, first_win_eligible, set_aside_preferred, complexity_level]
  for (const s of signals) {
    if (s.confidence < CONFIDENCE_THRESHOLD) uncertain = true
  }

  const conflicting = () => {
    const fw = first_win_eligible
    const pos = votes.filter((v) => v.labelType === 'first_win_eligible' && v.value === 'yes').length
    const neg = votes.filter((v) => v.labelType === 'first_win_eligible' && v.value === 'no').length
    return pos > 0 && neg > 0
  }
  if (conflicting()) uncertain = true

  return {
    vehicle_required: { value: vehicle_required.value, confidence: vehicle_required.confidence },
    first_win_eligible: { value: first_win_eligible.value, confidence: first_win_eligible.confidence },
    set_aside_preferred: { value: set_aside_preferred.value, confidence: set_aside_preferred.confidence },
    complexity_level: { value: complexity_level.value, confidence: complexity_level.confidence },
    uncertain,
    _ruleHits: ruleHits,
  }
}

module.exports = {
  resolveSignals,
  CONFIDENCE_THRESHOLD,
}
