import { useState, useEffect } from 'react'
import apiClient from '../config/api'

function AIInsights({ data, columns, totalRows, stats }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Clear insights when data changes (filters applied)
  useEffect(() => {
    setInsights(null)
    setError(null)
  }, [data, stats])

  const generateInsights = async () => {
    if (!data || data.length === 0) {
      setError('No data available for insights')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Send filtered data (limit to 1000 rows for API performance, but analyze all filtered rows)
      const dataToAnalyze = data.length > 1000 ? data.slice(0, 1000) : data
      const response = await apiClient.post('/api/insights', {
        data: dataToAnalyze,
        columns: columns,
        isFiltered: totalRows !== data.length, // Indicate if this is filtered data
        totalRows: totalRows,
        filteredRows: data.length,
        analyzedRows: dataToAnalyze.length,
        stats: stats, // Include summary statistics
      })
      setInsights(response.data.insights)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <span>🤖</span>
            <span>AI Insights</span>
          </h3>
          {data && data.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              {totalRows !== data.length 
                ? `Analyzing ${data.length} filtered row${data.length !== 1 ? 's' : ''} (from ${totalRows} total)`
                : `Analyzing ${data.length} row${data.length !== 1 ? 's' : ''}`
              }
            </p>
          )}
        </div>
        <button
          onClick={generateInsights}
          disabled={loading || !data || data.length === 0}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
        >
          {loading ? 'Generating...' : 'Generate Insights'}
        </button>
      </div>

      {loading && (
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p>Analyzing your data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {insights && (
        <div className="mt-4 space-y-3 animate-slide-up">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 p-4 rounded-lg"
            >
              <p className="text-gray-800">{insight}</p>
            </div>
          ))}
        </div>
      )}

      {!insights && !loading && !error && (
        <p className="text-gray-500 text-sm text-center py-4">
          Click "Generate Insights" to get AI-powered analysis of your data
        </p>
      )}
    </div>
  )
}

export default AIInsights

