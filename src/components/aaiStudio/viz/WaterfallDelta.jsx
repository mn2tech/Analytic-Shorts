import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from 'recharts'
import { CHART_HEIGHT, FONT_SIZE_AXIS } from '../chartTheme'

export default function WaterfallDelta({ block }) {
  const contributions = block?.payload?.contributions || {}
  const dims = Object.keys(contributions).filter((d) => Array.isArray(contributions[d]) && contributions[d].length > 0)

  const chartDataByDim = useMemo(() => {
    const out = {}
    for (const dim of dims) {
      const arr = (contributions[dim] || [])
        .map((r) => ({
          name: String(r.key ?? ''),
          delta: Number(r.delta) ?? 0,
          first: Number(r.first) ?? 0,
          second: Number(r.second) ?? 0,
        }))
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 12)
      out[dim] = arr
    }
    return out
  }, [contributions, dims])

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.[0]) return null
    const p = payload[0].payload
    return (
      <div
        className="rounded-lg shadow-lg p-3 text-xs border"
        style={{ background: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-text)', borderColor: 'var(--border)' }}
      >
        <div className="font-medium">{label}</div>
        <div className="mt-1" style={{ opacity: 0.9 }}>
          First: {Number(p.first).toLocaleString()}
        </div>
        <div style={{ opacity: 0.9 }}>Second: {Number(p.second).toLocaleString()}</div>
        <div style={{ color: p.delta >= 0 ? 'var(--chart-positive)' : 'var(--chart-negative)' }}>
          Δ {Number(p.delta).toLocaleString()}
        </div>
      </div>
    )
  }

  if (dims.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center" style={{ minHeight: CHART_HEIGHT, color: 'var(--muted)' }}>
        No contribution data
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {dims.map((dim) => {
        const data = chartDataByDim[dim] || []
        if (data.length === 0) return null
        return (
          <div key={dim}>
            <div className="text-xs mb-2 font-medium" style={{ color: 'var(--text)' }}>
              {dim}
            </div>
            <ResponsiveContainer width="100%" height={Math.min(CHART_HEIGHT, 80 + data.length * 24)}>
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  type="number"
                  stroke="var(--border)"
                  style={{ fontSize: FONT_SIZE_AXIS }}
                  tick={{ fontSize: 11, fill: 'var(--chart-axis)' }}
                  allowDataOverflow
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  stroke="var(--border)"
                  style={{ fontSize: FONT_SIZE_AXIS }}
                  tick={{ fontSize: 10, fill: 'var(--chart-axis)' }}
                />
                <ReferenceLine x={0} stroke="var(--border)" strokeWidth={1} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="delta" radius={[0, 0, 0, 0]} name="Δ">
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.delta >= 0 ? 'var(--chart-positive)' : 'var(--chart-negative)'}
                      cursor="default"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )
      })}
    </div>
  )
}
