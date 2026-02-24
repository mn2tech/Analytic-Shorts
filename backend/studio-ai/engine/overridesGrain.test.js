const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const { getTemplate } = require('../templates/templates')
const { profileDataset } = require('./profileDataset')
const { buildSemanticGraph } = require('./buildSemanticGraph')
const { orchestrateAnalysis } = require('./orchestrateAnalysis')
const { csvConnector } = require('../data-connectors/csvConnector')

const fixtureCsv = [
  'Date,Sales,Units,Category,Region',
  '2024-01-01,1580,14,Hardware,North',
  '2024-01-02,2100,22,Software,South',
  '2024-01-03,1900,18,Hardware,East',
  '2024-01-04,14000,100,Software,West',
  '2024-01-05,3200,28,Hardware,North',
  '2024-01-06,4100,35,Software,South',
  '2024-01-07,2800,20,Hardware,East',
  '2024-01-08,5500,42,Software,West',
  '2024-01-09,6200,50,Hardware,North',
  '2024-01-10,3800,30,Software,South',
].join('\n')

describe('Overrides (deterministic command layer)', () => {
  test('overrides.timeGrain=month: TrendBlock grain is month when time exists', async () => {
    const canonical = await csvConnector({ buffer: Buffer.from(fixtureCsv, 'utf-8'), filename: 'fixture.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })
    const template = getTemplate('general')
    const options = { template, overrides: { timeGrain: 'month' } }
    const semanticGraph = buildSemanticGraph(profile, canonical, options)
    const plan = orchestrateAnalysis(profile, semanticGraph, canonical, options)

    assert.equal(plan.selections.grain, 'month', 'grain should be month from overrides')
    const trendBlock = plan.blocks.find((b) => b.type === 'TrendBlock')
    assert.ok(trendBlock, 'TrendBlock should exist')
    assert.equal(trendBlock.grain, 'month', 'TrendBlock.grain should be month')
  })

  test('overrides.primaryMeasure: used when column exists', async () => {
    const canonical = await csvConnector({ buffer: Buffer.from(fixtureCsv, 'utf-8'), filename: 'fixture.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })
    const template = getTemplate('general')
    const options = { template, overrides: { primaryMeasure: 'Units' } }
    const semanticGraph = buildSemanticGraph(profile, canonical, options)
    const plan = orchestrateAnalysis(profile, semanticGraph, canonical, options)

    assert.equal(semanticGraph.primaryMeasure, 'Units', 'primaryMeasure should be Units from overrides')
    assert.equal(plan.selections.primaryMeasure, 'Units')
  })

  test('overrides.enabledBlocks: remove details hides DetailsTableBlock', async () => {
    const canonical = await csvConnector({ buffer: Buffer.from(fixtureCsv, 'utf-8'), filename: 'fixture.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })
    const template = getTemplate('general')
    const options = { template, overrides: { enabledBlocks: { DetailsTableBlock: false } } }
    const semanticGraph = buildSemanticGraph(profile, canonical, options)
    const plan = orchestrateAnalysis(profile, semanticGraph, canonical, options)

    const detailsBlock = plan.blocks.find((b) => b.type === 'DetailsTableBlock')
    assert.ok(!detailsBlock, 'DetailsTableBlock should be removed')
  })
})
