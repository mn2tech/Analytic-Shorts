import axios from 'axios'
import type { CanonicalDataset } from '../contracts/canonicalDataset'
import { inferSchema, normalizeRows } from './normalizer'

export interface ApiConnectorConfig {
  url: string
  method: 'GET' | 'POST'
  headers?: Record<string, string>
  body?: any
  recordsPath?: string
}

function getByPath(obj: any, path?: string): any {
  if (!path) return obj
  const parts = String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((p) => p.trim())
    .filter(Boolean)
  let cur: any = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = cur[p]
  }
  return cur
}

function extractRecords(body: any, recordsPath?: string): any[] {
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

function detectNextPage(body: any): string | null {
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

export async function apiConnector(config: ApiConnectorConfig, opts: { timeoutMs?: number; maxPages?: number } = {}): Promise<CanonicalDataset> {
  const url = String(config?.url || '').trim()
  const method = String(config?.method || 'GET').toUpperCase() as 'GET' | 'POST'
  if (!url) throw new Error('apiConnector: url is required')
  if (method !== 'GET' && method !== 'POST') throw new Error('apiConnector: method must be GET or POST')

  const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : 15000
  const maxPages = Number.isFinite(opts.maxPages) ? opts.maxPages : 25

  let nextUrl: string | null = url
  let page = 0
  const all: any[] = []

  while (nextUrl && page < maxPages) {
    const res = await axios.request({
      url: nextUrl,
      method,
      headers: { Accept: 'application/json', ...(config.headers || {}) },
      ...(method === 'POST' ? { data: config.body } : {}),
      timeout: timeoutMs,
      responseType: 'json',
      validateStatus: (s) => s >= 200 && s < 300,
    })
    const body = res.data
    const records = extractRecords(body, config.recordsPath)
    if (records.length) all.push(...records)
    const np = detectNextPage(body)
    if (np && np.startsWith('/')) {
      const base = new URL(url)
      nextUrl = new URL(np, base.origin).toString()
    } else {
      nextUrl = np
    }
    page++
  }

  const rows = normalizeRows(all)
  const schema = inferSchema(rows)
  return {
    schema,
    rows,
    metadata: {
      sourceType: 'api',
      sourceName: url,
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  }
}

