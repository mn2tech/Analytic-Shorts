const crypto = require('crypto')

function sanitizeColumnName(name) {
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

function flattenObject(input, prefix = '', out = {}) {
  if (input === null || input === undefined) return out
  if (typeof input !== 'object' || input instanceof Date) {
    out[prefix || 'value'] = input
    return out
  }

  if (Array.isArray(input)) {
    // Arrays are preserved as JSON strings to avoid exploding columns.
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

function safeJsonStringify(v) {
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

function looksLikeDateString(s) {
  const str = String(s ?? '').trim()
  if (!str) return false
  // Avoid converting short numeric strings like "2024" or "1234" to dates.
  if (/^\d{1,6}$/.test(str)) return false
  // Be strict: avoid strings like "S-9" being parsed as dates.
  return (
    /^\d{4}-\d{1,2}-\d{1,2}/.test(str) ||
    /^\d{4}\/\d{1,2}\/\d{1,2}/.test(str) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(str) ||
    /^\d{1,2}-\d{1,2}-\d{2,4}/.test(str) ||
    /^\d{4}-\d{2}-\d{2}T/.test(str) ||
    /^\d{4}-\d{2}-\d{2}\s/.test(str)
  )
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === '') return value
  if (value instanceof Date) {
    const t = value.getTime()
    return Number.isFinite(t) ? value.toISOString() : value
  }

  if (typeof value === 'number') {
    // If it looks like a unix epoch (ms or s), normalize to ISO.
    if (value > 10_000_000_000) {
      const d = new Date(value)
      return !isNaN(d.getTime()) ? d.toISOString() : value
    }
    if (value > 1_000_000_000 && value < 10_000_000_000) {
      const d = new Date(value * 1000)
      return !isNaN(d.getTime()) ? d.toISOString() : value
    }
    return value
  }

  if (typeof value === 'string' && looksLikeDateString(value)) {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d.toISOString()
  }

  return value
}

function detectType(values) {
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
      if (!isNaN(d.getTime())) dateLike++
    }
  }

  const n = Math.max(1, Math.min(nonNull.length, 250))
  const ratio = (k) => k / n

  if (objectLike > 0) return 'object'
  if (ratio(dateLike) >= 0.7) return 'date'
  if (ratio(boolLike) >= 0.8) return 'boolean'
  if (ratio(numberLike) >= 0.8) return 'number'
  return 'string'
}

function limitHighCardinality(values, { limit = 25 } = {}) {
  const out = []
  const seen = new Set()
  for (const v of Array.isArray(values) ? values : []) {
    const key = typeof v === 'string' ? v : safeJsonStringify(v)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(v)
    if (out.length >= limit) break
  }
  return out
}

function stableRowSample(rows, { maxRows = 2000 } = {}) {
  if (!Array.isArray(rows) || rows.length <= maxRows) return rows || []
  const step = Math.max(1, Math.floor(rows.length / maxRows))
  const sampled = []
  for (let i = 0; i < rows.length && sampled.length < maxRows; i += step) {
    sampled.push(rows[i])
  }
  return sampled
}

function normalizeRows(rows, { rowLimit = null } = {}) {
  const input = Array.isArray(rows) ? rows : []
  const limited = Number.isFinite(rowLimit) && rowLimit > 0 ? input.slice(0, rowLimit) : input
  return limited.map((row) => {
    const flat = flattenObject(row)
    const out = {}
    for (const [k, v] of Object.entries(flat)) {
      out[sanitizeColumnName(k)] = normalizeDate(v)
    }
    return out
  })
}

function inferSchema(rows, { sampleRowLimit = 2000, sampleValuesLimit = 25 } = {}) {
  const normalized = normalizeRows(rows)
  const sampled = stableRowSample(normalized, { maxRows: sampleRowLimit })
  const columns = new Set()
  for (const r of sampled) Object.keys(r || {}).forEach((k) => columns.add(k))

  const schema = []
  for (const name of Array.from(columns).sort()) {
    const colValues = sampled.map((r) => r?.[name]).filter((v) => v !== undefined)
    const nullable = colValues.some((v) => v === null || v === undefined || v === '')
    const inferredType = detectType(colValues)
    const sampleValues = limitHighCardinality(colValues.filter((v) => v !== null && v !== undefined && v !== ''), {
      limit: sampleValuesLimit,
    })
    schema.push({ name, inferredType, nullable, sampleValues })
  }
  return schema
}

function createCacheKey(obj) {
  const json = safeJsonStringify(obj)
  return crypto.createHash('sha256').update(json).digest('hex')
}

module.exports = {
  flattenObject,
  detectType,
  normalizeDate,
  sanitizeColumnName,
  limitHighCardinality,
  normalizeRows,
  inferSchema,
  stableRowSample,
  createCacheKey,
}

