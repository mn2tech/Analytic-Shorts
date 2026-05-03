import { useState, useMemo, memo, Fragment, useEffect, useRef } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SunburstChart from './SunburstChart'
import ForecastChart from './ForecastChart'
import ChartInsights from './ChartInsights'
import BudgetInsightsWidget from './widgets/BudgetInsightsWidget'
import UnemploymentInsightsWidget from './widgets/UnemploymentInsightsWidget'
import HealthInsightsWidget from './widgets/HealthInsightsWidget'
import SalesInsightsWidget from './widgets/SalesInsightsWidget'
import USASpendingInsightsWidget from './widgets/USASpendingInsightsWidget'
import { parseNumericValue } from '../utils/numberUtils'
import { getFieldTooltip } from '../utils/fieldGlossary'
import { formatCompact } from '../utils/formatNumber'
import { generateForecast } from '../utils/forecasting'
import { TD } from '../constants/terminalDashboardPalette'
import { ChartHorizontalScroll } from './ChartHorizontalScroll'
import GridDashboard, { getChartHeight } from './GridDashboard'

const ADVANCED_DEFAULT_LAYOUT = [
  { i: 'adv-line', x: 0, y: 0, w: 7, h: 10, minW: 3, minH: 6 },
  { i: 'adv-distrib', x: 7, y: 0, w: 5, h: 10, minW: 3, minH: 6 },
  { i: 'adv-anomaly', x: 0, y: 10, w: 5, h: 11, minW: 3, minH: 7 },
  { i: 'adv-stats', x: 5, y: 10, w: 4, h: 11, minW: 3, minH: 7 },
  { i: 'adv-corr', x: 9, y: 10, w: 3, h: 11, minW: 3, minH: 7 },
  { i: 'adv-donut', x: 0, y: 21, w: 6, h: 10, minW: 3, minH: 6 },
  { i: 'adv-sunburst', x: 6, y: 21, w: 6, h: 10, minW: 3, minH: 6 },
  { i: 'adv-bar', x: 0, y: 31, w: 12, h: 9, minW: 4, minH: 5 },
  { i: 'adv-distribution', x: 0, y: 40, w: 12, h: 8, minW: 4, minH: 5 },
]

/** Grid item `i` → `hiddenAdvancedCards` key (legacy ids preserved for restore strip). */
const ADVANCED_HIDE_KEY = {
  'adv-line': 'adv-line',
  'adv-distrib': 'adv-donut',
  'adv-anomaly': 'adv-anomalies',
  'adv-stats': 'adv-stat-summary',
  'adv-corr': 'adv-correlation',
  'adv-donut': 'adv-forecast',
  'adv-sunburst': 'adv-sunburst',
  'adv-bar': 'adv-bar',
  'adv-distribution': 'adv-distribution',
}

const ADVANCED_GRID_IDS = [
  'adv-line',
  'adv-distrib',
  'adv-anomaly',
  'adv-stats',
  'adv-corr',
  'adv-donut',
  'adv-sunburst',
  'adv-bar',
  'adv-distribution',
]

const percentileLinear = (sorted, q) => {
  if (!sorted.length) return NaN
  const n = sorted.length
  const idx = (n - 1) * q
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

const truncateLabel = (s, max = 12) => {
  const t = String(s || '')
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

const COLORS = [...TD.PIE_COLORS, ...TD.PIE_COLORS, ...TD.PIE_COLORS]

// Sample data efficiently for charts (max 5000 rows to prevent performance issues)
const sampleDataForCharts = (data, maxRows = 5000) => {
  if (!data || data.length <= maxRows) return data
  // Sample evenly across the dataset
  const step = Math.ceil(data.length / maxRows)
  const sampled = []
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i])
  }
  return sampled
}

