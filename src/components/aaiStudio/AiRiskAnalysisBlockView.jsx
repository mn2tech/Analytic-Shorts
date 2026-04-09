import React from 'react'

export default function AiRiskAnalysisBlockView({ block }) {
  const payload = block?.payload || {}
  const summary = payload.summary || {}
  const records = Array.isArray(payload.records) ? payload.records : []
  const top = records.slice(0, 8)

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg border p-2"><span className="text-gray-500">Total</span><div className="font-semibold">{summary.total_records ?? 0}</div></div>
        <div className="rounded-lg border p-2"><span className="text-gray-500">High Risk</span><div className="font-semibold">{summary.high_risk_count ?? 0}</div></div>
        <div className="rounded-lg border p-2"><span className="text-gray-500">Anomalies</span><div className="font-semibold">{summary.anomaly_count ?? 0}</div></div>
      </div>
      <div className="text-xs text-gray-500">
        Model: {summary.model_type || '—'} | Mode: {summary.analysis_mode || '—'}
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-xs border rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-2 py-1">Record</th>
              <th className="text-left px-2 py-1">Score</th>
              <th className="text-left px-2 py-1">Level</th>
              <th className="text-left px-2 py-1">Reason</th>
            </tr>
          </thead>
          <tbody>
            {top.map((r) => (
              <tr key={String(r.record_id)} className="border-t">
                <td className="px-2 py-1">{r.record_id}</td>
                <td className="px-2 py-1">{r.risk_score}</td>
                <td className="px-2 py-1">{r.risk_level}</td>
                <td className="px-2 py-1">{r.top_reasons?.[0]?.feature || '—'}</td>
              </tr>
            ))}
            {!top.length && (
              <tr><td colSpan={4} className="px-2 py-2 text-gray-500">No AI risk records available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
