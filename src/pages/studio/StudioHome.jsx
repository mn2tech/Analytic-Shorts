import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'

function StudioHome() {
  const navigate = useNavigate()
  const [dashboards] = useState([
    { id: '1', name: 'Sample Dashboard 1', lastModified: '2024-01-15' },
    { id: '2', name: 'Sample Dashboard 2', lastModified: '2024-01-14' },
  ])

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

        {/* Dashboards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dashboard) => (
            <div
              key={dashboard.id}
              onClick={() => navigate(`/studio/${dashboard.id}`)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {dashboard.name}
              </h3>
              <p className="text-sm text-gray-500">
                Last modified: {dashboard.lastModified}
              </p>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {dashboards.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No dashboards yet</p>
            <button
              onClick={() => navigate('/studio/new')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              Create Your First Dashboard
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}

export default StudioHome
