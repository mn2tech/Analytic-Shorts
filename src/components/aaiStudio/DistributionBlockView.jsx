import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { CHART_HEIGHT, FONT_SIZE_AXIS, BAR_RADIUS } from './chartTheme'

export default function DistributionBlockView({ block }) {
  const hist = Array.isArray(block?.payload?.histogram) ? block.payload.histogram : []
  const measure = block?.payload?.measure || ''

  const chartData = useMemo(() => {
    return hist.map((h) => ({
      bin: `${Number(h.from).toFixed(2)}–${Number(h.to).toFixed(2)}`,
      count: Number(h.count) || 0,
    }))
  }, [hist])

  if (chartData.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center" style={{ minHeight: CHART_HEIGHT, color: 'var(--muted)' }}>
        No histogram data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="bin" stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} angle={-45} textAnchor="end" height={50} />
        <YAxis stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} />
        <Tooltip
          contentStyle={{ background: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-text)', border: '1px solid var(--border)', borderRadius: 6 }}
          labelFormatter={(v) => v}
          formatter={(v) => [Number(v).toLocaleString(), 'Count']}
        />
        <Bar dataKey="count" fill="var(--chart-primary)" radius={BAR_RADIUS} name="Count" />
      </BarChart>
    </ResponsiveContainer>
  )
}
