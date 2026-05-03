import ProductLayoutShell from './ProductLayoutShell'

const navItems = [
  { to: '/portals/command-centers/best-western', label: 'Best Western', icon: '🏨' },
  { to: '/portals/command-centers/data-center', label: 'Data Center', icon: '🖥️' },
  { to: '/portals/command-centers/kumon', label: 'Kumon', icon: '📚' },
  { to: '/portals/command-centers/motel', label: 'Motel', icon: '🛎️' },
]

function CommandCenterLayout() {
  return <ProductLayoutShell productName="Command Centers" navItems={navItems} />
}

export default CommandCenterLayout
