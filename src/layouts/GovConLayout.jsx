import ProductLayoutShell from './ProductLayoutShell'

const navItems = [
  { to: '/govcon/federal-entry', label: 'Federal Entry', icon: '📋' },
  { to: '/govcon/briefs', label: 'Federal Entry Briefs', icon: '📑' },
  { to: '/govcon/govcon4pack', label: 'GovCon 4-Pack', icon: '🏛️' },
]

function GovConLayout() {
  return <ProductLayoutShell productName="GovCon Intelligence" navItems={navItems} />
}

export default GovConLayout

