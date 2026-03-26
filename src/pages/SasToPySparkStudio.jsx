import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { convertSasCode, explainSasConversion, parseSasCode } from '../api/migrationClient'

const MODES = [
  { id: 'basic', label: 'Basic' },
  { id: 'optimized', label: 'Optimized' },
  { id: 'databricks', label: 'Databricks-ready' },
]

const EXAMPLE_SAS = `data work.sales_clean;
  set work.sales_raw;
  if revenue > 1000 then tier = "HIGH";
  else tier = "STANDARD";
run;

proc sort data=work.sales_clean out=work.sales_sorted nodupkey;
  by customer_id order_date;
run;

proc summary data=work.sales_sorted;
  class region;
  var revenue;
run;`

export default function SasToPySparkStudio() {
  const navigate = useNavigate()
  const [sasCode, setSasCode] = useState(EXAMPLE_SAS)
  const [pysparkCode, setPysparkCode] = useState('')
  const [mode, setMode] = useState('basic')
  const [blocks, setBlocks] = useState([])
  const [warnings, setWarnings] = useState([])
  const [mapping, setMapping] = useState([])
  const [explanation, setExplanation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [openBlocks, setOpenBlocks] = useState({})

  const unsupportedWarnings = useMemo(
    () => warnings.filter((w) => /manual|partial|unsupported|not resolved/i.test(w)),
    [warnings]
  )

  const toggleBlock = (id) => {
    setOpenBlocks((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const inferRecommendedKeys = (blockList = []) => {
    const ranked = new Map()
    for (const block of blockList) {
      const text = String(block?.input || '')
      const byMatch = text.match(/\bby\s+([^;]+)/i)
      if (!byMatch) continue
      const cols = byMatch[1]
        .split(/\s+/)
        .map((c) => c.trim())
        .filter(Boolean)
      for (const col of cols) {
        const score = ranked.get(col) || 0
        ranked.set(col, score + 1)
      }
    }
    return [...ranked.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([col]) => col)
      .slice(0, 3)
  }

  const handleUpload = async (file) => {
    if (!file) return
    const text = await file.text()
    setSasCode(text)
    setError('')
  }

  const handleParse = async () => {
    setLoading(true)
    setError('')
    try {
      const parsed = await parseSasCode(sasCode)
      setBlocks(parsed.blocks || [])
      setWarnings(parsed.warnings || [])
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to parse SAS code.')
    } finally {
      setLoading(false)
    }
  }

  const handleConvert = async () => {
    setLoading(true)
    setError('')
    try {
      const converted = await convertSasCode(sasCode, mode)
      setBlocks(converted.blocks || [])
      setWarnings(converted.warnings || [])
      setMapping(converted.transformation_map || [])
      setPysparkCode(converted.pyspark_code || '')
      const explained = await explainSasConversion(sasCode, mode)
      setExplanation(explained)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to convert SAS code.')
    } finally {
      setLoading(false)
    }
  }

  const sendToValidationStudio = () => {
    const recommendedKeys = inferRecommendedKeys(blocks)
    const recommendedTolerance = mode === 'optimized' ? 0.005 : mode === 'databricks' ? 0.001 : 0.01
    navigate('/migration-validation-studio', {
      state: {
        migrationPayload: {
          source: 'sas-to-pyspark-studio',
          mode,
          pysparkCode,
          blockCount: blocks.length,
          warnings,
          pipelineBlocks: blocks.map((b) => ({
            id: b.id,
            type: b.type,
            line_start: b.line_start,
            line_end: b.line_end,
            constructs: b.constructs || {},
          })),
          recommended: {
            keyColumns: recommendedKeys,
            options: {
              numericTolerance: recommendedTolerance,
              ignoreCase: true,
              trimWhitespace: true,
              treatNullAsEmpty: true,
              enableToleranceComparison: true,
            },
          },
        },
      },
    })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">SAS to PySpark Migration Studio</h1>
          <p className="text-sm text-slate-600 mt-2">
            Convert SAS workloads to PySpark with block-level explainability and enterprise migration workflow support.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleParse} className="px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800" disabled={loading}>
            Parse SAS
          </button>
          <button type="button" onClick={handleConvert} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700" disabled={loading}>
            Convert Code
          </button>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            Conversion Mode
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
            >
              {MODES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            Upload .sas/.txt
            <input type="file" accept=".sas,.txt" onChange={(e) => handleUpload(e.target.files?.[0])} className="text-sm" />
          </label>
          <button
            type="button"
            onClick={sendToValidationStudio}
            className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={!pysparkCode}
          >
            Send to Validation Studio
          </button>
          {loading && <span className="text-sm text-slate-500">Processing conversion...</span>}
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">SAS Input</h2>
            </div>
            <div className="p-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <Editor
                  height="420px"
                  language="sql"
                  theme="vs-dark"
                  value={sasCode}
                  onChange={(value) => setSasCode(value || '')}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="font-semibold text-slate-900">PySpark Output</h2>
            </div>
            <div className="p-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <Editor
                  height="420px"
                  language="python"
                  theme="vs-dark"
                  value={pysparkCode}
                  onChange={(value) => setPysparkCode(value || '')}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    automaticLayout: true,
                    wordWrap: 'on',
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Block Breakdown</h3>
            <div className="space-y-2">
              {blocks.length === 0 && <p className="text-sm text-slate-500">No blocks parsed yet.</p>}
              {blocks.map((block, idx) => (
                <div key={`${block.id || idx}`} className="border border-slate-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => toggleBlock(block.id || String(idx))}
                    className="w-full px-3 py-2 text-left flex justify-between items-center"
                  >
                    <span className="text-sm font-medium text-slate-800">{block.type}</span>
                    <span className="text-xs text-slate-500">Lines {block.line_start || '-'} - {block.line_end || '-'}</span>
                  </button>
                  {openBlocks[block.id || String(idx)] && (
                    <div className="px-3 pb-3">
                      <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto border border-slate-200">{block.input}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Transformation Map</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="py-2">SAS</th>
                    <th>PySpark</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.length === 0 ? (
                    <tr><td className="py-2 text-slate-500" colSpan={3}>No mappings available yet.</td></tr>
                  ) : (
                    mapping.map((item) => (
                      <tr key={item.block_id} className="border-b border-slate-100">
                        <td className="py-2">{item.sas_construct}</td>
                        <td>{item.pyspark_construct}</td>
                        <td>{item.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Warnings</h3>
            {warnings.length === 0 ? (
              <p className="text-sm text-slate-500">No warnings detected.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {warnings.map((warning, idx) => (
                  <li key={`${warning}-${idx}`} className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
                    {warning}
                  </li>
                ))}
              </ul>
            )}
            {unsupportedWarnings.length > 0 && (
              <p className="text-xs text-rose-600 mt-3">
                Unsupported/partial constructs were detected. Manual review is required before production.
              </p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Explanation</h3>
            {!explanation ? (
              <p className="text-sm text-slate-500">Run conversion to generate explainability notes.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">{explanation.overview}</p>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">Assumptions</p>
                  <ul className="text-sm text-slate-700 list-disc ml-5">
                    {(explanation.assumptions || []).map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
