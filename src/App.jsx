import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import SharedDashboard from './pages/SharedDashboard'
import MyDashboards from './pages/MyDashboards'
import Pricing from './pages/Pricing'
import Help from './pages/Help'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

// Track page views for Google Analytics
function PageViewTracker() {
  const location = useLocation()

  useEffect(() => {
    // Track page view if Google Analytics is loaded
    if (window.gtag) {
      window.gtag('config', 'G-XXXXXXXXXX', {
        page_path: location.pathname + location.search
      })
    }
  }, [location])

  return null
}

function App() {
  return (
    <AuthProvider>
      <PageViewTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/help" element={<Help />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route
          path="/dashboards"
          element={
            <ProtectedRoute>
              <MyDashboards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard/shared/:shareId" element={<SharedDashboard />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

