import { useMemo } from 'react'
import { parseNumericValue } from '../../utils/numberUtils'

/**
 * HealthInsightsWidget - Automatically generates insights from health data (CDC)
 */
function HealthInsightsWidget({ data, selectedNumeric, selectedCategorical, selectedDate }) {
  const insights = useMemo(() => {
    if (!data || data.length === 0 || !selectedNumeric) {
      return []
    }

    const insights = []
    const numericColumn = selectedNumeric
    const categoryColumn = selectedCategorical || 'Metric'
    const dateColumn = selectedDate || 'Date' || 'Year'

    // Group by metric type
    const metricData = {}
    const dateValues = new Map()

    data.forEach((row) => {
      const metric = row[categoryColumn] || 'Unknown'
      const value = parseNumericValue(row[numericColumn])
      const date = row[dateColumn]

      if (!isNaN(value) && isFinite(value)) {
        if (!metricData[metric]) {
          metricData[metric] = []
        }
        metricData[metric].push({ date, value })

        if (date) {
          if (!dateValues.has(date)) {
            dateValues.set(date, {})
          }
          dateValues.get(date)[metric] = value
        }
      }
    })

    // Insight 1: Metric Comparison
    const metricAverages = {}
    Object.keys(metricData).forEach(metric => {
      const values = metricData[metric].map(d => d.value)
      metricAverages[metric] = values.reduce((sum, v) => sum + v, 0) / values.length
    })

    if (Object.keys(metricAverages).length > 1) {
      const sortedMetrics = Object.entries(metricAverages).sort((a, b) => b[1] - a[1])
      insights.push({
        type: 'comparison',
        title: '📊 Health Metrics Overview',
        content: `Tracking ${Object.keys(metricAverages).length} health metrics: ${Object.keys(metricAverages).join(', ')}.`,
        icon: '📊',
        color: 'blue'
      })
    }

    // Insight 2: Trends for each metric
    Object.entries(metricData).forEach(([metric, values]) => {
      if (values.length >= 2) {
        values.sort((a, b) => new Date(a.date) - new Date(b.date))
        const first = values[0].value
        const last = values[values.length - 1].value
        const change = last - first
        const changePercent = ((change / first) * 100).toFixed(1)

        if (Math.abs(changePercent) > 1) {
          const trend = change > 0 ? 'increased' : 'decreased'
          const metricName = metric.replace(/\(.*?\)/g, '').trim()
          insights.push({
            type: 'trend',
            title: `📈 ${metricName} Trend`,
            content: `${metricName} ${trend} by ${Math.abs(changePercent)}% from ${values[0].date} to ${values[values.length - 1].date} (${first.toFixed(1)} to ${last.toFixed(1)}).`,
            icon: change > 0 ? '📈' : '📉',
            color: change > 0 ? 'red' : 'green'
          })
        }
      }
    })

    // Insight 3: Current Status
    Object.entries(metricData).forEach(([metric, values]) => {
      if (values.length > 0) {
        values.sort((a, b) => new Date(b.date) - new Date(a.date))
        const latest = values[0]
        const metricName = metric.replace(/\(.*?\)/g, '').trim()
        
        // Determine if value is concerning based on metric type
        let status = 'normal'
        let statusText = ''
        if (metric.toLowerCase().includes('death')) {
          statusText = latest.value < 800 ? 'relatively low' : 'elevated'
          status = latest.value < 800 ? 'green' : 'orange'
        } else if (metric.toLowerCase().includes('birth')) {
          statusText = latest.value > 10 ? 'healthy' : 'low'
          status = latest.value > 10 ? 'green' : 'orange'
        } else if (metric.toLowerCase().includes('life expectancy')) {
          statusText = latest.value > 75 ? 'good' : 'concerning'
          status = latest.value > 75 ? 'green' : 'orange'
        }

        if (statusText) {
          insights.push({
            type: 'status',
            title: `💚 ${metricName} Status`,
            content: `Current ${metricName} is ${latest.value.toFixed(1)} (${statusText}), as of ${latest.date}.`,
            icon: '💚',
            color: status
          })
        }
      }
    })

    // Insight 4: Range Analysis
    Object.entries(metricData).forEach(([metric, values]) => {
      if (values.length >= 2) {
        const metricValues = values.map(v => v.value)
        const min = Math.min(...metricValues)
        const max = Math.max(...metricValues)
        const range = max - min
        
        if (range > 0) {
          const metricName = metric.replace(/\(.*?\)/g, '').trim()
          insights.push({
            type: 'range',
            title: `📉 ${metricName} Variability`,
            content: `${metricName} ranges from ${min.toFixed(1)} to ${max.toFixed(1)}, showing ${range > (max * 0.1) ? 'significant' : 'moderate'} variation.`,
            icon: '📉',
            color: 'purple'
          })
        }
      }
    })

    return insights.slice(0, 6) // Limit to 6 insights
  }, [data, selectedNumeric, selectedCategorical, selectedDate])

  if (insights.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm p-4">
        <div className="text-center">
          <p>No insights available</p>
          <p className="text-xs text-gray-400 mt-1">Ensure data has numeric and category columns</p>
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
          <span>Health Insights</span>
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Key findings from health metrics data
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
          💡 Tip: Filter by Metric column to focus on specific health indicators
        </p>
      </div>
    </div>
  )
}

export default HealthInsightsWidget
