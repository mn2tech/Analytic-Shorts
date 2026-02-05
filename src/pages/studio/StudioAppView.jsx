import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getDashboard } from '../../studio/api/studioClient'
import { normalizeSchema, isPublished, getPage } from '../../studio/utils/schemaUtils'
import AppShell from '../../studio/ui/AppShell'
import PageRenderer from '../../studio/ui/PageRenderer'

/**
 * StudioAppView - View-only mode for published apps
 * Read-only access for consumers/managers
 */
export default function StudioAppView() {
  const { id, pageId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [schema, setSchema] = useState(null)
  const [currentPageId, setCurrentPageId] = useState(null)
  const [globalFilters, setGlobalFilters] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load app schema
  useEffect(() => {
    const loadApp = async () => {
      try {
        setLoading(true)
        setError(null)

        const dashboardSchema = await getDashboard(id)
        if (!dashboardSchema) {
          setError('App not found')
          return
        }

        const normalized = normalizeSchema(dashboardSchema)
        setSchema(normalized)

        // Determine initial page
        const initialPageId = pageId || normalized.pages[0]?.id || 'default'
        const page = getPage(normalized, initialPageId)
        if (page) {
          setCurrentPageId(page.id)
        } else {
          setCurrentPageId(normalized.pages[0]?.id || 'default')
        }

        // Load filters from URL
        const filters = {}
        searchParams.forEach((value, key) => {
          if (key.startsWith('filter_')) {
            const filterId = key.replace('filter_', '')
            filters[filterId] = value
          }
        })
        setGlobalFilters(filters)
      } catch (err) {
        console.error('Error loading app:', err)
        setError(err.message || 'Failed to load app')
      } finally {
        setLoading(false)
      }
    }

    loadApp()
  }, [id, pageId, searchParams])

  // Handle page change
  const handlePageChange = (newPageId) => {
    setCurrentPageId(newPageId)
    navigate(`/apps/${id}/${newPageId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, { replace: true })
  }

  // Handle filter change
  const handleFilterChange = (filters) => {
    setGlobalFilters(filters)
    // Update URL with filters
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== 'All') {
        params.set(`filter_${key}`, String(value))
      }
    })
    navigate(`/apps/${id}/${currentPageId}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true })
  }

  // Handle drilldown navigation
  const handleDrilldown = (targetPageId, filters) => {
    setCurrentPageId(targetPageId)
    setGlobalFilters(filters)
    // Update URL with filters
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== 'All') {
        params.set(`filter_${key}`, String(value))
      }
    })
    navigate(`/apps/${id}/${targetPageId}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <div className="text-gray-600">Loading app...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  if (!schema) {
    return null
  }

  const published = isPublished(schema)

  return (
    <AppShell
      schema={schema}
      currentPageId={currentPageId}
      onPageChange={handlePageChange}
      isPublished={published}
    >
      <PageRenderer
        schema={schema}
        pageId={currentPageId}
        globalFilters={globalFilters}
        onFilterChange={handleFilterChange}
        onDrilldown={handleDrilldown}
        isReadOnly={true}
      />
    </AppShell>
  )
}
