import React from 'react'

export default function StudioKPIWidget({ widget, queryData, format, error, isLoading }) {
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
  
  if (isLoading || !queryData || queryData.value === undefined) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm bg-white rounded-lg shadow p-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mb-2"></div>
          <div className="text-xs">Loading...</div>
        </div>
      </div>
    )
  }

  const formatValue = (value) => {
    if (format?.type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: format.currency || 'USD',
        minimumFractionDigits: format.decimals || 0,
        maximumFractionDigits: format.decimals || 0
      }).format(value)
    }
    if (format?.type === 'percentage') {
      return `${value.toFixed(format.decimals || 1)}%`
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: format.decimals || 0,
      maximumFractionDigits: format.decimals || 0
    }).format(value)
  }

  return (
    <div className="h-full flex flex-col justify-center p-4 bg-white rounded-lg shadow">
      <div className="text-sm text-gray-600 mb-2">{widget.title}</div>
      <div className="text-3xl font-bold text-gray-900">
        {formatValue(queryData.value)}
      </div>
      {widget.trend?.enabled && queryData.trend && (
        <div className={`text-sm mt-2 ${queryData.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {queryData.trend >= 0 ? '↑' : '↓'} {Math.abs(queryData.trend).toFixed(1)}%
        </div>
      )}
    </div>
  )
}
