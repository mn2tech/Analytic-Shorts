import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { BAR_RADIUS, FONT_SIZE_AXIS } from './chartTheme'

export default function DataQualityBlockView({ block }) {
  const missingness = Array.isArray(block?.payload?.missingness) ? block.payload.missingness.slice(0, 12) : []
  const duplicatesPct = block?.payload?.duplicatesPct ?? 0
  const parseIssues = Array.isArray(block?.payload?.parseIssues) ? block.payload.parseIssues : []

  const barData = useMemo(() => {
    return missingness.map((m) => ({
      column: m.column || '',
      nullPct: Math.round((m.nullPct ?? 0) * 1000) / 10,
    }))
  }, [missingness])

  return (
    <div className="space-y-4">
      <div className="text-sm" style={{ color: 'var(--text)' }}>
        Duplicates: <span className="font-medium">{Math.round(duplicatesPct * 1000) / 10}%</span>
      </div>
      {barData.length > 0 && (
        <div>
          <div className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Missingness (top columns)</div>
          <ResponsiveContainer width="100%" height={Math.min(220, 40 + barData.length * 22)}>
            <BarChart data={barData} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 4 }}>
              <XAxis type="number" domain={[0, 100]} unit="%" stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} />
              <YAxis type="category" dataKey="column" width={100} stroke="var(--border)" style={{ fontSize: FONT_SIZE_AXIS }} tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} />
              <Bar dataKey="nullPct" fill="var(--chart-primary)" radius={BAR_RADIUS} name="Null %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="overflow-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left border-b" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
              <th className="py-2 pr-3">Column</th>
              <th className="py-2 pr-3">Null %</th>
            </tr>
          </thead>
          <tbody>
            {missingness.map((m) => (
              <tr key={m.column} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="py-2 pr-3 font-medium" style={{ color: 'var(--text)' }}>{m.column}</td>
                <td className="py-2 pr-3" style={{ color: 'var(--text)' }}>{Math.round((m.nullPct ?? 0) * 1000) / 10}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {parseIssues.length > 0 && (
        <>
          <div className="text-xs mt-3" style={{ color: 'var(--muted)' }}>Parse issues</div>
          <pre className="text-xs overflow-auto rounded-lg p-2" style={{ background: 'var(--card-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {JSON.stringify(parseIssues, null, 2)}
          </pre>
        </>
      )}
    </div>
  )
}
