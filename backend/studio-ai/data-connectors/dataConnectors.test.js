const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')

const { flattenObject, sanitizeColumnName, normalizeDate, detectType, inferSchema } = require('./normalizer')
const { csvConnector } = require('./csvConnector')
const { apiConnector } = require('./apiConnector')
const { samGovConnector } = require('./samGovConnector')
const { dbConnector } = require('./dbConnector')

describe('normalizer utilities', () => {
  test('flattenObject flattens nested keys and sanitizes', () => {
    const out = flattenObject({ a: { b: 1, 'c d': true }, x: null })
    assert.equal(out.a__b, 1)
    assert.equal(out.a__c_d, true)
    assert.ok(Object.prototype.hasOwnProperty.call(out, 'x'))
  })

  test('sanitizeColumnName produces safe identifier', () => {
    assert.equal(sanitizeColumnName('Hello World'), 'Hello_World')
    assert.equal(sanitizeColumnName('  123abc  '), 'col_123abc')
  })

  test('normalizeDate converts ISO-ish strings to ISO', () => {
    const v = normalizeDate('2026-02-22')
    assert.ok(typeof v === 'string' && v.startsWith('2026-02-22'))
  })

  test('detectType infers number/date/boolean', () => {
    assert.equal(detectType(['1', '2', '3']), 'number')
    assert.equal(detectType(['true', 'false', true]), 'boolean')
    assert.equal(detectType(['2026-01-01', '2026-02-01']), 'date')
  })

  test('inferSchema returns column definitions', () => {
    const schema = inferSchema([{ a: 1, b: 'x' }, { a: 2, b: 'y' }])
    const a = schema.find((c) => c.name === 'a')
    const b = schema.find((c) => c.name === 'b')
    assert.equal(a.inferredType, 'number')
    assert.equal(b.inferredType, 'string')
  })
})

describe('csvConnector', () => {
  test('parses CSV buffer and returns CanonicalDataset', async () => {
    const csv = Buffer.from('name,amount,date\nAlice,10,2026-01-01\nBob,20,2026-01-02\n', 'utf-8')
    const ds = await csvConnector({ buffer: csv, filename: 'test.csv' }, { sampleRowLimit: 100 })
    assert.equal(ds.metadata.sourceType, 'csv')
    assert.equal(ds.metadata.rowCount, 2)
    assert.ok(ds.schema.length >= 3)
  })
})

describe('apiConnector', () => {
  let server
  let port

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url.startsWith('/page1')) {
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ data: [{ id: 1, nested: { a: 'x' } }], nextPage: `http://127.0.0.1:${port}/page2` }))
      }
      if (req.url.startsWith('/page2')) {
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ data: [{ id: 2, nested: { a: 'y' } }] }))
      }
      res.statusCode = 404
      res.end('not found')
    })
    await new Promise((resolve) => server.listen(0, resolve))
    port = server.address().port
  })

  after(async () => {
    if (!server) return
    await new Promise((resolve) => server.close(resolve))
  })

  test('fetches paginated data and flattens nested objects', async () => {
    const ds = await apiConnector({ url: `http://127.0.0.1:${port}/page1`, method: 'GET' }, { timeoutMs: 5000, maxPages: 5 })
    assert.equal(ds.metadata.sourceType, 'api')
    assert.equal(ds.metadata.rowCount, 2)
    const keys = Object.keys(ds.rows[0] || {})
    assert.ok(keys.includes('nested__a'), `expected flattened key nested__a; got: ${keys.join(', ')}`)
  })
})

describe('samGovConnector wrapper', () => {
  let server
  let port

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url.startsWith('/api/example/samgov/live')) {
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ data: [{ noticeId: 'n1', award_amount: 1000, postedDate: '2026-01-01' }] }))
      }
      res.statusCode = 404
      res.end('not found')
    })
    await new Promise((resolve) => server.listen(0, resolve))
    port = server.address().port
  })

  after(async () => {
    if (!server) return
    await new Promise((resolve) => server.close(resolve))
  })

  test('calls internal endpoint and normalizes into CanonicalDataset', async () => {
    const ds = await samGovConnector(
      { path: '/api/example/samgov/live' },
      { baseUrl: `http://127.0.0.1:${port}`, timeoutMs: 5000 }
    )
    assert.equal(ds.metadata.sourceType, 'samgov')
    assert.equal(ds.metadata.rowCount, 1)
    assert.ok(ds.schema.find((c) => c.name === 'award_amount'))
  })
})

describe('dbConnector', () => {
  test('fetches rows via injected supabase client', async () => {
    const rows = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
    const builder = {
      select() { return this },
      limit() { return this },
      eq() { return this },
      neq() { return this },
      ilike() { return this },
      gte() { return this },
      lte() { return this },
      in() { return this },
      then(resolve, _reject) {
        resolve({ data: rows, error: null })
      },
    }
    const supabaseClient = {
      from() { return builder },
    }

    const ds = await dbConnector({ table: 'test_table', limit: 10 }, { supabaseClient, sampleRowLimit: 100 })
    assert.equal(ds.metadata.sourceType, 'db')
    assert.equal(ds.metadata.rowCount, 2)
    assert.ok(ds.schema.find((c) => c.name === 'name'))
  })
})

