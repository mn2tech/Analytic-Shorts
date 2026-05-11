import { Navigate, Route, Routes } from 'react-router-dom'
import PortalLogin from './pages/Login'
import PortalAuthCallback from './pages/AuthCallback'
import PortalUnauthorized from './pages/Unauthorized'
import PortalHome from './pages/PortalHome'

export default function PortalRoutes() {
  return (
    <Routes>
      <Route path="login" element={<PortalLogin />} />
      <Route path="auth/callback" element={<PortalAuthCallback />} />
      <Route path="unauthorized" element={<PortalUnauthorized />} />
      <Route path="" element={<PortalHome />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  )
}

