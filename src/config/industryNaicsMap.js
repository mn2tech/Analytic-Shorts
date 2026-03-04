/**
 * Industry category → NAICS codes mapping (frontend mirror of backend/govcon/industryNaicsMap.js).
 * Used by Federal Entry Report form for dropdown → industryNaics derivation.
 *
 * OVERRIDE RULES:
 * - Custom NAICS input OVERRIDES industry NAICS when user fills it.
 * - When custom is blank, backend request uses industryNaics[] from the selected industry.
 */
export const INDUSTRY_NAICS_MAP = {
  IT_FIRMS: ['541512'],
  CONSTRUCTION: ['236220'],
  STAFFING: ['561320'],
  PROF_SERVICES: ['541611'],
  LOGISTICS: ['488510'],
  JANITORIAL: ['561720'],
  MANUFACTURING: ['31-33'], // sector range; expand for display/API
  MEDICAL: ['621111', '621999'],
  ENVIRONMENTAL: ['541620'],
  SECURITY: ['561612'],
}

/**
 * Expand "31-33" style range to ["31","32","33"] for resolved NAICS display.
 * @param {string[]} naicsList
 * @returns {string[]}
 */
export function expandNaicsDisplay(naicsList) {
  if (!Array.isArray(naicsList)) return []
  const result = []
  for (const n of naicsList) {
    const s = String(n || '').trim()
    if (!s) continue
    const rangeMatch = s.match(/^(\d+)-(\d+)$/)
    if (rangeMatch) {
      const low = parseInt(rangeMatch[1], 10)
      const high = parseInt(rangeMatch[2], 10)
      if (Number.isFinite(low) && Number.isFinite(high) && low <= high) {
        for (let i = low; i <= high; i++) result.push(String(i))
        continue
      }
    }
    result.push(s)
  }
  return result
}

/**
 * Get NAICS for industryKey. Returns [] for OTHER or unknown.
 * @param {string} industryKey
 * @returns {string[]}
 */
export function getIndustryNaics(industryKey) {
  const key = (industryKey || '').toString().trim().toUpperCase()
  if (!key || key === 'OTHER') return []
  const raw = INDUSTRY_NAICS_MAP[key]
  if (!Array.isArray(raw)) return []
  return expandNaicsDisplay(raw)
}
