import { useMemo } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  Brush,
} from 'recharts'
import { TREND_CHART_HEIGHT, FONT_SIZE_AXIS } from '../chartTheme'

/** Simple moving average for last N points. */
function movingAverage(data, key = 'value', window = 3) {
  if (!Array.isArray(data) || data.length < window) return data
  return data.map((d, i) => {
    if (i < window - 1) return { ...d, _ma: d[key] }
    let sum = 0
    for (let j = 0; j < window; j++) sum += data[i - j][key] ?? 0
    return { ...d, _ma: sum / window }
  })
}

export default function TrendHeroChart({ block, filterState, onFilterChange }) {
  const series = Array.isArray(block?.payload?.series) ? block.payload.series : []
  const timeColumn = block?.payload?.timeColumn || 't'
  const measure = block?.payload?.measure
  const anomalies = useMemo(() => {
    const raw = block?.payload?.anomalies
    if (!Array.isArray(raw)) return new Set()
    return new Set(raw.map((a) => (typeof a === 'object' ? a?.period ?? a?.t : a)).filter(Boolean))
  }, [block?.payload?.anomalies])

  const { chartData, droppedCount, droppedInvalidValueCount } = useMemo(() => {
    const list = Array.isArray(series) ? series : []
    const withValidPeriod = list
      .map((x, i) => (x != null ? { ...x, _i: i } : null))
      .filter((x) => x != null && x.t != null && x.t !== '')
    const droppedCount = list.length - withValidPeriod.length
    const withFiniteValue = withValidPeriod.filter((x) => {
      const v = x.sum ?? x.count ?? 0
      return Number.isFinite(Number(v))
    })
    const droppedInvalidValueCount = withValidPeriod.length - withFiniteValue.length
    const chartData = withFiniteValue.map((x) => ({
      period: x.t,
      value: Number(x.sum ?? x.count ?? 0),
      count: Number(x.count) ?? 0,
      raw: x,
      _key: `${x.t}|${x.__rowId ?? x._i}`,
    }))
    const withMa = movingAverage(chartData, 'value', 3)
    return { chartData: withMa, droppedCount, droppedInvalidValueCount }
  }, [series])

  const selectedPeriod = filterState?.eq?.[timeColumn] ?? null
  const handlePointClick = (payload) => {
    if (!payload?.period || !onFilterChange?.setEq) return
    const col = block?.payload?.timeColumn
    if (!col) return
    const current = filterState?.eq?.[col]
    onFilterChange.setEq(col, current === payload.period ? null : payload.period)
  }

  if (chartData.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center" style={{ minHeight: TREND_CHART_HEIGHT, color: 'var(--muted)' }}>
        No trend data
      </div>
    )
  }

  const useBrush = chartData.length > 14
  const showCountBar = chartData.some((d) => d.count > 0) && chartData.some((d) => d.value !== d.count)

  return (
    <div className="animate-fade-in" data-testid="trend-hero-chart">
      {(droppedCount > 0 || droppedInvalidValueCount > 0) && (
        <div className="flex flex-wrap gap-2 mb-2 text-xs" style={{ color: 'var(--warning)' }}>
          {droppedCount > 0 && (
            <span className="px-2 py-0.5 rounded border" style={{ background: 'var(--card-2)', borderColor: 'var(--border)' }}>
              Skipped {droppedCount} rows with missing date
            </span>
          )}
          {droppedInvalidValueCount > 0 && (
            <span className="px-2 py-0.5 rounded border" style={{ background: 'var(--card-2)', borderColor: 'var(--border)' }}>
              Skipped {droppedInvalidValueCount} rows with invalid value
            </span>
          )}
        </div>
      )}
      <ResponsiveContainer width="100%" height={TREND_CHART_HEIGHT}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            dataKey="period"
            stroke="var(--border)"
            style={{ fontSize: FONT_SIZE_AXIS }}
            tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
          />
          <YAxis
            stroke="var(--border)"
            style={{ fontSize: FONT_SIZE_AXIS }}
            tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--chart-tooltip-bg)',
              color: 'var(--chart-tooltip-text)',
              border: '1px solid var(--border)',
              borderRadius: 6,
            }}
            formatter={([val]) => [Number(val).toLocaleString(), measure || 'Value']}
            labelFormatter={(l) => l}
          />
          <Area
            type="monotone"
            dataKey="value"
            fill="var(--chart-primary)"
            fillOpacity={0.25}
            stroke="none"
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--chart-primary)"
            strokeWidth={2}
            dot={(props) => {
              const isSelected = selectedPeriod === props.payload?.period
              return (
                <circle
                  {...props}
                  fill={isSelected ? 'var(--chart-selected)' : 'var(--chart-primary)'}
                  r={isSelected ? 5 : 3}
                  cursor="pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePointClick(props.payload)
                  }}
                />
              )
            }}
          />
          {chartData[0]?._ma != null && (
            <Line
              type="monotone"
              dataKey="_ma"
              stroke="var(--chart-positive)"
              strokeWidth={1}
              strokeDasharray="4 2"
              dot={false}
              name="Avg"
            />
          )}
          {showCountBar && (
            <Bar dataKey="count" fill="var(--chart-primary)" fillOpacity={0.2} radius={[2, 2, 0, 0]} name="Count" />
          )}
          {chartData.filter((d) => anomalies.has(d.period)).map((d) => (
            <ReferenceDot
              key={d._key}
              x={d.period}
              y={d.value}
              r={5}
              fill="var(--chart-negative)"
              stroke="var(--chart-tooltip-text)"
              strokeWidth={2}
            />
          ))}
          {useBrush && (
            <Brush
              dataKey="period"
              height={24}
              stroke="var(--border)"
              fill="var(--card-2)"
              tickFormatter={() => ''}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-1 mt-2" role="group" aria-label="Select period to filter">
        {chartData.slice(0, 12).map((d) => (
          <button
            key={d._key}
            type="button"
            onClick={() => handlePointClick(d)}
            className="text-xs px-2 py-1 rounded border"
            style={
              selectedPeriod === d.period
                ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                : { background: 'var(--card-2)', borderColor: 'var(--border)', color: 'var(--text)' }
            }
          >
            {d.period}
          </button>
        ))}
      </div>
    </div>
  )
}
