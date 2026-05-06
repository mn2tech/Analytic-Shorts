import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const PRODUCT_CARDS = [
  {
    title: 'Analytics Shorts',
    description: 'Dashboard, Feed, Studio, and Live workflows.',
    to: '/analytics',
    links: [
      { label: 'Get started', to: '/analytics' },
      { label: 'Dashboard', to: '/analytics/dashboard' },
      { label: 'Feed', to: '/analytics/feed' },
      { label: 'Studio', to: '/analytics/studio' },
      { label: 'Live', to: '/analytics/live' },
    ],
  },
  {
    title: 'GovCon Intelligence',
    description: 'Federal Entry, Briefs, and GovCon 4-Pack.',
    to: '/govcon/federal-entry',
    salesOnly: true,
    contactSubject: 'GovCon+Intelligence+Pricing',
    links: [
      { label: 'Federal Entry', to: '/govcon/federal-entry' },
      { label: 'Briefs', to: '/govcon/briefs' },
      { label: 'GovCon4Pack', to: '/govcon/govcon4pack' },
    ],
  },
  {
    title: 'Healthcare AI',
    description: 'FloorMap, ER Map, Bed Tracking, and Medstar Montgomery ER Command Center.',
    to: '/healthcare/floormap',
    salesOnly: true,
    contactSubject: 'Healthcare+AI+Pricing',
    links: [
      { label: 'FloorMap', to: '/healthcare/floormap' },
      { label: 'ER Map', to: '/healthcare/er-map' },
      { label: 'Bed Tracking', to: '/healthcare/bed-tracking' },
      { label: 'Medstar Montgomery ER', to: '/medstar-montgomery-er-command-center' },
    ],
  },
  {
    title: 'AI Studio',
    description: 'AAI Studio, SAS Migration, and Responsible AI.',
    to: '/studio/chat',
    salesOnly: true,
    contactSubject: 'AI+Studio+Pricing',
    links: [
      { label: 'AAI Studio', to: '/studio/chat' },
      { label: 'SAS Migration', to: '/studio/sas-to-pyspark' },
      { label: 'Responsible AI', to: '/studio/responsible-ai' },
    ],
  },
  {
    title: 'Command Centers',
    description: 'Industry-specific command dashboards',
    to: '/portals/command-centers',
    salesOnly: true,
    contactSubject: 'Command+Center+Pricing',
    links: [
      { label: 'Best Western', to: '/portals/command-centers/best-western' },
      { label: 'Data Center', to: '/portals/command-centers/data-center' },
      { label: 'Kumon', to: '/portals/command-centers/kumon' },
      { label: 'Motel', to: '/portals/command-centers/motel' },
    ],
  },
]

const RECENT_STORAGE_KEY = 'nm2-hub-recent-visits'

const THEME_BY_TITLE = {
  'Analytics Shorts': {
    iconWrap: 'bg-[#378ADD]/18 text-[#378ADD]',
    border: 'border-l-[#378ADD]',
    pill: 'bg-[#378ADD]/15 text-[#378ADD] border-[#378ADD]/30',
    btn: 'bg-[#378ADD] hover:bg-[#2d6fb3]',
  },
  'GovCon Intelligence': {
    iconWrap: 'bg-[#BA7517]/18 text-[#BA7517]',
    border: 'border-l-[#BA7517]',
    pill: 'bg-[#BA7517]/15 text-[#BA7517] border-[#BA7517]/30',
    btn: 'bg-[#BA7517] hover:bg-[#985f12]',
  },
  'Healthcare AI': {
    iconWrap: 'bg-[#1D9E75]/18 text-[#1D9E75]',
    border: 'border-l-[#1D9E75]',
    pill: 'bg-[#1D9E75]/15 text-[#1D9E75] border-[#1D9E75]/30',
    btn: 'bg-[#1D9E75] hover:bg-[#178563]',
  },
  'AI Studio': {
    iconWrap: 'bg-[#7F77DD]/18 text-[#7F77DD]',
    border: 'border-l-[#7F77DD]',
    pill: 'bg-[#7F77DD]/15 text-[#7F77DD] border-[#7F77DD]/30',
    btn: 'bg-[#7F77DD] hover:bg-[#6961c4]',
  },
  'Command Centers': {
    iconWrap: 'bg-[#64748b]/18 text-[#64748b]',
    border: 'border-l-[#64748b]',
    pill: 'bg-[#64748b]/15 text-[#64748b] border-[#64748b]/30',
    btn: 'bg-[#64748b] hover:bg-[#475569]',
  },
}

function IconAnalytics({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 15v4M12 9v10M17 5v14" />
    </svg>
  )
}

function IconGovCon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M6 20V9l6-3 6 3v11M9 14h2M13 14h2M9 17h6" />
    </svg>
  )
}

function IconHealthcare({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21.5c-4.2 0-7.5-3.2-7.5-7.2 0-3.1 2.4-6.4 7.5-12.3 5.1 5.9 7.5 9.2 7.5 12.3 0 4-3.3 7.2-7.5 7.2z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5M9.5 13.5h5" />
    </svg>
  )
}

function IconAIStudio({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" d="M12 3v6M12 15v6M3 12h6M15 12h6" />
    </svg>
  )
}

