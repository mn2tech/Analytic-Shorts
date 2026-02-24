import React, { useMemo } from 'react'

const CONFIDENCE_STYLES = {
  High: { background: 'var(--card-2)', color: 'var(--success)', borderColor: 'var(--success)' },
  Medium: { background: 'var(--card-2)', color: 'var(--warning)', borderColor: 'var(--warning)' },
  Low: { background: 'var(--card-2)', color: 'var(--muted)', borderColor: 'var(--border)' },
}

const DEFAULT_INSIGHTS = [
  'Headline metrics and trend are derived from the current dataset and filters.',
  'Top drivers and breakdowns reflect the primary dimensions in the data.',
  'Confidence is based on data coverage and block-level validation.',
]

export default function AnalystInsightsPanel({ blocks = [], confidence = 'Medium', maxBullets = 5 }) {
  const bullets = useMemo(() => {
    const out = []
    const narrativeTypes = ['TrendBlock', 'ComparePeriodsBlock', 'DriverBlock']
    for (const block of blocks) {
      if (!block?.blockNarrative || !narrativeTypes.includes(block.type)) continue
      const text = String(block.blockNarrative).trim()
      if (text) out.push(text)
    }
    const capped = out.slice(0, maxBullets)
    if (capped.length >= 3) return capped
    return [...capped, ...DEFAULT_INSIGHTS.slice(0, 3 - capped.length)]
  }, [blocks, maxBullets])

  const confidenceStyle = CONFIDENCE_STYLES[confidence] || CONFIDENCE_STYLES.Medium

  return (
    <div className="rounded-xl p-6 shadow-md h-full flex flex-col" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
      <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--text)' }}>Analyst Insights</h3>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs px-2.5 py-1 rounded-full border font-medium" style={confidenceStyle}>
          Confidence: {confidence}
        </span>
      </div>
      <ul className="space-y-2.5 text-sm list-disc list-inside" style={{ color: 'var(--text)' }}>
        {bullets.map((b, i) => (
          <li key={i} className="leading-relaxed">{b}</li>
        ))}
      </ul>
    </div>
  )
}
