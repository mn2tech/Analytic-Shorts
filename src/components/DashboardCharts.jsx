import { useEffect, useMemo, useRef, useState, memo } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'
import ChartInsights from './ChartInsights'
import DateRangeSlider from './DateRangeSlider'
import { parseNumericValue } from '../utils/numberUtils'
import VesselMapWidget from './widgets/VesselMapWidget'
import ContractMapWidget from './widgets/ContractMapWidget'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']

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
  const [draggedChartId, setDraggedChartId] = useState(null)
  const [selectedTableRowIndex, setSelectedTableRowIndex] = useState(null)
  const [cardHeights, setCardHeights] = useState(chartLayout?.cardHeights || {})
  const [resizingCardId, setResizingCardId] = useState(null)
  const resizeStartRef = useRef({ id: null, startY: 0, startHeight: 0 })
  const cardHeightsRef = useRef(cardHeights)
  useEffect(() => {
    cardHeightsRef.current = cardHeights
  }, [cardHeights])
  useEffect(() => {
    setCardHeights(chartLayout?.cardHeights || {})
  }, [chartLayout?.cardHeights])
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
  const defaultOrder = ['map', 'line', 'bar', 'pie', 'table']
  const chartOrderFromProps = Array.isArray(chartLayout?.chartOrder) && chartLayout.chartOrder.length > 0
    ? chartLayout.chartOrder
    : defaultOrder
  const [localChartOrder, setLocalChartOrder] = useState(chartOrderFromProps)
  useEffect(() => {
    setLocalChartOrder(chartOrderFromProps)
  }, [chartOrderFromProps])
  const getOrder = (id) => {
    const idx = localChartOrder.indexOf(id)
    return idx === -1 ? 999 : idx
  }
  const onCardDragStart = (id, e) => {
    setDraggedChartId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  const onCardDrop = (targetId, e) => {
    const sourceId = e.dataTransfer.getData('text/plain') || draggedChartId
    if (!sourceId || !targetId || sourceId === targetId) return
    const next = [...localChartOrder]
    const from = next.indexOf(sourceId)
    const to = next.indexOf(targetId)
    if (from === -1 || to === -1) return
    next.splice(from, 1)
    next.splice(to, 0, sourceId)
    setLocalChartOrder(next)
    onChartLayoutUpdate?.({ chartOrder: next })
    setDraggedChartId(null)
  }
  const defaultCardHeight = (id) => {
    if (id === 'table') return 360
    if (id === 'map') return 440
    return 420
  }
  const getCardHeight = (id) => Math.max(280, Number(cardHeights?.[id] || defaultCardHeight(id)))
  const getChartHeight = (id) => Math.max(220, getCardHeight(id) - 120)
  const startResizeCard = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    resizeStartRef.current = {
      id,
      startY: e.clientY,
      startHeight: getCardHeight(id),
    }
    setResizingCardId(id)
  }
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

  useEffect(() => {
    if (!resizingCardId) return undefined
    const onMove = (e) => {
      const { id, startY, startHeight } = resizeStartRef.current
      if (!id) return
      const delta = e.clientY - startY
      const nextHeight = Math.max(280, startHeight + delta)
      setCardHeights((prev) => ({ ...prev, [id]: nextHeight }))
    }
    const onUp = () => {
      const id = resizeStartRef.current.id
      if (id) {
        onChartLayoutUpdate?.({ cardHeights: { [id]: cardHeightsRef.current?.[id] || getCardHeight(id) } })
      }
      resizeStartRef.current = { id: null, startY: 0, startHeight: 0 }
      setResizingCardId(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [resizingCardId, onChartLayoutUpdate])

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
  const chartCardPadding = 'p-6'
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
    <div
      className={`grid gap-6 mb-6 ${
        chartCount <= 1 ? 'grid-cols-1 max-w-4xl mx-auto' : 'grid-cols-1 lg:grid-cols-2'
      }`}
    >
      {/* Geo map card (state-based contract map) */}
      {showGeoMap && chartFlags.showMap && (
      <div
        className={`bg-white rounded-lg shadow-sm ${chartCardPadding} border border-gray-200 hover:shadow-md transition-shadow relative group cursor-move`}
        style={{ order: getOrder('map'), minHeight: getCardHeight('map') }}
        draggable
        onDragStart={(e) => onCardDragStart('map', e)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onCardDrop('map', e)}
        onDragEnd={() => setDraggedChartId(null)}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`${chartTitleClass} font-semibold text-gray-900 pr-2 break-words`}>
            Opportunity count by state
          </h3>
          <button type="button" onClick={() => hideChartById('map')} className="text-gray-400 hover:text-red-600">×</button>
        </div>
        <ContractMapWidget
          data={geoMapData || filteredData || data}
          selectedCategorical={geoSelectedCategorical || 'state'}
          selectedNumeric={geoSelectedNumeric || selectedNumeric}
          chartFilter={chartFilter}
          onChartFilter={onChartFilter}
        />
        <div
          className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90"
          onMouseDown={(e) => startResizeCard('map', e)}
          title="Resize chart"
        />
      </div>
      )}

      {/* Vessel Map (Maritime lat/lon) - replaces line chart when data has vessel positions */}
      {!showGeoMap && showVesselMap && chartFlags.showMap && (
      <div
        className={`bg-white rounded-lg shadow-sm ${chartCardPadding} border border-gray-200 hover:shadow-md transition-shadow relative group cursor-move`}
        style={{ order: getOrder('map'), minHeight: getCardHeight('map') }}
        draggable
        onDragStart={(e) => onCardDragStart('map', e)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onCardDrop('map', e)}
        onDragEnd={() => setDraggedChartId(null)}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`${chartTitleClass} font-semibold text-gray-900 pr-2 break-words`}>
            Vessel positions
          </h3>
          <button type="button" onClick={() => hideChartById('map')} className="text-gray-400 hover:text-red-600">×</button>
        </div>
        <VesselMapWidget
          data={vesselMapData || filteredData || data}
          latCol={vesselLatCol || 'lat'}
          lonCol={vesselLonCol || 'lon'}
          tooltipFields={['mmsi', 'vessel_type', 'sog', 'cog']}
        />
        <div
          className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90"
          onMouseDown={(e) => startResizeCard('map', e)}
          title="Resize chart"
        />
      </div>
      )}

      {/* Line Chart */}
      {showLineChart && chartFlags.showLineChart && (
      <div
        className={`bg-white rounded-lg shadow-sm ${chartCardPadding} border border-gray-200 hover:shadow-md transition-shadow relative group cursor-move`}
        style={{ order: getOrder('line'), minHeight: getCardHeight('line') }}
        draggable
        onDragStart={(e) => onCardDragStart('line', e)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onCardDrop('line', e)}
        onDragEnd={() => setDraggedChartId(null)}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`${chartTitleClass} font-semibold text-gray-900 pr-2 break-words`}>
            {selectedNumeric || 'Value'} {selectedDate ? 'Over Time' : ''}
          </h3>
          <div className="flex items-center gap-2">
            {lineData.length > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {lineData.reduce((sum, item) => sum + (item.value || 0), 0).toLocaleString()}
                </p>
              </div>
            )}
            {lineData.length > 0 && (
              <>
                <button
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
            <button type="button" onClick={() => hideChartById('line')} className="text-gray-400 hover:text-red-600">×</button>
          </div>
        </div>
        {hasValidLineData ? (
          <ResponsiveContainer width="100%" height={getChartHeight('line')}>
            <LineChart data={lineData} key={`line-${lineData.length}-${selectedNumeric}`}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey={selectedDate ? "date" : "name"}
                tickFormatter={selectedDate ? formatDate : undefined}
                stroke="#6b7280"
                style={{ fontSize: axisFontSize }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: axisFontSize }} />
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
        <div
          className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90"
          onMouseDown={(e) => startResizeCard('line', e)}
          title="Resize chart"
        />
      </div>
      )}

      {showBarChart && chartFlags.showBarChart && (
      <div
        className={`bg-white rounded-lg shadow-sm ${chartCardPadding} border border-gray-200 hover:shadow-md transition-shadow relative group cursor-move`}
        style={{ order: getOrder('bar'), minHeight: getCardHeight('bar') }}
        draggable
        onDragStart={(e) => onCardDragStart('bar', e)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onCardDrop('bar', e)}
        onDragEnd={() => setDraggedChartId(null)}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`${chartTitleClass} font-semibold text-gray-900 pr-2 break-words`}>
            {selectedNumeric || 'Value'} by {selectedCategorical || 'Category'}
          </h3>
          <button type="button" onClick={() => hideChartById('bar')} className="text-gray-400 hover:text-red-600">×</button>
        </div>
        <ResponsiveContainer width="100%" height={getChartHeight('bar')}>
          <BarChart data={prepareBarChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: axisFontSize }} />
            <YAxis stroke="#6b7280" style={{ fontSize: axisFontSize }} />
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
        <div
          className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90"
          onMouseDown={(e) => startResizeCard('bar', e)}
          title="Resize chart"
        />
      </div>
      )}

      {/* Pie/Donut Chart */}
      {showPieChart && chartFlags.showPieChart && (
      <div
        className={`bg-white rounded-lg shadow-sm ${chartCardPadding} border border-gray-200 hover:shadow-md transition-shadow relative group cursor-move`}
        style={{ order: getOrder('pie'), minHeight: getCardHeight('pie') }}
        draggable
        onDragStart={(e) => onCardDragStart('pie', e)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onCardDrop('pie', e)}
        onDragEnd={() => setDraggedChartId(null)}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`${chartTitleClass} font-semibold text-gray-900 pr-2 break-words`}>
            {pieTitle}
          </h3>
          {hasValidPieData && (
            <div className="flex items-center gap-2">
              {chartFilter?.type === 'category' &&
                typeof onSubawardDrilldown === 'function' &&
                (selectedCategorical === 'Recipient Name' || selectedCategorical === 'Prime contractor') && (
                  <button
                    onClick={() => onSubawardDrilldown(chartFilter.value)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 rounded-lg"
                    title="Drill down to subcontractors / subawards"
                  >
                    Subcontractors
                  </button>
                )}
              <button
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
                onClick={() => handleChartClick('pie', pieData, pieTitle)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                title="Get AI insights for this chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
              <button type="button" onClick={() => hideChartById('pie')} className="text-gray-400 hover:text-red-600">×</button>
            </div>
          )}
        </div>
        {hasValidPieData ? (
          <div className="flex items-center gap-6">
            {/* Chart on left - fixed width so center label cannot overlap the legend */}
            <div
              className={`relative overflow-hidden ${
                'w-[280px] shrink-0'
              }`}
              style={{ minHeight: baseChartHeight }}
            >
              <ResponsiveContainer width="100%" height={getChartHeight('pie')}>
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
                <p className="text-2xl font-bold text-gray-900 leading-tight">
                  {(pieAgg === 'avg' ? overallAvgValue : totalValue).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 leading-tight mt-0.5">
                  {pieAgg === 'avg' ? `Avg ${formatFieldLabel(selectedNumeric)}` : `Total ${formatFieldLabel(selectedNumeric)}`}
                </p>
              </div>
            </div>

            {/* Legend on right - takes remaining space so it never overlaps the chart */}
            <div className="flex-1 min-w-0 space-y-2">
              {pieData.slice(0, 8).map((item, index) => {
                const percentage = pieAgg === 'sum' && totalValue > 0
                  ? ((item.value / totalValue) * 100).toFixed(1)
                  : null
                const isHovered = hoveredSegment === index
                return (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between text-sm p-2 rounded transition-all cursor-pointer group ${
                      isHovered ? 'bg-blue-50 border border-blue-200' : 
                      chartFilter?.type === 'category' && chartFilter?.value === item.name
                        ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'
                    }`}
                    title={`${item.name}: ${item.value.toLocaleString()}${percentage ? ` (${percentage}%)` : ''} - Click to filter`}
                    onMouseEnter={() => setHoveredSegment(index)}
                    onMouseLeave={() => setHoveredSegment(null)}
                    onClick={() => handlePieClick({ name: item.name }, index)}
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <div 
                        className={`w-4 h-4 shrink-0 rounded-full transition-all ${
                          isHovered ? 'scale-125 shadow-md' : 'group-hover:scale-110'
                        }`}
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className={`font-medium transition-colors truncate min-w-0 ${
                        isHovered ? 'text-blue-700 font-semibold' : 'text-gray-700'
                      }`} title={item.name}>{item.name}</span>
                    </div>
                    <span className={`font-semibold ml-2 transition-colors ${
                      isHovered ? 'text-blue-700' : 'text-gray-900'
                    }`}>{item.value.toLocaleString()}</span>
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
        <div
          className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90"
          onMouseDown={(e) => startResizeCard('pie', e)}
          title="Resize chart"
        />
      </div>
      )}

      {chartFlags.showTable && (
      <div
        className={`bg-white rounded-lg shadow-sm ${chartCardPadding} border border-gray-200 hover:shadow-md transition-shadow relative group cursor-move`}
        style={{ order: getOrder('table'), minHeight: getCardHeight('table') }}
        draggable
        onDragStart={(e) => {
          if (e.target instanceof Element && e.target.closest('[data-no-drag="true"]')) {
            e.preventDefault()
            return
          }
          onCardDragStart('table', e)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => onCardDrop('table', e)}
        onDragEnd={() => setDraggedChartId(null)}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Table</h3>
        <button type="button" onClick={() => hideChartById('table')} className="absolute top-3 right-3 text-gray-400 hover:text-red-600">×</button>
        <div
          className="overflow-auto max-h-72 cursor-default"
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
        <div
          className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90"
          onMouseDown={(e) => startResizeCard('table', e)}
          title="Resize chart"
        />
      </div>
      )}
    </div>

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
                      <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
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

