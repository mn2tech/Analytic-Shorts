import { detectColumnTypes } from './dataAnalysis'

/**
 * Build a starter dashboard schema from current schema + data.
 * Adds queries, global_filters, and one section with KPI + optional trend + breakdown widgets.
 * @param {Object} schema - Current app schema (with data_source, pages)
 * @param {Array<Object>} data - Sample data rows
 * @returns {Object} Updated schema
 */
export function buildStarterSchema(schema, data) {
  if (!schema || !data || data.length === 0) return schema

  const { numeric, categorical, date } = detectColumnTypes(data)
  const metric = numeric[0]
  const dimension = categorical[0]
  const dateDim = date[0]

  if (!metric) return schema

  const queries = []
  const globalFilters = []
  const filterRefs = {}

  // Time range filter if we have a date column (default to 2024 so sample data is visible)
  if (dateDim) {
    globalFilters.push({
      id: 'time_range',
      type: 'time_range',
      label: 'Date range',
      default: { start: '2024-01-01', end: '2024-12-31' },
      required: false
    })
    filterRefs.time_range = '{{filters.time_range}}'
  }

  // Helper to add a dropdown filter for a dimension if cardinality is reasonable
  const addDropdownForDimension = (dim) => {
    if (!dim || globalFilters.some((f) => f.dimension === dim)) return
    const uniqueCount = new Set(data.map((r) => r[dim]).filter(Boolean)).size
    if (uniqueCount >= 2 && uniqueCount <= 100) {
      const filterId = dim.toLowerCase().replace(/\s+/g, '_')
      globalFilters.push({
        id: filterId,
        type: 'dropdown',
        label: dim,
        source: 'dimension',
        dimension: dim,
        default: 'All',
        required: false,
        multi_select: false
      })
      filterRefs[filterId] = `{{filters.${filterId}}}`
    }
  }

  // Dropdown for first categorical dimension
  if (dimension) addDropdownForDimension(dimension)
  // Also add Product dropdown if the data has a Product column (and not already added)
  const productCol = categorical.find((c) => c.toLowerCase() === 'product')
  if (productCol) addDropdownForDimension(productCol)
  // Add Region dropdown if present and not already added
  const regionCol = categorical.find((c) => c.toLowerCase() === 'region')
  if (regionCol) addDropdownForDimension(regionCol)

  const filterRefsStr = Object.keys(filterRefs).length ? filterRefs : {}

  // Table query (Data tab)
  const tableId = 'table_data_view'
  queries.push({
    id: tableId,
    type: 'table',
    filters: filterRefsStr,
    limit: 500
  })

  // KPI, time series, breakdown (Graph tab)
  const kpiId = `kpi_total_${metric.toLowerCase().replace(/\s+/g, '_')}`
  queries.push({
    id: kpiId,
    type: 'aggregation',
    metric,
    aggregation: 'sum',
    filters: filterRefsStr
  })
  let trendId = null
  if (dateDim) {
    trendId = `trend_${metric.toLowerCase().replace(/\s+/g, '_')}_over_time`
    queries.push({
      id: trendId,
      type: 'time_series',
      metric,
      dimension: dateDim,
      aggregation: 'sum',
      group_by: [dateDim],
      order_by: dateDim,
      filters: filterRefsStr
    })
  }
  let breakdownId = null
  if (dimension) {
    breakdownId = `breakdown_by_${dimension.toLowerCase().replace(/\s+/g, '_')}`
    queries.push({
      id: breakdownId,
      type: 'breakdown',
      metric,
      dimension,
      aggregation: 'sum',
      group_by: [dimension],
      order_by: metric,
      order_direction: 'desc',
      limit: 10,
      filters: filterRefsStr
    })
  }

  const dataTableWidget = {
    id: `widget_${tableId}`,
    type: 'data_table',
    title: 'Data',
    query_ref: tableId,
    config: {},
    format: {}
  }

  const graphWidgets = [
    {
      id: `widget_${kpiId}`,
      type: 'kpi',
      title: `Total ${metric}`,
      query_ref: kpiId,
      format: { type: 'number', decimals: 0 },
      config: {}
    }
  ]
  if (trendId) {
    graphWidgets.push({
      id: `widget_${trendId}`,
      type: 'line_chart',
      title: `${metric} over time`,
      query_ref: trendId,
      config: {
        x_axis: dateDim,
        y_axis: metric,
        show_grid: true,
        show_legend: false,
        curve: 'monotone'
      },
      format: { y_axis: { type: 'number', decimals: 0 } }
    })
  }
  if (breakdownId) {
    graphWidgets.push({
      id: `widget_${breakdownId}`,
      type: 'bar_chart',
      title: `${metric} by ${dimension}`,
      query_ref: breakdownId,
      config: {
        orientation: 'vertical',
        x_axis: dimension,
        y_axis: metric,
        show_grid: true,
        show_legend: false,
        sort: 'desc'
      },
      format: { y_axis: { type: 'number', decimals: 0 } }
    })
  }

  const dataSection = {
    id: 'data-section',
    title: 'Data',
    layout: 'grid',
    columns: 1,
    widgets: [dataTableWidget]
  }

  const graphSection = {
    id: 'graph-section',
    title: 'Graph',
    layout: 'grid',
    columns: 1,
    widgets: graphWidgets
  }

  const updatedSchema = {
    ...schema,
    queries: [...(schema.queries || []), ...queries],
    global_filters: globalFilters.length > 0 ? globalFilters : schema.global_filters || [],
    pages: (schema.pages || []).map((p, i) => {
      if (i === 0) {
        return {
          ...p,
          sections: [dataSection, graphSection]
        }
      }
      return p
    })
  }

  return updatedSchema
}

