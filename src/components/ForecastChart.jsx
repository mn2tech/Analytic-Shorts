import { useEffect, useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { generateForecast, combineHistoricalAndForecast, analyzeTrend } from '../utils/forecasting'
import ChartInsights from './ChartInsights'
import { parseNumericValue } from '../utils/numberUtils'

function preferredAggregationForMetric(field) {
  const s = String(field || '').toLowerCase()
  if (!s) return 'sum'
  if (
    s.includes('rate') ||
    s.includes('pct') ||
    s.includes('percent') ||
    s.includes('ratio') ||
    s.includes('adr') ||
    s.includes('revpar') ||
    s.includes('occupancy') ||
    s.includes('available') ||
    s.includes('capacity') ||
    s.includes('inventory') ||
    s.includes('utilization')
  ) return 'avg'
  return 'sum'
}

function formatFieldLabel(field) {
  const raw = String(field || '').trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (lower === 'adr') return 'ADR'
  if (lower === 'revpar') return 'RevPAR'
  if (lower === 'occupancy_rate') return 'Occupancy Rate'

  const withSpaces = raw
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()

  return withSpaces
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function toISODateKey(v) {
  if (v == null || v === '') return ''
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) {
    // If it's already YYYY-MM-DD, keep it
    const s = String(v).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    return ''
  }
  return d.toISOString().split('T')[0]
}

function ForecastChart({ data, selectedNumeric, selectedDate, forecastPeriods = 7, aggregation }) {
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true)
  const [chartInsights, setChartInsights] = useState(null)
  const [periods, setPeriods] = useState(forecastPeriods || 7)

  if (!data || !selectedNumeric || !selectedDate || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Select date and numeric columns to view forecast
      </div>
    )
  }

  // Keep internal selector in sync with prop changes (if parent overrides).
  useEffect(() => {
    if (typeof forecastPeriods === 'number' && Number.isFinite(forecastPeriods) && forecastPeriods > 0) {
      setPeriods(forecastPeriods)
    }
  }, [forecastPeriods])

  const agg = aggregation || preferredAggregationForMetric(selectedNumeric)

  // Prepare historical data (group by date, using sum/avg as appropriate).
  const historicalData = useMemo(() => {
    const base = Array.isArray(data) ? data : []
    const byDay = new Map() // date -> { sum, count }
    for (const row of base) {
      const dateKey = toISODateKey(row?.[selectedDate])
      if (!dateKey) continue
      const raw = row?.[selectedNumeric]
      if (raw === null || raw === undefined || raw === '') continue
      const val = parseNumericValue(raw)
      if (!Number.isFinite(val)) continue
      if (!byDay.has(dateKey)) byDay.set(dateKey, { sum: 0, count: 0 })
      const rec = byDay.get(dateKey)
      rec.sum += val
      rec.count += 1
    }

    const series = Array.from(byDay.entries())
      .map(([date, rec]) => ({
        date,
        value: agg === 'avg' ? (rec.count ? rec.sum / rec.count : 0) : rec.sum,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    // Use last N points for performance
    return series.slice(-60)
  }, [data, selectedDate, selectedNumeric, agg])

  if (historicalData.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        Need at least 2 data points for forecasting
      </div>
    )
  }

  // Generate forecast
  const forecastData = generateForecast(historicalData, periods)
  const combinedData = combineHistoricalAndForecast(historicalData, forecastData)

  // Analyze trend
  const trend = analyzeTrend(historicalData)

  const handleChartClick = () => {
    // Prepare data for insights - include both historical and forecast data
    const dataForInsights = combinedData.map(item => ({
      [selectedDate]: item.date,
      [selectedNumeric]: item.value,
      isForecast: item.isForecast || false,
      ...(item.upperBound && { upperBound: item.upperBound }),
      ...(item.lowerBound && { lowerBound: item.lowerBound })
    }))

    if (dataForInsights.length > 0) {
      setChartInsights({
        chartType: 'forecast',
        chartData: dataForInsights,
        chartTitle: `${formatFieldLabel(selectedNumeric) || selectedNumeric} Forecast (next ${periods} days)`,
        selectedNumeric,
        selectedCategorical: null,
        selectedDate,
        forecastData: forecastData,
        historicalData: historicalData,
        trend: trend
      })
    }
  }

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-gray-900 mb-2">{formatDate(label)}</p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Value:</span> {payload[0].value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          {dataPoint.isForecast && (
            <>
              <p className="text-xs text-purple-600 mt-1 font-medium">🔮 Forecasted</p>
              {showConfidenceInterval && dataPoint.upperBound && dataPoint.lowerBound && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Range: {dataPoint.lowerBound.toLocaleString(undefined, { maximumFractionDigits: 2 })} - {dataPoint.upperBound.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )
    }
    return null
  }

  // Find the last historical data point for reference line
  const lastHistoricalIndex = historicalData.length - 1

  return (
    <>
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-600">
            {formatFieldLabel(selectedNumeric) || selectedNumeric} forecast for next {periods} days
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Using {agg === 'avg' ? 'daily average' : 'daily total'} grouped by {formatFieldLabel(selectedDate) || selectedDate}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="hidden sm:inline">Horizon</span>
            <select
              value={periods}
              onChange={(e) => {
                const n = Number(e.target.value)
                setPeriods(Number.isFinite(n) && n > 0 ? n : 7)
              }}
              className="px-2 py-1 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500"
              title="Forecast horizon"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <button
            onClick={handleChartClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
            title="Get AI insights for this forecast"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
          {/* Trend indicator */}
          <div className="text-right">
            <div className={`text-xs font-medium ${
              trend.direction === 'upward' ? 'text-green-600' : 
              trend.direction === 'downward' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend.direction === 'upward' ? '📈 Upward' : 
               trend.direction === 'downward' ? '📉 Downward' : 
               '➡️ Neutral'} Trend
            </div>
            <div className="text-xs text-gray-500">
              Confidence: {(trend.confidence * 100).toFixed(1)}%
            </div>
          </div>
          {/* Toggle confidence interval */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showConfidenceInterval}
              onChange={(e) => setShowConfidenceInterval(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show range</span>
          </label>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={combinedData}>
          <defs>
            <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Historical data area */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorHistorical)"
            name="Historical"
            connectNulls
            isAnimationActive={true}
            animationDuration={800}
          />

          {/* Forecast area with confidence interval */}
          {showConfidenceInterval && (
            <>
              <Area
                type="monotone"
                dataKey="upperBound"
                stroke="none"
                fill="#8b5cf6"
                fillOpacity={0.1}
                name="Upper Bound"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="none"
                fill="#8b5cf6"
                fillOpacity={0.1}
                name="Lower Bound"
                connectNulls
              />
            </>
          )}

          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#8b5cf6"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Forecast"
            dot={{ fill: '#8b5cf6', r: 4 }}
            connectNulls
            isAnimationActive={true}
            animationDuration={800}
          />

          {/* Reference line at the transition point */}
          <ReferenceLine 
            x={combinedData[lastHistoricalIndex]?.date} 
            stroke="#ef4444" 
            strokeDasharray="3 3"
            label={{ value: "Now", position: "top", fill: "#ef4444", fontSize: 12 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Forecast summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Last Value</p>
            <p className="text-lg font-semibold text-gray-900">
              {historicalData[lastHistoricalIndex]?.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Forecasted (Next Period)</p>
            <p className="text-lg font-semibold text-purple-600">
              {forecastData[0]?.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Expected Change</p>
            <p className={`text-lg font-semibold ${
              trend.slope > 0 ? 'text-green-600' : trend.slope < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend.slope > 0 ? '+' : ''}
              {((forecastData[0]?.value - historicalData[lastHistoricalIndex]?.value) / historicalData[lastHistoricalIndex]?.value * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
    {chartInsights && (
      <ChartInsights
        chartData={chartInsights.chartData}
        chartType={chartInsights.chartType}
        chartTitle={chartInsights.chartTitle}
        selectedNumeric={chartInsights.selectedNumeric}
        selectedCategorical={chartInsights.selectedCategorical}
        selectedDate={chartInsights.selectedDate}
        forecastData={chartInsights.forecastData}
        historicalData={chartInsights.historicalData}
        trend={chartInsights.trend}
        onClose={() => setChartInsights(null)}
      />
    )}
    </>
  )
}

export default ForecastChart


