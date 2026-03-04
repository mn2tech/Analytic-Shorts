/**
 * NM2TECH Signal Engine - Rule sets for labeling federal opportunities.
 * Internal name: nm2SignalEngine
 */

function getText(opportunity) {
  const title = (opportunity.title || '').toString()
  const desc = (opportunity.description || '').toString()
  const type = (opportunity.type || '').toString()
  return `${title} ${desc} ${type}`.toLowerCase()
}

/**
 * vehicle_required rules
 */
function vehicle_required_rules(opportunity) {
  const results = []
  const text = getText(opportunity)
  const title = (opportunity.title || '').toString().toLowerCase()
  const desc = (opportunity.description || '').toString().toLowerCase()
  const type = (opportunity.type || '').toString().toLowerCase()
  const searchText = `${title} ${desc} ${type}`

  const ruleDefs = [
    { name: 'gwac_keyword', pattern: /gwac/i },
    { name: 'alliant_keyword', pattern: /alliant/i },
    { name: 'polaris_keyword', pattern: /polaris/i },
    { name: 'oasis_keyword', pattern: /\boasis\b/i },
    { name: 'idiq_keyword', pattern: /\bidiq\b/i },
    { name: 'mas_keyword', pattern: /\bmas\b/i },
    { name: 'gsa_schedule_keyword', pattern: /gsa\s*schedule/i },
    { name: 'task_order_keyword', pattern: /task\s*order/i },
    { name: 'on_ramp_keyword', pattern: /on-?ramp/i },
    { name: 'pool_keyword', pattern: /\bpool\b/i },
    { name: 'bpa_keyword', pattern: /\bbpa\b/i },
    { name: 'mac_keyword', pattern: /\bmac\b/i },
    { name: 'vehicle_required_keyword', pattern: /vehicle\s*required/i },
    { name: 'idiq_task_order_keyword', pattern: /idiq\s*task\s*order|task\s*order\s*under\s*idiq/i },
  ]

  for (const { name, pattern } of ruleDefs) {
    if (pattern.test(searchText)) {
      results.push({
        labelType: 'vehicle_required',
        value: true,
        weight: 1.0,
        ruleName: name,
      })
    }
  }

  return results
}

/**
 * first_win_eligible rules (yes/maybe/no)
 */
function first_win_positive_rules(opportunity) {
  const results = []
  const text = getText(opportunity)
  const setAside = (opportunity.setAside || '').toString().toLowerCase()

  const ruleDefs = [
    { name: 'set_aside_small_business', pattern: /small\s*business|8\s*\(\s*a\s*\)|8a|wosb|sdvosb|hubzone/i, source: setAside + ' ' + text },
    { name: 'janitorial_keyword', pattern: /janitorial|custodial|cleaning|facilities\s*services/i, source: text },
    { name: 'micro_purchase', pattern: /micro\s*purchase|simplified\s*acquisition/i, source: text },
    { name: 'new_entrant', pattern: /new\s*entrant|first-?time|first\s*win/i, source: text },
  ]

  for (const { name, pattern, source } of ruleDefs) {
    if (pattern.test(source)) {
      results.push({
        labelType: 'first_win_eligible',
        value: 'yes',
        weight: 0.9,
        ruleName: name,
      })
    }
  }

  return results
}

function first_win_negative_rules(opportunity) {
  const results = []
  const text = getText(opportunity)

  const ruleDefs = [
    { name: 'large_contract', pattern: /\$50\s*million|\$100\s*million|megadeal|large\s*contract/i, source: text },
    { name: 'sole_source', pattern: /sole\s*source|single\s*award/i, source: text },
  ]

  for (const { name, pattern, source } of ruleDefs) {
    if (pattern.test(source)) {
      results.push({
        labelType: 'first_win_eligible',
        value: 'no',
        weight: 0.9,
        ruleName: name,
      })
    }
  }

  return results
}

/**
 * set_aside_preferred rules
 */
function set_aside_rules(opportunity) {
  const results = []
  const setAside = (opportunity.setAside || '').toString()
  const text = getText(opportunity)
  const searchText = `${setAside} ${text}`

  const ruleDefs = [
    { name: 'small_business_set_aside', pattern: /small\s*business|total\s*small/i, source: searchText },
    { name: '8a_set_aside', pattern: /8\s*\(\s*a\s*\)|8a\b/i, source: searchText },
    { name: 'wosb_set_aside', pattern: /wosb|women[- ]owned/i, source: searchText },
    { name: 'sdvosb_set_aside', pattern: /sdvosb|service[- ]disabled|veteran/i, source: searchText },
    { name: 'hubzone_set_aside', pattern: /hubzone|hub\s*zone/i, source: searchText },
  ]

  for (const { name, pattern, source } of ruleDefs) {
    if (pattern.test(source)) {
      results.push({
        labelType: 'set_aside_preferred',
        value: true,
        weight: 1.0,
        ruleName: name,
      })
    }
  }

  return results
}

/**
 * complexity_level rules (low/medium/high)
 */
function complexity_rules(opportunity) {
  const results = []
  const text = getText(opportunity)
  const awardAmount = Number(opportunity.award_amount || opportunity.awardAmount || 0) || 0

  const ruleDefs = [
    { name: 'high_value', pattern: () => awardAmount >= 10_000_000, value: 'high', weight: 0.9 },
    { name: 'idiq_complex', pattern: (t) => /idiq|gwac|alliant|oasis/.test(t), value: 'high', weight: 0.8 },
    { name: 'multi_agency', pattern: (t) => /multi[- ]agency|inter[- ]agency|government[- ]wide/.test(t), value: 'high', weight: 0.8 },
    { name: 'task_order', pattern: (t) => /task\s*order|delivery\s*order/.test(t), value: 'high', weight: 0.7 },
    { name: 'medium_value', pattern: () => awardAmount >= 1_000_000 && awardAmount < 10_000_000, value: 'medium', weight: 0.7 },
    { name: 'simplified_acquisition', pattern: (t) => /simplified\s*acquisition|micro\s*purchase|sat/.test(t), value: 'low', weight: 0.9 },
    { name: 'small_award', pattern: () => awardAmount > 0 && awardAmount < 150_000, value: 'low', weight: 0.8 },
  ]

  for (const { name, pattern, value, weight } of ruleDefs) {
    const matched = typeof pattern === 'function' ? pattern(text) : pattern.test(text)
    if (matched) {
      results.push({
        labelType: 'complexity_level',
        value,
        weight,
        ruleName: name,
      })
    }
  }

  return results
}

/**
 * Run all active rules for an opportunity.
 * @returns {{ votes: Array<{labelType, value, weight, ruleName}>, ruleHits: Object }}
 */
function runAllRules(opportunity) {
  const votes = [
    ...vehicle_required_rules(opportunity),
    ...first_win_positive_rules(opportunity),
    ...first_win_negative_rules(opportunity),
    ...set_aside_rules(opportunity),
    ...complexity_rules(opportunity),
  ]

  const ruleHits = {}
  for (const v of votes) {
    ruleHits[v.ruleName] = (ruleHits[v.ruleName] || 0) + 1
  }

  return { votes, ruleHits }
}

module.exports = {
  vehicle_required_rules,
  first_win_positive_rules,
  first_win_negative_rules,
  set_aside_rules,
  complexity_rules,
  runAllRules,
}
