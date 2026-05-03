export function formatCompact(num) {
  if (num === null || num === undefined || isNaN(num)) return '—'
  const n = Number(num)
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e12) return sign + '$' + (abs / 1e12).toFixed(1) + 'T'
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(1) + 'B'
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M'
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K'
  return sign + '$' + abs.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '—'
  return Number(num).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}
