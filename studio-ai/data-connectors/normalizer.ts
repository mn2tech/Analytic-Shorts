import type { ColumnDefinition } from '../contracts/canonicalDataset'

export function sanitizeColumnName(name: any): string {
  const raw = String(name ?? '').trim()
  const base = raw || 'column'
  const normalized = base
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/[^\w]+/g, '_')
    // Preserve our flatten separator `__` while still preventing unbounded runs.
    .replace(/_{3,}/g, '__')
    .replace(/^_+|_+$/g, '')
  const safe = normalized || 'column'
  return /^\d/.test(safe) ? `col_${safe}` : safe
}

function safeJsonStringify(v: any): string {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function flattenObject(input: any, prefix = '', out: Record<string, any> = {}): Record<string, any> {
  if (input === null || input === undefined) return out
  if (typeof input !== 'object' || input instanceof Date) {
    out[prefix || 'value'] = input
    return out
  }

  if (Array.isArray(input)) {
    out[prefix || 'value'] = safeJsonStringify(input)
    return out
  }

  const entries = Object.entries(input)
  if (entries.length === 0 && prefix) {
    out[prefix] = safeJsonStringify(input)
    return out
  }

  for (const [k, v] of entries) {
    const key = sanitizeColumnName(k)
    const next = prefix ? `${prefix}__${key}` : key
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      flattenObject(v, next, out)
    } else if (Array.isArray(v)) {
      out[next] = safeJsonStringify(v)
    } else {
      out[next] = v
    }
  }
  return out
}

function looksLikeDateString(s: any): boolean {
  const str = String(s ?? '').trim()
  if (!str) return false
  if (/^\d{1,6}$/.test(str)) return false
  return (
    /^\d{4}-\d{1,2}-\d{1,2}/.test(str) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}/.test(str) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str) ||
    /^\d{1,2}-\d{1,2}-\d{2,4}/.test(str) ||
    /^\d{4}-\d{2}-\d{2}T/.test(str) ||
    /^\d{4}-\d{2}-\d{2}\s/.test(str)
  )
}

export function normalizeDate(value: any): any {
  if (value === null || value === undefined || value === '') return value
  if (value instanceof Date) {
    const t = value.getTime()
    return Number.isFinite(t) ? value.toISOString() : value
  }

  if (typeof value === 'number') {
    if (value > 10_000_000_000) {
      const d = new Date(value)
      return !Number.isNaN(d.getTime()) ? d.toISOString() : value
    }
    if (value > 1_000_000_000 && value < 10_000_000_000) {
      const d = new Date(value * 1000)
      return !Number.isNaN(d.getTime()) ? d.toISOString() : value
    }
    return value
  }

  if (typeof value === 'string' && looksLikeDateString(value)) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }

  return value
}

export function detectType(values: any[]): ColumnDefinition['inferredType'] {
  const nonNull = (Array.isArray(values) ? values : []).filter((v) => v !== null && v !== undefined && v !== '')
  if (nonNull.length === 0) return 'string'

  let numberLike = 0
  let boolLike = 0
  let dateLike = 0
  let objectLike = 0

  for (const v of nonNull.slice(0, 250)) {
    if (v instanceof Date) {
      dateLike++
      continue
    }
    const t = typeof v
    if (t === 'boolean') {
      boolLike++
      continue
    }
    if (t === 'number' && Number.isFinite(v)) {
      numberLike++
      continue
    }
    if (t === 'object') {
      objectLike++
      continue
    }
    const s = String(v).trim()
    if (!s) continue
    if (/^(true|false)$/i.test(s)) {
      boolLike++
      continue
    }
    const cleaned = s.replace(/[$,\s]/g, '')
    const num = Number(cleaned)
    if (!Number.isNaN(num) && Number.isFinite(num) && cleaned !== '') {
      numberLike++
      continue
    }
    if (looksLikeDateString(s)) {
      const d = new Date(s)
      if (!Number.isNaN(d.getTime())) dateLike++
    }
  }

  const n = Math.max(1, Math.min(nonNull.length, 250))
  const ratio = (k: number) => k / n

  if (objectLike > 0) return 'object'
  if (ratio(dateLike) >= 0.7) return 'date'
  if (ratio(boolLike) >= 0.8) return 'boolean'
  if (ratio(numberLike) >= 0.8) return 'number'
  return 'string'
}

export function limitHighCardinality(values: any[], { limit = 25 }: { limit?: number } = {}): any[] {
  const out: any[] = []
  const seen = new Set<string>()
  for (const v of Array.isArray(values) ? values : []) {
    const key = typeof v === 'string' ? v : safeJsonStringify(v)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
    if (out.length >= limit) break
  }
  return out
}

export function normalizeRows(rows: any[]): Record<string, any>[] {
  const input = Array.isArray(rows) ? rows : []
  return input.map((row) => {
    const flat = flattenObject(row)
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(flat)) {
      out[sanitizeColumnName(k)] = normalizeDate(v)
    }
    return out
  })
}

export function inferSchema(rows: Record<string, any>[], { sampleRowLimit = 2000, sampleValuesLimit = 25 } = {}): ColumnDefinition[] {
  const sampled = rows.length <= sampleRowLimit ? rows : rows.filter((_, i) => i % Math.max(1, Math.floor(rows.length / sampleRowLimit)) === 0).slice(0, sampleRowLimit)
  const columns = new Set<string>()
  for (const r of sampled) Object.keys(r || {}).forEach((k) => columns.add(k))

  const schema: ColumnDefinition[] = []
  for (const name of Array.from(columns).sort()) {
    const colValues = sampled.map((r) => r?.[name]).filter((v) => v !== undefined)
    const nullable = colValues.some((v) => v === null || v === undefined || v === '')
    const inferredType = detectType(colValues)
    const sampleValues = limitHighCardinality(colValues.filter((v) => v !== null && v !== undefined && v !== ''), { limit: sampleValuesLimit })
    schema.push({ name, inferredType, nullable, sampleValues })
  }
  return schema
}

