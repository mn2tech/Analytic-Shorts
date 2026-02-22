import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'

function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  // Check if Supabase is configured
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      setError('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const result = await signUp(email, password, name)
      
      // Supabase signup is successful if no error was thrown
      // When email confirmation is required, result.user might be null
      // but the account is still created successfully
      if (result) {
        setSuccess(true)
        // If user exists and is confirmed, take them to the feed
        if (result.user && result.user.email_confirmed_at) {
          navigate('/feed')
        } else {
          // Email confirmation required or user not immediately available
          // Show success message and redirect to login
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        }
      } else {
        // This shouldn't happen, but handle it gracefully
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      }
    } catch (err) {
      console.error('Signup error:', err)
      // Provide more helpful error messages
      let errorMessage = 'Failed to create account. Please try again.'
      
      if (err.message) {
        errorMessage = err.message
        // Make common errors more user-friendly
        if (err.message.includes('already registered') || 
            err.message.includes('already exists') ||
            err.message.includes('User already registered') ||
            err.message.includes('email_address_already_exists')) {
          errorMessage = 'This email is already registered. Please sign in instead.\n\n' +
            'If you just deleted this user from Supabase:\n' +
            '1. Wait 30-60 seconds for deletion to process\n' +
            '2. Clear browser cache (see instructions below)\n' +
            '3. Try signing up again\n' +
            '4. Or try signing in if the account still exists'
        } else if (err.message.includes('password')) {
          errorMessage = 'Password must be at least 6 characters long.'
        } else if (err.message.includes('email')) {
          errorMessage = 'Please enter a valid email address.'
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (err.message.includes('Database error') || err.message.includes('database')) {
          errorMessage = 'Database error saving new user.\n\n' +
            'The account may have been created, but there was an issue creating your profile.\n' +
            'Please try:\n' +
            '1. Check if you can sign in with your email and password\n' +
            '2. If sign in works, your account is created and you can continue\n' +
            '3. If sign in fails, the database schema may need to be run in Supabase\n\n' +
            'Check browser console (F12) for detailed error information.'
        }
      }
      
      setError(errorMessage)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
          <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h2>
            <p className="text-gray-600 mb-4">
              Please check your email to confirm your account, then sign in.
            </p>
            <Link
              to="/login"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-12">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div>
            <h2 className="text-3xl font-bold text-center text-gray-900">Create Account</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign up to start analyzing your data
            </p>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="whitespace-pre-line text-sm">{error}</div>
              {error.includes('already registered') && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // Clear Supabase session
                        await supabase.auth.signOut()
                        // Clear browser storage
                        localStorage.clear()
                        sessionStorage.clear()
                        alert('Cache cleared! Please try signing up again.')
                        window.location.reload()
                      } catch (err) {
                        console.error('Error clearing cache:', err)
                        alert('Error clearing cache. Please manually clear browser cache.')
                      }
                    }}
                    className="text-xs text-red-700 underline hover:text-red-900"
                  >
                    Click here to clear browser cache and try again
                  </button>
                </div>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Name (Optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
                minLength={6}
              />
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
                  Creating account...
                </span>
              ) : (
                'Sign Up'
              )}
            </button>
          </form>
          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup

