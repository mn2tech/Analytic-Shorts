import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function Navbar() {
  const { user, userProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getUserDisplayName = () => {
    // First try to get name from shorts_user_profiles table
    if (userProfile?.name) {
      return userProfile.name
    }
    // Fallback to user_metadata (for backwards compatibility)
    if (user?.user_metadata?.name) {
      return user.user_metadata.name
    }
    // Fallback to email prefix
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'User'
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-gray-900">NM2TECH Analytics</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              to="/pricing"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Pricing
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboards"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  My Dashboards
                </Link>
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Create New
                </Link>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {getUserDisplayName()}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

