import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { ensureContractorProfileAfterOAuth } from '../lib/contractorProfile'
import NM2TechLogo from '../components/NM2TechLogo'
import { PORTAL_BASE } from '../constants'

function readPostLoginNext() {
  const params = new URLSearchParams(window.location.search)
  const next = params.get('next')
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    try {
      return decodeURIComponent(next)
    } catch {
      return next
    }
  }
  try {
    const s = sessionStorage.getItem('contractor_portal_oauth_next')
    if (s && s.startsWith('/') && !s.startsWith('//')) {
      sessionStorage.removeItem('contractor_portal_oauth_next')
      return s
    }
  } catch (_) {
    // ignore
  }
  return `${PORTAL_BASE}/`
}

/**
 * createBrowserClient (@supabase/ssr) forces detectSessionInUrl: true, so the client may
 * already exchange the OAuth code when getSession() runs. Calling exchangeCodeForSession
 * again causes "PKCE code verifier not found".
 */
async function resolveSessionFromUrl(supabase, hasCode) {
  if (!hasCode) {
    const { data, error } = await supabase.auth.getSession()
    return { session: data.session, error }
  }

  for (let i = 0; i < 25; i++) {
    const { data, error } = await supabase.auth.getSession()
    if (error) return { session: null, error }
    if (data.session?.user) return { session: data.session, error: null }
    await new Promise((r) => setTimeout(r, 120))
  }

  const { error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href)
  if (exErr) return { session: null, error: exErr }
  const { data, error } = await supabase.auth.getSession()
  return { session: data.session, error }
}

export default function PortalAuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true

    const run = async () => {
      const code = searchParams.get('code')
      try {
        const supabase = getSupabase()
        if (!supabase) throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')

        const { session, error: sessionErr } = await resolveSessionFromUrl(supabase, Boolean(code))
        if (sessionErr) throw sessionErr
        const user = session?.user
        if (!user) throw new Error('No Supabase session found')

        const gate = await ensureContractorProfileAfterOAuth(supabase, user)
        if (!alive) return

        if (!gate.ok) {
          if (gate.reason === 'unauthorized') {
            await supabase.auth.signOut()
            navigate(`${PORTAL_BASE}/unauthorized`, { replace: true })
            return
          }
          throw new Error(gate.message || 'Could not verify contractor access')
        }

        const next = readPostLoginNext()
        navigate(next, { replace: true })
      } catch (err) {
        console.error('OAuth callback error:', err)
        if (!alive) return
        setError(err instanceof Error ? err.message : 'Google sign-in failed')
      }
    }

    run()
    return () => {
      alive = false
    }
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <NM2TechLogo size="lg" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900">Finishing sign-in…</h1>
        {!error ? (
          <p className="mt-2 text-sm text-gray-600">Completing Google login and checking contractor access.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate(`${PORTAL_BASE}/login`, { replace: true })}
              className="mt-4 bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

