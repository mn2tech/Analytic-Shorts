import { useState, useMemo, useEffect, useRef, memo } from 'react'
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

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#06b6d4']

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
  const [cardHeights, setCardHeights] = useState(chartLayout?.cardHeights || {})
  const [resizingCardId, setResizingCardId] = useState(null)
  const [draggedCardId, setDraggedCardId] = useState(null)
  const resizeStartRef = useRef({ id: null, startY: 0, startHeight: 0 })
  const hiddenAdvancedCards = chartLayout?.hiddenAdvancedCards || {}
  const defaultTopOrder = ['adv-line', 'adv-donut']
  const defaultBottomOrder = ['adv-distribution', 'adv-sunburst', 'adv-bar']
  const [topOrder, setTopOrder] = useState(Array.isArray(chartLayout?.advancedTopOrder) ? chartLayout.advancedTopOrder : defaultTopOrder)
  const [bottomOrder, setBottomOrder] = useState(Array.isArray(chartLayout?.advancedBottomOrder) ? chartLayout.advancedBottomOrder : defaultBottomOrder)
  const cardHeightsRef = useRef(cardHeights)
  useEffect(() => { cardHeightsRef.current = cardHeights }, [cardHeights])
  useEffect(() => { setCardHeights(chartLayout?.cardHeights || {}) }, [chartLayout?.cardHeights])
  useEffect(() => {
    setTopOrder(Array.isArray(chartLayout?.advancedTopOrder) ? chartLayout.advancedTopOrder : defaultTopOrder)
  }, [chartLayout?.advancedTopOrder])
  useEffect(() => {
    setBottomOrder(Array.isArray(chartLayout?.advancedBottomOrder) ? chartLayout.advancedBottomOrder : defaultBottomOrder)
  }, [chartLayout?.advancedBottomOrder])
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

  const defaultCardHeight = (id) => (id === 'adv-forecast' ? 380 : 420)
  const getCardHeight = (id) => Math.max(280, Number(cardHeights?.[id] || defaultCardHeight(id)))
  const getChartHeight = (id) => Math.max(220, getCardHeight(id) - 120)
  const startResizeCard = (id, e) => {
    e.preventDefault()
    e.stopPropagation()
    resizeStartRef.current = { id, startY: e.clientY, startHeight: getCardHeight(id) }
    setResizingCardId(id)
  }
  const hideAdvancedCard = (id) => {
    onChartLayoutUpdate?.({ hiddenAdvancedCards: { [id]: true } })
  }
  const restoreAdvancedCard = (id) => {
    onChartLayoutUpdate?.({ hiddenAdvancedCards: { [id]: false } })
  }
  useEffect(() => {
    if (!resizingCardId) return undefined
    const onMove = (e) => {
      const { id, startY, startHeight } = resizeStartRef.current
      if (!id) return
      const nextHeight = Math.max(280, startHeight + (e.clientY - startY))
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
  const getOrder = (list, id) => {
    const idx = list.indexOf(id)
    return idx === -1 ? 999 : idx
  }
  const onCardDragStart = (id, e) => {
    setDraggedCardId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  const onCardDrop = (targetId, zone, e) => {
    const sourceId = e.dataTransfer.getData('text/plain') || draggedCardId
    if (!sourceId || !targetId || sourceId === targetId) return
    const isTop = zone === 'top'
    const current = [...(isTop ? topOrder : bottomOrder)]
    if (!current.includes(sourceId) || !current.includes(targetId)) return
    const from = current.indexOf(sourceId)
    const to = current.indexOf(targetId)
    current.splice(from, 1)
    current.splice(to, 0, sourceId)
    if (isTop) {
      setTopOrder(current)
      onChartLayoutUpdate?.({ advancedTopOrder: current })
    } else {
      setBottomOrder(current)
      onChartLayoutUpdate?.({ advancedBottomOrder: current })
    }
    setDraggedCardId(null)
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
    return (
      <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm2 3h3v3H6V6zm0 5h3v3H6v-3zm5-5h3v8h-3V6z" />
      </svg>
    )
  }

  return (
    <>
    <div className="space-y-6">
      {Object.entries(hiddenAdvancedCards).some(([, hidden]) => hidden) && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 inline-flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M4 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H4zm2 3h3v3H6V6zm0 5h3v3H6v-3zm5-5h3v8h-3V6z" />
            </svg>
            Add charts:
          </span>
          {Object.entries(hiddenAdvancedCards).filter(([, hidden]) => hidden).map(([id]) => (
            <button
              key={id}
              type="button"
              onClick={() => restoreAdvancedCard(id)}
              className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5"
            >
              {renderAddChartIcon(id)}
              Show {id.replace('adv-', '')}
            </button>
          ))}
        </div>
      )}
      {/* Insights Widgets - Show at top based on data type */}
      {isBudgetData && selectedNumeric && selectedCategorical && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <BudgetInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}
      {isUnemploymentData && selectedNumeric && selectedDate && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <UnemploymentInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}
      {isHealthData && selectedNumeric && selectedCategorical && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <HealthInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}
      {isSalesData && selectedNumeric && (selectedCategorical || selectedDate) && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <SalesInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}
      {isUSASpendingData && selectedNumeric && (selectedCategorical || selectedDate) && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <USASpendingInsightsWidget
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedCategorical={selectedCategorical}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* Top Row - 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Line Chart */}
        {!hiddenAdvancedCards['adv-line'] && <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 relative group cursor-move" style={{ minHeight: getCardHeight('adv-line'), order: getOrder(topOrder, 'adv-line') }} draggable onDragStart={(e) => onCardDragStart('adv-line', e)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onCardDrop('adv-line', 'top', e)} onDragEnd={() => setDraggedCardId(null)}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-1.5">
              <span title={numericTooltip || undefined} className={numericTooltip ? 'cursor-help border-b border-dotted border-gray-400' : ''}>
                {selectedNumeric || 'Value'}
              </span>
              Over Time
              {numericTooltip && (
                <span className="text-gray-400 text-sm" title={numericTooltip} aria-label="Meaning">ⓘ</span>
              )}
            </h3>
            {lineData.length > 0 && (
              <button
                onClick={() => handleChartClick('line', lineData, `${selectedNumeric || 'Value'} Over Time`)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                title="Get AI insights for this chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
            )}
            <button type="button" onClick={() => hideAdvancedCard('adv-line')} className="text-gray-400 hover:text-red-600">×</button>
          </div>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={getChartHeight('adv-line')}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                  labelFormatter={formatDate}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={(props) => {
                    const isSelected = chartFilter?.type === 'date' &&
                      (props.payload?.date === chartFilter?.value || props.payload?.name === chartFilter?.value)
                    return (
                      <circle
                        {...props}
                        fill={isSelected ? '#ef4444' : '#3b82f6'}
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
                    const isSelected = chartFilter?.type === 'date' &&
                      (props.payload?.date === chartFilter?.value || props.payload?.name === chartFilter?.value)
                    return (
                      <circle
                        {...props}
                        r={isSelected ? 7 : 6}
                        fill={isSelected ? '#ef4444' : '#2563eb'}
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
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Select date and numeric columns
            </div>
          )}
          <div className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90" onMouseDown={(e) => startResizeCard('adv-line', e)} title="Resize chart" />
        </div>}

        {/* Chart 2: Sunburst/Donut with Legend */}
        {!hiddenAdvancedCards['adv-donut'] && <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 relative group cursor-move" style={{ minHeight: getCardHeight('adv-donut'), order: getOrder(topOrder, 'adv-donut') }} draggable onDragStart={(e) => onCardDragStart('adv-donut', e)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onCardDrop('adv-donut', 'top', e)} onDragEnd={() => setDraggedCardId(null)}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-1.5">
              Distribution by{' '}
              <span title={categoricalTooltip || undefined} className={categoricalTooltip ? 'cursor-help border-b border-dotted border-gray-400' : ''}>
                {selectedCategorical || 'Category'}
              </span>
              {categoricalTooltip && (
                <span className="text-gray-400 text-sm" title={categoricalTooltip} aria-label="Meaning">ⓘ</span>
              )}
            </h3>
            {donutData.length > 0 && (
              <button
                onClick={() => handleChartClick('pie', donutData, `Distribution by ${selectedCategorical || 'Category'}`)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                title="Get AI insights for this chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
            )}
            <button type="button" onClick={() => hideAdvancedCard('adv-donut')} className="text-gray-400 hover:text-red-600">×</button>
          </div>
          {donutData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="relative flex-1" style={{ maxWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={getChartHeight('adv-donut')}>
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{donutTotal.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Total</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {donutData.map((item, index) => {
                  const percentage = ((item.value / donutTotal) * 100).toFixed(1)
                  const isSelected = chartFilter?.type === 'category' && chartFilter.value === item.name
                  return (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between text-sm p-2 rounded transition-colors cursor-pointer ${
                        isSelected ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handlePieClick(item)}
                    >
                      <div className="flex items-center space-x-2">
                        <div 
                          className={`w-3 h-3 rounded-full transition-all ${
                            isSelected ? 'scale-125 shadow-md' : ''
                          }`}
                          style={{ backgroundColor: isSelected ? '#ef4444' : COLORS[index % COLORS.length] }}
                        ></div>
                        <span className={`${isSelected ? 'text-red-700 font-semibold' : 'text-gray-700'}`}>
                          {item.name}
                        </span>
                      </div>
                      <span className={`font-medium ${isSelected ? 'text-red-700' : 'text-gray-900'}`}>
                        {item.value.toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Select category column
            </div>
          )}
          <div className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90" onMouseDown={(e) => startResizeCard('adv-donut', e)} title="Resize chart" />
        </div>}
      </div>

      {/* Bottom Row - 3 Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart 3: Distribution Cards */}
        {!hiddenAdvancedCards['adv-distribution'] && <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 relative cursor-move" style={{ minHeight: getCardHeight('adv-distribution'), order: getOrder(bottomOrder, 'adv-distribution') }} draggable onDragStart={(e) => onCardDragStart('adv-distribution', e)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onCardDrop('adv-distribution', 'bottom', e)} onDragEnd={() => setDraggedCardId(null)}>
          <button type="button" onClick={() => hideAdvancedCard('adv-distribution')} className="absolute top-3 right-3 text-gray-400 hover:text-red-600">×</button>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribution by {selectedCategorical || 'Category'}
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {donutData.length > 0 ? (
              donutData.map((item, index) => {
                const percentage = ((item.value / donutTotal) * 100).toFixed(1)
                const colorIndex = index % COLORS.length
                return (
                  <div
                    key={index}
                    onClick={() => handleCardClick(item.name)}
                    className={`p-3 rounded-lg border-l-4 transition-all hover:shadow-md cursor-pointer ${
                      chartFilter?.type === 'category' && chartFilter.value === item.name
                        ? 'ring-2 ring-red-500 ring-opacity-50 bg-red-50'
                        : ''
                    }`}
                    style={{
                      borderLeftColor: chartFilter?.type === 'category' && chartFilter.value === item.name 
                        ? '#ef4444' 
                        : COLORS[colorIndex],
                      backgroundColor: chartFilter?.type === 'category' && chartFilter.value === item.name
                        ? '#fef2f2'
                        : `${COLORS[colorIndex]}08`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[colorIndex] }}
                        ></div>
                        <span className="font-semibold text-gray-900">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{item.value.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">{percentage}%</p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                Select category column
              </div>
            )}
          </div>
          <div className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90" onMouseDown={(e) => startResizeCard('adv-distribution', e)} title="Resize chart" />
        </div>}

        {/* Chart 4: Sunburst Chart */}
        {!hiddenAdvancedCards['adv-sunburst'] && <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 relative cursor-move" style={{ minHeight: getCardHeight('adv-sunburst'), order: getOrder(bottomOrder, 'adv-sunburst') }} draggable onDragStart={(e) => onCardDragStart('adv-sunburst', e)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onCardDrop('adv-sunburst', 'bottom', e)} onDragEnd={() => setDraggedCardId(null)}>
          <button type="button" onClick={() => hideAdvancedCard('adv-sunburst')} className="absolute top-3 right-3 text-gray-400 hover:text-red-600">×</button>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-1.5">
            <span title={categoricalTooltip || undefined} className={categoricalTooltip ? 'cursor-help border-b border-dotted border-gray-400' : ''}>
              {secondaryCategory ? `${selectedCategorical} → ${secondaryCategory}` : selectedCategorical || 'Hierarchical'}
            </span>
            Distribution
            {categoricalTooltip && (
              <span className="text-gray-400 text-sm" title={categoricalTooltip} aria-label="Meaning">ⓘ</span>
            )}
          </h3>
          <div style={{ height: getChartHeight('adv-sunburst') }}>
            <SunburstChart 
              data={filteredData || data}
              selectedCategorical={selectedCategorical}
              selectedNumeric={selectedNumeric}
              secondaryCategory={secondaryCategory}
              onChartFilter={onChartFilter}
              chartFilter={chartFilter}
            />
          </div>
          <div className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90" onMouseDown={(e) => startResizeCard('adv-sunburst', e)} title="Resize chart" />
        </div>}

        {/* Chart 5: Bar Chart */}
        {!hiddenAdvancedCards['adv-bar'] && <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 relative group cursor-move" style={{ minHeight: getCardHeight('adv-bar'), order: getOrder(bottomOrder, 'adv-bar') }} draggable onDragStart={(e) => onCardDragStart('adv-bar', e)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onCardDrop('adv-bar', 'bottom', e)} onDragEnd={() => setDraggedCardId(null)}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-1.5">
              <span title={categoricalTooltip || undefined} className={categoricalTooltip ? 'cursor-help border-b border-dotted border-gray-400' : ''}>
                {selectedCategorical || 'Category'}
              </span>
              Comparison
              {categoricalTooltip && (
                <span className="text-gray-400 text-sm" title={categoricalTooltip} aria-label="Meaning">ⓘ</span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {barData.length > 0 && (
                <button
                  onClick={() => handleChartClick('bar', barData, `${selectedCategorical || 'Category'} Comparison`)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                  title="Get AI insights for this chart"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </button>
              )}
              <button type="button" onClick={() => hideAdvancedCard('adv-bar')} className="text-gray-400 hover:text-red-600">×</button>
            </div>
          </div>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={getChartHeight('adv-bar')}>
              <BarChart 
                data={barData} 
                layout="vertical"
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    handleBarClick(data.activePayload[0].payload)
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis dataKey="name" type="category" width={100} stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                >
                  {barData.map((entry, index) => {
                    const isSelected = chartFilter?.type === 'category' && chartFilter.value === entry.name
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isSelected ? '#ef4444' : '#3b82f6'}
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Select category column
            </div>
          )}
          <div className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90" onMouseDown={(e) => startResizeCard('adv-bar', e)} title="Resize chart" />
        </div>}
      </div>

      {/* Forecast Chart - Only show if date and numeric columns are selected */}
      {!hiddenAdvancedCards['adv-forecast'] && selectedDate && selectedNumeric && (
        <div className="mt-6 relative" style={{ minHeight: getCardHeight('adv-forecast') }}>
          <button type="button" onClick={() => hideAdvancedCard('adv-forecast')} className="absolute top-3 right-3 z-10 text-gray-400 hover:text-red-600 bg-white rounded">×</button>
          <ForecastChart
            data={filteredData || data}
            selectedNumeric={selectedNumeric}
            selectedDate={selectedDate}
            forecastPeriods={7}
          />
          <div className="absolute right-2 bottom-2 h-4 w-4 cursor-nwse-resize rounded-sm border border-gray-300 bg-white/90" onMouseDown={(e) => startResizeCard('adv-forecast', e)} title="Resize chart" />
        </div>
      )}
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

