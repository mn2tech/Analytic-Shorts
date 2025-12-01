import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import FileUploader from '../components/FileUploader'
import ExampleDatasetButton from '../components/ExampleDatasetButton'
import { useAuth } from '../contexts/AuthContext'

function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [error, setError] = useState(null)

  const handleUploadSuccess = (data) => {
    // Store data in sessionStorage for dashboard
    sessionStorage.setItem('analyticsData', JSON.stringify(data))
    navigate('/dashboard')
  }

  const handleDatasetLoad = (data) => {
    sessionStorage.setItem('analyticsData', JSON.stringify(data))
    navigate('/dashboard')
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
    setTimeout(() => setError(null), 5000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            NM2TECH Analytics Shorts
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Upload your CSV or Excel files and get instant insights
          </p>
          <p className="text-sm text-gray-500">
            Generate beautiful charts, statistics, and AI-powered insights in seconds
          </p>
          {user && (
            <div className="mt-6">
              <Link
                to="/dashboards"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View My Dashboards
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 animate-slide-up">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8 animate-slide-up">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Upload Your Data
            </h2>
            <FileUploader onUploadSuccess={handleUploadSuccess} onError={handleError} />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 animate-slide-up">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Or Try Example Data
            </h2>
            <ExampleDatasetButton onDatasetLoad={handleDatasetLoad} onError={handleError} />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Instant Charts</h3>
            <p className="text-sm text-gray-600">Auto-generate bar, line, and pie charts</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Smart Filters</h3>
            <p className="text-sm text-gray-600">Filter by date, category, or numeric range</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Insights</h3>
            <p className="text-sm text-gray-600">Get intelligent analysis of your data</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

