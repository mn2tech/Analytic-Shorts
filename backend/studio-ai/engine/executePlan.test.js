const { test, describe } = require('node:test')
const assert = require('node:assert/strict')

const { executePlan } = require('./executePlan')
const { csvConnector } = require('../data-connectors/csvConnector')
const { normalizeRows, inferSchema } = require('../data-connectors/normalizer')

describe('executePlan (InsightBlocks MVP)', () => {
  test('computes all core blocks deterministically on CSV fixture', async () => {
    const csv = Buffer.from(
      [
        'id,amount,postedDate,state,category,lat,lon,description',
        'a1,10,2026-01-01,CA,A,34.05,-118.25,"Short note"',
        'a2,20,2026-01-02,NY,B,40.71,-74.00,"This is a longer description that should be treated as text content."',
        'a3,30,2026-01-03,CA,A,37.77,-122.42,"Another long description for text classification."',
        'a4,40,2026-01-03,TX,C,29.76,-95.36,"More details here, more details here, more details here."',
        'a4,40,2026-01-03,TX,C,29.76,-95.36,"More details here, more details here, more details here."',
      ].join('\n'),
      'utf-8'
    )

    const canonical = await csvConnector({ buffer: csv, filename: 'fixture.csv' }, { sampleRowLimit: 100 })

    const plan = {
      blocks: [
        { type: 'KPIBlock' },
        { type: 'TrendBlock', timeColumn: 'postedDate', grain: 'day', measure: 'amount', agg: 'sum' },
        { type: 'TopNBlock', dimension: 'category', measure: 'amount', agg: 'sum', limit: 10, includeOther: true },
        { type: 'BreakdownBlock', dimension: 'state', measure: 'amount', agg: 'sum', maxCategories: 8 },
        { type: 'DistributionBlock', measure: 'amount', bins: 5 },
        { type: 'GeoBlock', geoMode: 'points', latColumn: 'lat', lonColumn: 'lon', measure: 'amount', agg: 'sum' },
        { type: 'DataQualityBlock' },
        { type: 'DetailsTableBlock', previewRows: 3 },
      ],
    }

    const blocks = executePlan(canonical, null, plan, { maxComputeRows: 1000 })
    const types = blocks.map((b) => b.type)
    assert.deepEqual(types, ['KPIBlock','TrendBlock','TopNBlock','BreakdownBlock','DistributionBlock','GeoBlock','DataQualityBlock','DetailsTableBlock'])
    blocks.forEach((b) => assert.ok(['OK','NOT_APPLICABLE','INSUFFICIENT_DATA'].includes(b.status)))

    const kpi = blocks.find((b) => b.type === 'KPIBlock')
    assert.equal(kpi.status, 'OK')
    assert.equal(kpi.payload.rowCount, 5)
    assert.ok(Array.isArray(kpi.payload.metricSummaries))

    const trend = blocks.find((b) => b.type === 'TrendBlock')
    assert.equal(trend.status, 'OK')
    assert.ok(Array.isArray(trend.payload.series))
    assert.ok(trend.payload.series.length >= 3)

    const topn = blocks.find((b) => b.type === 'TopNBlock')
    assert.equal(topn.status, 'OK')
    assert.ok(Array.isArray(topn.payload.rows))

    const breakdown = blocks.find((b) => b.type === 'BreakdownBlock')
    assert.equal(breakdown.status, 'OK')
    assert.ok(breakdown.payload.categoryCount <= 8)

    const dist = blocks.find((b) => b.type === 'DistributionBlock')
    assert.equal(dist.status, 'OK')
    assert.equal(dist.payload.histogram.length, 5)

    const geo = blocks.find((b) => b.type === 'GeoBlock')
    assert.equal(geo.status, 'OK')
    assert.equal(geo.payload.mode, 'points')
    assert.ok(geo.payload.points.length > 0)

    const quality = blocks.find((b) => b.type === 'DataQualityBlock')
    assert.equal(quality.status, 'OK')
    assert.ok(quality.payload.duplicatesPct > 0)

    const table = blocks.find((b) => b.type === 'DetailsTableBlock')
    assert.equal(table.payload.rows.length, 3)

    // Deterministic: run twice, identical output
    const blocks2 = executePlan(canonical, null, plan, { maxComputeRows: 1000 })
    assert.deepEqual(blocks, blocks2)
  })

  test('BreakdownBlock falls back to TopNBlock when categories > 8', () => {
    const raw = []
    for (let i = 0; i < 20; i++) raw.push({ category: `C${i}`, amount: i + 1 })
    const rows = normalizeRows(raw)
    const schema = inferSchema(rows, { sampleRowLimit: 100 })
    const canonical = { schema, rows, metadata: { sourceType: 'api', sourceName: 'fixture', fetchedAt: new Date().toISOString(), rowCount: rows.length } }

    const plan = { blocks: [{ type: 'BreakdownBlock', dimension: 'category', measure: 'amount', agg: 'sum', maxCategories: 8 }] }
    const blocks = executePlan(canonical, null, plan, { maxComputeRows: 1000 })
    assert.equal(blocks.length, 1)
    assert.equal(blocks[0].type, 'TopNBlock')
    assert.ok(String(blocks[0].id).includes('breakdown-fallback'))
  })

  test('KPIBlock includes latest + YoY when time is numeric Year', async () => {
    const csv = Buffer.from(
      [
        'Year,Income',
        '2020,0',
        '2021,1200',
        '2022,5600',
        '2023,63000',
        '2024,554000',
        '2025,930000',
      ].join('\n'),
      'utf-8'
    )
    const canonical = await csvConnector({ buffer: csv, filename: 'yearly-income.csv' }, { sampleRowLimit: 100 })

    // Simulate semantic roles (as produced by the profiler fix)
    const semanticGraph = {
      columns: {
        Year: { roleCandidate: 'time' },
        Income: { roleCandidate: 'measure' },
      },
    }

    const plan = { blocks: [{ type: 'KPIBlock' }] }
    const blocks = executePlan(canonical, semanticGraph, plan, { maxComputeRows: 1000 })
    const kpi = blocks.find((b) => b.type === 'KPIBlock')
    assert.equal(kpi.status, 'OK')
    assert.ok(kpi.payload?.timeKpis, 'expected timeKpis payload')
    assert.equal(kpi.payload.timeKpis.latestPeriod, 2025)
    assert.equal(kpi.payload.timeKpis.prevPeriod, 2024)
  })
})

