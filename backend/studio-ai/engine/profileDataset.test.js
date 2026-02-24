const { test, describe } = require('node:test')
const assert = require('node:assert/strict')

const { profileDataset } = require('./profileDataset')
const { csvConnector } = require('../data-connectors/csvConnector')
const { normalizeRows, inferSchema } = require('../data-connectors/normalizer')

describe('profileDataset (AAI Studio)', () => {
  test('profiles a small CSV canonical dataset deterministically', async () => {
    const csv = Buffer.from(
      [
        'id,amount,postedDate,state,description',
        'a1,10,2026-01-01,CA,"Short note"',
        'a2,20,2026-01-02,NY,"This is a longer description that should be treated as text content."',
        'a2,20,2026-01-02,NY,"This is a longer description that should be treated as text content."',
      ].join('\n'),
      'utf-8'
    )

    const canonical = await csvConnector({ buffer: csv, filename: 'fixture.csv' }, { sampleRowLimit: 100 })
    const profile = profileDataset(canonical, { maxProfileRows: 100, sampleValuesLimit: 5 })

    assert.equal(profile.datasetStats.rowCount, 3)
    assert.equal(profile.datasetStats.profiledRowCount, 3)
    assert.equal(profile.datasetStats.columnCount, canonical.schema.length)

    const byName = Object.fromEntries(profile.columns.map((c) => [c.name, c]))
    assert.equal(byName.postedDate.roleCandidate, 'time')
    assert.equal(byName.state.roleCandidate, 'geo')
    assert.equal(byName.amount.inferredType, 'number')
    assert.equal(byName.amount.roleCandidate, 'measure')
    assert.equal(byName.id.roleCandidate, 'id')
    assert.equal(byName.description.roleCandidate, 'text')

    assert.equal(profile.flags.hasTime, true)
    assert.equal(profile.flags.hasGeo, true)
    assert.equal(profile.flags.hasNumeric, true)
    assert.equal(profile.flags.hasText, true)

    // We intentionally inserted a duplicate row (3rd repeats 2nd).
    assert.ok(profile.quality.duplicatesPct > 0)

    // Deterministic ordering: columns sorted by name
    const names = profile.columns.map((c) => c.name)
    const sorted = [...names].sort((a, b) => a.localeCompare(b))
    assert.deepEqual(names, sorted)
  })

  test('profiles flattened nested API output and detects id/time', () => {
    const raw = [
      {
        noticeId: 'n-001',
        solicitationNumber: 'S-9',
        postedDate: '2026-02-01T10:00:00Z',
        organization: { name: 'Agency A', state: 'VA' },
        place: { lat: 38.9, lon: -77.0 },
        award: { amount: 1000 },
      },
      {
        noticeId: 'n-002',
        solicitationNumber: 'S-10',
        postedDate: '2026-02-03T10:00:00Z',
        organization: { name: 'Agency B', state: 'MD' },
        place: { lat: 39.1, lon: -76.7 },
        award: { amount: 2500 },
      },
    ]

    const rows = normalizeRows(raw)
    const schema = inferSchema(rows, { sampleRowLimit: 100 })
    const canonical = {
      schema,
      rows,
      metadata: {
        sourceType: 'api',
        sourceName: 'fixture-api',
        fetchedAt: new Date().toISOString(),
        rowCount: rows.length,
      },
    }

    const profile = profileDataset(canonical, { maxProfileRows: 50, sampleValuesLimit: 5 })
    const byName = Object.fromEntries(profile.columns.map((c) => [c.name, c]))

    // Flattened keys should exist
    assert.ok(byName.organization__state)
    assert.ok(byName.place__lat)
    assert.ok(byName.place__lon)
    assert.ok(byName.award__amount)

    assert.equal(byName.postedDate.roleCandidate, 'time')
    assert.equal(byName.noticeId.roleCandidate, 'id')
    assert.equal(byName.solicitationNumber.roleCandidate, 'id')
    assert.equal(byName.place__lat.roleCandidate, 'geo')
    assert.equal(byName.place__lon.roleCandidate, 'geo')
    assert.equal(byName.award__amount.roleCandidate, 'measure')

    assert.equal(profile.flags.hasTime, true)
    assert.equal(profile.flags.hasGeo, true)
    assert.equal(profile.flags.hasNumeric, true)
  })

  test('treats numeric Year/FY columns as time (not measure)', () => {
    const rows = [
      { Year: 2020, Income: 0 },
      { Year: 2021, Income: 1200 },
      { Year: 2022, Income: 5600 },
      { Year: 2023, Income: 63000 },
      { Year: 2024, Income: 554000 },
      { Year: 2025, Income: 930000 },
    ]
    const schema = inferSchema(rows, { sampleRowLimit: 50 })
    const canonical = {
      schema,
      rows,
      metadata: { sourceType: 'api', sourceName: 'yearly-income-fixture', fetchedAt: new Date().toISOString(), rowCount: rows.length },
    }
    const profile = profileDataset(canonical, { maxProfileRows: 50 })
    const byName = Object.fromEntries(profile.columns.map((c) => [c.name, c]))
    assert.equal(byName.Year.inferredType, 'number')
    assert.equal(byName.Year.roleCandidate, 'time')
    assert.equal(byName.Income.roleCandidate, 'measure')
    assert.equal(profile.flags.hasTime, true)
  })

  test('profiles only first N rows when configured (deterministic)', () => {
    const rows = []
    for (let i = 0; i < 200; i++) rows.push({ id: `r${i}`, value: i, date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}` })
    const schema = inferSchema(rows, { sampleRowLimit: 50 })
    const canonical = {
      schema,
      rows,
      metadata: { sourceType: 'api', sourceName: 'big', fetchedAt: new Date().toISOString(), rowCount: rows.length },
    }

    const p1 = profileDataset(canonical, { maxProfileRows: 50 })
    const p2 = profileDataset(canonical, { maxProfileRows: 50 })
    assert.equal(p1.datasetStats.profiledRowCount, 50)
    assert.deepEqual(p1, p2)
  })
})

