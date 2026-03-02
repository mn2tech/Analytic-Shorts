/**
 * Shared constants for example routes.
 */
const API_REPORTS = [
  { id: 'usaspending-live', name: 'USA Spending (Live)', description: 'Real-time federal government awards, contracts, and grants from USASpending.gov API', endpoint: '/api/example/usaspending/live' },
  { id: 'unemployment-bls', name: 'Unemployment Rate (BLS)', description: 'U.S. unemployment rate data from Bureau of Labor Statistics API', endpoint: '/api/example/unemployment' },
  { id: 'cdc-health', name: 'CDC Health Data', description: 'Health metrics: Death Rate, Birth Rate, and Life Expectancy from CDC (filter by Metric column)', endpoint: '/api/example/cdc-health?metric=all' },
  { id: 'government-budget', name: 'Government Budget', description: 'Federal budget data by category from U.S. Treasury Fiscal Data API (filter by Budget Category)', endpoint: '/api/example/government-budget?category=all' },
  { id: 'samgov-live', name: 'SAM.gov Opportunities (Live)', description: 'Real-time federal contract opportunities from SAM.gov (posted within the last 30 days by default)', endpoint: '/api/example/samgov/live?ptype=o&limit=200' },
  { id: 'samgov-agency-report', name: 'SAM.gov Agency Opportunities Report', description: 'Agency-level rollup of SAM.gov opportunities (count, total/avg award amount, set-asides)', endpoint: '/api/example/samgov/agency-report?ptype=o&limit=500' },
  { id: 'samgov-databank', name: 'SAM.gov Entity Data Bank (Live)', description: 'Live SAM.gov entity registration records (UEI, status, NAICS, location)', endpoint: '/api/example/samgov/databank?size=10' },
  { id: 'maritime-ais', name: 'Maritime AIS Demo', description: 'Mock AIS vessel data: timestamp, MMSI, lat/lon, speed (sog), course (cog), vessel type. Use for traffic, top vessels, loitering (sog < 1).', endpoint: '/api/datasets/maritime-ais' },
]

const HIDEABLE_ENDPOINTS = {
  '/usaspending/live': 'usaspending-live',
  '/unemployment': 'unemployment-bls',
  '/cdc-health': 'cdc-health',
  '/government-budget': 'government-budget',
  '/samgov/live': 'samgov-live',
  '/samgov/agency-report': 'samgov-agency-report',
  '/samgov/databank': 'samgov-databank',
}

const API_REPORT_VISIBILITY_TABLE = 'shorts_api_report_visibility'

const SAMGOV_CACHE_TTL_MS = 5 * 60 * 1000
const BLS_CDC_CACHE_TTL_MS = 5 * 60 * 1000

const AXIOS_TIMEOUT_MS = 30000

/** Categorical columns that must never be summed (IDs, codes). */
const FORCE_CATEGORICAL_SAMGOV = new Set(['naicsCode', 'solicitationNumber', 'classificationCode', 'setAside', 'noticeId'])
const FORCE_CATEGORICAL_SAMGOV_ENTITY = new Set(['ueiSAM', 'cageCode', 'naicsCode'])

module.exports = {
  API_REPORTS,
  HIDEABLE_ENDPOINTS,
  API_REPORT_VISIBILITY_TABLE,
  SAMGOV_CACHE_TTL_MS,
  BLS_CDC_CACHE_TTL_MS,
  AXIOS_TIMEOUT_MS,
  FORCE_CATEGORICAL_SAMGOV,
  FORCE_CATEGORICAL_SAMGOV_ENTITY,
}
