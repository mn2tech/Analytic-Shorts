import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import SunburstChart from './SunburstChart'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#06b6d4']

function AdvancedDashboard({ data, filteredData, selectedNumeric, selectedCategorical, selectedDate, onChartFilter, chartFilter, categoricalColumns }) {
  // Auto-select a secondary category for hierarchical view (use second categorical column if available)
  const secondaryCategory = categoricalColumns && categoricalColumns.length > 1 
    ? categoricalColumns.find(col => col !== selectedCategorical) || categoricalColumns[1]
    : null

  const prepareLineData = () => {
    if (!filteredData || !selectedNumeric || !selectedDate) return []
    
    const grouped = {}
    filteredData.forEach((row) => {
      const date = row[selectedDate] || ''
      const value = parseFloat(row[selectedNumeric]) || 0
      if (date) {
        grouped[date] = (grouped[date] || 0) + value
      }
    })
    
    return Object.entries(grouped)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 20)
  }

  const prepareBarData = () => {
    if (!filteredData || !selectedCategorical || !selectedNumeric) return []
    
    const grouped = {}
    filteredData.forEach((row) => {
      const key = row[selectedCategorical] || 'Unknown'
      const value = parseFloat(row[selectedNumeric]) || 0
      grouped[key] = (grouped[key] || 0) + value
    })
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }

  const prepareDonutData = () => {
    if (!filteredData || !selectedCategorical || !selectedNumeric) return []
    
    const grouped = {}
    filteredData.forEach((row) => {
      const key = row[selectedCategorical] || 'Unknown'
      const value = parseFloat(row[selectedNumeric]) || 0
      grouped[key] = (grouped[key] || 0) + value
    })
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }

  const lineData = prepareLineData()
  const barData = prepareBarData()
  const donutData = prepareDonutData()
  const donutTotal = donutData.reduce((sum, item) => sum + item.value, 0)

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

  return (
    <div className="space-y-6">
      {/* Top Row - 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Line Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedNumeric || 'Value'} Over Time
          </h3>
          {lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
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
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              Select date and numeric columns
            </div>
          )}
        </div>

        {/* Chart 2: Sunburst/Donut with Legend */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribution by {selectedCategorical || 'Category'}
          </h3>
          {donutData.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="relative flex-1" style={{ maxWidth: '300px' }}>
                <ResponsiveContainer width="100%" height={300}>
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
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              Select category column
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row - 3 Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart 3: Distribution Cards */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
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
        </div>

        {/* Chart 4: Sunburst Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {secondaryCategory ? `${selectedCategorical} → ${secondaryCategory}` : selectedCategorical || 'Hierarchical'} Distribution
          </h3>
          <div className="h-[300px]">
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

        {/* Chart 5: Bar Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedCategorical || 'Category'} Comparison
            </h3>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
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
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
              Select category column
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdvancedDashboard

