import { parseNumericValue } from '../utils/numberUtils'

function SummaryStats({ data, numericColumns, selectedNumeric }) {
  if (!data || data.length === 0 || !numericColumns || numericColumns.length === 0) {
    return null
  }

  const calculateStats = (column) => {
    if (!column) return null

    const values = data
      .map((row) => parseNumericValue(row[column]))
      .filter((val) => !isNaN(val))

    if (values.length === 0) return null

    const sum = values.reduce((a, b) => a + b, 0)
    const avg = sum / values.length
    const min = Math.min(...values)
    const max = Math.max(...values)

    // Calculate trend (compare first half vs second half)
    const mid = Math.floor(values.length / 2)
    if (mid > 0) {
      const firstHalf = values.slice(0, mid)
      const secondHalf = values.slice(mid)
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
      const trend = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0
      return { sum, avg, min, max, trend, count: values.length, totalRows: data.length }
    }

    return { sum, avg, min, max, trend: 0, count: values.length, totalRows: data.length }
  }

  const primaryColumn = selectedNumeric || numericColumns[0]
  const stats = calculateStats(primaryColumn)

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 animate-fade-in">
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
        <p className="text-sm text-gray-600 font-medium">Total Rows</p>
        <p className="text-2xl font-bold text-gray-900">{stats.totalRows}</p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
        <p className="text-sm text-gray-600 font-medium">Sum</p>
        <p className="text-2xl font-bold text-gray-900">
          {typeof stats.sum === 'number' ? stats.sum.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
        <p className="text-sm text-gray-600 font-medium">Average</p>
        <p className="text-2xl font-bold text-gray-900">
          {typeof stats.avg === 'number' ? stats.avg.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
        <p className="text-sm text-gray-600 font-medium">Min</p>
        <p className="text-2xl font-bold text-gray-900">
          {typeof stats.min === 'number' ? stats.min.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
        <p className="text-sm text-gray-600 font-medium">Max</p>
        <p className="text-2xl font-bold text-gray-900">
          {typeof stats.max === 'number' ? stats.max.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-indigo-500">
        <p className="text-sm text-gray-600 font-medium">Trend</p>
        <p className={`text-2xl font-bold ${stats.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {stats.trend >= 0 ? '+' : ''}{stats.trend.toFixed(1)}%
        </p>
      </div>
    </div>
  )
}

export default SummaryStats

