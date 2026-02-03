import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { listDashboards, deleteDashboard } from '../api/studioClient'

function StudioHome() {
  const navigate = useNavigate()
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboards()
  }, [])

  const loadDashboards = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listDashboards()
      setDashboards(data)
    } catch (err) {
      console.error('Error loading dashboards:', err)
      setError(err.message || 'Failed to load dashboards')
      // If auth error, still show empty state (user can sign in)
      if (err.message?.includes('Authentication')) {
        setDashboards([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e, dashboardId) => {
    e.stopPropagation() // Prevent navigation
    if (!window.confirm('Are you sure you want to delete this dashboard?')) {
      return
    }
    
    try {
      await deleteDashboard(dashboardId)
      // Reload dashboards
      await loadDashboards()
    } catch (err) {
      alert(err.message || 'Failed to delete dashboard')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Analytics Shorts Studio
          </h1>
          <p className="text-lg text-gray-600">
            Create and manage advanced analytics dashboards
          </p>
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => navigate('/studio/new')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            + Create New Dashboard
          </button>
          <Link
            to="/"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-center"
          >
            Back to Analytics Shorts
          </Link>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading dashboards...</div>
          </div>
        )}

        {/* Dashboards Grid */}
        {!loading && (
          <>
            {dashboards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dashboards.map((dashboard) => (
                  <div
                    key={dashboard.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow relative group"
                  >
                    <div
                      onClick={() => navigate(`/studio/${dashboard.id}`)}
                      className="cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {dashboard.name || 'Untitled Dashboard'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-1">
                        {dashboard.schema?.metadata?.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Last modified: {formatDate(dashboard.updated_at || dashboard.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, dashboard.id)}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 p-1"
                      title="Delete dashboard"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-500 mb-4">
                  {error?.includes('Authentication') 
                    ? 'Please sign in to view your dashboards'
                    : 'No dashboards yet'}
                </p>
                <button
                  onClick={() => navigate('/studio/new')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Create Your First Dashboard
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default StudioHome
