import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Label } from 'recharts'
import { parseNumericValue } from '../../utils/numberUtils'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']

const sampleDataForCharts = (data, maxRows = 5000) => {
  if (!data || data.length <= maxRows) return data
  const step = Math.ceil(data.length / maxRows)
  const sampled = []
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i])
  }
  return sampled
}

function DonutChartWidget({ data, filteredData, selectedCategorical, selectedDate, selectedNumeric, chartFilter, onChartFilter, showValues = false }) {
  const categoryColumn = selectedCategorical || selectedDate
  
  // Use filteredData if available, otherwise use data
  const dataToUse = filteredData || data
  
  const donutData = useMemo(() => {
    if (!dataToUse || !categoryColumn || !selectedNumeric) return []
    
    const sampled = sampleDataForCharts(dataToUse, 5000)
    const grouped = {}
    // Use a Set to track unique row identifiers to prevent counting duplicates
    // Create a unique key based on all row values to detect exact duplicates
    const seenRows = new Set()
    
    sampled.forEach((row) => {
      // Create a unique identifier for this row based on all its values
      // This helps detect if the same row appears multiple times in the data
      const rowKey = JSON.stringify(row)
      
      // Skip if we've seen this exact row before (duplicate detection)
      if (seenRows.has(rowKey)) {
        return
      }
      seenRows.add(rowKey)
      
      const key = row[categoryColumn] || 'Unknown'
      const value = parseNumericValue(row[selectedNumeric])
      grouped[key] = (grouped[key] || 0) + value
    })
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [dataToUse, categoryColumn, selectedNumeric])

  const donutTotal = useMemo(() => donutData.reduce((sum, item) => sum + item.value, 0), [donutData])

  const handlePieClick = (data) => {
    if (!onChartFilter) return // Don't allow filtering if onChartFilter is not provided (e.g., in report mode)
    if (data && data.name) {
      const isCurrentlySelected = chartFilter?.type === 'category' && chartFilter?.value === data.name
      if (isCurrentlySelected) {
        onChartFilter(null)
      } else {
        onChartFilter({ type: 'category', value: data.name })
      }
    }
  }

  if (donutData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Select category column
      </div>
    )
  }

  return (
    <div className="flex items-center gap-6 h-full" style={{ minHeight: '200px' }}>
      <div className="relative flex-1" style={{ maxWidth: '300px', minHeight: '200px' }}>
        <ResponsiveContainer width="100%" height="100%" minHeight={200}>
          <PieChart>
      <Pie
        data={donutData}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={100}
        paddingAngle={2}
        dataKey="value"
        onClick={onChartFilter ? handlePieClick : undefined}
        style={onChartFilter ? { cursor: 'pointer' } : { cursor: 'default' }}
              label={showValues ? (entry) => {
                const percentage = ((entry.value / donutTotal) * 100).toFixed(1)
                return `${entry.value.toLocaleString()} (${percentage}%)`
              } : false}
              labelLine={showValues}
              outerRadius={showValues ? 90 : 100}
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
      <div className="flex-1 space-y-2 overflow-y-auto max-h-full">
        {donutData.map((item, index) => {
          const percentage = ((item.value / donutTotal) * 100).toFixed(1)
          const isSelected = chartFilter?.type === 'category' && chartFilter.value === item.name
          return (
            <div 
              key={index} 
              className={`flex items-center justify-between text-sm p-2 rounded transition-colors ${
                onChartFilter ? 'cursor-pointer' : 'cursor-default'
              } ${
                isSelected ? 'bg-red-50 border border-red-200' : onChartFilter ? 'hover:bg-gray-50' : ''
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
  )
}

export default DonutChartWidget

