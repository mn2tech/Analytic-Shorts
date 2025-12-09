import { Link } from 'react-router-dom'
import { PLANS } from '../config/pricing'

function UpgradePrompt({ 
  error, 
  message, 
  currentPlan, 
  limit, 
  fileSize, 
  limitType,
  onClose 
}) {
  // Admin and demo users shouldn't see upgrade prompts
  if (currentPlan === 'admin' || currentPlan === 'demo') {
    return null
  }

  // Determine which plan to suggest for upgrade
  const getUpgradePlan = () => {
    if (currentPlan === 'free') {
      return PLANS.pro
    } else if (currentPlan === 'pro') {
      return PLANS.enterprise
    }
    return null
  }

  const upgradePlan = getUpgradePlan()
  
  if (!upgradePlan) {
    // Already on highest plan or no upgrade available
    return null
  }

  // Get limit type description
  const getLimitDescription = () => {
    switch (limitType) {
      case 'fileSizeMB':
        return 'file size'
      case 'uploadsPerMonth':
        return 'monthly uploads'
      case 'dashboards':
        return 'dashboards'
      case 'aiInsights':
        return 'AI insights'
      default:
        return 'limit'
    }
  }

  // Format file size for display
  const formatFileSize = (mb) => {
    if (mb >= 1000) {
      return `${(mb / 1000).toFixed(2)}GB`
    }
    return `${mb.toFixed(2)}MB`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Plan Limit Reached
        </h3>

        {/* Error message */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm font-medium mb-1">{error}</p>
          {message && (
            <p className="text-red-700 text-sm">{message}</p>
          )}
        </div>

        {/* Current limit info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Current Plan:</span>
            <span className="text-sm font-semibold text-gray-900 capitalize">{currentPlan}</span>
          </div>
          {limitType === 'fileSizeMB' && fileSize && (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">File Size:</span>
                <span className="text-sm font-semibold text-gray-900">{formatFileSize(fileSize)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Plan Limit:</span>
                <span className="text-sm font-semibold text-gray-900">{formatFileSize(limit)}</span>
              </div>
            </>
          )}
          {limitType !== 'fileSizeMB' && limit && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Plan Limit:</span>
              <span className="text-sm font-semibold text-gray-900">{limit === -1 ? 'Unlimited' : limit}</span>
            </div>
          )}
        </div>

        {/* Upgrade plan info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-blue-900 mb-2">
            Upgrade to {upgradePlan.name} Plan
          </p>
          <ul className="text-sm text-blue-800 space-y-1">
            {limitType === 'fileSizeMB' && (
              <li className="flex items-start">
                <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Upload files up to {formatFileSize(upgradePlan.limits.fileSizeMB)}
              </li>
            )}
            {limitType === 'uploadsPerMonth' && (
              <li className="flex items-start">
                <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {upgradePlan.limits.uploadsPerMonth === -1 ? 'Unlimited' : upgradePlan.limits.uploadsPerMonth} uploads/month
              </li>
            )}
            {limitType === 'dashboards' && (
              <li className="flex items-start">
                <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {upgradePlan.limits.dashboards === -1 ? 'Unlimited' : upgradePlan.limits.dashboards} dashboards
              </li>
            )}
            {limitType === 'aiInsights' && (
              <li className="flex items-start">
                <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {upgradePlan.limits.aiInsights === -1 ? 'Unlimited' : upgradePlan.limits.aiInsights} AI insights/month
              </li>
            )}
            <li className="flex items-start">
              <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              All {upgradePlan.name} plan features
            </li>
          </ul>
          <p className="text-sm font-semibold text-blue-900 mt-3">
            Only ${upgradePlan.price}/month
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Link
            to="/pricing"
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-center"
          >
            Upgrade to {upgradePlan.name}
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UpgradePrompt
