/**
 * Map common agency shorthands to full USAspending toptier agency names.
 * USAspending API requires full agency name in agencies filter, not abbreviations.
 */
const AGENCY_SHORTHAND_TO_FULL = {
  TREASURY: 'Department of the Treasury',
  TREAS: 'Department of the Treasury',
  DOD: 'Department of Defense',
  USDA: 'Department of Agriculture',
  DOC: 'Department of Commerce',
  ED: 'Department of Education',
  DOE: 'Department of Energy',
  HHS: 'Department of Health and Human Services',
  DHS: 'Department of Homeland Security',
  HUD: 'Department of Housing and Urban Development',
  DOI: 'Department of the Interior',
  DOJ: 'Department of Justice',
  DOL: 'Department of Labor',
  DOS: 'Department of State',
  DOT: 'Department of Transportation',
  VA: 'Department of Veterans Affairs',
  EPA: 'Environmental Protection Agency',
  GSA: 'General Services Administration',
  NASA: 'National Aeronautics and Space Administration',
  NSF: 'National Science Foundation',
  OMB: 'Office of Management and Budget',
  SBA: 'Small Business Administration',
  USAID: 'Agency for International Development',
}

function resolveAgencyName(input) {
  const key = (input || '').toString().trim().toUpperCase()
  if (!key) return null
  return AGENCY_SHORTHAND_TO_FULL[key] || input.trim()
}

module.exports = { resolveAgencyName, AGENCY_SHORTHAND_TO_FULL }