function AdvancedDashboard({ data, filteredData, selectedNumeric, selectedCategorical, selectedDate, onChartFilter, chartFilter, categoricalColumns, numericColumns = [], dateColumns = [], chartLayout, onChartLayoutUpdate }) {
  const [chartInsights, setChartInsights] = useState(null)
  const [askFooterDraft, setAskFooterDraft] = useState('')
  const lineChartRef = useRef(null)
  const [lineHeight, setLineHeight] = useState(280)
  const forecastChartRef = useRef(null)
  const [forecastHeight, setForecastHeight] = useState(280)
  const hiddenAdvancedCards = chartLayout?.hiddenAdvancedCards || {}
  // Auto-select a secondary category for hierarchical view (use second categorical column if available)
  const secondaryCategory = categoricalColumns && categoricalColumns.length > 1 
    ? categoricalColumns.find(col => col !== selectedCategorical) || categoricalColumns[1]
    : null

  // Detect data types for insights widgets
  const isBudgetData = useMemo(() => {
    return numericColumns?.some(col => 
      col.toLowerCase().includes('budget') || col.toLowerCase().includes('amount')
    ) && categoricalColumns?.some(col => 
      col.toLowerCase().includes('budget') || col.toLowerCase().includes('category')
    )
  }, [numericColumns, categoricalColumns])

  const isUnemploymentData = useMemo(() => {
    return numericColumns?.some(col => 
      col.toLowerCase().includes('unemployment') || col.toLowerCase().includes('unemployment rate')
    ) || (selectedNumeric && selectedNumeric.toLowerCase().includes('unemployment'))
  }, [numericColumns, selectedNumeric])

  const isHealthData = useMemo(() => {
    return numericColumns?.some(col => 
      col.toLowerCase().includes('health') || col.toLowerCase().includes('death rate') || 
      col.toLowerCase().includes('birth rate') || col.toLowerCase().includes('life expectancy')
    ) || categoricalColumns?.some(col => 
      col.toLowerCase().includes('metric') && (selectedNumeric?.toLowerCase().includes('health') || 
      selectedNumeric?.toLowerCase().includes('death') || selectedNumeric?.toLowerCase().includes('birth') ||
      selectedNumeric?.toLowerCase().includes('life'))
    )
  }, [numericColumns, categoricalColumns, selectedNumeric])

  const isUSASpendingData = useMemo(() => {
    return numericColumns?.some(col => 
      col.toLowerCase().includes('award amount') || col.toLowerCase().includes('award_amount')
    ) && (categoricalColumns?.some(col => 
      col.toLowerCase().includes('awarding agency') || col.toLowerCase().includes('recipient name') ||
      col.toLowerCase().includes('award type') || col.toLowerCase().includes('awarding_agency') ||
      col.toLowerCase().includes('recipient_name')
    ) || selectedNumeric?.toLowerCase().includes('award amount'))
  }, [numericColumns, categoricalColumns, selectedNumeric])

  const isSalesData = useMemo(() => {
    // Exclude USA Spending data from sales detection
    if (isUSASpendingData) return false
    
    return numericColumns?.some(col => 
      col.toLowerCase().includes('sales') || col.toLowerCase().includes('revenue') || 
      (col.toLowerCase().includes('amount') && !col.toLowerCase().includes('award')) || 
      col.toLowerCase().includes('price')
    ) && (categoricalColumns?.some(col => 
      col.toLowerCase().includes('product') || col.toLowerCase().includes('category') ||
      col.toLowerCase().includes('region') || col.toLowerCase().includes('customer')
    ) || selectedNumeric?.toLowerCase().includes('sales'))
  }, [numericColumns, categoricalColumns, selectedNumeric, isUSASpendingData])

  // Sample filtered data for chart processing
  const sampledFilteredData = useMemo(() => sampleDataForCharts(filteredData, 5000), [filteredData])

  /** Row-level Z-score outliers for selected numeric column (|z| > 2). */
  const anomalyDetection = useMemo(() => {
    const rows = filteredData || data
    if (!rows?.length || !selectedNumeric) {
      return { anomalies: [], mean: 0, stdDev: 0 }
    }
    const values = []
    const rowIndices = []
    rows.forEach((row, index) => {
      const v = parseNumericValue(row?.[selectedNumeric])
      if (Number.isFinite(v)) {
        values.push(v)
        rowIndices.push(index)
      }
    })
    if (values.length < 3) {
      return { anomalies: [], mean: 0, stdDev: 0 }
    }
    const n = values.length
    const mean = values.reduce((a, b) => a + b, 0) / n
    const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n
    const stdDev = Math.sqrt(variance)
    if (!Number.isFinite(stdDev) || stdDev === 0) {
      return { anomalies: [], mean, stdDev: 0 }
    }

    const labelColumn = selectedCategorical || categoricalColumns?.[0] || null
    const anomalies = []
    values.forEach((value, i) => {
      const z = (value - mean) / stdDev
      if (Math.abs(z) <= 2) return
      const row = rows[rowIndices[i]]
      let label = '—'
      if (labelColumn && row && row[labelColumn] != null && String(row[labelColumn]).trim() !== '') {
        label = String(row[labelColumn])
      } else {
        label = `Row ${rowIndices[i] + 1}`
      }
      let severity = 'medium'
      let severityLabel = 'Medium'
      let badgeStyle = { background: 'rgba(249,115,22,0.15)', color: TD.WARNING }
      if (z > 3) {
        severity = 'high'
        severityLabel = 'High'
        badgeStyle = { background: 'rgba(239,68,68,0.15)', color: TD.DANGER }
      } else if (z < -2) {
        severity = 'low'
        severityLabel = 'Low outlier'
        badgeStyle = { background: 'rgba(59,130,246,0.15)', color: TD.ACCENT_MID }
      }
      anomalies.push({
        label,
        value,
        valueFormatted: formatCompact(value),
        z,
        zRounded: Math.round(z * 10) / 10,
        severity,
        severityLabel,
        badgeStyle,
      })
    })
    anomalies.sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    return { anomalies, mean, stdDev }
  }, [filteredData, data, selectedNumeric, selectedCategorical, categoricalColumns])

  const explainAnomaliesToClaude = () => {
    const { anomalies } = anomalyDetection
    if (!anomalies.length) return
    const lines = anomalies.slice(0, 40).map(
      (a) => `- ${a.label}: ${a.valueFormatted} (z=${a.zRounded}, ${a.severityLabel})`
    )
    const more =
      anomalies.length > 40
        ? `\n... and ${anomalies.length - 40} more flagged rows.`
        : ''
    const message = `Explain these statistical anomalies from my Advanced dashboard view.

Metric column: "${selectedNumeric}"
Detection: Z-score vs column mean; flagged when |z| > 2.

${lines.join('\n')}${more}

Please interpret likely causes (data quality vs real signals) and what I should verify next.`
    window.dispatchEvent(
      new CustomEvent('nm2-ask-claude-explain-anomalies', {
        detail: { message },
      })
    )
  }

  const prepareLineData = useMemo(() => {
    if (!sampledFilteredData || !selectedNumeric || !selectedDate) return []
    
    const grouped = {}
    sampledFilteredData.forEach((row) => {
      const date = row[selectedDate] || ''
      const value = parseNumericValue(row[selectedNumeric])
      if (date) {
        grouped[date] = (grouped[date] || 0) + value
      }
    })
    
    return Object.entries(grouped)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 20)
  }, [sampledFilteredData, selectedNumeric, selectedDate])

  const prepareBarData = useMemo(() => {
    // Bar charts can work with categorical OR date columns (treating dates as categories)
    const categoryColumn = selectedCategorical || selectedDate
    if (!sampledFilteredData || !categoryColumn || !selectedNumeric) return []
    
    const grouped = {}
    sampledFilteredData.forEach((row) => {
      const key = row[categoryColumn] || 'Unknown'
      const value = parseNumericValue(row[selectedNumeric])
      grouped[key] = (grouped[key] || 0) + value
    })
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [sampledFilteredData, selectedCategorical, selectedDate, selectedNumeric])

  const prepareDonutData = useMemo(() => {
    // Donut charts can work with categorical OR date columns (treating dates as categories)
    const categoryColumn = selectedCategorical || selectedDate
    if (!sampledFilteredData || !categoryColumn || !selectedNumeric) return []
    
    const grouped = {}
    sampledFilteredData.forEach((row) => {
      const key = row[categoryColumn] || 'Unknown'
      const value = parseNumericValue(row[selectedNumeric])
      grouped[key] = (grouped[key] || 0) + value
    })
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [sampledFilteredData, selectedCategorical, selectedDate, selectedNumeric])

  const lineData = prepareLineData
  const barData = prepareBarData
  const donutData = prepareDonutData
  const donutTotal = useMemo(() => donutData.reduce((sum, item) => sum + item.value, 0), [donutData])

  const extendedColumnStats = useMemo(() => {
    const rows = filteredData || data
    if (!rows?.length || !selectedNumeric) return null
    const vals = []
    for (const row of rows) {
      const v = parseNumericValue(row?.[selectedNumeric])
      if (Number.isFinite(v)) vals.push(v)
    }
    if (vals.length < 1) return null
    vals.sort((a, b) => a - b)
    const n = vals.length
    const sum = vals.reduce((a, b) => a + b, 0)
    const mean = sum / n
    const variance = vals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n
    const std = Math.sqrt(variance)
    const median = percentileLinear(vals, 0.5)
    const p25 = percentileLinear(vals, 0.25)
    const p75 = percentileLinear(vals, 0.75)
    const iqr = p75 - p25
    const cv = mean !== 0 ? (std / Math.abs(mean)) * 100 : 0
    const m3 = vals.reduce((acc, v) => acc + (v - mean) ** 3, 0) / n
    const m4 = vals.reduce((acc, v) => acc + (v - mean) ** 4, 0) / n
    const skewness = std > 1e-12 ? m3 / std ** 3 : 0
    const kurtosisExcess = std > 1e-12 ? m4 / std ** 4 - 3 : 0

    let totalTrendPct = null
    if (lineData.length >= 2) {
      const first = lineData[0].value
      const last = lineData[lineData.length - 1].value
      if (Number.isFinite(first) && Math.abs(first) > 1e-12) {
        totalTrendPct = ((last - first) / Math.abs(first)) * 100
      }
    }

    const fc = lineData.length >= 2 ? generateForecast(lineData, 1) : []
    const forecastNext = fc[0]?.value

    return {
      sum,
      mean,
      median,
      std,
      p25,
      p75,
      iqr,
      cv,
      skewness,
      kurtosisExcess,
      count: n,
      totalTrendPct,
      forecastNext,
    }
  }, [filteredData, data, selectedNumeric, lineData])

  const correlationPreview = useMemo(() => {
    const rows = filteredData || data
    if (!rows?.length || !numericColumns?.length) {
      return { labels: [], matrix: [], fullLabels: [] }
    }
    const cols = numericColumns
      .filter((col) => {
        let count = 0
        const cap = Math.min(rows.length, 8000)
        for (let i = 0; i < cap; i++) {
          if (Number.isFinite(parseNumericValue(rows[i]?.[col]))) count++
          if (count >= 3) return true
        }
        return false
      })
      .slice(0, 5)

    if (cols.length < 2) {
      return {
        labels: cols.map((c) => truncateLabel(c, 10)),
        matrix: cols.length === 1 ? [[1]] : [],
        fullLabels: cols,
      }
    }

    const pearson = (colA, colB) => {
      const xs = []
      const ys = []
      for (const row of rows) {
        const x = parseNumericValue(row[colA])
        const y = parseNumericValue(row[colB])
        if (Number.isFinite(x) && Number.isFinite(y)) {
          xs.push(x)
          ys.push(y)
        }
      }
      const nx = xs.length
      if (nx < 3) return NaN
      const mx = xs.reduce((s, v) => s + v, 0) / nx
      const my = ys.reduce((s, v) => s + v, 0) / nx
      let num = 0
      let dx = 0
      let dy = 0
      for (let i = 0; i < nx; i++) {
        const vx = xs[i] - mx
        const vy = ys[i] - my
        num += vx * vy
        dx += vx * vx
        dy += vy * vy
      }
      const den = Math.sqrt(dx * dy)
      return den > 0 ? num / den : NaN
    }

    const matrix = cols.map((ci) =>
      cols.map((cj) => {
        if (ci === cj) return 1
        const r = pearson(ci, cj)
        return Number.isFinite(r) ? r : 0
      })
    )
    return {
      labels: cols.map((c) => truncateLabel(c, 10)),
      matrix,
      fullLabels: cols,
    }
  }, [filteredData, data, numericColumns])

  const dispatchAskClaude = (message) => {
    window.dispatchEvent(new CustomEvent('nm2-ask-claude-prompt', { detail: { message } }))
  }

  const submitAskFooter = (e) => {
    e.preventDefault()
    const t = askFooterDraft.trim()
    if (!t) return
    dispatchAskClaude(t)
    setAskFooterDraft('')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Handle chart interactions
  const handlePieClick = (entry) => {
    if (chartFilter?.type === 'category' && chartFilter.value === entry.name) {
      onChartFilter(null) // Clear filter if same segment clicked
    } else {
      onChartFilter({ type: 'category', value: entry.name })
    }
  }

  const handleLineClick = (payload) => {
    const dateValue = payload.date || payload.name
    if (chartFilter?.type === 'date' && chartFilter.value === dateValue) {
      onChartFilter(null) // Clear filter if same point clicked
    } else {
      onChartFilter({ type: 'date', value: dateValue })
    }
  }

  const handleBarClick = (data) => {
    if (chartFilter?.type === 'category' && chartFilter.value === data.name) {
      onChartFilter(null) // Clear filter if same bar clicked
    } else {
      onChartFilter({ type: 'category', value: data.name })
    }
  }

  const handleCardClick = (categoryName) => {
    if (chartFilter?.type === 'category' && chartFilter.value === categoryName) {
      onChartFilter(null) // Clear filter if same card clicked
    } else {
      onChartFilter({ type: 'category', value: categoryName })
    }
  }

  // Tooltip for chart labels (e.g. COG, SOG, baseType) – show when hovering over the field name
  const numericTooltip = getFieldTooltip(selectedNumeric)
  const categoricalTooltip = getFieldTooltip(selectedCategorical)
  const dateTooltip = getFieldTooltip(selectedDate)

  const tooltipContentStyle = {
    background: TD.CARD_BG,
    border: `0.5px solid ${TD.CARD_BORDER}`,
    borderRadius: '8px',
    color: TD.TEXT_1,
    fontSize: '12px',
  }
  const axisTickProps = { fill: TD.TEXT_3, fontSize: 11 }
  const cardShellStyle = {
    background: TD.CARD_BG,
    border: `0.5px solid ${TD.CARD_BORDER}`,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: 'none',
    position: 'relative',
  }
  const titleStyle = { color: '#e2e8f0', fontSize: '13px', fontWeight: 500 }

  const handleChartClick = (chartType, chartData, chartTitle) => {
    // Convert chart data back to original row format for insights
    let dataForInsights = []
    if (chartType === 'line') {
      dataForInsights = filteredData || data
    } else if (chartType === 'pie' || chartType === 'bar') {
      // For pie/bar charts, get rows matching the categories shown
      if (selectedCategorical && selectedNumeric) {
        const categories = chartData.map(item => item.name)
        dataForInsights = (filteredData || data).filter(row => 
          categories.includes(row[selectedCategorical])
        )
      }
    }
    
    if (dataForInsights.length > 0) {
      setChartInsights({
        chartType,
        chartData: dataForInsights,
        chartTitle,
        selectedNumeric,
        selectedCategorical,
        selectedDate
      })
    }
  }

  const hideAdvancedCard = (id) => {
    onChartLayoutUpdate?.({ hiddenAdvancedCards: { [id]: true } })
  }
  const restoreAdvancedCard = (id) => {
    onChartLayoutUpdate?.({ hiddenAdvancedCards: { [id]: false } })
  }
  const hideGridCard = (gridId) => {
    const hk = ADVANCED_HIDE_KEY[gridId]
    if (hk) hideAdvancedCard(hk)
  }
  const renderAddChartIcon = (id) => {
    if (id === 'adv-line') {
      return (
        <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 14l4-4 3 2 6-6" />
          <circle cx="3" cy="14" r="1" fill="currentColor" stroke="none" />
          <circle cx="7" cy="10" r="1" fill="currentColor" stroke="none" />
          <circle cx="10" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="6" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    }
    if (id === 'adv-bar') {
      return (
        <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <rect x="3" y="10" width="3" height="7" rx="1" />
          <rect x="8.5" y="6" width="3" height="11" rx="1" />
          <rect x="14" y="3" width="3" height="14" rx="1" />
        </svg>
      )
    }
    if (id === 'adv-donut') {
      return (
        <svg className="w-3.5 h-3.5 text-pink-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a8 8 0 108 8h-3a5 5 0 11-5-5V2z" />
        </svg>
      )
    }
    if (id === 'adv-sunburst') {
      return (
        <svg className="w-3.5 h-3.5 text-violet-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a8 8 0 11-8 8h3a5 5 0 105-5V2z" />
          <path d="M10 6a4 4 0 110 8 4 4 0 010-8z" />
        </svg>
      )
    }
    if (id === 'adv-distribution') {
      return (
        <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <rect x="3" y="4" width="14" height="3" rx="1" />
          <rect x="3" y="9" width="10" height="3" rx="1" />
          <rect x="3" y="14" width="6" height="3" rx="1" />
        </svg>
      )
    }
    if (id === 'adv-forecast') {
      return (
        <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 14l4-4 3 2 6-6" />
          <path d="M14 6h2v2" />
        </svg>
      )
    }
    if (id === 'adv-anomalies') {
      return (
        <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      )
    }
    if (id === 'adv-stat-summary') {
      return (
        <svg className="w-3.5 h-3.5 text-sky-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M4 4h3v12H4V4zm5-2h3v14H9V2zm5 4h3v10h-3V6z" />
        </svg>
      )
    }
    if (id === 'adv-correlation') {
      return (
        <svg className="w-3.5 h-3.5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M2 2h4v4H2V2zm6 0h4v4H8V2zm6 0h4v4h-4V2zM2 8h4v4H2V8zm6 0h4v4H8V8zm6 0h4v4h-4V8zM2 14h4v4H2v-4zm6 0h4v4H8v-4zm6 0h4v4h-4v-4z" />
        </svg>
      )
    }
    return (
      <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm2 3h3v3H6V6zm0 5h3v3H6v-3zm5-5h3v8h-3V6z" />
      </svg>
    )
  }

  const visibleItemIds = useMemo(() => {
    const h = hiddenAdvancedCards || {}
    const canShow = (gridId) => {
      const hk = ADVANCED_HIDE_KEY[gridId]
      if (!hk || h[hk]) return false
      if (gridId === 'adv-anomaly' || gridId === 'adv-stats' || gridId === 'adv-corr') {
        if (!selectedNumeric) return false
      }
      if (gridId === 'adv-donut') {
        if (!selectedDate || !selectedNumeric) return false
      }
      return true
    }
    return ADVANCED_GRID_IDS.filter(canShow)
  }, [hiddenAdvancedCards, selectedNumeric, selectedDate])

  useEffect(() => {
    const el = lineChartRef.current
    if (!el || !visibleItemIds.includes('adv-line')) return undefined
    const ro = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height
      if (h > 50) setLineHeight(h - 10)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [visibleItemIds])

  useEffect(() => {
    const el = forecastChartRef.current
    if (!el || !visibleItemIds.includes('adv-donut')) return undefined
    const ro = new ResizeObserver((entries) => {
      const h = entries[0].contentRect.height
      if (h > 50) setForecastHeight(h - 10)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [visibleItemIds])

  return (
    <>
    <div className="space-y-6" style={{ background: TD.PAGE_BG }}>
      {Object.entries(hiddenAdvancedCards).some(([, hidden]) => hidden) && (
        <div
          className="rounded-lg p-3 flex flex-wrap gap-2"
          style={{ background: TD.CARD_BG, border: `0.5px solid ${TD.CARD_BORDER}` }}
        >
          <span className="text-sm inline-flex items-center gap-1.5" style={{ color: TD.TEXT_2 }}>
            <svg className="w-4 h-4" style={{ color: TD.TEXT_3 }} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm2 3h3v3H6V6zm0 5h3v3H6v-3zm5-5h3v8h-3V6z" />
            </svg>
            Add charts:
          </span>
          {Object.entries(hiddenAdvancedCards).filter(([, hidden]) => hidden).map(([id]) => (
            <button
              key={id}
              type="button"
              onClick={() => restoreAdvancedCard(id)}
              className="px-2 py-1 text-xs rounded inline-flex items-center gap-1.5"
              style={{
                border: `0.5px solid ${TD.CARD_BORDER}`,
                color: TD.TEXT_2,
                background: TD.PAGE_BG,
              }}
            >
              {renderAddChartIcon(id)}
              Show {id.replace('adv-', '')}
            </button>
          ))}
        </div>
      )}
      {/* Insights Widgets - Show at top based on data type */}
      {isBudgetData && selectedNumeric && selectedCategorical && (
        <div style={{ ...cardShellStyle }}>
          <BudgetInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}
      {isUnemploymentData && selectedNumeric && selectedDate && (
        <div style={{ ...cardShellStyle }}>
          <UnemploymentInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}
      {isHealthData && selectedNumeric && selectedCategorical && (
        <div style={{ ...cardShellStyle }}>
          <HealthInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}
      {isSalesData && selectedNumeric && (selectedCategorical || selectedDate) && (
        <div style={{ ...cardShellStyle }}>
          <SalesInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
            forceDark
          />
        </div>
      )}
      {isUSASpendingData && selectedNumeric && (selectedCategorical || selectedDate) && (
        <div style={{ ...cardShellStyle }}>
          <USASpendingInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {selectedNumeric && extendedColumnStats && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: TD.CARD_BG, border: `0.5px solid ${TD.CARD_BORDER}` }}
        >
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"
            style={{ gap: '1px', background: TD.CARD_BORDER }}
          >
            {[
              {
                key: 'tot',
                label: 'Total',
                value: formatCompact(extendedColumnStats.sum),
                sub:
                  extendedColumnStats.totalTrendPct != null ? (
                    <span
                      style={{
                        color: extendedColumnStats.totalTrendPct >= 0 ? TD.SUCCESS : TD.DANGER,
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {extendedColumnStats.totalTrendPct >= 0 ? '↑' : '↓'}{' '}
                      {Math.abs(extendedColumnStats.totalTrendPct).toFixed(1)}% <span style={{ color: TD.TEXT_3, fontWeight: 500 }}>trend</span>
                    </span>
                  ) : (
                    <span style={{ color: TD.TEXT_3, fontSize: '12px' }}>all rows</span>
                  ),
              },
              {
                key: 'mean',
                label: 'Mean',
                value: formatCompact(extendedColumnStats.mean),
                sub: <span style={{ color: TD.TEXT_3, fontSize: '12px' }}>per record</span>,
              },
              {
                key: 'med',
                label: 'Median',
                value: formatCompact(extendedColumnStats.median),
                sub: <span style={{ color: TD.TEXT_3, fontSize: '12px' }}>50th pctile</span>,
              },
              {
                key: 'std',
                label: 'Std dev',
                value: formatCompact(extendedColumnStats.std),
                sub: (
                  <span style={{ color: TD.TEXT_3, fontSize: '12px' }}>
                    {extendedColumnStats.std > extendedColumnStats.mean * 0.5 ? 'high variance' : 'moderate'}
                  </span>
                ),
              },
              {
                key: 'anom',
                label: 'Anomalies',
                value: String(anomalyDetection.anomalies.length),
                sub: <span style={{ color: TD.WARNING, fontSize: '12px' }}>detected</span>,
                valueStyle: { color: TD.WARNING },
              },
              {
                key: 'fc',
                label: 'Forecast',
                value:
                  extendedColumnStats.forecastNext != null && Number.isFinite(extendedColumnStats.forecastNext)
                    ? formatCompact(extendedColumnStats.forecastNext)
                    : '—',
                sub: (
                  <span style={{ color: TD.SUCCESS, fontSize: '12px' }}>
                    {lineData.length >= 2 ? 'next period' : 'needs date + history'}
                  </span>
                ),
                valueStyle:
                  extendedColumnStats.forecastNext != null && Number.isFinite(extendedColumnStats.forecastNext)
                    ? { color: TD.SUCCESS }
                    : { color: TD.TEXT_2 },
              },
            ].map((cell) => (
              <div key={cell.key} className="px-3 py-3" style={{ background: TD.CARD_BG }}>
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    color: TD.TEXT_3,
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}
                >
                  {cell.label}
                </div>
                <div
                  className="tabular-nums text-lg font-semibold"
                  style={{ color: cell.valueStyle?.color ?? TD.TEXT_1 }}
                >
                  {cell.value}
                </div>
                <div className="mt-1">{cell.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {visibleItemIds.length > 0 && (
        <GridDashboard
          dashboardId="advanced-charts"
          defaultLayout={ADVANCED_DEFAULT_LAYOUT}
          visibleItemIds={visibleItemIds}
          className="w-full"
          onLayoutChange={(l) => {
            console.log('advanced layout:', l, l[0] ? getChartHeight(l[0]) : null)
          }}
        >
          {visibleItemIds.includes('adv-line') && (
            <div key="adv-line" style={{ height: '100%' }}>
              <div
                className="group"
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <h3 className="flex items-center gap-1.5 m-0" style={{ ...titleStyle, fontSize: '12px' }}>
                    <span
                      title={numericTooltip || undefined}
                      className={numericTooltip ? 'cursor-help border-b border-dotted' : ''}
                      style={{ borderColor: '#475569' }}
                    >
                      {selectedNumeric || 'Value'}
                    </span>
                    Over Time
                    {numericTooltip && (
                      <span style={{ color: '#94a3b8' }} className="text-sm" title={numericTooltip} aria-label="Meaning">
                        ⓘ
                      </span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {lineData.length > 0 && (
                      <button
                        type="button"
                        className="chart-header-no-drag opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg"
                        onClick={() => handleChartClick('line', lineData, `${selectedNumeric || 'Value'} Over Time`)}
                        style={{ color: TD.ACCENT_MID }}
                        title="Get AI insights for this chart"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => hideGridCard('adv-line')}
                      style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#ef4444'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#475569'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div ref={lineChartRef} style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'hidden' }}>
                  {lineData.length > 0 ? (
                    <ChartHorizontalScroll pointCount={lineData.length} pxPerPoint={18} height={lineHeight}>
                      <ResponsiveContainer width="100%" height={lineHeight}>
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={TD.GRID} vertical={false} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDate}
                            tick={axisTickProps}
                            axisLine={{ stroke: TD.CARD_BORDER }}
                            tickLine={false}
                          />
                          <YAxis tick={axisTickProps} tickFormatter={(v) => formatCompact(v)} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={tooltipContentStyle}
                            labelFormatter={formatDate}
                            formatter={(value) => [formatCompact(Number(value)), selectedNumeric || 'Value']}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={TD.ACCENT_MID}
                            strokeWidth={2}
                            dot={(props) => {
                              const isSelected =
                                chartFilter?.type === 'date' &&
                                (props.payload?.date === chartFilter?.value || props.payload?.name === chartFilter?.value)
                              return (
                                <circle
                                  {...props}
                                  fill={isSelected ? TD.DANGER : TD.ACCENT_MID}
                                  r={isSelected ? 5 : 3}
                                  cursor="pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleLineClick(props.payload)
                                  }}
                                />
                              )
                            }}
                            activeDot={(props) => {
                              const isSelected =
                                chartFilter?.type === 'date' &&
                                (props.payload?.date === chartFilter?.value || props.payload?.name === chartFilter?.value)
                              return (
                                <circle
                                  {...props}
                                  r={isSelected ? 7 : 6}
                                  fill={isSelected ? TD.DANGER : '#60a5fa'}
                                  stroke="#fff"
                                  strokeWidth={2}
                                  cursor="pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleLineClick(props.payload)
                                  }}
                                />
                              )
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartHorizontalScroll>
                  ) : (
                    <div className="h-full min-h-[220px] flex items-center justify-center text-sm" style={{ color: TD.TEXT_3 }}>
                      Select date and numeric columns
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {visibleItemIds.includes('adv-distrib') && (
            <div key="adv-distrib" style={{ height: '100%' }}>
              <div
                className="group"
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>
                    {`Distribution by ${selectedCategorical || 'Category'}`}
                    {donutData.length > 0 ? (
                      <span className="tabular-nums ml-2" style={{ color: '#f8fafc' }}>
                        {formatCompact(donutTotal)}
                      </span>
                    ) : null}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {donutData.length > 0 ? (
                      <button
                        type="button"
                        className="chart-header-no-drag opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg"
                        onClick={() => handleChartClick('pie', donutData, `Distribution by ${selectedCategorical || 'Category'}`)}
                        style={{ color: TD.ACCENT_MID }}
                        title="Get AI insights for this chart"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => hideGridCard('adv-distrib')}
                      style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#ef4444'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#475569'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'auto' }}>
                  {donutData.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-6 min-h-0" style={{ height: '100%' }}>
                      <div className="relative flex-1 min-w-[200px]" style={{ maxWidth: '300px', minHeight: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={2}
                              dataKey="value"
                              onClick={(data, index) => handlePieClick(data)}
                            >
                              {donutData.map((entry, index) => {
                                const isSelected = chartFilter?.type === 'category' && chartFilter.value === entry.name
                                return (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={isSelected ? '#ef4444' : COLORS[index % COLORS.length]}
                                    style={{ cursor: 'pointer' }}
                                  />
                                )
                              })}
                            </Pie>
                            <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => [formatCompact(Number(value)), 'Value']} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="text-center">
                            <p style={{ color: TD.TEXT_1, fontSize: '24px', fontWeight: 500 }}>{formatCompact(donutTotal)}</p>
                            <p style={{ color: TD.TEXT_2, fontSize: '12px' }}>Total</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-2 overflow-y-auto" style={{ maxHeight: '100%' }}>
                        {donutData.map((item, index) => {
                          const isSelected = chartFilter?.type === 'category' && chartFilter.value === item.name
                          return (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm p-2 rounded transition-colors cursor-pointer"
                              style={{
                                border: `0.5px solid ${isSelected ? TD.DANGER : TD.CARD_BORDER}`,
                                background: isSelected ? 'rgba(239,68,68,0.12)' : 'transparent',
                              }}
                              onClick={() => handlePieClick(item)}
                            >
                              <div className="flex items-center space-x-2">
                                <div
                                  className={`w-3 h-3 rounded-full transition-all ${isSelected ? 'scale-125 shadow-md' : ''}`}
                                  style={{ backgroundColor: isSelected ? '#ef4444' : COLORS[index % COLORS.length] }}
                                />
                                <span style={{ fontWeight: isSelected ? 600 : 500, color: isSelected ? TD.DANGER : TD.TEXT_2 }}>{item.name}</span>
                              </div>
                              <span style={{ fontWeight: 600, color: isSelected ? TD.DANGER : TD.TEXT_1 }}>{formatCompact(item.value)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: TD.TEXT_3 }}>
                      Select category column
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {visibleItemIds.includes('adv-anomaly') && (
            <div key="adv-anomaly" style={{ height: '100%' }}>
              <div
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>Anomaly detection</span>
                  <button
                    type="button"
                    onClick={() => hideGridCard('adv-anomaly')}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#475569'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'auto' }}>
                  <p className="mb-4 text-xs" style={{ color: TD.TEXT_3 }}>
                    Z-scores for <span style={{ fontWeight: 500, color: TD.TEXT_2 }}>{selectedNumeric}</span>
                    {selectedCategorical ? (
                      <> · <span style={{ fontWeight: 500, color: TD.TEXT_2 }}>{selectedCategorical}</span></>
                    ) : null}
                    . Flags <code className="rounded px-1 text-[11px]" style={{ background: TD.PAGE_BG, color: TD.TEXT_2 }}>|z| &gt; 2</code>.
                  </p>
                  {anomalyDetection.anomalies.length === 0 ? (
                    <p className="text-sm" style={{ color: TD.TEXT_2 }}>
                      No statistical outliers in this view.
                    </p>
                  ) : (
                    <>
                      <ul className="max-h-[min(320px,45vh)] space-y-2 overflow-y-auto pr-1">
                        {anomalyDetection.anomalies.slice(0, 12).map((a, idx) => {
                          const dot =
                            a.severity === 'high' ? TD.DANGER : a.severity === 'medium' ? TD.WARNING : TD.SUCCESS
                          const arm = a.z >= 0 ? 'above' : 'below'
                          return (
                            <li
                              key={`${a.label}-${idx}-${a.zRounded}`}
                              className="flex items-start gap-2 rounded-md px-3 py-2 text-sm"
                              style={{
                                border: `0.5px solid ${TD.CARD_BORDER}`,
                                background: TD.PAGE_BG,
                              }}
                            >
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} title={a.severityLabel} />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium" style={{ color: TD.TEXT_1 }}>
                                  {a.label}
                                </div>
                                <div className="text-xs" style={{ color: TD.TEXT_3 }}>
                                  {a.valueFormatted} · {Math.abs(a.zRounded)}σ {arm} mean
                                </div>
                              </div>
                              <span className="inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" style={a.badgeStyle}>
                                {a.severityLabel}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                      <button
                        type="button"
                        onClick={explainAnomaliesToClaude}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition sm:w-auto"
                        style={{
                          border: `0.5px solid ${TD.ACCENT_BLUE}`,
                          background: 'rgba(29,78,216,0.15)',
                          color: TD.TEXT_1,
                        }}
                      >
                        Ask Claude to explain these anomalies
                        <span aria-hidden>→</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {visibleItemIds.includes('adv-stats') && (
            <div key="adv-stats" style={{ height: '100%' }}>
              <div
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>Statistical summary</span>
                  <button
                    type="button"
                    onClick={() => hideGridCard('adv-stats')}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#475569'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'auto' }}>
                  {extendedColumnStats ? (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          k: 'skew',
                          label: 'Skewness',
                          val: extendedColumnStats.skewness.toFixed(1),
                          valColor: Math.abs(extendedColumnStats.skewness) > 1 ? TD.WARNING : TD.TEXT_1,
                        },
                        { k: 'kurt', label: 'Kurtosis', val: extendedColumnStats.kurtosisExcess.toFixed(1) },
                        { k: 'iqr', label: 'IQR', val: formatCompact(extendedColumnStats.iqr) },
                        { k: 'cv', label: 'CV', val: `${extendedColumnStats.cv.toFixed(1)}%` },
                        { k: 'p25', label: 'P25', val: formatCompact(extendedColumnStats.p25) },
                        { k: 'p75', label: 'P75', val: formatCompact(extendedColumnStats.p75) },
                      ].map((t) => (
                        <div
                          key={t.k}
                          className="rounded-lg px-3 py-2"
                          style={{ background: TD.PAGE_BG, border: `0.5px solid ${TD.CARD_BORDER}` }}
                        >
                          <div style={{ fontSize: '10px', fontWeight: 600, color: TD.TEXT_3, textTransform: 'uppercase' }}>{t.label}</div>
                          <div className="mt-1 tabular-nums text-sm font-semibold" style={{ color: t.valColor ?? TD.TEXT_1 }}>
                            {t.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: TD.TEXT_3 }}>
                      Select a numeric column.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {visibleItemIds.includes('adv-corr') && (
            <div key="adv-corr" style={{ height: '100%' }}>
              <div
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>Field relationships</span>
                  <button
                    type="button"
                    onClick={() => hideGridCard('adv-corr')}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#475569'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'auto' }}>
                  {correlationPreview.matrix.length >= 2 ? (
                    <div className="overflow-x-auto">
                      <div
                        className="inline-grid gap-1 text-[10px]"
                        style={{
                          gridTemplateColumns: `auto repeat(${correlationPreview.labels.length}, minmax(36px,1fr))`,
                        }}
                      >
                        <div />
                        {correlationPreview.labels.map((lab, i) => (
                          <div
                            key={`h-${i}`}
                            className="truncate px-0.5 text-center font-medium"
                            style={{ color: TD.TEXT_3 }}
                            title={correlationPreview.fullLabels[i]}
                          >
                            {lab}
                          </div>
                        ))}
                        {correlationPreview.matrix.map((row, ri) => (
                          <Fragment key={`corr-row-${ri}`}>
                            <div
                              className="truncate pr-1 font-medium"
                              style={{ color: TD.TEXT_3, maxWidth: '72px' }}
                              title={correlationPreview.fullLabels[ri]}
                            >
                              {correlationPreview.labels[ri]}
                            </div>
                            {row.map((cell, ci) => {
                              const intensity = ri === ci ? 1 : Math.min(1, Math.abs(cell))
                              const bg =
                                ri === ci ? 'rgba(59,130,246,0.35)' : `rgba(59,130,246,${0.08 + intensity * 0.42})`
                              const shown = ri === ci ? '1.0' : cell.toFixed(2)
                              return (
                                <div
                                  key={`${ri}-${ci}`}
                                  className="flex h-8 items-center justify-center rounded tabular-nums font-medium"
                                  style={{
                                    background: bg,
                                    color: TD.TEXT_1,
                                    fontSize: ri === ci ? '11px' : '10px',
                                  }}
                                  title={`${correlationPreview.fullLabels[ri]} vs ${correlationPreview.fullLabels[ci]}`}
                                >
                                  {shown}
                                </div>
                              )
                            })}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: TD.TEXT_3 }}>
                      Add at least two numeric columns to see correlations.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {visibleItemIds.includes('adv-donut') && (
            <div key="adv-donut" style={{ height: '100%' }}>
              <div
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>Trend analysis with forecast</span>
                  <button
                    type="button"
                    onClick={() => hideGridCard('adv-donut')}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#475569'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div ref={forecastChartRef} style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'auto' }}>
                  <ForecastChart
                    data={filteredData || data}
                    selectedNumeric={selectedNumeric}
                    selectedDate={selectedDate}
                    forecastPeriods={7}
                    chartScrollHeight={Math.max(forecastHeight - 200, 240)}
                  />
                </div>
              </div>
            </div>
          )}

          {visibleItemIds.includes('adv-sunburst') && (
            <div key="adv-sunburst" style={{ height: '100%' }}>
              <div
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <h3 className="flex items-center gap-1.5 m-0" style={{ ...titleStyle, fontSize: '12px' }}>
                    <span
                      title={categoricalTooltip || undefined}
                      className={categoricalTooltip ? 'cursor-help border-b border-dotted' : ''}
                      style={{ borderColor: '#475569' }}
                    >
                      {secondaryCategory ? `${selectedCategorical} → ${secondaryCategory}` : selectedCategorical || 'Hierarchical'}
                    </span>
                    Distribution
                    {categoricalTooltip && (
                      <span style={{ color: '#94a3b8' }} className="text-sm" title={categoricalTooltip} aria-label="Meaning">
                        ⓘ
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => hideGridCard('adv-sunburst')}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#475569'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'hidden' }}>
                  <div className="h-full min-h-[200px]">
                    <SunburstChart
                      data={filteredData || data}
                      selectedCategorical={selectedCategorical}
                      selectedNumeric={selectedNumeric}
                      secondaryCategory={secondaryCategory}
                      onChartFilter={onChartFilter}
                      chartFilter={chartFilter}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {visibleItemIds.includes('adv-bar') && (
            <div key="adv-bar" style={{ height: '100%' }}>
              <div
                className="group"
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <h3 className="flex items-center gap-1.5 m-0" style={{ ...titleStyle, fontSize: '12px' }}>
                    <span
                      title={categoricalTooltip || undefined}
                      className={categoricalTooltip ? 'cursor-help border-b border-dotted' : ''}
                      style={{ borderColor: '#475569' }}
                    >
                      {selectedCategorical || 'Category'}
                    </span>
                    Comparison
                    {categoricalTooltip && (
                      <span style={{ color: '#94a3b8' }} className="text-sm" title={categoricalTooltip} aria-label="Meaning">
                        ⓘ
                      </span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {barData.length > 0 && (
                      <button
                        type="button"
                        className="chart-header-no-drag opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg"
                        onClick={() => handleChartClick('bar', barData, `${selectedCategorical || 'Category'} Comparison`)}
                        style={{ color: TD.ACCENT_MID }}
                        title="Get AI insights for this chart"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => hideGridCard('adv-bar')}
                      style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                      onMouseEnter={(e) => {
                        e.target.style.color = '#ef4444'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = '#475569'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'hidden' }}>
                  {barData.length > 0 ? (
                    <ChartHorizontalScroll pointCount={barData.length} pxPerPoint={32} height="100%">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={barData}
                          layout="vertical"
                          onClick={(data) => {
                            if (data && data.activePayload && data.activePayload[0]) {
                              handleBarClick(data.activePayload[0].payload)
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke={TD.GRID} vertical={false} />
                          <XAxis type="number" tick={axisTickProps} tickFormatter={(v) => formatCompact(v)} axisLine={{ stroke: TD.CARD_BORDER }} tickLine={false} />
                          <YAxis dataKey="name" type="category" width={100} tick={axisTickProps} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => [formatCompact(Number(value)), selectedNumeric || 'Value']} />
                          <Bar dataKey="value" fill={TD.BAR_FILL} radius={[0, 3, 3, 0]} cursor="pointer">
                            {barData.map((entry, index) => {
                              const isSelected = chartFilter?.type === 'category' && chartFilter.value === entry.name
                              return <Cell key={`cell-${index}`} fill={isSelected ? TD.DANGER : TD.BAR_FILL} />
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartHorizontalScroll>
                  ) : (
                    <div className="h-full min-h-[220px] flex items-center justify-center text-sm" style={{ color: TD.TEXT_3 }}>
                      Select category column
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {visibleItemIds.includes('adv-distribution') && (
            <div key="adv-distribution" style={{ height: '100%' }}>
              <div
                style={{
                  background: '#1e293b',
                  border: '0.5px solid #334155',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  color: '#f8fafc',
                }}
              >
                <div
                  className="chart-drag-handle"
                  style={{
                    padding: '10px 14px',
                    borderBottom: '0.5px solid #334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#162032',
                    flexShrink: 0,
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>
                    Distribution by {selectedCategorical || 'Category'}
                  </span>
                  <button
                    type="button"
                    onClick={() => hideGridCard('adv-distribution')}
                    style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#ef4444'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#475569'
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'auto' }}>
                  <div className="space-y-2 max-h-[min(300px,50vh)] overflow-y-auto">
                    {donutData.length > 0 ? (
                      donutData.map((item, index) => {
                        const percentage = ((item.value / donutTotal) * 100).toFixed(1)
                        const colorIndex = index % COLORS.length
                        return (
                          <div
                            key={index}
                            onClick={() => handleCardClick(item.name)}
                            className="p-3 rounded-lg border-l-4 transition-all hover:shadow-md cursor-pointer"
                            style={{
                              borderLeftColor:
                                chartFilter?.type === 'category' && chartFilter.value === item.name ? '#ef4444' : COLORS[colorIndex],
                              backgroundColor:
                                chartFilter?.type === 'category' && chartFilter.value === item.name
                                  ? 'rgba(239,68,68,0.12)'
                                  : `${COLORS[colorIndex]}14`,
                              border: `0.5px solid ${TD.CARD_BORDER}`,
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[colorIndex] }} />
                                <span style={{ fontWeight: 600, color: TD.TEXT_1 }}>{item.name}</span>
                              </div>
                              <div className="text-right">
                                <p style={{ fontSize: '14px', fontWeight: 700, color: TD.TEXT_1 }}>{formatCompact(item.value)}</p>
                                <p style={{ fontSize: '12px', color: TD.TEXT_2 }}>{percentage}%</p>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: TD.TEXT_3 }}>
                        Select category column
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </GridDashboard>
      )}

      <div
        className="flex flex-col gap-3 rounded-xl px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
        style={{ background: TD.CARD_BG, border: `0.5px solid ${TD.CARD_BORDER}` }}
      >
        <form onSubmit={submitAskFooter} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={askFooterDraft}
            onChange={(e) => setAskFooterDraft(e.target.value)}
            placeholder="Ask Claude about these patterns..."
            className="min-w-0 flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
            style={{
              background: TD.PAGE_BG,
              border: `0.5px solid ${TD.CARD_BORDER}`,
              color: TD.TEXT_1,
            }}
            aria-label="Ask Claude"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: TD.ACCENT_BLUE }}
          >
            Ask
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {lineData.length >= 2 && selectedNumeric && (
            <button
              type="button"
              className="font-medium transition hover:underline"
              style={{ color: TD.ACCENT_MID }}
              onClick={() =>
                dispatchAskClaude(
                  `Review "${selectedNumeric}" over time (bucketed by ${selectedDate || 'date'}). Recent periods: ${lineData
                    .slice(-8)
                    .map((d) => `${d.date}: ${formatCompact(d.value)}`)
                    .join('; ')}. What might explain the largest jump or drop?`
                )
              }
            >
              Why the spike? ↗
            </button>
          )}
          {lineData.length >= 2 &&
            extendedColumnStats?.forecastNext != null &&
            Number.isFinite(extendedColumnStats.forecastNext) && (
              <button
                type="button"
                className="font-medium transition hover:underline"
                style={{ color: TD.ACCENT_MID }}
                onClick={() =>
                  dispatchAskClaude(
                    `My linear-regression forecast for the next period for "${selectedNumeric}" is about ${formatCompact(
                      extendedColumnStats.forecastNext
                    )} (based on ${lineData.length} time buckets). Is that plausible and what should I sanity-check?`
                  )
                }
              >
                Predict next period ↗
              </button>
            )}
          {anomalyDetection.anomalies.length > 0 && (
            <button
              type="button"
              className="font-medium transition hover:underline"
              style={{ color: TD.ACCENT_MID }}
              onClick={explainAnomaliesToClaude}
            >
              Explain anomalies ↗
            </button>
          )}
        </div>
      </div>
    </div>
    {chartInsights && (
      <ChartInsights
        chartData={chartInsights.chartData}
        chartType={chartInsights.chartType}
        chartTitle={chartInsights.chartTitle}
        selectedNumeric={chartInsights.selectedNumeric}
        selectedCategorical={chartInsights.selectedCategorical}
        selectedDate={chartInsights.selectedDate}
        onClose={() => setChartInsights(null)}
      />
    )}
    </>
  )
}

// Memoize component to prevent unnecessary re-renders
export default memo(AdvancedDashboard)

