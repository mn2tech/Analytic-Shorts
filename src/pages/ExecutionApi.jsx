import { useState } from 'react'
import apiClient from '../config/api'

const DATASETS = [
  { value: 'sales', label: 'sales (Category, Region, Sales, Units)' },
  { value: 'attendance', label: 'attendance (Department, Status, Hours)' },
]

const SAS_TEMPLATE_DEFAULT = `PROC SUMMARY DATA=sales;
  VAR Sales Units;
RUN;`

const SAS_TEMPLATE_SUMMARY = `PROC SUMMARY DATA=work.sales NWAY;
  CLASS Category Region;
  VAR Sales Units;
  OUTPUT OUT=work.out MEAN= SUM= N=;
RUN;`

const SAS_TEMPLATE_MEANS = `PROC MEANS DATA=work.sales;
  VAR Sales Units;
RUN;`

const SAS_TEMPLATE_FREQ = `PROC FREQ DATA=work.sales;
  TABLES Category Region;
RUN;`

const SPEC_EXAMPLE = `{
  "tasks": [
    {
      "task": "summary",
      "group_by": ["Category", "Region"],
      "metrics": [
        { "col": "Sales", "agg": ["sum", "mean", "count"] },
        { "col": "Units", "agg": ["sum"] }
      ]
    }
  ]
}`

const INLINE_JSON_EXAMPLE = `[
  {"Category":"Electronics","Region":"East","Sales":7000,"Units":50},
  {"Category":"Electronics","Region":"East","Sales":8000,"Units":55},
  {"Category":"Furniture","Region":"West","Sales":4500,"Units":15}
]`

