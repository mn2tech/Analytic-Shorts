import { useEffect, useMemo, useState, memo } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import ChartInsights from './ChartInsights'
import DateRangeSlider from './DateRangeSlider'
import { parseNumericValue } from '../utils/numberUtils'

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

function DashboardCharts({ data, filteredData, selectedNumeric, selectedCategorical, selectedDate, onChartFilter, chartFilter, onDateRangeFilter, onSubawardDrilldown }) {
  const [hoveredSegment, setHoveredSegment] = useState(null)
  const [chartInsights, setChartInsights] = useState(null)
  const [maximized, setMaximized] = useState(null) // { type: 'line' | 'pie', title: string } | null

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
  const pieBaseData = useMemo(() => {
    const dataToUse = filteredData || data
    if (!Array.isArray(dataToUse) || dataToUse.length === 0) return []
    return dataToUse
  }, [filteredData, data])

  const sampledPieData = useMemo(() => {
    if (!pieBaseData || pieBaseData.length === 0) return []
    return sampleDataForCharts(pieBaseData, 10000)
  }, [pieBaseData])
  
  const prepareLineChartData = useMemo(() => {
    if (!sampledDisplayData || sampledDisplayData.length === 0 || !selectedNumeric) return []

    if (selectedDate && selectedNumeric) {
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
    }

    return sampledDisplayData
      .filter((_, i) => i % Math.max(1, Math.floor(sampledDisplayData.length / 30)) === 0)
      .slice(0, 30)
      .map((row, index) => ({
        name: `Item ${index + 1}`,
        value: parseNumericValue(row[selectedNumeric]),
        originalRow: row,
      }))
  }, [sampledDisplayData, selectedNumeric, selectedDate])

  const preparePieChartData = useMemo(() => {
    if (!sampledPieData || sampledPieData.length === 0) return []

    // Pie charts should be categorical breakdowns. Using a date as a "category"
    // usually creates misleading slices (e.g. summing 5 days -> 600 rooms).
    const categoryColumn = selectedCategorical
    if (!categoryColumn || !selectedNumeric) return []

    const agg = preferredAggregationForMetric(selectedNumeric)
    const grouped = new Map() // key -> { sum, count }

    // Process sampled data instead of full dataset
    sampledPieData.forEach((row) => {
      const key = row?.[categoryColumn] || 'Unknown'
      const raw = row?.[selectedNumeric]
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

  }, [sampledPieData, selectedCategorical, selectedNumeric])

  const handlePieClick = (data, index) => {
    const categoryColumn = selectedCategorical
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
    if (!selectedCategorical || !selectedNumeric) return 'Breakdown'
    const aggLabel = pieAgg === 'avg' ? 'Average' : 'Total'
    return `${aggLabel} ${formatFieldLabel(selectedNumeric)} by ${formatFieldLabel(selectedCategorical)}`
  }, [selectedCategorical, selectedNumeric, pieAgg])

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

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Line Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow relative group">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
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
          </div>
        </div>
        {hasValidLineData ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData} key={`line-${lineData.length}-${selectedNumeric}`}>
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
                  const isSelected = chartFilter?.type === 'date' && 
                    props.payload?.date === chartFilter?.value
                  return (
                    <circle
                      {...props}
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
                  const isSelected = chartFilter?.type === 'date' && 
                    props.payload?.date === chartFilter?.value
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
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            Select columns to view chart
          </div>
        )}
      </div>

      {/* Pie/Donut Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow relative group">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
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
            </div>
          )}
        </div>
        {hasValidPieData ? (
          <div className="flex items-center gap-6">
            {/* Chart on left */}
            <div className="relative flex-1" style={{ maxWidth: '300px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart key={`pie-${pieData.length}-${selectedCategorical}`}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-gray-900">
                  {(pieAgg === 'avg' ? overallAvgValue : totalValue).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {pieAgg === 'avg' ? `Avg ${formatFieldLabel(selectedNumeric)}` : `Total ${formatFieldLabel(selectedNumeric)}`}
                </p>
              </div>
            </div>
            
            {/* Legend on right */}
            <div className="flex-1 space-y-2">
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
                    <div className="flex items-center space-x-2 flex-1">
                      <div 
                        className={`w-4 h-4 rounded-full transition-all ${
                          isHovered ? 'scale-125 shadow-md' : 'group-hover:scale-110'
                        }`}
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className={`font-medium transition-colors ${
                        isHovered ? 'text-blue-700 font-semibold' : 'text-gray-700'
                      }`}>{item.name}</span>
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
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            Select category column to view distribution
          </div>
        )}
      </div>
    </div>

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

