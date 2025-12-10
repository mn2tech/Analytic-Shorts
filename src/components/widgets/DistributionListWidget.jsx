import { useMemo } from 'react'
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

function DistributionListWidget({ data, selectedCategorical, selectedDate, selectedNumeric, chartFilter, onChartFilter }) {
  const categoryColumn = selectedCategorical || selectedDate
  
  const listData = useMemo(() => {
    if (!data || !categoryColumn || !selectedNumeric) return []
    
    const sampled = sampleDataForCharts(data, 5000)
    const grouped = {}
    sampled.forEach((row) => {
      const key = row[categoryColumn] || 'Unknown'
      const value = parseNumericValue(row[selectedNumeric])
      grouped[key] = (grouped[key] || 0) + value
    })
    
    const total = Object.values(grouped).reduce((sum, val) => sum + val, 0)
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
  }, [data, categoryColumn, selectedNumeric])

  const handleCardClick = (name) => {
    const isCurrentlySelected = chartFilter?.type === 'category' && chartFilter?.value === name
    if (isCurrentlySelected) {
      onChartFilter(null)
    } else {
      onChartFilter({ type: 'category', value: name })
    }
  }

  if (listData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Select category column
      </div>
    )
  }

  return (
    <div className="space-y-2 h-full overflow-y-auto">
      {listData.map((item, index) => {
        const colorIndex = index % COLORS.length
        const isSelected = chartFilter?.type === 'category' && chartFilter.value === item.name
        return (
          <div
            key={index}
            onClick={() => handleCardClick(item.name)}
            className={`p-3 rounded-lg border-l-4 transition-all hover:shadow-md cursor-pointer ${
              isSelected ? 'ring-2 ring-red-500 ring-opacity-50 bg-red-50' : ''
            }`}
            style={{
              borderLeftColor: isSelected ? '#ef4444' : COLORS[colorIndex],
              backgroundColor: isSelected ? '#fef2f2' : `${COLORS[colorIndex]}08`,
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
                <p className="text-xs text-gray-600">{item.percentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DistributionListWidget

