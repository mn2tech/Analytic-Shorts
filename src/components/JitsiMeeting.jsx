import { useEffect, useRef, useState } from 'react'

const JITSI_DOMAIN = import.meta.env.VITE_JITSI_DOMAIN || 'meet.jit.si'
const JITSI_8X8_APP_ID = (import.meta.env.VITE_JITSI_8X8_APP_ID || '').trim()
const JITSI_8X8_TENANT = (import.meta.env.VITE_JITSI_8X8_TENANT || '').trim()

// Full 8x8 app ID: use VITE_JITSI_8X8_APP_ID as-is, or build from tenant ID
const JITSI_8X8_APP_ID_RESOLVED = JITSI_8X8_APP_ID
  ? JITSI_8X8_APP_ID
  : JITSI_8X8_TENANT
    ? `vpaas-magic-cookie-${JITSI_8X8_TENANT}`
    : ''

/**
 * Embeds a Jitsi meeting (default: meet.jit.si).
 * For longer sessions without 5-min cutoff, use 8x8 JaaS: set either
 * VITE_JITSI_8X8_APP_ID (full AppID from 8x8, e.g. vpaas-magic-cookie-5e91fefe740644f2c8f3840e535a64ea6)
 * or VITE_JITSI_8X8_TENANT (tenant ID only). Optional: VITE_JITSI_DOMAIN for self-hosted.
 *
 * @param {string} roomName - Jitsi room name (for 8x8, we prepend AppID/)
 * @param {string} [displayName] - User display name
 * @param {string} [email] - User email (optional)
 * @param {object} [configOverwrite] - Extra config
 * @param {string} [className] - Container class
 */
export default function JitsiMeeting({ roomName, displayName = 'Guest', email = '', configOverwrite = {}, className = '' }) {
  const containerRef = useRef(null)
  const apiRef = useRef(null)
  const use8x8 = Boolean(JITSI_8X8_APP_ID_RESOLVED)
  const [scriptReady, setScriptReady] = useState(() => {
    if (typeof window === 'undefined') return false
    if (use8x8) return false
    return typeof window.JitsiMeetExternalAPI !== 'undefined'
  })

  // When using 8x8 JaaS, load their script dynamically (required for 8x8.vc)
  useEffect(() => {
    if (!use8x8 || typeof window === 'undefined') return
    const scriptUrl = `https://8x8.vc/${JITSI_8X8_APP_ID_RESOLVED}/external_api.js`
    if (document.querySelector(`script[src="${scriptUrl}"]`)) {
      if (typeof window.JitsiMeetExternalAPI !== 'undefined') setScriptReady(true)
      return
    }
    const script = document.createElement('script')
    script.src = scriptUrl
    script.async = true
    script.onload = () => setScriptReady(true)
    document.head.appendChild(script)
  }, [use8x8])

  // When using meet.jit.si, wait for script from index.html
  useEffect(() => {
    if (use8x8 || typeof window === 'undefined' || typeof window.JitsiMeetExternalAPI !== 'undefined') return
    const t = setInterval(() => {
      if (typeof window.JitsiMeetExternalAPI !== 'undefined') setScriptReady(true)
    }, 200)
    return () => clearInterval(t)
  }, [use8x8])

  const effectiveDomain = use8x8 ? '8x8.vc' : JITSI_DOMAIN
  const effectiveRoomName = use8x8 && roomName
    ? `${JITSI_8X8_APP_ID_RESOLVED}/${roomName}`
    : roomName

  useEffect(() => {
    if (!scriptReady || !effectiveRoomName || !containerRef.current) return
    const JitsiMeetExternalAPI = window.JitsiMeetExternalAPI
    if (!JitsiMeetExternalAPI) return
    const api = new JitsiMeetExternalAPI(effectiveDomain, {
      roomName: effectiveRoomName,
      width: '100%',
      height: '100%',
      parentNode: containerRef.current,
      userInfo: {
        displayName: displayName || 'Guest',
        email: email || undefined
      },
      configOverwrite: {
        prejoinPageEnabled: false,
        disableDeepLinking: true,
        // Try to avoid short session limits (may be ignored by meet.jit.si)
        conferenceTimeout: 24 * 60 * 60 * 1000,
        ...configOverwrite
      }
    })
    apiRef.current = api
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose()
        apiRef.current = null
      }
    }
  }, [scriptReady, effectiveRoomName, effectiveDomain, displayName, email])

  return (
    <div className={`relative ${className}`} style={{ minHeight: 400 }}>
      <div ref={containerRef} className="w-full h-full min-h-[400px]" />
      {!scriptReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
          Loading meeting…
        </div>
      )}
    </div>
  )
}
