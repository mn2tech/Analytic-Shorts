/**
 * Intent-aware primary metric selection from profile.
 * Returns column name or null; for opportunity intent, primary is count(rows) so we return null and caller uses row count.
 */

function computeVariance(rows, colName) {
  let n = 0
  let mean = 0
  let m2 = 0
  for (const r of rows) {
    const v = r?.[colName]
    const x = typeof v === 'number' && Number.isFinite(v) ? v : parseFloat(String(v).replace(/[$,\s]/g, ''))
    if (Number.isFinite(x)) {
      n++
      const delta = x - mean
      mean += delta / n
      const delta2 = x - mean
      m2 += delta * delta2
    }
    if (n >= 5000) break
  }
  return n > 1 ? m2 / (n - 1) : 0
}

/**
 * @param {Object} profile - Dataset profile from profileDataset()
 * @param {"sales"|"financial"|"opportunity"|"operations"|"generic"} intent - From detectDatasetIntent
 * @param {Array<Object>} [rows] - Optional rows for variance ordering (not for sole selection)
 * @returns {string|null} - Column name for primary measure, or null for count-based (e.g. opportunity)
 */
function selectPrimaryMetric(profile, intent, rows = []) {
  const columns = Array.isArray(profile?.columns) ? profile.columns : []
  const measures = columns.filter(
    (c) => c && (c.roleCandidate === 'measure' || c.inferredType === 'number') && c.roleCandidate !== 'time' && c.roleCandidate !== 'id' && c.roleCandidate !== 'geo'
  )

  if (intent === 'opportunity') {
    const countCol = measures.find((c) => /opportunity_id|notice_id|solicitation|count/i.test(String(c.name)))
    return countCol ? countCol.name : null
  }

  const lowNull = (c) => (c.nullPct ?? 1) <= 0.5
  const byPreference = (names) => {
    const lower = (s) => String(s || '').toLowerCase()
    for (const n of names) {
      const found = measures.find((c) => lower(c.name) === lower(n) || lower(c.name).includes(lower(n)))
      if (found && lowNull(found)) return found.name
    }
    return null
  }

  if (intent === 'sales') {
    // Prefer revenue/gross even with higher null rate (derived columns may be sparse)
    const revenueOrGross = measures.find((c) => {
      const n = String(c?.name || '').toLowerCase()
      return n === 'revenue' || n === 'gross'
    })
    if (revenueOrGross) return revenueOrGross.name
    const preferred = byPreference(['revenue', 'gross', 'amount', 'sales', 'quantity', 'unit_price'])
    if (preferred) return preferred
  }

  if (intent === 'financial') {
    const preferred = byPreference(['amount', 'total', 'cost', 'expense', 'balance', 'payment'])
    if (preferred) return preferred
  }

  if (intent === 'operations') {
    const preferred = byPreference(['duration', 'count', 'sla'])
    if (preferred) return preferred
  }

  const withLowNull = measures.filter(lowNull)
  const pool = withLowNull.length ? withLowNull : measures
  if (pool.length === 0) return null
  if (pool.length === 1) return pool[0].name
  pool.sort((a, b) => {
    const am = a.roleCandidate === 'measure' ? 0 : 1
    const bm = b.roleCandidate === 'measure' ? 0 : 1
    if (am !== bm) return am - bm
    if ((a.nullPct ?? 1) !== (b.nullPct ?? 1)) return (a.nullPct ?? 1) - (b.nullPct ?? 1)
    if (rows.length > 0) {
      const va = computeVariance(rows, a.name)
      const vb = computeVariance(rows, b.name)
      if (vb !== va) return vb - va
    }
    return String(a.name).localeCompare(String(b.name))
  })
  return pool[0].name
}

module.exports = { selectPrimaryMetric, computeVariance }
