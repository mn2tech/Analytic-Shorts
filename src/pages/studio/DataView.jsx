/**
 * DataView – Toggle tabs: Dataset | Upload | Data Lake | Schema (same style as Studio tabs).
 */

import { useState } from 'react'

const DATA_TABS = [
  { id: 'dataset', label: 'Dataset' },
  { id: 'upload', label: 'Upload' },
  { id: 'datalake', label: 'Data Lake' },
  { id: 'schema', label: 'Schema' }
]

export default function DataView({
  datasetId,
  setDatasetId,
  schema,
  data,
  dataLoadError,
  uploadedData,
  uploadedFileName,
  uploadLoading,
  uploadError,
  uploadInputRef,
  onFileUpload,
  onClearUploadedData,
  dataLakeListLoading,
  dataLakeList,
  saveToLakeName,
  setSaveToLakeName,
  saveToLakeLoading,
  saveToLakeDisabled,
  onSaveToDataLake,
  onDeleteFromDataLake,
  userDashboards,
  exampleDatasetIds,
  uploadDatasetId
}) {
  const [activeTab, setActiveTab] = useState('dataset')
  const rows = data && Array.isArray(data) ? data : []
  const columns = rows.length > 0 ? Object.keys(rows[0]) : (schema?.fields?.map((f) => f.name) ?? [])

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ minHeight: 480 }}>
      {/* Toggle tab bar for Data subtasks */}
      <div className="flex-shrink-0 mb-3">
        <nav className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5 w-fit" role="tablist">
          {DATA_TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {activeTab === 'dataset' && (
        <div className="rounded-lg border border-gray-200 p-3 bg-white">
          <h2 className="font-semibold text-gray-900 mb-2">Dataset</h2>
          <select
            value={datasetId}
            onChange={(e) => setDatasetId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select…</option>
            {uploadedData && (
              <optgroup label="Your upload">
                <option value={uploadDatasetId}>
                  Your uploaded file{uploadedFileName ? ` (${uploadedFileName})` : ''}
                </option>
              </optgroup>
            )}
            <optgroup label="Example datasets">
              {exampleDatasetIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </optgroup>
            {userDashboards?.length > 0 && (
              <optgroup label="Your dashboards">
                {userDashboards.map((d) => (
                  <option key={d.id} value={`dashboard:${d.id}`}>
                    {d.name || d.id}
                  </option>
                ))}
              </optgroup>
            )}
            {dataLakeList?.length > 0 && (
              <optgroup label="Data Lake">
                {dataLakeList.map((d) => (
                  <option key={d.id} value={`datalake:${d.id}`}>
                    {d.name || d.id} ({d.rowCount ?? 0} rows)
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {dataLoadError && (
            <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <p className="font-medium">Cannot load dataset</p>
              <p className="mt-0.5">{dataLoadError}</p>
              <details className="mt-1.5">
                <summary className="cursor-pointer text-amber-700 font-medium">Advanced troubleshooting</summary>
                <p className="mt-1 text-amber-700">
                  Start the backend on this machine: <code className="bg-amber-100 px-1 rounded">cd backend && node server.js</code>
                </p>
              </details>
            </div>
          )}
          {datasetId && rows.length > 0 && (
            <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden bg-white">
              <p className="text-sm font-medium text-gray-700 px-3 py-2 border-b border-gray-100 bg-gray-50">
                Preview ({rows.length} row{rows.length !== 1 ? 's' : ''})
              </p>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 bg-gray-100 z-10">
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="text-left px-3 py-2 border-b border-gray-200 font-medium text-gray-700 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                        {columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-gray-900 whitespace-nowrap">
                            {row[col] != null ? String(row[col]) : ''}
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
        )}
        {activeTab === 'upload' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Use your data</h2>
          <p className="text-xs text-gray-500 mb-2">CSV or Excel. Max 500 MB. Schema is inferred from your file.</p>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Upload file</span>
            <input
              ref={uploadInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileUpload}
              disabled={uploadLoading}
              className="block w-full text-sm text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </label>
          {uploadLoading && <p className="mt-1 text-sm text-gray-500">Uploading…</p>}
          {uploadError && (
            <p className="mt-1 text-sm text-red-600">
              {uploadError}
              {uploadError.toLowerCase().includes('limit') || uploadError.toLowerCase().includes('size') || uploadError.toLowerCase().includes('too large')
                ? ' (max 500 MB)'
                : ''}
            </p>
          )}
          {uploadedData && (
            <p className="mt-2 text-sm text-green-700">
              {uploadedData.length} rows loaded. Select &quot;Your uploaded file&quot; above.
            </p>
          )}
          {uploadedData && (
            <button type="button" onClick={onClearUploadedData} className="mt-2 text-xs text-gray-500 hover:text-red-600">
              Clear uploaded data
            </button>
          )}
        </div>
        )}
        {activeTab === 'datalake' && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <h2 className="font-semibold text-gray-900 mb-2">Data Lake</h2>
          <p className="text-gray-500 text-sm">Coming soon</p>
          <p className="text-xs text-gray-400 mt-1">Save and reuse datasets across reports.</p>
        </div>
        )}
        {activeTab === 'schema' && (
          schema ? (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-2">Schema</h2>
              <p className="text-xs text-gray-500 mb-2">{schema.rowCount} rows</p>
              <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                {schema.fields.map((f) => (
                  <li key={f.name} className="flex justify-between gap-2">
                    <span className="font-medium text-gray-700">{f.name}</span>
                    <span className="text-gray-500">{f.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-4 text-center py-8 text-gray-500 text-sm">
              Select a dataset or upload a file to see the schema.
            </div>
          )
        )}
      </div>
    </div>
  )
}
