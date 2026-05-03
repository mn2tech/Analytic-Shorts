/**
 * Renders a DashboardSpec with filters, KPIs, and charts.
 * Uses row-based layout and Recharts. Handles empty results gracefully.
 * Date range filters use a dual-thumb date slider.
 */

import { useMemo, useState, useEffect, useCallback, useRef, memo } from 'react'
import GridLayout from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  LabelList
} from 'recharts'
import { parseNumericValue } from '../../utils/numberUtils'
import { formatCompact } from '../../utils/formatNumber'

const MANUAL_CHART_LAYOUT_STORAGE_KEY = 'nm2_dashboard_renderer_manual_chart_layout_v1'

/** Dark chrome for Custom dashboard chart/KPI tiles */
const DARK_CARD_STYLE = {
  background: '#1e293b',
  border: '0.5px solid #334155',
  borderRadius: '12px'
}
const DARK_CHART_TITLE = '#f8fafc'
const DARK_CHART_SUBTITLE = '#64748b'
const DARK_DATA_LABEL_FILL = '#64748b'

const KPI_GRID_WRAPPER_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '12px',
  width: '100%'
}
const CHART_GRID_WRAPPER_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '16px',
  width: '100%',
  minWidth: 0
}
const CHART_GRID_OUTER_STYLE = {
  contain: 'layout',
  width: '100%',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
}

function dataColumnKeys(data) {
  if (!data?.length) return []
  return Object.keys(data[0] || {}).filter(Boolean)
}

/** Default KPI row definitions when spec has no kpis — avoids summing IDs, dates, etc. */
function getDefaultKPIs(data, columns) {
  if (!data?.length || !columns?.length) return []

  const finalCols = getOrderedBusinessNumericColumns(data, columns)

  const kpis = []
  kpis.push({ label: 'Total Records', value: data.length.toLocaleString(), raw: data.length })

  finalCols.slice(0, 2).forEach((col) => {
    const key = resolveFieldName(data[0], col) || col
    const total = data.reduce((sum, row) => sum + parseNumericValue(row[key]), 0)
    kpis.push({ label: `Total ${col}`, value: formatCompact(total), raw: total })
  })

  const topProduct = getTopProduct(data, columns)
  if (topProduct && topProduct !== '—') {
    kpis.push({ label: 'Top Product', value: topProduct, raw: topProduct })
  }

  const topChannel = getTopChannel(data, columns)
  if (topChannel && topChannel !== '—') {
    kpis.push({ label: 'Best Channel', value: topChannel, raw: topChannel })
  }

  return kpis
}

function defaultKpiCardSlug(label, index) {
  const slug = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return slug || `kpi-${index}`
}

function formatKPIValue(value, label) {
  if (value === null || value === undefined) return '—'

  if (typeof value === 'string' && Number.isNaN(Number(value.trim()))) return value

  const num = Number(typeof value === 'string' ? value.replace(/[$,]/g, '') : value)
  if (Number.isNaN(num)) return String(value)

  const labelLower = (label || '').toLowerCase()

  if (
    labelLower.includes('count') ||
    labelLower.includes('number') ||
    labelLower.includes('orders') ||
    labelLower.includes('records') ||
    labelLower.includes('quantity') ||
    labelLower.includes('rank') ||
    labelLower.includes('column')
  ) {
    return Math.round(num).toLocaleString()
  }

  if (
    labelLower.includes('product') ||
    labelLower.includes('channel') ||
    labelLower.includes('category') ||
    labelLower.includes('name') ||
    labelLower.includes('status') ||
    labelLower.includes('type')
  ) {
    if (!Number.isNaN(num) && num > 100) return formatCompact(num)
    return String(value)
  }

  return formatCompact(num)
}

function getTopProduct(data, columns) {
  if (!data?.length || !columns?.length) return '—'
  const productCol = columns.find((col) => {
    const l = String(col).toLowerCase()
    return l.includes('product') || l.includes('title') || l.includes('sku') || (l.includes('name') && !l.includes('customer'))
  })
  const valueCol = columns.find((col) => {
    const l = String(col).toLowerCase()
    return (
      l.includes('subtotal') ||
      l.includes('revenue') ||
      l.includes('total') ||
      l.includes('amount') ||
      l.includes('sales')
    )
  })

  const firstRow = data[0]
  const pk = productCol ? (resolveFieldName(firstRow, productCol) || productCol) : null
  const vk = valueCol ? (resolveFieldName(firstRow, valueCol) || valueCol) : null
  if (!pk || !vk) return '—'

  const grouped = {}
  for (const row of data) {
    const key = row[pk]
    if (key == null || key === '') continue
    grouped[key] = (grouped[key] || 0) + (parseNumericValue(row[vk]) ?? 0)
  }
  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1])
  return sorted.length > 0 ? String(sorted[0][0]) : '—'
}

function getTopChannel(data, columns) {
  if (!data?.length || !columns?.length) return '—'
  const channelCol = columns.find((col) => {
    const l = String(col).toLowerCase()
    return l.includes('channel') || l.includes('source') || l.includes('medium')
  })
  const valueCol = columns.find((col) => {
    const l = String(col).toLowerCase()
    return l.includes('subtotal') || l.includes('revenue') || l.includes('total') || l.includes('amount')
  })

  const firstRow = data[0]
  const ck = channelCol ? (resolveFieldName(firstRow, channelCol) || channelCol) : null
  const vk = valueCol ? (resolveFieldName(firstRow, valueCol) || valueCol) : null
  if (!ck || !vk) return '—'

  const grouped = {}
  for (const row of data) {
    const key = row[ck]
    if (key == null || key === '') continue
    grouped[key] = (grouped[key] || 0) + (parseNumericValue(row[vk]) ?? 0)
  }
  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1])
  return sorted.length > 0 ? String(sorted[0][0]) : '—'
}

/** Client-only summary copy for Summary tab (no API). */
function getSummaryText(data, columns, _spec) {
  if (!data || data.length === 0) return 'Upload data to see your summary.'

  const numericColsOrdered = getOrderedBusinessNumericColumns(data, columns || [])
  const numericSet = new Set(numericColsOrdered)
  const catCols = (columns || []).filter((col) => !numericSet.has(col))

  const firstRow = data[0]
  const topNumCol = numericColsOrdered[0]
  const numKeyForTotal =
    topNumCol && firstRow ? resolveFieldName(firstRow, topNumCol) || topNumCol : null
  const total = numKeyForTotal
    ? data.reduce((sum, row) => sum + parseNumericValue(row[numKeyForTotal]), 0)
    : 0

  const topCatCol = catCols.find((col) => {
    const l = String(col).toLowerCase()
    return l.includes('product') || l.includes('channel') || l.includes('category') || (l.includes('name') && !l.includes('customer'))
  })

  let topCatValue = ''
  if (topCatCol && topNumCol && data.length > 0 && firstRow) {
    const catKey = resolveFieldName(firstRow, topCatCol) || topCatCol
    const numKey = resolveFieldName(firstRow, topNumCol) || topNumCol
    const grouped = {}
    for (const row of data) {
      const key = row[catKey]
      if (key == null || key === '') continue
      grouped[key] = (grouped[key] || 0) + (parseNumericValue(row[numKey]) ?? 0)
    }
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1])
    if (sorted.length > 0 && sorted[0][0] != null && String(sorted[0][0]).trim() !== '') {
      topCatValue = String(sorted[0][0])
    }
  }

  const parts = [`Your dataset has ${data.length} records across ${(columns || []).length} columns.`]

  if (topNumCol && total !== 0) {
    parts.push(`Total ${topNumCol}: ${formatCompact(total)}.`)
  }

  if (topCatValue) {
    parts.push(`Top performer: ${topCatValue}.`)
  }

  return parts.join(' ')
}

function specKpiLabelImpliesTopProduct(label) {
  const l = String(label || '').toLowerCase()
  return (
    /\btop\b.*\bproduct\b/.test(l) ||
    /\bbest\b.*\bproduct\b/.test(l) ||
    /\btop\s*performing\s*product\b/.test(l)
  )
}

function specKpiLabelImpliesTopChannel(label) {
  const l = String(label || '').toLowerCase()
  return (
    /\bbest\b.*\b(channel|sale)\b/.test(l) ||
    /\btop\b.*\bchannel\b/.test(l) ||
    /\bbest\s*sales\s*channel\b/.test(l)
  )
}

// Theme-based chart colors (grid, axis, tooltip)
function getChartTheme(theme) {
  const isDark = theme === 'dark'
  const isExec = theme === 'executive'
  return {
    gridStroke: isDark ? '#374151' : isExec ? '#cbd5e1' : '#e5e7eb',
    tickFill: isDark ? '#9ca3af' : '#6b7280',
    tooltipBg: isDark ? '#1f2937' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    tooltipText: isDark ? '#e5e7eb' : '#374151'
  }
}

const GRID_COLS = 12
/** Row height & margin match react-grid-layout chart grid props (explicit width via ResizeObserver). */
const CHART_GRID_ROW_HEIGHT = 40
const CHART_GRID_MARGIN = [12, 12]

function generateLayoutFromCharts(charts) {
  if (!charts || charts.length === 0) return []

  const cols = GRID_COLS
  const layouts = []

  charts.forEach((chart, i) => {
    const isWide =
      chart.type === 'bar' ||
      chart.type === 'line' ||
      chart.type === 'area' ||
      chart.fullWidth === true
    const isTall = chart.type === 'map'

    const w = isWide || charts.length === 1 ? cols : cols / 2
    const h = isTall ? 14 : 10

    let x = 0
    let y = 0

    if (w === cols) {
      const prevFullWidths = layouts.filter((l) => l.w === cols)
      y = prevFullWidths.reduce((sum, l) => sum + l.h, 0)
    } else {
      const prevRows = layouts.filter((l) => l.w < cols)
      const rowsAbove = Math.floor(prevRows.length / 2)
      y = rowsAbove * 10
      const isRight = i % 2 === 1
      x = isRight ? cols / 2 : 0
    }

    const id = chart.id != null ? String(chart.id) : `chart-${i}`
    layouts.push({
      i: id,
      x,
      y,
      w,
      h,
      minW: 3,
      minH: 6
    })
  })

  return layouts
}

const KPI_DEFAULT_W = 3
const KPI_DEFAULT_H = 1
function buildDefaultLayout({ kpis = [], charts = [] }) {
  const layout = []
  let y = 0
  let x = 0
  kpis.forEach((k) => {
    layout.push({ i: k.id, x: x % GRID_COLS, y, w: KPI_DEFAULT_W, h: KPI_DEFAULT_H, minW: 1, minH: 1 })
    x += KPI_DEFAULT_W
    if (x >= GRID_COLS) {
      x = 0
      y += KPI_DEFAULT_H
    }
  })
  if (kpis.length > 0) y += KPI_DEFAULT_H
  const chartItems = generateLayoutFromCharts(charts)
  chartItems.forEach((item) => {
    layout.push({ ...item, y: item.y + y })
  })
  return layout
}

function isGridLayout(layout) {
  return Array.isArray(layout) && layout.length > 0 && layout.every((item) => item && typeof item.i === 'string' && typeof item.x === 'number' && typeof item.y === 'number' && typeof item.w === 'number' && typeof item.h === 'number')
}

/** True when saved react-grid-layout cells include every KPI and chart id (So persisted drag sizes survive reload). */
function gridLayoutCoversWidgets(layoutFromSpec, kpis, charts) {
  if (!isGridLayout(layoutFromSpec)) return false
  const ids = new Set(layoutFromSpec.map((l) => String(l.i)))
  if ((charts || []).some((c) => c?.id != null && !ids.has(String(c.id)))) return false
  if ((kpis || []).some((k) => k?.id != null && !ids.has(String(k.id)))) return false
  return true
}

function stringifyLayoutSlots(layout) {
  if (!Array.isArray(layout)) return ''
  try {
    return JSON.stringify(layout.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })))
  } catch {
    return ''
  }
}

function getSpecSliceForLayout(spec, tabs, safeTabIndex) {
  if (!spec) return { layoutFromSpec: [], kpis: [], charts: [] }
  const t = tabs && tabs[safeTabIndex] ? tabs[safeTabIndex] : null
  return {
    layoutFromSpec: t ? (t.layout ?? []) : (spec.layout ?? []),
    kpis: t ? (t.kpis ?? []) : (spec.kpis ?? []),
    charts: t ? (t.charts ?? []) : (spec.charts ?? []),
  }
}

