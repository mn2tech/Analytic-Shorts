/**
 * Unit tests for Agency View Model: KPI period total, driver split by dimension, share formatting.
 * Includes parity test: model used for HTML/PDF must include same tables as frontend.
 */
const { describe, it } = require('node:test')
const assert = require('node:assert')
const {
  buildAgencyReportModel,
  pickTopNByDimension,
  formatSharePct,
  formatValue,
  formatCurrency,
} = require('./evidenceToAgencyModel')
const { renderAgencyModeReportHtml } = require('../../utils/renderTemplate')

describe('evidenceToAgencyModel', () => {
  it('agency KPI selection uses periodTotal for first card', async () => {
    const evidence = {
      primaryMetric: 'revenue',
      kpis: [
        {
          primaryMeasure: 'revenue',
          periodTotal: 50000,
          latest: { period: '2026-02-16', value: 1200 },
          change: { abs: -500, pct: -0.05 },
          rowCount: 1200,
        },
      ],
      trends: [],
      breakdowns: [],
      drivers: [],
    }
    const model = await buildAgencyReportModel({
      evidence,
      narrative: {},
      reportMeta: { reportTitle: 'Test' },
      branding: { agencyName: 'Agency' },
    })
    assert.ok(model.hasKpis)
    assert.ok(model.kpiCards.length >= 1)
    const first = model.kpiCards[0]
    assert.ok(first.label.includes('Period'), 'first KPI should be period total')
    assert.ok(first.value.includes('50') || first.value === '$50K', 'value should reflect periodTotal 50000')
  })

  it('pickTopNByDimension returns top N from breakdowns by dimension', () => {
    const evidence = {
      breakdowns: [
        { dimension: 'product_name', rows: [{ key: 'A', value: 100 }, { key: 'B', value: 80 }, { key: 'C', value: 60 }, { key: 'D', value: 40 }, { key: 'E', value: 20 }] },
        { dimension: 'state', rows: [{ key: 'CA', value: 200 }, { key: 'TX', value: 150 }] },
      ],
      drivers: [],
    }
    const top = pickTopNByDimension(evidence, 'product_name', 3)
    assert.equal(top.length, 3)
    assert.equal(top[0].key, 'A')
    assert.equal(top[0].value, 100)
    assert.equal(top[1].key, 'B')
    assert.equal(top[2].key, 'C')
  })

  it('pickTopNByDimension falls back to drivers when breakdown missing (driver-level dimension)', () => {
    const evidence = {
      breakdowns: [],
      drivers: [
        {
          dimension: 'product_category',
          topDrivers: [
            { group: 'Electronics', total: 500 },
            { group: 'Home', total: 300 },
            { group: 'Fitness', total: 200 },
          ],
        },
      ],
    }
    const top = pickTopNByDimension(evidence, 'product_category', 2)
    assert.equal(top.length, 2)
    assert.equal(top[0].key, 'Electronics')
    assert.equal(top[0].value, 500)
    assert.equal(top[1].key, 'Home')
  })

  it('pickTopNByDimension uses row-level dimension from topDrivers (real API shape)', () => {
    const evidence = {
      breakdowns: [],
      drivers: [
        {
          topDrivers: [
            { dimension: 'product_category', group: 'Electronics', total: 500 },
            { dimension: 'product_category', group: 'Home', total: 300 },
            { dimension: 'state', group: 'TX', total: 620 },
            { dimension: 'state', group: 'CA', total: 510 },
            { dimension: 'payment_method', group: 'Credit Card', total: 1250 },
          ],
        },
      ],
    }
    const byCategory = pickTopNByDimension(evidence, 'product_category', 5)
    assert.equal(byCategory.length, 2)
    assert.equal(byCategory[0].key, 'Electronics')
    assert.equal(byCategory[0].value, 500)
    const byState = pickTopNByDimension(evidence, 'state', 5)
    assert.equal(byState.length, 2)
    assert.equal(byState[0].key, 'TX')
    assert.equal(byState[0].value, 620)
    const byPayment = pickTopNByDimension(evidence, 'payment_method', 5)
    assert.equal(byPayment.length, 1)
    assert.equal(byPayment[0].key, 'Credit Card')
  })

  it('formatSharePct returns percent and 100.0% when exactly 100', () => {
    assert.equal(formatSharePct(25, 100), '25.0%')
    assert.equal(formatSharePct(100, 100), '100.0%')
    assert.equal(formatSharePct(99.99, 100), '100.0%')
    assert.equal(formatSharePct(0, 100), '0.0%')
    assert.equal(formatSharePct(50, 0), '—')
  })

  it('buildAgencyReportModel separates tables by dimension (top 5 each)', async () => {
    const evidence = {
      primaryMetric: 'revenue',
      kpis: [{ primaryMeasure: 'revenue', periodTotal: 1000, rowCount: 100 }],
      trends: [],
      breakdowns: [
        { dimension: 'product_name', rows: [{ key: 'P1', value: 400 }, { key: 'P2', value: 300 }, { key: 'P3', value: 200 }, { key: 'P4', value: 50 }, { key: 'P5', value: 50 }] },
        { dimension: 'state', rows: [{ key: 'CA', value: 600 }, { key: 'TX', value: 400 }] },
      ],
      drivers: [],
    }
    const model = await buildAgencyReportModel({
      evidence,
      narrative: {},
      reportMeta: {},
      branding: {},
    })
    assert.ok(Array.isArray(model.tables))
    const productTable = model.tables.find((t) => t.title === 'Top Products')
    assert.ok(productTable)
    assert.equal(productTable.rows.length, 5)
    assert.equal(productTable.rows[0].name, 'P1')
    assert.equal(productTable.rows[0].value, '400')
    assert.ok(productTable.rows[0].share.endsWith('%'))
    assert.ok(productTable.rows[0].share !== '1')
    const regionTable = model.tables.find((t) => t.title === 'Top Regions')
    assert.ok(regionTable)
    assert.equal(regionTable.rows.length, 2)
  })

  it('buildAgencyReportModel builds tables from drivers only (row-level dimension) for HTML/PDF parity', async () => {
    const evidence = {
      primaryMetric: 'revenue',
      kpis: [{ primaryMeasure: 'revenue', periodTotal: 2015, rowCount: 20 }],
      trends: [],
      breakdowns: [],
      drivers: [
        {
          topDrivers: [
            { dimension: 'product_category', group: 'Electronics', total: 665 },
            { dimension: 'product_category', group: 'Home', total: 770 },
            { dimension: 'product_category', group: 'Fitness', total: 600 },
            { dimension: 'state', group: 'TX', total: 620 },
            { dimension: 'state', group: 'CA', total: 510 },
            { dimension: 'state', group: 'VA', total: 165 },
            { dimension: 'payment_method', group: 'Credit Card', total: 1250 },
          ],
        },
      ],
    }
    const model = await buildAgencyReportModel({
      evidence,
      narrative: {},
      reportMeta: {},
      branding: {},
    })
    assert.ok(Array.isArray(model.tables), 'model.tables must be an array')
    assert.ok(model.tables.length >= 2, 'HTML export must include at least Top Categories and Top Regions from drivers')
    const titles = model.tables.map((t) => t.title)
    assert.ok(titles.includes('Top Categories'), 'Top Categories table must appear in agency model (and thus in HTML)')
    assert.ok(titles.includes('Top Regions'), 'Top Regions table must appear in agency model (and thus in HTML)')
    assert.ok(titles.includes('Payment Methods'), 'Payment Methods table must appear in agency model (and thus in HTML)')
    const categoriesTable = model.tables.find((t) => t.title === 'Top Categories')
    assert.equal(categoriesTable.rows.length, 3)
    assert.equal(categoriesTable.rows[0].name, 'Home')
    assert.ok(categoriesTable.rows[0].share.endsWith('%'))
  })

  it('rendered agency HTML includes dimension tables (frontend–HTML parity)', async () => {
    const evidence = {
      primaryMetric: 'revenue',
      kpis: [{ primaryMeasure: 'revenue', periodTotal: 2015, rowCount: 20 }],
      trends: [],
      breakdowns: [],
      drivers: [
        {
          topDrivers: [
            { dimension: 'product_category', group: 'Electronics', total: 665 },
            { dimension: 'product_category', group: 'Home', total: 770 },
            { dimension: 'state', group: 'TX', total: 620 },
            { dimension: 'payment_method', group: 'Credit Card', total: 1250 },
          ],
        },
      ],
    }
    const model = await buildAgencyReportModel({
      evidence,
      narrative: { executiveSummary: 'Test.', topInsights: [], suggestedQuestions: [] },
      reportMeta: {},
      branding: {},
    })
    const html = renderAgencyModeReportHtml(model)
    assert.ok(typeof html === 'string' && html.length > 0)
    assert.ok(html.includes('Top Categories'), 'HTML must contain Top Categories section')
    assert.ok(html.includes('Top Regions'), 'HTML must contain Top Regions section')
    assert.ok(html.includes('Payment Methods'), 'HTML must contain Payment Methods section')
    assert.ok(html.includes('<table'), 'HTML must contain at least one table element')
    assert.ok(html.includes('Electronics') && html.includes('Credit Card'), 'HTML must include row data from drivers')
  })
})
