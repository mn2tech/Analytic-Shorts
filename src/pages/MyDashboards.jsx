import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Loader from '../components/Loader'
import { getDashboards, deleteDashboard } from '../services/dashboardService'
import { useAuth } from '../contexts/AuthContext'

function MyDashboards() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (user) {
      loadDashboards()
    }
  }, [user])

  const loadDashboards = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDashboards()
      setDashboards(data || [])
    } catch (err) {
      console.error('Error loading dashboards:', err)
      setError('Failed to load dashboards. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLoadDashboard = (dashboard) => {
    // Check if this is a Studio dashboard
    if (dashboard.dashboard_view === 'studio' || dashboard.schema) {
      // Route to Studio dashboard
      navigate(`/studio/${dashboard.id}`)
      return
    }

    // Prepare data in the format expected by Dashboard component
    const dashboardData = {
      data: dashboard.data,
      columns: dashboard.columns,
      numericColumns: dashboard.numeric_columns,
      categoricalColumns: dashboard.categorical_columns,
      dateColumns: dashboard.date_columns,
      selectedNumeric: dashboard.selected_numeric,
      selectedCategorical: dashboard.selected_categorical,
      selectedDate: dashboard.selected_date,
      dashboardView: dashboard.dashboard_view || 'advanced'
    }

    // Store in sessionStorage (same way as file upload)
    sessionStorage.setItem('analyticsData', JSON.stringify(dashboardData))
    navigate('/dashboard')
  }

  const handleDeleteDashboard = async (id, e) => {
    e.stopPropagation() // Prevent loading the dashboard when clicking delete
    
    if (!window.confirm('Are you sure you want to delete this dashboard?')) {
      return
    }

    try {
      setDeletingId(id)
      await deleteDashboard(id)
      // Remove from local state
      setDashboards(dashboards.filter(d => d.id !== id))
    } catch (err) {
      console.error('Error deleting dashboard:', err)
      alert('Failed to delete dashboard. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Loader />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboards</h1>
            <p className="text-gray-600">
              {dashboards.length === 0 
                ? 'No saved dashboards yet' 
                : `${dashboards.length} saved dashboard${dashboards.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create New Dashboard
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={loadDashboards}
              className="ml-4 text-red-800 underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {dashboards.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first dashboard by uploading a file or using example data.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Dashboard
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <div
                key={dashboard.id}
                onClick={() => handleLoadDashboard(dashboard)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {dashboard.name || 'Untitled Dashboard'}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteDashboard(dashboard.id, e)}
                    disabled={deletingId === dashboard.id}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50 disabled:opacity-50"
                    title="Delete dashboard"
                  >
                    {deletingId === dashboard.id ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>
                      {dashboard.data?.length || 0} records
                      {dashboard.columns && ` • ${dashboard.columns.length} columns`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Created {formatDate(dashboard.created_at)}</span>
                  </div>
                  {dashboard.updated_at !== dashboard.created_at && (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Updated {formatDate(dashboard.updated_at)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  {dashboard.dashboard_view === 'studio' || dashboard.schema ? (
                    <span className="text-xs px-2 py-1 bg-purple-50 text-purple-700 rounded">
                      Studio Dashboard
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {dashboard.dashboard_view === 'simple' ? 'Simple View' : 'Advanced View'}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">Click to open →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyDashboards




