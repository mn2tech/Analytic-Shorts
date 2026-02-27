/**
 * Minimal tests for buildPdfModel: mapping evidence + narrative to template view model.
 */
const { describe, it } = require('node:test')
const assert = require('node:assert')
const { buildPdfModel } = require('./evidenceToPdfModel')

describe('evidenceToPdfModel', () => {
  it('buildPdfModel returns object with agencyName, reportTitle, hasKpis, kpis array', async () => {
    const evidence = {
      primaryMetric: 'revenue',
      kpis: [
        { primaryMeasure: 'revenue', latest: { period: '2026-02', value: 1000 }, change: { pct: 0.1 } },
        { primaryMeasure: 'unit_price', latest: { value: 50 }, metricSummaries: [] },
      ],
      trends: [],
      breakdowns: [],
      drivers: [],
    }
    const narrative = { executiveSummary: 'Test summary.', topInsights: ['A', 'B'], suggestedQuestions: ['Q?'] }
    const branding = { agencyName: 'Acme', agencyTagline: 'Tag' }
    const reportMeta = { clientName: 'Client', reportTitle: 'Report', dateRange: 'Jan – Feb 2026' }
    const model = await buildPdfModel({ evidence, narrative, branding, reportMeta })
    assert.equal(model.agencyName, 'Acme')
    assert.equal(model.reportTitle, 'Report')
    assert.equal(model.clientName, 'Client')
    assert.equal(model.dateRange, 'Jan – Feb 2026')
    assert.ok(Array.isArray(model.kpis))
    assert.ok(model.kpis.length >= 1)
    assert.equal(model.hasKpis, true)
    assert.equal(model.kpis[0].label, 'Revenue')
    assert.ok(model.kpis[0].value === '$1K' || model.kpis[0].value === '1000' || model.kpis[0].value.includes('1'))
    assert.equal(model.hasTopInsights, true)
    assert.equal(model.topInsights.length, 2)
    assert.equal(model.hasSuggestedQuestions, true)
  })

  it('buildPdfModel derives topProducts from breakdowns when dimension looks like product', async () => {
    const evidence = {
      primaryMetric: 'revenue',
      kpis: [],
      trends: [],
      breakdowns: [
        { dimension: 'product_name', rows: [{ key: 'Widget A', value: 500 }, { key: 'Widget B', value: 300 }] },
      ],
      drivers: [],
    }
    const model = await buildPdfModel({ evidence, narrative: {}, branding: {}, reportMeta: {} })
    assert.equal(model.hasTopProducts, true)
    assert.equal(model.topProducts.length, 2)
    assert.equal(model.topProducts[0].name, 'Widget A')
    assert.equal(model.topProducts[0].value, '500')
  })

  it('buildPdfModel sets showGeo and geoRows when breakdown dimension is geo-like', async () => {
    const evidence = {
      primaryMetric: 'sales',
      kpis: [],
      trends: [],
      breakdowns: [
        { dimension: 'state', rows: [{ key: 'CA', value: 100 }, { key: 'NY', value: 80 }] },
      ],
      drivers: [],
    }
    const model = await buildPdfModel({ evidence, narrative: {}, branding: {}, reportMeta: {} })
    assert.equal(model.showGeo, true)
    assert.equal(model.hasGeoRows, true)
    assert.equal(model.geoRows.length, 2)
  })
})
