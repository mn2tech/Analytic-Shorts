import { useEffect, useMemo, useState } from 'react'
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts'
import { generateForecast, combineHistoricalAndForecast, analyzeTrend } from '../utils/forecasting'
import ChartInsights from './ChartInsights'
import { parseNumericValue } from '../utils/numberUtils'
import { formatCompact } from '../utils/formatNumber'
import { TD } from '../constants/terminalDashboardPalette'
import { ChartHorizontalScroll } from './ChartHorizontalScroll'

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

function ForecastChart({ data, selectedNumeric, selectedDate, forecastPeriods = 7, aggregation, chartScrollHeight = 350 }) {
  const [showConfidenceInterval, setShowConfidenceInterval] = useState(true)
  const [chartInsights, setChartInsights] = useState(null)
  const [periods, setPeriods] = useState(forecastPeriods || 7)

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

  const tooltipBoxStyle = {
    background: TD.CARD_BG,
    border: `0.5px solid ${TD.CARD_BORDER}`,
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    padding: '12px',
  }
  const axisTick = { fill: TD.TEXT_3, fontSize: 11 }
  const histColor = TD.ACCENT_MID
  const forecastColor = TD.PIE_COLORS[1] || '#7c3aed'

  if (!data || !selectedNumeric || !selectedDate || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: TD.TEXT_3 }}>
        Select date and numeric columns to view forecast
      </div>
    )
  }

  if (historicalData.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: TD.TEXT_3 }}>
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
      const v = payload[0].value
      return (
        <div style={tooltipBoxStyle}>
          <p style={{ fontWeight: 600, color: TD.TEXT_1, marginBottom: '8px', fontSize: '13px' }}>{formatDate(label)}</p>
          <p style={{ fontSize: '12px', color: TD.TEXT_2 }}>
            <span style={{ fontWeight: 500 }}>Value:</span>{' '}
            {formatCompact(Number(v))}
          </p>
          {dataPoint.isForecast && (
            <>
              <p style={{ fontSize: '11px', color: forecastColor, marginTop: '6px', fontWeight: 500 }}>Forecasted</p>
              {showConfidenceInterval && dataPoint.upperBound != null && dataPoint.lowerBound != null && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `0.5px solid ${TD.CARD_BORDER}` }}>
                  <p style={{ fontSize: '11px', color: TD.TEXT_3 }}>
                    Range: {formatCompact(Number(dataPoint.lowerBound))} – {formatCompact(Number(dataPoint.upperBound))}
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
    <div className="group h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm" style={{ color: TD.TEXT_2 }}>
            {formatFieldLabel(selectedNumeric) || selectedNumeric} forecast for next {periods} days
          </p>
          <p className="text-xs mt-0.5" style={{ color: TD.TEXT_3 }}>
            Using {agg === 'avg' ? 'daily average' : 'daily total'} grouped by {formatFieldLabel(selectedDate) || selectedDate}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm" style={{ color: TD.TEXT_2 }}>
            <span className="hidden sm:inline">Horizon</span>
            <select
              value={periods}
              onChange={(e) => {
                const n = Number(e.target.value)
                setPeriods(Number.isFinite(n) && n > 0 ? n : 7)
              }}
              className="px-2 py-1 rounded-lg text-sm"
              style={{
                background: TD.PAGE_BG,
                border: `0.5px solid ${TD.CARD_BORDER}`,
                color: TD.TEXT_1,
              }}
              title="Forecast horizon"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <button
            type="button"
            onClick={handleChartClick}
            style={{ color: TD.ACCENT_MID }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg"
            title="Get AI insights for this forecast"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
          {/* Trend indicator */}
          <div className="text-right">
            <div
              className="text-xs font-medium"
              style={{
                color:
                  trend.direction === 'upward'
                    ? TD.SUCCESS_ALT
                    : trend.direction === 'downward'
                      ? TD.DANGER
                      : TD.TEXT_2,
              }}
            >
              {trend.direction === 'upward' ? '↑ Upward' : trend.direction === 'downward' ? '↓ Downward' : '→ Neutral'} Trend
            </div>
            <div className="text-xs" style={{ color: TD.TEXT_3 }}>
              Confidence: {(trend.confidence * 100).toFixed(1)}%
            </div>
          </div>
          {/* Toggle confidence interval */}
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: TD.TEXT_2 }}>
            <input
              type="checkbox"
              checked={showConfidenceInterval}
              onChange={(e) => setShowConfidenceInterval(e.target.checked)}
              className="rounded"
              style={{ accentColor: TD.ACCENT_BLUE }}
            />
            <span>Show range</span>
          </label>
        </div>
      </div>

      <ChartHorizontalScroll pointCount={combinedData.length} pxPerPoint={16} height={chartScrollHeight}>
        <ResponsiveContainer width="100%" height={chartScrollHeight}>
        <AreaChart data={combinedData}>
          <defs>
            <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={histColor} stopOpacity={0.35}/>
              <stop offset="95%" stopColor={histColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={TD.GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={axisTick}
            axisLine={{ stroke: TD.CARD_BORDER }}
            tickLine={false}
          />
          <YAxis
            tick={axisTick}
            tickFormatter={(v) => formatCompact(v)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: TD.TEXT_2, fontSize: '12px' }} />

          {/* Historical data area */}
          <Area
            type="monotone"
            dataKey="value"
            stroke={histColor}
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
                fill={forecastColor}
                fillOpacity={0.12}
                name="Upper Bound"
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="lowerBound"
                stroke="none"
                fill={forecastColor}
                fillOpacity={0.12}
                name="Lower Bound"
                connectNulls
              />
            </>
          )}

          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke={forecastColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Forecast"
            dot={{ fill: forecastColor, r: 4 }}
            connectNulls
            isAnimationActive={true}
            animationDuration={800}
          />

          {/* Reference line at the transition point */}
          <ReferenceLine
            x={combinedData[lastHistoricalIndex]?.date}
            stroke={TD.WARNING}
            strokeDasharray="3 3"
            label={{ value: 'Now', position: 'top', fill: TD.WARNING, fontSize: 11 }}
          />
        </AreaChart>
        </ResponsiveContainer>
      </ChartHorizontalScroll>

      {/* Forecast summary */}
      <div className="mt-4 pt-4" style={{ borderTop: `0.5px solid ${TD.CARD_BORDER}` }}>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p style={{ color: TD.TEXT_3 }}>Last Value</p>
            <p className="text-lg font-semibold" style={{ color: TD.TEXT_1 }}>
              {formatCompact(historicalData[lastHistoricalIndex]?.value)}
            </p>
          </div>
          <div>
            <p style={{ color: TD.TEXT_3 }}>Forecasted (Next Period)</p>
            <p className="text-lg font-semibold" style={{ color: forecastColor }}>
              {forecastData[0]?.value != null ? formatCompact(forecastData[0].value) : '—'}
            </p>
          </div>
          <div>
            <p style={{ color: TD.TEXT_3 }}>Expected Change</p>
            <p
              className="text-lg font-semibold"
              style={{
                color: trend.slope > 0 ? TD.SUCCESS_ALT : trend.slope < 0 ? TD.DANGER : TD.TEXT_2,
              }}
            >
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


