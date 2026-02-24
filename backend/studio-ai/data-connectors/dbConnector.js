const { createClient } = require('@supabase/supabase-js')
const { inferSchema, normalizeRows, createCacheKey } = require('./normalizer')
const { getCached, setCached, recordSchema } = require('./cache')

function getSupabaseClient(opts = {}) {
  if (opts.supabaseClient) return opts.supabaseClient
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('dbConnector: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

function applyFilters(q, filters) {
  const f = filters && typeof filters === 'object' ? filters : {}
  if (f.eq && typeof f.eq === 'object') {
    for (const [k, v] of Object.entries(f.eq)) q = q.eq(k, v)
  }
  if (f.neq && typeof f.neq === 'object') {
    for (const [k, v] of Object.entries(f.neq)) q = q.neq(k, v)
  }
  if (f.ilike && typeof f.ilike === 'object') {
    for (const [k, v] of Object.entries(f.ilike)) q = q.ilike(k, v)
  }
  if (f.gte && typeof f.gte === 'object') {
    for (const [k, v] of Object.entries(f.gte)) q = q.gte(k, v)
  }
  if (f.lte && typeof f.lte === 'object') {
    for (const [k, v] of Object.entries(f.lte)) q = q.lte(k, v)
  }
  if (f.in && typeof f.in === 'object') {
    for (const [k, v] of Object.entries(f.in)) q = q.in(k, Array.isArray(v) ? v : [v])
  }
  return q
}

/**
 * DB connector (Supabase/Postgres via PostgREST).
 * Accepts:
 * - { table: string, select?: string, limit?: number, filters?: {...} }
 * - { query: { table, select?, limit?, filters? } }
 */
async function dbConnector(input, opts = {}) {
  const cfg = input || {}
  const query = cfg.query && typeof cfg.query === 'object' ? cfg.query : cfg
  const table = String(query.table || query.from || '').trim()
  const select = query.select ? String(query.select) : '*'
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 5000, 1), 50_000)

  if (!table) throw new Error('dbConnector: table is required')

  const cacheKey = createCacheKey({ sourceType: 'db', table, select, limit, filters: query.filters || null })
  const cached = getCached(cacheKey)
  if (cached) return cached

  const supabase = getSupabaseClient(opts)
  let q = supabase.from(table).select(select).limit(limit)
  q = applyFilters(q, query.filters)

  const { data, error } = await q
  if (error) throw new Error(`dbConnector: ${error.message || 'query failed'}`)

  const rows = normalizeRows(Array.isArray(data) ? data : [])
  const schema = inferSchema(rows, { sampleRowLimit: opts.sampleRowLimit || 2000 })

  const drift = recordSchema(cacheKey, schema.map((c) => c.name))
  if (drift.changed) {
    console.warn('[studio-ai] schema drift detected (db):', {
      table,
      added: drift.added,
      removed: drift.removed,
    })
  }

  const canonical = {
    schema,
    rows,
    metadata: {
      sourceType: 'db',
      sourceName: table,
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  }

  setCached(cacheKey, canonical, { ttlMs: opts.cacheTtlMs })
  return canonical
}

module.exports = { dbConnector }

