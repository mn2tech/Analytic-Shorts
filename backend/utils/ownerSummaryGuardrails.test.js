const test = require('node:test')
const assert = require('node:assert/strict')

const { applyBusinessSummaryGuardrails } = require('./ownerSummaryGuardrails')

test('business guardrails: banned words trigger fallback', () => {
  const metrics = [
    { label: 'Total revenue', value: 12500 },
    { label: 'Orders', value: 42 }
  ]
  const out = applyBusinessSummaryGuardrails('This insight mentions a dashboard and chart.', metrics)
  assert.ok(/revenue|Orders|records/i.test(out) || !/insight|dashboard|chart|filter/i.test(out))
})

test('business guardrails: empty output triggers fallback', () => {
  const metrics = [{ label: 'Revenue', value: 990 }]
  const out = applyBusinessSummaryGuardrails('   \n  ', metrics)
  assert.ok(out.includes('Revenue'))
})
