/**
 * Helpers for adding widgets to a dashboard spec when dropping on the report canvas.
 * Picks default fields from dataset schema.
 */

const GRID_COLS = 12
const ROW_HEIGHT = 100
const KPI_DEFAULT_W = 3
const KPI_DEFAULT_H = 1
const CHART_DEFAULT_W = 6
const CHART_DEFAULT_H = 4

function getFields(schema) {
  if (!schema?.fields?.length) return []
  return schema.fields
}

function firstField(schema) {
  const f = getFields(schema)
  return f[0]?.name ?? 'value'
}

function firstDateField(schema) {
  const f = getFields(schema)
  const date = f.find((x) => (x.type || '').toLowerCase() === 'date')
  if (date) return date.name
  const yearLike = f.find((x) => /year|date|month|day/i.test(x.name || ''))
  if (yearLike) return yearLike.name
  return f[0]?.name ?? 'date'
}

function firstNumberField(schema) {
  const f = getFields(schema)
  const num = f.find((x) => (x.type || '').toLowerCase() === 'number')
  if (num) return num.name
  return f[0]?.name ?? 'value'
}

function firstStringField(schema) {
  const f = getFields(schema)
  const str = f.find((x) => (x.type || '').toLowerCase() === 'string')
  if (str) return str.name
  const notNum = f.find((x) => (x.type || '').toLowerCase() !== 'number')
  if (notNum) return notNum.name
  return f[0]?.name ?? 'category'
}

function nextId(prefix, existing) {
  const ids = new Set((existing || []).map((x) => x.id))
  let n = 1
  while (ids.has(`${prefix}-${n}`)) n++
  return `${prefix}-${n}`
}

function ensureSpec(spec) {
  if (spec && typeof spec === 'object') return spec
  return {
    title: 'Untitled Dashboard',
    filters: [],
    kpis: [],
    charts: [],
    layout: [],
    style: { theme: 'light' }
  }
}

function layoutAppendChart(layout, chartId) {
  const maxY = layout.length === 0 ? 0 : Math.max(...layout.map((i) => i.y + i.h))
  const lastRow = layout.filter((i) => i.y + i.h === maxY)
  const rightmost = lastRow.length === 0 ? 0 : Math.max(...lastRow.map((i) => i.x + i.w))
  let x = rightmost
  let y = maxY
  if (x + CHART_DEFAULT_W > GRID_COLS) {
    x = 0
    y += CHART_DEFAULT_H
  }
  return [...layout, { i: chartId, x, y, w: CHART_DEFAULT_W, h: CHART_DEFAULT_H, minW: 2, minH: 2 }]
}

function layoutAppendKpi(layout, kpiId) {
  const kpis = layout.filter((i) => i.w === KPI_DEFAULT_W && i.h === KPI_DEFAULT_H)
  const maxY = layout.length === 0 ? 0 : Math.max(...layout.map((i) => i.y + i.h))
  let x = 0
  let y = maxY
  if (kpis.length > 0) {
    const lastKpi = kpis[kpis.length - 1]
    x = lastKpi.x + lastKpi.w
    y = lastKpi.y
    if (x >= GRID_COLS) {
      x = 0
      y += KPI_DEFAULT_H
    }
  }
  return [...layout, { i: kpiId, x, y, w: KPI_DEFAULT_W, h: KPI_DEFAULT_H, minW: 1, minH: 1 }]
}

/**
 * Add a filter to the spec (for drop payload kind === 'filter').
 */
function addFilterToSpec(spec, schema, payload) {
  spec = ensureSpec(spec)
  const type = payload.filterType || 'select'
  const id = nextId('filter', spec.filters)
  let field = firstStringField(schema)
  if (type === 'date_range') field = firstDateField(schema)
  else if (type === 'number_range') field = firstNumberField(schema)
  const label = type === 'date_range' ? 'Date' : type === 'select' ? 'Category' : type === 'checkbox' ? 'Category' : 'Range'
  const filter = { id, type, label, field }
  return {
    ...spec,
    filters: [...(spec.filters || []), filter]
  }
}

/**
 * Add a chart or KPI to the spec (for drop payload kind === 'chart').
 */
function addChartToSpec(spec, schema, payload) {
  spec = ensureSpec(spec)
  const chartType = payload.chartType || 'bar'
  const dim = firstStringField(schema)
  const num = firstNumberField(schema)
  const date = firstDateField(schema)

  if (chartType === 'kpi') {
    const id = nextId('kpi', spec.kpis)
    const kpi = { id, label: `KPI (${num})`, field: num, aggregation: 'sum' }
    const layout = layoutAppendKpi(spec.layout || [], id)
    return {
      ...spec,
      kpis: [...(spec.kpis || []), kpi],
      layout
    }
  }

  const id = nextId('chart', spec.charts)
  let chart = {
    id,
    type: chartType,
    title: `${chartType} chart`,
    aggregation: 'sum',
    limit: chartType === 'bar' ? 10 : chartType === 'pie' ? 8 : undefined
  }
  if (['line', 'area'].includes(chartType)) {
    chart.xField = date
    chart.yField = num
  } else if (['bar', 'pie', 'radial_bar'].includes(chartType)) {
    chart.dimension = dim
    chart.metric = num
    chart.xField = dim
    chart.yField = num
  } else if (chartType === 'table') {
    chart.columns = getFields(schema).slice(0, 6).map((f) => f.name)
    chart.limit = 50
  } else {
    chart.xField = dim
    chart.yField = num
    chart.dimension = dim
    chart.metric = num
  }
  const layout = layoutAppendChart(spec.layout || [], id)
  return {
    ...spec,
    charts: [...(spec.charts || []), chart],
    layout
  }
}

/**
 * Apply a drop payload to the current spec and return the new spec.
 */
export function applyWidgetDrop(spec, schema, payload) {
  if (!payload || !payload.kind) return spec
  if (payload.kind === 'filter') return addFilterToSpec(spec, schema, payload)
  if (payload.kind === 'chart') return addChartToSpec(spec, schema, payload)
  return spec
}

export { ensureSpec, firstDateField, firstNumberField, firstStringField, nextId }
