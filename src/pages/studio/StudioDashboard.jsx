import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Navbar from '../../components/Navbar'

function StudioDashboard() {
  const { dashboardId } = useParams()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading dashboard data
    // In a real implementation, this would fetch from an API
    setTimeout(() => {
      setDashboard({
        id: dashboardId,
        name: `Dashboard ${dashboardId}`,
        description: 'Studio dashboard workspace'
      })
      setLoading(false)
    }, 500)
  }, [dashboardId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading dashboard...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/studio')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Studio
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              {dashboard?.name || 'Studio Dashboard'}
            </h1>
            {dashboard?.description && (
              <p className="text-gray-600 mt-1">{dashboard.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4 sm:mt-0">
            <button
              onClick={() => navigate('/studio')}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => navigate('/studio')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Publish
            </button>
          </div>
        </div>

        {/* Dashboard Workspace */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 min-h-[600px]">
          <div className="text-center text-gray-500 py-20">
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Studio Dashboard Workspace
            </h2>
            <p className="text-gray-500">
              Dashboard ID: {dashboardId}
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Studio features coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudioDashboard
