import ProductLayoutShell from './ProductLayoutShell'

const navItems = [
  { to: '/studio/chat', label: 'AAI Studio', icon: '🤖' },
  { to: '/studio/sas-to-pyspark', label: 'SAS Migration', icon: '🔁' },
  { to: '/studio/migration-validation', label: 'Migration Validation', icon: '🧪' },
  { to: '/studio/responsible-ai', label: 'Responsible AI', icon: '🛡️' },
]

function AIStudioLayout() {
  return <ProductLayoutShell productName="AI Studio" navItems={navItems} />
}

export default AIStudioLayout

