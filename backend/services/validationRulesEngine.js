function normalizeString(value, options = {}) {
  let normalized = String(value)
  if (options.trimWhitespace) normalized = normalized.trim()
  if (options.ignoreCase) normalized = normalized.toUpperCase()
  return normalized
}

function isNullLike(value, options = {}) {
  if (value === null || value === undefined) return true
  if (options.treatNullAsEmpty && value === '') return true
  return false
}

function normalizeValue(value, options = {}) {
  if (isNullLike(value, options)) return null
  if (typeof value === 'string') return normalizeString(value, options)
  return value
}

function compareValues(left, right, options = {}) {
  const a = normalizeValue(left, options)
  const b = normalizeValue(right, options)

  if (a === null && b === null) return { match: true, reason: null, delta: 0 }
  if (a === null || b === null) return { match: false, reason: 'null_mismatch', delta: null }

  if (typeof a === 'number' && typeof b === 'number') {
    const delta = Math.abs(a - b)
    if (options.enableToleranceComparison) {
      const tolerance = Number.isFinite(options.numericTolerance) ? options.numericTolerance : 0.01
      return { match: delta <= tolerance, reason: delta <= tolerance ? null : 'numeric_tolerance_exceeded', delta }
    }
    return { match: a === b, reason: a === b ? null : 'numeric_mismatch', delta }
  }

  return { match: a === b, reason: a === b ? null : 'value_mismatch', delta: null }
}

module.exports = {
  normalizeValue,
  compareValues,
  isNullLike,
}
