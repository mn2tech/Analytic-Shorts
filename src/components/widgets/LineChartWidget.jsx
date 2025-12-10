import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { parseNumericValue } from '../../utils/numberUtils'

// Sample data efficiently for charts
const sampleDataForCharts = (data, maxRows = 5000) => {
  if (!data || data.length <= maxRows) return data
  const step = Math.ceil(data.length / maxRows)
  const sampled = []
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i])
  }
  return sampled
}

function LineChartWidget({ data, selectedNumeric, selectedDate, chartFilter, onChartFilter }) {
  const lineData = useMemo(() => {
    if (!data || !selectedNumeric || !selectedDate) return []
    
    const sampled = sampleDataForCharts(data, 5000)
    const step = Math.max(1, Math.floor(sampled.length / 30))
    
    return sampled
      .filter((_, i) => i % step === 0)
      .map((row) => ({
        date: row[selectedDate] || '',
        value: parseNumericValue(row[selectedNumeric]),
        originalRow: row,
      }))
      .filter((item) => item.date)
      .slice(0, 30)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [data, selectedNumeric, selectedDate])

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const handleLineClick = (payload) => {
    if (payload && payload.date) {
      const isCurrentlySelected = chartFilter?.type === 'date' && chartFilter?.value === payload.date
      if (isCurrentlySelected) {
        onChartFilter(null)
      } else {
        onChartFilter({ type: 'date', value: payload.date })
      }
    }
  }

  if (lineData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Select date and numeric columns
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
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
  )
}

export default LineChartWidget

