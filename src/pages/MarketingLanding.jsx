import { Link } from 'react-router-dom'

const COLORS = {
  page: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  text: '#f8fafc',
  subtext: '#94a3b8',
  accent: '#1d4ed8',
  green: '#059669',
}

const featureCards = [
  {
    title: 'Upload any data',
    body: 'CSV, Excel, Google Sheets. Drop it in and we handle the rest.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3v12m0-12l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
    ),
  },
  {
    title: 'Ask in plain English',
    body: 'Which products are losing money? What should I focus on next quarter? Claude answers instantly.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h16v10H8l-4 4V5z" />
      </svg>
    ),
  },
  {
    title: 'Instant dashboards',
    body: 'Interactive charts, US maps, and AI insights - shareable with one click.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20V10m8 10V4m8 16v-7" />
      </svg>
    ),
  },
]

const plans = [
  { name: 'Free', price: '$0', body: '3 dashboards, basic charts', highlight: false },
  { name: 'Pro', price: '$29/mo', body: 'unlimited + Ask Claude', highlight: true },
  { name: 'Enterprise', price: '$99/mo', body: 'team + API', highlight: false },
]

export default function MarketingLanding() {
  return (
    <div style={{ background: COLORS.page, color: COLORS.text, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '20px 20px 40px' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: COLORS.text, textDecoration: 'none', fontWeight: 700, fontSize: 20 }}>
            NM2TECH
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <Link to="/pricing" style={{ color: COLORS.subtext, textDecoration: 'none' }}>Features</Link>
            <Link to="/pricing" style={{ color: COLORS.subtext, textDecoration: 'none' }}>Pricing</Link>
            <Link to="/login" style={{ color: COLORS.subtext, textDecoration: 'none' }}>Login</Link>
            <Link
              to="/signup"
              style={{
                background: COLORS.green,
                color: '#fff',
                padding: '10px 14px',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Start free →
            </Link>
          </nav>
        </header>

        <section style={{ paddingTop: 64, paddingBottom: 54 }}>
          <div style={{ display: 'inline-flex', border: `0.5px solid ${COLORS.border}`, borderRadius: 999, padding: '6px 12px', color: COLORS.subtext, fontSize: 13 }}>
            Powered by Claude AI
          </div>
          <h1 style={{ fontSize: 'clamp(34px, 6vw, 56px)', lineHeight: 1.05, margin: '18px 0 14px', fontWeight: 800 }}>
            Your AI data analyst.
            <br />
            Upload data, ask questions, get answers.
          </h1>
          <p style={{ color: COLORS.subtext, maxWidth: 760, fontSize: 18, lineHeight: 1.6, margin: 0 }}>
            No Excel. No training. No analyst needed. Upload any CSV or spreadsheet and ask Claude anything about your data.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
            <Link to="/signup" style={{ background: COLORS.accent, color: '#fff', padding: '12px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Start free →</Link>
            <Link to="/pricing" style={{ border: `0.5px solid ${COLORS.border}`, color: COLORS.text, padding: '12px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 500 }}>See it in action →</Link>
          </div>
          <p style={{ color: COLORS.subtext, marginTop: 16 }}>Join teams using Analytics Shorts to replace hours of Excel work</p>
        </section>

        <section style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {featureCards.map((card) => (
            <article key={card.title} style={{ flex: '1 1 280px', background: COLORS.card, border: `0.5px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
              <div style={{ color: '#93c5fd' }}>{card.icon}</div>
              <h3 style={{ margin: '14px 0 8px', fontSize: 20 }}>{card.title}</h3>
              <p style={{ margin: 0, color: COLORS.subtext, lineHeight: 1.6 }}>{card.body}</p>
            </article>
          ))}
        </section>

        <section style={{ marginTop: 28, background: '#111827', border: `0.5px solid ${COLORS.border}`, borderRadius: 12, padding: '16px 18px', color: COLORS.subtext, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>$145B+ analyzed</span>
          <span>|</span>
          <span>5 chart types</span>
          <span>|</span>
          <span>Federal contracting intelligence</span>
          <span>|</span>
          <span>50MB file support</span>
        </section>

        <section style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: 30, marginBottom: 16 }}>Pricing preview</h2>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {plans.map((plan) => (
              <article
                key={plan.name}
                style={{
                  flex: '1 1 240px',
                  background: plan.highlight ? '#172554' : COLORS.card,
                  border: `0.5px solid ${plan.highlight ? '#3b82f6' : COLORS.border}`,
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 14, color: plan.highlight ? '#93c5fd' : COLORS.subtext }}>{plan.name}</div>
                <div style={{ fontSize: 34, fontWeight: 800, margin: '6px 0 10px' }}>{plan.price}</div>
                <p style={{ color: COLORS.subtext, margin: 0 }}>{plan.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={{ textAlign: 'center', marginTop: 56, padding: '26px 10px' }}>
          <h3 style={{ margin: 0, fontSize: 30 }}>Ready to replace your spreadsheets?</h3>
          <div style={{ marginTop: 18 }}>
            <Link to="/signup" style={{ background: COLORS.green, color: '#fff', padding: '12px 22px', borderRadius: 8, textDecoration: 'none', fontWeight: 700 }}>
              Start free →
            </Link>
          </div>
        </section>
      </div>

      <footer style={{ borderTop: `0.5px solid ${COLORS.border}`, padding: '16px 20px', color: COLORS.subtext }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link to="/privacy" style={{ color: COLORS.subtext, textDecoration: 'none' }}>Privacy</Link>
            <Link to="/terms" style={{ color: COLORS.subtext, textDecoration: 'none' }}>Terms</Link>
            <Link to="/help" style={{ color: COLORS.subtext, textDecoration: 'none' }}>Help</Link>
            <Link to="/contact" style={{ color: COLORS.subtext, textDecoration: 'none' }}>Contact</Link>
          </div>
          <span>© 2026 NM2TECH Analytics Shorts</span>
        </div>
      </footer>
    </div>
  )
}
