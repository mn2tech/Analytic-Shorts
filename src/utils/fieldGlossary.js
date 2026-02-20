/**
 * Plain-language explanations for field/column names.
 * Used for hover tooltips in Advanced dashboard (and elsewhere) so users see e.g. "COG = Course over ground (degrees)".
 * Keys are lowercase; match against column name (case-insensitive).
 */
const GLOSSARY = {
  // Maritime AIS
  cog: 'Course over ground – direction the vessel is moving, in degrees (0–360). 0 = North, 90 = East, 180 = South, 270 = West.',
  sog: 'Speed over ground – vessel speed in knots (nautical miles per hour). Low values (e.g. < 1) can mean anchored or loitering.',
  mmsi: 'Maritime Mobile Service Identity – unique 9-digit ID for each vessel. Used to count messages per ship or top active vessels.',
  lat: 'Latitude – north/south position on the map.',
  lon: 'Longitude – east/west position on the map.',
  latitude: 'Latitude – north/south position on the map.',
  longitude: 'Longitude – east/west position on the map.',
  vessel_type: 'Type of vessel: e.g. Cargo, Tanker, Passenger, Fishing, Pleasure.',
  timestamp: 'Date and time of the AIS message or record.',

  // SAM.gov / Contract opportunities
  basetype: 'Base type – kind of notice: Solicitation (full RFP), Presolicitation (early notice), or Sources Sought (market research).',
  baseType: 'Base type – kind of notice: Solicitation (full RFP), Presolicitation (early notice), or Sources Sought (market research).',
  organization: 'Agency or office that posted the opportunity (e.g. DLA Aviation Philadelphia).',
  postedDate: 'When the opportunity was published on SAM.gov.',
  posted_date: 'When the opportunity was published on SAM.gov.',
  responseDeadLine: 'When responses (e.g. proposals) are due.',
  response_deadline: 'When responses (e.g. proposals) are due.',
  updatedDate: 'Best-available "last updated" date for the notice.',
  setAside: 'Set-aside type – special eligibility (e.g. small business, 8(a), HUBZone).',
  naicsCode: 'NAICS code – industry classification for the type of work (e.g. 541511 = IT).',
  naics_code: 'NAICS code – industry classification for the type of work.',
  classificationCode: 'PSC or classification code for the contract.',
  noticeId: 'Unique ID for the opportunity notice.',
  solicitationNumber: 'Solicitation or notice number.',
  uiLink: 'Link to view the opportunity on SAM.gov.',
  award_amount: 'Award amount in dollars (when the opportunity has award data).',
  opportunity_count: 'Count of opportunities (1 per row when viewing raw data).',

  // Common business / hotel
  adr: 'Average daily rate – average revenue per room per day (hotel).',
  revpar: 'Revenue per available room – total room revenue ÷ available rooms.',
  occupancy_rate: 'Percentage of rooms or capacity that are occupied.',
  sales: 'Sales amount or revenue.',
  revenue: 'Revenue or sales amount.',
  units: 'Quantity or number of units sold.',
}

/**
 * Return a short explanation for a column/field name, or null if none.
 * Use for title attribute (tooltip) when displaying the field name.
 * @param {string} fieldName - Column name (e.g. "cog", "SOG", "Base Type")
 * @returns {string | null}
 */
export function getFieldTooltip(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') return null
  const key = fieldName.trim().toLowerCase()
  if (!key) return null
  return GLOSSARY[key] || GLOSSARY[key.replace(/\s+/g, '')] || null
}

export { GLOSSARY }
