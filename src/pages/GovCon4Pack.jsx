/**
 * GovCon 4-pack template page.
 * Four widgets wired to SAM.gov and USAspending backend endpoints.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import GovConApiWidget from '../components/widgets/GovConApiWidget'
import {
  GOVCON_4PACK_WIDGETS,
  GOVCON_4PACK_TEMPLATE_ID,
} from '../config/govconTemplates'
import apiClient from '../config/api'

function GovCon4Pack() {
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const runTestTemplateData = async () => {
    setTesting(true)
    setTestResult(null)
    const results = []
    for (const w of GOVCON_4PACK_WIDGETS) {
      const url = w.endpoint
      const params = w.defaultParams || {}
      try {
        const response = await apiClient.get(url, {
          params,
          timeout: 15000,
          validateStatus: () => true,
        })
        const status = response.status
        let rowCount = 0
        const body = response.data
        if (Array.isArray(body)) rowCount = body.length
        else if (body?.data && Array.isArray(body.data))
          rowCount = body.rowCount ?? body.data.length
        else if (body?.results && Array.isArray(body.results))
          rowCount = body.results.length
        results.push({
          widgetId: w.id,
          title: w.title,
          endpoint: url,
          status,
          rowCount,
        })
      } catch (err) {
        results.push({
          widgetId: w.id,
          title: w.title,
          endpoint: url,
          status: 'ERR',
          rowCount: 0,
          error: err.message,
        })
      }
    }
    setTestResult(results)
    setTesting(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            GovCon 4-Pack Template
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Template ID: {GOVCON_4PACK_TEMPLATE_ID}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/reports/federal-entry"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Federal Entry Report
          </Link>
          <button
          type="button"
          onClick={runTestTemplateData}
          disabled={testing}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? 'Testing...' : 'Test Template Data'}
        </button>
        </div>
      </div>

      {testResult && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4 font-mono text-sm">
          <div className="font-semibold text-gray-700 mb-2">
            Test Template Data Results
          </div>
          <pre className="whitespace-pre-wrap break-words">
            {testResult
              .map(
                (r) =>
                  `${r.widgetId}: status=${r.status} rowCount=${r.rowCount}${r.error ? ` error=${r.error}` : ''}`
              )
              .join('\n')}
          </pre>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GOVCON_4PACK_WIDGETS.map((widget) => (
          <div
            key={widget.id}
            className="min-h-[280px] rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            <GovConApiWidget widget={widget} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default GovCon4Pack
