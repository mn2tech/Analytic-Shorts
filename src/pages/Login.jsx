import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user } = useAuth()
  const navigate = useNavigate()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/feed')
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password)
      
      // Check if sign in was successful
      if (result && result.user) {
        // Check if email is confirmed (if email confirmation is required)
        if (result.user.email_confirmed_at === null) {
          setError('Please confirm your email address before signing in. Check your inbox for the confirmation link.')
          setLoading(false)
          return
        }
        
        // Verify session was created
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Session is set, auth state should update automatically via onAuthStateChange
          navigate('/feed')
        } else {
          setError('Session not created. Please try again.')
        }
      } else if (result && result.session) {
        navigate('/feed')
      } else {
        setError('Sign in failed. Please check your credentials and try again.')
      }
    } catch (err) {
      console.error('Login error:', err)
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to sign in. Please check your credentials.'
      
      if (err.message) {
        // Show the actual error message from Supabase for debugging
        console.log('Raw error message:', err.message)
        console.log('Error object:', err)
        
        errorMessage = err.message
        
        // Make common errors more user-friendly
        if (err.message.includes('Invalid login credentials') || 
            err.message.includes('invalid_credentials') ||
            err.message.includes('Invalid email or password')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.\n\n' +
            'If you just signed up, make sure you:\n' +
            '1. Confirmed your email address (check your inbox)\n' +
            '2. Are using the correct email and password\n' +
            '3. Wait a moment if you just confirmed your email'
        } else if (err.message.includes('Email not confirmed') || 
                   err.message.includes('email_not_confirmed') ||
                   err.message.includes('signup_disabled')) {
          errorMessage = 'Please confirm your email address before signing in. Check your inbox for the confirmation link.'
        } else if (err.message.includes('Email rate limit') || err.message.includes('too_many_requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes and try again.'
        } else if (err.message.includes('network') || err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('User not found')) {
          errorMessage = 'No account found with this email. Please sign up first.'
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div>
            <h2 className="text-3xl font-bold text-center text-gray-900">Sign In</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Welcome back! Please sign in to your account.
            </p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="font-semibold mb-2">Login Error:</div>
              <div className="whitespace-pre-line text-sm">{error}</div>
              <div className="mt-3 text-xs text-red-600">
                <strong>Debug Steps:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-1">
                  <li>Check browser console (F12) for detailed error logs</li>
                  <li>Verify account exists in Supabase Dashboard → Authentication → Users</li>
                  <li>Check if email is confirmed (green checkmark in Supabase)</li>
                  <li>Try resetting password if credentials might be wrong</li>
                </ol>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
                autoComplete="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

