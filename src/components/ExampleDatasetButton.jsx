import { useState } from 'react'
import apiClient from '../config/api'

function ExampleDatasetButton({ onDatasetLoad, onError }) {
  const [loadingDataset, setLoadingDataset] = useState(null)

  const exampleDatasets = [
    {
      name: 'Medical Data',
      description: 'Patient records with departments, diagnoses, and vitals',
      endpoint: '/api/example/medical',
    },
    {
      name: 'Sales Data',
      description: 'Monthly sales with products and regions',
      endpoint: '/api/example/sales',
    },
    {
      name: 'Attendance Data',
      description: 'Employee attendance records',
      endpoint: '/api/example/attendance',
    },
    {
      name: 'Donations Data',
      description: 'Charity donations by category',
      endpoint: '/api/example/donations',
    },
  ]

  const loadExample = async (endpoint, datasetName) => {
    setLoadingDataset(datasetName)
    try {
      const response = await apiClient.get(endpoint)
      if (response.data && response.data.data) {
        onDatasetLoad(response.data)
      } else {
        onError('Invalid data format received from server')
      }
    } catch (error) {
      console.error('Error loading dataset:', error)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        onError('Cannot connect to backend server. Please ensure the API is running and VITE_API_URL is configured in Amplify environment variables.')
      } else {
        onError(error.response?.data?.error || error.message || 'Failed to load example dataset. Please check if the backend server is running.')
      }
    } finally {
      setLoadingDataset(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700 mb-2">Try Example Datasets:</p>
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

