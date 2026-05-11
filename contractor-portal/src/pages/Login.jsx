import { useState } from 'react'
import NM2TechLogo from '../components/NM2TechLogo'
import GoogleOAuthButton from '../components/GoogleOAuthButton'
import { isSupabaseConfigured } from '../lib/supabaseClient'

export default function Login() {
  const [error, setError] = useState('')
  const envOk = isSupabaseConfigured()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4 safe-area-inset">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-6 sm:p-8">
        {!envOk && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded text-sm">
            Create <code className="text-xs bg-amber-100 px-1 rounded">contractor-portal/.env</code> from{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">.env.example</code> and set{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>, then restart{' '}
            <code className="text-xs bg-amber-100 px-1 rounded">npm run dev</code>.
          </div>
        )}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <NM2TechLogo size="lg" />
          </div>
          <h1 className="text-xl font-bold text-primary-700">NM2TECH</h1>
          <p className="text-gray-600 mt-2">Contractor portal</p>
          <p className="text-sm text-gray-500 mt-1">Sign in with your NM2TECH Google account</p>
          {import.meta.env.DEV && (
            <p className="text-xs text-amber-800/90 mt-2 max-w-xs mx-auto">
              Use the exact URL from the terminal (port <strong>{window.location.port}</strong>), finish Google in this
              same tab/browser, and use <strong>localhost</strong> consistently—not 127.0.0.1.
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>
        )}

        <GoogleOAuthButton onStart={() => setError('')} onError={(msg) => setError(msg)} />

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">Designed by nm2tech — mAIchael</p>
        </div>
      </div>
    </div>
  )
}
