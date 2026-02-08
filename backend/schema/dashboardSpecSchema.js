/**
 * Canonical DashboardSpec schema — single source of truth for all AI prompts and validation.
 * Used by: POST /api/ai/dashboard-spec (validation + AI system prompt), Studio, AI Visual Builder.
 * To add a new chart/filter type: update this file and the renderer; AI prompt stays in sync.
 */

// --- Allowed values (enforced in validation and AI prompt) ---
const ALLOWED_FILTER_TYPES = ['date_range', 'select', 'number_range']
const ALLOWED_CHART_TYPES = ['line', 'bar', 'pie', 'table', 'kpi', 'area', 'stacked_bar', 'stacked_area', 'grouped_bar', 'radial_bar', 'scatter']
const ALLOWED_AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max']
const ALLOWED_THEMES = ['executive_clean', 'light', 'dark']

// --- Field reference: which spec fields must exist in dataset schema ---
const FILTER_FIELD_KEYS = ['field']
const KPI_FIELD_KEYS = ['field']
const CHART_FIELD_KEYS = ['xField', 'yField', 'dimension', 'metric', 'field', 'stackField', 'detailField']

/**
 * Build the schema block injected into the AI system prompt.
 * Keeps AI output in sync with validation; edit here when extending the spec.
 */
function getSystemPromptSchemaBlock() {
  return `DashboardSpec = {
  "title": "string",
  "filters": [
    { "id": "string", "type": "date_range|select|number_range", "label": "string", "field": "fieldName" }
  ],
  "kpis": [
    { "id": "string", "label": "string", "field": "fieldName", "aggregation": "sum|avg|count|min|max" }
  ],
  "charts": [
    { "id": "string", "type": "line|bar|pie|area|stacked_bar|stacked_area|grouped_bar|radial_bar|scatter|table|kpi", "title": "string", "xField": "fieldName", "yField": "fieldName", or "dimension"/"metric" for bar/pie, "stackField" for stacked_bar/stacked_area/grouped_bar, "detailField" for bar (e.g. Year to show years in tooltip), "field" for table/kpi, "limit": 10, "aggregation": "sum|avg|count" }
  ],
  "layout": [
    { "type": "row", "items": ["filter-bar"] },
    { "type": "row", "items": ["kpi-1", "chart-1"] }
  ],
  "style": { "theme": "executive_clean|light|dark" },
  "warnings": []
}

Rules:
- Use ONLY field names from the dataset schema below. Every field, xField, yField, dimension, metric must exist in the schema.
- Filter types: date_range (date field), select (categorical), number_range (numeric).
- Chart types: line (xField=date, yField=numeric), bar (xField=dimension, yField=metric; optional detailField e.g. Year to show years in tooltip/label), area (same as line), pie (dimension+metric), stacked_bar (xField, stackField=dimension, yField=metric), stacked_area (xField=date, stackField, yField), grouped_bar (same as stacked_bar but bars side-by-side), radial_bar (circular gauge-style bars by dimension), scatter (xField, yField = two numerics), table (columns or limit), kpi (field+aggregation). Include "aggregation" (sum|avg|count) on charts so the UI can show "Sum of Sales" etc.
- If user asks for a date filter but schema has no date field, omit it and add to "warnings": ["No date field in dataset; date filter omitted"].
- Output only the JSON object, no markdown or explanation.`
}

/**
 * Validate spec against canonical schema and dataset fields.
 * Returns { valid: boolean, errors: string[], spec: object } (spec may be normalized in place).
 */
function validate(spec, datasetFields) {
  const errors = []
  const fieldNames = new Set((datasetFields || []).map((f) => f && f.name).filter(Boolean))

  if (!spec || typeof spec !== 'object') {
    return { valid: false, errors: ['Spec must be an object'], spec: null }
  }

  if (typeof spec.title !== 'string') {
    spec.title = spec.title != null ? String(spec.title) : 'Dashboard'
  }

  if (!Array.isArray(spec.filters)) spec.filters = []
  if (!Array.isArray(spec.kpis)) spec.kpis = []
  if (!Array.isArray(spec.charts)) spec.charts = []
  if (!Array.isArray(spec.layout)) spec.layout = []

  for (const f of spec.filters) {
    if (!f.type || !ALLOWED_FILTER_TYPES.includes(f.type)) {
      errors.push(`Filter type must be one of: ${ALLOWED_FILTER_TYPES.join(', ')}`)
    }
    if (f.field && !fieldNames.has(f.field)) {
      errors.push(`Filter field "${f.field}" not in dataset`)
    }
  }

  for (const k of spec.kpis) {
    if (k.field && !fieldNames.has(k.field)) errors.push(`KPI field "${k.field}" not in dataset`)
    if (k.aggregation && !ALLOWED_AGGREGATIONS.includes(k.aggregation)) {
      errors.push(`KPI aggregation must be one of: ${ALLOWED_AGGREGATIONS.join(', ')}`)
    }
  }

  for (const c of spec.charts) {
    if (!c.type || !ALLOWED_CHART_TYPES.includes(c.type)) {
      errors.push(`Chart type must be one of: ${ALLOWED_CHART_TYPES.join(', ')}`)
    }
    for (const key of CHART_FIELD_KEYS) {
      if (c[key] && !fieldNames.has(c[key])) {
        errors.push(`Chart ${key} "${c[key]}" not in dataset`)
      }
    }
  }

  if (spec.style && spec.style.theme && !ALLOWED_THEMES.includes(spec.style.theme)) {
    spec.style.theme = 'executive_clean'
  }

  if (!Array.isArray(spec.warnings)) spec.warnings = []

  return {
    valid: errors.length === 0,
    errors,
    spec
  }
}

module.exports = {
  ALLOWED_FILTER_TYPES,
  ALLOWED_CHART_TYPES,
  ALLOWED_AGGREGATIONS,
  ALLOWED_THEMES,
  FILTER_FIELD_KEYS,
  KPI_FIELD_KEYS,
  CHART_FIELD_KEYS,
  getSystemPromptSchemaBlock,
  validate
}