/** Matches requested formula (h × 52) − chrome; clamps so charts stay readable. */
function chartPlotHeightFromGrid(h) {
  if (h == null || !Number.isFinite(h)) return 380
  return Math.max(260, h * 52 - 80)
}

function ChartPlotFrame({ plotHeight, hasData, children }) {
  return (
    <div style={{ height: plotHeight, width: '100%', minHeight: 180 }} className="min-w-0 min-h-0">
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
      )}
    </div>
  )
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']
const CHART_COLORS_MINIMAL = ['#4b5563', '#6b7280', '#9ca3af', '#374151', '#6b7280', '#9ca3af', '#4b5563', '#6b7280']
const CHART_COLORS_PASTEL = ['#93c5fd', '#c4b5fd', '#f9a8d4', '#fcd34d', '#6ee7b7', '#fca5a5', '#a5b4fc', '#67e8f9']

// Color helpers (for SAS VA-like subtle bevel)
function clamp01(n) { return Math.max(0, Math.min(1, n)) }
function hexToRgb(hex) {
  const h = String(hex || '').trim()
  const m = h.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  const raw = m[1]
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return { r, g, b }
}
function rgbToHex({ r, g, b }) {
  const to = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
function mixHex(a, b, t) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  if (!A || !B) return a
  const tt = clamp01(t)
  return rgbToHex({
    r: A.r + (B.r - A.r) * tt,
    g: A.g + (B.g - A.g) * tt,
    b: A.b + (B.b - A.b) * tt
  })
}

// Sheen/gloss gradient for bars: NM2 Sheen (our own look)
function BarSheenGradient({ id, baseColor = CHART_COLORS[0] }) {
  // NM2 sheen: gentle depth + a soft diagonal highlight band.
  const top = mixHex(baseColor, '#ffffff', 0.14)
  const mid = baseColor
  const bottom = mixHex(baseColor, '#000000', 0.16)
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      {/* NOTE: stops must be in ascending offset order */}
      <stop offset="0%" stopColor={top} stopOpacity={1} />
      <stop offset="22%" stopColor={top} stopOpacity={1} />
      <stop offset="32%" stopColor="#ffffff" stopOpacity={0.10} />
      <stop offset="42%" stopColor={mid} stopOpacity={1} />
      <stop offset="55%" stopColor={mid} stopOpacity={1} />
      <stop offset="100%" stopColor={bottom} stopOpacity={1} />
    </linearGradient>
  )
}

function BarSheenShadowFilter({ id }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="160%">
      {/* NM2 shadow: very subtle lift */}
      <feDropShadow dx="0" dy="0.8" stdDeviation="1.05" floodColor="#000000" floodOpacity="0.14" />
    </filter>
  )
}

function toCornerRadius(radius) {
  if (Array.isArray(radius)) {
    const r = radius.filter((n) => typeof n === 'number' && Number.isFinite(n))
    return r.length ? Math.max(0, Math.min(...r)) : 0
  }
  return typeof radius === 'number' && Number.isFinite(radius) ? Math.max(0, radius) : 0
}

function SheenBarShape(props) {
  const {
    x,
    y,
    width,
    height,
    fill,
    baseColor,
    radius,
    onClick,
    onMouseEnter,
    onMouseLeave,
    cursor
  } = props

  const w = Math.max(0, width)
  const h = Math.max(0, height)
  if (!w || !h) return null

  const r = Math.min(toCornerRadius(radius), Math.min(w, h) / 2)
  // `fill` is often a url(#...) when using gradients; use baseColor for stroke math.
  const stroke = mixHex(baseColor || '#111827', '#000000', 0.26)
  const inset = Math.min(1.2, Math.min(w, h) / 10)
  const hiH = Math.max(2, Math.min(9, h * 0.28))

  return (
    <g onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} style={{ cursor }}>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill={fill}
        filter="url(#nm2-bar-sheen-shadow)"
        stroke={stroke}
        strokeOpacity={0.45}
        strokeWidth={1}
      />
      {/* subtle top lift (matte highlight) */}
      <rect
        x={x + inset}
        y={y + inset}
        width={Math.max(0, w - inset * 2)}
        height={Math.max(0, hiH - inset)}
        rx={Math.max(0, r - 1)}
        ry={Math.max(0, r - 1)}
        fill="rgba(255,255,255,0.06)"
        pointerEvents="none"
      />
    </g>
  )
}

// Vertical gradient for bars (no sheen streak)
function BarVerticalGradient({ id, baseColor = CHART_COLORS[0] }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
      <stop offset="100%" stopColor={baseColor} stopOpacity={0.75} />
    </linearGradient>
  )
}

const BAR_STYLE_OPTIONS = [
  { value: 'sheen', label: 'Sheen' },
  { value: 'flat', label: 'Flat' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'outline', label: 'Outline' },
  { value: 'gradient', label: 'Gradient' }
]

// Resolve actual data column name (spec may use "week" but data has "Week")
function resolveFieldName(row, fieldName) {
  if (!row || fieldName == null) return fieldName
  if (Object.prototype.hasOwnProperty.call(row, fieldName)) return fieldName
  const lower = String(fieldName).toLowerCase()
  const key = Object.keys(row).find((k) => k.toLowerCase() === lower)
  return key ?? fieldName
}

/** Exclude ID-ish / PII-ish columns from KPIs & Summary totals (normalized header match). */
function isExcludedMetricColumn(col) {
  const normalized = String(col ?? '')
    .toLowerCase()
    .replace(/[\s_-]/g, '')
  const excludeList = [
    'id',
    'orderid',
    'orderno',
    'ordernumber',
    'date',
    'time',
    'timestamp',
    'createdat',
    'updatedat',
    'email',
    'phone',
    'address',
    'zip',
    'postal',
    'sku',
    'code',
    'key',
    'customeremail',
    'customername',
    'firstname',
    'lastname',
    'city',
    'state',
    'country',
    'street',
    'name'
  ]
  return excludeList.some((p) => normalized === p || normalized.endsWith(p) || normalized.startsWith(p))
}

/** Heuristic: sequential-looking large integers (Order IDs). */
function looksLikeIdColumn(data, col) {
  if (!data?.length || col == null || col === '') return false
  const key = resolveFieldName(data[0], col) || col
  const vals = data
    .slice(0, 10)
    .map((row) => Number(row[key]))
    .filter((v) => !Number.isNaN(v))
  if (vals.length === 0) return false
  const allIntegers = vals.every((v) => Number.isInteger(v))
  const allLarge = vals.every((v) => v > 999)
  const hasSmallRange = Math.max(...vals) - Math.min(...vals) < vals.length * 2
  return allIntegers && allLarge && hasSmallRange
}

/** Sample-based numeric detection for money/count columns (drops IDs > 1e6 in sample). */
function qualifiesNumericBusinessSample(data, col) {
  if (!data?.length || col == null || col === '') return false
  const key = resolveFieldName(data[0], col) || col
  const sample = data.slice(0, 20)
  if (sample.length === 0) return false
  const numericCount = sample.filter((row) => {
    const val = row[key]
    if (val === '' || val === null || val === undefined) return false
    const num = Number(String(val).replace(/[$,]/g, ''))
    if (Number.isNaN(num)) return false
    return num < 1_000_000
  }).length
  return numericCount > sample.length * 0.7
}

const BUSINESS_METRIC_PRIORITY_PATTERNS = [
  'subtotal',
  'total',
  'revenue',
  'amount',
  'sales',
  'price',
  'cost',
  'profit',
  'quantity',
  'count',
  'orders'
]

/** Ordered numeric business columns (priority metrics first) for KPI defaults + Summary sentence. */
function getOrderedBusinessNumericColumns(data, columns) {
  if (!data?.length || !columns?.length) return []
  const candidates = columns.filter(
    (col) =>
      !isExcludedMetricColumn(col) && !looksLikeIdColumn(data, col) && qualifiesNumericBusinessSample(data, col)
  )
  const priority = candidates.filter((col) =>
    BUSINESS_METRIC_PRIORITY_PATTERNS.some((p) => String(col).toLowerCase().includes(p))
  )
  const rest = candidates.filter((c) => !priority.includes(c))
  return [...priority, ...rest]
}

// Coerce a value to a timestamp; if it looks like a year (1900-2100), use Jan 1 of that year
function valueToTimestamp(val) {
  if (val == null || val === '') return NaN
  const num = Number(val)
  if (!Number.isNaN(num) && num >= 1900 && num <= 2100 && num % 1 === 0) {
    return new Date(num, 0, 1).getTime()
  }
  return new Date(val).getTime()
}

// Apply filter values to data
function applyFilters(data, filters, filterValues) {
  if (!data || !Array.isArray(data)) return []
  let out = [...data]
  const firstRow = out[0]
  for (const f of filters || []) {
    const value = filterValues[f.id]
    if (value === undefined || value === null || value === '') continue
    if (f.type === 'date_range' && typeof value === 'object' && value.start && value.end) {
      const start = new Date(value.start).getTime()
      const end = new Date(value.end).getTime()
      const dateField = resolveFieldName(firstRow, f.field) || f.field
      out = out.filter((row) => {
        const v = row[dateField]
        if (v == null) return false
        const t = valueToTimestamp(v)
        return !Number.isNaN(t) && t >= start && t <= end
      })
    } else if (f.type === 'select') {
      if (value === 'All') continue
      const field = resolveFieldName(firstRow, f.field) || f.field
      out = out.filter((row) => String(row[field]) === String(value))
    } else if (f.type === 'checkbox' && Array.isArray(value) && value.length > 0) {
      const field = resolveFieldName(firstRow, f.field) || f.field
      const set = new Set(value.map((v) => String(v)))
      out = out.filter((row) => set.has(String(row[field] ?? '')))
    } else if (f.type === 'number_range' && typeof value === 'object' && value.min != null && value.max != null) {
      const field = resolveFieldName(firstRow, f.field) || f.field
      out = out.filter((row) => {
        const n = parseNumericValue(row[field])
        return n >= value.min && n <= value.max
      })
    }
  }
  return out
}

// Apply chart-click filter (cross-filter: one click filters entire dashboard)
function applyChartFilter(data, chartFilter, firstRow) {
  if (!data || !Array.isArray(data) || !chartFilter?.field) return data
  const field = resolveFieldName(firstRow || data[0], chartFilter.field) || chartFilter.field
  return data.filter((row) => String(row[field]) === String(chartFilter.value))
}

// Aggregate for KPI
function aggregate(data, field, agg) {
  if (!data || data.length === 0) return null
  const values = data.map((r) => parseNumericValue(r[field]))
  if (agg === 'sum') return values.reduce((a, b) => a + b, 0)
  if (agg === 'avg') return values.reduce((a, b) => a + b, 0) / values.length
  if (agg === 'count') return data.length
  if (agg === 'min') return Math.min(...values)
  if (agg === 'max') return Math.max(...values)
  return values.reduce((a, b) => a + b, 0) / values.length
}

function aggValue(rec, aggregation) {
  if (aggregation === 'count') return rec.count
  if (aggregation === 'avg') return rec.count ? rec.sum / rec.count : 0
  if (aggregation === 'min') return rec.min === Infinity ? 0 : rec.min
  if (aggregation === 'max') return rec.max === -Infinity ? 0 : rec.max
  return rec.sum
}

