import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Loader from './Loader'

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Loader />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute




