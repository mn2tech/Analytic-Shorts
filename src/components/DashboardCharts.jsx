import { useState, useMemo, memo } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import ChartInsights from './ChartInsights'
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

function DashboardCharts({ data, filteredData, selectedNumeric, selectedCategorical, selectedDate, onChartFilter, chartFilter }) {
  const [hoveredSegment, setHoveredSegment] = useState(null)
  const [chartInsights, setChartInsights] = useState(null)
  
  // Use filteredData for display, but data for pie chart calculations (to show all categories)
  const displayData = filteredData || data
  
  // Sample data for charts to improve performance
  const sampledDisplayData = useMemo(() => sampleDataForCharts(displayData, 5000), [displayData])
  const sampledFullData = useMemo(() => sampleDataForCharts(data, 10000), [data])
  
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
    if (!sampledFullData || sampledFullData.length === 0) return []

    if (selectedCategorical && selectedNumeric) {
      const grouped = {}
      // Process sampled data instead of full dataset
      sampledFullData.forEach((row) => {
        const key = row[selectedCategorical] || 'Unknown'
        const value = parseNumericValue(row[selectedNumeric])
        grouped[key] = (grouped[key] || 0) + value
      })
      return Object.entries(grouped)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8)
    }

    return []
  }, [sampledFullData, selectedCategorical, selectedNumeric])

  const handlePieClick = (data, index) => {
    if (selectedCategorical && data && data.name) {
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
  const totalValue = useMemo(() => pieData.reduce((sum, item) => sum + item.value, 0), [pieData])

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
              <button
                onClick={() => handleChartClick('line', lineData, `${selectedNumeric || 'Value'} ${selectedDate ? 'Over Time' : ''}`)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                title="Get AI insights for this chart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {lineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
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
            {selectedCategorical || 'Distribution'}
          </h3>
          {pieData.length > 0 && (
            <button
              onClick={() => handleChartClick('pie', pieData, `Distribution by ${selectedCategorical || 'Category'}`)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
              title="Get AI insights for this chart"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </button>
          )}
        </div>
        {pieData.length > 0 ? (
          <div className="flex items-center gap-6">
            {/* Chart on left */}
            <div className="relative flex-1" style={{ maxWidth: '300px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
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
                    formatter={(value) => [value.toLocaleString(), 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-gray-900">{totalValue.toLocaleString()}</p>
                <p className="text-sm text-gray-600">{selectedNumeric || 'Total'}</p>
              </div>
            </div>
            
            {/* Legend on right */}
            <div className="flex-1 space-y-2">
              {pieData.slice(0, 8).map((item, index) => {
                const percentage = ((item.value / totalValue) * 100).toFixed(1)
                const isHovered = hoveredSegment === index
                return (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between text-sm p-2 rounded transition-all cursor-pointer group ${
                      isHovered ? 'bg-blue-50 border border-blue-200' : 
                      chartFilter?.type === 'category' && chartFilter?.value === item.name
                        ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'
                    }`}
                    title={`${item.name}: ${item.value.toLocaleString()} (${percentage}%) - Click to filter`}
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

