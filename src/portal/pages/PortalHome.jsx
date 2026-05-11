import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '../lib/supabaseClient'
import { fetchProfileForGate, isContractorPortalAllowed } from '../lib/contractorProfile'
import ContractorDashboard from '../components/dashboard/ContractorDashboard'
import { PORTAL_BASE } from '../constants'

export default function PortalHome() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabase()
    if (!supabase) {
      navigate(`${PORTAL_BASE}/login`, { replace: true })
      setLoading(false)
      return
    }

    const gate = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData.session?.user
        if (!user) {
          navigate(`${PORTAL_BASE}/login`, { replace: true })
          return
        }
        const profile = await fetchProfileForGate(supabase, user.id)
        if (cancelled) return
        if (!isContractorPortalAllowed(profile)) {
          await supabase.auth.signOut()
          navigate(`${PORTAL_BASE}/unauthorized`, { replace: true })
          return
        }
        setSession(sessionData.session)
      } catch (e) {
        console.error(e)
        if (!cancelled) navigate(`${PORTAL_BASE}/login`, { replace: true })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    gate()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        navigate(`${PORTAL_BASE}/login`, { replace: true })
        return
      }
      setSession(nextSession)
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [navigate])

  const handleSignOut = async () => {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
    navigate(`${PORTAL_BASE}/login`, { replace: true })
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-nm2-surface">
        <p className="text-slate-600">Loading…</p>
      </div>
    )
  }

  const supabase = getSupabase()
  if (!supabase) return null

  return <ContractorDashboard supabase={supabase} session={session} onSignOut={handleSignOut} />
}

