function getStrokeByTone(tone) {
  if (tone === 'risk') return '#fb7185'
  if (tone === 'ews') return '#f59e0b'
  return '#22d3ee'
}

export default function RiskTrendMiniChart({ values = [], tone = 'risk', height = 38 }) {
  if (!values.length) return <div className="h-10 rounded bg-slate-800/80" />
  const width = 150
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const points = values.map((v, idx) => {
    const x = (idx / Math.max(1, values.length - 1)) * (width - 6) + 3
    const y = height - 4 - ((v - min) / span) * (height - 8)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="rounded bg-slate-900/70">
      <polyline points={points} fill="none" stroke={getStrokeByTone(tone)} strokeWidth="2.2" strokeLinecap="round" />
      <circle
        cx={(width - 6)}
        cy={height - 4 - ((values[values.length - 1] - min) / span) * (height - 8)}
        r="2.8"
        fill={getStrokeByTone(tone)}
      />
    </svg>
  )
}
