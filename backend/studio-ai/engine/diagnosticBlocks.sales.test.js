const { test, describe } = require('node:test')
const assert = require('node:assert/strict')

const { csvConnector } = require('../data-connectors/csvConnector')
const { profileDataset } = require('./profileDataset')
const { buildSemanticGraph } = require('./buildSemanticGraph')
const { orchestrateAnalysis } = require('./orchestrateAnalysis')
const { executePlan } = require('./executePlan')
const { buildSceneGraph } = require('./buildSceneGraph')

describe('AAI Studio diagnostic blocks (sales fixture)', () => {
  test('generates DriverBlock, GeoLikeBlock (Region), ComparePeriodsBlock', async () => {
    const csv = Buffer.from(
      [
        'Date,Sales,Category,Region,Product',
        '2026-01-01,100,Hardware,West,A',
        '2026-01-02,120,Hardware,West,B',
        '2026-01-03,80,Software,East,C',
        '2026-01-04,200,Hardware,East,A',
        '2026-01-05,50,Software,South,C',
        '2026-01-06,300,Hardware,West,A',
        '2026-01-07,20,Software,West,D',
        '2026-01-08,500,Hardware,East,B',
        '2026-01-09,60,Software,East,C',
        '2026-01-10,90,Hardware,South,A',
      ].join('\n'),
      'utf-8'
    )

    const canonical = await csvConnector({ buffer: csv, filename: 'sales-fixture.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })
    const semanticGraph = buildSemanticGraph(profile, canonical)
    const plan = orchestrateAnalysis(profile, semanticGraph, canonical)
    const blocks = executePlan(canonical, semanticGraph, plan, { maxComputeRows: 1000 })
    const types = blocks.map((b) => b.type)

    assert.equal(semanticGraph.primaryMeasure, 'Sales', 'expected primaryMeasure=Sales')

    assert.ok(types.includes('DriverBlock'), 'expected DriverBlock')
    assert.ok(types.includes('GeoLikeBlock') || types.includes('GeoBlock'), 'expected GeoLikeBlock or GeoBlock')
    assert.ok(types.includes('ComparePeriodsBlock'), 'expected ComparePeriodsBlock')

    const driver = blocks.find((b) => b.type === 'DriverBlock')
    assert.equal(driver.status, 'OK')
    assert.ok(Array.isArray(driver.payload?.topDrivers) && driver.payload.topDrivers.length > 0)
    assert.equal(driver.payload.measure, 'Sales')

    const compare = blocks.find((b) => b.type === 'ComparePeriodsBlock')
    assert.equal(compare.status, 'OK')
    assert.ok(compare.payload?.delta != null)
    assert.ok(compare.payload?.contributions, 'expected contributions payload')

    const kpi = blocks.find((b) => b.type === 'KPIBlock')
    assert.equal(kpi.status, 'OK')
    assert.equal(kpi.payload?.primaryMeasure, 'Sales')
    assert.ok(kpi.payload?.executiveKpis?.latest?.value != null, 'expected KPI latest value')
    assert.ok(kpi.payload?.executiveKpis?.change?.abs != null, 'expected KPI delta abs')
    assert.ok(kpi.payload?.executiveKpis?.change?.pct != null, 'expected KPI delta pct (may be null if prev=0)')

    const scene = buildSceneGraph({ insightBlocks: blocks, datasetProfile: profile })
    assert.ok(Array.isArray(scene.pages) && scene.pages.length === 4, 'expected 4 pages/tabs')
    assert.ok(scene.pages.some((p) => p.id === 'overview'))
    assert.ok(scene.pages.some((p) => p.id === 'insights'))
    assert.ok(scene.pages.some((p) => p.id === 'quality'))
    assert.ok(scene.pages.some((p) => p.id === 'details'))
  })
})