function IconCommandCenters({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 21h16M5 21V8l7-3 7 3v13M9 14h2M13 14h2M9 18h6"
      />
      <rect x="8" y="4" width="8" height="5" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6.5h4M10 8.25h2.5" />
    </svg>
  )
}

const ICON_BY_TITLE = {
  'Analytics Shorts': IconAnalytics,
  'GovCon Intelligence': IconGovCon,
  'Healthcare AI': IconHealthcare,
  'AI Studio': IconAIStudio,
  'Command Centers': IconCommandCenters,
}

function readRecentVisits() {
  try {
    const raw = sessionStorage.getItem(RECENT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x) => x && x.to && x.label).slice(0, 3) : []
  } catch {
    return []
  }
}

function recordVisit(to, label) {
  try {
    const prev = readRecentVisits()
    const next = [{ to, label }, ...prev.filter((x) => x.to !== to)].slice(0, 3)
    sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

function Hub() {
  const { user, userProfile } = useAuth()
  const [now, setNow] = useState(() => new Date())
  const [recentVisits, setRecentVisits] = useState(readRecentVisits)

  const displayName = useMemo(() => {
    const name = userProfile?.name?.trim()
    if (name) return name
    const email = user?.email
    if (email) return email.split('@')[0]
    return 'there'
  }, [user?.email, userProfile?.name])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const formattedDateTime = useMemo(() => {
    return now.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    })
  }, [now])

  const onNavClick = (to, label) => {
    recordVisit(to, label)
    setRecentVisits(readRecentVisits())
  }

  const contactButtonStyle =
    'inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.98]'

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white shadow-lg">
        <div
          className="pointer-events-none absolute inset-0 opacity-45 bg-[radial-gradient(ellipse_80%_55%_at_100%_0%,rgba(59,130,246,0.35),transparent_55%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-35 bg-[radial-gradient(ellipse_55%_45%_at_0%_100%,rgba(99,102,241,0.22),transparent_50%)]"
          aria-hidden="true"
        />
        <div className="relative max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-10 pt-8 pb-14 sm:pb-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors shrink-0"
              title="Back to site"
            >
              <span className="text-lg font-bold tracking-tight">← Back to site</span>
            </Link>
            <time
              dateTime={now.toISOString()}
              className="text-sm tabular-nums text-slate-300 sm:text-right sm:ml-auto"
            >
              {formattedDateTime}
            </time>
          </div>

          <div className="mt-10 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-white drop-shadow-sm">
              Welcome back, {displayName}
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-300 font-light leading-relaxed">
              Choose your workspace
            </p>
          </div>
        </div>
      </header>

      {/* Cards — overlap hero slightly */}
      <main className="relative z-10 flex-1 -mt-8 sm:-mt-10 pb-12">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {PRODUCT_CARDS.map((card) => {
              const theme = THEME_BY_TITLE[card.title] || THEME_BY_TITLE['Analytics Shorts']
              const Icon = ICON_BY_TITLE[card.title] || IconAnalytics
              return (
                <article
                  key={card.title}
                  className={`group relative flex flex-col rounded-2xl bg-white p-7 sm:p-8 shadow-md border border-slate-200/80 border-l-4 ${theme.border} transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:border-slate-200`}
                >
                  {card.salesOnly && (
                    <span className="absolute top-5 right-5 z-10 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      Sales only
                    </span>
                  )}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.iconWrap}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold text-slate-900 tracking-tight">{card.title}</h2>
                      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{card.description}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {card.links.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => onNavClick(link.to, link.label)}
                        className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors hover:brightness-95 ${theme.pill}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>

                  <div className="mt-8 pt-2">
                    {card.salesOnly ? (
                      <a
                        href={`/contact?subject=${card.contactSubject || 'Product+Pricing'}`}
                        className={`${contactButtonStyle} ${theme.btn}`}
                      >
                        Contact us for access
                        <span className="ml-2" aria-hidden="true">→</span>
                      </a>
                    ) : (
                      <Link
                        to={card.to}
                        onClick={() =>
                          onNavClick(card.to, card.ctaLabel ? `${card.ctaLabel}` : `Open ${card.title}`)
                        }
                        className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.98] ${theme.btn}`}
                      >
                        Open Analytics Shorts
                        <span className="ml-2" aria-hidden="true">→</span>
                      </Link>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {/* Bottom strip */}
          <footer className="mt-12 lg:mt-14 rounded-2xl border border-slate-200/90 bg-white/90 backdrop-blur-sm px-6 py-5 sm:px-8 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recently visited</p>
                {recentVisits.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-3">
                    {recentVisits.map((item) => (
                      <li key={item.to}>
                        <Link
                          to={item.to}
                          onClick={() => onNavClick(item.to, item.label)}
                          className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Jump into a workspace above — your recent pages appear here.</p>
                )}
              </div>
              <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-4 lg:border-t-0 lg:pt-0 lg:border-l lg:border-slate-200 lg:pl-8">
                <Link to="/help" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                  Help
                </Link>
                <Link to="/pricing" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                  Pricing
                </Link>
                <Link to="/profile" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                  Profile
                </Link>
              </nav>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default Hub
