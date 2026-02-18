/** True if direct YouTube upload is available (VITE_GOOGLE_CLIENT_ID is set). */
export function isYouTubeUploadConfigured() {
  return !!(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim()
}

/**
 * Get a Google OAuth access token for YouTube upload (scope: youtube.upload).
 * Requires VITE_GOOGLE_CLIENT_ID and the Google Identity Services script (accounts.google.com/gsi/client).
 * @returns {Promise<string>} access token
 */
export function getGoogleYouTubeUploadToken() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  if (!clientId.trim()) {
    return Promise.reject(new Error('Google Sign-In is not configured. Add VITE_GOOGLE_CLIENT_ID to enable direct YouTube upload.'))
  }
  return new Promise((resolve, reject) => {
    const scope = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl'
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2?.initTokenClient) {
      reject(new Error('Google Sign-In script did not load. Check your connection and try again.'))
      return
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (res) => {
        if (res.error) {
          reject(new Error(res.error || 'Google Sign-In failed'))
          return
        }
        if (res.access_token) resolve(res.access_token)
        else reject(new Error('No access token returned'))
      },
    })
    client.requestAccessToken()
  })
}

/**
 * Upload a video blob to YouTube via our backend using the user's Google token.
 * @param {Blob} blob
 * @param {string} title
 * @param {string} description
 * @param {string} privacy - 'public' | 'unlisted' | 'private'
 * @param {string} accessToken - from getGoogleYouTubeUploadToken()
 * @param {string} apiBaseUrl - base URL for API (e.g. '' or import.meta.env.VITE_API_URL)
 * @returns {Promise<{ videoId: string, link: string, title: string, privacyStatus: string }>}
 */
export async function uploadVideoToYouTube(blob, title, description, privacy, accessToken, apiBaseUrl = '') {
  const url = `${apiBaseUrl || ''}/api/youtube/upload`.replace(/\/+/g, '/')
  const form = new FormData()
  form.append('video', blob, (title || 'analytics-short').replace(/[^a-z0-9.-]+/gi, '-') + '.webm')
  form.append('access_token', accessToken)
  form.append('title', String(title || 'Analytics Short').slice(0, 100))
  form.append('description', String(description || '').slice(0, 5000))
  form.append('privacy', ['public', 'unlisted', 'private'].includes(privacy) ? privacy : 'private')

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Upload failed (${res.status})`)
  }
  return data
}
