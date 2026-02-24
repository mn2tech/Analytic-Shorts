const axios = require('axios')
const { inferSchema, normalizeRows, createCacheKey } = require('./normalizer')
const { getCached, setCached, recordSchema } = require('./cache')

function getByPath(obj, path) {
  if (!path) return obj
  const parts = String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean)
  let cur = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

function extractRecords(body, recordsPath) {
  if (recordsPath) {
    const v = getByPath(body, recordsPath)
    return Array.isArray(v) ? v : []
  }
  if (Array.isArray(body)) return body
  if (body && Array.isArray(body.data)) return body.data
  if (body && Array.isArray(body.rows)) return body.rows
  if (body && Array.isArray(body.results)) return body.results
  if (body && Array.isArray(body.items)) return body.items
  return []
}

function detectNextPage(body) {
  if (!body || typeof body !== 'object') return null
  const np =
    body.nextPage ||
    body.next_page ||
    body.next ||
    body.links?.next ||
    body.pagination?.next ||
    body.paging?.next
  if (!np) return null
  if (typeof np === 'string') return np
  if (typeof np === 'object' && typeof np.url === 'string') return np.url
  return null
}

async function fetchWithTimeout(config, { timeoutMs = 15000 } = {}) {
  // axios has timeout; keep AbortController for node >= 18 compatibility across adapters
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await axios.request({
      ...config,
      timeout: timeoutMs,
      signal: controller.signal,
      validateStatus: (s) => s >= 200 && s < 300,
    })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Generic REST API connector.
 * Input:
 * {
 *   url: string,
 *   method: "GET" | "POST",
 *   headers?: Record<string,string>,
 *   body?: any,
 *   recordsPath?: string
 * }
 */
async function apiConnector(input, opts = {}) {
  const config = input || {}
  const url = String(config.url || '').trim()
  const method = String(config.method || 'GET').toUpperCase()
  const headers = config.headers && typeof config.headers === 'object' ? config.headers : {}
  const recordsPath = config.recordsPath ? String(config.recordsPath) : null
  const body = config.body

  if (!url) throw new Error('apiConnector: url is required')
  if (method !== 'GET' && method !== 'POST') throw new Error('apiConnector: method must be GET or POST')

  const cacheKey = createCacheKey({ sourceType: 'api', url, method, headers, body, recordsPath })
  const cached = getCached(cacheKey)
  if (cached) return cached

  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 15000
  const maxPages = Number.isFinite(opts.maxPages) ? opts.maxPages : 25

  let nextUrl = url
  let page = 0
  const all = []

  while (nextUrl && page < maxPages) {
    const res = await fetchWithTimeout(
      {
        url: nextUrl,
        method,
        headers: { Accept: 'application/json', ...headers },
        ...(method === 'POST' ? { data: body } : {}),
        responseType: 'json',
      },
      { timeoutMs }
    )
    const data = res.data
    const records = extractRecords(data, recordsPath)
    if (records.length) all.push(...records)
    nextUrl = detectNextPage(data)
    page++
    if (nextUrl && typeof nextUrl === 'string' && nextUrl.startsWith('/')) {
      // resolve relative next links against original url origin
      const base = new URL(url)
      nextUrl = new URL(nextUrl, base.origin).toString()
    }
  }

  const rows = normalizeRows(all)
  const schema = inferSchema(rows, { sampleRowLimit: opts.sampleRowLimit || 2000 })

  const drift = recordSchema(cacheKey, schema.map((c) => c.name))
  if (drift.changed) {
    console.warn('[studio-ai] schema drift detected (api):', {
      url,
      added: drift.added,
      removed: drift.removed,
    })
  }

  const canonical = {
    schema,
    rows,
    metadata: {
      sourceType: 'api',
      sourceName: url,
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  }

  setCached(cacheKey, canonical, { ttlMs: opts.cacheTtlMs })
  return canonical
}

module.exports = { apiConnector }

