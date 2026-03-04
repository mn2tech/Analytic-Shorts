/**
 * Industry category → NAICS codes mapping.
 * Shared mapping for Federal Entry Report. Used by backend; frontend mirrors via src/config/industryNaicsMap.js
 *
 * OVERRIDE RULES:
 * - Custom NAICS (comma-separated) OVERRIDES industry NAICS when user fills it.
 * - When custom is blank, backend uses industryNaics[] from the selected industry.
 * - "Other" has no default NAICS; user must provide custom NAICS or select another industry.
 *
 * MANUFACTURING "31-33": NAICS sector range; expand to ["31","32","33"] for APIs.
 */
const INDUSTRY_NAICS_MAP = {
  IT_FIRMS: ['541512'],
  CONSTRUCTION: ['236220'],
  STAFFING: ['561320'],
  PROF_SERVICES: ['541611'],
  LOGISTICS: ['488510'],
  JANITORIAL: ['561720'],
  MANUFACTURING: ['31-33'], // sector range; expand to 31, 32, 33 for API calls
  MEDICAL: ['621111', '621999'],
  ENVIRONMENTAL: ['541620'],
  SECURITY: ['561612'],
  // OTHER: no default NAICS
}

/**
 * Expand NAICS list for API use. Handles "31-33" → ["31","32","33"].
 * @param {string[]} naicsList - Raw NAICS codes (may include "31-33")
 * @returns {string[]} Expanded list safe for SAM.gov / USAspending
 */
function expandNaicsForApi(naicsList) {
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
 * Get NAICS for an industry key. Returns [] for OTHER or unknown.
 * @param {string} industryKey - e.g. JANITORIAL, IT_FIRMS
 * @returns {string[]}
 */
function getNaicsForIndustry(industryKey) {
  const key = (industryKey || '').toString().trim().toUpperCase()
  if (!key || key === 'OTHER') return []
  const raw = INDUSTRY_NAICS_MAP[key]
  return Array.isArray(raw) ? expandNaicsForApi([...raw]) : []
}

// Legacy keys for naicsClassifier (business description suggestions)
const legacyMap = {
  it_software: ['541512'],
  construction: ['236220'],
  staffing: ['561320'],
  professional_services: ['541611'],
  logistics: ['488510'],
  janitorial: ['561720'],
  manufacturing: ['31', '32', '33'],
  healthcare: ['621111', '621999'],
  environmental: ['541620'],
  security: ['561612'],
}

module.exports = {
  industryNaicsMap: { ...INDUSTRY_NAICS_MAP, ...legacyMap },
  INDUSTRY_NAICS_MAP,
  expandNaicsForApi,
  getNaicsForIndustry,
}
