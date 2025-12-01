import { useState } from 'react'
import apiClient from '../config/api'

function ChartInsights({ 
  chartData, 
  chartType, 
  chartTitle, 
  selectedNumeric, 
  selectedCategorical, 
  selectedDate,
  forecastData,
  historicalData,
  trend,
  onClose 
}) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generateInsights = async () => {
    if (!chartData || chartData.length === 0) {
      setError('No chart data available for insights')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Prepare data for insights API
      const dataToAnalyze = chartData.length > 1000 ? chartData.slice(0, 1000) : chartData
      
      // Extract columns from the data (use all columns from first row, or selected columns)
      const columns = dataToAnalyze.length > 0 && dataToAnalyze[0]
        ? Object.keys(dataToAnalyze[0])
        : []
      
      // Ensure selected columns are included
      if (selectedNumeric && !columns.includes(selectedNumeric)) columns.push(selectedNumeric)
      if (selectedCategorical && !columns.includes(selectedCategorical)) columns.push(selectedCategorical)
      if (selectedDate && !columns.includes(selectedDate)) columns.push(selectedDate)
      
      // Create chart-specific context
      const chartContext = `This is a ${chartType} chart showing ${chartTitle}. `
      let chartSpecificContext = ''
      
      if (chartType === 'forecast' && forecastData && historicalData && trend) {
        const lastHistorical = historicalData[historicalData.length - 1]
        const firstForecast = forecastData[0]
        const changePercent = lastHistorical && firstForecast
          ? ((firstForecast.value - lastHistorical.value) / lastHistorical.value * 100).toFixed(1)
          : '0'
        
        const lastForecast = forecastData[forecastData.length - 1]
        const overallChange = lastHistorical && lastForecast
          ? ((lastForecast.value - lastHistorical.value) / lastHistorical.value * 100).toFixed(1)
          : '0'
        
        chartSpecificContext = `This is a forecast/prediction chart showing ${selectedNumeric} over time (${selectedDate}). 
The chart includes ${historicalData.length} historical data points and ${forecastData.length} forecasted periods.
Historical trend: ${trend.direction} trend with ${(trend.confidence * 100).toFixed(1)}% confidence.
Current value: ${lastHistorical?.value.toLocaleString()}
First forecast: ${firstForecast?.value.toLocaleString()} (${changePercent > 0 ? '+' : ''}${changePercent}% change)
Final forecast: ${lastForecast?.value.toLocaleString()} (${overallChange > 0 ? '+' : ''}${overallChange}% total change)

IMPORTANT: The user wants to understand:
1. What this forecast means in SIMPLE TERMS (explain like talking to a friend, avoid jargon)
2. What the prediction is showing (is it positive, negative, or neutral?)
3. SPECIFIC ACTIONABLE STEPS they can take to make the forecast more positive
4. Practical recommendations based on the data patterns

Focus on providing actionable advice that can help improve the forecasted outcomes. `
      } else if (chartType === 'line' && selectedDate) {
        chartSpecificContext = `The chart displays ${selectedNumeric} over time (${selectedDate}). `
      } else if (chartType === 'pie' && selectedCategorical) {
        chartSpecificContext = `The chart shows the distribution of ${selectedNumeric} by ${selectedCategorical}. `
      } else if (chartType === 'bar' && selectedCategorical) {
        chartSpecificContext = `The chart compares ${selectedNumeric} across different ${selectedCategorical} categories. `
      }

      const requestBody = {
        data: dataToAnalyze,
        columns: columns,
        isFiltered: false,
        totalRows: chartData.length,
        filteredRows: chartData.length,
        analyzedRows: dataToAnalyze.length,
        chartContext: chartContext + chartSpecificContext,
        chartType: chartType,
      }

      // Add forecast-specific data if available
      if (chartType === 'forecast' && forecastData && historicalData && trend) {
        requestBody.forecastData = forecastData
        requestBody.historicalData = historicalData
        requestBody.trend = trend
      }

      const response = await apiClient.post('/api/insights', requestBody)
      setInsights(response.data.insights)
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to generate insights')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>🤖</span>
              <span>AI Insights: {chartTitle}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {chartType} chart • {chartData.length} data point{chartData.length !== 1 ? 's' : ''}
              {chartType === 'forecast' && historicalData && forecastData && (
                <> • {historicalData.length} historical • {forecastData.length} forecasted</>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {!insights && !loading && !error && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">
                {chartType === 'forecast' 
                  ? 'Get AI-powered insights explaining your forecast in simple terms'
                  : 'Get AI-powered insights specifically for this chart'
                }
              </p>
              {chartType === 'forecast' && (
                <p className="text-sm text-gray-500 mb-4">
                  Learn what the forecast means and get actionable steps to improve your outcomes
                </p>
              )}
              <button
                onClick={generateInsights}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
              >
                Generate Insights
              </button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600">Analyzing chart data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {insights && (
            <div className="space-y-3 animate-slide-up">
              {chartType === 'forecast' && (
                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <p className="text-sm font-semibold text-purple-900 mb-2">📊 Forecast Explanation & Recommendations</p>
                  <p className="text-xs text-purple-700">
                    The insights below explain your forecast in simple terms and provide actionable steps to improve outcomes.
                  </p>
                </div>
              )}
              {insights.map((insight, index) => {
                // Check if this insight is about actionable recommendations
                const isActionable = chartType === 'forecast' && (
                  insight.toLowerCase().includes('action') ||
                  insight.toLowerCase().includes('recommend') ||
                  insight.toLowerCase().includes('step') ||
                  insight.toLowerCase().includes('can do') ||
                  insight.toLowerCase().includes('should') ||
                  insight.toLowerCase().includes('try')
                )
                
                return (
                  <div
                    key={index}
                    className={`border-l-4 p-4 rounded-lg ${
                      isActionable
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500'
                        : chartType === 'forecast'
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-500'
                        : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-500'
                    }`}
                  >
                    {isActionable && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-green-600 font-semibold text-sm">💡 Actionable Step</span>
                      </div>
                    )}
                    <p className="text-gray-800">{insight}</p>
                  </div>
                )
              })}
            </div>
          )}

          {insights && (
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={generateInsights}
                disabled={loading}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                Regenerate
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChartInsights

