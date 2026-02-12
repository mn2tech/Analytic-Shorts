const test = require('node:test')
const assert = require('node:assert/strict')

const { inferNumericColumnsAndConvert, tryParseNumber } = require('./numericInference')

test('numeric inference: currency + commas become numeric columns', () => {
  const rows = [
    { revenue: '$12,450', cost: '1,200', note: 'ok' },
    { revenue: '  $1,050  ', cost: '2,500', note: 'ok' },
    { revenue: '"3,000"', cost: '0', note: 'ok' },
  ]
  const columns = ['revenue', 'cost', 'note']

  const out = inferNumericColumnsAndConvert(rows, columns, { threshold: 0.7 })

  console.log('[test] inferred numericColumns:', out.numericColumns)

  assert.deepEqual(out.numericColumns.sort(), ['cost', 'revenue'])
  assert.equal(out.data[0].revenue, 12450)
  assert.equal(out.data[0].cost, 1200)
  assert.equal(out.data[0].note, 'ok')
})

test('numeric inference: mixed numeric + N/A still converts', () => {
  const rows = [
    { value: '100' },
    { value: 'N/A' },
    { value: '200' },
  ]
  const columns = ['value']
  const out = inferNumericColumnsAndConvert(rows, columns, { threshold: 0.7 })
  assert.deepEqual(out.numericColumns, ['value'])
  assert.equal(out.data[0].value, 100)
  assert.equal(out.data[1].value, '') // null-like -> missing
  assert.equal(out.data[2].value, 200)
})

test('numeric inference: pure text remains text column', () => {
  const rows = [
    { status: 'Open' },
    { status: 'Closed' },
    { status: 'Pending' },
  ]
  const columns = ['status']
  const out = inferNumericColumnsAndConvert(rows, columns, { threshold: 0.7 })
  assert.deepEqual(out.numericColumns, [])
  assert.equal(out.data[0].status, 'Open')
})

test('tryParseNumber: parentheses negatives parse', () => {
  const parsed = tryParseNumber('(123)')
  assert.equal(parsed.ok, true)
  assert.equal(parsed.value, -123)
})

