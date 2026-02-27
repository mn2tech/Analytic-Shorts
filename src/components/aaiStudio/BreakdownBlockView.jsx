import { useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts'
import { CHART_HEIGHT, FONT_SIZE_AXIS, BAR_RADIUS } from './chartTheme'
import { formatValueForChart, isCurrencyMeasure } from './formatUtils'

const MAX_PIE_CATEGORIES = 6
const THEME_CHART_COLORS = ['var(--chart-primary)', 'var(--chart-selected)', 'var(--chart-positive)', 'var(--chart-negative)']

export default function BreakdownBlockView({ block, filterState, onFilterChange }) {
  const rows = Array.isArray(block?.payload?.rows) ? block.payload.rows : []
  const dimension = block?.payload?.dimension || ''
  const measure = block?.payload?.measure || ''
  const selectedKey = dimension ? filterState?.eq?.[dimension] : null
  const setEq = onFilterChange?.setEq
  const useCurrency = isCurrencyMeasure(measure)
  const formatValue = (v) => formatValueForChart(Number(v), useCurrency)

  const chartData = useMemo(() => {
    return rows.map((r, i) => ({
      name: String(r.key ?? ''),
      value: Number(r.value) || 0,
      color: THEME_CHART_COLORS[i % THEME_CHART_COLORS.length],
    }))
  }, [rows])

  const usePie = chartData.length >= 2 && chartData.length <= MAX_PIE_CATEGORIES

  const handleClick = (key) => {
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

  if (usePie) {
    return (
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            onClick={(data) => data?.name != null && handleClick(data.name)}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={selectedKey === entry.name ? 'var(--chart-selected)' : entry.color}
                stroke={selectedKey === entry.name ? 'var(--chart-selected)' : 'var(--card)'}
                strokeWidth={selectedKey === entry.name ? 2 : 1}
                cursor={setEq ? 'pointer' : 'default'}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-text)', border: '1px solid var(--border)', borderRadius: 6 }}
            formatter={(value) => [formatValue(value), dimension || 'Value']}
          />
        </PieChart>
      </ResponsiveContainer>
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
          formatter={[(v) => [formatValue(v), dimension || 'Value']]}
        />
        <Bar
          dataKey="value"
          radius={BAR_RADIUS}
          cursor={setEq ? 'pointer' : 'default'}
          onClick={(data) => data?.name != null && handleClick(data.name)}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={selectedKey === entry.name ? 'var(--chart-selected)' : entry.color} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v) => formatValue(v)} style={{ fill: 'var(--text)', fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
