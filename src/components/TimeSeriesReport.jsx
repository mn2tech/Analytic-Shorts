import { useState, useMemo } from 'react'
import { Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { parseNumericValue } from '../utils/numberUtils'
import { TD } from '../constants/terminalDashboardPalette'
import { ChartHorizontalScroll } from './ChartHorizontalScroll'

function TimeSeriesReport({ 
  data, 
  numericColumns, 
  dateColumns,
  selectedNumeric,
  selectedDate 
}) {
  const [aggregation, setAggregation] = useState('none') // 'none', 'daily', 'weekly', 'monthly', 'yearly'
  const [showMovingAverage, setShowMovingAverage] = useState(false)
  const [movingAverageWindow, setMovingAverageWindow] = useState(3)
  const [selectedMetrics, setSelectedMetrics] = useState(selectedNumeric ? [selectedNumeric] : [])
  const [comparisonYear, setComparisonYear] = useState(null)

  // Get available date column
  const dateColumn = selectedDate || (dateColumns && dateColumns.length > 0 ? dateColumns[0] : null)
  const numericColumn = selectedNumeric || (numericColumns && numericColumns.length > 0 ? numericColumns[0] : null)

  // Prepare time series data
  const timeSeriesData = useMemo(() => {
    if (!data || !dateColumn || !numericColumn || data.length === 0) return []

    // Initial data preparation
    let prepared = data
      .map((row) => {
        const dateStr = row[dateColumn]
        if (!dateStr) return null

        // Parse date - handle year-only format
        let date
        if (/^\d{4}$/.test(String(dateStr).trim())) {
          // Year-only format
          date = new Date(parseInt(String(dateStr).trim()), 0, 1)
        } else {
          date = new Date(dateStr)
        }

        if (isNaN(date.getTime())) return null

        const value = parseNumericValue(row[numericColumn])
        if (isNaN(value)) return null

        return {
          date,
          dateStr: dateStr,
          value,
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          week: getWeekNumber(date),
          day: date.getDate(),
          timestamp: date.getTime()
        }
      })
      .filter(item => item !== null)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (prepared.length === 0) return []

    // Apply aggregation if selected
    if (aggregation !== 'none') {
      const grouped = {}
      prepared.forEach(item => {
        let key
        switch (aggregation) {
          case 'daily':
            key = `${item.year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`
            break
          case 'weekly':
            key = `${item.year}-W${String(item.week).padStart(2, '0')}`
            break
          case 'monthly':
            key = `${item.year}-${String(item.month).padStart(2, '0')}`
            break
          case 'yearly':
            key = String(item.year)
            break
          default:
            key = item.dateStr
        }

        if (!grouped[key]) {
          grouped[key] = { values: [], dates: [] }
        }
        grouped[key].values.push(item.value)
        grouped[key].dates.push(item.date)
      })

      prepared = Object.entries(grouped).map(([key, group]) => {
        const avgValue = group.values.reduce((a, b) => a + b, 0) / group.values.length
        const minDate = new Date(Math.min(...group.dates.map(d => d.getTime())))
        return {
          date: minDate,
          dateStr: key,
          value: avgValue,
          year: minDate.getFullYear(),
          month: minDate.getMonth() + 1,
          week: getWeekNumber(minDate),
          day: minDate.getDate(),
          timestamp: minDate.getTime()
        }
      }).sort((a, b) => a.timestamp - b.timestamp)
    }

    // Add moving average if enabled
    if (showMovingAverage && prepared.length >= movingAverageWindow) {
      prepared = prepared.map((item, index) => {
        if (index < movingAverageWindow - 1) {
          return { ...item, movingAvg: null }
        }
        const window = prepared.slice(index - movingAverageWindow + 1, index + 1)
        const avg = window.reduce((sum, d) => sum + d.value, 0) / window.length
        return { ...item, movingAvg: avg }
      })
    }

    // Add year-over-year comparison if selected
    if (comparisonYear && prepared.length > 0) {
      const currentYear = new Date().getFullYear()
      const comparisonData = prepared
        .filter(item => item.year === comparisonYear)
        .map(item => ({
          ...item,
          dateStr: `${item.dateStr} (${comparisonYear})`,
          value: item.value
        }))

      // Merge comparison data with current data
      const merged = prepared.map(item => {
        const comparisonItem = comparisonData.find(c => 
          c.month === item.month && c.day === item.day
        )
        return {
          ...item,
          comparisonValue: comparisonItem ? comparisonItem.value : null
        }
      })

      return merged
    }

    return prepared
  }, [data, dateColumn, numericColumn, aggregation, showMovingAverage, movingAverageWindow, comparisonYear])

  // Calculate statistics
  const stats = useMemo(() => {
    if (timeSeriesData.length === 0) return null

    const values = timeSeriesData.map(d => d.value)
    const sorted = [...values].sort((a, b) => a - b)

    return {
      total: values.reduce((a, b) => a + b, 0),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      median: sorted[Math.floor(sorted.length / 2)],
      firstValue: values[0],
      lastValue: values[values.length - 1],
      growth: values.length > 1 ? ((values[values.length - 1] - values[0]) / values[0]) * 100 : 0,
      dataPoints: timeSeriesData.length,
      dateRange: {
        start: timeSeriesData[0]?.dateStr,
        end: timeSeriesData[timeSeriesData.length - 1]?.dateStr
      }
    }
  }, [timeSeriesData])

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    if (/^\d{4}$/.test(dateStr)) return dateStr // Year only
    if (/^\d{4}-\d{2}$/.test(dateStr)) {
      // Monthly format
      const [year, month] = dateStr.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, 1)
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    if (/^\d{4}-W\d{2}$/.test(dateStr)) {
      // Weekly format
      return dateStr.replace('W', ' Week ')
    }
    return dateStr
  }

  // Get available years for comparison
  const availableYears = useMemo(() => {
    if (!timeSeriesData || timeSeriesData.length === 0) return []
    const years = [...new Set(timeSeriesData.map(d => d.year))].sort((a, b) => b - a)
    return years
  }, [timeSeriesData])

  const cardShell = {
    background: TD.CARD_BG,
    border: `0.5px solid ${TD.CARD_BORDER}`,
    borderRadius: '12px',
    padding: '24px',
  }
  const selectStyle = {
    padding: '6px 12px',
    borderRadius: '8px',
    border: `0.5px solid ${TD.CARD_BORDER}`,
    background: TD.PAGE_BG,
    color: TD.TEXT_1,
    fontSize: '14px',
  }
  const axisTickProps = { fill: TD.TEXT_3, fontSize: 11 }
  const tooltipStyle = {
    background: TD.CARD_BG,
    border: `0.5px solid ${TD.CARD_BORDER}`,
    borderRadius: '8px',
    color: TD.TEXT_1,
    fontSize: '12px',
  }

  const statTile = (accent, label, value, valueColor = TD.TEXT_1) => (
    <div
      className="p-3 rounded-lg"
      style={{
        background: TD.PAGE_BG,
        border: `0.5px solid ${TD.CARD_BORDER}`,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <p className="text-xs" style={{ color: TD.TEXT_3 }}>{label}</p>
      <p className="text-lg font-semibold tabular-nums" style={{ color: valueColor }}>{value}</p>
    </div>
  )

  if (!dateColumn || !numericColumn) {
    return (
      <div style={cardShell}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: TD.TEXT_1 }}>Time Series Report</h2>
        <div className="text-center py-12" style={{ color: TD.TEXT_2 }}>
          <p className="mb-2">Select a date column and a numeric column to view time series analysis.</p>
          <p className="text-sm" style={{ color: TD.TEXT_3 }}>Go to the &quot;Data &amp; Metadata&quot; tab to configure column types.</p>
        </div>
      </div>
    )
  }

  if (timeSeriesData.length === 0) {
    return (
      <div style={cardShell}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: TD.TEXT_1 }}>Time Series Report</h2>
        <div className="text-center py-12" style={{ color: TD.TEXT_2 }}>
          <p>No valid time series data found. Please check your date and numeric columns.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" style={{ background: TD.PAGE_BG }}>
      {/* Header with Controls */}
      <div style={cardShell}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold" style={{ color: TD.TEXT_1 }}>Time Series Report</h2>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm" style={{ color: TD.TEXT_2 }}>
              <span>Aggregation:</span>
              <select
                value={aggregation}
                onChange={(e) => setAggregation(e.target.value)}
                style={selectStyle}
                className="focus:outline-none focus:ring-2 focus:ring-blue-500/35"
              >
                <option value="none">None (Raw Data)</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: TD.TEXT_2 }}>
              <input
                type="checkbox"
                checked={showMovingAverage}
                onChange={(e) => setShowMovingAverage(e.target.checked)}
                className="rounded"
                style={{ accentColor: TD.ACCENT_BLUE }}
              />
              <span>Moving Average</span>
            </label>
            {showMovingAverage && (
              <select
                value={movingAverageWindow}
                onChange={(e) => setMovingAverageWindow(parseInt(e.target.value, 10))}
                style={{ ...selectStyle, width: '5rem' }}
                className="focus:outline-none focus:ring-2 focus:ring-blue-500/35"
              >
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="7">7</option>
                <option value="12">12</option>
              </select>
            )}
            {availableYears.length > 1 && (
              <label className="flex items-center gap-2 text-sm" style={{ color: TD.TEXT_2 }}>
                <span>Compare Year:</span>
                <select
                  value={comparisonYear || ''}
                  onChange={(e) => setComparisonYear(e.target.value ? parseInt(e.target.value, 10) : null)}
                  style={selectStyle}
                  className="focus:outline-none focus:ring-2 focus:ring-blue-500/35"
                >
                  <option value="">None</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-4">
            {statTile(TD.ACCENT_MID, 'Total', stats.total.toLocaleString())}
            {statTile(TD.SUCCESS_ALT, 'Average', stats.average.toFixed(2))}
            {statTile('#a855f7', 'Min', stats.min.toLocaleString())}
            {statTile(TD.WARNING, 'Max', stats.max.toLocaleString())}
            {statTile('#818cf8', 'Growth', `${stats.growth >= 0 ? '+' : ''}${stats.growth.toFixed(1)}%`, stats.growth >= 0 ? TD.SUCCESS_ALT : TD.DANGER)}
            {statTile(TD.TEXT_3, 'Data Points', String(stats.dataPoints))}
          </div>
        )}

        {/* Date Range */}
        {stats && stats.dateRange && (
          <div className="mt-4 text-sm" style={{ color: TD.TEXT_2 }}>
            <span className="font-medium" style={{ color: TD.TEXT_1 }}>Period:</span>{' '}
            {formatDate(stats.dateRange.start)} to {formatDate(stats.dateRange.end)}
          </div>
        )}
      </div>

      {/* Time Series Chart */}
      <div style={cardShell}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: TD.TEXT_1 }}>
          {numericColumn} Over Time
        </h3>
        <ChartHorizontalScroll pointCount={timeSeriesData.length} pxPerPoint={14} height={400}>
          <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeSeriesData}>
            <defs>
              <linearGradient id="colorValueTs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TD.ACCENT_MID} stopOpacity={0.45}/>
                <stop offset="95%" stopColor={TD.ACCENT_MID} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={TD.GRID} vertical={false} />
            <XAxis
              dataKey="dateStr"
              tickFormatter={formatDate}
              angle={-45}
              textAnchor="end"
              height={80}
              tick={axisTickProps}
              axisLine={{ stroke: TD.CARD_BORDER }}
              tickLine={false}
            />
            <YAxis tick={axisTickProps} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [Number(value).toLocaleString(), numericColumn]}
              labelFormatter={(label) => formatDate(label)}
            />
            <Legend wrapperStyle={{ color: TD.TEXT_2, fontSize: '12px' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={TD.ACCENT_MID}
              fillOpacity={1}
              fill="url(#colorValueTs)"
              name={numericColumn}
            />
            {showMovingAverage && (
              <Line
                type="monotone"
                dataKey="movingAvg"
                stroke={TD.DANGER}
                strokeWidth={2}
                strokeDasharray="5 5"
                name={`Moving Avg (${movingAverageWindow})`}
                dot={false}
              />
            )}
            {comparisonYear && (
              <Line
                type="monotone"
                dataKey="comparisonValue"
                stroke={TD.SUCCESS_ALT}
                strokeWidth={2}
                strokeDasharray="3 3"
                name={`${comparisonYear} Comparison`}
                dot={false}
              />
            )}
          </AreaChart>
          </ResponsiveContainer>
        </ChartHorizontalScroll>
      </div>

      {/* Trend Analysis */}
      {stats && stats.growth !== 0 && (
        <div style={cardShell}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: TD.TEXT_1 }}>Trend Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span style={{ color: TD.TEXT_2 }}>Overall Growth:</span>
              <span className="font-semibold tabular-nums" style={{ color: stats.growth >= 0 ? TD.SUCCESS_ALT : TD.DANGER }}>
                {stats.growth >= 0 ? '+' : ''}{stats.growth.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: TD.TEXT_2 }}>Starting Value:</span>
              <span className="font-semibold tabular-nums" style={{ color: TD.TEXT_1 }}>{stats.firstValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: TD.TEXT_2 }}>Ending Value:</span>
              <span className="font-semibold tabular-nums" style={{ color: TD.TEXT_1 }}>{stats.lastValue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: TD.TEXT_2 }}>Change:</span>
              <span className="font-semibold tabular-nums" style={{ color: stats.lastValue >= stats.firstValue ? TD.SUCCESS_ALT : TD.DANGER }}>
                {stats.lastValue >= stats.firstValue ? '+' : ''}
                {(stats.lastValue - stats.firstValue).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export default TimeSeriesReport

