/**
 * Template registry for AAI Studio. Used by build to bias primaryMeasure, time grain, dimension scoring.
 * general = no bias (current default behavior).
 */

const templates = {
  general: { id: 'general', name: 'General' },
  govcon: {
    id: 'govcon',
    name: 'GovCon Intelligence',
    description: 'Federal awards, agencies, NAICS, geo, period change.',
    primaryMeasureHints: [
      'obligated_amount',
      'award_amount',
      'base_and_all_options_value',
      'total_obligated_amount',
      'amount',
      'value',
    ],
    timeFieldHints: ['award_date', 'action_date', 'published_date', 'posted_date', 'date'],
    defaultTimeGrain: 'month',
    dimensionPriority: [
      'awarding_agency',
      'funding_agency',
      'agency',
      'sub_agency',
      'naics',
      'naics_code',
      'psc',
      'set_aside',
      'set_aside_type',
      'vendor',
      'recipient',
      'state',
      'place_of_performance_state',
      'city',
    ],
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce Performance',
    description: 'Revenue/orders/products/categories/channels over time.',
    primaryMeasureHints: ['revenue', 'sales', 'gross_sales', 'net_sales', 'amount', 'total'],
    timeFieldHints: ['order_date', 'date', 'created_at', 'purchase_date'],
    defaultTimeGrain: 'day',
    dimensionPriority: [
      'product',
      'sku',
      'category',
      'collection',
      'channel',
      'source',
      'campaign',
      'region',
      'state',
      'country',
    ],
  },
  saas: {
    id: 'saas',
    name: 'SaaS Growth',
    description: 'MRR/ARR growth, churn signals, plan/segment drivers.',
    primaryMeasureHints: ['mrr', 'arr', 'subscription_value', 'recurring_revenue', 'revenue'],
    timeFieldHints: ['month', 'billing_month', 'invoice_month', 'date', 'period_start', 'created_at'],
    defaultTimeGrain: 'month',
    dimensionPriority: [
      'plan',
      'plan_type',
      'tier',
      'segment',
      'account_segment',
      'industry',
      'region',
      'country',
      'cohort',
      'cohort_month',
    ],
  },
}

function getTemplate(id) {
  const key = id && templates[id] ? id : 'general'
  return templates[key] || templates.general
}

module.exports = { templates, getTemplate }
