const test = require('node:test')
const assert = require('node:assert/strict')

const { applyOwnerSummaryGuardrails } = require('./ownerSummaryGuardrails')

test('guardrails: banned words trigger fallback', () => {
  const kpis = { occupancy_rate: 82, revenue_today: 12450, adr: 152, revpar: 125 }
  const out = applyOwnerSummaryGuardrails('This insight mentions a dashboard and chart.', kpis)
  assert.ok(out.includes('Action needed: No'))
  assert.ok(!/insight|dashboard|chart|filter/i.test(out))
})

test('guardrails: empty output triggers fallback', () => {
  const kpis = { occupancy_rate: 82, revenue_today: 12450, adr: 152, revpar: 125 }
  const out = applyOwnerSummaryGuardrails('   \n  ', kpis)
  assert.ok(out.includes('Action needed: No'))
})

