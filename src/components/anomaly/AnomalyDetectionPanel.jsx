import { useMemo, useState } from 'react'
import apiClient from '../../config/api'
import { sensitivityToContamination } from '../../utils/anomalyDetection'

function adaptCanonicalRiskToAnomalyView(response) {
  const records = Array.isArray(response?.records) ? response.records : []
  const rows = records.map((record) => ({
    ...(record?.raw && typeof record.raw === 'object' ? record.raw : {}),
    anomaly_flag: Boolean(record?.anomaly_flag),
    anomaly_score: Number(record?.anomaly_score ?? 0),
  }))
  const anomalyRows = rows
    .filter((row) => row.anomaly_flag)
    .sort((a, b) => Number(b.anomaly_score || 0) - Number(a.anomaly_score || 0))

  const totalRows = Number(response?.summary?.total_records || rows.length || 0)
  const anomalyCount = Number(response?.summary?.anomaly_count || anomalyRows.length || 0)
  const anomalyPercent = totalRows > 0 ? (anomalyCount / totalRows) * 100 : 0

  return {
    summary: {
      total_rows: totalRows,
      anomaly_count: anomalyCount,
      anomaly_percent: Number(anomalyPercent.toFixed(2)),
    },
    rows,
    top_anomalies: anomalyRows.slice(0, 25),
    // Keep canonical payload accessible for future UI additions/debugging.
    canonical: response,
  }
}

function AnomalyDetectionPanel({ rows = [], numericColumns = [] }) {
  const [selectedColumns, setSelectedColumns] = useState(() => numericColumns.slice(0, 3))
  const [sensitivity, setSensitivity] = useState(50)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const contamination = useMemo(
    () => sensitivityToContamination(sensitivity),
    [sensitivity]
  )

  const effectiveRows = useMemo(
    () => (Array.isArray(rows) ? rows : []),
    [rows]
  )

  const toggleColumn = (column) => {
    setSelectedColumns((prev) => {
      if (prev.includes(column)) return prev.filter((c) => c !== column)
      return [...prev, column]
    })
  }

  const runAnomalyDetection = async () => {
    setError('')
    if (!effectiveRows.length) {
      setError('No rows available for anomaly detection.')
      return
    }
    if (!selectedColumns.length) {
      setError('Select at least one numeric column.')
      return
    }

    setIsLoading(true)
    try {
      const response = await apiClient.post('/api/ai/risk-analysis', {
        dataset: effectiveRows,
        options: {
          // Canonical backend currently uses anomaly_contamination; selected columns
          // are passed as hints for progressive backend support.
          anomaly_contamination: contamination,
          preferred_numeric_columns: selectedColumns,
          selected_numeric_columns: selectedColumns,
          max_rows: Math.min(effectiveRows.length, 10000),
        },
      })
      setResult(adaptCanonicalRiskToAnomalyView(response.data || null))
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to detect anomalies.'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">ML Anomaly Detection</h3>
          <p className="text-sm text-gray-600">Isolation Forest on selected numeric columns.</p>
        </div>
        <button
          type="button"
          onClick={runAnomalyDetection}
          disabled={isLoading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-60"
        >
          {isLoading ? 'Detecting...' : 'Detect Anomalies'}
        </button>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-gray-800 mb-2">Numeric columns</p>
        <div className="flex flex-wrap gap-2">
          {numericColumns.map((col) => (
            <label key={col} className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm bg-gray-50">
              <input
                type="checkbox"
                checked={selectedColumns.includes(col)}
                onChange={() => toggleColumn(col)}
              />
              <span>{col}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-800">Sensitivity</p>
          <p className="text-xs text-gray-600">contamination: {contamination}</p>
        </div>
        <input
          type="range"
          min={1}
          max={100}
          value={sensitivity}
          onChange={(e) => setSensitivity(Number(e.target.value))}
          className="w-full mt-2"
        />
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {result?.summary && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-600">Total Rows</p>
            <p className="text-xl font-semibold text-gray-900">{result.summary.total_rows ?? 0}</p>
          </div>
          <div className="p-3 rounded-lg border border-red-200 bg-red-50">
            <p className="text-xs text-red-700">Anomalies</p>
            <p className="text-xl font-semibold text-red-800">{result.summary.anomaly_count ?? 0}</p>
          </div>
          <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
            <p className="text-xs text-amber-700">Anomaly %</p>
            <p className="text-xl font-semibold text-amber-800">{result.summary.anomaly_percent ?? 0}%</p>
          </div>
        </div>
      )}

      {Array.isArray(result?.top_anomalies) && result.top_anomalies.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Top anomalies</h4>
          <div className="space-y-2">
            {result.top_anomalies.slice(0, 10).map((row, idx) => (
              <div key={idx} className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm">
                <div className="font-medium text-red-900">Score: {Number(row.anomaly_score || 0).toFixed(4)}</div>
                <div className="text-red-800 truncate">{JSON.stringify(row)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(result?.rows) && result.rows.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Anomaly results</h4>
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  {Object.keys(result.rows[0]).slice(0, 8).map((key) => (
                    <th key={key} className="px-3 py-2 text-left font-medium">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 200).map((row, idx) => (
                  <tr
                    key={idx}
                    className={row.anomaly_flag ? 'bg-red-50 border-t border-red-100' : 'bg-white border-t border-gray-100'}
                  >
                    {Object.keys(result.rows[0]).slice(0, 8).map((key) => (
                      <td key={key} className="px-3 py-2 whitespace-nowrap">
                        {String(row[key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnomalyDetectionPanel
