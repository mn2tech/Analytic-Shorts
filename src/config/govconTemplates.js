/**
 * GovCon 4-pack template registry.
 * Each widget stores endpoint + defaultParams (as JSON).
 * Endpoints are called via GET with query params.
 */

export const GOVCON_4PACK_TEMPLATE_ID = 'govcon-4pack'

export const GOVCON_4PACK_WIDGETS = [
  {
    id: 'opportunities-feed',
    title: 'Opportunities Feed',
    endpoint: '/api/example/samgov/live',
    defaultParams: { ptype: 'o', limit: 1000 },
    description: 'SAM.gov contract opportunities (live)',
  },
  {
    id: 'agency-rollup',
    title: 'Agency Rollup',
    endpoint: '/api/example/samgov/agency-report',
    defaultParams: { ptype: 'o', limit: 500 },
    description: 'Agency-level rollup of SAM.gov opportunities',
  },
  {
    id: 'spend-over-time',
    title: 'Spend Over Time',
    endpoint: '/api/example/proxy/usaspending/spending-over-time',
    defaultParams: { agency: 'TREASURY', fy: '2024,2025' },
    description: 'USAspending obligations by fiscal year',
  },
  {
    id: 'recent-awards',
    title: 'Recent Awards',
    endpoint: '/api/example/usaspending/live',
    defaultParams: { limit: 100 },
    description: 'Recent federal awards from USAspending.gov',
  },
]

export function getGovcon4PackWidgets() {
  return GOVCON_4PACK_WIDGETS
}

export function getGovcon4PackWidget(widgetId) {
  return GOVCON_4PACK_WIDGETS.find((w) => w.id === widgetId) || null
}
