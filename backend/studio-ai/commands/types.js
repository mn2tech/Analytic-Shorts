/**
 * RunConfigOverrides: deterministic overrides for Studio run configuration.
 * Stored in run state and optionally persisted with the run.
 *
 * @typedef {Object} RunConfigOverrides
 * @property {string} [templateId] - Template id (e.g. 'general', 'govcon')
 * @property {string} [themeId] - Theme id for UI
 * @property {string} [primaryMeasure] - Override primary measure column name
 * @property {string} [timeField] - Override time column name
 * @property {'day'|'week'|'month'} [timeGrain] - Time aggregation grain
 * @property {string[]} [focusDimensions] - Dimension priority (boost these dimensions)
 * @property {Record<string, boolean>} [enabledBlocks] - Block type id -> enabled (e.g. TrendBlock: true)
 * @property {string[]} [blockOrder] - Desired block type order for scene
 * @property {number} [topNLimit] - Default limit for TopN / breakdown blocks
 * @property {string} [breakdownDimension] - Override breakdown/topN dimension column
 * @property {'half'|'last30'|'last90'} [compareMode] - Compare periods mode
 */

const VALID_GRAINS = ['day', 'week', 'month']
const VALID_COMPARE_MODES = ['half', 'last30', 'last90']

/** Block type names used in add/remove commands (alias -> engine block type) */
const BLOCK_ALIAS_TO_TYPE = {
  trend: 'TrendBlock',
  drivers: 'DriverBlock',
  map: 'GeoBlock',
  geomap: 'GeoBlock',
  distribution: 'TopNBlock',
  compare: 'ComparePeriodsBlock',
  quality: 'DataQualityBlock',
  details: 'DetailsTableBlock',
  anomaly: 'AnomalyBlock',
  geolike: 'GeoLikeBlock',
}

function createEmptyOverrides() {
  return {}
}

function validateGrain(v) {
  return typeof v === 'string' && VALID_GRAINS.includes(v.toLowerCase()) ? v.toLowerCase() : null
}

function validateCompareMode(v) {
  const lower = typeof v === 'string' ? v.toLowerCase() : ''
  return VALID_COMPARE_MODES.includes(lower) ? lower : null
}

module.exports = {
  VALID_GRAINS,
  VALID_COMPARE_MODES,
  BLOCK_ALIAS_TO_TYPE,
  createEmptyOverrides,
  validateGrain,
  validateCompareMode,
}
