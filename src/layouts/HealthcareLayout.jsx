import ProductLayoutShell from './ProductLayoutShell'

const navItems = [
  { to: '/healthcare/floormap', label: 'FloorMap AI', icon: '🗺️' },
  { to: '/healthcare/er-map', label: 'ER Map', icon: '🏥' },
  { to: '/healthcare/bed-tracking', label: 'Bed Tracking', icon: '🛏️' },
]

function HealthcareLayout() {
  return <ProductLayoutShell productName="Healthcare AI" navItems={navItems} />
}

export default HealthcareLayout

