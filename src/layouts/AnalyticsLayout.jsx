import ProductLayoutShell from './ProductLayoutShell'

const navItems = [
  { to: '/analytics', label: 'Get started', icon: '🚀', end: true },
  { to: '/analytics/dashboard', label: 'Dashboard', icon: '📈' },
  { to: '/analytics/dashboards', label: 'My Dashboards', icon: '📋' },
  { to: '/analytics/studio', label: 'AI Visual Builder Studio', icon: '🎨' },
  { to: '/analytics/feed', label: 'Feed', icon: '📰' },
  { to: '/analytics/live', label: 'Live', icon: '🎥' },
  { to: '/help', label: 'Help', icon: '❓' },
  { to: '/profile', label: 'Profile', icon: '👤' },
]

function AnalyticsLayout() {
  return <ProductLayoutShell productName="Analytics Shorts" navItems={navItems} />
}

export default AnalyticsLayout

