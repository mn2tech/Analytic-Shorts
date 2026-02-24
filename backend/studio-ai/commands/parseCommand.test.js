const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { parseCommand } = require('./parseCommand')

describe('parseCommand', () => {
  test('help', () => {
    assert.deepEqual(parseCommand('help'), { type: 'help' })
    assert.deepEqual(parseCommand('  help  '), { type: 'help' })
  })

  test('reset', () => {
    assert.deepEqual(parseCommand('reset'), { type: 'reset' })
  })

  test('theme', () => {
    assert.deepEqual(parseCommand('theme dark'), { type: 'theme', value: 'dark' })
    assert.deepEqual(parseCommand('theme ecommerceLight'), { type: 'theme', value: 'ecommerceLight' })
  })

  test('template', () => {
    assert.deepEqual(parseCommand('template govcon'), { type: 'template', value: 'govcon' })
    assert.deepEqual(parseCommand('template general'), { type: 'template', value: 'general' })
  })

  test('measure', () => {
    assert.deepEqual(parseCommand('measure Sales'), { type: 'measure', value: 'Sales' })
    assert.deepEqual(parseCommand('measure obligated_amount'), { type: 'measure', value: 'obligated_amount' })
  })

  test('time', () => {
    assert.deepEqual(parseCommand('time Date'), { type: 'time', value: 'Date' })
    assert.deepEqual(parseCommand('time award_date'), { type: 'time', value: 'award_date' })
  })

  test('grain', () => {
    assert.deepEqual(parseCommand('grain day'), { type: 'grain', value: 'day' })
    assert.deepEqual(parseCommand('grain week'), { type: 'grain', value: 'week' })
    assert.deepEqual(parseCommand('grain month'), { type: 'grain', value: 'month' })
    const bad = parseCommand('grain yearly')
    assert.equal(bad.type, 'unknown')
    assert.ok(bad.error)
  })

  test('focus', () => {
    assert.deepEqual(parseCommand('focus agency,state'), { type: 'focus', value: ['agency', 'state'] })
    assert.deepEqual(parseCommand('focus Region'), { type: 'focus', value: ['Region'] })
  })

  test('add block', () => {
    assert.deepEqual(parseCommand('add trend'), { type: 'add', value: 'TrendBlock' })
    assert.deepEqual(parseCommand('add map'), { type: 'add', value: 'GeoBlock' })
    assert.deepEqual(parseCommand('add geomap'), { type: 'add', value: 'GeoBlock' })
    assert.deepEqual(parseCommand('add details'), { type: 'add', value: 'DetailsTableBlock' })
    assert.deepEqual(parseCommand('add drivers'), { type: 'add', value: 'DriverBlock' })
    const bad = parseCommand('add foo')
    assert.equal(bad.type, 'unknown')
    assert.ok(bad.error)
  })

  test('remove block', () => {
    assert.deepEqual(parseCommand('remove details'), { type: 'remove', value: 'DetailsTableBlock' })
    assert.deepEqual(parseCommand('remove quality'), { type: 'remove', value: 'DataQualityBlock' })
    const bad = parseCommand('remove xyz')
    assert.equal(bad.type, 'unknown')
    assert.ok(bad.error)
  })

  test('breakdown by', () => {
    assert.deepEqual(parseCommand('breakdown by Category'), { type: 'breakdown', value: 'Category' })
    assert.deepEqual(parseCommand('breakdown by state'), { type: 'breakdown', value: 'state' })
  })

  test('compare', () => {
    assert.deepEqual(parseCommand('compare half'), { type: 'compare', value: 'half' })
    assert.deepEqual(parseCommand('compare last30'), { type: 'compare', value: 'last30' })
    assert.deepEqual(parseCommand('compare last90'), { type: 'compare', value: 'last90' })
    const bad = parseCommand('compare other')
    assert.equal(bad.type, 'unknown')
    assert.ok(bad.error)
  })

  test('topn', () => {
    assert.deepEqual(parseCommand('topn 10'), { type: 'topn', value: 10 })
    assert.deepEqual(parseCommand('topn 25'), { type: 'topn', value: 25 })
    const bad = parseCommand('topn 200')
    assert.equal(bad.type, 'unknown')
    assert.ok(bad.error)
  })

  test('empty or unknown', () => {
    const empty = parseCommand('')
    assert.equal(empty.type, 'unknown')
    assert.ok(empty.error)
    const unknown = parseCommand('foo bar')
    assert.equal(unknown.type, 'unknown')
    assert.ok(unknown.error)
  })
})
