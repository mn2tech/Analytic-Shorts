import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getUserProfile } from '../services/profileService'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  // Prevent repeated signOut loops if multiple requests detect the same broken session
  const [didRecoverInvalidRefresh, setDidRecoverInvalidRefresh] = useState(false)

  const maybeRecoverInvalidRefreshToken = async (err) => {
    if (didRecoverInvalidRefresh) return false
    const msg = (err?.message || err?.error_description || '').toString()
    if (!msg) return false
    if (!/invalid refresh token/i.test(msg)) return false
    // Clear local session to stop repeated refresh attempts / 400s.
    setDidRecoverInvalidRefresh(true)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch (_) {
      // ignore
    }
    return true
  }

  const loadUserProfile = useCallback(async (userId) => {
    if (!userId) {
      setUserProfile(null)
      return null
    }
    try {
      const profile = await getUserProfile(userId)
      setUserProfile(profile)
      return profile
    } catch (error) {
      console.error('Error loading user profile:', error)
      setUserProfile(null)
      return null
    }
  }, [])

  // Load user profile when user changes
  useEffect(() => {
    if (user?.id) {
      loadUserProfile(user.id)
    } else {
      setUserProfile(null)
    }
  }, [user, loadUserProfile])

  useEffect(() => {
    // Check current session with error handling
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.error('Error getting session:', error)
          // If refresh token is invalid/missing, clear local auth state so the app can recover.
          maybeRecoverInvalidRefreshToken(error).then((didRecover) => {
            if (didRecover) navigate('/login')
          })
          setUser(null)
        } else {
          setUser(session?.user ?? null)
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Error in getSession:', error)
        maybeRecoverInvalidRefreshToken(error).then((didRecover) => {
          if (didRecover) navigate('/login')
        })
        setUser(null)
        setLoading(false)
      })

    // Listen for auth changes with error handling
    let subscription
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })
      subscription = sub
    } catch (error) {
      console.error('Error setting up auth listener:', error)
      setLoading(false)
    }

    // Timeout fallback - if loading takes too long, stop loading
    // Increased to 10 seconds to allow for slower Supabase connections
    const timeout = setTimeout(() => {
      if (loading) {
        // Only log warning in development, not production
        if (import.meta.env.DEV) {
          console.warn('Auth check timeout - assuming not logged in')
        }
        setLoading(false)
      }
    }, 10000) // 10 second timeout (increased from 5s)

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
      clearTimeout(timeout)
    }
  }, [])

  const signUp = async (email, password, name = '') => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0], // Use name or email prefix
          },
        },
      })
      
      if (error) {
        console.error('Signup error:', error)
        throw error
      }
      
      // Log the response for debugging
      console.log('Signup response:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userEmail: data?.user?.email,
        emailConfirmed: data?.user?.email_confirmed_at
      })
      
      // Return the full data object which contains { user, session }
      // Note: When email confirmation is required, user and session may be null
      // but the signup is still successful
      return data || { user: null, session: null }
    } catch (error) {
      console.error('Signup failed:', error)
      throw error
    }
  }

  const signIn = async (email, password) => {
    try {
      // Trim email to remove any whitespace
      const trimmedEmail = email.trim()
      
      console.log('Attempting sign in for:', trimmedEmail)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      
      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error
        })
        throw error
      }
      
      // Log successful sign in for debugging
      console.log('Sign in successful:', {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        userEmail: data?.user?.email,
        emailConfirmed: data?.user?.email_confirmed_at,
        userId: data?.user?.id
      })
      
      return data
    } catch (error) {
      console.error('Sign in failed:', error)
      throw error
    }
  }

  const signOut = async () => {
    setUser(null)
    setUserProfile(null)
    setDidRecoverInvalidRefresh(false)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (e) {
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch (_) {
        // ignore
      }
    }
    navigate('/login')
  }

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
    return data
  }

  const refreshUserProfile = useCallback(() => {
    if (user?.id) return loadUserProfile(user.id)
    return Promise.resolve(null)
  }, [user?.id, loadUserProfile])

  const value = {
    user,
    userProfile,
    refreshUserProfile,
    signUp,
    signIn,
    signOut,
    resetPassword,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

