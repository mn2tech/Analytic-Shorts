/**
 * AppLayout – Wrapper that adds a collapsible left sidebar + top Navbar + main content.
 * Renders only <Outlet /> when Studio is in fullscreen (localStorage aiVisualBuilder_fullScreen).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatBot from '../components/ChatBot'
import { useAuth } from '../contexts/AuthContext'
import { usePortraitMode } from '../contexts/PortraitModeContext'
import { getUnreadCount } from '../services/messagesService'
import apiClient from '../config/api'

const STORAGE_KEY_FULLSCREEN = 'aiVisualBuilder_fullScreen'
const STORAGE_KEY_SIDEBAR_COLLAPSED = 'sidebarCollapsed'
const STORAGE_KEY_SIDEBAR_SECTIONS = 'sidebarSectionsOpen'

function loadSectionOpen() {
  try {
    const s = localStorage.getItem(STORAGE_KEY_SIDEBAR_SECTIONS)
    if (s) {
      const o = JSON.parse(s)
      if (o && typeof o === 'object') {
        return {
          status: !!o.status,
          quickActions: !!o.quickActions,
          navigate: !!o.navigate
        }
      }
    }
  } catch (_) {}
  return { status: false, quickActions: false, navigate: false }
}

// Pathname to sidebar label for "Current" and active-state clarity
const PATH_TO_LABEL = [
  { path: '/admin/analytics', label: 'Admin' },
  { path: '/help', label: 'Help' },
  { path: '/pricing', label: 'Pricing' },
  { path: '/feed', label: 'Feed' },
  { path: '/messages', label: 'Messages' },
  { path: '/careers', label: 'Careers' },
  { path: '/dashboard', label: 'Dashboard Viewer' },
  { path: '/dashboards', label: 'My Dashboards' },
  { path: '/studio', label: 'Studio' },
  { path: '/', label: 'Home' },
]
function getCurrentPageLabel(pathname) {
  for (const { path, label } of PATH_TO_LABEL) {
    if (path === '/') {
      if (pathname === '/' || pathname === '') return label
      continue
    }
    if (pathname === path || pathname.startsWith(path + '/')) return label
  }
  return null
}

// Same condition as backend /admin/analytics: show Admin only when profile indicates admin/demo.
// Backend still enforces via ADMIN_EMAILS; this only controls sidebar visibility.
function isAdminByProfile(user, userProfile) {
  if (!user) return false
  const role = userProfile?.role
  return role === 'admin' || role === 'demo'
}

function isDefaultAdminEmail(user) {
  const email = String(user?.email || '').toLowerCase()
  return email === 'admin@nm2tech-sas.com' || email === 'demo@nm2tech-sas.com'
}

// Tooltip for collapsed sidebar: rendered in a portal so it's never clipped by sidebar overflow. No deps.
function SidebarTooltip({ show, label, children }) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({
      left: rect.right + 8,
      top: rect.top + rect.height / 2,
    })
  }, [])

  const handleEnter = useCallback(() => {
    updatePosition()
    setVisible(true)
  }, [updatePosition])

  const handleLeave = useCallback(() => setVisible(false), [])

  useEffect(() => {
    if (!visible) return
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [visible, updatePosition])

  if (!show) return children

  const tooltipEl = visible && (
    <span
      className="fixed px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 rounded shadow-lg whitespace-nowrap z-[9999] -translate-y-1/2 pointer-events-none transition-opacity duration-150"
      style={{ left: coords.left, top: coords.top }}
      role="tooltip"
    >
      {label}
    </span>
  )

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {typeof document !== 'undefined' && tooltipEl && createPortal(tooltipEl, document.body)}
    </div>
  )
}

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, userProfile } = useAuth()
  const { enabled: portraitEnabled } = usePortraitMode()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) !== 'true'
    } catch {
      return true
    }
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dataStatus, setDataStatus] = useState({ loaded: false })
  const [sectionOpen, setSectionOpen] = useState(loadSectionOpen)
  const [quickActionLoading, setQuickActionLoading] = useState(null) // 'samgov' | null
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [samgovQuickActionVisible, setSamgovQuickActionVisible] = useState(true)
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0)
  const showAdminLink = isAdminByProfile(user, userProfile) || isDefaultAdminEmail(user) || hasAdminAccess

  const refreshMessagesUnread = useCallback(() => {
    if (!user) return
    getUnreadCount().then(setMessagesUnreadCount).catch(() => setMessagesUnreadCount(0))
  }, [user])

  useEffect(() => {
    if (!user) {
      setMessagesUnreadCount(0)
      return
    }
    refreshMessagesUnread()
    const onChanged = () => refreshMessagesUnread()
    window.addEventListener('messages-unread-changed', onChanged)
    const onFocus = () => refreshMessagesUnread()
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('messages-unread-changed', onChanged)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, refreshMessagesUnread])

  const toggleSection = useCallback((key) => {
    setSectionOpen((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(STORAGE_KEY_SIDEBAR_SECTIONS, JSON.stringify(next))
      } catch (_) {}
      return next
    })
  }, [])

  // Dataset status from sessionStorage (updates on location change and storage event)
  useEffect(() => {
    const check = () => {
      try {
        const raw = sessionStorage.getItem('analyticsData')
        if (!raw) {
          setDataStatus({ loaded: false })
          return
        }
        const parsed = JSON.parse(raw)
        setDataStatus({ loaded: !!parsed && typeof parsed === 'object' })
      } catch {
        setDataStatus({ loaded: false })
      }
    }
    check()
    window.addEventListener('storage', check)
    return () => window.removeEventListener('storage', check)
  }, [location.pathname, location.key])

  // Keep Admin sidebar link aligned with backend email-based admin checks.
  useEffect(() => {
    let cancelled = false

    const checkAdminAccess = async () => {
      if (!user) {
        setHasAdminAccess(false)
        return
      }

      // Fast-path: role-based admin from profile (legacy behavior)
      if (isAdminByProfile(user, userProfile)) {
        setHasAdminAccess(true)
      }

      try {
        const { data } = await apiClient.get('/api/analytics/admin-check', { timeout: 10000 })
        if (!cancelled) setHasAdminAccess(!!data?.isAdmin)
      } catch (err) {
        // 403 = not admin (old backend or non-admin); treat as no access, avoid console noise
        if (!cancelled) setHasAdminAccess(false)
      }
    }

    checkAdminAccess()
    return () => {
      cancelled = true
    }
  }, [user, userProfile])

  // Respect admin-controlled API report visibility for sidebar quick actions.
  useEffect(() => {
    let cancelled = false

    const loadApiReportVisibility = async () => {
      try {
        const res = await apiClient.get('/api/example/api-reports', { timeout: 10000 })
        const reports = Array.isArray(res?.data?.reports) ? res.data.reports : []
        const hasSamgovLive = reports.some((report) => report?.id === 'samgov-live')
        if (!cancelled) {
          // For regular users, hidden reports are omitted by backend, so absence means hidden.
          setSamgovQuickActionVisible(hasSamgovLive)
        }
      } catch {
        // Fail-open keeps existing UX if the visibility endpoint is temporarily unavailable.
        if (!cancelled) setSamgovQuickActionVisible(true)
      }
    }

    loadApiReportVisibility()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.email])

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, next ? 'false' : 'true')
      } catch {}
      return next
    })
  }, [])

  // Close mobile menu when route or hash changes; smooth scroll to hash anchor after route has rendered
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace('#', '')
    if (!id) return
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => clearTimeout(t)
  }, [location.pathname, location.hash])

  const isStudioFullscreen =
    location.pathname.startsWith('/studio') &&
    typeof window !== 'undefined' &&
    (() => {
      try {
        return localStorage.getItem(STORAGE_KEY_FULLSCREEN) === 'true'
      } catch {
        return false
      }
    })()

  if (isStudioFullscreen) {
    return <Outlet />
  }

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg text-sm transition-colors py-2.5 pr-3 pl-3 border-l-4 ${
      isActive
        ? 'bg-blue-100 text-blue-800 font-semibold border-blue-600'
        : 'border-transparent font-medium text-gray-700 hover:bg-gray-100'
    }`

  const hideFooter = location.pathname.startsWith('/studio')

  // In 9:16 portrait mode, force a "mobile-like" layout so desktop breakpoints
  // don't keep the sidebar visible inside the portrait frame.
  if (portraitEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden relative">
        {mobileMenuOpen && (
          <div
            className="absolute inset-0 z-40 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          className={`absolute inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-gray-200 transform transition-transform duration-200 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          aria-hidden={!mobileMenuOpen}
        >
          <div className="flex h-14 items-center justify-between px-4 border-b border-gray-200">
            <span className="font-semibold text-gray-900">Menu</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
          <div className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-3.5rem)]">
            <div className="px-3 pt-2 pb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Navigate</p>
            </div>
            <NavLink to="/" end className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span>🏠</span>
              <span>Home</span>
            </NavLink>
            <NavLink to="/feed" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span>📰</span>
              <span>Feed</span>
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span>📈</span>
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/studio/chat" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span>🎨</span>
              <span>Studio</span>
            </NavLink>
            <NavLink to="/dashboards" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span>📋</span>
              <span>My Dashboards</span>
            </NavLink>
            {user && (
              <NavLink to="/profile" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                <span>👤</span>
                <span>Profile</span>
              </NavLink>
            )}
            <NavLink to="/#upload" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span>📤</span>
              <span>Upload Data</span>
            </NavLink>
            <div className="px-3 pt-4 pb-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Support</p>
            </div>
            <NavLink to="/pricing" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span>💳</span>
              <span>Pricing</span>
            </NavLink>
            <NavLink to="/help" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
              <span>❓</span>
              <span>Help</span>
            </NavLink>
            {showAdminLink && (
              <>
                <div className="px-3 pt-4 pb-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</p>
                </div>
                <NavLink to="/admin/analytics" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                  <span>⚙️</span>
                  <span>Admin</span>
                </NavLink>
              </>
            )}
            {samgovQuickActionVisible && (
              <>
                <div className="px-3 pt-4 pb-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick load</p>
                </div>
                <button
                  type="button"
                  className={navLinkClass({ isActive: false })}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    loadSamgovOpportunities()
                  }}
                  disabled={quickActionLoading === 'samgov'}
                  aria-disabled={quickActionLoading === 'samgov'}
                >
                  <span>{quickActionLoading === 'samgov' ? '⏳' : '🏛️'}</span>
                  <span>SAM.gov Opportunities</span>
                </button>
              </>
            )}
          </div>
        </aside>
        <header className="shrink-0">
          <div className="border-b border-gray-200 bg-white">
            <Navbar onOpenSidebar={() => setMobileMenuOpen(true)} />
          </div>
        </header>
        <main className="flex-1 min-h-0">
          <Outlet />
        </main>
        {!hideFooter && <Footer />}
        <ChatBot />
      </div>
    )
  }

  const loadSamgovOpportunities = useCallback(async () => {
    if (quickActionLoading) return
    setQuickActionLoading('samgov')
    try {
      const formatMmDdYyyy = (d) => {
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const yyyy = String(d.getFullYear())
        return `${mm}/${dd}/${yyyy}`
      }
      const postedToDate = new Date()
      const postedFromDate = new Date(postedToDate)
      // Wider default window improves SAM.gov parity when users compare against "Updated in past week" on SAM UI.
      postedFromDate.setDate(postedFromDate.getDate() - 364)
      const postedFrom = formatMmDdYyyy(postedFromDate)
      const postedTo = formatMmDdYyyy(postedToDate)

      // Do not force solicitation-only (ptype=o); include all opportunity notice types.
      const endpoint = `/api/example/samgov/live?limit=1000&postedFrom=${encodeURIComponent(postedFrom)}&postedTo=${encodeURIComponent(postedTo)}`
      const response = await apiClient.get(endpoint, { timeout: 30000 })
      const payload = response?.data

      if (!payload || !Array.isArray(payload.data)) {
        throw new Error('Invalid data format received from server.')
      }

      // Use same storage strategy as Home.jsx to avoid sessionStorage quota issues.
      const estimatedSize = JSON.stringify(payload).length
      const sizeInMB = estimatedSize / (1024 * 1024)

      if (sizeInMB > 3) {
        navigate('/dashboard', { state: { analyticsData: payload } })
      } else {
        sessionStorage.setItem('analyticsData', JSON.stringify(payload))
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Failed to load SAM.gov opportunities:', error)
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to load SAM.gov opportunities.'
      alert(`Failed to load SAM.gov opportunities: ${msg}`)
    } finally {
      setQuickActionLoading(null)
    }
  }, [navigate, quickActionLoading])

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          flex flex-col bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-out
          w-64 shrink-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${!sidebarOpen ? 'lg:w-[4.5rem] lg:overflow-y-auto lg:relative lg:z-50' : 'lg:w-64'}
        `}
      >
        <div className="flex h-14 items-center justify-between px-3 border-b border-gray-200 shrink-0">
          <span className={`font-semibold text-gray-900 ${!sidebarOpen ? 'lg:hidden' : ''}`}>
            Menu
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              aria-label="Close menu"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? '◀' : '▶'}
            </button>
          </div>
        </div>

        <div className={`flex-1 py-4 px-3 ${sidebarOpen ? 'overflow-y-auto' : 'lg:overflow-visible overflow-y-auto'}`}>
          {/* Current page label */}
          {(() => {
            const currentLabel = getCurrentPageLabel(location.pathname)
            if (!currentLabel || !sidebarOpen) return null
            return (
              <div className={`mb-4 px-3 ${!sidebarOpen ? 'lg:hidden' : ''}`}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Current
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate" title={currentLabel}>
                  {currentLabel}
                </p>
              </div>
            )
          })()}
          {/* Status – collapsible */}
          {sidebarOpen && (
            <div className="mb-4">
              <button
                type="button"
                onClick={() => toggleSection('status')}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded"
                aria-expanded={sectionOpen.status}
              >
                <span>Status</span>
                <span className="text-gray-400">{sectionOpen.status ? '▼' : '▶'}</span>
              </button>
              {sectionOpen.status && (
                <div className="px-3 mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      dataStatus.loaded ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {dataStatus.loaded ? 'Data loaded ✅' : 'No data loaded ⚠️'}
                  </span>
                  {dataStatus.loaded ? (
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-xs text-blue-600 hover:underline">
                      Open Dashboard
                    </Link>
                  ) : (
                    <Link to="/#upload" onClick={() => setMobileMenuOpen(false)} className="text-xs text-blue-600 hover:underline">
                      Upload
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quick Actions – collapsible */}
          <div className={`mb-4 ${!sidebarOpen ? 'lg:hidden' : ''}`}>
            <button
              type="button"
              onClick={() => toggleSection('quickActions')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded"
              aria-expanded={sectionOpen.quickActions}
            >
              <span>Quick Actions</span>
              <span className="text-gray-400">{sectionOpen.quickActions ? '▼' : '▶'}</span>
            </button>
            {sectionOpen.quickActions && (
              <div className="space-y-1 mt-1">
                <SidebarTooltip show={!sidebarOpen} label="Upload Data">
                  <NavLink to="/#upload" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>📤</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>Upload Data</span>
                  </NavLink>
                </SidebarTooltip>
                <SidebarTooltip show={!sidebarOpen} label="Open Studio">
                  <NavLink to="/studio/chat" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>🎨</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>Open Studio</span>
                  </NavLink>
                </SidebarTooltip>
                {samgovQuickActionVisible && (
                  <SidebarTooltip show={!sidebarOpen} label="SAM.gov Opportunities">
                    <button
                      type="button"
                      className={navLinkClass({ isActive: false })}
                      onClick={() => {
                        setMobileMenuOpen(false)
                        loadSamgovOpportunities()
                      }}
                      disabled={quickActionLoading === 'samgov'}
                      aria-disabled={quickActionLoading === 'samgov'}
                    >
                      <span>{quickActionLoading === 'samgov' ? '⏳' : '🏛️'}</span>
                      <span className={sidebarOpen ? '' : 'lg:hidden'}>
                        {quickActionLoading === 'samgov' ? 'Loading SAM.gov…' : 'SAM.gov Opportunities'}
                      </span>
                    </button>
                  </SidebarTooltip>
                )}
              </div>
            )}
          </div>

          {/* Navigate – collapsible */}
          <nav className="space-y-0.5">
            <button
              type="button"
              onClick={() => toggleSection('navigate')}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded ${!sidebarOpen ? 'lg:hidden' : ''}`}
              aria-expanded={sectionOpen.navigate}
            >
              <span>Navigate</span>
              <span className="text-gray-400">{sectionOpen.navigate ? '▼' : '▶'}</span>
            </button>
            {sectionOpen.navigate && (
              <>
                <SidebarTooltip show={!sidebarOpen} label="Home">
                  <NavLink to="/" end className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>🏠</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>Home</span>
                  </NavLink>
                </SidebarTooltip>
                <SidebarTooltip show={!sidebarOpen} label="Feed">
                  <NavLink to="/feed" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>📰</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>Feed</span>
                  </NavLink>
                </SidebarTooltip>
                <SidebarTooltip show={!sidebarOpen} label="Careers">
                  <NavLink to="/careers" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>💼</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>Careers</span>
                  </NavLink>
                </SidebarTooltip>
                {user && (
                  <SidebarTooltip show={!sidebarOpen} label="Messages">
                    <NavLink to="/messages" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                      <span className="relative">
                        ✉️
                        {messagesUnreadCount > 0 && (
                          <span
                            className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full"
                            aria-label={`${messagesUnreadCount} unread`}
                          >
                            {messagesUnreadCount > 99 ? '99+' : messagesUnreadCount}
                          </span>
                        )}
                      </span>
                      <span className={sidebarOpen ? '' : 'lg:hidden'}>Messages</span>
                    </NavLink>
                  </SidebarTooltip>
                )}
                <SidebarTooltip show={!sidebarOpen} label="My Dashboards">
                  <NavLink to="/dashboards" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>📋</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>My Dashboards</span>
                  </NavLink>
                </SidebarTooltip>
                {user && (
                  <SidebarTooltip show={!sidebarOpen} label="Profile">
                    <NavLink to="/profile" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                      <span>👤</span>
                      <span className={sidebarOpen ? '' : 'lg:hidden'}>Profile</span>
                    </NavLink>
                  </SidebarTooltip>
                )}
                <SidebarTooltip show={!sidebarOpen} label="Dashboard Viewer">
                  <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>📈</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>Dashboard Viewer</span>
                  </NavLink>
                </SidebarTooltip>
                <SidebarTooltip show={!sidebarOpen} label="Pricing">
                  <NavLink to="/pricing" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>💳</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>Pricing</span>
                  </NavLink>
                </SidebarTooltip>
                <SidebarTooltip show={!sidebarOpen} label="Help">
                  <NavLink to="/help" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>❓</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>Help</span>
                  </NavLink>
                </SidebarTooltip>
                {showAdminLink && (
                  <SidebarTooltip show={!sidebarOpen} label="Admin">
                    <NavLink to="/admin/analytics" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                      <span>⚙️</span>
                      <span className={sidebarOpen ? '' : 'lg:hidden'}>Admin</span>
                    </NavLink>
                  </SidebarTooltip>
                )}
              </>
            )}
          </nav>
        </div>
      </aside>

      {/* Main: Navbar + content + Footer. Lower z-index when sidebar collapsed so tooltips show on top. */}
      <div className={`flex flex-1 flex-col min-w-0 relative ${!sidebarOpen ? 'lg:z-0' : ''}`}>
        <header className="shrink-0">
          <div className="border-b border-gray-200 bg-white">
            <Navbar onOpenSidebar={() => setMobileMenuOpen(true)} />
          </div>
        </header>
        <main className="flex-1 min-h-0">
          <Outlet />
        </main>
        {!hideFooter && <Footer />}
      </div>
      <ChatBot />
    </div>
  )
}

export default AppLayout
