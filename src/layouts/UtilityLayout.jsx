import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

/** Top bar + content (used for Help, Pricing, Training) — same pattern as AppLayout, no extra chrome. */
function UtilityLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="border-b border-gray-200 bg-white shrink-0">
        <Navbar brandTo="/hub" />
      </div>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default UtilityLayout
