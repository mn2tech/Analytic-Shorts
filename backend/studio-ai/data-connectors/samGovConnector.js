const axios = require('axios')
const { inferSchema, normalizeRows, createCacheKey } = require('./normalizer')
const { getCached, setCached, recordSchema } = require('./cache')

function buildBaseUrlFromReq(req) {
  const proto = (req && req.get && (req.get('x-forwarded-proto') || req.protocol)) || 'http'
  const host = (req && req.get && req.get('host')) || `localhost:${process.env.PORT || 5000}`
  return `${proto}://${host}`
}

function joinUrl(base, path) {
  if (!path) return base
  if (/^https?:\/\//i.test(path)) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/**
 * SAM.gov connector wrapper.
 * Calls existing internal endpoint(s) under this API server.
 *
 * Input:
 * {
 *   endpoint?: string  // e.g. "/api/example/samgov/live?ptype=o&limit=200"
 *   path?: string      // e.g. "/api/example/samgov/live"
 *   query?: Record<string, any>
 * }
 */
async function samGovConnector(input, opts = {}) {
  const cfg = input || {}
  const endpoint = cfg.endpoint ? String(cfg.endpoint).trim() : null
  const path = cfg.path ? String(cfg.path).trim() : '/api/example/samgov/live'
  const query = cfg.query && typeof cfg.query === 'object' ? cfg.query : null

  const resolvedPath = endpoint || path
  const cacheKey = createCacheKey({ sourceType: 'samgov', resolvedPath, query })
  const cached = getCached(cacheKey)
  if (cached) return cached

  const req = opts.req
  const baseUrl = opts.baseUrl || buildBaseUrlFromReq(req)
  const url = joinUrl(baseUrl, resolvedPath)

  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 30000
  const res = await axios.get(url, {
    params: query || undefined,
    timeout: timeoutMs,
    headers: {
      Accept: 'application/json',
      ...(req?.headers?.authorization ? { Authorization: req.headers.authorization } : {}),
    },
    responseType: 'json',
    validateStatus: (s) => s >= 200 && s < 300,
  })

  const body = res.data
  const records = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : Array.isArray(body?.rows) ? body.rows : []
  const rows = normalizeRows(records)
  const schema = inferSchema(rows, { sampleRowLimit: opts.sampleRowLimit || 2000 })

  const drift = recordSchema(cacheKey, schema.map((c) => c.name))
  if (drift.changed) {
    console.warn('[studio-ai] schema drift detected (samgov):', {
      endpoint: resolvedPath,
      added: drift.added,
      removed: drift.removed,
    })
  }

  const canonical = {
    schema,
    rows,
    metadata: {
      sourceType: 'samgov',
      sourceName: resolvedPath,
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  }

  setCached(cacheKey, canonical, { ttlMs: opts.cacheTtlMs })
  return canonical
}

module.exports = { samGovConnector }

