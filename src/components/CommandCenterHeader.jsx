import { useEffect, useState } from 'react'

export default function CommandCenterHeader({
  appName = 'Hospital Command Center',
  facilityName,
  facilityType = 'Operations Dashboard',
  mode = 'Command Center',
  logoSrc,
  logoAlt = 'Facility logo',
  logoFallback = 'HC',
  badge = 'Demo Mode',
  className = '',
}) {
  const [currentTime, setCurrentTime] = useState(() => new Date())
  const [logoMissing, setLogoMissing] = useState(!logoSrc)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const title = `${facilityName} ${mode}`
  const currentDateLabel = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const currentTimeLabel = currentTime.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  return (
    <header className={`border-b border-[#1e3a5f] bg-[#020817] px-4 py-3 sm:px-5 ${className}`}>
      <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <div className="text-sm font-medium uppercase tracking-[0.18em] text-[#8aa4c2]">
          {appName}
        </div>

        <div className="flex min-w-0 items-center justify-start lg:justify-center">
          {logoMissing ? (
            <div className="mr-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#1e3a5f] bg-[#0b1728] text-xs font-black text-cyan-200">
              {logoFallback}
            </div>
          ) : (
            <img
              src={logoSrc}
              alt={logoAlt}
              className="mr-3 h-8 w-auto flex-shrink-0"
              onError={() => setLogoMissing(true)}
            />
          )}
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-semibold leading-tight text-[#e5f0ff]">{title}</h1>
              {badge ? (
                <span className="rounded-full border border-emerald-300/40 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-[#8aa4c2]">
              {facilityType} - Interactive Real-Time Operations Dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center justify-start gap-3 lg:justify-end">
          <div className="text-left leading-tight sm:text-right">
            <p className="text-xs font-semibold text-[#e5f0ff]">{currentDateLabel}</p>
            <p className="text-sm font-bold text-[#e5f0ff]">{currentTimeLabel}</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-green-500 bg-green-500/10 px-3 py-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.95)]" />
            <span className="text-sm font-semibold text-green-400">LIVE</span>
          </div>
          <button
            type="button"
            className="hidden h-9 items-center justify-center rounded-lg border border-[#1e3a5f] bg-[#0b1728] px-3 text-xs font-semibold text-[#8aa4c2] hover:text-[#e5f0ff] sm:flex"
            aria-label="Open command center menu"
            title="Menu"
          >
            Menu
          </button>
        </div>
      </div>
    </header>
  )
}
