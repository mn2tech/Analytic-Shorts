function MetricCards({ data, numericColumns, selectedNumeric, stats }) {
  if (!data || data.length === 0 || !stats) return null

  const calculateAdditionalMetrics = () => {
    const values = data
      .map((row) => parseFloat(row[selectedNumeric]))
      .filter((val) => !isNaN(val) && isFinite(val))

    if (values.length === 0) return null

    // Calculate engagement rate (percentage of non-zero values)
    const nonZeroCount = values.filter(v => v > 0).length
    const engagementRate = (nonZeroCount / values.length) * 100

    // Calculate average per item (same as avg)
    const avgPerItem = stats.avg

    // Calculate total unique values
    const uniqueValues = new Set(values).size

    // Calculate median
    const sorted = [...values].sort((a, b) => a - b)
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]

    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - stats.avg, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    return {
      engagementRate,
      avgPerItem,
      uniqueValues,
      median,
      stdDev,
      totalItems: data.length,
      activeItems: nonZeroCount,
    }
  }

  const metrics = calculateAdditionalMetrics()
  if (!metrics) return null

  const formatValue = (value, type = 'number') => {
    if (type === 'percentage') {
      return `${value.toFixed(2)}%`
    }
    if (type === 'time') {
      const hours = Math.floor(value / 3600)
      const minutes = Math.floor((value % 3600) / 60)
      const seconds = Math.floor(value % 60)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
    return typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value
  }

  // Calculate more meaningful metrics
  const values = data
    .map((row) => parseFloat(row[selectedNumeric]))
    .filter((val) => !isNaN(val) && isFinite(val))

  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const q1Index = Math.floor(sorted.length * 0.25)
  const q3Index = Math.floor(sorted.length * 0.75)
  const q1 = sorted[q1Index] || 0
  const q3 = sorted[q3Index] || 0
  const iqr = q3 - q1

  // Calculate growth rate (comparing first half vs second half)
  const mid = Math.floor(values.length / 2)
  const firstHalfAvg = mid > 0 ? values.slice(0, mid).reduce((a, b) => a + b, 0) / mid : 0
  const secondHalfAvg = mid > 0 ? values.slice(mid).reduce((a, b) => a + b, 0) / (values.length - mid) : 0
  const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0

  // Calculate coefficient of variation (relative variability)
  const cv = stats.avg > 0 ? (metrics.stdDev / stats.avg) * 100 : 0

  const cardData = [
    { label: 'Total Items', value: metrics.totalItems, color: 'gray' },
    { label: 'Engagement Rate', value: formatValue(metrics.engagementRate, 'percentage'), color: 'green' },
    { label: 'Total Sum', value: formatValue(stats.sum), color: 'purple' },
    { label: 'Average Value', value: formatValue(stats.avg), color: 'indigo' },
    { label: 'Median Value', value: formatValue(metrics.median), color: 'pink' },
    { label: 'Max Value', value: formatValue(stats.max), color: 'blue' },
    { label: 'Min Value', value: formatValue(stats.min), color: 'gray' },
    { label: 'Growth Rate', value: formatValue(growthRate, 'percentage'), color: growthRate >= 0 ? 'green' : 'red' },
    { label: 'Unique Values', value: metrics.uniqueValues, color: 'purple' },
    { label: 'Std Deviation', value: formatValue(metrics.stdDev), color: 'indigo' },
    { label: 'IQR (Spread)', value: formatValue(iqr), color: 'blue' },
    { label: 'Variability', value: formatValue(cv, 'percentage'), color: 'green' },
  ]

  const colorClasses = {
    blue: 'border-blue-500',
    green: 'border-green-500',
    purple: 'border-purple-500',
    indigo: 'border-indigo-500',
    pink: 'border-pink-500',
    gray: 'border-gray-500',
    red: 'border-red-500',
  }

  return (
    <div className="space-y-4">
      {/* First Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cardData.slice(0, 6).map((card, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${colorClasses[card.color] || 'border-gray-500'} border border-gray-200 hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer group`}
            title={`${card.label}: ${card.value}`}
          >
            <p className="text-xs text-gray-600 font-medium mb-1 group-hover:text-gray-900 transition-colors">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cardData.slice(6, 12).map((card, index) => (
          <div
            key={index + 6}
            className={`bg-white rounded-lg shadow-sm p-4 border-l-4 ${colorClasses[card.color] || 'border-gray-500'} border border-gray-200 hover:shadow-md hover:scale-105 transition-all duration-200 cursor-pointer group`}
            title={`${card.label}: ${card.value}`}
          >
            <p className="text-xs text-gray-600 font-medium mb-1 group-hover:text-gray-900 transition-colors">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MetricCards

