import { createBrowserClient } from '@supabase/ssr'

/**
 * Cookie-backed auth (via @supabase/ssr) so PKCE verifier survives the Google redirect
 * more reliably than default localStorage—especially with strict storage partitioning.
 * Uses a dedicated cookie name so it does not clash with other apps on the same Supabase project.
 */
export function getSupabase() {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
  const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: {
      name: 'sb-contractor-portal',
      path: '/',
      sameSite: 'lax',
      secure: import.meta.env.PROD,
    },
  })
}

export function isSupabaseConfigured() {
  return Boolean(
    (import.meta.env.VITE_SUPABASE_URL || '').trim() && (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
  )
}
