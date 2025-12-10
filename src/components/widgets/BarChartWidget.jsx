import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { parseNumericValue } from '../../utils/numberUtils'

const sampleDataForCharts = (data, maxRows = 5000) => {
  if (!data || data.length <= maxRows) return data
  const step = Math.ceil(data.length / maxRows)
  const sampled = []
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i])
  }
  return sampled
}

function BarChartWidget({ data, selectedCategorical, selectedDate, selectedNumeric, chartFilter, onChartFilter }) {
  const categoryColumn = selectedCategorical || selectedDate
  
  const barData = useMemo(() => {
    if (!data || !categoryColumn || !selectedNumeric) return []
    
    const sampled = sampleDataForCharts(data, 5000)
    const grouped = {}
    sampled.forEach((row) => {
      const key = row[categoryColumn] || 'Unknown'
      const value = parseNumericValue(row[selectedNumeric])
      grouped[key] = (grouped[key] || 0) + value
    })
    
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [data, categoryColumn, selectedNumeric])

  const handleBarClick = (payload) => {
    if (payload && payload.name) {
      const isCurrentlySelected = chartFilter?.type === 'category' && chartFilter?.value === payload.name
      if (isCurrentlySelected) {
        onChartFilter(null)
      } else {
        onChartFilter({ type: 'category', value: payload.name })
      }
    }
  }

  if (barData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Select category column
      </div>
    )
  }

  return (
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
  )
}

export default BarChartWidget

