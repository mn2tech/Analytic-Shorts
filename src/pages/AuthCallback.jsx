import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    let isMounted = true

    const next = searchParams.get('next')
    const safeNext =
      next && next.startsWith('/') && !next.startsWith('//')
        ? decodeURIComponent(next)
        : '/hub'

    const completeOAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (data?.session && isMounted) {
        navigate(safeNext, { replace: true })
      }
    }

    completeOAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'SIGNED_IN' || session) {
        navigate(safeNext, { replace: true })
      }
    })

    const timeoutId = setTimeout(() => {
      if (isMounted) {
        navigate('/login', { replace: true })
      }
    }, 8000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
          <h1 className="text-xl font-semibold text-gray-900">Finishing sign-in...</h1>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we complete your Google login.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthCallback
