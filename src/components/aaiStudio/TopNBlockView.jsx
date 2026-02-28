import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts'
import { CHART_HEIGHT, FONT_SIZE_AXIS, BAR_RADIUS } from './chartTheme'
import { formatValueForChart, isCurrencyMeasure } from './formatUtils'

export default function TopNBlockView({ block, filterState, onFilterChange }) {
  const rows = Array.isArray(block?.payload?.rows) ? block.payload.rows : []
  const dimension = block?.payload?.dimension || ''
  const measure = block?.payload?.measure || ''
  const selectedKey = dimension ? filterState?.eq?.[dimension] : null
  const setEq = onFilterChange?.setEq
  const useCurrency = isCurrencyMeasure(measure)
  const formatValue = (v) => formatValueForChart(Number(v), useCurrency)

  const chartData = useMemo(() => {
    return rows.slice(0, 11).map((r) => ({ name: String(r.key ?? ''), value: Number(r.value) || 0 }))
  }, [rows])

  const handleBarClick = (key) => {
    if (!dimension || !setEq) return
    if (selectedKey === key) setEq(dimension, null)
    else setEq(dimension, key)
  }

  if (chartData.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center" style={{ minHeight: CHART_HEIGHT, color: 'var(--muted)' }}>
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 50, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis type="number" stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} />
        <YAxis type="category" dataKey="name" width={100} stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} />
        <Tooltip
          contentStyle={{ background: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-text)', border: '1px solid var(--border)', borderRadius: 6 }}
          formatter={(v) => [Number(v).toLocaleString(), dimension || 'Value']}
        />
        <Bar
          dataKey="value"
          fill="var(--chart-primary)"
          radius={BAR_RADIUS}
          cursor={setEq ? 'pointer' : 'default'}
          onClick={(data) => data?.name != null && handleBarClick(data.name)}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={selectedKey === entry.name ? 'var(--chart-selected)' : 'var(--chart-primary)'}
            />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v) => formatValue(v)} style={{ fill: 'var(--text)', fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
