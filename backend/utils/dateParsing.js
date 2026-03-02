/**
 * Date parsing helpers for SAM.gov and other APIs.
 */
function formatMmDdYyyy(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  return `${mm}/${dd}/${yyyy}`
}

/**
 * Parse flexible date string to milliseconds.
 * Accepts: MM/dd/yyyy, ISO-like YYYY-MM-DD, Date.parse-compatible strings.
 */
function parseFlexibleDateToMs(raw, { endOfDay = false } = {}) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null

  const mmdd = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (mmdd) {
    const mm = Number(mmdd[1])
    const dd = Number(mmdd[2])
    const yyyy = Number(mmdd[3])
    if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) return null
    const ms = Date.UTC(
      yyyy,
      mm - 1,
      dd,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    )
    return Number.isFinite(ms) ? ms : null
  }

  const parsed = Date.parse(s)
  return Number.isNaN(parsed) ? null : parsed
}

module.exports = {
  formatMmDdYyyy,
  parseFlexibleDateToMs,
}
