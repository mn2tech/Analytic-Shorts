import { Link } from 'react-router-dom'
import NM2TechLogo from '../components/NM2TechLogo'
import { PORTAL_BASE } from '../constants'

export default function PortalUnauthorized() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <NM2TechLogo size="lg" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Access not allowed</h1>
        <p className="mt-3 text-sm text-gray-600">
          This portal is only for accounts with <strong>contractor</strong> access on your NM2TECH profile (
          <code className="text-xs bg-gray-100 px-1 rounded">shorts_user_profiles.portal_access</code> or legacy{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">role = contractor</code>).
        </p>
        <p className="mt-2 text-sm text-gray-600">Ask an administrator to grant access, or use the correct Google account.</p>
        <Link
          to={`${PORTAL_BASE}/login`}
          className="mt-6 inline-block bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
        >
          Back to login
        </Link>
      </div>
    </div>
  )
}

