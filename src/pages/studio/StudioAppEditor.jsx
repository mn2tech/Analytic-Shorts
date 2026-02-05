import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDashboard, saveDashboard } from '../../studio/api/studioClient'
import { normalizeSchema, isPublished } from '../../studio/utils/schemaUtils'
import AppShell from '../../studio/ui/AppShell'
import PageRenderer from '../../studio/ui/PageRenderer'
import apiClient from '../../config/api'

/**
 * StudioAppEditor - Editor mode for multi-page apps
 * Allows editing schema, adding pages/widgets, and publishing
 */
export default function StudioAppEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [schema, setSchema] = useState(null)
  const [currentPageId, setCurrentPageId] = useState(null)
  const [globalFilters, setGlobalFilters] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Load app schema
  useEffect(() => {
    const loadApp = async () => {
      try {
        setLoading(true)
        setError(null)

        if (id === 'new') {
          // Create new app from sample
          const sampleApp = await import('../../studio/examples/sample_app_2page.json')
          const normalized = normalizeSchema(sampleApp.default)
          setSchema(normalized)
          setCurrentPageId(normalized.pages[0]?.id || 'default')
        } else {
          // Load existing app
          const dashboardSchema = await getDashboard(id)
          if (!dashboardSchema) {
            setError('App not found')
            return
          }

          // Check if published (should redirect to view mode)
          if (isPublished(dashboardSchema)) {
            navigate(`/apps/${id}`, { replace: true })
            return
          }

          const normalized = normalizeSchema(dashboardSchema)
          setSchema(normalized)
          // Get initial page from URL or use first page
          const urlParams = new URLSearchParams(window.location.search)
          const pageParam = urlParams.get('page')
          setCurrentPageId(pageParam || normalized.pages[0]?.id || 'default')
        }
      } catch (err) {
        console.error('Error loading app:', err)
        setError(err.message || 'Failed to load app')
      } finally {
        setLoading(false)
      }
    }

    loadApp()
  }, [id, navigate])

  // Handle save
  const handleSave = async () => {
    if (!schema) return

    try {
      setSaving(true)
      const saved = await saveDashboard(schema, id === 'new' ? null : id)
      if (id === 'new' && saved?.id) {
        navigate(`/studio/app/${saved.id}`, { replace: true })
      }
      // Show success message (could use a toast library)
      console.log('App saved successfully')
    } catch (err) {
      console.error('Error saving app:', err)
      setError(err.message || 'Failed to save app')
    } finally {
      setSaving(false)
    }
  }

  // Handle duplicate app
  const handleDuplicate = async () => {
    if (!schema) return

    try {
      setSaving(true)
      
      // Generate new ID and update metadata
      const newSchema = {
        ...schema,
        app_id: undefined, // Will be generated on save
        metadata: {
          ...schema.metadata,
          id: undefined, // Will be generated on save
          name: `${schema.metadata?.name || 'Untitled App'} (Copy)`,
          description: schema.metadata?.description || '',
          status: 'draft',
          version: '1.0.0',
          published_at: undefined,
          is_template: false
        }
      }

      // Save as new dashboard
      const saved = await saveDashboard(newSchema, null)
      
      // Navigate to new app
      navigate(`/studio/app/${saved.id}`, { replace: true })
    } catch (err) {
      console.error('Error duplicating app:', err)
      setError(err.message || 'Failed to duplicate app')
    } finally {
      setSaving(false)
    }
  }

  // Handle save as template
  const handleSaveAsTemplate = async () => {
    if (!schema) return

    try {
      setSaving(true)
      
      // Update schema to mark as template
      const templateSchema = {
        ...schema,
        metadata: {
          ...schema.metadata,
          is_template: true,
          name: schema.metadata?.name || 'Untitled Template',
          description: schema.metadata?.description || 'A reusable app template'
        }
      }

      // Save template
      await saveDashboard(templateSchema, id === 'new' ? null : id)
      
      // Show success message
      alert('App saved as template! Others can now use this as a starting point.')
    } catch (err) {
      console.error('Error saving template:', err)
      setError(err.message || 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  // Handle publish
  const handlePublish = async () => {
    if (!schema) return

    try {
      setSaving(true)
      
      // Update schema metadata
      const updatedSchema = {
        ...schema,
        metadata: {
          ...schema.metadata,
          status: 'published',
          version: schema.metadata?.version || '1.0.0',
          published_at: new Date().toISOString()
        }
      }

      // Call publish endpoint
      const response = await apiClient.post(`/api/dashboards/${id}/publish`, {
        schema: updatedSchema
      })

      // Redirect to view mode
      navigate(`/apps/${id}`, { replace: true })
    } catch (err) {
      console.error('Error publishing app:', err)
      setError(err.message || 'Failed to publish app')
    } finally {
      setSaving(false)
    }
  }

  // Handle page change
  const handlePageChange = (pageId) => {
    setCurrentPageId(pageId)
    // Update URL without navigation
    window.history.replaceState({}, '', `/studio/app/${id}?page=${pageId}`)
  }

  // Handle filter change
  const handleFilterChange = (filters) => {
    setGlobalFilters(filters)
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
    window.history.replaceState({}, '', `/studio/app/${id}?page=${targetPageId}&${params.toString()}`)
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
            onClick={() => navigate('/studio')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Studio
          </button>
        </div>
      </div>
    )
  }

  if (!schema) {
    return null
  }

  return (
    <AppShell
      schema={schema}
      currentPageId={currentPageId}
      onPageChange={handlePageChange}
      onSave={handleSave}
      onPublish={handlePublish}
      onDuplicate={id !== 'new' ? handleDuplicate : null}
      onSaveAsTemplate={handleSaveAsTemplate}
      isPublished={false}
      isSaving={saving}
    >
      <PageRenderer
        schema={schema}
        pageId={currentPageId}
        globalFilters={globalFilters}
        onFilterChange={handleFilterChange}
        onDrilldown={handleDrilldown}
        isReadOnly={false}
      />
    </AppShell>
  )
}
