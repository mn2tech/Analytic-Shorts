/**
 * Numeric inference + conversion utilities for uploaded CSV/XLSX data.
 *
 * Goal: normalize common numeric formatting (commas, currency, whitespace, parentheses negatives)
 * and convert columns to numbers only when conversion is "safe" (parse success ratio >= threshold).
 */
 
const DEFAULT_NULL_LIKE = new Set([
  '',
  'na',
  'n/a',
  'null',
  'none',
  'nan',
  '-',
  '—',
  '--',
])
 
function isNullLike(value, nullLikeSet = DEFAULT_NULL_LIKE) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return nullLikeSet.has(s)
  }
  return false
}
 
function stripOuterQuotes(s) {
  if (typeof s !== 'string') return s
  const t = s.trim()
  if (t.length >= 2) {
    const first = t[0]
    const last = t[t.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return t.slice(1, -1).trim()
    }
  }
  return t
}
 
// Common currency symbols; we intentionally keep this conservative.
const CURRENCY_RE = /[$€£¥₦₹₩₫฿₽₺₴₱]/g
 
/**
 * Attempt to parse a numeric-ish cell value.
 *
 * - Trims whitespace
 * - Removes outer quotes
 * - Removes commas
 * - Removes currency symbols
 * - Handles parentheses negatives: "(123)" -> -123
 *
 * Returns { ok, value, normalized, reason }
 */
function tryParseNumber(value, { allowParensNegative = true } = {}) {
  if (value === null || value === undefined) return { ok: false, reason: 'null' }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return { ok: false, reason: 'non_finite_number' }
    return { ok: true, value, normalized: String(value) }
  }
 
  let s = stripOuterQuotes(String(value))
  if (!s) return { ok: false, reason: 'empty' }
 
  const lower = s.trim().toLowerCase()
  if (DEFAULT_NULL_LIKE.has(lower)) return { ok: false, reason: 'null_like' }
 
  let isNegative = false
  if (allowParensNegative) {
    const m = s.match(/^\((.*)\)$/)
    if (m) {
      isNegative = true
      s = (m[1] || '').trim()
    }
  }
 
  // Remove whitespace (including NBSP) and thousands separators.
  s = s.replace(/[\s\u00A0]/g, '')
  s = s.replace(/,/g, '')
 
  // Remove currency symbols anywhere (e.g. "$1,200", "USD$1200" won't fully normalize—intentional).
  s = s.replace(CURRENCY_RE, '')
 
  // If a leading sign exists, normalize it.
  if (s.startsWith('+')) s = s.slice(1)
  if (s.startsWith('-')) {
    isNegative = !isNegative
    s = s.slice(1)
  }
 
  // Guard: must look like a plain number now.
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, reason: 'not_numeric' }
 
  const num = Number(s)
  if (!Number.isFinite(num)) return { ok: false, reason: 'non_finite' }
 
  const finalNum = isNegative ? -num : num
  return { ok: true, value: finalNum, normalized: (isNegative ? '-' : '') + s }
}
 
/**
 * Infer which columns should be numeric and return a converted copy of data.
 *
 * Strategy:
 * - For each column, attempt numeric parse on up to `evaluationRowLimit` rows.
 * - Only mark column numeric if parseSuccessRatio >= threshold across non-null-like values.
 * - When converting: parse each value; unparseable/null-like values become '' (missing).
 */
function inferNumericColumnsAndConvert(data, columns, options = {}) {
  const {
    threshold = 0.7,
    evaluationRowLimit = 5000,
    minNonNullValues = 2,
    allowParensNegative = true,
    nullLikeSet = DEFAULT_NULL_LIKE,
  } = options
 
  const evalRows = Array.isArray(data) ? data.slice(0, Math.max(0, evaluationRowLimit)) : []
  const detailsByColumn = {}
 
  const numericColumns = []
 
  for (const col of columns || []) {
    let attempted = 0
    let parsed = 0
    let examples = []
 
    for (let i = 0; i < evalRows.length; i++) {
      const raw = evalRows[i]?.[col]
      if (isNullLike(raw, nullLikeSet)) continue
      attempted++
 
      const parsedRes = tryParseNumber(raw, { allowParensNegative })
      if (parsedRes.ok) {
        parsed++
        if (examples.length < 3 && typeof raw !== 'number' && String(raw).trim() !== parsedRes.normalized) {
          examples.push({ before: String(raw), after: parsedRes.normalized })
        }
      }
    }
 
    const ratio = attempted === 0 ? 0 : parsed / attempted
    const wouldConvert = attempted >= minNonNullValues && ratio >= threshold
    if (wouldConvert) numericColumns.push(col)
 
    detailsByColumn[col] = {
      attempted,
      parsed,
      ratio,
      converted: wouldConvert,
      reason: attempted < minNonNullValues
        ? `Too few non-empty values to infer numeric (need ≥ ${minNonNullValues})`
        : wouldConvert
          ? `Converted (${Math.round(ratio * 100)}% numeric parse success)`
          : `Below threshold (${Math.round(ratio * 100)}% < ${Math.round(threshold * 100)}%)`,
      examples,
    }
  }
 
  // Convert all rows for numeric columns; trim strings for others.
  const convertedData = (Array.isArray(data) ? data : []).map((row) => {
    const out = {}
    for (const col of columns || []) {
      const v = row?.[col]
      if (numericColumns.includes(col)) {
        if (isNullLike(v, nullLikeSet)) {
          out[col] = ''
        } else {
          const parsedRes = tryParseNumber(v, { allowParensNegative })
          out[col] = parsedRes.ok ? parsedRes.value : ''
        }
      } else if (v === null || v === undefined) {
        out[col] = ''
      } else if (typeof v === 'string') {
        out[col] = v.trim()
      } else {
        out[col] = String(v).trim()
      }
    }
    return out
  })
 
  return {
    data: convertedData,
    numericColumns,
    numericInference: {
      threshold,
      evaluationRowLimit,
      minNonNullValues,
      columns: detailsByColumn,
    },
  }
}
 
module.exports = {
  tryParseNumber,
  inferNumericColumnsAndConvert,
  DEFAULT_NULL_LIKE,
  isNullLike,
}
 
