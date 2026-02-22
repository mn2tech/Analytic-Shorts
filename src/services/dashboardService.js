import apiClient from '../config/api'

// Get all dashboards for the current user
export const getDashboards = async () => {
  try {
    const response = await apiClient.get('/api/dashboards')
    const data = response.data
    return Array.isArray(data) ? data : (data?.dashboards ?? [])
  } catch (error) {
    console.error('Error fetching dashboards:', error)
    throw error
  }
}

// Get a specific dashboard by ID
export const getDashboard = async (id) => {
  try {
    const response = await apiClient.get(`/api/dashboards/${id}`)
    return response.data
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    throw error
  }
}

// Save a new dashboard
export const saveDashboard = async (dashboardData) => {
  try {
    const response = await apiClient.post('/api/dashboards', {
      name: dashboardData.name || 'Untitled Dashboard',
      data: dashboardData.data,
      columns: dashboardData.columns,
      numericColumns: dashboardData.numericColumns,
      categoricalColumns: dashboardData.categoricalColumns,
      dateColumns: dashboardData.dateColumns,
      selectedNumeric: dashboardData.selectedNumeric,
      selectedCategorical: dashboardData.selectedCategorical,
      selectedDate: dashboardData.selectedDate,
      dashboardView: dashboardData.dashboardView,
      opportunityKeyword: dashboardData.opportunityKeyword,
      selectedOpportunityNoticeType: dashboardData.selectedOpportunityNoticeType
    })
    return response.data
  } catch (error) {
    console.error('Error saving dashboard:', error)
    throw error
  }
}

// Update an existing dashboard
export const updateDashboard = async (id, dashboardData) => {
  try {
    const response = await apiClient.put(`/api/dashboards/${id}`, {
      name: dashboardData.name,
      data: dashboardData.data,
      columns: dashboardData.columns,
      numericColumns: dashboardData.numericColumns,
      categoricalColumns: dashboardData.categoricalColumns,
      dateColumns: dashboardData.dateColumns,
      selectedNumeric: dashboardData.selectedNumeric,
      selectedCategorical: dashboardData.selectedCategorical,
      selectedDate: dashboardData.selectedDate,
      dashboardView: dashboardData.dashboardView,
      opportunityKeyword: dashboardData.opportunityKeyword,
      selectedOpportunityNoticeType: dashboardData.selectedOpportunityNoticeType
    })
    return response.data
  } catch (error) {
    console.error('Error updating dashboard:', error)
    throw error
  }
}

// Delete a dashboard
export const deleteDashboard = async (id) => {
  try {
    const response = await apiClient.delete(`/api/dashboards/${id}`)
    return response.data
  } catch (error) {
    console.error('Error deleting dashboard:', error)
    throw error
  }
}




