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
import AdminAnalytics from './pages/AdminAnalytics'
import StudioHome from './pages/studio/StudioHome'
import StudioDashboard from './pages/studio/StudioDashboard'
import StudioAppEditor from './pages/studio/StudioAppEditor'
import StudioAppView from './pages/studio/StudioAppView'

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
          path="/admin/analytics"
          element={
            <ProtectedRoute>
              <AdminAnalytics />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/studio"
          element={
            <ProtectedRoute>
              <StudioHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/:dashboardId"
          element={
            <ProtectedRoute>
              <StudioDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/app/:id"
          element={
            <ProtectedRoute>
              <StudioAppEditor />
            </ProtectedRoute>
          }
        />
        <Route path="/apps/:id" element={<StudioAppView />} />
        <Route path="/apps/:id/:pageId" element={<StudioAppView />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

