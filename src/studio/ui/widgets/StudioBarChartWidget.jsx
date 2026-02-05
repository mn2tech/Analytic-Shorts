import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function StudioBarChartWidget({ widget, queryData, config, format, error, isLoading, onDrilldown }) {
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
          <BarChart 
            data={queryData.data}
            layout={config.orientation === 'horizontal' ? 'vertical' : 'default'}
            onClick={handleClick}
            style={{ cursor: onDrilldown ? 'pointer' : 'default' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            {config.orientation === 'horizontal' ? (
              <>
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }}
                  tickFormatter={(value) => {
                    if (format?.x_axis?.type === 'currency') {
                      return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: format.x_axis.currency || 'USD',
                        notation: 'compact'
                      }).format(value)
                    }
                    return value
                  }}
                />
                <YAxis type="category" dataKey={config.y_axis} width={100} stroke="#6b7280" style={{ fontSize: '12px' }} />
              </>
            ) : (
              <>
                <XAxis dataKey={config.x_axis} stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }}
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
              </>
            )}
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              formatter={(value) => {
                const axisFormat = config.orientation === 'horizontal' ? format?.x_axis : format?.y_axis
                if (axisFormat?.type === 'currency') {
                  return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: axisFormat.currency || 'USD',
                    minimumFractionDigits: axisFormat.decimals || 0
                  }).format(value)
                }
                return value
              }}
            />
            <Bar 
              dataKey={config.orientation === 'horizontal' ? config.x_axis : config.y_axis}
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
              onClick={(data, index) => {
                if (onDrilldown && queryData?.data?.[index]) {
                  onDrilldown(queryData.data[index])
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
