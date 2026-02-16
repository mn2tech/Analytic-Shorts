import { useState } from 'react'
import { useEffect } from 'react'
import apiClient from '../config/api'

function ExampleDatasetButton({ onDatasetLoad, onError }) {
  const [loadingDataset, setLoadingDataset] = useState(null)
  const [exampleDatasets, setExampleDatasets] = useState([])

  useEffect(() => {
    let mounted = true

    const fetchReports = async () => {
      try {
        const res = await apiClient.get('/api/example/api-reports')
        const reports = Array.isArray(res?.data?.reports) ? res.data.reports : []
        if (!mounted) return
        setExampleDatasets(reports.map((r) => ({
          name: r.name,
          description: r.description,
          endpoint: r.endpoint
        })))
      } catch (error) {
        console.error('Failed to load API report list:', error)
        if (!mounted) return
        setExampleDatasets([])
      }
    }

    fetchReports()
    return () => {
      mounted = false
    }
  }, [])

  const loadExample = async (endpoint, datasetName) => {
    setLoadingDataset(datasetName)
    try {
      console.log(`Loading example dataset: ${datasetName} from ${endpoint}`)
      const response = await apiClient.get(endpoint, { timeout: 30000 })
      console.log('Example dataset response:', {
        hasData: !!response.data,
        hasDataArray: !!(response.data && response.data.data),
        dataLength: response.data?.data?.length,
        columns: response.data?.columns?.length,
        numericColumns: response.data?.numericColumns?.length,
        categoricalColumns: response.data?.categoricalColumns?.length,
        dateColumns: response.data?.dateColumns?.length
      })
      
      if (response.data && response.data.data && Array.isArray(response.data.data)) {
        onDatasetLoad(response.data)
      } else {
        console.error('Invalid response format:', response.data)
        onError('Invalid data format received from server. Please check the backend server.')
      }
    } catch (error) {
      console.error('Error loading dataset:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method
        }
      })
      
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const isProduction = import.meta.env.PROD
        const hasApiUrl = import.meta.env.VITE_API_URL
        
        let errorMessage = 'Cannot connect to backend server.\n\n'
        
        if (isProduction && !hasApiUrl) {
          errorMessage += '⚠️ VITE_API_URL is not configured in Amplify.\n\n'
          errorMessage += 'To fix this:\n'
          errorMessage += '1. Go to AWS Amplify Console\n'
          errorMessage += '2. App settings → Environment variables\n'
          errorMessage += '3. Add: VITE_API_URL = your backend URL\n'
          errorMessage += '4. Redeploy the app\n\n'
          errorMessage += 'Example: https://your-backend-url.com'
        } else if (isProduction && hasApiUrl) {
          errorMessage += 'The backend server may be down or unreachable.\n\n'
          errorMessage += `Current API URL: ${import.meta.env.VITE_API_URL}\n\n`
          errorMessage += 'Please verify:\n'
          errorMessage += '1. Backend server is running\n'
          errorMessage += '2. Backend URL is correct\n'
          errorMessage += '3. CORS is configured properly'
        } else {
          errorMessage += 'Please ensure:\n'
          errorMessage += '1. Backend server is running (npm run server)\n'
          errorMessage += '2. Backend is accessible at http://localhost:5000'
        }
        
        onError(errorMessage)
      } else if (error.response) {
        // Server responded with error status
        const errorMsg = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`
        onError(`Failed to load example dataset: ${errorMsg}`)
      } else {
        onError(error.message || 'Failed to load example dataset. Please check if the backend server is running.')
      }
    } finally {
      setLoadingDataset(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700 mb-2">Public Data APIs:</p>
      {exampleDatasets.length === 0 && (
        <p className="text-xs text-gray-500">No public API reports are currently available.</p>
      )}
      {exampleDatasets.map((dataset) => {
        const isLoading = loadingDataset === dataset.name
        return (
          <button
            key={dataset.name}
            onClick={() => loadExample(dataset.endpoint, dataset.name)}
            disabled={isLoading || loadingDataset !== null}
            className={`w-full text-left px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg transition-all duration-200 group ${
              isLoading || loadingDataset !== null
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:from-blue-100 hover:to-purple-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 group-hover:text-blue-700">
                  {dataset.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">{dataset.description}</p>
              </div>
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default ExampleDatasetButton

