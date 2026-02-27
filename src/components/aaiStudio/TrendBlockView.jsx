import { useMemo } from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import { CHART_HEIGHT, TREND_CHART_HEIGHT, FONT_SIZE_AXIS } from './chartTheme'
import { formatValueForChart, isCurrencyMeasure } from './formatUtils'

export default function TrendBlockView({ block, filterState, onFilterChange }) {
  const series = Array.isArray(block?.payload?.series) ? block.payload.series : []
  const timeColumn = block?.payload?.timeColumn || 't'
  const measure = block?.payload?.measure
  const grain = block?.payload?.grain || 'day'
  const useCurrency = isCurrencyMeasure(measure)

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
      raw: x,
      _key: `${x.t}|${x.__rowId ?? x._i}`,
    }))
    return { chartData, droppedCount, droppedInvalidValueCount }
  }, [series])

  const selectedPeriod = filterState?.eq?.[timeColumn] ?? null
  const selectedIndex = selectedPeriod != null ? chartData.findIndex((d) => d.period === selectedPeriod) : -1
  const sliderIndex = selectedIndex >= 0 ? selectedIndex : Math.max(0, chartData.length - 1)
  const handlePointClick = (payload) => {
    if (!payload?.period || !onFilterChange?.setEq) return
    const col = block?.payload?.timeColumn
    if (!col) return
    const current = filterState?.eq?.[col]
    onFilterChange.setEq(col, current === payload.period ? null : payload.period)
  }
  const handleSliderChange = (e) => {
    const col = block?.payload?.timeColumn
    if (!col || !onFilterChange?.setEq) return
    const idx = Number(e.target.value)
    if (!Number.isFinite(idx) || idx < 0 || idx >= chartData.length) return
    onFilterChange.setEq(col, chartData[idx].period)
  }
  const handleClearPeriod = () => {
    const col = block?.payload?.timeColumn
    if (!col || !onFilterChange?.setEq) return
    onFilterChange.setEq(col, null)
  }

  if (chartData.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center" style={{ minHeight: CHART_HEIGHT, color: 'var(--muted)' }}>
        No trend data
        {(droppedCount > 0 || droppedInvalidValueCount > 0) && (
          <span className="ml-2 text-xs" style={{ color: 'var(--warning)' }} data-testid="trend-dropped-hint">
            ({droppedCount > 0 && `Skipped ${droppedCount} rows with missing date`}
            {droppedCount > 0 && droppedInvalidValueCount > 0 && '; '}
            {droppedInvalidValueCount > 0 && `Skipped ${droppedInvalidValueCount} rows with invalid value`})
          </span>
        )}
      </div>
    )
  }

  const useArea = chartData.length <= 31
  const ChartComponent = useArea ? AreaChart : LineChart
  const ValueComponent = useArea ? Area : Line
  const anomalyPeriods = useMemo(() => {
    const raw = block?.payload?.anomalies
    if (!Array.isArray(raw)) return new Set()
    return new Set(raw.map((a) => (typeof a === 'object' ? a?.period ?? a?.t : a)).filter(Boolean))
  }, [block?.payload?.anomalies])

  return (
    <div
      className="animate-fade-in"
      data-testid="trend-chart"
      data-period-count={chartData.length}
      data-time-column={timeColumn}
      data-measure={measure ?? ''}
      data-dropped-count={droppedCount}
      data-dropped-invalid-value-count={droppedInvalidValueCount}
    >
      {(droppedCount > 0 || droppedInvalidValueCount > 0) && (
        <div className="flex flex-wrap gap-2 mb-2 text-xs" style={{ color: 'var(--warning)' }} role="status" data-testid="trend-dropped-badges">
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
      <ChartComponent data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="period" stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} />
        <YAxis stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} tickFormatter={(v) => (useCurrency ? formatValueForChart(v, true) : Number(v).toLocaleString())} />
        <Tooltip
          contentStyle={{ background: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-text)', border: '1px solid var(--border)', borderRadius: 6 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const p = payload[0]?.payload
            const value = p?.value
            const period = label ?? p?.period
            const labelStr = measure || 'Value'
            const valueStr = typeof value === 'number' && Number.isFinite(value) ? formatValueForChart(value, useCurrency) : String(value ?? '—')
            return (
              <div className="rounded border px-3 py-2 shadow-sm" style={{ background: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-text)', borderColor: 'var(--border)' }}>
                <div className="text-xs" style={{ opacity: 0.9 }}>{period}</div>
                <div className="text-sm font-medium">{labelStr}: {valueStr}</div>
              </div>
            )
          }}
        />
        <ValueComponent
          type="monotone"
          dataKey="value"
          stroke="var(--chart-primary)"
          fill={useArea ? 'var(--chart-primary)' : undefined}
          fillOpacity={useArea ? 0.3 : undefined}
          strokeWidth={2}
          isAnimationActive
          animationDuration={400}
          animationEasing="ease-out"
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
          activeDot={(props) => {
            const isSelected = selectedPeriod === props.payload?.period
            return (
              <circle
                {...props}
                r={isSelected ? 7 : 6}
                fill={isSelected ? 'var(--chart-selected)' : 'var(--chart-primary)'}
                stroke="var(--chart-tooltip-text)"
                strokeWidth={2}
                cursor="pointer"
                onClick={(e) => {
                  e.stopPropagation()
                  handlePointClick(props.payload)
                }}
              />
            )
          }}
        />
        {chartData.filter((d) => anomalyPeriods.has(d.period)).map((d) => (
          <ReferenceDot key={d._key} x={d.period} y={d.value} r={6} fill="var(--chart-negative)" stroke="var(--chart-tooltip-text)" strokeWidth={2} />
        ))}
      </ChartComponent>
    </ResponsiveContainer>
      <div className="mt-3 space-y-1.5" role="group" aria-label="Select period">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            {selectedPeriod != null ? chartData[sliderIndex]?.period ?? selectedPeriod : 'All periods'}
          </span>
          {selectedPeriod != null && (
            <button type="button" onClick={handleClearPeriod} className="text-xs underline" style={{ color: 'var(--primary)' }}>Clear</button>
          )}
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(0, chartData.length - 1)}
          value={sliderIndex}
          onChange={handleSliderChange}
          data-testid="trend-period-slider"
          className="w-full h-2 rounded-full cursor-pointer accent-[var(--primary)]"
          style={{ background: 'var(--border)', color: 'var(--primary)' }}
        />
        <div className="flex justify-between text-[10px]" style={{ color: 'var(--muted)' }}>
          <span>{chartData[0]?.period ?? ''}</span>
          <span>{chartData[chartData.length - 1]?.period ?? ''}</span>
        </div>
      </div>
    </div>
  )
}