/** Aggregated table for spec `type === 'table'`: dimension(s) × metric + share (% of displayed total). */
function renderTableChart(chart, data, columns) {
  const rowsData = Array.isArray(data) ? data : []
  const firstRow = rowsData[0]
  const colList =
    columns && columns.length ? columns : firstRow ? Object.keys(firstRow) : []

  if (!firstRow || colList.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-base" style={{ color: '#64748b' }}>
        No data
      </div>
    )
  }

  const specGroupFields = [
    chart?.xField,
    chart?.dimension,
    chart?.category,
    chart?.groupBy,
    chart?.secondaryDimension,
    chart?.stackField,
    chart?.seriesField,
    chart?.segmentField,
    chart?.breakdownField,
    chart?.groupField,
  ].filter(Boolean)

  let groupResolved = []
  const seenLogical = new Set()
  for (const logical of specGroupFields) {
    const s = String(logical)
    if (seenLogical.has(s)) continue
    seenLogical.add(s)
    const key = resolveFieldName(firstRow, logical) || logical
    groupResolved.push({ logical: s, key })
  }

  const pushDim = (logical) => {
    if (logical == null || logical === '') return
    const k = resolveFieldName(firstRow, logical) || logical
    if (!groupResolved.some((g) => g.key === k)) {
      groupResolved.push({ logical: String(logical), key: k })
    }
  }

  const productCol = colList.find((col) => {
    const l = String(col).toLowerCase()
    return l.includes('product') || l.includes('title')
  })
  const channelCol = colList.find((col) => {
    const l = String(col).toLowerCase()
    return l.includes('channel') || l.includes('source')
  })
  pushDim(productCol)
  pushDim(channelCol)

  const valueLogical =
    chart?.yField ||
    chart?.metric ||
    chart?.field ||
    colList.find((col) => {
      const n = String(col).toLowerCase()
      return (
        n.includes('subtotal') ||
        n.includes('revenue') ||
        n.includes('total') ||
        n.includes('amount')
      )
    }) ||
    getOrderedBusinessNumericColumns(rowsData, colList)[0] ||
    null

  const valueKey = valueLogical ? resolveFieldName(firstRow, valueLogical) || valueLogical : null

  const groupHeader =
    groupResolved.length > 0
      ? groupResolved.map((g) => g.logical).join(' × ')
      : 'Group'

  const defaultCap = 15
  const cap =
    typeof chart?.limit === 'number' && chart.limit > 0
      ? Math.min(chart.limit, 500)
      : defaultCap

  if (!valueKey || groupResolved.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-base" style={{ color: '#94a3b8' }}>
        {!valueKey ? 'Configure a numeric measure (metric / subtotal / revenue).' : 'No dimensions to group by.'}
      </div>
    )
  }

  const grouped = {}
  rowsData.forEach((row) => {
    const key = groupResolved.map((g) => (row[g.key] != null && row[g.key] !== '' ? String(row[g.key]) : '—')).join(' × ')
    grouped[key] = (grouped[key] || 0) + parseNumericValue(row[valueKey])
  })

  const rows = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, cap)
  const totalShown = rows.reduce((s, [, v]) => s + v, 0)

  return (
    <div
      className="min-h-0 flex flex-col flex-1"
      style={{ overflowY: 'auto', maxHeight: '100%' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <tr style={{ background: '#162032' }}>
            <th
              style={{
                padding: '10px 14px',
                textAlign: 'left',
                color: '#94a3b8',
                fontWeight: 500,
                borderBottom: '0.5px solid #334155',
                whiteSpace: 'nowrap',
              }}
            >
              {groupHeader}
            </th>
            <th
              style={{
                padding: '10px 14px',
                textAlign: 'right',
                color: '#94a3b8',
                fontWeight: 500,
                borderBottom: '0.5px solid #334155',
                whiteSpace: 'nowrap',
              }}
            >
              {valueLogical || 'Value'}
            </th>
            <th
              style={{
                padding: '10px 14px',
                textAlign: 'right',
                color: '#94a3b8',
                fontWeight: 500,
                borderBottom: '0.5px solid #334155',
                width: '80px',
                whiteSpace: 'nowrap',
              }}
            >
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, val], i) => {
            const pctNum = totalShown > 0 ? (val / totalShown) * 100 : 0
            const pct = totalShown > 0 ? pctNum.toFixed(1) : '0.0'
            const barW = Math.min(100, Math.max(0, pctNum))
            const rowBg = i % 2 === 0 ? '#1e293b' : '#182437'
            return (
              <tr
                key={`${key}-${i}`}
                style={{
                  borderBottom: '0.5px solid #1e2d40',
                  background: rowBg,
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1d4ed820'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = rowBg
                }}
              >
                <td
                  style={{
                    padding: '10px 14px',
                    color: '#e2e8f0',
                    fontWeight: i < 3 ? 500 : 400,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {i === 0 && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '16px',
                          height: '16px',
                          background: '#1d4ed8',
                          borderRadius: '50%',
                          fontSize: '10px',
                          color: 'white',
                          textAlign: 'center',
                          lineHeight: '16px',
                          flexShrink: 0,
                        }}
                      >
                        1
                      </span>
                    )}
                    {i === 1 && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '16px',
                          height: '16px',
                          background: '#475569',
                          borderRadius: '50%',
                          fontSize: '10px',
                          color: 'white',
                          textAlign: 'center',
                          lineHeight: '16px',
                          marginRight: '0',
                          flexShrink: 0,
                        }}
                      >
                        2
                      </span>
                    )}
                    {i === 2 && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '16px',
                          height: '16px',
                          background: '#92400e',
                          borderRadius: '50%',
                          fontSize: '10px',
                          color: 'white',
                          textAlign: 'center',
                          lineHeight: '16px',
                          flexShrink: 0,
                        }}
                      >
                        3
                      </span>
                    )}
                    <span>{key}</span>
                  </span>
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    color: '#10b981',
                    textAlign: 'right',
                    fontWeight: 500,
                  }}
                >
                  {formatCompact(val)}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '4px',
                        background: '#334155',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${barW}%`,
                          height: '100%',
                          background: '#1d4ed8',
                          borderRadius: '2px',
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        minWidth: '32px',
                        textAlign: 'right',
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p
        style={{
          fontSize: '11px',
          color: '#64748b',
          padding: '8px 16px',
          margin: 0,
        }}
      >
        Top {rows.length} combination{rows.length === 1 ? '' : 's'} · {rowsData.length} source rows
      </p>
    </div>
  )
}

// Group by dimension for bar/pie
function groupBy(data, dimension, metric, limit = 10, aggregation = 'sum') {
  if (!data || data.length === 0) return []
  const map = new Map() // key -> { sum, count, min, max }
  for (const row of data) {
    const key = String(row[dimension] ?? '')
    if (!map.has(key)) map.set(key, { sum: 0, count: 0, min: Infinity, max: -Infinity })
    const rec = map.get(key)
    if (aggregation === 'count') {
      rec.count += 1
      continue
    }
    const raw = row?.[metric]
    if (raw === null || raw === undefined || raw === '') continue
    const val = parseNumericValue(raw)
    rec.sum += val
    rec.count += 1
    if (val < rec.min) rec.min = val
    if (val > rec.max) rec.max = val
  }
  return Array.from(map.entries())
    .map(([name, rec]) => ({ name, value: aggValue(rec, aggregation) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Group by dimension with a list of detail values per group (e.g. Team -> wins + list of years)
function groupByWithDetails(data, dimension, metric, detailField, limit = 10, aggregation = 'sum') {
  if (!data || data.length === 0) return []
  const map = new Map() // key -> { sum, count, min, max, details }
  for (const row of data) {
    const key = String(row[dimension] ?? '')
    const detail = row[detailField]
    if (!map.has(key)) map.set(key, { sum: 0, count: 0, min: Infinity, max: -Infinity, details: [] })
    const rec = map.get(key)
    if (aggregation === 'count') {
      rec.count += 1
    } else {
      const raw = row?.[metric]
      if (raw !== null && raw !== undefined && raw !== '') {
        const val = parseNumericValue(raw)
        rec.sum += val
        rec.count += 1
        if (val < rec.min) rec.min = val
        if (val > rec.max) rec.max = val
      }
    }
    if (detail != null && detail !== '') rec.details.push(String(detail))
  }
  return Array.from(map.entries())
    .map(([name, rec]) => ({ name, value: aggValue(rec, aggregation), details: rec.details.sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(b)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Line chart: group by xField with aggregation (sum/avg/count/min/max)
function lineChartData(data, xField, yField, aggregation = 'sum') {
  if (!data || data.length === 0) return []
  const map = new Map() // key -> { sum, count, min, max }
  for (const row of data) {
    const key = row[xField] != null ? String(row[xField]) : ''
    if (!map.has(key)) map.set(key, { sum: 0, count: 0, min: Infinity, max: -Infinity })
    const rec = map.get(key)
    if (aggregation === 'count') {
      rec.count += 1
      continue
    }
    const raw = row?.[yField]
    if (raw === null || raw === undefined || raw === '') continue
    const val = parseNumericValue(raw)
    rec.sum += val
    rec.count += 1
    if (val < rec.min) rec.min = val
    if (val > rec.max) rec.max = val
  }
  return Array.from(map.entries())
    .map(([name, rec]) => ({ name, value: aggValue(rec, aggregation) }))
    .sort((a, b) => new Date(a.name) - new Date(b.name))
}

// Stacked: group by xField, then by stackField; each row = { name, [stackVal1]: sum, [stackVal2]: sum, ... }
function groupByStacked(data, xField, stackField, metric, limit = 10) {
  if (!data || data.length === 0) return []
  const map = new Map() // xKey -> { name, [stackKey]: sum }
  for (const row of data) {
    const xKey = String(row[xField] ?? '')
    const stackKey = String(row[stackField] ?? '')
    const val = parseNumericValue(row[metric])
    if (!map.has(xKey)) map.set(xKey, { name: xKey })
    const rec = map.get(xKey)
    rec[stackKey] = (rec[stackKey] || 0) + val
  }
  return Array.from(map.values())
    .sort((a, b) => new Date(a.name) - new Date(b.name))
    .slice(0, limit)
}

// Scatter: one point per row, { x: row[xField], y: row[yField], name?: row[z] }
function scatterData(data, xField, yField, limit = 200) {
  if (!data || data.length === 0) return []
  return data.slice(0, limit).map((row) => ({
    x: parseNumericValue(row[xField]),
    y: parseNumericValue(row[yField]),
    name: row[xField] != null ? String(row[xField]) : ''
  })).filter((p) => !Number.isNaN(p.x) && !Number.isNaN(p.y))
}

// Human-readable measure label for chart (e.g. "Sum of Sales", "Count")
function getMeasureLabel(chart) {
  const agg = chart.aggregation || 'sum'
  const field = chart.yField || chart.metric || chart.field || 'Value'
  const aggLabel = agg.charAt(0).toUpperCase() + agg.slice(1)
  if (agg === 'count') return 'Count'
  return `${aggLabel} of ${field}`
}

// When filtered data has one row, return { label, value } for a display field (e.g. Winner) for the chart card
function getSingleRowValueLabel(chart, filteredData) {
  if (!filteredData?.length || filteredData.length !== 1) return null
  const row = filteredData[0]
  const dim = chart.xField || chart.dimension
  const met = chart.yField || chart.metric || chart.field
  const skip = new Set([dim, met, chart.stackField, chart.detailField].filter(Boolean).map((f) => resolveFieldName(row, f)))
  if (chart.valueLabelField) {
    const resolved = resolveFieldName(row, chart.valueLabelField)
    const v = row[resolved]
    if (v != null && v !== '') return { label: chart.valueLabelField, value: String(v) }
  }
  const prefer = ['Winner', 'Winner_name', 'Name', 'Category', 'Label']
  for (const key of prefer) {
    const resolved = resolveFieldName(row, key)
    if (resolved && row[resolved] != null && row[resolved] !== '' && !skip.has(resolved)) {
      return { label: resolved, value: String(row[resolved]) }
    }
  }
  for (const key of Object.keys(row || {})) {
    if (skip.has(key)) continue
    const v = row[key]
    if (v != null && v !== '' && typeof v === 'string') {
      return { label: key, value: String(v) }
    }
  }
  return null
}

// Date range slider: dual-thumb slider for min/max date from data (uses actual data range only)
function DateRangeSliderInline({ data, field, value, onChange, theme }) {
  const dateRange = useMemo(() => {
    if (!data?.length || !field) return { min: '', max: '', minTs: 0, maxTs: 0 }
    const firstRow = data[0]
    const resolvedField = resolveFieldName(firstRow, field) || field
    let minTs = Infinity
    let maxTs = -Infinity
    for (const row of data) {
      const raw = row[resolvedField]
      const t = valueToTimestamp(raw)
      if (!Number.isNaN(t)) {
        if (t < minTs) minTs = t
        if (t > maxTs) maxTs = t
      }
    }
    if (minTs === Infinity || maxTs === -Infinity) return { min: '', max: '', minTs: 0, maxTs: 0 }
    return {
      min: new Date(minTs).toISOString().split('T')[0],
      max: new Date(maxTs).toISOString().split('T')[0],
      minTs,
      maxTs
    }
  }, [data, field])

  const rangeSpan = dateRange.maxTs - dateRange.minTs || 1
  const dateToPercent = (d) => {
    if (d == null || d === '') return 0
    const t = valueToTimestamp(d)
    if (Number.isNaN(t)) return 0
    return Math.max(0, Math.min(100, ((t - dateRange.minTs) / rangeSpan) * 100))
  }
  const percentToDate = (p) => {
    const t = dateRange.minTs + (rangeSpan * Math.max(0, Math.min(100, p))) / 100
    return new Date(t).toISOString().split('T')[0]
  }

  const startVal = value?.start || dateRange.min
  const endVal = value?.end || dateRange.max
  const startPercent = dateToPercent(startVal)
  const endPercent = dateToPercent(endVal)

  const [dragging, setDragging] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState('normal') // 'slow' | 'normal' | 'fast'
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])

  const playIntervalMs = playSpeed === 'slow' ? 800 : playSpeed === 'fast' ? 200 : 400

  // Animate: start moves from min toward max, end fixed at max (e.g. 1966→2025 with 2025 fixed)
  useEffect(() => {
    if (!playing || !dateRange.min || !dateRange.max) return
    const rangeSpanMs = dateRange.maxTs - dateRange.minTs
    const isYearLike = rangeSpanMs > 10 * 365.25 * 24 * 60 * 60 * 1000
    const stepMs = isYearLike
      ? 365.25 * 24 * 60 * 60 * 1000
      : 30 * 24 * 60 * 60 * 1000
    const fixedEnd = dateRange.max
    const fixedEndTs = dateRange.maxTs
    const interval = setInterval(() => {
      const v = valueRef.current
      const startTs = valueToTimestamp(v?.start || dateRange.min)
      let newStartTs = startTs + stepMs
      if (newStartTs >= fixedEndTs) {
        newStartTs = fixedEndTs
        setPlaying(false)
      }
      const newStart = new Date(newStartTs).toISOString().split('T')[0]
      onChange({ start: newStart, end: fixedEnd })
      valueRef.current = { start: newStart, end: fixedEnd }
    }, playIntervalMs)
    return () => clearInterval(interval)
  }, [playing, playIntervalMs, dateRange.minTs, dateRange.maxTs, dateRange.min, dateRange.max, onChange])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e) => {
      const track = document.getElementById(`date-slider-track-${field}`)
      if (!track) return
      const rect = track.getBoundingClientRect()
      const p = ((e.clientX - rect.left) / rect.width) * 100
      if (dragging === 'start') {
        const newP = Math.min(p, endPercent - 0.5)
        onChange({ start: percentToDate(newP), end: endVal })
      } else {
        const newP = Math.max(p, startPercent + 0.5)
        onChange({ start: startVal, end: percentToDate(newP) })
      }
    }
    const onUp = () => setDragging(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, startPercent, endPercent, startVal, endVal, field, onChange, percentToDate])

  // Parse ISO date (YYYY-MM-DD) as local so labels show Jan 1, 1966 not Dec 31, 1965
  const formatDate = (d) => {
    if (!d) return ''
    const iso = String(d).match(/^(\d{4})-(\d{2})-(\d{2})$/)
    const date = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (!dateRange.min || !dateRange.max) return null

  const isDark = theme === 'dark'
  const trackBg = isDark ? 'bg-gray-600' : 'bg-gray-200'
  const fillBg = isDark ? 'bg-blue-500' : 'bg-blue-500'
  const thumbBg = isDark ? 'bg-blue-400' : 'bg-blue-600'

  return (
    <div className="flex flex-col gap-1 w-full min-w-0">
      <div className="flex items-center justify-between gap-2 mb-0.5 flex-wrap">
        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {formatDate(startVal)} – {formatDate(endVal)}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(e.target.value)}
            className={`text-xs rounded border px-1.5 py-0.5 ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-700'}`}
            title="Animation speed"
            aria-label="Play speed"
          >
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
          <button
            type="button"
            onClick={() => {
              if (!playing) {
                const v = valueRef.current
                const endTs = valueToTimestamp(v?.end || dateRange.max)
                if (endTs < dateRange.maxTs) {
                  onChange({ start: dateRange.min, end: dateRange.max })
                  valueRef.current = { start: dateRange.min, end: dateRange.max }
                }
              }
              setPlaying((p) => !p)
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-full ${playing ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            title={playing ? 'Pause animation' : 'Play: animate date range forward'}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
        </div>
      </div>
      <div
        id={`date-slider-track-${field}`}
        className={`relative h-2 w-full ${trackBg} rounded-full cursor-pointer min-w-0`}
      >
        <div
          className={`absolute h-2 ${fillBg} rounded-full pointer-events-none`}
          style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
        />
        <div
          className={`absolute w-4 h-4 ${thumbBg} rounded-full shadow cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1 top-1/2 border-2 border-white`}
          style={{ left: `${startPercent}%`, zIndex: 20 }}
          onMouseDown={(e) => { e.preventDefault(); setPlaying(false); setDragging('start') }}
          title={formatDate(startVal)}
        />
        <div
          className={`absolute w-4 h-4 ${thumbBg} rounded-full shadow cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1 top-1/2 border-2 border-white`}
          style={{ left: `${endPercent}%`, zIndex: 21 }}
          onMouseDown={(e) => { e.preventDefault(); setPlaying(false); setDragging('end') }}
          title={formatDate(endVal)}
        />
      </div>
      <div className={`flex justify-between text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        <span>{formatDate(dateRange.min)}</span>
        <span>{formatDate(dateRange.max)}</span>
      </div>
    </div>
  )
}

const BAR_LIMIT_OPTIONS = [5, 10, 15, 20, 30, 50]
const BAR_LIMIT_ALL = 200
const PIE_LIMIT_OPTIONS = [5, 8, 10, 12, 15, 20]

function BarChartFilterPopover({ chartId, dimension, metric, detailField, aggregation, filteredData, categoryFilter, onChartOptionChange, onClose, theme }) {
  const allCategories = useMemo(() => {
    if (!filteredData?.length || !dimension) return []
    const data = detailField
      ? groupByWithDetails(filteredData, dimension, metric, detailField, BAR_LIMIT_ALL, aggregation)
      : groupBy(filteredData, dimension, metric, BAR_LIMIT_ALL, aggregation)
    return data.map((d) => d.name)
  }, [filteredData, dimension, metric, detailField, aggregation])
  const selected = useMemo(() => new Set(categoryFilter && categoryFilter.length > 0 ? categoryFilter : allCategories), [categoryFilter, allCategories])
  const isDark = theme === 'dark'
  const handleToggle = (name) => {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChartOptionChange(chartId, { categoryFilter: next.size === allCategories.length ? null : Array.from(next) })
  }
  const handleSelectAll = () => onChartOptionChange(chartId, { categoryFilter: null })
  const handleClear = () => onChartOptionChange(chartId, { categoryFilter: [] })
  if (allCategories.length === 0) return null
  return (
    <div
      className={`absolute right-0 top-full z-50 mt-1 w-56 max-h-64 overflow-y-auto rounded-lg border shadow-lg ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'}`}
      role="dialog"
      aria-label="Filter categories"
    >
      <div className={`p-2 border-b ${isDark ? 'border-gray-600' : 'border-gray-200'} flex justify-between items-center gap-2`}>
        <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Show only</span>
        <button type="button" onClick={onClose} className={`text-lg leading-none ${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>&times;</button>
      </div>
      <div className="p-2 flex gap-1">
        <button type="button" onClick={handleSelectAll} className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>All</button>
        <button type="button" onClick={handleClear} className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>None</button>
      </div>
      <ul className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
        {allCategories.map((name) => (
          <li key={name} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`bar-filter-${chartId}-${name.replace(/\s/g, '_')}`}
              checked={selected.has(name)}
              onChange={() => handleToggle(name)}
              className="rounded border-gray-300"
            />
            <label htmlFor={`bar-filter-${chartId}-${name.replace(/\s/g, '_')}`} className={`text-sm truncate cursor-pointer flex-1 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              {name}
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DashboardRenderer({
  spec,
  data,
  dataByDatasetId,
  defaultDatasetId,
  availableDatasetIds,
  filterValues,
  onFilterChange,
  onLayoutChange,
  onRemoveWidget,
  onChartOptionChange,
  onFilterOrderChange,
  onTabDatasetChange,
  selectedWidget,
  onSelectWidget,
  /** Ask Claude Custom tab: always derive chart grid from spec, never persisted spec/local layout. */
  preferFreshChartLayout = false,
  /** Shared / read-only: disable drag, resize, and layout persistence callbacks. */
  layoutLocked = false,
}) {
  const [localFilters, setLocalFilters] = useState({})
  const [chartFilter, setChartFilter] = useState(null)
  const [openBarFilterChartId, setOpenBarFilterChartId] = useState(null)
  const [openPieFilterChartId, setOpenPieFilterChartId] = useState(null)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [draggedFilterId, setDraggedFilterId] = useState(null)
  const [dragOverFilterId, setDragOverFilterId] = useState(null)
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const chartRefs = useRef({})
  const filterDropTargetRef = useRef(null)
  const chartGridContainerRef = useRef(null)
  const chartGridWidthTimerRef = useRef(null)
  const [chartGridWidth, setChartGridWidth] = useState(null)
  const prevSpecLayoutKeyRef = useRef(null)
  const tabs = useMemo(() => (spec?.tabs && spec.tabs.length >= 2 ? spec.tabs : null), [spec?.tabs])
  const safeTabIndex = tabs ? Math.min(activeTabIndex, tabs.length - 1) : 0
  const currentTab = tabs?.[safeTabIndex]
  const defaultId = defaultDatasetId || (dataByDatasetId && Object.keys(dataByDatasetId)[0]) || null
  const dataForTab = useMemo(() => {
    if (dataByDatasetId && currentTab?.dataset != null) {
      const id = currentTab.dataset
      return dataByDatasetId[id] ?? dataByDatasetId[defaultId] ?? data ?? []
    }
    if (dataByDatasetId && defaultId) return dataByDatasetId[defaultId] ?? data ?? []
    return data ?? []
  }, [data, dataByDatasetId, defaultId, currentTab?.dataset])

  const currentSpec = useMemo(() => {
    if (!spec) return null
    if (tabs && tabs[safeTabIndex]) {
      const t = tabs[safeTabIndex]
      return {
        ...spec,
        filters: t.filters ?? [],
        kpis: t.kpis ?? [],
        charts: t.charts ?? [],
        layout: t.layout ?? []
      }
    }
    return spec
  }, [spec, tabs, safeTabIndex])

  const filterState = useMemo(() => ({ ...localFilters, ...filterValues }), [localFilters, filterValues])

  const [layout, setLayout] = useState(() => {
    if (!spec) return []
    const { layoutFromSpec, kpis, charts } = getSpecSliceForLayout(spec, tabs, safeTabIndex)
    if (gridLayoutCoversWidgets(layoutFromSpec, kpis, charts)) return layoutFromSpec
    return buildDefaultLayout({ kpis, charts })
  })

  /** Content-addressed key so unstable `spec` object identity does not re-bootstrap layout every render. */
  const layoutBootstrapKey = useMemo(() => {
    if (!spec) return ''
    try {
      const { layoutFromSpec, kpis, charts } = getSpecSliceForLayout(spec, tabs, safeTabIndex)
      const chartSeedFp = stringifyLayoutSlots(generateLayoutFromCharts(charts))
      return JSON.stringify({
        id: spec?.id ?? null,
        ix: safeTabIndex,
        preferFresh: preferFreshChartLayout,
        layoutFromSpec,
        kpis: kpis.map((k) => String(k.id)),
        chartsFp: charts.map((c) => [String(c.id), c.type ?? '', Boolean(c.fullWidth)]),
        chartSeedFp,
      })
    } catch {
      return `${String(spec?.id)}_${safeTabIndex}_${preferFreshChartLayout}`
    }
  }, [spec, tabs, safeTabIndex, preferFreshChartLayout])

  const chartsSectionLen = (currentSpec?.charts || []).length

  useEffect(() => {
    if (!chartsSectionLen) {
      setChartGridWidth(null)
      if (chartGridWidthTimerRef.current != null) {
        clearTimeout(chartGridWidthTimerRef.current)
        chartGridWidthTimerRef.current = null
      }
      return
    }
    const el = chartGridContainerRef.current
    if (!el) return

    const applyWidth = (raw) => {
      const fw = Math.floor(Number(raw))
      if (!Number.isFinite(fw) || fw <= 100) return
      setChartGridWidth((prev) =>
        prev != null && Math.abs(prev - fw) <= 5 ? prev : Math.max(fw, 320)
      )
    }

    applyWidth(el.getBoundingClientRect().width)
    requestAnimationFrame(() => applyWidth(el.getBoundingClientRect().width))

    const ro = new ResizeObserver((entries) => {
      const newWidth = entries[0]?.contentRect?.width
      if (newWidth == null) return
      clearTimeout(chartGridWidthTimerRef.current)
      chartGridWidthTimerRef.current = setTimeout(() => {
        applyWidth(newWidth)
      }, 100)
    })

    ro.observe(el)
    return () => {
      ro.disconnect()
      clearTimeout(chartGridWidthTimerRef.current)
    }
  }, [chartsSectionLen])

  // Reset grid layout when Ask Claude produces a new spec identity (chart ids or spec id).
  useEffect(() => {
    if (!spec) return
    const slice = getSpecSliceForLayout(spec, tabs, safeTabIndex)
    const chartsPart = JSON.stringify((slice.charts || []).map((c) => c?.id))
    const specLayoutKey =
      spec.id != null && String(spec.id) !== ''
        ? `id:${String(spec.id)}:${chartsPart}`
        : `charts:${chartsPart}`
    if (specLayoutKey === prevSpecLayoutKeyRef.current) return
    prevSpecLayoutKeyRef.current = specLayoutKey

    const { layoutFromSpec, kpis, charts } = slice
    const nextLayout = gridLayoutCoversWidgets(layoutFromSpec, kpis, charts)
      ? layoutFromSpec
      : buildDefaultLayout({ kpis, charts })
    setLayout((prev) => {
      const prevStr = stringifyLayoutSlots(prev)
      const nextStr = stringifyLayoutSlots(nextLayout)
      if (prevStr === nextStr) return prev
      return nextLayout
    })
  }, [spec, tabs, safeTabIndex])

  // Sync layout only when dashboard spec *content* changes (not object identity churn).
  useEffect(() => {
    if (!spec || !layoutBootstrapKey) return
    const { layoutFromSpec, kpis, charts } = getSpecSliceForLayout(spec, tabs, safeTabIndex)
    const nextLayout = gridLayoutCoversWidgets(layoutFromSpec, kpis, charts)
      ? layoutFromSpec
      : buildDefaultLayout({ kpis, charts })
    setLayout((prev) => {
      const prevStr = stringifyLayoutSlots(prev)
      const nextStr = stringifyLayoutSlots(nextLayout)
      if (prevStr === nextStr) return prev
      return nextLayout
    })
  }, [layoutBootstrapKey])
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const handleLayoutChange = useCallback(
    (newLayout) => {
      if (!Array.isArray(newLayout) || newLayout.length === 0) return
      const prev = layoutRef.current
      const newStr = stringifyLayoutSlots(newLayout)
      const prevStr = stringifyLayoutSlots(prev)
      const same = newStr !== '' && newStr === prevStr
      setLayout((p) => {
        const pStr = stringifyLayoutSlots(p)
        if (pStr === newStr) return p
        return newLayout
      })
      if (!same && typeof onLayoutChange === 'function') {
        if (tabs && safeTabIndex != null) onLayoutChange(newLayout, safeTabIndex)
        else onLayoutChange(newLayout)
      }
    },
    [onLayoutChange, tabs, safeTabIndex]
  )

  const handleRemoveWidget = useCallback(
    (id, type) => {
      const newLayout = layout.filter((item) => item.i !== id)
      setLayout(newLayout)
      handleLayoutChange(newLayout)
      if (typeof onRemoveWidget === 'function') {
        if (tabs && safeTabIndex != null) onRemoveWidget(id, type, safeTabIndex)
        else onRemoveWidget(id, type)
      }
    },
    [layout, handleLayoutChange, onRemoveWidget, tabs, safeTabIndex]
  )

  const baseFilteredData = useMemo(
    () => applyFilters(dataForTab, currentSpec?.filters || [], filterState),
    [dataForTab, currentSpec?.filters, filterState]
  )
  const filteredData = useMemo(() => {
    let out = baseFilteredData
    if (chartFilter?.field) {
      const firstRow = baseFilteredData?.[0]
      out = applyChartFilter(baseFilteredData, chartFilter, firstRow)
    }
    return out
  }, [baseFilteredData, chartFilter])

  const tableColumnKeys = useMemo(() => dataColumnKeys(filteredData), [filteredData])

  const chartSpecsSafe = currentSpec?.charts || []
  const chartLayoutIdSet = useMemo(
    () => new Set(chartSpecsSafe.map((c) => String(c.id))),
    [chartSpecsSafe]
  )
  const chartsLayoutOnly = useMemo(
    () => layout.filter((li) => chartLayoutIdSet.has(String(li.i))),
    [layout, chartLayoutIdSet]
  )

  const persistManualChartLayoutsFromGrid = useCallback((chartLayoutsFromGrid) => {
    try {
      if (!Array.isArray(chartLayoutsFromGrid) || chartLayoutsFromGrid.length === 0) return
      localStorage.setItem(MANUAL_CHART_LAYOUT_STORAGE_KEY, JSON.stringify(chartLayoutsFromGrid))
    } catch (_) {
      /* ignore quota / privacy mode */
    }
  }, [])

  const mergeChartsLayoutIntoState = useCallback(
    (newChartLayout) => {
      if (!Array.isArray(newChartLayout)) return
      const kpiIdsNow = new Set((currentSpec?.kpis || []).map((k) => k.id))
      const kpiPieces = layoutRef.current.filter((li) => kpiIdsNow.has(li.i))
      const merged = [...kpiPieces, ...newChartLayout]
      const prev = layoutRef.current
      const newStr = stringifyLayoutSlots(merged)
      const prevStr = stringifyLayoutSlots(prev)
      const same = newStr !== '' && newStr === prevStr
      setLayout((p) => {
        if (stringifyLayoutSlots(p) === stringifyLayoutSlots(merged)) return p
        return merged
      })
      if (!same && typeof onLayoutChange === 'function') {
        if (tabs && safeTabIndex != null) onLayoutChange(merged, safeTabIndex)
        else onLayoutChange(merged)
      }
    },
    [currentSpec?.kpis, onLayoutChange, tabs, safeTabIndex]
  )

  const kpiCards = useMemo(() => {
    const specKpis = currentSpec?.kpis || []
    const rows = filteredData || []
    const keys = tableColumnKeys

    const cards = []
    if (specKpis.length > 0) {
      const fr = rows?.[0]
      if (!fr) return []
      for (const k of specKpis) {
        let displayValue
        if (specKpiLabelImpliesTopProduct(k.label || k.field)) {
          displayValue = getTopProduct(rows, keys)
        } else if (specKpiLabelImpliesTopChannel(k.label || k.field)) {
          displayValue = getTopChannel(rows, keys)
        } else {
          const col = resolveFieldName(fr, k.field)
          displayValue = aggregate(rows, col, k.aggregation || 'sum')
        }
        cards.push({ variant: 'spec', ...k, displayValue })
      }
      return cards
    }

    if (!rows.length) {
      return [{ variant: 'default', id: 'default-kpi-rows', label: 'Total Records', displayValue: 0 }]
    }

    const colsForKpis = keys.length ? keys : Object.keys(rows[0] || {})

    return getDefaultKPIs(rows, colsForKpis).map((entry, i) => ({
      variant: 'default',
      id: `default-kpi-${defaultKpiCardSlug(entry.label, i)}-${i}`,
      label: entry.label,
      displayValue: entry.raw,
    }))
  }, [currentSpec?.kpis, filteredData, tableColumnKeys])

  const summaryTabSummaryEligible = !!(tabs && safeTabIndex === 0)

  const handleFilterChange = (id, value) => {
    setLocalFilters((prev) => ({ ...prev, [id]: value }))
    onFilterChange?.({ ...filterState, [id]: value })
  }

  const handleChartClick = useCallback((field, value) => {
    setChartFilter((prev) =>
      prev?.field === field && String(prev?.value) === String(value) ? null : { field, value }
    )
  }, [])

  if (!spec) {
    return (
      <div className="p-8 text-center text-gray-500 text-base rounded-lg border border-gray-200 bg-gray-50">
        No dashboard spec. Generate one with a prompt.
      </div>
    )
  }

  const theme = spec.style?.theme === 'dark' ? 'dark' : (spec.style?.theme === 'executive' || spec.style?.theme === 'executive_clean' ? 'executive' : 'light')
  const cardClass = theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-100' : theme === 'executive' ? 'bg-slate-50 border-slate-200' : 'bg-white border-gray-200'
  const chartTheme = getChartTheme(theme)
  const styleOpts = spec.style || {}

  const paletteFor = (palette) =>
    palette === 'minimal' ? CHART_COLORS_MINIMAL : palette === 'pastel' ? CHART_COLORS_PASTEL : CHART_COLORS
  const globalPalette = styleOpts.palette || 'default'
  const chartColorsFor = (c) => paletteFor(c?.palette || globalPalette)
  const effectiveBarStyleFor = (c) => (c?.barStyle ?? styleOpts.barStyle ?? 'sheen')
  const useBarSheenFor = (c) => effectiveBarStyleFor(c) !== 'flat'
  const measureSize = styleOpts.measureSize || 'medium'
  const chartSizes = measureSize === 'small' ? { tick: 12, axis: 11, dataLabel: 14 } : measureSize === 'large' ? { tick: 20, axis: 18, dataLabel: 22 } : { tick: 16, axis: 14, dataLabel: 18 }
  const chartTickFontSize = chartSizes.tick
  const chartAxisLabelFontSize = chartSizes.axis
  const chartDataLabelFontSize = chartSizes.dataLabel
  const chartFontFamily = styleOpts.fontFamily === 'serif' ? 'Georgia, serif' : styleOpts.fontFamily === 'mono' ? 'ui-monospace, monospace' : styleOpts.fontFamily === 'sans' ? 'system-ui, -apple-system, sans-serif' : undefined
  const chartTextStyle = chartFontFamily ? { fontFamily: chartFontFamily } : {}

  // Recharts needs explicit margins for long currency labels and axis titles,
  // otherwise ticks/labels get clipped (especially with overflow-hidden tiles).
  const chartMarginStandard = { top: 30, right: 24, bottom: 56, left: 84 }
  const chartMarginTight = { top: 26, right: 18, bottom: 44, left: 76 }

  const selectionStyle = (kind, id) => {
    if (!selectedWidget?.type || !selectedWidget?.id) return undefined
    if (selectedWidget.type !== kind || selectedWidget.id !== id) return undefined
    // Inline style so it's visible even if Tailwind "ring" utilities aren't available.
    return {
      outline: '2px solid rgba(59,130,246,0.95)',
      outlineOffset: 2
    }
  }

  return (
    <div className="space-y-6">
      {tabs && tabs.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2 border-b pb-2" style={{ borderColor: '#334155' }}>
          {tabs.map((tab, idx) => (
            <div key={tab.id || idx} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTabIndex(idx)}
                className="px-4 py-2 rounded-t-lg text-sm font-medium transition-colors"
                style={
                  safeTabIndex === idx
                    ? { background: '#1d4ed8', color: '#ffffff' }
                    : { background: '#1e293b', color: '#64748b', border: '0.5px solid #334155' }
                }
              >
                {tab.label || `Tab ${idx + 1}`}
              </button>
              {(availableDatasetIds?.length > 1 || (dataByDatasetId && Object.keys(dataByDatasetId).length > 1)) && onTabDatasetChange && (
                <select
                  value={tab.dataset ?? defaultId ?? ''}
                  onChange={(e) => onTabDatasetChange(idx, e.target.value || null)}
                  className="text-xs py-1 px-2 rounded border border-gray-300 bg-white text-gray-700"
                  title="Dataset for this tab"
                >
                  {(availableDatasetIds && availableDatasetIds.length > 0 ? availableDatasetIds : Object.keys(dataByDatasetId || {})).map((id) => (
                    <option key={id} value={id}>{id}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>
      )}
      {spec.warnings && spec.warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-base">
          {spec.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      {/* Summary tab (multi-tab): client-only narrative from dataset */}
      {summaryTabSummaryEligible && (
        <section
          className="rounded-lg p-4"
          style={{ background: '#1e293b', border: '0.5px solid #334155', borderRadius: '12px' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: '#f8fafc' }}>Summary</h3>
          <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#94a3b8' }}>
            {getSummaryText(filteredData, tableColumnKeys, spec)}
          </div>
        </section>
      )}

      {/* Chart click filter (cross-filter) — show when a chart segment is selected */}
      {chartFilter && (
        <div className={`flex items-center justify-between gap-2 p-3 rounded-lg border ${cardClass}`}>
          <span className="text-sm text-gray-600">
            Filtering by <strong>{chartFilter.field}</strong> = <strong>{String(chartFilter.value)}</strong> — all charts and KPIs reflect this selection.
          </span>
          <button
            type="button"
            onClick={() => setChartFilter(null)}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Filters row — collapsible */}
      {currentSpec?.filters && currentSpec.filters.length > 0 && (
        <div className={`rounded-lg border ${cardClass}`}>
          <button
            type="button"
            onClick={() => setFiltersCollapsed((c) => !c)}
            className={`flex w-full items-center justify-between gap-2 p-4 text-left hover:opacity-90 ${filtersCollapsed ? 'rounded-lg' : 'rounded-t-lg'}`}
            aria-expanded={!filtersCollapsed}
          >
            <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
              Filters
            </span>
            <span className={`text-gray-500 text-lg leading-none ${theme === 'dark' ? 'text-gray-400' : ''}`} aria-hidden>
              {filtersCollapsed ? '▶' : '▼'}
            </span>
          </button>
          {!filtersCollapsed && (
            <div className="px-4 pb-4 pt-0">
              <div className="flex flex-wrap gap-4 items-end">
                {currentSpec.filters.map((f) => {
                  const canDrag = !!onFilterOrderChange
                  const isDragging = draggedFilterId === f.id
                  const isDragOver = dragOverFilterId === f.id
                  const handleDragStart = (e) => {
                    if (!canDrag) return
                    e.dataTransfer.setData('text/plain', f.id)
                    e.dataTransfer.effectAllowed = 'move'
                    setDraggedFilterId(f.id)
                  }
                  const handleDragEnd = () => {
                    setDraggedFilterId(null)
                    setDragOverFilterId(null)
                    filterDropTargetRef.current = null
                  }
                  const handleCardDragOver = (e) => {
                    if (!canDrag || !draggedFilterId || draggedFilterId === f.id) return
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    filterDropTargetRef.current = f.id
                    setDragOverFilterId(f.id)
                  }
                  const handleCardDrop = (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setDragOverFilterId(null)
                    const dropTargetId = f.id
                    const dragId = e.dataTransfer.getData('text/plain')
                    if (!dragId || !onFilterOrderChange || dragId === dropTargetId) return
                    const fromIndex = currentSpec.filters.findIndex((x) => x.id === dragId)
                    let toIndex = currentSpec.filters.findIndex((x) => x.id === dropTargetId)
                    if (fromIndex === -1) return
                    const newFilters = [...currentSpec.filters]
                    const [removed] = newFilters.splice(fromIndex, 1)
                    if (fromIndex < toIndex) toIndex--
                    newFilters.splice(toIndex, 0, removed)
                    onFilterOrderChange(newFilters, tabs ? safeTabIndex : undefined)
                  }
                  return (
                  <div
                    key={f.id}
                    data-filter-id={f.id}
                    className={`${canDrag ? 'flex flex-row items-end gap-2' : 'flex flex-col gap-1'} ${f.type === 'date_range' ? 'w-full min-w-0' : ''} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? (theme === 'dark' ? 'ring-2 ring-blue-500 rounded-lg' : 'ring-2 ring-blue-400 rounded-lg') : ''}`}
                    onDragOver={canDrag ? handleCardDragOver : undefined}
                    onDragLeave={canDrag ? () => { setDragOverFilterId((prev) => (prev === f.id ? null : prev)) } : undefined}
                    onDrop={canDrag ? handleCardDrop : undefined}
                  >
                    {canDrag && (
                      <span
                        draggable={true}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        className={`cursor-grab active:cursor-grabbing touch-none p-1 rounded ${theme === 'dark' ? 'text-gray-500 hover:text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        title="Drag to reorder"
                        aria-label="Drag to reorder filter"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                        </svg>
                      </span>
                    )}
                    {onRemoveWidget && (
                      <button
                        type="button"
                        onClick={() => onRemoveWidget(f.id, 'filter')}
                        className={`flex-shrink-0 w-7 h-7 flex items-center justify-center rounded ${theme === 'dark' ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                        title="Remove filter"
                        aria-label="Remove filter"
                      >
                        <span className="text-lg leading-none">×</span>
                      </button>
                    )}
                    <div className={`flex flex-col gap-1 ${f.type === 'date_range' ? 'w-full min-w-0 flex-1' : ''}`}>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{f.label || f.id}</label>
                    {f.type === 'date_range' && (
                      <DateRangeSliderInline
                        data={dataForTab}
                        field={f.field}
                        value={filterState[f.id]}
                        onChange={(v) => handleFilterChange(f.id, v)}
                        theme={theme}
                      />
                    )}
                {f.type === 'select' && (() => {
                  const firstRow = (dataForTab && dataForTab[0]) || {}
                  const field = resolveFieldName(firstRow, f.field) || f.field
                  const rawValues = (dataForTab || [])
                    .map((r) => r[field])
                    .filter((v) => v != null && v !== '')
                  const uniqueValues = [...new Set(rawValues.map((v) => String(v)))]
                  const sortedOptions = uniqueValues.sort((a, b) => {
                    const na = Number(a)
                    const nb = Number(b)
                    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
                    return String(a).localeCompare(String(b))
                  })
                  return (
                    <select
                      value={String(filterState[f.id] ?? 'All')}
                      onChange={(e) => handleFilterChange(f.id, e.target.value)}
                      className="px-3 py-2 border rounded text-base min-w-[140px]"
                    >
                      <option value="All">All</option>
                      {sortedOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  )
                })()}
                {f.type === 'checkbox' && (() => {
                  const firstRow = (dataForTab && dataForTab[0]) || {}
                  const field = resolveFieldName(firstRow, f.field) || f.field
                  const rawValues = (dataForTab || []).map((r) => r[field]).filter((v) => v != null && v !== '')
                  const uniqueValues = [...new Set(rawValues.map((v) => String(v)))].sort((a, b) => {
                    const na = Number(a); const nb = Number(b)
                    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
                    return String(a).localeCompare(String(b))
                  })
                  const selected = Array.isArray(filterState[f.id]) ? filterState[f.id] : []
                  const toggle = (v) => {
                    let next
                    if (selected.length === 0) {
                      next = uniqueValues.filter((x) => x !== v)
                      if (next.length === 0) next = []
                    } else if (selected.includes(v)) {
                      next = selected.filter((x) => x !== v)
                    } else {
                      next = [...selected, v]
                    }
                    if (next.length === uniqueValues.length) next = []
                    handleFilterChange(f.id, next)
                  }
                  const selectAll = () => handleFilterChange(f.id, [...uniqueValues])
                  const clearAll = () => handleFilterChange(f.id, [])
                  const borderClass = theme === 'dark' ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'
                  const textClass = theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  const labelClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  return (
                    <div className={`flex flex-col gap-2 max-h-48 overflow-y-auto px-3 py-2 border rounded text-base min-w-[160px] ${borderClass}`}>
                      <div className="flex gap-2 flex-shrink-0">
                        <button type="button" onClick={selectAll} className={`text-xs ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}>All</button>
                        <button type="button" onClick={clearAll} className={`text-xs ${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}>None</button>
                      </div>
                      <div className="flex flex-col gap-1">
                        {uniqueValues.map((v) => (
                          <label key={v} className={`flex items-center gap-2 cursor-pointer ${textClass}`}>
                            <input
                              type="checkbox"
                              checked={selected.length === 0 || selected.includes(v)}
                              onChange={() => toggle(v)}
                              className="rounded border-gray-400"
                            />
                            <span className={labelClass}>{v}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                {f.type === 'number_range' && (
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterState[f.id]?.min ?? ''}
                      onChange={(e) =>
                        handleFilterChange(f.id, {
                          ...(filterState[f.id] || {}),
                          min: e.target.value === '' ? undefined : Number(e.target.value)
                        })
                      }
                      className="px-3 py-2 border rounded text-base w-28"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterState[f.id]?.max ?? ''}
                      onChange={(e) =>
                        handleFilterChange(f.id, {
                          ...(filterState[f.id] || {}),
                          max: e.target.value === '' ? undefined : Number(e.target.value)
                        })
                      }
                      className="px-3 py-2 border rounded text-base w-28"
                    />
                  </div>
                )}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI summary CSS grid + draggable chart tiles (charts use react-grid-layout). */}
      {(kpiCards.length > 0 || (currentSpec?.charts || []).length > 0) && (
        <div style={CHART_GRID_OUTER_STYLE}>
          {kpiCards.length > 0 && (
            <div style={KPI_GRID_WRAPPER_STYLE}>
              {kpiCards.map((k) => {
                const fr = filteredData?.[0]
                const val =
                  k.displayValue !== undefined && k.displayValue !== null
                    ? k.displayValue
                    : fr
                      ? aggregate(filteredData, resolveFieldName(fr, k.field), k.aggregation || 'sum')
                      : null
                return (
                  <div
                    key={k.id}
                    className="p-4 h-full relative group min-h-0 min-w-0"
                    style={{
                      ...DARK_CARD_STYLE,
                      minWidth: 0,
                      overflow: 'hidden',
                      ...selectionStyle('kpi', k.id)
                    }}
                    onMouseDownCapture={(e) => {
                      const tag = String(e?.target?.tagName || '').toLowerCase()
                      if (['button', 'input', 'select', 'textarea', 'option', 'a'].includes(tag)) return
                      onSelectWidget?.({ type: 'kpi', id: k.id })
                    }}
                  >
                    {onRemoveWidget && k.variant === 'spec' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWidget(k.id, 'kpi')}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove widget"
                        aria-label="Remove widget"
                      >
                        <span className="text-lg leading-none">×</span>
                      </button>
                    )}
                    <div className="text-base" style={{ color: DARK_CHART_SUBTITLE }}>{k.label}</div>
                    <div className="text-3xl font-semibold mt-1 break-words" style={{ color: DARK_CHART_TITLE }}>
                      {formatKPIValue(val, k.label)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {(currentSpec?.charts || []).length > 0 && (
            <div
              ref={chartGridContainerRef}
              style={{ width: '100%', minWidth: 0, minHeight: chartGridWidth == null ? 400 : undefined }}
            >
              {chartGridWidth == null ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 200,
                    color: '#64748b',
                    fontSize: 13,
                  }}
                >
                  Loading dashboard…
                </div>
              ) : (
              <GridLayout
                className="layout min-w-0 w-full"
                width={chartGridWidth}
                layout={chartsLayoutOnly}
                onLayoutChange={mergeChartsLayoutIntoState}
                onDragStop={layoutLocked ? undefined : (nextLayout) => persistManualChartLayoutsFromGrid(nextLayout)}
                onResizeStop={layoutLocked ? undefined : (nextLayout) => persistManualChartLayoutsFromGrid(nextLayout)}
                cols={GRID_COLS}
                rowHeight={CHART_GRID_ROW_HEIGHT}
                margin={CHART_GRID_MARGIN}
                containerPadding={[0, 0]}
                useCSSTransforms={false}
                isDraggable={!layoutLocked}
                isResizable={!layoutLocked}
                draggableCancel="input,textarea,select,option,button,a,.recharts-wrapper,.recharts-surface,.recharts-responsive-container"
                compactType="vertical"
                preventCollision={false}
              >
          {(currentSpec?.charts || []).map((c) => {
            const layoutCell = chartsLayoutOnly.find((li) => String(li.i) === String(c.id))
            const plotPx = chartPlotHeightFromGrid(layoutCell?.h ?? 10)
            return (
            <div
              key={c.id}
              ref={(el) => { if (el != null) chartRefs.current[c.id] = el }}
              className="p-4 flex flex-col min-h-0 min-w-0"
              style={{
                minHeight: '300px',
                height: '100%',
                background: '#1e293b',
                border: '0.5px solid #334155',
                borderRadius: '12px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                ...selectionStyle('chart', c.id)
              }}
              onMouseDownCapture={(e) => {
                const tag = String(e?.target?.tagName || '').toLowerCase()
                if (['button', 'input', 'select', 'textarea', 'option', 'a'].includes(tag)) return
                onSelectWidget?.({ type: 'chart', id: c.id })
              }}
            >
              <div className="flex justify-between items-center gap-2 mb-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <h3
                    className="text-xl font-medium"
                    style={{
                      color: DARK_CHART_TITLE,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {c.title || c.id}
                  </h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {(c.type === 'bar' || c.type === 'line' || c.type === 'pie' || c.type === 'area' || c.type === 'stacked_bar' || c.type === 'stacked_area' || c.type === 'grouped_bar' || c.type === 'radial_bar' || c.type === 'scatter') && (
                    <>
                      {c.type === 'bar' && onChartOptionChange && (
                        <>
                          <select
                            value={(c.limit ?? (c.aggregation === 'count' ? 30 : 10)) >= BAR_LIMIT_ALL ? 'all' : (c.limit ?? (c.aggregation === 'count' ? 30 : 10))}
                            onChange={(e) => {
                              const v = e.target.value
                              onChartOptionChange(c.id, { limit: v === 'all' ? BAR_LIMIT_ALL : Number(v) })
                            }}
                            className="text-sm px-2 py-1 rounded border border-gray-300 bg-white text-gray-700"
                            title="Show top N items"
                          >
                            {BAR_LIMIT_OPTIONS.map((n) => (
                              <option key={n} value={n}>Top {n}</option>
                            ))}
                            <option value="all">All</option>
                          </select>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenBarFilterChartId((id) => (id === c.id ? null : c.id))}
                              className={`text-sm px-2 py-1 rounded border text-gray-600 ${openBarFilterChartId === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                              title="Filter by category"
                            >
                              Filter
                            </button>
                            {openBarFilterChartId === c.id && (
                              <BarChartFilterPopover
                                chartId={c.id}
                                dimension={c.xField || c.dimension}
                                metric={c.yField || c.metric}
                                detailField={c.detailField}
                                aggregation={c.aggregation}
                                filteredData={filteredData}
                                categoryFilter={c.categoryFilter}
                                onChartOptionChange={onChartOptionChange}
                                onClose={() => setOpenBarFilterChartId(null)}
                                theme={theme}
                              />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onChartOptionChange(c.id, { orientation: c.orientation === 'vertical' ? 'horizontal' : 'vertical' })}
                            className="text-sm px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
                            title={c.orientation === 'vertical' ? 'Switch to horizontal bars' : 'Switch to vertical bars'}
                          >
                            Rotate
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = (c.labelAngle === 90 ? 0 : (c.labelAngle ?? 0) + 45)
                              onChartOptionChange(c.id, { labelAngle: next })
                            }}
                            className="text-sm px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
                            title="Rotate axis labels (0° → 45° → 90°)"
                          >
                            Rotate labels
                          </button>
                          <select
                            value={c.barStyle ?? styleOpts.barStyle ?? 'sheen'}
                            onChange={(e) => onChartOptionChange(c.id, { barStyle: e.target.value })}
                            className="text-sm px-2 py-1 rounded border border-gray-300 bg-white text-gray-700"
                            title="Bar style"
                          >
                            {BAR_STYLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </>
                      )}
                      {c.type === 'pie' && onChartOptionChange && (
                        <>
                          <select
                            value={(c.limit ?? 8) >= BAR_LIMIT_ALL ? 'all' : (c.limit ?? 8)}
                            onChange={(e) => {
                              const v = e.target.value
                              onChartOptionChange(c.id, { limit: v === 'all' ? BAR_LIMIT_ALL : Number(v) })
                            }}
                            className="text-sm px-2 py-1 rounded border border-gray-300 bg-white text-gray-700"
                            title="Show top N slices"
                          >
                            {PIE_LIMIT_OPTIONS.map((n) => (
                              <option key={n} value={n}>Top {n}</option>
                            ))}
                            <option value="all">All</option>
                          </select>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenPieFilterChartId((id) => (id === c.id ? null : c.id))}
                              className={`text-sm px-2 py-1 rounded border text-gray-600 ${openPieFilterChartId === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                              title="Filter by category"
                            >
                              Filter
                            </button>
                            {openPieFilterChartId === c.id && (
                              <BarChartFilterPopover
                                chartId={c.id}
                                dimension={c.dimension || c.xField}
                                metric={c.metric || c.yField}
                                detailField={null}
                                aggregation={c.aggregation}
                                filteredData={filteredData}
                                categoryFilter={c.categoryFilter}
                                onChartOptionChange={onChartOptionChange}
                                onClose={() => setOpenPieFilterChartId(null)}
                                theme={theme}
                              />
                            )}
                          </div>
                          <select
                            value={c.pieStyle ?? 'pie'}
                            onChange={(e) => onChartOptionChange(c.id, { pieStyle: e.target.value })}
                            className="text-sm px-2 py-1 rounded border border-gray-300 bg-white text-gray-700"
                            title="Pie style"
                          >
                            <option value="pie">Pie</option>
                            <option value="donut">Donut</option>
                          </select>
                        </>
                      )}
                    </>
                  )}
                  {onRemoveWidget && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWidget(c.id, 'chart')}
                      className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-red-600 hover:bg-red-50"
                      title="Remove widget"
                      aria-label="Remove widget"
                    >
                      <span className="text-lg leading-none">×</span>
                    </button>
                  )}
                </div>
              </div>
              {(() => {
                const sr = getSingleRowValueLabel(c, filteredData)
                return sr ? (
                  <p className="text-base font-medium mb-2" style={{ color: DARK_CHART_SUBTITLE }}>
                    {sr.label}: {sr.value}
                  </p>
                ) : null
              })()}
              {((c.type === 'bar' || c.type === 'line' || c.type === 'area' || c.type === 'stacked_bar' || c.type === 'stacked_area' || c.type === 'grouped_bar' || c.type === 'radial_bar' || c.type === 'scatter') && (c.yField || c.metric)) && (
                <p className="text-base mb-2" style={{ color: DARK_CHART_SUBTITLE }}>{getMeasureLabel(c)}</p>
              )}
              {c.type === 'pie' && (c.metric || c.yField) && (
                <p className="text-base mb-2" style={{ color: DARK_CHART_SUBTITLE }}>{getMeasureLabel(c)}</p>
              )}
              {c.type === 'kpi' && (
                <div className="text-3xl font-semibold" style={{ color: DARK_CHART_TITLE }}>
                  {formatCompact(aggregate(filteredData, c.field || c.metric, c.aggregation || 'sum'))}
                </div>
              )}
              {c.type === 'table' &&
                renderTableChart(c, filteredData || [], tableColumnKeys)}
              {c.type === 'line' && (
                <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0}>
                  <LineChart
                    data={lineChartData(filteredData, c.xField, c.yField, c.aggregation || 'sum')}
                    margin={chartMarginStandard}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                    <XAxis dataKey="name" tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }} />
                    <YAxis
                      width={96}
                      tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                      formatter={(val) => [formatCompact(Array.isArray(val) ? val[0] : val), c.yField || 'Value']}
                      labelFormatter={(label) => String(label)}
                    />
                    {c.referenceLine?.value != null && (
                      <ReferenceLine y={c.referenceLine.value} stroke="#ef4444" strokeDasharray="3 3" label={c.referenceLine.label || 'Target'} />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={chartColorsFor(c)[0]}
                      strokeWidth={2}
                      dot={{ r: 4, cursor: 'pointer' }}
                      activeDot={{ r: 6, cursor: 'pointer' }}
                      onClick={(point) => point?.name != null && handleChartClick(c.xField, point.name)}
                    >
                      {(c.showDataLabels !== false) && <LabelList position="top" formatter={(v) => formatCompact(v)} style={{ fontSize: chartDataLabelFontSize, fill: DARK_DATA_LABEL_FILL, ...chartTextStyle }} />}
                    </Line>
                  </LineChart>
                </ChartPlotFrame>
              )}
              {c.type === 'area' && (
                <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0}>
                  <AreaChart
                    data={lineChartData(filteredData, c.xField, c.yField, c.aggregation || 'sum')}
                    margin={chartMarginStandard}
                  >
                    <defs>
                      <linearGradient id={`area-fill-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColorsFor(c)[0]} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={chartColorsFor(c)[0]} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                    <XAxis dataKey="name" tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }} />
                    <YAxis
                      width={96}
                      tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }}
                      tickFormatter={(v) => formatCompact(v)}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                      formatter={(val) => [formatCompact(Array.isArray(val) ? val[0] : val), c.yField || 'Value']}
                    />
                    {c.referenceLine?.value != null && (
                      <ReferenceLine y={c.referenceLine.value} stroke="#ef4444" strokeDasharray="3 3" label={c.referenceLine.label || 'Target'} />
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={chartColorsFor(c)[0]}
                      strokeWidth={2}
                      fill={`url(#area-fill-${c.id})`}
                      onClick={(data) => data?.name != null && handleChartClick(c.xField, data.name)}
                    >
                      {(c.showDataLabels !== false) && <LabelList position="top" formatter={(v) => formatCompact(v)} style={{ fontSize: chartDataLabelFontSize, fill: DARK_DATA_LABEL_FILL, ...chartTextStyle }} />}
                    </Area>
                  </AreaChart>
                </ChartPlotFrame>
              )}
              {c.type === 'bar' && (() => {
                const barLimit = c.limit ?? (c.aggregation === 'count' ? 30 : 10)
                const dim = c.xField || c.dimension
                const met = c.yField || c.metric
                const fullBarData = c.detailField
                  ? groupByWithDetails(filteredData, dim, met, c.detailField, BAR_LIMIT_ALL, c.aggregation)
                  : groupBy(filteredData, dim, met, BAR_LIMIT_ALL, c.aggregation)
                const barData =
                  c.categoryFilter && c.categoryFilter.length > 0
                    ? fullBarData.filter((d) => c.categoryFilter.includes(d.name))
                    : fullBarData.slice(0, barLimit)
                const hasDetails = c.detailField && barData.some((d) => d.details && d.details.length > 0)
                const labelAngle = c.labelAngle ?? 0
                const isVertical = c.orientation === 'vertical'
                const categoryTick = (axis) => ({
                  fontSize: chartTickFontSize,
                  ...chartTextStyle,
                  fill: chartTheme.tickFill,
                  ...(axis === 'x' && isVertical && labelAngle !== 0 ? { angle: -labelAngle, textAnchor: 'end' } : {}),
                  ...(axis === 'y' && !isVertical && labelAngle !== 0 ? { angle: -labelAngle, textAnchor: 'end' } : {})
                })
                const bottomMargin = isVertical && labelAngle > 0 ? (labelAngle === 90 ? 100 : 80) : 60
                const leftMargin = !isVertical && labelAngle > 0 ? 160 : 140
                const effectiveBarStyle = c.barStyle ?? styleOpts.barStyle ?? 'sheen'
                const barFill =
                  effectiveBarStyle === 'sheen'
                    ? `url(#bar-fill-${c.id})`
                    : effectiveBarStyle === 'gradient'
                      ? `url(#bar-gradient-${c.id})`
                      : effectiveBarStyle === 'outline'
                        ? 'transparent'
                        : chartColorsFor(c)[0]
                const barRadius = effectiveBarStyle === 'rounded' ? (isVertical ? [10, 10, 0, 0] : [0, 10, 10, 0]) : (isVertical ? [4, 4, 0, 0] : [0, 4, 4, 0])
                const barStroke = effectiveBarStyle === 'outline' ? chartColorsFor(c)[0] : undefined
                const barStrokeWidth = effectiveBarStyle === 'outline' ? 2 : undefined
                return (
                  <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0}>
                        <BarChart
                          data={barData}
                          layout={isVertical ? undefined : 'vertical'}
                          margin={isVertical ? { bottom: bottomMargin, right: 20 } : { left: leftMargin, right: 90 }}
                        >
                          <defs>
                            {effectiveBarStyle === 'sheen' && <BarSheenGradient id={`bar-fill-${c.id}`} baseColor={chartColorsFor(c)[0]} />}
                            {effectiveBarStyle === 'gradient' && <BarVerticalGradient id={`bar-gradient-${c.id}`} baseColor={chartColorsFor(c)[0]} />}
                            {effectiveBarStyle === 'sheen' && <BarSheenShadowFilter id="nm2-bar-sheen-shadow" />}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis
                            type={isVertical ? 'category' : 'number'}
                            dataKey={isVertical ? 'name' : undefined}
                            tick={isVertical ? categoryTick('x') : { fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }}
                            tickFormatter={isVertical ? undefined : (v) => formatCompact(v)}
                          />
                          <YAxis
                            type={isVertical ? 'number' : 'category'}
                            dataKey={isVertical ? undefined : 'name'}
                            width={isVertical ? 0 : 120}
                            tick={!isVertical ? categoryTick('y') : { fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }}
                            tickFormatter={isVertical ? (v) => formatCompact(v) : undefined}
                            label={isVertical ? { value: getMeasureLabel(c), angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: chartAxisLabelFontSize, ...chartTextStyle } } : undefined}
                          />
                          <Tooltip
                            contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText, maxWidth: 360 }}
                            formatter={(val, name, props) => {
                              const row = props?.payload
                              const detailLabel = c.detailField || 'Details'
                              if (hasDetails && row?.details?.length) {
                                const detailStr = row.details.length > 8 ? `${row.details.slice(0, 8).join(', ')}…` : row.details.join(', ')
                                return [formatCompact(Array.isArray(val) ? val[0] : val), `${c.yField || c.metric || 'Value'} · ${detailLabel}: ${detailStr}`]
                              }
                              return [formatCompact(Array.isArray(val) ? val[0] : val), c.yField || c.metric || 'Value']
                            }}
                            labelFormatter={(label) => String(label)}
                          />
                          {c.referenceLine?.value != null && (
                            <ReferenceLine
                              x={c.orientation === 'vertical' ? undefined : c.referenceLine.value}
                              y={c.orientation === 'vertical' ? c.referenceLine.value : undefined}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                              label={c.referenceLine.label || 'Target'}
                            />
                          )}
                          <Bar
                            dataKey="value"
                            fill={barFill}
                            radius={barRadius}
                            stroke={barStroke}
                            strokeWidth={barStrokeWidth}
                            cursor="pointer"
                            isAnimationActive
                            onClick={(data) => data?.name != null && handleChartClick(c.xField || c.dimension, data.name)}
                            shape={effectiveBarStyle === 'sheen' ? (p) => <SheenBarShape {...p} baseColor={chartColorsFor(c)[0]} /> : undefined}
                          >
                            {(c.showDataLabels !== false) && (
                              <LabelList
                                position={c.orientation === 'vertical' ? 'top' : 'right'}
                                style={{ fontSize: chartDataLabelFontSize, fill: DARK_DATA_LABEL_FILL, ...chartTextStyle }}
                                formatter={(v, props) => {
                                  const payload = props?.payload
                                  if (hasDetails && payload?.details?.length && payload.details.length <= 5) {
                                    return `${formatCompact(v)} (${payload.details.join(', ')})`
                                  }
                                  return formatCompact(v)
                                }}
                              />
                            )}
                          </Bar>
                        </BarChart>
                  </ChartPlotFrame>
                )
              })()}
              {c.type === 'stacked_bar' && c.stackField && (() => {
                const stackedData = groupByStacked(filteredData, c.xField || c.dimension, c.stackField, c.yField || c.metric, c.limit ?? 10)
                const stackKeys = stackedData.length ? Object.keys(stackedData[0]).filter((k) => k !== 'name') : []
                const colors = chartColorsFor(c)
                const useSheen = useBarSheenFor(c)
                return (
                  <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0 && stackKeys.length > 0}>
                        <BarChart data={stackedData} margin={{ ...chartMarginTight, right: 90, bottom: 60 }}>
                          <defs>
                            {useSheen && stackKeys.map((key, i) => (
                              <BarSheenGradient key={key} id={`stacked-sheen-${c.id}-${i}`} baseColor={colors[i % colors.length]} />
                            ))}
                            {useSheen && <BarSheenShadowFilter id="nm2-bar-sheen-shadow" />}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis dataKey="name" tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }} />
                          <YAxis
                            width={96}
                            tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }}
                            tickFormatter={(v) => formatCompact(v)}
                          />
                          <Tooltip contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }} formatter={(val) => formatCompact(val)} />
                          <Legend />
                          {stackKeys.map((key, i) => (
                            <Bar
                              key={key}
                              dataKey={key}
                              stackId="stack"
                              fill={useSheen ? `url(#stacked-sheen-${c.id}-${i})` : colors[i % colors.length]}
                              name={key}
                              radius={[0, 0, 0, 0]}
                              shape={useSheen ? (p) => <SheenBarShape {...p} baseColor={colors[i % colors.length]} /> : undefined}
                            >
                              {(c.showDataLabels !== false) && <LabelList position="center" formatter={(v) => formatCompact(v)} style={{ fontSize: chartDataLabelFontSize, fill: DARK_DATA_LABEL_FILL, ...chartTextStyle }} />}
                            </Bar>
                          ))}
                        </BarChart>
                  </ChartPlotFrame>
                )
              })()}
              {c.type === 'grouped_bar' && c.stackField && (() => {
                const groupedData = groupByStacked(filteredData, c.xField || c.dimension, c.stackField, c.yField || c.metric, c.limit ?? 12)
                const groupKeys = groupedData.length ? Object.keys(groupedData[0]).filter((k) => k !== 'name') : []
                const colors = chartColorsFor(c)
                const useSheen = useBarSheenFor(c)
                return (
                  <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0 && groupKeys.length > 0}>
                        <BarChart data={groupedData} margin={{ ...chartMarginTight, right: 90, bottom: 60 }}>
                          <defs>
                            {useSheen && groupKeys.map((key, i) => (
                              <BarSheenGradient key={key} id={`grouped-sheen-${c.id}-${i}`} baseColor={colors[i % colors.length]} />
                            ))}
                            {useSheen && <BarSheenShadowFilter id="nm2-bar-sheen-shadow" />}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis dataKey="name" tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }} />
                          <YAxis
                            width={96}
                            tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }}
                            tickFormatter={(v) => formatCompact(v)}
                          />
                          <Tooltip contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }} formatter={(val) => formatCompact(val)} />
                          <Legend />
                          {groupKeys.map((key, i) => (
                            <Bar
                              key={key}
                              dataKey={key}
                              fill={useSheen ? `url(#grouped-sheen-${c.id}-${i})` : colors[i % colors.length]}
                              name={key}
                              radius={[4, 4, 0, 0]}
                              isAnimationActive
                              shape={useSheen ? (p) => <SheenBarShape {...p} baseColor={colors[i % colors.length]} /> : undefined}
                            >
                              {(c.showDataLabels !== false) && <LabelList position="top" formatter={(v) => formatCompact(v)} style={{ fontSize: chartDataLabelFontSize, fill: DARK_DATA_LABEL_FILL, ...chartTextStyle }} />}
                            </Bar>
                          ))}
                        </BarChart>
                  </ChartPlotFrame>
                )
              })()}
              {c.type === 'radial_bar' && (() => {
                const barLimit = c.limit ?? (c.aggregation === 'count' ? 12 : 8)
                const radialRaw = groupBy(filteredData, c.xField || c.dimension, c.yField || c.metric, barLimit, c.aggregation)
                const maxV = radialRaw.length ? Math.max(...radialRaw.map((d) => d.value)) : 0
                const radialData = radialRaw.map((d, i) => ({
                  name: d.name,
                  value: d.value,
                  fill: maxV ? (d.value / maxV) * 100 : 0,
                  color: chartColorsFor(c)[i % chartColorsFor(c).length]
                }))
                return (
                  <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0 && radialData.length > 0}>
                        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                          <RadialBar
                            background
                            dataKey="fill"
                            cornerRadius={8}
                            clockWise
                            minAngle={4}
                            onClick={(data) => data?.name != null && handleChartClick(c.xField || c.dimension, data.name)}
                          >
                            {radialData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                            ))}
                            <LabelList position="center" formatter={(v, props) => formatCompact((props.payload?.value) ?? v)} style={{ fontSize: chartDataLabelFontSize, fill: DARK_DATA_LABEL_FILL, ...chartTextStyle }} />
                          </RadialBar>
                          <Tooltip
                            contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                            formatter={(val, name, props) => [formatCompact((props.payload?.value) ?? val), (props.payload?.name) ?? (c.xField || c.dimension || 'Category')]}
                          />
                          <Legend />
                        </RadialBarChart>
                  </ChartPlotFrame>
                )
              })()}
              {c.type === 'stacked_area' && c.stackField && (() => {
                const stackedData = groupByStacked(filteredData, c.xField, c.stackField, c.yField || c.metric, c.limit ?? 15)
                const stackKeys = stackedData.length ? Object.keys(stackedData[0]).filter((k) => k !== 'name') : []
                return (
                  <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0 && stackKeys.length > 0}>
                        <AreaChart data={stackedData} margin={{ ...chartMarginTight, right: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis dataKey="name" tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }} />
                          <YAxis
                            width={96}
                            tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }}
                            tickFormatter={(v) => formatCompact(v)}
                          />
                          <Tooltip contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }} formatter={(val) => formatCompact(val)} />
                          <Legend />
                          {stackKeys.map((key, i) => (
                            <Area key={key} type="monotone" dataKey={key} stackId="stack" stroke={chartColorsFor(c)[i % chartColorsFor(c).length]} fill={chartColorsFor(c)[i % chartColorsFor(c).length]} fillOpacity={0.6} name={key} />
                          ))}
                        </AreaChart>
                  </ChartPlotFrame>
                )
              })()}
              {c.type === 'scatter' && (
                <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0}>
                      <ScatterChart margin={{ left: 20, right: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                        <XAxis type="number" dataKey="x" name={c.xField} tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }} tickFormatter={(v) => formatCompact(v)} />
                        <YAxis type="number" dataKey="y" name={c.yField} tick={{ fontSize: chartTickFontSize, fill: chartTheme.tickFill, ...chartTextStyle }} tickFormatter={(v) => formatCompact(v)} label={{ value: c.yField || 'Y', angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: chartAxisLabelFontSize, ...chartTextStyle } }} />
                        <Tooltip
                          contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                          formatter={(val, name, props) => {
                            const p = props?.payload
                            if (!p) return [val, name]
                            return [`${c.xField || 'X'}: ${formatCompact(p.x)} · ${c.yField || 'Y'}: ${formatCompact(p.y)}`, '']
                          }}
                        />
                        <Scatter data={scatterData(filteredData, c.xField, c.yField)} fill={chartColorsFor(c)[0]} fillOpacity={0.7} />
                      </ScatterChart>
                </ChartPlotFrame>
              )}
              {c.type === 'pie' && (() => {
                const fullPieData = groupBy(filteredData, c.dimension || c.xField, c.metric || c.yField, BAR_LIMIT_ALL, c.aggregation)
                const pieData = (c.categoryFilter?.length)
                  ? fullPieData.filter((d) => c.categoryFilter.includes(d.name))
                  : fullPieData.slice(0, c.limit ?? 8)
                const isDonut = c.pieStyle === 'donut'
                return (
                  <ChartPlotFrame plotHeight={plotPx} hasData={filteredData.length > 0}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius="80%"
                            innerRadius={isDonut ? '55%' : 0}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            cursor="pointer"
                            onClick={(data) => data?.name != null && handleChartClick(c.dimension || c.xField, data.name)}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={chartColorsFor(c)[i % chartColorsFor(c).length]} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                            formatter={(val) => [formatCompact(Array.isArray(val) ? val[0] : val), c.metric || c.yField || 'Value']}
                          />
                          {c.showLegend !== false && <Legend />}
                        </PieChart>
                  </ChartPlotFrame>
                )
              })()}
            </div>
            )
          })}
              </GridLayout>
              )}
            </div>
          )}
        </div>
      )}

      {(!currentSpec?.charts || currentSpec.charts.length === 0) && (!currentSpec?.kpis || currentSpec.kpis.length === 0) && (
        <div className="p-8 text-center text-gray-500 text-base rounded-lg border border-dashed border-gray-300">
          No charts or KPIs in spec. Try refining your prompt.
        </div>
      )}

      {/* Report watermark */}
      <div className={`pt-4 pb-1 text-center text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
        NM2TECH – Analytics Short
      </div>
    </div>
  )
}

export default memo(DashboardRenderer)
