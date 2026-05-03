import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import FileUploader from '../components/FileUploader'
import ExampleDatasetButton from '../components/ExampleDatasetButton'
import UpgradePrompt from '../components/UpgradePrompt'
import { TD } from '../constants/terminalDashboardPalette'

/**
 * Product entry for Analytics Shorts: upload, Google Sheets import (inside FileUploader),
 * or sample APIs — then continue to the in-product dashboard.
 */
function AnalyticsShortsLanding() {
  const navigate = useNavigate()
  const [error, setError] = useState(null)
  const [upgradePrompt, setUpgradePrompt] = useState(null)

  const handleUploadSuccess = (data) => {
    try {
      const estimatedSize = JSON.stringify(data).length
      const sizeInMB = estimatedSize / (1024 * 1024)
      if (sizeInMB > 3) {
        navigate('/analytics/dashboard', { state: { analyticsData: data } })
        return
      }
      sessionStorage.setItem('analyticsData', JSON.stringify(data))
      navigate('/analytics/dashboard')
    } catch {
      navigate('/analytics/dashboard', { state: { analyticsData: data } })
    }
  }

  const handleDatasetLoad = (data) => {
    if (!data || !data.data || !Array.isArray(data.data)) {
      alert('Error: Invalid dataset format. Please try again.')
      return
    }
    try {
      const estimatedSize = JSON.stringify(data).length
      const sizeInMB = estimatedSize / (1024 * 1024)
      if (sizeInMB > 3) {
        navigate('/analytics/dashboard', { state: { analyticsData: data } })
        return
      }
      sessionStorage.setItem('analyticsData', JSON.stringify(data))
      navigate('/analytics/dashboard')
    } catch {
      navigate('/analytics/dashboard', { state: { analyticsData: data } })
    }
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
    setTimeout(() => setError(null), 8000)
  }

  const handleUpgradeRequired = (upgradeData) => {
    setUpgradePrompt(upgradeData)
  }

  const handleCloseUpgradePrompt = () => {
    setUpgradePrompt(null)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: TD.TEXT_1 }}>
          Analytics Shorts
        </h1>
        <p className="text-base sm:text-lg max-w-2xl mx-auto mb-6" style={{ color: TD.TEXT_2 }}>
          Upload a file or connect Google Sheets to open your dashboard. CSV, Excel, SAS, and public sample
          datasets are supported.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            to="/analytics/dashboard"
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: TD.ACCENT_MID }}
          >
            Open dashboard
          </Link>
          <span style={{ color: TD.TEXT_3 }} aria-hidden>
            ·
          </span>
          <Link
            to="/analytics/dashboards"
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: TD.ACCENT_MID }}
          >
            My Dashboards
          </Link>
          <span style={{ color: TD.TEXT_3 }} aria-hidden>
            ·
          </span>
          <Link
            to="/analytics/feed"
            className="text-sm font-medium underline-offset-2 hover:underline"
            style={{ color: TD.ACCENT_MID }}
          >
            Feed
          </Link>
        </div>
      </div>

      {error && (
        <div
          className="mb-6 rounded-lg border p-4 text-sm sm:text-base whitespace-pre-line break-words"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            borderColor: 'rgba(239, 68, 68, 0.35)',
            color: '#fecaca',
          }}
        >
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div
          id="upload"
          className="rounded-xl border p-6 sm:p-8 file-upload-section analytics-short-upload-target scroll-mt-4"
          style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
        >
          <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: TD.TEXT_1 }}>
            Upload or import
          </h2>
          <FileUploader
            darkMode
            onUploadSuccess={handleUploadSuccess}
            onError={handleError}
            onUpgradeRequired={handleUpgradeRequired}
          />
        </div>

        <div
          className="rounded-xl border p-6 sm:p-8 example-data-section"
          style={{ background: TD.CARD_BG, borderColor: TD.CARD_BORDER }}
        >
          <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: TD.TEXT_1 }}>
            Or try public sample data
          </h2>
          <ExampleDatasetButton darkMode onDatasetLoad={handleDatasetLoad} onError={handleError} />
        </div>
      </div>

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

export default AnalyticsShortsLanding
