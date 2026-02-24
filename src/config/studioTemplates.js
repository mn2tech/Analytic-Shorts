/**
 * Template registry for AAI Studio UI (dropdown options + descriptions).
 * Must stay in sync with backend/studio-ai/templates/templates.js for templateId values.
 */

export const TEMPLATE_IDS = ['general', 'govcon', 'ecommerce', 'saas']

export const templates = {
  general: { id: 'general', name: 'General', description: 'No template bias; default analysis.', themeId: 'neutral' },
  govcon: {
    id: 'govcon',
    name: 'GovCon Intelligence',
    description: 'SAM opportunities – Executive Intelligence: KPIs, trend, drivers, US map, top states, details.',
    themeId: 'ecommerceLight',
  },
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce Performance',
    description: 'Revenue/orders/products/categories/channels over time.',
    themeId: 'ecommerceLight',
  },
  saas: {
    id: 'saas',
    name: 'SaaS Growth',
    description: 'MRR/ARR growth, churn signals, plan/segment drivers.',
    themeId: 'saasMinimal',
  },
}

export function getTemplate(id) {
  const key = id && templates[id] ? id : 'general'
  return templates[key] || templates.general
}
