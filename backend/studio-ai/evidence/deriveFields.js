/**
 * Deterministic derived fields: add numeric columns to rows when applicable.
 * No AI. Mutates row objects in place and returns the same array (with new keys on each row).
 */

function isNullLike(v) {
  return v === null || v === undefined || v === ''
}

function safeNumber(v) {
  if (isNullLike(v)) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  const s = String(v).trim()
  if (!s) return null
  const cleaned = s.replace(/[$,\s]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function columnNames(profile) {
  return (profile?.columns || []).map((c) => (c && c.name) ? String(c.name).toLowerCase() : '')
}

function findColumn(profile, ...candidates) {
  const names = (profile?.columns || []).map((c) => c?.name).filter((n) => n != null && String(n).trim() !== '')
  const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_')
  for (const want of candidates) {
    const w = norm(want)
    const found = names.find((n) => {
      const ln = norm(n)
      return ln === w || ln.includes(w)
    })
    if (found) return found
  }
  return null
}

/**
 * Add row-level derived columns when applicable.
 * - quantity-like + price-like -> gross = quantity * unit_price; if discount -> revenue = gross - discount else revenue = gross
 * @param {Array<Object>} rows - Array of row objects
 * @param {Object} profile - Dataset profile from profileDataset()
 * @returns {{ rows: Array<Object>, addedColumns: Array<{ name: string, inferredType: string }> }}
 */
function deriveFields(rows, profile) {
  const out = Array.isArray(rows) ? rows : []
  const addedColumns = []

  // Prefer union of all row keys as column list so we resolve to the exact key used in the data (avoids profile/schema vs row key mismatch)
  const keySet = new Set()
  for (const r of out) {
    if (r && typeof r === 'object') Object.keys(r).filter(Boolean).forEach((k) => keySet.add(k))
  }
  const rowKeys = Array.from(keySet)
  const effectiveProfile = rowKeys.length > 0
    ? { columns: rowKeys.map((name) => ({ name })) }
    : profile?.columns?.length
      ? profile
      : { columns: [] }

  const colNames = (effectiveProfile?.columns || []).map((c) => c?.name).filter(Boolean)
  let qCol = findColumn(effectiveProfile, 'quantity', 'qty', 'qty_ordered', 'units', 'order_quantity', 'quantity_ordered', 'units_sold', 'num_units', 'items')
  let pCol = findColumn(effectiveProfile, 'unit_price', 'price', 'unit_price_amount', 'unit_cost', 'selling_price', 'list_price', 'amount', 'total', 'amt', 'sales')
  let dCol = findColumn(effectiveProfile, 'discount', 'discount_amount')
  const priceKeyCandidates = ['unit_price', 'price', 'unit_price_amount', 'unit_cost', 'selling_price', 'list_price', 'amount', 'total', 'amt']
  if (!pCol && out.length > 0 && typeof out[0] === 'object') {
    const norm = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_')
    const keys = Object.keys(out[0] || {}).filter(Boolean)
    for (const k of keys) {
      const nk = norm(k)
      if (priceKeyCandidates.some((pk) => nk === pk || nk.includes(pk))) {
        const hasNumeric = out.slice(0, 100).some((r) => safeNumber(r[k]) != null)
        if (hasNumeric) {
          pCol = k
          break
        }
      }
    }
  }

  const normKey = (s) => String(s || '').toLowerCase().trim().replace(/\s+/g, '_')
  if (pCol && out.length > 0 && !out.some((r) => safeNumber(r[pCol]) != null)) {
    const first = out[0]
    const pNorm = normKey(pCol)
    const actualKey = Object.keys(first || {}).find((k) => normKey(k) === pNorm)
    if (actualKey) pCol = actualKey
  }
  if (dCol && out.length > 0 && !out.some((r) => safeNumber(r[dCol]) != null)) {
    const first = out[0]
    const dNorm = normKey(dCol)
    const actualKey = Object.keys(first || {}).find((k) => normKey(k) === dNorm)
    if (actualKey) dCol = actualKey
  }

  const hasQuantity = qCol && out.length > 0 && out.some((r) => safeNumber(r[qCol]) != null)
  const hasPrice = pCol && out.length > 0 && out.some((r) => safeNumber(r[pCol]) != null)

  if (process.env.DEBUG_EVIDENCE === '1') {
    console.log('[deriveFields] columns:', colNames, '| qCol:', qCol, 'pCol:', pCol, 'dCol:', dCol, '| hasQ:', hasQuantity, 'hasP:', hasPrice, '| rowsSample:', out.length)
  }

  const revenueCol = 'revenue'
  const grossCol = 'gross'

  if (hasQuantity && hasPrice) {
    for (const r of out) {
      const q = safeNumber(r?.[qCol])
      const p = safeNumber(r?.[pCol])
      if (q != null && p != null) {
        r[grossCol] = q * p
        if (dCol != null) {
          const d = safeNumber(r?.[dCol])
          r[revenueCol] = d != null ? r[grossCol] - d : r[grossCol]
        } else {
          r[revenueCol] = r[grossCol]
        }
      }
    }
    addedColumns.push({ name: grossCol, inferredType: 'number' })
    addedColumns.push({ name: revenueCol, inferredType: 'number' })
  } else if (hasPrice) {
    // No quantity column: treat each row as quantity 1 → revenue = unit_price - discount (or unit_price)
    for (const r of out) {
      const p = safeNumber(r?.[pCol])
      if (p != null) {
        if (dCol != null) {
          const d = safeNumber(r?.[dCol])
          r[revenueCol] = d != null ? p - d : p
        } else {
          r[revenueCol] = p
        }
      }
    }
    addedColumns.push({ name: revenueCol, inferredType: 'number' })
  }

  return { rows: out, addedColumns }
}

module.exports = { deriveFields, findColumn, safeNumber }
