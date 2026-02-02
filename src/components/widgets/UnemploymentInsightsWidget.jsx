import { useMemo } from 'react'
import { parseNumericValue } from '../../utils/numberUtils'

/**
 * UnemploymentInsightsWidget - Automatically generates insights from unemployment rate data
 */
function UnemploymentInsightsWidget({ data, selectedNumeric, selectedCategorical, selectedDate }) {
  const insights = useMemo(() => {
    if (!data || data.length === 0 || !selectedNumeric) {
      return []
    }

    const insights = []
    const numericColumn = selectedNumeric
    const dateColumn = selectedDate || 'Date' || 'Year' || 'Period'

    // Extract time series data
    const timeSeries = []
    data.forEach((row) => {
      const value = parseNumericValue(row[numericColumn])
      const date = row[dateColumn]
      if (!isNaN(value) && isFinite(value) && date) {
        timeSeries.push({ date, value })
      }
    })

    if (timeSeries.length === 0) return []

    // Sort by date
    timeSeries.sort((a, b) => new Date(a.date) - new Date(b.date))

    const values = timeSeries.map(d => d.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length
    const firstValue = values[0]
    const lastValue = values[values.length - 1]
    const change = lastValue - firstValue
    const changePercent = ((change / firstValue) * 100).toFixed(1)

    // Insight 1: Current Rate
    insights.push({
      type: 'current',
      title: '📊 Current Unemployment Rate',
      content: `The most recent unemployment rate is ${lastValue.toFixed(1)}%, ${change > 0 ? 'up' : 'down'} from ${firstValue.toFixed(1)}% at the start of the period.`,
      icon: '📊',
      color: 'blue'
    })

    // Insight 2: Trend Analysis
    if (Math.abs(changePercent) > 1) {
      const trend = change > 0 ? 'increasing' : 'decreasing'
      insights.push({
        type: 'trend',
        title: '📈 Unemployment Trend',
        content: `Unemployment rate is ${trend} by ${Math.abs(changePercent)}% over the period (${timeSeries[0].date} to ${timeSeries[timeSeries.length - 1].date}).`,
        icon: change > 0 ? '📈' : '📉',
        color: change > 0 ? 'red' : 'green'
      })
    }

    // Insight 3: Range Analysis
    const range = maxValue - minValue
    if (range > 0.5) {
      insights.push({
        type: 'range',
        title: '📉 Volatility',
        content: `Unemployment rate fluctuated between ${minValue.toFixed(1)}% and ${maxValue.toFixed(1)}%, a range of ${range.toFixed(1)} percentage points.`,
        icon: '📉',
        color: 'orange'
      })
    }

    // Insight 4: Average Rate
    insights.push({
      type: 'average',
      title: '📊 Average Rate',
      content: `The average unemployment rate over the period is ${avgValue.toFixed(1)}%, compared to the current rate of ${lastValue.toFixed(1)}%.`,
      icon: '📊',
      color: 'purple'
    })

    // Insight 5: Recent Changes (last 3 periods if available)
    if (timeSeries.length >= 3) {
      const recent = timeSeries.slice(-3)
      const recentChange = recent[recent.length - 1].value - recent[0].value
      if (Math.abs(recentChange) > 0.1) {
        insights.push({
          type: 'recent',
          title: '🔄 Recent Movement',
          content: `In the most recent period, unemployment ${recentChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(recentChange).toFixed(1)} percentage points.`,
          icon: '🔄',
          color: recentChange > 0 ? 'red' : 'green'
        })
      }
    }

    return insights
  }, [data, selectedNumeric, selectedCategorical, selectedDate])

  if (insights.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4">
        <div className="text-center">
          <p>No insights available</p>
          <p className="text-xs text-gray-400 mt-1">Ensure data has numeric and date columns</p>
        </div>
      </div>
    )
  }

  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900'
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-3">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>📖</span>
          <span>Unemployment Insights</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Key findings from unemployment rate data
        </p>
      </div>

      {insights.map((insight, index) => (
        <div
          key={index}
          className={`border-l-4 rounded-lg p-4 ${colorClasses[insight.color] || colorClasses.blue}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{insight.icon}</span>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{insight.title}</h4>
              <p className="text-sm leading-relaxed">{insight.content}</p>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          💡 Tip: Use date filters to analyze specific time periods
        </p>
      </div>
    </div>
  )
}

export default UnemploymentInsightsWidget
