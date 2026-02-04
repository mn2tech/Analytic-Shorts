// Utility functions for sharing dashboards
import apiClient from '../config/api'

export const generateShareId = () => {
  return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const saveSharedDashboard = async (shareId, dashboardData) => {
  try {
    // First save to backend (database)
    try {
      const response = await apiClient.post('/api/shared', {
        shareId,
        dashboardData
      })
      console.log('Shared dashboard saved to backend:', response.data)
    } catch (backendError) {
      console.error('Error saving to backend, falling back to localStorage:', backendError)
      // Fallback to localStorage if backend fails
    }

    // Also save to localStorage as backup
    const shareData = {
      ...dashboardData,
      sharedAt: new Date().toISOString(),
      shareId,
    }
    localStorage.setItem(`shared_dashboard_${shareId}`, JSON.stringify(shareData))
    return true
  } catch (error) {
    console.error('Error saving shared dashboard:', error)
    return false
  }
}

export const loadSharedDashboard = async (shareId) => {
  try {
    // First try to load from backend
    try {
      const response = await apiClient.get(`/api/shared/${shareId}`)
      console.log('Backend response:', response.data)
      if (response.data && response.data.dashboardData) {
        console.log('Loaded shared dashboard from backend')
        console.log('Dashboard data type:', typeof response.data.dashboardData)
        console.log('Dashboard type:', response.data.dashboardData.dashboardType)
        return response.data.dashboardData
      }
      // If dashboardData is at root level
      if (response.data && response.data.dashboardType) {
        console.log('Loaded shared dashboard from backend (root level)')
        return response.data
      }
    } catch (backendError) {
      console.error('Backend error loading shared dashboard:', backendError)
      console.error('Error status:', backendError.response?.status)
      console.error('Error data:', backendError.response?.data)
      console.log('Falling back to localStorage...')
      // Fallback to localStorage if backend fails or returns 404
    }

    // Fallback to localStorage
    const shareData = localStorage.getItem(`shared_dashboard_${shareId}`)
    if (shareData) {
      console.log('Loaded shared dashboard from localStorage')
      return JSON.parse(shareData)
    }
    return null
  } catch (error) {
    console.error('Error loading shared dashboard:', error)
    return null
  }
}

export const getShareableUrl = (shareId) => {
  const baseUrl = window.location.origin
  return `${baseUrl}/dashboard/shared/${shareId}`
}

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch (err) {
      document.body.removeChild(textArea)
      return false
    }
  }
}





