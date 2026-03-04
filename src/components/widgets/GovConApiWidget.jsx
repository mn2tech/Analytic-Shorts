/**
 * Generic GovCon API widget - fetches data from endpoint and displays table or friendly message.
 */
import { useApiWidgetData } from '../../hooks/useApiWidgetData'

function GovConApiWidget({ widget }) {
  const { endpoint, defaultParams = {}, title } = widget
  const { data, rowCount, status, error, friendlyMessage, loading, refetch } =
    useApiWidgetData(endpoint, defaultParams)

  if (loading) {
    return (
      <div className="h-full min-h-[120px] flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (status === 'blocked' || status === 'error') {
    return (
      <div className="h-full min-h-[120px] rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-sm text-amber-800">
          {friendlyMessage || error || 'Unable to load data'}
        </p>
        <button
          type="button"
          onClick={refetch}
          className="mt-3 text-xs text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="h-full min-h-[120px] rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">No data returned</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-3 text-xs text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  const rows = Array.isArray(data) ? data : []
  const columns =
    rows.length > 0
      ? Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object')
      : []

  return (
    <div className="h-full min-h-[120px] rounded-lg border border-gray-200 bg-white overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="text-xs text-gray-500">{rowCount} rows</span>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.slice(0, 6).map((col) => (
                <th
                  key={col}
                  className="text-left py-2 px-2 font-medium text-gray-600 truncate max-w-[120px]"
                  title={col}
                >
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
              {columns.length > 6 && (
                <th className="text-gray-400 px-2">+{columns.length - 6}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.slice(0, 6).map((col) => (
                  <td
                    key={col}
                    className="py-1.5 px-2 truncate max-w-[120px]"
                    title={String(row[col] ?? '')}
                  >
                    {row[col] != null
                      ? typeof row[col] === 'number'
                        ? row[col].toLocaleString()
                        : String(row[col])
                      : '—'}
                  </td>
                ))}
                {columns.length > 6 && <td className="px-2 text-gray-400">…</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 10 && (
          <p className="text-xs text-gray-500 mt-2 px-2">
            Showing 10 of {rows.length} rows
          </p>
        )}
      </div>
    </div>
  )
}

export default GovConApiWidget
