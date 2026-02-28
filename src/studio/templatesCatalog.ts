/**
 * Template gallery catalog: single source of truth for Studio template cards.
 * Each entry has an engineTemplateId that maps to the build API (general | govcon | ecommerce | saas).
 */

export type TemplateCategory = 'Starter' | 'Business' | 'Federal' | 'AI' | 'Ops'

export type TemplateCatalogItem = {
  id: string
  name: string
  category: TemplateCategory
  description: string
  recommended: boolean
  engineTemplateId: 'general' | 'govcon' | 'ecommerce' | 'saas'
  previewBullets: string[]
  previewThumbs: string[]
}

export const TEMPLATE_CATEGORIES = ['All', 'Starter', 'Business', 'Federal', 'AI', 'Ops'] as const

export const TEMPLATES_CATALOG: TemplateCatalogItem[] = [
  {
    id: 'general',
    name: 'General',
    category: 'Starter',
    description: 'No template bias; default analysis. Best for exploring any dataset.',
    recommended: true,
    engineTemplateId: 'general',
    previewBullets: [
      'Best for: Any dataset, quick exploration, and custom KPIs.',
      'Charts included: KPIs, trend, breakdowns, drivers, and tables.',
      'Works great with: CSV, Excel, sample data, or API feeds.',
    ],
    previewThumbs: [],
  },
  {
    id: 'sales',
    name: 'Sales',
    category: 'Business',
    description: 'Revenue, orders, and product performance over time.',
    recommended: false,
    engineTemplateId: 'ecommerce',
    previewBullets: [
      'Best for: Sales data, revenue tracking, and product performance.',
      'Charts included: Revenue trend, top products, regional breakdown.',
      'Works great with: Transaction or order-level CSV/Excel.',
    ],
    previewThumbs: [],
  },
  {
    id: 'finance',
    name: 'Finance',
    category: 'Business',
    description: 'Financial metrics, totals, and period-over-period comparison.',
    recommended: false,
    engineTemplateId: 'general',
    previewBullets: [
      'Best for: P&L, budgets, and financial summaries.',
      'Charts included: KPIs, trend, variance, and breakdowns by category.',
      'Works great with: Aggregated financial data or general tabular data.',
    ],
    previewThumbs: [],
  },
  {
    id: 'federal-contracts',
    name: 'Federal Contracts',
    category: 'Federal',
    description: 'SAM.gov opportunities - Executive Intelligence: KPIs, trend, drivers, US map.',
    recommended: true,
    engineTemplateId: 'govcon',
    previewBullets: [
      'Best for: Federal contract opportunities and agency-level rollups.',
      'Charts included: KPIs, trend, drivers, US map, top states, details table.',
      'Works great with: SAM.gov live data or opportunity exports.',
    ],
    previewThumbs: [],
  },
  {
    id: 'govcon',
    name: 'GovCon Intelligence',
    category: 'Federal',
    description: 'Same as Federal Contracts - SAM opportunities with map and top states.',
    recommended: false,
    engineTemplateId: 'govcon',
    previewBullets: [
      'Best for: GovCon and federal opportunity analysis.',
      'Charts included: Map, top states, drivers, trend, and details.',
      'Works great with: SAM.gov live or sas7bdat-sample / sales dataset.',
    ],
    previewThumbs: [],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Performance',
    category: 'Business',
    description: 'Revenue, orders, products, categories, and channels over time.',
    recommended: false,
    engineTemplateId: 'ecommerce',
    previewBullets: [
      'Best for: E-commerce and retail analytics.',
      'Charts included: Revenue trend, category breakdown, top products.',
      'Works great with: Order or product-level data with dates.',
    ],
    previewThumbs: [],
  },
  {
    id: 'saas',
    name: 'SaaS Growth',
    category: 'Business',
    description: 'MRR/ARR growth, churn signals, plan and segment drivers.',
    recommended: false,
    engineTemplateId: 'saas',
    previewBullets: [
      'Best for: Subscription and SaaS metrics.',
      'Charts included: Growth trend, segment breakdown, plan comparison.',
      'Works great with: Subscription or MRR-style datasets.',
    ],
    previewThumbs: [],
  },
  {
    id: 'operations',
    name: 'Operations',
    category: 'Ops',
    description: 'Operational KPIs, throughput, and process metrics.',
    recommended: false,
    engineTemplateId: 'general',
    previewBullets: [
      'Best for: Ops dashboards, throughput, and process metrics.',
      'Charts included: KPIs, trend, and breakdowns by dimension.',
      'Works great with: Logs, events, or aggregated ops data.',
    ],
    previewThumbs: [],
  },
  {
    id: 'anomaly',
    name: 'Anomaly & Insights',
    category: 'AI',
    description: 'AI-assisted insights and anomaly detection on your data.',
    recommended: false,
    engineTemplateId: 'general',
    previewBullets: [
      'Best for: Exploratory analysis and automated insights.',
      'Charts included: KPIs, trend, drivers, and data-quality cues.',
      'Works great with: Any tabular data; AI suggests views.',
    ],
    previewThumbs: [],
  },
]

export function getTemplateById(id?: string | null): TemplateCatalogItem {
  return TEMPLATES_CATALOG.find((t) => t.id === id) || TEMPLATES_CATALOG[0]
}

export function getTemplatesByCategory(category?: string | null): TemplateCatalogItem[] {
  if (!category || category === 'All') return TEMPLATES_CATALOG
  return TEMPLATES_CATALOG.filter((t) => t.category === category)
}

export function filterTemplatesBySearch(templates: TemplateCatalogItem[], query?: string | null): TemplateCatalogItem[] {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return templates
  return templates.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
  )
}

export function getFirstCatalogIdForEngineId(engineTemplateId?: string | null): string {
  const t = TEMPLATES_CATALOG.find((x) => x.engineTemplateId === engineTemplateId)
  return t ? t.id : 'general'
}
