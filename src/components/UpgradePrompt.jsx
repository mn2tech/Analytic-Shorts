import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function UpgradePrompt({ 
  title = 'Upgrade Required', 
  message, 
  limitType, 
  currentUsage, 
  limit,
  plan 
}) {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-700 mb-4">{message}</p>
            <div className="flex items-center gap-3">
              <Link
                to="/signup"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Sign Up Free
              </Link>
              <Link
                to="/pricing"
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                View Plans
              </Link>
            </div>
          </div>
          <div className="ml-4">
            <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-700 mb-2">{message}</p>
          {limitType && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Usage:</span>
                <span className="font-semibold text-gray-900">
                  {currentUsage} / {limit === -1 ? '∞' : limit}
                </span>
              </div>
              {limit !== -1 && (
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (currentUsage / limit) * 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/pricing"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Upgrade Now
            </Link>
            <span className="text-sm text-gray-600">
              Current plan: <span className="font-semibold capitalize">{plan || 'Free'}</span>
            </span>
          </div>
        </div>
        <div className="ml-4">
          <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default UpgradePrompt


