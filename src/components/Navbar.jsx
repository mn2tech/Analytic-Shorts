import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePortraitMode } from '../contexts/PortraitModeContext'

function Navbar({ onOpenSidebar }) {
  const { user, userProfile, signOut } = useAuth()
  const { enabled: portraitEnabled, toggle: togglePortrait } = usePortraitMode()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!userMenuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [userMenuOpen])

  const handleSignOut = async () => {
    setUserMenuOpen(false)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const getUserDisplayName = () => {
    if (userProfile?.name) return userProfile.name
    if (user?.user_metadata?.name) return user.user_metadata.name
    if (user?.email) return user.email.split('@')[0]
    return 'User'
  }

  return (
    <nav className="bg-white border-b border-gray-200 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14 gap-2">
          {typeof onOpenSidebar === 'function' && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className={`${portraitEnabled ? '' : 'lg:hidden'} shrink-0 p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600`}
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <Link to="/" className="flex items-center space-x-2 shrink-0">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-semibold text-gray-900">NM2TECH Analytics</span>
          </Link>
          <div className="flex-1 min-w-0" />
          <div className="flex items-center space-x-4 shrink-0">
            <button
              type="button"
              onClick={togglePortrait}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                portraitEnabled
                  ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              title={portraitEnabled ? 'Exit 9:16 portrait mode' : 'Enter 9:16 portrait mode'}
              aria-pressed={portraitEnabled}
            >
              <span className="inline-block w-5 h-5 rounded border-2 border-current flex items-center justify-center text-[10px] font-bold" aria-hidden>
                9:16
              </span>
              <span>{portraitEnabled ? 'Exit 9:16' : '9:16 Mode'}</span>
            </button>
            {portraitEnabled && (
              <span className="hidden sm:inline-flex items-center text-[10px] font-semibold text-slate-600 bg-slate-100 rounded-full px-2 py-0.5" aria-label="Portrait mode on">
                Portrait
              </span>
            )}
            <Link
              to="/help"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Help
            </Link>
            <Link
              to="/pricing"
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Pricing
            </Link>
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className="flex items-center gap-1 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-transparent hover:border-gray-300"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="truncate max-w-[120px]">{getUserDisplayName()}</span>
                  <svg className="w-4 h-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <Link
                      to="/dashboards"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      My Dashboards
                    </Link>
                    <Link
                      to="/studio"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Studio
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
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
