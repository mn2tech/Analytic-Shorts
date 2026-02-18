import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { usePortraitMode } from '../contexts/PortraitModeContext'

const STORAGE_KEY_FULLSCREEN = 'aiVisualBuilder_fullScreen'

export default function PortraitFrame({ children }) {
  const { enabled } = usePortraitMode()
  const location = useLocation()

  const skipFrame = useMemo(() => {
    if (!enabled) return true
    if (!location?.pathname?.startsWith('/studio')) return false
    try {
      return localStorage.getItem(STORAGE_KEY_FULLSCREEN) === 'true'
    } catch {
      return false
    }
  }, [enabled, location?.pathname])

  if (!enabled || skipFrame) {
    return children
  }

  const padPx = 12
  return (
    <div
      className="min-h-screen flex items-center justify-center transition-colors duration-300"
      style={{
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: `${padPx}px`,
        paddingTop: `max(env(safe-area-inset-top, 0px), ${padPx}px)`,
        paddingBottom: `max(env(safe-area-inset-bottom, 0px), ${padPx}px)`,
      }}
    >
      <div
        className="bg-white w-full overflow-auto rounded-[20px] shadow-2xl transition-shadow duration-300 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]"
        style={{
          height: `calc(100vh - ${padPx * 2}px)`,
          maxHeight: `calc(100vh - ${padPx * 2}px)`,
          width: 'min(100%, calc((100vh - 24px) * 9 / 16))',
          scrollbarGutter: 'stable',
          overscrollBehavior: 'contain',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

