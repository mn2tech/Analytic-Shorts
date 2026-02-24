const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { applyCommand } = require('./applyCommand')

describe('applyCommand', () => {
  test('help returns helpText', () => {
    const r = applyCommand({}, { type: 'help' })
    assert.ok(r.helpText)
    assert.ok(r.overrides !== undefined)
  })

  test('reset returns empty overrides', () => {
    const r = applyCommand({ templateId: 'govcon', timeGrain: 'month' }, { type: 'reset' })
    assert.deepEqual(r.overrides, {})
    assert.ok(!r.error)
  })

  test('theme updates overrides', () => {
    const r = applyCommand({}, { type: 'theme', value: 'dark' })
    assert.equal(r.overrides.themeId, 'dark')
  })

  test('template updates overrides', () => {
    const r = applyCommand({}, { type: 'template', value: 'govcon' })
    assert.equal(r.overrides.templateId, 'govcon')
  })

  test('measure updates primaryMeasure', () => {
    const r = applyCommand({}, { type: 'measure', value: 'Sales' })
    assert.equal(r.overrides.primaryMeasure, 'Sales')
  })

  test('time updates timeField', () => {
    const r = applyCommand({}, { type: 'time', value: 'Date' })
    assert.equal(r.overrides.timeField, 'Date')
  })

  test('grain updates timeGrain', () => {
    const r = applyCommand({}, { type: 'grain', value: 'month' })
    assert.equal(r.overrides.timeGrain, 'month')
  })

  test('focus updates focusDimensions', () => {
    const r = applyCommand({}, { type: 'focus', value: ['agency', 'state'] })
    assert.deepEqual(r.overrides.focusDimensions, ['agency', 'state'])
  })

  test('add block sets enabledBlocks[type] = true', () => {
    const r = applyCommand({}, { type: 'add', value: 'TrendBlock' })
    assert.equal(r.overrides.enabledBlocks.TrendBlock, true)
  })

  test('remove block sets enabledBlocks[type] = false', () => {
    const r = applyCommand({}, { type: 'remove', value: 'DetailsTableBlock' })
    assert.equal(r.overrides.enabledBlocks.DetailsTableBlock, false)
  })

  test('add then remove merges enabledBlocks', () => {
    const r1 = applyCommand({}, { type: 'add', value: 'TrendBlock' })
    const r2 = applyCommand(r1.overrides, { type: 'remove', value: 'DetailsTableBlock' })
    assert.equal(r2.overrides.enabledBlocks.TrendBlock, true)
    assert.equal(r2.overrides.enabledBlocks.DetailsTableBlock, false)
  })

  test('breakdown updates breakdownDimension', () => {
    const r = applyCommand({}, { type: 'breakdown', value: 'Category' })
    assert.equal(r.overrides.breakdownDimension, 'Category')
  })

  test('compare updates compareMode', () => {
    const r = applyCommand({}, { type: 'compare', value: 'last30' })
    assert.equal(r.overrides.compareMode, 'last30')
  })

  test('topn updates topNLimit', () => {
    const r = applyCommand({}, { type: 'topn', value: 15 })
    assert.equal(r.overrides.topNLimit, 15)
  })

  test('unknown command returns error', () => {
    const r = applyCommand({}, { type: 'unknown', error: 'Bad command' })
    assert.equal(r.error, 'Bad command')
    assert.ok(!r.overrides)
  })

  test('invalid grain returns error', () => {
    const r = applyCommand({}, { type: 'grain', value: 'yearly' })
    assert.ok(r.error)
  })
})
