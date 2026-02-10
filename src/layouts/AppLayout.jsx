/**
 * AppLayout – Wrapper that adds a collapsible left sidebar + top Navbar + main content.
 * Renders only <Outlet /> when Studio is in fullscreen (localStorage aiVisualBuilder_fullScreen).
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Outlet, NavLink, Link, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useAuth } from '../contexts/AuthContext'

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
  const { user, userProfile } = useAuth()
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
  const showAdminLink = isAdminByProfile(user, userProfile)

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
                <SidebarTooltip show={!sidebarOpen} label="My Dashboards">
                  <NavLink to="/dashboards" className={navLinkClass} onClick={() => setMobileMenuOpen(false)}>
                    <span>📋</span>
                    <span className={sidebarOpen ? '' : 'lg:hidden'}>My Dashboards</span>
                  </NavLink>
                </SidebarTooltip>
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
    </div>
  )
}

export default AppLayout
