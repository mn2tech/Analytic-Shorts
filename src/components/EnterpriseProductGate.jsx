import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSubscription } from '../services/subscriptionService'
import { hasEnterpriseProductAccess } from '../utils/enterpriseProductAccess'
import Loader from './Loader'

/**
 * Redirects to /contact with subject when user lacks enterprise access.
 * Expects to be nested inside ProtectedRoute (user is signed in).
 */
function EnterpriseProductGate({ children, contactSubject = 'Enterprise Product Access' }) {
  const { user, userProfile, loading } = useAuth()
  const [plan, setPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setPlanLoading(false)
      return
    }
    getSubscription()
      .then((sub) => {
        if (!cancelled) setPlan(sub?.plan || 'free')
      })
      .catch(() => {
        if (!cancelled) setPlan('free')
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading || planLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Loader />
      </div>
    )
  }

  if (hasEnterpriseProductAccess(userProfile, plan)) {
    return children
  }

  return (
    <Navigate
      to={`/contact?subject=${encodeURIComponent(contactSubject)}`}
      replace
    />
  )
}

export default EnterpriseProductGate
