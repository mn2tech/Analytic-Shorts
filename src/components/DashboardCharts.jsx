import { useEffect, useMemo, useState, memo } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import ChartInsights from './ChartInsights'
import DateRangeSlider from './DateRangeSlider'
import { parseNumericValue } from '../utils/numberUtils'
import { formatCompact } from '../utils/formatNumber'
import VesselMapWidget from './widgets/VesselMapWidget'
import ContractMapWidget from './widgets/ContractMapWidget'
import GridDashboard from './GridDashboard'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']

const DEFAULT_GRID_LAYOUT = [
  { i: 'map', x: 0, y: 0, w: 12, h: 10, minW: 4, minH: 7 },
  { i: 'line', x: 0, y: 10, w: 6, h: 9, minW: 3, minH: 5 },
  { i: 'bar', x: 6, y: 10, w: 6, h: 9, minW: 3, minH: 5 },
  { i: 'pie', x: 0, y: 19, w: 6, h: 10, minW: 3, minH: 6 },
  { i: 'table', x: 0, y: 29, w: 12, h: 8, minW: 4, minH: 4 },
]

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

function DashboardCharts({ data, filteredData, selectedNumeric, selectedCategorical, selectedDate, onChartFilter, chartFilter, onDateRangeFilter, onSubawardDrilldown, pieFilteredData, pieDimensionOverride, pieTitleOverride, showVesselMap, vesselMapData, vesselLatCol, vesselLonCol, showGeoMap, geoMapData, geoSelectedNumeric, geoSelectedCategorical, chartLayout, onChartLayoutUpdate }) {
  const [hoveredSegment, setHoveredSegment] = useState(null)
  const [chartInsights, setChartInsights] = useState(null)
  const [maximized, setMaximized] = useState(null) // { type: 'line' | 'pie', title: string } | null
  const [selectedTableRowIndex, setSelectedTableRowIndex] = useState(null)
  // Heuristic: pick "avg-like" vs "sum-like" aggregation for a metric when grouping.
  // This avoids misleading totals like summing snapshot/rate metrics (e.g. ADR, occupancy_rate, rooms_available).
  const preferredAggregationForMetric = (field) => {
    const s = String(field || '').toLowerCase()
    if (!s) return 'sum'
    if (
      s.includes('rate') ||
      s.includes('pct') ||
      s.includes('percent') ||
      s.includes('ratio') ||
      s.includes('adr') ||
      s.includes('revpar') ||
      s.includes('occupancy') ||
      s.includes('available') ||
      s.includes('capacity') ||
      s.includes('inventory') ||
      s.includes('utilization')
    ) return 'avg'
    return 'sum'
  }

  const formatFieldLabel = (field) => {
    const raw = String(field || '').trim()
    if (!raw) return ''
    const lower = raw.toLowerCase()
    if (lower === 'adr') return 'ADR'
    if (lower === 'revpar') return 'RevPAR'
    if (lower === 'occupancy_rate') return 'Occupancy Rate'

    const withSpaces = raw
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .trim()

    return withSpaces
      .split(/\s+/)
      .map((w) => {
        const wl = w.toLowerCase()
        if (wl === 'id') return 'ID'
        if (wl === 'api') return 'API'
        if (wl === 'usd') return 'USD'
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      })
      .join(' ')
  }
  
  // Use filteredData for display (slider/filters), fallback to full data
  // Add defensive check to ensure data is valid array
  const displayData = useMemo(() => {
    const dataToUse = filteredData || data
    if (!Array.isArray(dataToUse)) return []
    if (dataToUse.length === 0) return []
    return dataToUse
  }, [filteredData, data])
  
  // Sample data for charts to improve performance
  const sampledDisplayData = useMemo(() => {
    if (!displayData || displayData.length === 0) return []
    return sampleDataForCharts(displayData, 5000)
  }, [displayData])
  
  // IMPORTANT: Pie chart should also respect filtered data (e.g. date slider),
  // otherwise it will look "stuck" while other charts update.
  // When pieFilteredData is provided (e.g. opportunity base-type filter), use it for the pie only.
  const pieBaseData = useMemo(() => {
    if (pieFilteredData && Array.isArray(pieFilteredData) && pieFilteredData.length > 0) return pieFilteredData
    const dataToUse = filteredData || data
    if (!Array.isArray(dataToUse) || dataToUse.length === 0) return []
    return dataToUse
  }, [pieFilteredData, filteredData, data])

  const sampledPieData = useMemo(() => {
    if (!pieBaseData || pieBaseData.length === 0) return []
    return sampleDataForCharts(pieBaseData, 10000)
  }, [pieBaseData])
  
  const prepareLineChartData = useMemo(() => {
    if (!sampledDisplayData || sampledDisplayData.length === 0 || !selectedNumeric) return []
    // A trend chart without a date axis tends to be noisy and misleading.
    if (!selectedDate) return []

    // Sample first, then process
    const step = Math.max(1, Math.floor(sampledDisplayData.length / 30))
    return sampledDisplayData
      .filter((_, i) => i % step === 0)
      .map((row) => ({
        date: row[selectedDate] || '',
        value: parseNumericValue(row[selectedNumeric]),
        originalRow: row,
      }))
      .filter((item) => item.date)
      .slice(0, 30)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [sampledDisplayData, selectedNumeric, selectedDate])

  const preparePieChartData = useMemo(() => {
    if (!sampledPieData || sampledPieData.length === 0) return []

    // Pie charts should be categorical breakdowns. Using a date as a "category"
    // usually creates misleading slices (e.g. summing 5 days -> 600 rooms).
    // When pieDimensionOverride is set (e.g. "organization" for opportunity base type), use it.
    const categoryColumn = pieDimensionOverride || selectedCategorical
    if (!categoryColumn) return []
    // When showing pie by org for base type, use opportunity_count if no metric selected
    const metricColumn = selectedNumeric || (pieDimensionOverride ? 'opportunity_count' : null)
    if (!metricColumn) return []

    const agg = preferredAggregationForMetric(metricColumn)
    const grouped = new Map() // key -> { sum, count }

    // Process sampled data instead of full dataset
    sampledPieData.forEach((row) => {
      const key = row?.[categoryColumn] || 'Unknown'
      const raw = row?.[metricColumn]
      if (raw === null || raw === undefined || raw === '') return
      const value = parseNumericValue(raw)
      if (!grouped.has(key)) grouped.set(key, { sum: 0, count: 0 })
      const rec = grouped.get(key)
      rec.sum += value
      rec.count += 1
    })

    const out = Array.from(grouped.entries()).map(([name, rec]) => ({
      name,
      value: agg === 'avg' ? (rec.count ? rec.sum / rec.count : 0) : rec.sum
    }))

    return out
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

  }, [sampledPieData, pieDimensionOverride, selectedCategorical, selectedNumeric])

  const prepareBarChartData = useMemo(() => {
    if (!sampledDisplayData || sampledDisplayData.length === 0) return []
    if (!selectedCategorical || !selectedNumeric) return []
    const grouped = new Map()
    sampledDisplayData.forEach((row) => {
      const key = String(row?.[selectedCategorical] ?? 'Unknown')
      const raw = row?.[selectedNumeric]
      if (raw === null || raw === undefined || raw === '') return
      const value = parseNumericValue(raw)
      if (!Number.isFinite(value)) return
      grouped.set(key, (grouped.get(key) || 0) + value)
    })
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [sampledDisplayData, selectedCategorical, selectedNumeric])

  const handlePieClick = (data, index) => {
    const categoryColumn = pieDimensionOverride || selectedCategorical
    if (categoryColumn && data && data.name) {
      const isCurrentlySelected = chartFilter?.type === 'category' && chartFilter?.value === data.name
      if (isCurrentlySelected) {
        onChartFilter(null) // Deselect if clicking same segment
      } else {
        onChartFilter({ type: 'category', value: data.name })
      }
    }
  }

  const handleLineClick = (data, index) => {
    if (selectedDate && data && data.date) {
      const isCurrentlySelected = chartFilter?.type === 'date' && chartFilter?.value === data.date
      if (isCurrentlySelected) {
        onChartFilter(null) // Deselect if clicking same point
      } else {
        onChartFilter({ type: 'date', value: data.date })
      }
    }
  }

  const lineData = prepareLineChartData
  const pieData = preparePieChartData
  const pieAgg = useMemo(() => preferredAggregationForMetric(selectedNumeric), [selectedNumeric])
  const pieTitle = useMemo(() => {
    if (pieTitleOverride) return pieTitleOverride
    if (!selectedCategorical || !selectedNumeric) return 'Breakdown'
    const aggLabel = pieAgg === 'avg' ? 'Average' : 'Total'
    const dimLabel = formatFieldLabel(pieDimensionOverride || selectedCategorical)
    return `${aggLabel} ${formatFieldLabel(selectedNumeric)} by ${dimLabel}`
  }, [pieTitleOverride, selectedCategorical, selectedNumeric, pieAgg, pieDimensionOverride])

  const totalValue = useMemo(() => {
    if (!pieData || pieData.length === 0) return 0
    return pieData.reduce((sum, item) => sum + (item.value || 0), 0)
  }, [pieData])

  const overallAvgValue = useMemo(() => {
    if (pieAgg !== 'avg' || !sampledPieData?.length || !selectedNumeric) return 0
    let sum = 0
    let count = 0
    for (const row of sampledPieData) {
      const raw = row?.[selectedNumeric]
      if (raw === null || raw === undefined || raw === '') continue
      const v = parseNumericValue(raw)
      sum += v
      count += 1
    }
    return count ? sum / count : 0
  }, [pieAgg, sampledPieData, selectedNumeric])
  
  // Add safety checks to prevent rendering with invalid data
  const hasValidLineData = lineData && Array.isArray(lineData) && lineData.length > 0
  const hasValidPieData = pieData && Array.isArray(pieData) && pieData.length > 0

  // Smart quality checks: hide charts that don't add clear signal.
  const lineQuality = useMemo(() => {
    if (!hasValidLineData) return { isMeaningful: false }
    const uniqueDates = new Set(lineData.map((d) => String(d?.date || ''))).size
    const uniqueValues = new Set(lineData.map((d) => Number(d?.value || 0).toFixed(6))).size
    return { isMeaningful: uniqueDates >= 3 && uniqueValues >= 2 }
  }, [hasValidLineData, lineData])

  const pieQuality = useMemo(() => {
    if (!hasValidPieData) return { isMeaningful: false }
    const nonZero = pieData.filter((d) => Number(d?.value || 0) > 0)
    const tooManySlices = nonZero.length > 10
    const maxShare = totalValue > 0
      ? Math.max(...nonZero.map((d) => Number(d.value || 0))) / totalValue
      : 1
    // When showing "by organization" for a base type (override), always show the pie if we have data.
    const isOverridePie = Boolean(pieDimensionOverride)
    const isMeaningful = isOverridePie
      ? nonZero.length >= 1 && !tooManySlices
      : nonZero.length >= 2 && !tooManySlices && maxShare < 0.98
    return { isMeaningful }
  }, [hasValidPieData, pieData, totalValue, pieDimensionOverride])

  const showLineChart = !showVesselMap && lineQuality.isMeaningful
  const showPieChart = pieQuality.isMeaningful
  const showBarChart = Array.isArray(prepareBarChartData) && prepareBarChartData.length > 0
  const chartFlags = {
    showMap: chartLayout?.showMap !== false,
    showLineChart: chartLayout?.showLineChart !== false,
    showBarChart: chartLayout?.showBarChart !== false,
    showPieChart: chartLayout?.showPieChart !== false,
    showTable: chartLayout?.showTable === true,
  }
  const chartCount =
    ((showGeoMap && chartFlags.showMap) ? 1 : ((showVesselMap && chartFlags.showMap) ? 1 : (showLineChart && chartFlags.showLineChart ? 1 : 0))) +
    ((showBarChart && chartFlags.showBarChart) ? 1 : 0) +
    ((showPieChart && chartFlags.showPieChart) ? 1 : 0) +
    (chartFlags.showTable ? 1 : 0)

  const lineTotal = useMemo(
    () => lineData.reduce((sum, item) => sum + (item.value || 0), 0),
    [lineData]
  )

  const visibleItemIds = useMemo(() => {
    const ids = []
    if ((showGeoMap || showVesselMap) && chartFlags.showMap) ids.push('map')
    if (showLineChart && chartFlags.showLineChart) ids.push('line')
    if (showBarChart && chartFlags.showBarChart) ids.push('bar')
    if (showPieChart && chartFlags.showPieChart) ids.push('pie')
    if (chartFlags.showTable) ids.push('table')
    return ids
  }, [
    showGeoMap,
    showVesselMap,
    showLineChart,
    showBarChart,
    showPieChart,
    chartFlags.showMap,
    chartFlags.showLineChart,
    chartFlags.showBarChart,
    chartFlags.showPieChart,
    chartFlags.showTable,
  ])

  const hideChartById = (id) => {
    const patch = {}
    if (id === 'map') patch.showMap = false
    if (id === 'line') patch.showLineChart = false
    if (id === 'bar') patch.showBarChart = false
    if (id === 'pie') patch.showPieChart = false
    if (id === 'table') patch.showTable = false
    onChartLayoutUpdate?.(patch)
  }
  const restoreChartById = (id) => {
    const patch = {}
    if (id === 'map') patch.showMap = true
    if (id === 'line') patch.showLineChart = true
    if (id === 'bar') patch.showBarChart = true
    if (id === 'pie') patch.showPieChart = true
    if (id === 'table') patch.showTable = true
    onChartLayoutUpdate?.(patch)
  }
  const renderAddChartIcon = (id) => {
    if (id === 'line') {
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
    if (id === 'bar') {
      return (
        <svg className="w-3.5 h-3.5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <rect x="3" y="10" width="3" height="7" rx="1" />
          <rect x="8.5" y="6" width="3" height="11" rx="1" />
          <rect x="14" y="3" width="3" height="14" rx="1" />
        </svg>
      )
    }
    if (id === 'pie') {
      return (
        <svg className="w-3.5 h-3.5 text-pink-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a8 8 0 108 8h-8V2z" />
          <path d="M12 2.3A8 8 0 0117.7 8H12V2.3z" />
        </svg>
      )
    }
    if (id === 'table') {
      return (
        <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" />
          <path d="M2.5 8h15M2.5 12h15M8 3.5v13M13 3.5v13" stroke="white" strokeWidth="1" />
        </svg>
      )
    }
    return (
      <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm2 3h3v3H6V6zm0 5h3v3H6v-3zm5-5h3v8h-3V6z" />
      </svg>
    )
  }

  const handleChartClick = (chartType, chartData, chartTitle) => {
    // Convert chart data back to original row format for insights
    let dataForInsights = []
    if (chartType === 'line') {
      // For line charts, use the original rows if available, otherwise reconstruct
      chartData.forEach(item => {
        if (item.originalRow) {
          dataForInsights.push(item.originalRow)
        } else {
          // Reconstruct row from chart data
          const row = {}
          if (selectedDate) row[selectedDate] = item.date || item.name
          if (selectedNumeric) row[selectedNumeric] = item.value
          dataForInsights.push(row)
        }
      })
      // If we don't have enough data, use the full filtered dataset
      if (dataForInsights.length === 0) {
        dataForInsights = displayData || data || []
      }
    } else if (chartType === 'pie') {
      // For pie chart, get the original rows that match each category shown
      if (selectedCategorical && selectedNumeric && data) {
        const categories = chartData.map(item => item.name)
        dataForInsights = data.filter(row => 
          categories.includes(row[selectedCategorical])
        )
      }
      // Fallback to filtered data if no matches
      if (dataForInsights.length === 0) {
        dataForInsights = displayData || data || []
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

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Close maximize modal with ESC, and prevent body scroll while open
  useEffect(() => {
    if (!maximized) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMaximized(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [maximized])

  const baseChartHeight = 300
  const chartTitleClass = 'text-lg'
  const axisFontSize = '12px'
  const pieInnerRadius = 60
  const pieOuterRadius = 100

  return (
    <>
    {(() => {
      const hiddenCharts = []
      if (!chartFlags.showMap) hiddenCharts.push({ id: 'map', label: 'Map' })
      if (!chartFlags.showLineChart) hiddenCharts.push({ id: 'line', label: 'Line' })
      if (!chartFlags.showBarChart) hiddenCharts.push({ id: 'bar', label: 'Bar' })
      if (!chartFlags.showPieChart) hiddenCharts.push({ id: 'pie', label: 'Pie' })
      if (!chartFlags.showTable) hiddenCharts.push({ id: 'table', label: 'Table' })
      if (hiddenCharts.length === 0) return null
      return (
        <div className="mb-4 bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600 inline-flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm2 3h3v3H6V6zm0 5h3v3H6v-3zm5-5h3v8h-3V6z" />
            </svg>
            Add charts:
          </span>
          {hiddenCharts.map((chart) => (
            <button
              key={chart.id}
              type="button"
              onClick={() => restoreChartById(chart.id)}
              className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5"
            >
              {renderAddChartIcon(chart.id)}
              Add {chart.label}
            </button>
          ))}
        </div>
      )
    })()}
    {visibleItemIds.length > 0 ? (
    <div className="mb-6">
      <GridDashboard
        dashboardId="main-charts"
        defaultLayout={DEFAULT_GRID_LAYOUT}
        visibleItemIds={visibleItemIds}
        onLayoutChange={() => console.log('layout changed')}
      >
      {/* Geo map card (state-based contract map) */}
      {showGeoMap && chartFlags.showMap && (
      <div key="map" style={{ height: '100%' }}>
        <div style={{
          background: '#1e293b',
          border: '0.5px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          color: '#f8fafc',
        }}>
          <div className="chart-drag-handle" style={{
            padding: '10px 14px',
            borderBottom: '0.5px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#162032',
            flexShrink: 0,
            userSelect: 'none',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>
              Opportunity count by state
            </span>
            <button type="button" onClick={() => hideChartById('map')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }} onMouseEnter={(e) => { e.target.style.color = '#ef4444' }} onMouseLeave={(e) => { e.target.style.color = '#475569' }}>×</button>
          </div>
          <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'hidden' }}>
            <ContractMapWidget
              data={geoMapData || filteredData || data}
              selectedCategorical={geoSelectedCategorical || 'state'}
              selectedNumeric={geoSelectedNumeric || selectedNumeric}
              chartFilter={chartFilter}
              onChartFilter={onChartFilter}
            />
          </div>
        </div>
      </div>
      )}

      {/* Vessel Map (Maritime lat/lon) - replaces line chart when data has vessel positions */}
      {!showGeoMap && showVesselMap && chartFlags.showMap && (
      <div key="map" style={{ height: '100%' }}>
        <div style={{
          background: '#1e293b',
          border: '0.5px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          color: '#f8fafc',
        }}>
          <div className="chart-drag-handle" style={{
            padding: '10px 14px',
            borderBottom: '0.5px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#162032',
            flexShrink: 0,
            userSelect: 'none',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>
              Vessel positions
            </span>
            <button type="button" onClick={() => hideChartById('map')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }} onMouseEnter={(e) => { e.target.style.color = '#ef4444' }} onMouseLeave={(e) => { e.target.style.color = '#475569' }}>×</button>
          </div>
          <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'hidden' }}>
            <VesselMapWidget
              data={vesselMapData || filteredData || data}
              latCol={vesselLatCol || 'lat'}
              lonCol={vesselLonCol || 'lon'}
              tooltipFields={['mmsi', 'vessel_type', 'sog', 'cog']}
            />
          </div>
        </div>
      </div>
      )}

      {/* Line Chart */}
      {showLineChart && chartFlags.showLineChart && (
      <div key="line" style={{ height: '100%' }}>
        <div className="group" style={{
          background: '#1e293b',
          border: '0.5px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          color: '#f8fafc',
        }}>
          <div className="chart-drag-handle" style={{
            padding: '10px 14px',
            borderBottom: '0.5px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#162032',
            flexShrink: 0,
            userSelect: 'none',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>
              {(selectedNumeric || 'Value')}{selectedDate ? ' Over Time' : ''}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {lineData.length > 0 && (
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#f8fafc' }}>
                  {formatCompact(lineTotal)}
                </span>
              )}
              {lineData.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setMaximized({
                        type: 'line',
                        title: `${selectedNumeric || 'Value'} ${selectedDate ? 'Over Time' : ''}`,
                      })
                    }
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg"
                    title="Maximize chart"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChartClick('line', lineData, `${selectedNumeric || 'Value'} ${selectedDate ? 'Over Time' : ''}`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                    title="Get AI insights for this chart"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </button>
                </>
              )}
              <button type="button" onClick={() => hideChartById('line')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }} onMouseEnter={(e) => { e.target.style.color = '#ef4444' }} onMouseLeave={(e) => { e.target.style.color = '#475569' }}>×</button>
            </div>
          </div>
          <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'hidden' }}>
            {hasValidLineData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} key={`line-${lineData.length}-${selectedNumeric}`}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey={selectedDate ? "date" : "name"}
                    tickFormatter={selectedDate ? formatDate : undefined}
                    stroke="#6b7280"
                    style={{ fontSize: axisFontSize }}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: axisFontSize }} tickFormatter={(v) => formatCompact(v)} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    labelFormatter={selectedDate ? formatDate : undefined}
                    animationDuration={200}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={(props) => {
                      const { dataKey, payload, value, ...svgProps } = props || {}
                      const isSelected = chartFilter?.type === 'date' && 
                        props.payload?.date === chartFilter?.value
                      return (
                        <circle
                          {...svgProps}
                          fill={isSelected ? '#ef4444' : '#3b82f6'}
                          r={isSelected ? 5 : 3}
                          cursor="pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLineClick(props.payload, props.index)
                          }}
                        />
                      )
                    }}
                    activeDot={(props) => {
                      const { dataKey, payload, value, ...svgProps } = props || {}
                      const isSelected = chartFilter?.type === 'date' && 
                        props.payload?.date === chartFilter?.value
                      return (
                        <circle
                          {...svgProps}
                          r={isSelected ? 7 : 6}
                          fill={isSelected ? '#ef4444' : '#2563eb'}
                          stroke="#fff"
                          strokeWidth={2}
                          cursor="pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLineClick(props.payload, props.index)
                          }}
                        />
                      )
                    }}
                    animationDuration={800}
                    animationBegin={0}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-400">
                Select columns to view chart
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {showBarChart && chartFlags.showBarChart && (
      <div key="bar" style={{ height: '100%' }}>
        <div style={{
          background: '#1e293b',
          border: '0.5px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          color: '#f8fafc',
        }}>
          <div className="chart-drag-handle" style={{
            padding: '10px 14px',
            borderBottom: '0.5px solid #334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#162032',
            flexShrink: 0,
            userSelect: 'none',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0' }}>
              {(selectedNumeric || 'Value')} by {selectedCategorical || 'Category'}
            </span>
            <button type="button" onClick={() => hideChartById('bar')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }} onMouseEnter={(e) => { e.target.style.color = '#ef4444' }} onMouseLeave={(e) => { e.target.style.color = '#475569' }}>×</button>
          </div>
          <div style={{ flex: 1, padding: '12px', minHeight: 0, overflow: 'hidden' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prepareBarChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: axisFontSize }} />
                <YAxis stroke="#6b7280" style={{ fontSize: axisFontSize }} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}

      {/* Pie/Donut Chart */}
      {showPieChart && chartFlags.showPieChart && (
      <div key="pie" style={{ height: '100%' }}>
        <div style={{
          background: '#1e293b',
          border: '0.5px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          color: '#f8fafc',
        }}
        className="group"
        >
        <div className="chart-drag-handle flex justify-between items-center gap-2" style={{
          padding: '10px 14px',
          borderBottom: '0.5px solid #334155',
          background: '#162032',
          flexShrink: 0,
          userSelect: 'none',
        }}>
          <h3 className={`${chartTitleClass} font-semibold pr-2 break-words`} style={{ color: '#e2e8f0', margin: 0 }}>
            {pieTitle}
          </h3>
          {hasValidPieData && (
            <div className="flex items-center gap-2">
              {chartFilter?.type === 'category' &&
                typeof onSubawardDrilldown === 'function' &&
                (selectedCategorical === 'Recipient Name' || selectedCategorical === 'Prime contractor') && (
                  <button
                    type="button"
                    onClick={() => onSubawardDrilldown(chartFilter.value)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg"
                    title="Drill down to subcontractors / subawards"
                  >
                    Subcontractors
                  </button>
                )}
              <button
                type="button"
                onClick={() =>
                  setMaximized({
                    type: 'pie',
                    title: pieTitle,
                  })
                }
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg"
                title="Maximize chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => handleChartClick('pie', pieData, pieTitle)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                title="Get AI insights for this chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
              <button type="button" onClick={() => hideChartById('pie')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }} onMouseEnter={(e) => { e.target.style.color = '#ef4444' }} onMouseLeave={(e) => { e.target.style.color = '#475569' }}>×</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '12px' }}>
        {hasValidPieData ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '12px',
              alignItems: 'center',
              minHeight: 0,
              minWidth: 0,
            }}
          >
            {/* Donut — fixed size */}
            <div
              className="relative shrink-0 overflow-hidden"
              style={{ flex: '0 0 auto', height: baseChartHeight, minHeight: 220, width: 280, maxWidth: '100%' }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart key={`pie-${pieData.length}-${selectedCategorical}`}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={pieInnerRadius}
                    outerRadius={pieOuterRadius}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    onMouseEnter={(data, index) => setHoveredSegment(index)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={handlePieClick}
                  >
                    {pieData.map((entry, index) => {
                      const isSelected = chartFilter?.type === 'category' && 
                        chartFilter?.value === entry.name
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={isSelected ? '#ef4444' : COLORS[index % COLORS.length]}
                          style={{ 
                            cursor: 'pointer',
                            opacity: hoveredSegment === null || hoveredSegment === index ? 1 : 0.5,
                            transition: 'opacity 0.2s, fill 0.2s',
                            stroke: isSelected ? '#dc2626' : 'none',
                            strokeWidth: isSelected ? 3 : 0,
                          }}
                        />
                      )
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb', 
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [
                      value.toLocaleString(),
                      `${pieAgg === 'avg' ? 'Avg' : 'Total'} ${formatFieldLabel(selectedNumeric) || 'Value'}`
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none" aria-hidden="true">
                <p className="text-2xl font-bold leading-tight">
                  {formatCompact(pieAgg === 'avg' ? overallAvgValue : totalValue)}
                </p>
                <p className="text-xs text-[#94a3b8] leading-tight mt-0.5">
                  {pieAgg === 'avg' ? `Avg ${formatFieldLabel(selectedNumeric)}` : `Total ${formatFieldLabel(selectedNumeric)}`}
                </p>
              </div>
            </div>

            {/* Legend — narrow column, labels truncated; full text in title */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                overflow: 'hidden',
                maxWidth: '120px',
              }}
            >
              {pieData.slice(0, 8).map((item, index) => {
                const percentage = pieAgg === 'sum' && totalValue > 0
                  ? ((item.value / totalValue) * 100).toFixed(1)
                  : null
                const isHovered = hoveredSegment === index
                return (
                  <div
                    key={index}
                    className={`cursor-pointer rounded px-0.5 py-0.5 transition-colors group ${
                      isHovered ? 'bg-blue-50/80' :
                      chartFilter?.type === 'category' && chartFilter?.value === item.name
                        ? 'bg-red-50/80' : 'hover:bg-white/5'
                    }`}
                    style={{ minWidth: 0, width: '100%' }}
                    title={`${item.name}: ${formatCompact(item.value)}${percentage ? ` (${percentage}%)` : ''} - Click to filter`}
                    onMouseEnter={() => setHoveredSegment(index)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => handlePieClick({ name: item.name }, index)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        className={`h-2.5 w-2.5 shrink-0 rounded-full transition-transform ${
                          isHovered ? 'scale-125' : ''
                        }`}
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '80px',
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                    <div
                      className="tabular-nums"
                      style={{
                        fontSize: '10px',
                        color: isHovered ? '#93c5fd' : '#cbd5e1',
                        paddingLeft: '16px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatCompact(item.value)}
                      {percentage ? ` (${percentage}%)` : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-400">
            Select category column to view distribution
          </div>
        )}
        </div>
        </div>
      </div>
      )}

      {chartFlags.showTable && (
      <div key="table" style={{ height: '100%' }}>
        <div style={{
          background: '#1e293b',
          border: '0.5px solid #334155',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          color: '#f8fafc',
          position: 'relative',
        }}>
          <div className="chart-drag-handle flex items-center justify-between" style={{
            padding: '10px 14px',
            borderBottom: '0.5px solid #334155',
            background: '#162032',
            flexShrink: 0,
            userSelect: 'none',
          }}>
            <h3 className="text-lg font-semibold" style={{ margin: 0 }}>Data Table</h3>
            <button type="button" onClick={() => hideChartById('table')} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '18px', lineHeight: 1 }} onMouseEnter={(e) => { e.target.style.color = '#ef4444' }} onMouseLeave={(e) => { e.target.style.color = '#475569' }}>×</button>
          </div>
        <div
          className="overflow-auto flex-1 min-h-0 cursor-default"
          style={{ padding: '12px' }}
          data-no-drag="true"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <table className="min-w-full text-sm cursor-default">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {Object.keys((displayData && displayData[0]) || {}).slice(0, 8).map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-gray-700">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(displayData || []).slice(0, 12).map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-t ${selectedTableRowIndex === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setSelectedTableRowIndex((prev) => (prev === idx ? null : idx))}
                >
                  {Object.keys((displayData && displayData[0]) || {}).slice(0, 8).map((col) => (
                    <td key={col} className="px-3 py-2 text-gray-700">{String(row?.[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
      )}
      </GridDashboard>
    </div>
    ) : null}

    {chartCount === 0 && (
      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6 text-sm text-gray-600">
        No clear chart signal with current selections. Data is still loaded; use a date column for trend and a low-cardinality category for breakdown.
      </div>
    )}

    {maximized && (
      <div
        className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
        onClick={() => setMaximized(null)}
      >
        <div
          className="bg-white w-full max-w-6xl rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{maximized.title}</h3>
              <p className="text-xs text-gray-500">Press ESC to close</p>
            </div>
            <button
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
              onClick={() => setMaximized(null)}
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6">
            {/* Date slider inside maximize modal (filters the whole dashboard) */}
            {selectedDate && typeof onDateRangeFilter === 'function' && (
              <div className="mb-4">
                <DateRangeSlider
                  data={data}
                  selectedDate={selectedDate}
                  onFilterChange={onDateRangeFilter}
                />
              </div>
            )}

            {maximized.type === 'line' ? (
              <div className="h-[520px]">
                {hasValidLineData ? (
                  <ResponsiveContainer width="100%" height={520}>
                    <LineChart data={lineData} key={`line-max-${lineData.length}-${selectedNumeric}`}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey={selectedDate ? "date" : "name"}
                        tickFormatter={selectedDate ? formatDate : undefined}
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} tickFormatter={(v) => formatCompact(v)} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                        labelFormatter={selectedDate ? formatDate : undefined}
                        animationDuration={200}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        animationDuration={800}
                        animationBegin={0}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[520px] flex items-center justify-center text-gray-400">No data to display</div>
                )}
              </div>
            ) : (
              <div className="h-[520px] flex items-center justify-center">
                {hasValidPieData ? (
                  <div className="w-full max-w-3xl">
                    <ResponsiveContainer width="100%" height={520}>
                      <PieChart key={`pie-max-${pieData.length}-${selectedCategorical || selectedDate}`}>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={120}
                          outerRadius={200}
                          paddingAngle={2}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={800}
                        >
                          {pieData.map((entry, index) => {
                            const isSelected = chartFilter?.type === 'category' && chartFilter?.value === entry.name
                            return (
                              <Cell
                                key={`cell-max-${index}`}
                                fill={isSelected ? '#ef4444' : COLORS[index % COLORS.length]}
                              />
                            )
                          })}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                          formatter={(value) => [Number(value || 0).toLocaleString(), 'Value']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[520px] flex items-center justify-center text-gray-400">No data to display</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}

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
export default memo(DashboardCharts)

