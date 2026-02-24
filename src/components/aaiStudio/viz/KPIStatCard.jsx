import { useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

function formatNum(v) {
  if (v == null || !Number.isFinite(v)) return '—'
  const n = Number(v)
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`
  return `${Math.round(n * 100) / 100}`
}

function DeltaArrow({ value }) {
  if (value == null || !Number.isFinite(value)) return null
  const up = value >= 0
  const pct = Math.abs(value) < 1 ? (value * 100).toFixed(1) : value.toFixed(1)
  return (
    <span style={{ color: up ? 'var(--chart-positive)' : 'var(--chart-negative)' }} title={`${up ? '+' : ''}${pct}%`}>
      {up ? '↑' : '↓'} {pct}%
    </span>
  )
}

export default function KPIStatCard({
  label,
  value,
  subtitle,
  delta,
  sparklineData = [],
  className = '',
}) {
  const hasSparkline = Array.isArray(sparklineData) && sparklineData.length > 1

  const chartData = useMemo(() => {
    if (!hasSparkline) return []
    return sparklineData.map((d, i) => ({
      x: i,
      v: Number(d?.value ?? d?.sum ?? d) ?? 0,
    }))
  }, [sparklineData, hasSparkline])

  return (
    <div
      className={`p-4 rounded-xl shadow-sm ${className}`}
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
      <div className="text-[32px] font-bold mt-1 leading-none" style={{ color: 'var(--text)' }}>
        {typeof value === 'number' ? formatNum(value) : value}
      </div>
      {(subtitle || delta != null) && (
        <div className="text-xs mt-1 flex items-center gap-2" style={{ color: 'var(--muted)' }}>
          {delta != null && <DeltaArrow value={delta} />}
          {subtitle && <span>{subtitle}</span>}
        </div>
      )}
      {hasSparkline && chartData.length > 0 && (
        <div className="mt-2 h-10 w-full">
          <ResponsiveContainer width="100%" height={40}>
            <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="var(--chart-primary)"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
