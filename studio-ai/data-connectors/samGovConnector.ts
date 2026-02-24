import axios from 'axios'
import type { CanonicalDataset } from '../contracts/canonicalDataset'
import { inferSchema, normalizeRows } from './normalizer'

export interface SamGovConnectorConfig {
  endpoint?: string // e.g. "/api/example/samgov/live?ptype=o&limit=200"
  path?: string // e.g. "/api/example/samgov/live"
  query?: Record<string, any>
}

export async function samGovConnector(config: SamGovConnectorConfig, opts: { baseUrl?: string; timeoutMs?: number } = {}): Promise<CanonicalDataset> {
  const endpoint = config.endpoint ? String(config.endpoint).trim() : null
  const path = config.path ? String(config.path).trim() : '/api/example/samgov/live'
  const resolved = endpoint || path

  const base = opts.baseUrl ? String(opts.baseUrl).replace(/\/+$/, '') : ''
  const url = /^https?:\/\//i.test(resolved) ? resolved : `${base}${resolved.startsWith('/') ? '' : '/'}${resolved}`

  const res = await axios.get(url, {
    params: config.query || undefined,
    timeout: Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 30000,
    responseType: 'json',
    validateStatus: (s) => s >= 200 && s < 300,
  })
  const body = res.data
  const records = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : []

  const rows = normalizeRows(records)
  const schema = inferSchema(rows)
  return {
    schema,
    rows,
    metadata: {
      sourceType: 'samgov',
      sourceName: resolved,
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  }
}

