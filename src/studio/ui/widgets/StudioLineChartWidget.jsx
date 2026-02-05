import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function StudioLineChartWidget({ widget, queryData, config, format, error, isLoading, onDrilldown }) {
  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400 text-sm bg-white rounded-lg shadow p-4">
        <div className="text-center">
          <div className="text-xs mb-1">⚠️ Error</div>
          <div className="text-xs">{error}</div>
        </div>
      </div>
    )
  }
  
  if (isLoading || !queryData || !queryData.data || queryData.data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm bg-white rounded-lg shadow p-4">
        <div className="text-center">
          {isLoading ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mb-2"></div>
              <div className="text-xs">Loading...</div>
            </>
          ) : (
            <div className="text-xs">No data available</div>
          )}
        </div>
      </div>
    )
  }

  const handleClick = (data) => {
    if (onDrilldown && data) {
      onDrilldown(data)
    }
  }

  return (
    <div className="h-full p-4 flex flex-col bg-white rounded-lg shadow min-h-[300px]">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{widget.title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={queryData.data} onClick={handleClick} style={{ cursor: onDrilldown ? 'pointer' : 'default' }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey={config.x_axis} 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => {
                if (format?.y_axis?.type === 'currency') {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: format.y_axis.currency || 'USD',
                    notation: 'compact'
                  }).format(value)
                }
                return value
              }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              formatter={(value) => {
                if (format?.y_axis?.type === 'currency') {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: format.y_axis.currency || 'USD',
                    minimumFractionDigits: format.y_axis.decimals || 0
                  }).format(value)
                }
                return value
              }}
            />
            <Line 
              type={config.curve || 'monotone'}
              dataKey={config.y_axis}
              stroke="#3b82f6"
              strokeWidth={2}
              dot={onDrilldown ? { r: 4, fill: '#3b82f6', onClick: (data) => onDrilldown && onDrilldown(data.payload) } : false}
              activeDot={onDrilldown ? { r: 6, onClick: (data) => onDrilldown && onDrilldown(data.payload) } : { r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
