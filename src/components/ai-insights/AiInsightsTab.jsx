import React, { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ScatterChart,
  Scatter,
} from 'recharts'
import useAiRiskAnalysis from '../../hooks/useAiRiskAnalysis'
import RiskSummaryCards from './RiskSummaryCards'
import RiskRecordsTable from './RiskRecordsTable'
import RiskExplanationPanel from './RiskExplanationPanel'
import BusinessImpactRoiPanel from './BusinessImpactRoiPanel'
import { refreshAuditCases, saveAiRiskResultToStorage } from '../../utils/auditWorkflowModel'

export default function AiInsightsTab({ data = [], columns = [], numericColumns = [], categoricalColumns = [], dateColumns = [] }) {
  const { loading, error, result, run } = useAiRiskAnalysis()
  const [selectedRecord, setSelectedRecord] = useState(null)

  const schema = useMemo(() => ({
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
  }), [columns, numericColumns, categoricalColumns, dateColumns])

  const canAnalyze = Array.isArray(data) && data.length > 0
  const onAnalyze = async () => {
    if (!canAnalyze) return
    const response = await run({
      dataset: data,
      schema,
      options: {
        max_rows: 10000,
      },
    })
    if (response) {
      saveAiRiskResultToStorage(response)
      refreshAuditCases()
    }
    const top = response?.records?.[0] || null
    setSelectedRecord(top)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">AI Insights</h2>
          <p className="text-sm text-slate-600">ML-based risk scoring, anomaly detection, and explainability on your uploaded data.</p>
        </div>
        <button
          onClick={onAnalyze}
          disabled={!canAnalyze || loading}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Run AI Analysis'}
        </button>
      </div>

      {!canAnalyze && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Upload or load a dataset to start AI risk analysis.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {Array.isArray(result?.warnings) && result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800 mb-1">Analysis Warnings</p>
          <ul className="text-sm text-amber-700 list-disc ml-5">
            {result.warnings.map((w, idx) => <li key={`${w}-${idx}`}>{w}</li>)}
          </ul>
        </div>
      )}

      {result && (
        <>
          <BusinessImpactRoiPanel summary={result.summary} />
          <RiskSummaryCards summary={result.summary} />

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Risk Distribution</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.risk_distribution || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Anomaly Scatter</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" name="record" />
                    <YAxis type="number" dataKey="risk_score" name="risk" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={result?.charts?.anomaly_scatter || []} fill="#0ea5e9" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <RiskRecordsTable
                records={result.records || []}
                selectedRecordId={selectedRecord?.record_id}
                onSelectRecord={setSelectedRecord}
              />
            </div>
            <RiskExplanationPanel record={selectedRecord} />
          </div>
        </>
      )}
    </div>
  )
}
