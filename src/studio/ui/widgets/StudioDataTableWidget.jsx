import React, { useState } from 'react'

export default function StudioDataTableWidget({ widget, queryData, error, isLoading, dataSourceEndpoint }) {
  const [view, setView] = useState('table')

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-400 text-sm bg-white rounded-lg shadow p-4">
        <div className="text-center">
          <div className="text-xs mb-1">⚠️ Error</div>
          <div className="text-xs">{error}</div>
        </div>
      </div>
    )
  }

  if (isLoading || !queryData || !queryData.data) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm bg-white rounded-lg shadow p-4">
        <div className="text-center">
          {isLoading ? (
            <>
              <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
              <span className="ml-3 text-gray-600">Loading source data...</span>
            </>
          ) : (
            <div className="text-xs">No data available</div>
          )}
        </div>
      </div>
    )
  }

  const rows = queryData.data
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  const endpoint = dataSourceEndpoint || 'Filtered data'

  if (columns.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm bg-white rounded-lg shadow p-4">
        <div className="text-xs">No columns</div>
      </div>
    )
  }

  const maxTableRows = 200
  const maxJsonRows = 50
  const displayRows = rows.slice(0, maxTableRows)
  const hasMoreTable = rows.length > maxTableRows
  const jsonSlice = rows.slice(0, maxJsonRows)
  const hasMoreJson = rows.length > maxJsonRows

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow min-h-[200px]">
      <h3 className="text-sm font-semibold text-gray-700 p-4 pb-2 border-b border-gray-200">{widget.title}</h3>
      <div className="p-4 overflow-auto flex-1 min-h-0">
        {/* Same summary cards as Data & Metadata modal */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 uppercase">Endpoint</div>
            <div className="text-sm text-gray-900 truncate" title={endpoint}>{endpoint}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 uppercase">Rows</div>
            <div className="text-sm font-semibold text-gray-900">{rows.length}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 uppercase">Columns</div>
            <div className="text-sm font-semibold text-gray-900">{columns.length}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 uppercase">Column names</div>
            <div className="text-xs text-gray-700 truncate" title={columns.join(', ')}>
              {columns.slice(0, 3).join(', ')}{columns.length > 3 ? '…' : ''}
            </div>
          </div>
        </div>
        {/* Table / JSON toggle - same as Data & Metadata */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => setView('table')}
            className={`px-3 py-1.5 text-sm rounded-lg ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Table
          </button>
          <button
            type="button"
            onClick={() => setView('json')}
            className={`px-3 py-1.5 text-sm rounded-lg ${view === 'json' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            JSON
          </button>
        </div>
        {view === 'table' && (
          <div className="border border-gray-200 rounded-lg overflow-auto max-h-[50vh]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {columns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col} className="px-3 py-2 text-gray-900 max-w-xs truncate" title={String(row[col] ?? '')}>
                        {String(row[col] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMoreTable && (
              <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 border-t">Showing first {maxTableRows} of {rows.length} rows</div>
            )}
          </div>
        )}
        {view === 'json' && (
          <pre className="p-4 bg-gray-50 rounded-lg text-xs overflow-auto max-h-[50vh] border border-gray-200">
            {JSON.stringify(jsonSlice, null, 2)}
            {hasMoreJson && `\n\n... and ${rows.length - maxJsonRows} more rows`}
          </pre>
        )}
      </div>
    </div>
  )
}