/**
 * Sync global_filters from schema's data: add time_range, Region, Product, etc. based on data columns.
 * Only adds missing filters; merges filter refs into all queries.
 * @param {Object} schema - Current app schema (with global_filters, queries, data_source)
 * @param {Array<Object>} data - Sample data rows from the schema's data source
 * @returns {{ schema: Object, addedFilterIds: string[] }} Updated schema and list of added filter ids
 */
export function syncFiltersFromSchema(schema, data) {
  if (!schema || !data || !Array.isArray(data) || data.length === 0) {
    return { schema, addedFilterIds: [] }
  }

  let categorical = []
  let date = []
  try {
    const detected = detectColumnTypes(data)
    categorical = detected.categorical || []
    date = detected.date || []
  } catch {
    return { schema, addedFilterIds: [] }
  }
  const existing = schema.global_filters || []
  const existingIds = new Set(existing.map((f) => f.id))
  const addedFilterIds = []
  const newFilters = [...existing]
  const filterRefs = {}
  existing.forEach((f) => {
    if (f.id) filterRefs[f.id] = `{{filters.${f.id}}}`
  })

  const addDropdown = (dim) => {
    if (!dim || existingIds.has(dim.toLowerCase().replace(/\s+/g, '_'))) return
    const filterId = dim.toLowerCase().replace(/\s+/g, '_')
    const uniqueCount = new Set(data.map((r) => r[dim]).filter(Boolean)).size
    if (uniqueCount >= 2 && uniqueCount <= 100) {
      existingIds.add(filterId)
      addedFilterIds.push(filterId)
      newFilters.push({
        id: filterId,
        type: 'dropdown',
        label: dim,
        source: 'dimension',
        dimension: dim,
        default: 'All',
        required: false,
        multi_select: false
      })
      filterRefs[filterId] = `{{filters.${filterId}}}`
    }
  }

  // Time range if date column exists and not already present
  if (date[0] && !existingIds.has('time_range')) {
    newFilters.push({
      id: 'time_range',
      type: 'time_range',
      label: 'Date range',
      default: { start: '2024-01-01', end: '2024-12-31' },
      required: false
    })
    filterRefs.time_range = '{{filters.time_range}}'
    addedFilterIds.push('time_range')
  }

  // Dropdowns: first categorical, then Product, Region, Category
  if (categorical[0]) addDropdown(categorical[0])
  const productCol = categorical.find((c) => c.toLowerCase() === 'product')
  if (productCol) addDropdown(productCol)
  const regionCol = categorical.find((c) => c.toLowerCase() === 'region')
  if (regionCol) addDropdown(regionCol)
  const categoryCol = categorical.find((c) => c.toLowerCase() === 'category')
  if (categoryCol) addDropdown(categoryCol)

  const updatedQueries = (schema.queries || []).map((q) => ({
    ...q,
    filters: { ...filterRefs, ...(q.filters || {}) }
  }))

  const updatedSchema = {
    ...schema,
    global_filters: newFilters,
    queries: updatedQueries
  }

  return { schema: updatedSchema, addedFilterIds }
}
