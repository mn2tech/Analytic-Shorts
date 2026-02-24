import type { SupabaseClient } from '@supabase/supabase-js'
import type { CanonicalDataset } from '../contracts/canonicalDataset'
import { inferSchema, normalizeRows } from './normalizer'

export type DbConnectorInput =
  | {
      table: string
      select?: string
      limit?: number
      filters?: {
        eq?: Record<string, any>
        neq?: Record<string, any>
        ilike?: Record<string, string>
        gte?: Record<string, any>
        lte?: Record<string, any>
        in?: Record<string, any[]>
      }
    }
  | {
      query: {
        table: string
        select?: string
        limit?: number
        filters?: any
      }
    }

function applyFilters(q: any, filters: any) {
  const f = filters && typeof filters === 'object' ? filters : {}
  if (f.eq) Object.entries(f.eq).forEach(([k, v]) => (q = q.eq(k, v)))
  if (f.neq) Object.entries(f.neq).forEach(([k, v]) => (q = q.neq(k, v)))
  if (f.ilike) Object.entries(f.ilike).forEach(([k, v]) => (q = q.ilike(k, v)))
  if (f.gte) Object.entries(f.gte).forEach(([k, v]) => (q = q.gte(k, v)))
  if (f.lte) Object.entries(f.lte).forEach(([k, v]) => (q = q.lte(k, v)))
  if (f.in) Object.entries(f.in).forEach(([k, v]) => (q = q.in(k, Array.isArray(v) ? v : [v])))
  return q
}

export async function dbConnector(input: DbConnectorInput, opts: { supabase: SupabaseClient }): Promise<CanonicalDataset> {
  const qcfg: any = (input as any)?.query && typeof (input as any).query === 'object' ? (input as any).query : input
  const table = String(qcfg?.table || '').trim()
  if (!table) throw new Error('dbConnector: table is required')

  const select = qcfg.select ? String(qcfg.select) : '*'
  const limit = Math.min(Math.max(parseInt(String(qcfg.limit ?? 5000), 10) || 5000, 1), 50_000)

  let q: any = opts.supabase.from(table).select(select).limit(limit)
  q = applyFilters(q, qcfg.filters)
  const { data, error } = await q
  if (error) throw new Error(error.message || 'dbConnector query failed')

  const rows = normalizeRows(Array.isArray(data) ? data : [])
  const schema = inferSchema(rows)
  return {
    schema,
    rows,
    metadata: {
      sourceType: 'db',
      sourceName: table,
      fetchedAt: new Date().toISOString(),
      rowCount: rows.length,
    },
  }
}

