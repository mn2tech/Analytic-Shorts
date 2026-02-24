import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, LabelList } from 'recharts'
import { CHART_HEIGHT, FONT_SIZE_AXIS, BAR_RADIUS } from './chartTheme'

export default function DriverBlockView({ block }) {
  const topDrivers = Array.isArray(block?.payload?.topDrivers) ? block.payload.topDrivers : []
  const measure = block?.payload?.measure || ''

  const chartData = useMemo(() => {
    return topDrivers.slice(0, 12).map((d) => ({
      label: `${d.group} (${d.dimension})`,
      group: d.group,
      dimension: d.dimension,
      total: Number(d.total) || 0,
      share: Number(d.share) || 0,
      lift: Number(d.lift) || 0,
      score: Number(d.score) || 0,
    }))
  }, [topDrivers])

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]?.payload) return null
    const p = payload[0].payload
    return (
      <div className="rounded-lg shadow-lg p-3 text-xs border" style={{ background: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-text)', borderColor: 'var(--border)' }}>
        <div className="font-medium">{p.label}</div>
        <div className="mt-1" style={{ opacity: 0.9 }}>Total: {Number(p.total).toLocaleString()}</div>
        <div style={{ opacity: 0.9 }}>Share: {(p.share * 100).toFixed(1)}%</div>
        <div style={{ opacity: 0.9 }}>Lift: {(p.lift * 100).toFixed(1)}%</div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center" style={{ minHeight: CHART_HEIGHT, color: 'var(--muted)' }}>
        No drivers data
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 72, bottom: 8, left: 8 }} barCategoryGap={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" horizontal={true} vertical={false} />
          <XAxis type="number" stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} />
          <YAxis type="category" dataKey="label" width={140} stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="total" fill="var(--chart-primary)" radius={BAR_RADIUS} isAnimationActive animationDuration={500} animationEasing="ease-out">
            {chartData.map((_, i) => (
              <Cell key={i} fill="var(--chart-primary)" />
            ))}
            <LabelList dataKey="total" position="right" formatter={(v) => Number(v).toLocaleString()} style={{ fill: 'var(--text)', fontSize: 12, fontWeight: 500 }} offset={8} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="overflow-auto mt-3">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left border-b" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
              <th className="py-2 pr-3">Dimension</th>
              <th className="py-2 pr-3">Group</th>
              <th className="py-2 pr-3">Total</th>
              <th className="py-2 pr-3">Share</th>
              <th className="py-2 pr-3">Lift</th>
            </tr>
          </thead>
          <tbody>
            {topDrivers.slice(0, 12).map((r, idx) => (
              <tr key={`${r.dimension}-${r.group}-${idx}`} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{r.dimension}</td>
                <td className="py-2 pr-3 font-medium" style={{ color: 'var(--text)' }}>{String(r.group)}</td>
                <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{Math.round((r.total || 0) * 100) / 100}</td>
                <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{Math.round((r.share || 0) * 1000) / 10}%</td>
                <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{Math.round((r.lift || 0) * 1000) / 10}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
