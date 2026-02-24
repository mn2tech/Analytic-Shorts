const { test, describe } = require('node:test')
const assert = require('node:assert/strict')

const { orchestrateAnalysis } = require('./orchestrateAnalysis')

describe('orchestrateAnalysis', () => {
  test('adds TrendBlock automatically when time exists', () => {
    const datasetProfile = {
      datasetStats: { rowCount: 6, columnCount: 2, profiledRowCount: 6 },
      columns: [
        { name: 'Year', inferredType: 'number', roleCandidate: 'time', nullPct: 0, distinctCount: 6, sampleValues: [2020, 2021] },
        { name: 'Income', inferredType: 'number', roleCandidate: 'measure', nullPct: 0, distinctCount: 6, sampleValues: [0, 1200] },
      ],
      flags: { hasTime: true, hasGeo: false, hasNumeric: true, hasCategorical: false, hasText: false },
      quality: { duplicatesPct: 0, missingnessSummary: { overallMissingPct: 0, columnsOver50PctMissing: [], columnsOver90PctMissing: [] }, parseIssues: [] },
    }

    const plan = orchestrateAnalysis(datasetProfile, null)
    assert.ok(Array.isArray(plan.blocks))
    assert.ok(plan.blocks.some((b) => b.type === 'TrendBlock'), 'expected TrendBlock when time exists')
    const trend = plan.blocks.find((b) => b.type === 'TrendBlock')
    assert.equal(trend.timeColumn, 'Year')
  })
})

