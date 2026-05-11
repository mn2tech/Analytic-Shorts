import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Unauthorized from './pages/Unauthorized'
import PortalHome from './pages/PortalHome'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/" element={<PortalHome />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
