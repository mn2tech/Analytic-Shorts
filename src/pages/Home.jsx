import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import FileUploader from '../components/FileUploader'
import ExampleDatasetButton from '../components/ExampleDatasetButton'
import OnboardingTour from '../components/OnboardingTour'
import UpgradePrompt from '../components/UpgradePrompt'
import { useAuth } from '../contexts/AuthContext'

function Home() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromFeed = searchParams.get('from') === 'feed'
  const { user } = useAuth()
  const [error, setError] = useState(null)
  const [showTour, setShowTour] = useState(false)
  const [upgradePrompt, setUpgradePrompt] = useState(null)

  // Check if user has seen the tour
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenHomeTour')
    if (!hasSeenTour && !user) {
      // Show tour after a short delay for new users
      const timer = setTimeout(() => {
        setShowTour(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [user])

  const handleTourComplete = () => {
    localStorage.setItem('hasSeenHomeTour', 'true')
    setShowTour(false)
  }

  const homeTourSteps = [
    {
      target: 'body',
      content: 'Welcome to NM2TECH Analytics Shorts! Let me show you around.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.file-upload-section',
      content: 'Start by uploading your CSV or Excel file here. Just drag and drop or click to browse.',
      placement: 'top',
    },
    {
      target: '.example-data-section',
      content: 'Or explore public data APIs to see how it works - no file needed!',
      placement: 'top',
    },
    {
      target: 'body',
      content: "That's it! Once you upload data or select an example, you'll see instant dashboards with charts and AI insights.",
      placement: 'center',
    },
  ]

  const handleUploadSuccess = (data) => {
    try {
      // Estimate data size before stringifying (rough estimate)
      const estimatedSize = JSON.stringify(data).length
      const sizeInMB = estimatedSize / (1024 * 1024)
      
      // Check if data is too large for sessionStorage (usually 5-10MB limit)
      // Use 3MB as safe threshold to avoid quota issues
      if (sizeInMB > 3) {
        // Data too large - pass via navigation state instead
        console.warn(`Data size (${sizeInMB.toFixed(2)}MB) too large for sessionStorage, using navigation state`)
        navigate('/dashboard', { state: { analyticsData: data } })
        return
      }
      
      // Try to store in sessionStorage for smaller files
      const dataString = JSON.stringify(data)
      sessionStorage.setItem('analyticsData', dataString)
      navigate('/dashboard')
    } catch (error) {
      // If storage fails (quota exceeded), pass data via navigation state
      console.warn('Storage quota exceeded, passing data via navigation state:', error)
      navigate('/dashboard', { state: { analyticsData: data } })
    }
  }

  const handleDatasetLoad = (data) => {
    try {
      console.log('Dataset loaded:', {
        hasData: !!data,
        hasDataArray: !!(data && data.data),
        dataLength: data?.data?.length,
        columns: data?.columns,
        numericColumns: data?.numericColumns,
        dateColumns: data?.dateColumns,
        categoricalColumns: data?.categoricalColumns
      })
      
      // Validate data structure
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.error('Invalid dataset format:', data)
        alert('Error: Invalid dataset format. Please try again.')
        return
      }
      
      // Estimate data size before stringifying
      const estimatedSize = JSON.stringify(data).length
      const sizeInMB = estimatedSize / (1024 * 1024)
      
      console.log(`Dataset size: ${sizeInMB.toFixed(2)}MB`)
      
      // Check if data is too large for sessionStorage
      // Use 3MB as safe threshold
      if (sizeInMB > 3) {
        console.warn(`Data size (${sizeInMB.toFixed(2)}MB) too large for sessionStorage, using navigation state`)
        navigate('/dashboard', { state: { analyticsData: data } })
        return
      }
      
      // Try to store in sessionStorage for smaller files
      const dataString = JSON.stringify(data)
      sessionStorage.setItem('analyticsData', dataString)
      console.log('Data stored in sessionStorage, navigating to dashboard')
      navigate('/dashboard')
    } catch (error) {
      // If storage fails, pass data via navigation state
      console.error('Error handling dataset load:', error)
      console.warn('Storage quota exceeded, passing data via navigation state:', error)
      navigate('/dashboard', { state: { analyticsData: data } })
    }
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
    setTimeout(() => setError(null), 5000)
  }

  const handleUpgradeRequired = (upgradeData) => {
    setUpgradePrompt(upgradeData)
  }

  const handleCloseUpgradePrompt = () => {
    setUpgradePrompt(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 watermark-bg relative">
      {/* Analytics Watermark Pattern */}
      <div className="analytics-watermark"></div>
      <div className="analytics-watermark-icons"></div>
      <OnboardingTour
        run={showTour}
        onComplete={handleTourComplete}
        steps={homeTourSteps}
      />
      
      {/* From-feed hint */}
      {fromFeed && user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Creating a post:</span> Upload your data below, then build your dashboard and share it to the Feed.
            </p>
            <Link to="/feed" className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap">
              Back to Feed
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-16 animate-fade-in overflow-visible">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-normal overflow-visible">
            Turn Your Data Into
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 pt-2 pb-3 min-h-[1.2em]">
              Instant Insights
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto">
            Upload your CSV or Excel files and get beautiful dashboards, AI-powered insights, and forecasts in seconds
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            No coding required. No learning curve. Just drag, drop, and analyze.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            {!user ? (
              <>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  Get Started Free
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors font-semibold text-lg"
                >
                  View Pricing
                </Link>
                <Link
                  to="/studio"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Studio
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboards"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  View My Dashboards
                </Link>
                <Link
                  to="/studio"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Studio
                </Link>
              </>
            )}
          </div>
          
          <p className="text-sm text-gray-500">
            No credit card required • Free plan available • Explore public data APIs instantly
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Instant Charts</h3>
            <p className="text-gray-600">
              Auto-generate beautiful bar, line, pie, and forecast charts from your data in seconds
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3 leading-normal">AI-Powered Insights</h3>
            <p className="text-gray-600">
              Get intelligent analysis explaining trends, patterns, and actionable recommendations
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Filters</h3>
            <p className="text-gray-600">
              Filter by date range, category, or numeric values with real-time chart updates
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 text-center hover:shadow-xl transition-shadow cursor-pointer border-2 border-indigo-200 hover:border-indigo-400" onClick={() => navigate('/studio')}>
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Studio</h3>
            <p className="text-gray-600 mb-4">
              Build custom dashboards with drag-and-drop widgets, filters, and queries
            </p>
            <Link
              to="/studio"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              Open Studio
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl shadow-xl p-12 mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Data</h3>
              <p className="text-gray-600">
                Drag and drop your CSV or Excel file, or explore public data APIs
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Instant Dashboards</h3>
              <p className="text-gray-600">
                We automatically detect your data types and generate beautiful visualizations
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Discover Insights</h3>
              <p className="text-gray-600">
                Use AI insights and forecasts to make data-driven decisions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 animate-slide-up text-sm sm:text-base whitespace-pre-line break-words">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div id="upload" className="bg-white rounded-xl shadow-lg p-8 animate-slide-up file-upload-section scroll-mt-4">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Upload Your Data
            </h2>
            <FileUploader 
              onUploadSuccess={handleUploadSuccess} 
              onError={handleError}
              onUpgradeRequired={handleUpgradeRequired}
            />
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8 animate-slide-up example-data-section">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Or Explore Public Data APIs
            </h2>
            <ExampleDatasetButton onDatasetLoad={handleDatasetLoad} onError={handleError} />
          </div>
        </div>
      </div>

      {/* Upgrade Prompt Modal */}
      {upgradePrompt && (
        <UpgradePrompt
          error={upgradePrompt.error}
          message={upgradePrompt.message}
          currentPlan={upgradePrompt.currentPlan}
          limit={upgradePrompt.limit}
          fileSize={upgradePrompt.fileSize}
          limitType={upgradePrompt.limitType}
          onClose={handleCloseUpgradePrompt}
        />
      )}
    </div>
  )
}

export default Home

