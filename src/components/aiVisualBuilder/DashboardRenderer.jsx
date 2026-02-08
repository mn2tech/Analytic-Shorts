/**
 * Renders a DashboardSpec with filters, KPIs, and charts.
 * Uses row-based layout and Recharts. Handles empty results gracefully.
 * Date range filters use a dual-thumb date slider.
 */

import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import GridLayout, { WidthProvider } from 'react-grid-layout/legacy'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

const ResponsiveGridLayout = WidthProvider(GridLayout)
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

// Format number for display (currency, percent, decimals)
function formatValue(val, format = {}) {
  if (val == null || Number.isNaN(val)) return '—'
  const num = Number(val)
  const { type, decimals = 2, prefix = '', suffix = '' } = typeof format === 'object' ? format : {}
  let s = num
  if (type === 'currency') {
    s = num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    return (prefix || '$') + s + (suffix || '')
  }
  if (type === 'percent') {
    s = (num * 100).toFixed(decimals) + '%'
    return prefix + s + suffix
  }
  // Use locale grouping for large integers so labels don't get cut off and are readable (e.g. 914,100)
  if (num % 1 === 0 && Math.abs(num) >= 1000) {
    s = num.toLocaleString('en-US', { maximumFractionDigits: 0 })
  } else {
    s = num % 1 === 0 ? String(num) : num.toFixed(decimals ?? 2)
  }
  return prefix + s + suffix
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
const ROW_HEIGHT = 100
const KPI_DEFAULT_W = 3
const KPI_DEFAULT_H = 1
const CHART_DEFAULT_W = 7
const CHART_DEFAULT_H = 5

function buildDefaultLayout(spec) {
  const layout = []
  let y = 0
  const kpis = spec?.kpis || []
  const charts = spec?.charts || []
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
  charts.forEach((c, idx) => {
    const col = (idx % 2) * CHART_DEFAULT_W
    const row = y + Math.floor(idx / 2) * CHART_DEFAULT_H
    layout.push({ i: c.id, x: col, y: row, w: CHART_DEFAULT_W, h: CHART_DEFAULT_H, minW: 2, minH: 2 })
  })
  return layout
}

function isGridLayout(layout) {
  return Array.isArray(layout) && layout.length > 0 && layout.every((item) => item && typeof item.i === 'string' && typeof item.x === 'number' && typeof item.y === 'number' && typeof item.w === 'number' && typeof item.h === 'number')
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']
const CHART_COLORS_MINIMAL = ['#4b5563', '#6b7280', '#9ca3af', '#374151', '#6b7280', '#9ca3af', '#4b5563', '#6b7280']
const CHART_COLORS_PASTEL = ['#93c5fd', '#c4b5fd', '#f9a8d4', '#fcd34d', '#6ee7b7', '#fca5a5', '#a5b4fc', '#67e8f9']
const CHART_TICK_FONT_SIZE = 16
const CHART_AXIS_LABEL_FONT_SIZE = 14
const CHART_DATA_LABEL_FONT_SIZE = 18

// Sheen/gloss gradient for bars: diagonal highlight streak (state-of-the-art look)
function BarSheenGradient({ id, baseColor = CHART_COLORS[0] }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
      <stop offset="28%" stopColor={baseColor} stopOpacity={0.95} />
      <stop offset="35%" stopColor="rgba(255,255,255,0.5)" stopOpacity={1} />
      <stop offset="42%" stopColor="rgba(255,255,255,0.2)" stopOpacity={1} />
      <stop offset="55%" stopColor={baseColor} stopOpacity={0.92} />
      <stop offset="100%" stopColor={baseColor} stopOpacity={0.85} />
    </linearGradient>
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

// Group by dimension for bar/pie; when aggregation is 'count', count rows per dimension instead of summing metric
function groupBy(data, dimension, metric, limit = 10, aggregation = 'sum') {
  if (!data || data.length === 0) return []
  const map = new Map()
  const isCount = aggregation === 'count'
  for (const row of data) {
    const key = String(row[dimension] ?? '')
    const val = isCount ? 1 : parseNumericValue(row[metric])
    map.set(key, (map.get(key) || 0) + val)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Group by dimension with a list of detail values per group (e.g. Team -> wins + list of years)
function groupByWithDetails(data, dimension, metric, detailField, limit = 10, aggregation = 'sum') {
  if (!data || data.length === 0) return []
  const map = new Map()
  const isCount = aggregation === 'count'
  for (const row of data) {
    const key = String(row[dimension] ?? '')
    const val = isCount ? 1 : parseNumericValue(row[metric])
    const detail = row[detailField]
    if (!map.has(key)) map.set(key, { value: 0, details: [] })
    const rec = map.get(key)
    rec.value += val
    if (detail != null && detail !== '') rec.details.push(String(detail))
  }
  return Array.from(map.entries())
    .map(([name, { value, details }]) => ({ name, value, details: details.sort((a, b) => Number(a) - Number(b) || String(a).localeCompare(b)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

// Line chart: group by date (xField), sum yField
function lineChartData(data, xField, yField) {
  if (!data || data.length === 0) return []
  const map = new Map()
  for (const row of data) {
    const key = row[xField] != null ? String(row[xField]) : ''
    const val = parseNumericValue(row[yField])
    map.set(key, (map.get(key) || 0) + val)
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
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

// Extended year range for date sliders when data is year-like (e.g. Super Bowl 1967–2025)
const DATE_RANGE_YEAR_FLOOR = 1966
const DATE_RANGE_YEAR_CEILING = 2025

// Date range slider: dual-thumb slider for min/max date from data; extends to 1966–2025 when field is year-like
function DateRangeSliderInline({ data, field, value, onChange, theme }) {
  const dateRange = useMemo(() => {
    if (!data?.length || !field) return { min: '', max: '', minTs: 0, maxTs: 0 }
    let minTs = Infinity
    let maxTs = -Infinity
    let hasYearLikeValue = false
    for (const row of data) {
      const raw = row[field]
      const num = Number(raw)
      if (!Number.isNaN(num) && num >= 1900 && num <= 2100 && num % 1 === 0) hasYearLikeValue = true
      const t = valueToTimestamp(raw)
      if (!Number.isNaN(t)) {
        if (t < minTs) minTs = t
        if (t > maxTs) maxTs = t
      }
    }
    if (minTs === Infinity || maxTs === -Infinity) return { min: '', max: '', minTs: 0, maxTs: 0 }
    // When data has year-like values, extend slider range so user can select full picture (e.g. 1966–2025)
    if (hasYearLikeValue) {
      const floorTs = new Date(DATE_RANGE_YEAR_FLOOR, 0, 1).getTime()
      const ceilingTs = new Date(DATE_RANGE_YEAR_CEILING, 0, 1).getTime()
      minTs = Math.min(minTs, floorTs)
      maxTs = Math.max(maxTs, ceilingTs)
    }
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
      <div className={`text-sm mb-0.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
        {formatDate(startVal)} – {formatDate(endVal)}
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
          onMouseDown={(e) => { e.preventDefault(); setDragging('start') }}
          title={formatDate(startVal)}
        />
        <div
          className={`absolute w-4 h-4 ${thumbBg} rounded-full shadow cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1 top-1/2 border-2 border-white`}
          style={{ left: `${endPercent}%`, zIndex: 21 }}
          onMouseDown={(e) => { e.preventDefault(); setDragging('end') }}
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

export default function DashboardRenderer({ spec, data, filterValues, onFilterChange, onLayoutChange, onRemoveWidget, onChartOptionChange }) {
  const [localFilters, setLocalFilters] = useState({})
  const [chartFilter, setChartFilter] = useState(null)
  const [openBarFilterChartId, setOpenBarFilterChartId] = useState(null)
  const [openPieFilterChartId, setOpenPieFilterChartId] = useState(null)
  const [insightCollapsed, setInsightCollapsed] = useState(false)
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const chartRefs = useRef({})

  const filterState = useMemo(() => ({ ...localFilters, ...filterValues }), [localFilters, filterValues])

  const [exportError, setExportError] = useState(null)
  const handleExportChart = useCallback(async (chartId, title) => {
    setExportError(null)
    const el = chartRefs.current[chartId]
    if (!el) {
      setExportError('Chart not ready. Try again in a moment.')
      return
    }
    const filename = `${(title || chartId).replace(/[^a-z0-9-_]/gi, '_')}.png`

    const trySvgExport = () => {
      const svg = el.querySelector('svg')
      if (!svg) return Promise.resolve(false)
      return new Promise((resolve, reject) => {
        try {
          const bbox = svg.getBBox()
          const attrW = svg.getAttribute('width')
          const attrH = svg.getAttribute('height')
          const numW = attrW != null ? parseFloat(attrW, 10) : NaN
          const numH = attrH != null ? parseFloat(attrH, 10) : NaN
          const container = svg.parentElement
          const cw = container?.offsetWidth || el.offsetWidth
          const ch = container?.offsetHeight || el.offsetHeight
          const w = Math.max(1, bbox.width || (Number.isFinite(numW) ? numW : svg.width?.baseVal?.value) || cw || 800)
          const h = Math.max(1, bbox.height || (Number.isFinite(numH) ? numH : svg.height?.baseVal?.value) || ch || 400)
          const clone = svg.cloneNode(true)
          clone.setAttribute('width', w)
          clone.setAttribute('height', h)
          if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
          const svgData = new XMLSerializer().serializeToString(clone)
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          const img = new Image()
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas')
              canvas.width = w
              canvas.height = h
              const ctx = canvas.getContext('2d')
              ctx.fillStyle = '#ffffff'
              ctx.fillRect(0, 0, w, h)
              ctx.drawImage(img, 0, 0)
              URL.revokeObjectURL(url)
              canvas.toBlob((b) => {
                if (b) saveAs(b, filename)
                else setExportError('Export failed.')
                resolve(true)
              }, 'image/png')
            } catch (e) {
              URL.revokeObjectURL(url)
              reject(e)
            }
          }
          img.onerror = () => {
            URL.revokeObjectURL(url)
            reject(new Error('SVG load failed'))
          }
          img.src = url
        } catch (e) {
          reject(e)
        }
      })
    }

    try {
      const usedSvg = await trySvgExport()
      if (!usedSvg) {
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
        canvas.toBlob((blob) => {
          if (blob) saveAs(blob, filename)
          else setExportError('Export failed.')
        }, 'image/png')
      }
    } catch (e) {
      console.error('Export chart failed:', e)
      setExportError(e?.message || 'Export failed. Try again.')
    }
  }, [])

  const [layout, setLayout] = useState(() => (spec && isGridLayout(spec.layout) ? spec.layout : buildDefaultLayout(spec)))
  useEffect(() => {
    if (!spec) return
    if (isGridLayout(spec.layout)) {
      setLayout(spec.layout)
    } else {
      setLayout(buildDefaultLayout(spec))
    }
  }, [spec])
  const handleLayoutChange = useCallback(
    (newLayout) => {
      setLayout(newLayout)
      onLayoutChange?.(newLayout)
    },
    [onLayoutChange]
  )

  const handleRemoveWidget = useCallback(
    (id, type) => {
      const newLayout = layout.filter((item) => item.i !== id)
      setLayout(newLayout)
      onLayoutChange?.(newLayout)
      onRemoveWidget?.(id, type)
    },
    [layout, onLayoutChange, onRemoveWidget]
  )

  const baseFilteredData = useMemo(
    () => applyFilters(data, spec?.filters || [], filterState),
    [data, spec?.filters, filterState]
  )
  const filteredData = useMemo(() => {
    if (!chartFilter?.field) return baseFilteredData
    const firstRow = baseFilteredData?.[0]
    return applyChartFilter(baseFilteredData, chartFilter, firstRow)
  }, [baseFilteredData, chartFilter])

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
  const chartFmt = (c) => (c.format && typeof c.format === 'object' ? c.format : {})
  const styleOpts = spec.style || {}
  const chartColors = styleOpts.palette === 'minimal' ? CHART_COLORS_MINIMAL : styleOpts.palette === 'pastel' ? CHART_COLORS_PASTEL : CHART_COLORS
  const useBarSheen = styleOpts.barStyle !== 'flat'

  // Insight explaining the dashboard: use spec.insight or auto-generate from title/kpis/charts
  const insightText =
    spec.insight && String(spec.insight).trim()
      ? String(spec.insight).trim()
      : (() => {
          const title = spec.title ? String(spec.title).trim() : 'your data'
          const kpis = spec.kpis || []
          const charts = spec.charts || []
          const k = kpis.length
          const c = charts.length
          const parts = [`This dashboard shows ${title}.`]
          if (k > 0 || c > 0) {
            const items = []
            if (k > 0) items.push(`${k} KPI${k !== 1 ? 's' : ''}`)
            if (c > 0) items.push(`${c} chart${c !== 1 ? 's' : ''}`)
            parts.push(` It includes ${items.join(' and ')}.`)
          }
          parts.push(' Use the filters to narrow the view; click a bar, pie segment, or line point to cross-filter the whole dashboard.')
          return parts.join('')
        })()

  return (
    <div className="space-y-6">
      {spec.warnings && spec.warnings.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-base">
          {spec.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}
      {exportError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between gap-2">
          <span>{exportError}</span>
          <button type="button" onClick={() => setExportError(null)} className="shrink-0 text-red-600 hover:text-red-800" aria-label="Dismiss">×</button>
        </div>
      )}

      {/* Insight explaining the dashboard — collapsible */}
      <div className={`rounded-lg border ${cardClass}`}>
        <button
          type="button"
          onClick={() => setInsightCollapsed((c) => !c)}
          className={`flex w-full items-center gap-3 p-4 text-left hover:opacity-90 ${insightCollapsed ? 'rounded-lg' : 'rounded-t-lg'}`}
          aria-expanded={!insightCollapsed}
        >
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-600'}`} aria-hidden>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`text-sm font-semibold flex-1 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>Insight</h3>
          <span className={`text-gray-500 text-lg leading-none ${theme === 'dark' ? 'text-gray-400' : ''}`} aria-hidden>
            {insightCollapsed ? '▶' : '▼'}
          </span>
        </button>
        {!insightCollapsed && (
          <div className="px-4 pb-4 pt-0 flex gap-3">
            <div className="flex-shrink-0 w-8" aria-hidden />
            <p className={`text-sm leading-relaxed min-w-0 flex-1 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>{insightText}</p>
          </div>
        )}
      </div>

      {/* Hint: charts are clickable for cross-filtering */}
      {((spec.charts || []).some((ch) => ['bar', 'pie', 'line', 'area', 'stacked_bar', 'stacked_area'].includes(ch.type))) && (
        <p className="text-sm text-gray-500">
          Click a bar, pie segment, line, or area to filter the whole dashboard; click again or use &quot;Clear selection&quot; to reset.
        </p>
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
      {spec.filters && spec.filters.length > 0 && (
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
                {spec.filters.map((f) => (
                  <div key={f.id} className={`flex flex-col gap-1 ${f.type === 'date_range' ? 'w-full min-w-0' : ''}`}>
                    <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{f.label || f.id}</label>
                    {f.type === 'date_range' && (
                      <DateRangeSliderInline
                        data={data}
                        field={f.field}
                        value={filterState[f.id]}
                        onChange={(v) => handleFilterChange(f.id, v)}
                        theme={theme}
                      />
                    )}
                {f.type === 'select' && (() => {
                  const firstRow = (data && data[0]) || {}
                  const field = resolveFieldName(firstRow, f.field) || f.field
                  const rawValues = (data || [])
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
                      className="w-28 px-3 py-2 border rounded text-base"
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
                      className="w-28 px-3 py-2 border rounded text-base"
                    />
                  </div>
                )}
              </div>
            ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dynamic grid: KPIs + Charts (draggable/resizable) */}
      {((spec.kpis && spec.kpis.length > 0) || (spec.charts && spec.charts.length > 0)) && (
        <ResponsiveGridLayout
          className="layout"
          layout={layout}
          onLayoutChange={handleLayoutChange}
          cols={GRID_COLS}
          rowHeight={ROW_HEIGHT}
          isDraggable
          isResizable
          compactType="vertical"
          preventCollision={false}
        >
          {(spec.kpis || []).map((k) => {
            const val = aggregate(filteredData, k.field, k.aggregation || 'sum')
            const fmt = k.format || {}
            return (
              <div key={k.id} className={`p-4 rounded-lg border ${cardClass} h-full overflow-auto relative group`}>
                {onRemoveWidget && (
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
                <div className="text-base text-gray-500">{k.label}</div>
                <div className="text-3xl font-semibold mt-1">
                  {formatValue(val, fmt)}
                </div>
              </div>
            )
          })}
          {(spec.charts || []).map((c) => (
            <div
              key={c.id}
              ref={(el) => { if (el != null) chartRefs.current[c.id] = el }}
              className={`p-4 rounded-lg border ${cardClass} h-full overflow-auto flex flex-col`}
            >
              <div className="flex justify-between items-center gap-2 mb-1">
                <h3 className="text-xl font-medium">{c.title || c.id}</h3>
                <div className="flex items-center gap-1">
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
                      <button
                        type="button"
                        onClick={() => handleExportChart(c.id, c.title || c.id)}
                        className="text-sm px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
                        title="Export chart as PNG"
                      >
                        Export
                      </button>
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
              {((c.type === 'bar' || c.type === 'line' || c.type === 'area' || c.type === 'stacked_bar' || c.type === 'stacked_area' || c.type === 'grouped_bar' || c.type === 'radial_bar' || c.type === 'scatter') && (c.yField || c.metric)) && (
                <p className="text-base text-gray-500 mb-2">{getMeasureLabel(c)}</p>
              )}
              {c.type === 'pie' && (c.metric || c.yField) && (
                <p className="text-base text-gray-500 mb-2">{getMeasureLabel(c)}</p>
              )}
              {c.type === 'kpi' && (
                <div className="text-3xl font-semibold">
                  {aggregate(filteredData, c.field || c.metric, c.aggregation || 'sum') ?? '—'}
                </div>
              )}
              {c.type === 'table' && (
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="min-w-full text-base">
                    <thead className="sticky top-0 bg-gray-100">
                      <tr>
                        {(c.columns || Object.keys(filteredData[0] || {})).map((col) => (
                          <th key={col} className="px-3 py-2 text-left font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(filteredData || []).slice(0, c.limit ?? 200).map((row, i) => (
                        <tr key={i} className="border-t">
                          {(c.columns || Object.keys(row)).map((col) => (
                            <td key={col} className="px-3 py-2">
                              {row[col] != null ? String(row[col]) : '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!filteredData || filteredData.length === 0) && (
                    <div className="p-4 text-center text-gray-500 text-base">No data</div>
                  )}
                </div>
              )}
              {c.type === 'line' && (
                <div className="flex-1 min-h-[320px]">
                  {filteredData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData(filteredData, c.xField, c.yField)}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                        <XAxis dataKey="name" tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} />
                        <YAxis tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} tickFormatter={(v) => formatValue(v, chartFmt(c))} label={{ value: getMeasureLabel(c), angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: CHART_AXIS_LABEL_FONT_SIZE } }} />
                        <Tooltip
                          contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                          formatter={(val) => [formatValue(Array.isArray(val) ? val[0] : val, chartFmt(c)), c.yField || 'Value']}
                          labelFormatter={(label) => String(label)}
                        />
                        {c.referenceLine?.value != null && (
                          <ReferenceLine y={c.referenceLine.value} stroke="#ef4444" strokeDasharray="3 3" label={c.referenceLine.label || 'Target'} />
                        )}
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke={chartColors[0]}
                          strokeWidth={2}
                          dot={{ r: 4, cursor: 'pointer' }}
                          activeDot={{ r: 6, cursor: 'pointer' }}
                          onClick={(point) => point?.name != null && handleChartClick(c.xField, point.name)}
                        >
                          {(c.showDataLabels !== false) && <LabelList position="top" formatter={(v) => formatValue(v, chartFmt(c))} style={{ fontSize: CHART_DATA_LABEL_FONT_SIZE }} />}
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
              {c.type === 'area' && (
                <div className="flex-1 min-h-[320px]">
                  {filteredData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={lineChartData(filteredData, c.xField, c.yField)}>
                        <defs>
                          <linearGradient id={`area-fill-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartColors[0]} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={chartColors[0]} stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                        <XAxis dataKey="name" tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} />
                        <YAxis tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} tickFormatter={(v) => formatValue(v, chartFmt(c))} label={{ value: getMeasureLabel(c), angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: CHART_AXIS_LABEL_FONT_SIZE } }} />
                        <Tooltip
                          contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                          formatter={(val) => [formatValue(Array.isArray(val) ? val[0] : val, chartFmt(c)), c.yField || 'Value']}
                        />
                        {c.referenceLine?.value != null && (
                          <ReferenceLine y={c.referenceLine.value} stroke="#ef4444" strokeDasharray="3 3" label={c.referenceLine.label || 'Target'} />
                        )}
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={chartColors[0]}
                          strokeWidth={2}
                          fill={`url(#area-fill-${c.id})`}
                          onClick={(data) => data?.name != null && handleChartClick(c.xField, data.name)}
                        >
                          {(c.showDataLabels !== false) && <LabelList position="top" formatter={(v) => formatValue(v, chartFmt(c))} style={{ fontSize: CHART_DATA_LABEL_FONT_SIZE }} />}
                        </Area>
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
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
                  fontSize: CHART_TICK_FONT_SIZE,
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
                        : chartColors[0]
                const barRadius = effectiveBarStyle === 'rounded' ? (isVertical ? [10, 10, 0, 0] : [0, 10, 10, 0]) : (isVertical ? [4, 4, 0, 0] : [0, 4, 4, 0])
                const barStroke = effectiveBarStyle === 'outline' ? chartColors[0] : undefined
                const barStrokeWidth = effectiveBarStyle === 'outline' ? 2 : undefined
                return (
                  <div className="flex-1 min-h-[320px] overflow-visible">
                    {filteredData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={barData}
                          layout={isVertical ? undefined : 'vertical'}
                          margin={isVertical ? { bottom: bottomMargin, right: 20 } : { left: leftMargin, right: 90 }}
                        >
                          <defs>
                            {effectiveBarStyle === 'sheen' && <BarSheenGradient id={`bar-fill-${c.id}`} baseColor={chartColors[0]} />}
                            {effectiveBarStyle === 'gradient' && <BarVerticalGradient id={`bar-gradient-${c.id}`} baseColor={chartColors[0]} />}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis
                            type={isVertical ? 'category' : 'number'}
                            dataKey={isVertical ? 'name' : undefined}
                            tick={isVertical ? categoryTick('x') : { fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }}
                            tickFormatter={isVertical ? undefined : (v) => formatValue(v, chartFmt(c))}
                          />
                          <YAxis
                            type={isVertical ? 'number' : 'category'}
                            dataKey={isVertical ? undefined : 'name'}
                            width={isVertical ? 0 : 120}
                            tick={!isVertical ? categoryTick('y') : { fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }}
                            tickFormatter={isVertical ? (v) => formatValue(v, chartFmt(c)) : undefined}
                            label={isVertical ? { value: getMeasureLabel(c), angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: CHART_AXIS_LABEL_FONT_SIZE } } : undefined}
                          />
                          <Tooltip
                            contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText, maxWidth: 360 }}
                            formatter={(val, name, props) => {
                              const row = props?.payload
                              const detailLabel = c.detailField || 'Details'
                              if (hasDetails && row?.details?.length) {
                                const detailStr = row.details.length > 8 ? `${row.details.slice(0, 8).join(', ')}…` : row.details.join(', ')
                                return [formatValue(Array.isArray(val) ? val[0] : val, chartFmt(c)), `${c.yField || c.metric || 'Value'} · ${detailLabel}: ${detailStr}`]
                              }
                              return [formatValue(Array.isArray(val) ? val[0] : val, chartFmt(c)), c.yField || c.metric || 'Value']
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
                          >
                            {(c.showDataLabels !== false) && (
                              <LabelList
                                position={c.orientation === 'vertical' ? 'top' : 'right'}
                                style={{ fontSize: CHART_DATA_LABEL_FONT_SIZE }}
                                formatter={(v, props) => {
                                  const payload = props?.payload
                                  if (hasDetails && payload?.details?.length && payload.details.length <= 5) {
                                    return `${formatValue(v, chartFmt(c))} (${payload.details.join(', ')})`
                                  }
                                  return formatValue(v, chartFmt(c))
                                }}
                              />
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )
              })()}
              {c.type === 'stacked_bar' && c.stackField && (() => {
                const stackedData = groupByStacked(filteredData, c.xField || c.dimension, c.stackField, c.yField || c.metric, c.limit ?? 10)
                const stackKeys = stackedData.length ? Object.keys(stackedData[0]).filter((k) => k !== 'name') : []
                return (
                  <div className="flex-1 min-h-[320px]">
                    {filteredData.length === 0 || stackKeys.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stackedData} margin={{ left: 20, right: 90, bottom: 60 }}>
                          <defs>
                            {useBarSheen && stackKeys.map((key, i) => (
                              <BarSheenGradient key={key} id={`stacked-sheen-${c.id}-${i}`} baseColor={chartColors[i % chartColors.length]} />
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis dataKey="name" tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} />
                          <YAxis tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} tickFormatter={(v) => formatValue(v, chartFmt(c))} label={{ value: getMeasureLabel(c), angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: CHART_AXIS_LABEL_FONT_SIZE } }} />
                          <Tooltip contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }} formatter={(val) => formatValue(val, chartFmt(c))} />
                          <Legend />
                          {stackKeys.map((key, i) => (
                            <Bar key={key} dataKey={key} stackId="stack" fill={useBarSheen ? `url(#stacked-sheen-${c.id}-${i})` : chartColors[i % chartColors.length]} name={key} radius={[0, 0, 0, 0]}>
                              {(c.showDataLabels !== false) && <LabelList position="center" formatter={(v) => formatValue(v, chartFmt(c))} style={{ fontSize: CHART_DATA_LABEL_FONT_SIZE }} />}
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )
              })()}
              {c.type === 'grouped_bar' && c.stackField && (() => {
                const groupedData = groupByStacked(filteredData, c.xField || c.dimension, c.stackField, c.yField || c.metric, c.limit ?? 12)
                const groupKeys = groupedData.length ? Object.keys(groupedData[0]).filter((k) => k !== 'name') : []
                return (
                  <div className="flex-1 min-h-[320px] overflow-visible">
                    {filteredData.length === 0 || groupKeys.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={groupedData} margin={{ left: 20, right: 90, bottom: 60 }}>
                          <defs>
                            {useBarSheen && groupKeys.map((key, i) => (
                              <BarSheenGradient key={key} id={`grouped-sheen-${c.id}-${i}`} baseColor={chartColors[i % chartColors.length]} />
                            ))}
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis dataKey="name" tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} />
                          <YAxis tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} tickFormatter={(v) => formatValue(v, chartFmt(c))} label={{ value: getMeasureLabel(c), angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: CHART_AXIS_LABEL_FONT_SIZE } }} />
                          <Tooltip contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }} formatter={(val) => formatValue(val, chartFmt(c))} />
                          <Legend />
                          {groupKeys.map((key, i) => (
                            <Bar key={key} dataKey={key} fill={useBarSheen ? `url(#grouped-sheen-${c.id}-${i})` : chartColors[i % chartColors.length]} name={key} radius={[4, 4, 0, 0]} isAnimationActive>
                              {(c.showDataLabels !== false) && <LabelList position="top" formatter={(v) => formatValue(v, chartFmt(c))} style={{ fontSize: CHART_DATA_LABEL_FONT_SIZE }} />}
                            </Bar>
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
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
                  color: chartColors[i % chartColors.length]
                }))
                return (
                  <div className="flex-1 min-h-[320px]">
                    {filteredData.length === 0 || radialData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
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
                            <LabelList position="center" formatter={(v, props) => formatValue((props.payload?.value) ?? v, chartFmt(c))} style={{ fontSize: CHART_DATA_LABEL_FONT_SIZE }} />
                          </RadialBar>
                          <Tooltip
                            contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                            formatter={(val, name, props) => [formatValue((props.payload?.value) ?? val, chartFmt(c)), (props.payload?.name) ?? (c.xField || c.dimension || 'Category')]}
                          />
                          <Legend />
                        </RadialBarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )
              })()}
              {c.type === 'stacked_area' && c.stackField && (() => {
                const stackedData = groupByStacked(filteredData, c.xField, c.stackField, c.yField || c.metric, c.limit ?? 15)
                const stackKeys = stackedData.length ? Object.keys(stackedData[0]).filter((k) => k !== 'name') : []
                return (
                  <div className="flex-1 min-h-[320px]">
                    {filteredData.length === 0 || stackKeys.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stackedData} margin={{ left: 20, right: 20, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                          <XAxis dataKey="name" tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} />
                          <YAxis tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} tickFormatter={(v) => formatValue(v, chartFmt(c))} label={{ value: getMeasureLabel(c), angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: CHART_AXIS_LABEL_FONT_SIZE } }} />
                          <Tooltip contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }} formatter={(val) => formatValue(val, chartFmt(c))} />
                          <Legend />
                          {stackKeys.map((key, i) => (
                            <Area key={key} type="monotone" dataKey={key} stackId="stack" stroke={chartColors[i % chartColors.length]} fill={chartColors[i % chartColors.length]} fillOpacity={0.6} name={key} />
                          ))}
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )
              })()}
              {c.type === 'scatter' && (
                <div className="flex-1 min-h-[320px]">
                  {filteredData.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ left: 20, right: 20, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
                        <XAxis type="number" dataKey="x" name={c.xField} tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} tickFormatter={(v) => formatValue(v, chartFmt(c))} />
                        <YAxis type="number" dataKey="y" name={c.yField} tick={{ fontSize: CHART_TICK_FONT_SIZE, fill: chartTheme.tickFill }} tickFormatter={(v) => formatValue(v, chartFmt(c))} label={{ value: c.yField || 'Y', angle: -90, position: 'insideLeft', style: { fill: chartTheme.tickFill, fontSize: CHART_AXIS_LABEL_FONT_SIZE } }} />
                        <Tooltip
                          contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                          formatter={(val, name, props) => {
                            const p = props?.payload
                            if (!p) return [val, name]
                            return [`${c.xField || 'X'}: ${formatValue(p.x, chartFmt(c))} · ${c.yField || 'Y'}: ${formatValue(p.y, chartFmt(c))}`, '']
                          }}
                        />
                        <Scatter data={scatterData(filteredData, c.xField, c.yField)} fill={chartColors[0]} fillOpacity={0.7} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
              {c.type === 'pie' && (() => {
                const fullPieData = groupBy(filteredData, c.dimension || c.xField, c.metric || c.yField, BAR_LIMIT_ALL, c.aggregation)
                const pieData = (c.categoryFilter?.length)
                  ? fullPieData.filter((d) => c.categoryFilter.includes(d.name))
                  : fullPieData.slice(0, c.limit ?? 8)
                const isDonut = c.pieStyle === 'donut'
                return (
                  <div className="flex-1 min-h-[320px]">
                    {filteredData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-500 text-base">No data</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            innerRadius={isDonut ? 60 : 0}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            cursor="pointer"
                            onClick={(data) => data?.name != null && handleChartClick(c.dimension || c.xField, data.name)}
                          >
                            {pieData.map((_, i) => (
                              <Cell key={i} fill={chartColors[i % chartColors.length]} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ fontSize: 14, backgroundColor: chartTheme.tooltipBg, border: `1px solid ${chartTheme.tooltipBorder}`, color: chartTheme.tooltipText }}
                            formatter={(val) => [formatValue(Array.isArray(val) ? val[0] : val, chartFmt(c)), c.metric || c.yField || 'Value']}
                          />
                          {c.showLegend !== false && <Legend />}
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                )
              })()}
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      {(!spec.charts || spec.charts.length === 0) && (!spec.kpis || spec.kpis.length === 0) && (
        <div className="p-8 text-center text-gray-500 text-base rounded-lg border border-dashed border-gray-300">
          No charts or KPIs in spec. Try refining your prompt.
        </div>
      )}
    </div>
  )
}
