import apiClient from '../../config/api'

/**
 * Studio API Client
 * Functions to interact with the dashboard CRUD endpoints for Studio dashboards
 */

function truncateRowsForStorage(rows, { maxRows = 2000, maxBytes = 600_000 } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return []

  const sliced = rows.slice(0, Math.max(0, maxRows))
  try {
    const json = JSON.stringify(sliced)
    if (json.length <= maxBytes) return sliced
  } catch (_) {
    // If rows aren't serializable, don't store them.
    return []
  }

  // If we exceeded maxBytes, keep shrinking until we fit (simple halving loop).
  let lo = 0
  let hi = sliced.length
  let best = 0
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    try {
      const json = JSON.stringify(sliced.slice(0, mid))
      if (json.length <= maxBytes) {
        best = mid
        lo = mid + 1
      } else {
        hi = mid - 1
      }
    } catch (_) {
      hi = mid - 1
    }
  }
  return sliced.slice(0, best)
}

/**
 * List all saved Studio dashboards
 * @returns {Promise<Array>} Array of dashboard objects
 */
export async function listDashboards() {
  try {
    const response = await apiClient.get('/api/dashboards')
    // Filter for Studio dashboards (dashboard_view === 'studio' or has schema)
    const studioDashboards = (response.data || []).filter(dashboard => 
      dashboard.dashboard_view === 'studio' || dashboard.schema
    )
    return studioDashboards
  } catch (error) {
    console.error('Error listing dashboards:', error)
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in to view your dashboards.')
    }
    throw error
  }
}

/**
 * Get a specific dashboard by ID
 * @param {string} id - Dashboard ID
 * @returns {Promise<Object>} Dashboard object with schema
 */
export async function getDashboard(id) {
  try {
    const response = await apiClient.get(`/api/dashboards/${id}`)
    const dashboard = response.data
    
    // If dashboard has a schema field, parse and return it
    if (dashboard.schema) {
      try {
        // Schema might be stored as JSON string or object
        if (typeof dashboard.schema === 'string') {
          const parsed = JSON.parse(dashboard.schema)
          console.log('Parsed schema from string:', parsed)
          return parsed
        }
        console.log('Schema is already an object:', dashboard.schema)
        return dashboard.schema
      } catch (error) {
        console.error('Error parsing dashboard schema:', error)
        console.error('Schema value:', dashboard.schema)
        return null
      }
    }
    
    // For Studio dashboards without schema, return null (will fallback to sample)
    if (dashboard.dashboard_view === 'studio') {
      console.warn('Studio dashboard has no schema field')
      return null
    }
    
    return null
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    if (error.response?.status === 404) {
      throw new Error('Dashboard not found')
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in to view this dashboard.')
    }
    throw error
  }
}

/**
 * Save a dashboard schema
 * @param {Object} dashboardJson - The complete Studio dashboard schema JSON
 * @param {string} dashboardId - Optional dashboard ID for updates (if not provided, creates new)
 * @param {Object} options
 * @param {Array<Object>} options.data - Optional data rows to store for sharing
 * @returns {Promise<Object>} Saved dashboard object
 */
export async function saveDashboard(dashboardJson, dashboardId = null, options = {}) {
  try {
    const dashboardName = dashboardJson.metadata?.name || dashboardJson.title || 'Untitled Dashboard'
    const dashboardDescription = dashboardJson.metadata?.description || ''

    const rowsToStore = truncateRowsForStorage(options?.data, { maxRows: 2000, maxBytes: 600_000 })

    // Prepare the payload
    // Note: The backend may need to be updated to support the 'schema' field
    // For now, we'll send it and it will be stored if the database column exists
    const payload = {
      name: dashboardName,
      // For Studio dashboards we also store a safe/truncated copy of rows,
      // so public sharing from "My Dashboards" can render without auth.
      data: rowsToStore,
      columns: [],
      numericColumns: [],
      categoricalColumns: [],
      dateColumns: [],
      selectedNumeric: null,
      selectedCategorical: null,
      selectedDate: null,
      dashboardView: 'studio',
      schema: dashboardJson // Backend will handle JSON stringification
    }
    
    let response
    if (dashboardId && dashboardId !== 'new') {
      // Update existing dashboard
      response = await apiClient.put(`/api/dashboards/${dashboardId}`, payload)
    } else {
      // Create new dashboard
      response = await apiClient.post('/api/dashboards', payload)
    }
    
    return response.data
  } catch (error) {
    console.error('Error saving dashboard:', error)
    console.error('Error response:', error.response?.data)
    console.error('Error status:', error.response?.status)
    
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in to save dashboards.')
    }
    if (error.response?.status === 403) {
      throw new Error('Dashboard limit reached. Please upgrade your plan or delete existing dashboards.')
    }
    if (error.response?.status === 500) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Server error occurred'
      throw new Error(`Failed to save dashboard: ${errorMessage}`)
    }
    throw new Error(error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to save dashboard')
  }
}

/**
 * Delete a dashboard
 * @param {string} id - Dashboard ID
 * @returns {Promise<void>}
 */
export async function deleteDashboard(id) {
  try {
    await apiClient.delete(`/api/dashboards/${id}`)
  } catch (error) {
    console.error('Error deleting dashboard:', error)
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in to delete dashboards.')
    }
    throw error
  }
}
