import React from 'react'
import { deriveAiInsightsTopReasonsList, formatAiInsightsTopReasons } from '../../utils/aiInsightsTopReasons'

export default function RiskExplanationPanel({ record }) {
  if (!record) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-sm text-slate-500">
        Select a row to inspect explanation details.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Record Detail & Explainability</h3>
      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div><span className="text-slate-500">Record:</span> <span className="font-medium">{record.record_id}</span></div>
        <div><span className="text-slate-500">Risk Score:</span> <span className="font-medium">{record.risk_score}</span></div>
        <div><span className="text-slate-500">Risk Level:</span> <span className="font-medium">{record.risk_level}</span></div>
        <div><span className="text-slate-500">Anomaly Score:</span> <span className="font-medium">{record.anomaly_score ?? '—'}</span></div>
      </div>
      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Top Reason</div>
        <p className="text-sm font-medium text-slate-900">{formatAiInsightsTopReasons(record) || '—'}</p>
        {deriveAiInsightsTopReasonsList(record).length > 1 && (
          <ul className="mt-2 list-disc pl-4 text-sm text-slate-600">
            {deriveAiInsightsTopReasonsList(record).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Top Contributions</div>
        <ul className="space-y-1 text-sm">
          {(record.top_reasons || []).map((r, idx) => (
            <li key={`${r.feature}-${idx}`} className="text-slate-700">
              {r.feature} ({r.direction}, impact {Number(r.impact).toFixed(3)})
            </li>
          ))}
          {!record.top_reasons?.length && <li className="text-slate-500">No feature-level reasons available.</li>}
        </ul>
      </div>
      <div className="mb-3">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Explanation</div>
        <p className="text-sm text-slate-700">{record.explanation_text || 'No explanation available.'}</p>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Raw Record</div>
        <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-auto max-h-56">
          {JSON.stringify(record.raw || {}, null, 2)}
        </pre>
      </div>
    </div>
  )
}
