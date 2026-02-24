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

describe('Template bias (deterministic)', () => {
  test('general template: primaryMeasure and grain match baseline (Sales, day)', async () => {
    const canonical = await csvConnector({ buffer: Buffer.from(fixtureCsv, 'utf-8'), filename: 'fixture.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })
    const template = getTemplate('general')
    const semanticGraph = buildSemanticGraph(profile, canonical, { template })
    const plan = orchestrateAnalysis(profile, semanticGraph, canonical, { template })

    assert.equal(semanticGraph.primaryMeasure, 'Sales', 'general: primaryMeasure should be Sales (baseline)')
    assert.equal(plan.selections.grain, 'day', 'general: grain should be day for short dense series')
    assert.equal(plan.selections.timeColumn, 'Date', 'general: time column Date')
  })

  test('ecommerce template: primaryMeasure prefers Sales/revenue, grain = day', async () => {
    const canonical = await csvConnector({ buffer: Buffer.from(fixtureCsv, 'utf-8'), filename: 'fixture.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })
    const template = getTemplate('ecommerce')
    const semanticGraph = buildSemanticGraph(profile, canonical, { template })
    const plan = orchestrateAnalysis(profile, semanticGraph, canonical, { template })

    assert.equal(semanticGraph.primaryMeasure, 'Sales', 'ecommerce: primaryMeasure should be Sales (hint match)')
    assert.equal(plan.selections.grain, 'day', 'ecommerce: grain should be day')
  })

  test('saas template: when MRR column present, primaryMeasure = mrr', async () => {
    const csvWithMrr = [
      'date,mrr,arr,plan,segment',
      '2024-01-01,10000,120000,Pro,Enterprise',
      '2024-02-01,10500,126000,Pro,Enterprise',
      '2024-03-01,11000,132000,Pro,SMB',
      '2024-04-01,10800,129600,Pro,SMB',
      '2024-05-01,11200,134400,Pro,Enterprise',
    ].join('\n')
    const canonical = await csvConnector({ buffer: Buffer.from(csvWithMrr, 'utf-8'), filename: 'saas.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })
    const template = getTemplate('saas')
    const semanticGraph = buildSemanticGraph(profile, canonical, { template })
    const plan = orchestrateAnalysis(profile, semanticGraph, canonical, { template })

    assert.equal(semanticGraph.primaryMeasure, 'mrr', 'saas: primaryMeasure should be mrr (hint match)')
    assert.equal(plan.selections.grain, 'month', 'saas: grain should be month (template defaultTimeGrain)')
  })

  test('general template: no hints applied, same as no template', async () => {
    const canonical = await csvConnector({ buffer: Buffer.from(fixtureCsv, 'utf-8'), filename: 'fixture.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })
    const sgGeneral = buildSemanticGraph(profile, canonical, { template: getTemplate('general') })
    const sgNone = buildSemanticGraph(profile, canonical, {})

    assert.equal(sgGeneral.primaryMeasure, sgNone.primaryMeasure, 'general and no template should yield same primaryMeasure')
  })
})
