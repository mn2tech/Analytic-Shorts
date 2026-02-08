import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getDashboard } from '../../studio/api/studioClient'
import { normalizeSchema, isPublished, getPage, isDashboardSpec } from '../../studio/utils/schemaUtils'
import AppShell from '../../studio/ui/AppShell'
import PageRenderer from '../../studio/ui/PageRenderer'
import DashboardRenderer from '../../components/aiVisualBuilder/DashboardRenderer'
import Navbar from '../../components/Navbar'
import apiClient from '../../config/api'

/**
 * StudioAppView - View-only mode for published apps.
 * Renders DashboardSpec with DashboardRenderer, or legacy pages with PageRenderer.
 */
export default function StudioAppView() {
  const { id, pageId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [schema, setSchema] = useState(null)
  const [currentPageId, setCurrentPageId] = useState(null)
  const [globalFilters, setGlobalFilters] = useState({})
  const [filterValues, setFilterValues] = useState({})
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fullScreen, setFullScreen] = useState(false)

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

        if (isDashboardSpec(normalized)) {
          setCurrentPageId(null)
          setGlobalFilters({})
          const initialFilters = {}
          searchParams.forEach((value, key) => {
            if (key.startsWith('filter_')) {
              initialFilters[key.replace('filter_', '')] = value
            }
          })
          setFilterValues(initialFilters)
        } else {
          const initialPageId = pageId || normalized.pages?.[0]?.id || 'default'
          const page = getPage(normalized, initialPageId)
          setCurrentPageId(page ? page.id : normalized.pages?.[0]?.id || 'default')
          const filters = {}
          searchParams.forEach((value, key) => {
            if (key.startsWith('filter_')) filters[key.replace('filter_', '')] = value
          })
          setGlobalFilters(filters)
        }
      } catch (err) {
        console.error('Error loading app:', err)
        setError(err.message || 'Failed to load app')
      } finally {
        setLoading(false)
      }
    }

    loadApp()
  }, [id, pageId, searchParams])

  // Load data for DashboardSpec
  useEffect(() => {
    if (!schema || !isDashboardSpec(schema)) {
      setData(null)
      return
    }
    const datasetId = schema.datasetId || 'sales'
    setData(null)
    apiClient.get('/api/ai/dataset-data', { params: { dataset: datasetId } }).then((res) => {
      if (res.data?.data) setData(res.data.data)
    }).catch(() => setData(null))
  }, [schema])

  const handlePageChange = (newPageId) => {
    setCurrentPageId(newPageId)
    navigate(`/apps/${id}/${newPageId}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, { replace: true })
  }

  const handleFilterChange = (filters) => {
    setGlobalFilters(filters)
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== 'All') {
        params.set(`filter_${key}`, String(value))
      }
    })
    navigate(`/apps/${id}/${currentPageId || ''}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true })
  }

  const handleDashboardSpecFilterChange = (next) => {
    setFilterValues(next)
    const params = new URLSearchParams()
    Object.entries(next).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== 'All' && value !== '') {
        if (typeof value === 'object') {
          if (value.start) params.set(`filter_${key}_start`, value.start)
          if (value.end) params.set(`filter_${key}_end`, value.end)
        } else {
          params.set(`filter_${key}`, String(value))
        }
      }
    })
    navigate(`/apps/${id}${params.toString() ? `?${params.toString()}` : ''}`, { replace: true })
  }

  const handleDrilldown = (targetPageId, filters) => {
    setCurrentPageId(targetPageId)
    setGlobalFilters(filters || {})
    const params = new URLSearchParams()
    Object.entries(filters || {}).forEach(([key, value]) => {
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

  // New schema: DashboardSpec
  if (isDashboardSpec(schema)) {
    const wrapperClass = fullScreen
      ? 'fixed inset-0 z-40 bg-gray-50 flex flex-col overflow-hidden'
      : 'min-h-screen bg-gray-50'
    return (
      <div className={wrapperClass}>
        {!fullScreen && <Navbar />}
        <div className={fullScreen ? 'flex-1 flex flex-col overflow-hidden p-4' : 'max-w-5xl mx-auto px-4 py-6'}>
          <div className="flex items-center justify-between gap-3 mb-4 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{schema.title || 'Dashboard'}</h1>
              {published && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Published
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setFullScreen((f) => !f)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 shrink-0"
              title={fullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {fullScreen ? 'Exit full screen' : 'Full screen'}
            </button>
          </div>
          <div className={fullScreen ? 'flex-1 min-h-0 overflow-auto' : undefined}>
            <DashboardRenderer
              spec={schema}
              data={data}
              filterValues={filterValues}
              onFilterChange={handleDashboardSpecFilterChange}
            />
          </div>
        </div>
      </div>
    )
  }

  // Legacy: pages + PageRenderer
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
