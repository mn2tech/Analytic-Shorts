/**
 * Contractor portal access:
 * - Prefer shorts_user_profiles.portal_access === 'contractor' (see database/migration_contractor_portal_access.sql).
 * - Legacy: profile.role === 'contractor' (job-title column; only if you intentionally use it for access).
 */

export function isContractorPortalAllowed(profile) {
  if (!profile) return false
  const access = (profile.portal_access || '').trim().toLowerCase()
  if (access === 'contractor') return true
  const legacyRole = (profile.role || '').trim().toLowerCase()
  return legacyRole === 'contractor'
}

export function displayNameFromUser(user) {
  const meta = user?.user_metadata || {}
  return (
    meta.full_name ||
    meta.name ||
    meta.display_name ||
    (user?.email ? user.email.split('@')[0] : 'Contractor')
  )
}

/**
 * After Supabase OAuth session exists: ensure profile row and contractor access.
 * @returns {{ ok: true } | { ok: false, reason: 'unauthorized' | 'error', message?: string }}
 */
export async function ensureContractorProfileAfterOAuth(supabase, user) {
  const name = displayNameFromUser(user)
  const autoGrant =
    String(import.meta.env.VITE_PORTAL_AUTO_GRANT_CONTRACTOR || '').toLowerCase() === 'true'

  const { data: profile, error: readErr } = await supabase
    .from('shorts_user_profiles')
    .select('user_id, role, portal_access')
    .eq('user_id', user.id)
    .maybeSingle()

  if (readErr) {
    return { ok: false, reason: 'error', message: readErr.message }
  }

  if (!profile) {
    const { error: insErr } = await supabase.from('shorts_user_profiles').insert({
      id: user.id,
      user_id: user.id,
      name,
      portal_access: 'contractor',
    })
    if (insErr) {
      if (insErr.code === '23505') {
        const retry = await supabase
          .from('shorts_user_profiles')
          .select('user_id, role, portal_access')
          .eq('user_id', user.id)
          .maybeSingle()
        if (retry.data && isContractorPortalAllowed(retry.data)) return { ok: true }
        if (retry.data && autoGrant && (retry.data.portal_access || '').toLowerCase() === 'none') {
          const { error: up } = await supabase
            .from('shorts_user_profiles')
            .update({ portal_access: 'contractor' })
            .eq('user_id', user.id)
          if (!up && isContractorPortalAllowed({ ...retry.data, portal_access: 'contractor' }))
            return { ok: true }
        }
      }
      return { ok: false, reason: 'error', message: insErr.message }
    }
    return { ok: true }
  }

  if (isContractorPortalAllowed(profile)) {
    return { ok: true }
  }

  if (autoGrant && (profile.portal_access || '').toLowerCase() === 'none') {
    const { error: upErr } = await supabase
      .from('shorts_user_profiles')
      .update({ portal_access: 'contractor' })
      .eq('user_id', user.id)
    if (!upErr) return { ok: true }
    return { ok: false, reason: 'error', message: upErr.message }
  }

  return { ok: false, reason: 'unauthorized' }
}

export async function fetchProfileForGate(supabase, userId) {
  const { data, error } = await supabase
    .from('shorts_user_profiles')
    .select('user_id, role, portal_access')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}
