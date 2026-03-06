/**
 * Model Scoring (Beta) - Upload models, score JSON records via API
 */
import { useState, useEffect } from 'react'
import apiClient from '../config/api'
import { useAuth } from '../contexts/AuthContext'

const INPUT_EXAMPLE = `[
  { "x1": 1, "x2": 2 },
  { "x1": 3, "x2": 4 }
]`

export default function Scoring() {
  const { user } = useAuth()
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelId, setModelId] = useState('')
  const [inputJson, setInputJson] = useState(INPUT_EXAMPLE)
  const [returnProba, setReturnProba] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadName, setUploadName] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('execute')

  useEffect(() => {
    if (user) {
      setModelsLoading(true)
      apiClient.get('/api/v1/models')
        .then((res) => setModels(res.data?.models || []))
        .catch(() => setModels([]))
        .finally(() => setModelsLoading(false))
    }
  }, [user])

  const handleUpload = async () => {
    if (!uploadFile) {
      setError({ message: 'Select a model file first' })
      return
    }
    setUploadLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      if (uploadName) form.append('name', uploadName)
      const { data } = await apiClient.post('/api/v1/models/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setModels((prev) => [{ id: data.model_id, name: data.name || 'model', format: data.format, storage_path: data.storage_path }, ...prev])
      setModelId(data.model_id)
      setUploadFile(null)
      setUploadName('')
    } catch (err) {
      setError({ message: err.response?.data?.error || err.message })
    } finally {
      setUploadLoading(false)
    }
  }

  const handleScore = async () => {
    if (!modelId) {
      setError({ message: 'Select or upload a model first' })
      return
    }
    let parsed
    try {
      parsed = JSON.parse(inputJson)
    } catch {
      setError({ message: 'Invalid JSON in input data' })
      return
    }
    // If pasted run payload (program + input), extract input.data
    let data = parsed
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const runData = parsed.input?.data
      if (Array.isArray(runData)) {
        data = runData
        setInputJson(JSON.stringify(runData, null, 2))
      }
    }
    if (!Array.isArray(data)) {
      setError({ message: 'Input data must be a JSON array of objects' })
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data: res } = await apiClient.post('/api/v1/score', {
        model_id: modelId,
        input: { type: 'inline_json', data },
        options: { return_proba: returnProba },
      })
      setResult(res)
    } catch (err) {
      const msg = err.response?.data?.error || err.message
      const details = err.response?.data?.details
      setError({ message: details ? `${msg}: ${details}` : msg })
    } finally {
      setLoading(false)
    }
  }

  const downloadPredictions = () => {
    if (!result?.predictions) return
    const blob = new Blob([JSON.stringify(result.predictions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'predictions.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const predictions = result?.predictions ?? result?.preview ?? []
  const tokensUsed = result?.usage?.tokens_used ?? 0
  const preview = predictions.slice(0, 50)

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Model Scoring (Beta)</h1>
          <p className="text-amber-700 bg-amber-50 p-4 rounded-lg">
            Sign in to upload models and run scoring jobs.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Model Scoring (Beta)</h1>
        <p className="text-gray-600 mb-6">
          Upload model artifacts and score JSON records via API. Supports joblib, pickle, ONNX.
        </p>

        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('execute')}
            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'execute' ? 'bg-white border border-b-0 border-gray-200 -mb-px' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Execute
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded-t-lg font-medium ${activeTab === 'docs' ? 'bg-white border border-b-0 border-gray-200 -mb-px' : 'text-gray-600 hover:text-gray-900'}`}
          >
            API Docs
          </button>
        </div>

        {activeTab === 'execute' && (
          <>
            {/* Upload Model */}
            <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Upload Model</h2>
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="churn_model"
                    className="px-3 py-2 border border-gray-300 rounded-lg w-40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File (.joblib, .pkl, .onnx)</label>
                  <input
                    type="file"
                    accept=".joblib,.pkl,.onnx"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="text-sm"
                  />
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploadLoading || !uploadFile}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadLoading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
              {models.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">Model ID: {modelId || models[0]?.id}</p>
              )}
            </div>

            {/* Model selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg bg-white"
              >
                <option value="">Select a model</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.format})</option>
                ))}
              </select>
            </div>

            {/* Input Data */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Input Data (JSON array of objects)</label>
              <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                placeholder="[{ &quot;x1&quot;: 1, &quot;x2&quot;: 2 }, ...]"
              />
            </div>

            <div className="mb-4 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={returnProba}
                  onChange={(e) => setReturnProba(e.target.checked)}
                />
                <span className="text-sm">Return probability (if model has predict_proba)</span>
              </label>
            </div>

            {/* Score Button */}
            <button
              onClick={handleScore}
              disabled={loading || !modelId}
              className="px-6 py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Scoring…' : 'Score'}
            </button>

            {error && (
              <div className="mt-6 p-4 rounded-lg border border-red-200 bg-red-50">
                <p className="text-red-700">{error.message}</p>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="mt-6 space-y-4">
                <h2 className="text-xl font-semibold text-gray-900">Results</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="text-xl font-bold text-green-700 capitalize">{result?.status ?? '—'}</p>
                  </div>
                  <div className="p-4 rounded-lg border border-gray-200 bg-white">
                    <p className="text-sm font-medium text-gray-500">Tokens Used</p>
                    <p className="text-xl font-bold text-gray-900">{tokensUsed}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">Predictions (first 50)</h3>
                    <button
                      onClick={downloadPredictions}
                      className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
                    >
                      Download predictions.json
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-96">
                    {preview.length > 0 ? (
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">#</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-700">score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {preview.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-600">{i + 1}</td>
                              <td className="px-4 py-2 text-gray-800">{r.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="p-4 text-gray-500">No predictions</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-2">POST /api/v1/models</h3>
              <p className="text-sm text-gray-600 mb-2">Create model and get signed upload URL.</p>
              <pre className="p-4 rounded bg-gray-50 text-xs overflow-x-auto">{`{
  "name": "churn_model",
  "format": "joblib",
  "filename": "model.joblib"
}

// Or use POST /api/v1/models/upload with multipart form:
// file: <binary>, name: "churn_model"`}</pre>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-2">POST /api/v1/score</h3>
              <p className="text-sm text-gray-600 mb-2">Score records (inline JSON, &lt;=5000 rows sync).</p>
              <pre className="p-4 rounded bg-gray-50 text-xs overflow-x-auto">{`{
  "model_id": "uuid",
  "input": {
    "type": "inline_json",
    "data": [{ "x1": 1, "x2": 2 }, ...]
  },
  "options": { "return_proba": false },
  "callback_url": "https://.../webhook"  // optional
}

// Response (sync):
{
  "status": "completed",
  "predictions": [{ "score": 0.87 }, ...],
  "usage": { "tokens_used": 2, "runtime_seconds": 0.1 }
}`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
