import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts'
import { CHART_HEIGHT, FONT_SIZE_AXIS, BAR_RADIUS } from './chartTheme'

export default function GeoBlockView({ block, filterState, onFilterChange }) {
  if (block?.payload?.mode === 'points') {
    const pts = Array.isArray(block?.payload?.points) ? block.payload.points : []
    return (
      <div className="text-sm" style={{ minHeight: 80, color: 'var(--text)' }}>
        Points: {pts.length} • lat: {block.payload.latColumn} • lon: {block.payload.lonColumn}
        <div className="text-xs mt-2" style={{ color: 'var(--muted)' }}>Map rendering can use payload.points when a map component is added.</div>
      </div>
    )
  }

  const rows = Array.isArray(block?.payload?.rows) ? block.payload.rows : []
  const regionColumn = block?.payload?.regionColumn || ''
  const selectedKey = regionColumn ? filterState?.eq?.[regionColumn] : null
  const setEq = onFilterChange?.setEq

  const chartData = useMemo(() => {
    return rows.slice(0, 15).map((r) => ({ name: String(r.key ?? ''), value: Number(r.value) || 0 }))
  }, [rows])

  const handleBarClick = (key) => {
    if (!regionColumn || !setEq) return
    if (selectedKey === key) setEq(regionColumn, null)
    else setEq(regionColumn, key)
  }

  if (chartData.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center" style={{ minHeight: CHART_HEIGHT, color: 'var(--muted)' }}>
        No region data
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
          formatter={(v) => [Number(v).toLocaleString(), regionColumn || 'Value']}
        />
        <Bar
          dataKey="value"
          fill="var(--chart-primary)"
          radius={BAR_RADIUS}
          cursor={setEq ? 'pointer' : 'default'}
          onClick={(data) => data?.name != null && handleBarClick(data.name)}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={selectedKey === entry.name ? 'var(--chart-selected)' : 'var(--chart-primary)'} />
          ))}
          <LabelList dataKey="value" position="right" formatter={(v) => Number(v).toLocaleString()} style={{ fill: 'var(--text)', fontSize: 11 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
