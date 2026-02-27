/**
 * Format helpers for Studio block views. Use $ for currency measures (revenue, price, amount, etc.).
 */

const CURRENCY_MEASURE_NAMES = [
  'revenue', 'price', 'unit_price', 'unitprice', 'amount', 'sales', 'total', 'amt',
  'unit_cost', 'selling_price', 'list_price', 'gross', 'net_sales', 'gross_sales',
]

export function isCurrencyMeasure(measureName) {
  if (!measureName || typeof measureName !== 'string') return false
  const n = String(measureName).toLowerCase().trim().replace(/\s+/g, '_')
  return CURRENCY_MEASURE_NAMES.some((m) => n === m || n.includes(m))
}

/**
 * Format number for display. Use currency ($) when isCurrency is true.
 * @param {number|null|undefined} v
 * @param {{ currency?: boolean }} [opts]
 */
export function formatNum(v, opts = {}) {
  if (v == null || !Number.isFinite(v)) return '—'
  const n = Number(v)
  const currency = opts.currency === true
  const prefix = currency ? '$' : ''
  if (Math.abs(n) >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${prefix}${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `${prefix}${(n / 1e3).toFixed(2)}K`
  if (currency) return `${prefix}${Math.round(n * 100) / 100}`
  return `${Math.round(n * 100) / 100}`
}

/**
 * Format for chart labels/tooltips (no K/M/B shortening, 2 decimals for currency).
 */
export function formatValueForChart(v, currency = false) {
  if (v == null || !Number.isFinite(v)) return '—'
  const n = Number(v)
  const prefix = currency ? '$' : ''
  return `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
