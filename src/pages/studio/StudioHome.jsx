import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import { listDashboards, deleteDashboard } from '../../studio/api/studioClient'

function StudioHome() {
  const navigate = useNavigate()
  const [dashboards, setDashboards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    loadDashboards()
  }, [])

  const loadDashboards = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listDashboards()
      
      // Parse schema to check for templates and determine if multi-page
      const parsedData = data.map(dashboard => {
        try {
          const schema = typeof dashboard.schema === 'string' 
            ? JSON.parse(dashboard.schema) 
            : dashboard.schema
          
          // Check if it's a true multi-page app (more than 1 page, or has app_id/app_title indicating v2.0)
          // Single-page dashboards that were normalized will have 1 page, but shouldn't be treated as multi-page
          const isMultiPage = (schema?.pages && schema.pages.length > 1) || 
                             (schema?.app_id && schema?.app_title && schema?.pages && schema.pages.length > 0)
          
          return {
            ...dashboard,
            schema,
            isTemplate: schema?.metadata?.is_template || false,
            isMultiPage: isMultiPage
          }
        } catch {
          return { ...dashboard, isTemplate: false, isMultiPage: false }
        }
      })
      
      setDashboards(parsedData)
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

  const handleUseTemplate = async (templateId) => {
    try {
      // Load template schema
      const { getDashboard } = await import('../../studio/api/studioClient')
      const templateSchema = await getDashboard(templateId)
      
      if (!templateSchema) {
        alert('Template not found')
        return
      }

      // Create new app from template
      const { saveDashboard } = await import('../../studio/api/studioClient')
      const newSchema = {
        ...templateSchema,
        app_id: undefined,
        metadata: {
          ...templateSchema.metadata,
          id: undefined,
          name: `${templateSchema.metadata?.name || 'Untitled'} (Copy)`,
          status: 'draft',
          is_template: false,
          published_at: undefined
        }
      }

      const saved = await saveDashboard(newSchema, null)
      navigate(`/studio/app/${saved.id}`)
    } catch (err) {
      console.error('Error using template:', err)
      alert(err.message || 'Failed to create app from template')
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
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/studio/new')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              + Create New Dashboard
            </button>
            <button
              onClick={() => navigate('/studio/app/new')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              + Create Multi-Page App
            </button>
            <Link
              to="/"
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-center"
            >
              Back to Analytics Shorts
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showTemplates
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showTemplates ? 'Show All' : 'Show Templates'}
            </button>
          </div>
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
        {!loading && (() => {
          const filteredDashboards = showTemplates
            ? dashboards.filter(d => d.isTemplate)
            : dashboards.filter(d => !d.isTemplate)
          
          if (filteredDashboards.length > 0) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDashboards.map((dashboard) => (
                  <div
                    key={dashboard.id}
                    className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow relative group ${
                      dashboard.isTemplate ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200'
                    }`}
                  >
                    {dashboard.isTemplate && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                          </svg>
                          Template
                        </span>
                      </div>
                    )}
                    <div
                      onClick={() => {
                        if (dashboard.isTemplate) {
                          handleUseTemplate(dashboard.id)
                        } else {
                          // Check if it's a true multi-page app
                          if (dashboard.isMultiPage) {
                            navigate(`/studio/app/${dashboard.id}`)
                          } else {
                            navigate(`/studio/${dashboard.id}`)
                          }
                        }
                      }}
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
                      {dashboard.schema?.pages && dashboard.schema.pages.length > 1 && (
                        <p className="text-xs text-indigo-600 mt-1">
                          {dashboard.schema.pages.length} pages
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {dashboard.isTemplate ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleUseTemplate(dashboard.id)
                          }}
                          className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm font-medium"
                        >
                          Use Template
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (dashboard.isMultiPage) {
                                navigate(`/studio/app/${dashboard.id}`)
                              } else {
                                navigate(`/studio/${dashboard.id}`)
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, dashboard.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          } else {
            return (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {showTemplates ? 'No templates found' : 'No dashboards found'}
                </p>
                <button
                  onClick={() => navigate('/studio/new')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Create Your First Dashboard
                </button>
              </div>
            )
          }
        })()}

      </div>
      <Footer />
    </div>
  )
}

export default StudioHome
