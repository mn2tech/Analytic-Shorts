/**
 * Access to GovCon, Healthcare, AI Studio, and Command Centers is restricted
 * to enterprise customers (subscription, profile role, or preferences flag).
 */

export function hasEnterpriseProductAccess(userProfile, subscriptionPlan) {
  const plan = (subscriptionPlan || 'free').toLowerCase()
  if (plan === 'enterprise' || plan === 'admin' || plan === 'demo') return true

  const role = userProfile?.role
  if (role === 'enterprise') return true

  let prefs = userProfile?.preferences
  if (typeof prefs === 'string') {
    try {
      prefs = JSON.parse(prefs)
    } catch {
      prefs = null
    }
  }
  if (prefs && typeof prefs === 'object') {
    if (prefs.enterprise_products === true || prefs.enterprise === true) return true
  }

  return false
}
