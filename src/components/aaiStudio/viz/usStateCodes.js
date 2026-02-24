/**
 * US state name/code normalization for choropleth.
 * Maps full names and common variants to 2-letter FIPS/ANSI codes (50 states + DC).
 */

const STATE_NAME_TO_CODE = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
}

/** All valid 2-letter state codes (50 + DC). */
export const US_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY',
])

/** 2-letter code -> FIPS (for us-atlas topojson where geography.id is FIPS). */
export const STATE_CODE_TO_FIPS = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10', DC: '11',
  FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19', KS: '20', KY: '21',
  LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30',
  NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39',
  OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47', TX: '48', UT: '49',
  VT: '50', VA: '51', WA: '53', WV: '54', WI: '55', WY: '56',
}

/**
 * Normalize a key (state name or code) to 2-letter code or null if not a US state.
 * @param {string} key - e.g. "California", "CA", "california"
 * @returns {string|null} - "CA" or null
 */
export function normalizeStateKey(key) {
  if (key == null || typeof key !== 'string') return null
  const k = String(key).trim()
  if (!k) return null
  const upper = k.toUpperCase()
  if (k.length === 2 && US_STATE_CODES.has(upper)) return upper
  const lower = k.toLowerCase()
  return STATE_NAME_TO_CODE[lower] || null
}

/**
 * Check if a key looks like a US state (code or name).
 */
export function isUSStateKey(key) {
  return normalizeStateKey(key) != null
}

/**
 * From rows [{ key, value }], aggregate by normalized state code.
 * Keys that don't normalize to a state are skipped.
 * @returns {Array<{ stateCode: string, value: number, label: string }>}
 */
export function aggregateByState(rows, labelByCode = true) {
  const map = new Map()
  for (const r of rows || []) {
    const code = normalizeStateKey(r?.key)
    if (!code) continue
    const val = Number(r?.value) || 0
    const cur = map.get(code) || { stateCode: code, value: 0 }
    cur.value += val
    map.set(code, cur)
  }
  return Array.from(map.values()).map((o) => ({
    ...o,
    label: labelByCode ? o.stateCode : o.stateCode,
  }))
}
