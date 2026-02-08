import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

export default function StudioPieChartWidget({ widget, queryData, config, format, error, isLoading }) {
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
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mb-2" />
              <div className="text-xs">Loading...</div>
            </>
          ) : (
            <div className="text-xs">No data available</div>
          )}
        </div>
      </div>
    )
  }

  const nameKey = config?.nameKey || config?.x_axis || Object.keys(queryData.data[0] || {})[0]
  const valueKey = config?.valueKey || config?.y_axis || Object.keys(queryData.data[0] || {})[1]

  return (
    <div className="h-full p-4 flex flex-col bg-white rounded-lg shadow min-h-[300px]">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{widget.title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={queryData.data}
              dataKey={valueKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius="70%"
              label={({ [nameKey]: name, [valueKey]: value }) => `${name}: ${value}`}
            >
              {(queryData.data || []).map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => (format?.y_axis?.type === 'currency'
                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
                : value)}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
