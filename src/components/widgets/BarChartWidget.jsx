import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts'
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

function BarChartWidget({ 
  data, 
  filteredData,
  selectedCategorical, 
  selectedDate, 
  selectedNumeric, 
  chartFilter, 
  onChartFilter, 
  showValues = false,
  valueFontSize = 12,
  barStyle = 'flat' // 'flat', 'sheen', 'gradient', '3d'
}) {
  const categoryColumn = selectedCategorical || selectedDate
  
  // Use filteredData if available, otherwise use data
  const dataToUse = filteredData || data
  
  const barData = useMemo(() => {
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
      .slice(0, 10)
  }, [dataToUse, categoryColumn, selectedNumeric])

  const handleBarClick = (payload) => {
    if (!onChartFilter) return // Don't allow filtering if onChartFilter is not provided (e.g., in report mode)
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
        margin={showValues ? { top: 5, right: Math.max(80, valueFontSize * 6), bottom: 5, left: 5 } : { top: 5, right: 5, bottom: 5, left: 5 }}
        onClick={(data) => {
          if (data && data.activePayload && data.activePayload[0]) {
            handleBarClick(data.activePayload[0].payload)
          }
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={showValues ? Math.max(120, valueFontSize * 8) : 100} 
          stroke="#6b7280" 
          style={{ fontSize: '12px' }} 
        />
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
            let fillColor = isSelected ? '#ef4444' : '#3b82f6'
            
            // Apply different styles based on barStyle prop
            if (barStyle === 'sheen' && !isSelected) {
              // Sheen effect - gradient with highlight
              fillColor = `url(#sheenGradient${index})`
            } else if (barStyle === 'gradient' && !isSelected) {
              // Gradient effect
              fillColor = `url(#gradient${index})`
            } else if (barStyle === '3d' && !isSelected) {
              // 3D effect with darker bottom
              fillColor = `url(#gradient3d${index})`
            }
            
            return (
              <Cell 
                key={`cell-${index}`} 
                fill={fillColor}
                style={barStyle === '3d' ? { 
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                } : {}}
              />
            )
          })}
          {showValues && (
            <LabelList 
              dataKey="value" 
              position="right" 
              formatter={(value) => value.toLocaleString()}
              style={{ fill: '#374151', fontSize: `${valueFontSize}px`, fontWeight: '500' }}
              offset={5}
            />
          )}
        </Bar>
        
        {/* SVG Definitions for gradients */}
        <defs>
          {barData.map((entry, index) => {
            const isSelected = chartFilter?.type === 'category' && chartFilter.value === entry.name
            const baseColor = isSelected ? '#ef4444' : '#3b82f6'
            
            if (isSelected) return null // No gradient for selected bars
            
            return (
              <g key={`defs-${index}`}>
                {/* Sheen gradient - diagonal highlight effect */}
                {barStyle === 'sheen' && (
                  <linearGradient id={`sheenGradient${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                    <stop offset="40%" stopColor={baseColor} stopOpacity={1} />
                    <stop offset="45%" stopColor="#ffffff" stopOpacity={0.4} />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity={0.3} />
                    <stop offset="55%" stopColor="#ffffff" stopOpacity={0.2} />
                    <stop offset="100%" stopColor={baseColor} stopOpacity={0.85} />
                  </linearGradient>
                )}
                
                {/* Regular gradient - top to bottom fade */}
                {barStyle === 'gradient' && (
                  <linearGradient id={`gradient${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                    <stop offset="50%" stopColor={baseColor} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={baseColor} stopOpacity={0.6} />
                  </linearGradient>
                )}
                
                {/* 3D gradient - depth effect */}
                {barStyle === '3d' && (
                  <linearGradient id={`gradient3d${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                    <stop offset="60%" stopColor={baseColor} stopOpacity={1} />
                    <stop offset="100%" stopColor={baseColor} stopOpacity={0.4} />
                  </linearGradient>
                )}
              </g>
            )
          })}
        </defs>
      </BarChart>
    </ResponsiveContainer>
  )
}

export default BarChartWidget

