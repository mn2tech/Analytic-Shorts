import { Link, NavLink, Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { TD } from '../constants/terminalDashboardPalette'

/**
 * Product hub shell: top Navbar, optional horizontal product nav, main, footer. No left sidebar.
 */
function ProductLayoutShell({ productName, navItems = [] }) {
  const topNavLinkStyle = ({ isActive }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    borderRadius: '8px',
    fontSize: '0.8125rem',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
    padding: '6px 10px',
    background: isActive ? TD.CARD_BG : 'transparent',
    color: isActive ? TD.TEXT_1 : TD.TEXT_2,
    fontWeight: isActive ? 600 : 500,
    borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
    marginBottom: '-2px',
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: TD.PAGE_BG }}>
      <div className="shrink-0" style={{ borderBottom: `0.5px solid ${TD.CARD_BG}`, background: TD.PAGE_BG }}>
        <Navbar brandTo="/hub" />
      </div>
      {navItems.length > 0 && (
        <div
          className="shrink-0 px-3 py-2 overflow-x-auto"
          style={{ borderBottom: `0.5px solid ${TD.CARD_BG}`, background: TD.PAGE_BG }}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-1">
            <Link to="/hub" className="text-sm font-medium shrink-0 mr-2" style={{ color: TD.ACCENT_MID }}>
              ← Hub
            </Link>
            <span className="text-slate-600 text-xs font-semibold uppercase tracking-wide shrink-0 mr-1">
              {productName}
            </span>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} style={topNavLinkStyle} title={item.label}>
                {item.icon ? <span aria-hidden="true">{item.icon}</span> : null}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
      <main className="flex-1 min-w-0 min-h-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default ProductLayoutShell
