import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { parseNumericValue } from '../utils/numberUtils'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6']

function SunburstChart({ data, selectedCategorical, selectedNumeric, secondaryCategory, onChartFilter, chartFilter }) {
  if (!data || data.length === 0 || !selectedCategorical || !selectedNumeric) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Select columns to view chart
      </div>
    )
  }

  // Create nested data structure
  const primaryGrouped = {}
  data.forEach((row) => {
    const primaryKey = row[selectedCategorical] || 'Unknown'
    const value = parseNumericValue(row[selectedNumeric])
    
    if (!primaryGrouped[primaryKey]) {
      primaryGrouped[primaryKey] = { total: 0, children: {} }
    }
    
    primaryGrouped[primaryKey].total += value
    
    if (secondaryCategory && row[secondaryCategory]) {
      const secondaryKey = row[secondaryCategory]
      if (!primaryGrouped[primaryKey].children[secondaryKey]) {
        primaryGrouped[primaryKey].children[secondaryKey] = 0
      }
      primaryGrouped[primaryKey].children[secondaryKey] += value
    }
  })

  // Prepare data for outer ring (primary categories)
  const outerData = Object.entries(primaryGrouped)
    .map(([name, data]) => ({ name, value: data.total }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  const total = outerData.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          {/* Outer ring - primary categories */}
          <Pie
            data={outerData}
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            onClick={(data) => {
              if (onChartFilter && data && data.name) {
                if (chartFilter?.type === 'category' && chartFilter.value === data.name) {
                  onChartFilter(null)
                } else {
                  onChartFilter({ type: 'category', value: data.name })
                }
              }
            }}
          >
            {outerData.map((entry, index) => {
              const isSelected = chartFilter?.type === 'category' && chartFilter.value === entry.name
              return (
                <Cell 
                  key={`outer-${index}`} 
                  fill={isSelected ? '#ef4444' : COLORS[index % COLORS.length]}
                  style={{ cursor: 'pointer' }}
                />
              )
            })}
          </Pie>
          
          {/* Inner ring - secondary breakdown (if available) */}
          {secondaryCategory && Object.keys(primaryGrouped).some(key => Object.keys(primaryGrouped[key].children).length > 0) && (
            <Pie
              data={Object.entries(primaryGrouped).flatMap(([primary, data]) =>
                Object.entries(data.children).map(([secondary, value]) => ({
                  name: `${primary} - ${secondary}`,
                  value,
                }))
              )}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={75}
              paddingAngle={1}
              dataKey="value"
            >
              {Object.entries(primaryGrouped).flatMap(([primary, data], primaryIndex) =>
                Object.entries(data.children).map(([secondary, value], secondaryIndex) => (
                  <Cell
                    key={`inner-${primary}-${secondary}`}
                    fill={COLORS[(primaryIndex + secondaryIndex) % COLORS.length]}
                    opacity={0.7}
                  />
                ))
              )}
            </Pie>
          )}
          
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
          <p className="text-xs text-gray-600">Total</p>
        </div>
      </div>
    </div>
  )
}

export default SunburstChart

