/**
 * Parse a numeric value, handling currency symbols, commas, and other formatting
 * @param {string|number} value - The value to parse
 * @returns {number} - The parsed number, or 0 if invalid
 */
export function parseNumericValue(value) {
  if (value === null || value === undefined || value === '') {
    return 0
  }
  
  // If already a number, return it
  if (typeof value === 'number') {
    return isNaN(value) || !isFinite(value) ? 0 : value
  }
  
  // Convert to string and clean
  const cleaned = String(value)
    .replace(/[$,\s]/g, '') // Remove $, commas, spaces
    .replace(/[^\d.-]/g, '') // Remove any other non-numeric characters except . and -
  
  const parsed = parseFloat(cleaned)
  
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed
}

