import { Routes, Route, Outlet, useLocation, Navigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { PortraitModeProvider } from './contexts/PortraitModeContext'
import ProtectedRoute from './components/ProtectedRoute'
import BrandWatermark from './components/BrandWatermark'
import PortraitFrame from './components/PortraitFrame'
import AppLayout from './layouts/AppLayout'
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
import StudioDashboard from './pages/studio/StudioDashboard'
import StudioAppView from './pages/studio/StudioAppView'
import AiVisualBuilderStudio from './pages/AiVisualBuilderStudio'

/** Redirect /studio to /studio/chat, preserving search (e.g. ?open=:id). */
function StudioIndexRedirect() {
  const location = useLocation()
  return <Navigate to={`/studio/chat${location.search || ''}`} replace />
}

/** Redirect /studio/app/:id to /studio/chat?open=:id so AI Visual Builder can load that dashboard. */
function NavigateToStudioWithOpen() {
  const { id } = useParams()
  return <Navigate to={{ pathname: '/studio/chat', search: id ? `?open=${id}` : '' }} replace />
}

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
    <PortraitModeProvider>
      <AuthProvider>
        <PortraitFrame>
          <PageViewTracker />
          <Routes>
            {/* Routes WITHOUT layout (no sidebar): login, signup, public share, app view. SharedDashboard stays minimal. */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard/shared/:shareId" element={<SharedDashboard />} />
            <Route path="/apps/:id" element={<StudioAppView />} />
            <Route path="/apps/:id/:pageId" element={<StudioAppView />} />
            <Route path="/ai-visual-builder" element={<Navigate to="/studio" replace />} />

            {/* Routes WITH layout (sidebar + Navbar + Footer) */}
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
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
              <Route path="/studio" element={<Outlet />}>
                <Route index element={<StudioIndexRedirect />} />
                <Route
                  path="app/:id"
                  element={
                    <ProtectedRoute>
                      <NavigateToStudioWithOpen />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="chat"
                  element={
                    <ProtectedRoute>
                      <AiVisualBuilderStudio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="data"
                  element={
                    <ProtectedRoute>
                      <AiVisualBuilderStudio />
                    </ProtectedRoute>
                  }
                />
                <Route path="build" element={<Navigate to="/studio/preview" replace />} />
                <Route
                  path="preview"
                  element={
                    <ProtectedRoute>
                      <AiVisualBuilderStudio />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path=":dashboardId"
                  element={
                    <ProtectedRoute>
                      <StudioDashboard />
                    </ProtectedRoute>
                  }
                />
              </Route>
            </Route>
          </Routes>
          <BrandWatermark />
        </PortraitFrame>
      </AuthProvider>
    </PortraitModeProvider>
  )
}

export default App
