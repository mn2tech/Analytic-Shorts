const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { detectDatasetIntent, INTENTS, KEYWORDS } = require('./detectIntent')

function profile(columns) {
  return { columns: columns.map((c) => ({ name: c.name, roleCandidate: c.roleCandidate || 'dimension' })) }
}

describe('detectDatasetIntent', () => {
  it('returns generic when no keywords match', () => {
    const p = profile([
      { name: 'foo', roleCandidate: 'dimension' },
      { name: 'bar', roleCandidate: 'measure' },
    ])
    assert.equal(detectDatasetIntent(p), 'generic')
  })

  it('returns sales when order/customer/revenue columns present', () => {
    const p = profile([
      { name: 'order_id', roleCandidate: 'id' },
      { name: 'customer_name', roleCandidate: 'dimension' },
      { name: 'revenue', roleCandidate: 'measure' },
      { name: 'quantity', roleCandidate: 'measure' },
    ])
    assert.equal(detectDatasetIntent(p), 'sales')
  })

  it('returns financial when amount/expense/vendor present', () => {
    const p = profile([
      { name: 'amount', roleCandidate: 'measure' },
      { name: 'vendor', roleCandidate: 'dimension' },
      { name: 'invoice_date', roleCandidate: 'time' },
    ])
    assert.equal(detectDatasetIntent(p), 'financial')
  })

  it('returns opportunity when agency/naics/solicitation present', () => {
    const p = profile([
      { name: 'agency', roleCandidate: 'dimension' },
      { name: 'naics', roleCandidate: 'dimension' },
      { name: 'solicitation_number', roleCandidate: 'id' },
      { name: 'set_aside', roleCandidate: 'dimension' },
    ])
    assert.equal(detectDatasetIntent(p), 'opportunity')
  })

  it('returns operations when ticket/duration/sla/agent present', () => {
    const p = profile([
      { name: 'ticket_id', roleCandidate: 'id' },
      { name: 'duration', roleCandidate: 'measure' },
      { name: 'sla_met', roleCandidate: 'dimension' },
      { name: 'agent', roleCandidate: 'dimension' },
    ])
    assert.equal(detectDatasetIntent(p), 'operations')
  })

  it('chooses highest scoring intent when multiple match', () => {
    const p = profile([
      { name: 'order_id', roleCandidate: 'id' },
      { name: 'revenue', roleCandidate: 'measure' },
      { name: 'amount', roleCandidate: 'measure' },
    ])
    const intent = detectDatasetIntent(p)
    assert.ok(INTENTS.includes(intent))
    assert.ok(['sales', 'financial'].includes(intent))
  })
})
