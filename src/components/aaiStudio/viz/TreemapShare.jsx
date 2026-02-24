import { useMemo } from 'react'
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { CHART_HEIGHT } from '../chartTheme'

const THEME_COLORS = ['var(--chart-primary)', 'var(--chart-selected)', 'var(--chart-positive)', 'var(--chart-negative)']

export default function TreemapShare({ block }) {
  const rows = Array.isArray(block?.payload?.rows) ? block.payload.rows : []
  const dimension = block?.payload?.dimension || ''

  const treeData = useMemo(() => {
    const children = rows.slice(0, 24).map((r, i) => ({
      name: String(r.key ?? ''),
      size: Math.max(0, Number(r.value) || 0),
      fill: THEME_COLORS[i % THEME_COLORS.length],
      _key: r.key,
    }))
    return [{ name: 'All', children }]
  }, [rows])

  if (rows.length === 0) {
    return (
      <div className="text-sm flex items-center justify-center" style={{ minHeight: CHART_HEIGHT, color: 'var(--muted)' }}>
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <Treemap
        data={treeData}
        dataKey="size"
        aspectRatio={4 / 3}
        stroke="var(--border)"
      >
        <Tooltip
          contentStyle={{
            background: 'var(--chart-tooltip-bg)',
            color: 'var(--chart-tooltip-text)',
            border: '1px solid var(--border)',
            borderRadius: 6,
          }}
          formatter={(value) => [Number(value).toLocaleString(), dimension || 'Value']}
        />
      </Treemap>
    </ResponsiveContainer>
  )
}
