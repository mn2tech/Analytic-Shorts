import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loader from './Loader'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Loader />
      </div>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace state={{ from: location }} />
  }

  return children
}

export default ProtectedRoute




