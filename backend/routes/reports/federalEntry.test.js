/**
 * Unit tests for Federal Entry Report calculations.
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const { computeGrowthRatePercent, computeEntryBarrierScore, computeConfidenceFromCoverage } = require('./federalEntry')

test('computeGrowthRatePercent: FY2024=23799415.08, FY2025=22239144.18 => -6.6', () => {
  const result = computeGrowthRatePercent(23799415.08, 22239144.18)
  assert.strictEqual(result, -6.6)
})

test('computeGrowthRatePercent: returns null when FY2024 is 0', () => {
  assert.strictEqual(computeGrowthRatePercent(0, 100), null)
})

test('computeGrowthRatePercent: returns null when FY2024 is null', () => {
  assert.strictEqual(computeGrowthRatePercent(null, 100), null)
})

test('computeGrowthRatePercent: returns null when FY2025 is null', () => {
  assert.strictEqual(computeGrowthRatePercent(100, null), null)
})

test('computeGrowthRatePercent: rounds to 1 decimal', () => {
  assert.strictEqual(computeGrowthRatePercent(100, 110), 10)
  assert.strictEqual(computeGrowthRatePercent(100, 115.55), 15.6)
})

test('computeGrowthRatePercent: FY2024=$466M, FY2025=$227M => -51.4', () => {
  const result = computeGrowthRatePercent(466178638.05, 226697671.69)
  assert.strictEqual(result, -51.4)
})

test('computeEntryBarrierScore: growthRatePercent ≈ -6.6 for FY2024/2025 sample', () => {
  const data = {
    opportunities_feed: [],
    recent_awards: [],
    spend_over_time: [
      { fiscal_year: 2024, obligations: 23799415.08 },
      { fiscal_year: 2025, obligations: 22239144.18 },
    ],
  }
  const result = computeEntryBarrierScore(data)
  assert.strictEqual(result.growthRatePercent, -6.6)
})

test('computeEntryBarrierScore: growthRatePercent null when FY2024 is 0', () => {
  const data = {
    opportunities_feed: [],
    recent_awards: [],
    spend_over_time: [
      { fiscal_year: 2024, obligations: 0 },
      { fiscal_year: 2025, obligations: 100 },
    ],
  }
  const result = computeEntryBarrierScore(data)
  assert.strictEqual(result.growthRatePercent, null)
})

test('computeConfidenceFromCoverage: Low when awards < 10', () => {
  const r = computeConfidenceFromCoverage(50, 6, 5)
  assert.strictEqual(r.confidenceLevel, 'Low')
  assert.ok(r.confidenceReason.includes('only 6 awards'))
})

test('computeConfidenceFromCoverage: High when good coverage', () => {
  const r = computeConfidenceFromCoverage(100, 50, 5)
  assert.strictEqual(r.confidenceLevel, 'High')
  assert.ok(r.confidenceReason.includes('opportunities'))
})