export default function ExecutionApi() {
  const [mode, setMode] = useState('sas_proc') // 'spec' | 'sas_proc' - default SAS PROC
  const [specJson, setSpecJson] = useState(SPEC_EXAMPLE)
  const [sasCode, setSasCode] = useState(SAS_TEMPLATE_DEFAULT)
  const [datasetId, setDatasetId] = useState('sales')
  const [inputMode, setInputMode] = useState('dataset') // 'dataset' | 'inline_json'
  const [inlineJson, setInlineJson] = useState(INLINE_JSON_EXAMPLE)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('execute') // 'execute' | 'docs'

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      if (inputMode === 'inline_json') {
        let data
        try {
          data = JSON.parse(inlineJson)
        } catch {
          setError({ message: 'Invalid JSON in input data' })
          setLoading(false)
          return
        }
        if (!Array.isArray(data)) {
          setError({ message: 'Input data must be a JSON array of objects' })
          setLoading(false)
          return
        }
        if (mode !== 'sas_proc') {
          setError({ message: 'Inline JSON mode requires SAS PROC code (not Spec JSON)' })
          setLoading(false)
          return
        }
        const { data: res } = await apiClient.post('/api/v1/run', {
          program: { language: 'sas_proc', code: sasCode },
          input: { type: 'inline_json', data },
          options: { async: false },
        })
        setResult(res)
      } else {
        let spec
        if (mode === 'spec') {
          try {
            spec = JSON.parse(specJson)
          } catch {
            setError({ message: 'Invalid JSON in spec' })
            setLoading(false)
            return
          }
        }
        const payload =
          mode === 'spec'
            ? { dataset_id: datasetId, engine: 'python', spec }
            : { dataset_id: datasetId, engine: 'python', code: sasCode, code_lang: 'sas_proc' }
        const { data } = await apiClient.post('/api/v1/jobs', payload)
        setResult(data)
      }
    } catch (err) {
      const res = err.response?.data
      setError({
        message: res?.message ?? res?.error ?? err.message ?? 'Request failed',
        parseErrors: res?.parseErrors,
      })
    } finally {
      setLoading(false)
    }
  }

  const insertSasTemplate = (template) => {
    setSasCode(template)
  }

  const records = result?.result?.records ?? (Array.isArray(result?.result?.outputs) ? result.result.outputs.flatMap((o) => o.records || []) : [])
  const preview = result?.preview ?? result?.result?.records ?? records.slice(0, 50)
  const outputs = result?.result?.outputs ?? []
  const tokensUsed = result?.usage?.tokens_used ?? result?.tokens_used ?? 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Execution API</h1>
        <p className="text-gray-600 mb-6">
          Run analytics jobs using JSON specs or SAS PROC syntax.
        </p>

        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('execute')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'execute'
                ? 'bg-white border border-b-0 border-gray-200 text-gray-900 -mb-px'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Execute
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === 'docs'
                ? 'bg-white border border-b-0 border-gray-200 text-gray-900 -mb-px'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            API Docs
          </button>
        </div>

        {activeTab === 'execute' && (
          <>
            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode('spec')}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                  mode === 'spec'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Spec JSON
              </button>
              <button
                onClick={() => setMode('sas_proc')}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                  mode === 'sas_proc'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                SAS PROC
              </button>
            </div>

            {/* Data input toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setInputMode('dataset')}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                  inputMode === 'dataset'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Dataset
              </button>
              <button
                onClick={() => setInputMode('inline_json')}
                className={`px-4 py-2 rounded-lg border font-medium transition-colors ${
                  inputMode === 'inline_json'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Inline JSON
              </button>
            </div>

            {inputMode === 'dataset' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
                <p className="text-xs text-gray-500 mb-1">Select a sample dataset to run analytics on.</p>
                <select
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {DATASETS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {inputMode === 'inline_json' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Input Data (JSON array of objects)</label>
                <p className="text-xs text-gray-500 mb-1">Paste your data as a JSON array. Max 10MB.</p>
                <textarea
                  value={inlineJson}
                  onChange={(e) => setInlineJson(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="[{ &quot;col1&quot;: 1, &quot;col2&quot;: &quot;x&quot; }, ...]"
                />
              </div>
            )}

            {/* Input area */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {mode === 'spec' ? 'JSON Spec' : 'SAS Code'}
              </label>
              {mode === 'sas_proc' && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => insertSasTemplate(SAS_TEMPLATE_SUMMARY)}
                    className="text-sm px-3 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    PROC SUMMARY
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSasTemplate(SAS_TEMPLATE_MEANS)}
                    className="text-sm px-3 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    PROC MEANS
                  </button>
                  <button
                    type="button"
                    onClick={() => insertSasTemplate(SAS_TEMPLATE_FREQ)}
                    className="text-sm px-3 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    PROC FREQ
                  </button>
                </div>
              )}
              <textarea
                value={mode === 'spec' ? specJson : sasCode}
                onChange={(e) => (mode === 'spec' ? setSpecJson(e.target.value) : setSasCode(e.target.value))}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={mode === 'spec' ? 'Enter JSON spec...' : 'Enter SAS PROC code...'}
              />
            </div>

            {/* Run button */}
            <button
              onClick={handleRun}
              disabled={loading}
              className="px-6 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Running…' : 'Run'}
            </button>

            {/* Error */}
            {error && (
              <div className="mt-6 p-4 rounded-lg border border-red-200 bg-red-50">
                <h3 className="font-semibold text-red-900 mb-2">Error</h3>
                <p className="text-red-700 mb-2">{error.message}</p>
                {error.parseErrors && error.parseErrors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-800">Parse errors:</p>
                    <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                      {error.parseErrors.map((err, i) => (
                        <li key={i}>
                          {err.code}: {err.message}
                          {err.line != null && ` (line ${err.line})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="mt-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Job Result Viewer</h2>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <p className="text-sm font-medium text-gray-500">Job Status</p>
                    <p className="text-2xl font-bold text-green-700 capitalize">{result?.status ?? '—'}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <p className="text-sm font-medium text-gray-500">Tokens Used</p>
                    <p className="text-2xl font-bold text-gray-900">{tokensUsed}</p>
                  </div>
                  {result?.usage?.runtime_seconds != null && (
                    <div className="p-4 rounded-lg border border-gray-200 bg-white">
                      <p className="text-sm font-medium text-gray-500">Runtime</p>
                      <p className="text-2xl font-bold text-gray-900">{result.usage.runtime_seconds}s</p>
                    </div>
                  )}
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <p className="text-sm font-medium text-gray-500">Records</p>
                    <p className="text-2xl font-bold text-gray-900">{records?.length ?? 0}</p>
                  </div>
                </div>

                {outputs.length > 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h3 className="font-medium text-gray-900 mb-2">Outputs</h3>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {outputs.map((o, i) => (
                        <li key={i}>
                          {o.name || o.column}: {Array.isArray(o.records) ? o.records.length : 0} rows
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <h3 className="font-medium text-gray-900 p-4 border-b border-gray-200">Results Table</h3>
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    {Array.isArray(preview) && preview.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {Object.keys(preview[0]).map((col) => (
                              <th key={col} className="px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {preview.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {Object.keys(preview[0]).map((col) => {
                                const val = row[col]
                                return (
                                  <td key={col} className="px-4 py-2 text-gray-800 whitespace-nowrap">
                                    {val == null ? '—' : typeof val === 'number' && Number.isFinite(val)
                                      ? Number.isInteger(val) ? Number(val).toLocaleString() : Number(val).toLocaleString(undefined, { maximumFractionDigits: 2 })
                                      : String(val)}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="p-4 text-gray-500">No preview data</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-6">
              <h3 className="font-semibold text-amber-900 mb-2">Supported SAS PROC subset (safety)</h3>
              <p className="text-sm text-amber-800 mb-2">
                Only <strong>PROC SUMMARY</strong>, <strong>PROC MEANS</strong>, and <strong>PROC FREQ</strong> are supported.
                No DATA steps, %macros, %include, PROC SQL, LIBNAME, OPTIONS, or file I/O.
              </p>
              <ul className="text-sm text-amber-800 list-disc list-inside space-y-0.5">
                <li>SUMMARY/MEANS: CLASS, VAR, OUTPUT OUT= with MEAN=, SUM=, N=, MIN=, MAX=; NWAY option</li>
                <li>FREQ: TABLES col1 col2 … (frequency tables with value, count, percent)</li>
              </ul>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">POST /api/v1/run (Unified Compute)</h2>
              <p className="text-gray-600 mb-2">
                Send JSON data + program (SAS PROC), get JSON results. Ideal for n8n and automation.
              </p>
              <pre className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm overflow-x-auto mb-4">
{`{
  "program": {
    "language": "sas_proc",
    "code": "PROC SUMMARY; CLASS Region; VAR Sales Units; RUN;"
  },
  "input": {
    "type": "inline_json",
    "data": [{"Category":"Electronics","Region":"East","Sales":7000,"Units":50}]
  },
  "options": { "async": false },
  "callback_url": null
}`}
              </pre>
              <p className="text-sm text-gray-500 mb-2">Response (200):</p>
              <pre className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm overflow-x-auto">
{`{
  "status": "completed",
  "job_id": "uuid",
  "result": { "type": "table", "records": [...], "records_count": N },
  "usage": { "runtime_seconds": 0.4, "bytes_scanned": 4231, "tokens_used": 1 }
}`}
              </pre>
              <p className="text-sm text-gray-500 mt-2">Error (413): {`{ "status": "error", "message": "Inline JSON limited to 10MB..." }`}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">POST /api/v1/jobs (Dataset mode)</h2>
              <p className="text-gray-600 mb-4">
                Submit an analytics job. Use either <code className="px-1 py-0.5 rounded bg-gray-100">spec</code> (JSON)
                or <code className="px-1 py-0.5 rounded bg-gray-100">code</code> + <code className="px-1 py-0.5 rounded bg-gray-100">code_lang</code>.
              </p>

              <h3 className="font-medium text-gray-900 mb-2">Spec mode (JSON)</h3>
              <pre className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm overflow-x-auto">
{`{
  "dataset_id": "sales",
  "engine": "python",
  "spec": {
    "tasks": [
      {
        "task": "summary",
        "group_by": ["Category", "Region"],
        "metrics": [
          { "col": "Sales", "agg": ["sum", "mean"] },
          { "col": "Units", "agg": ["sum"] }
        ]
      }
    ]
  }
}`}
              </pre>

              <h3 className="font-medium text-gray-900 mb-2 mt-4">SAS PROC mode</h3>
              <pre className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm overflow-x-auto">
{`{
  "dataset_id": "attendance",
  "engine": "python",
  "code": "PROC FREQ;\\n  TABLES Department Status;\\nRUN;",
  "code_lang": "sas_proc"
}`}
              </pre>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Example response (201)</h2>
              <pre className="p-4 rounded-lg border border-gray-200 bg-gray-50 text-sm overflow-x-auto">
{`{
  "jobId": "uuid",
  "status": "completed",
  "result": {
    "records": [...],
    "outputs": [{ "name": "freq_Department", "column": "Department", "records": [...] }],
    "tokens_used": 0
  },
  "preview": [...],
  "tokens_used": 0
}`}
              </pre>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Datasets</h2>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li><strong>sales</strong>: Date, Product, Category, Sales, Region, Units</li>
                <li><strong>attendance</strong>: Date, Employee, Department, Hours, Status</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
