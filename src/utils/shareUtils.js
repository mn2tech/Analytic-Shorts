// Utility functions for sharing dashboards
import apiClient from '../config/api'

// Load shared dashboard from backend (public endpoint – no auth sent to avoid token errors for viewers)
async function fetchSharedDashboardFromBackend(shareId) {
  const base = import.meta.env.VITE_API_URL || ''
  const url = `${base}/api/shared/${shareId}`
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const err = new Error(res.status === 404 ? 'Not found' : `HTTP ${res.status}`)
    err.status = res.status
    err.response = { status: res.status }
    throw err
  }
  return res.json()
}

export const generateShareId = () => {
  return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const saveSharedDashboard = async (shareId, dashboardData) => {
  try {
    console.log('saveSharedDashboard called with:', {
      shareId,
      hasDashboardData: !!dashboardData,
      dashboardType: dashboardData?.dashboardType,
      hasDashboard: !!dashboardData?.dashboard
    })
    
    let backendSaved = false
    let localSaved = false
    
    // First save to backend (database)
    try {
      console.log('Attempting to save to backend...')
      const response = await apiClient.post('/api/shared', {
        shareId,
        dashboardData
      })
      console.log('✅ Shared dashboard saved to backend successfully:', response.data)
      backendSaved = true
    } catch (backendError) {
      console.error('❌ Error saving to backend:', backendError)
      console.error('Error response:', backendError.response?.data)
      console.error('Error status:', backendError.response?.status)
      console.warn('⚠️ Backend save failed, will use localStorage only. Dashboard will only be accessible from this browser.')
      // Continue to save to localStorage as fallback
    }

    // Always save to localStorage as backup (works even if backend fails)
    try {
      const shareData = {
        ...dashboardData,
        sharedAt: new Date().toISOString(),
        shareId,
      }
      localStorage.setItem(`shared_dashboard_${shareId}`, JSON.stringify(shareData))
      console.log('✅ Saved to localStorage:', shareId)
      
      if (!backendSaved) {
        console.warn('⚠️ Dashboard saved to localStorage only. Share link will only work in this browser.')
      }
      
      localSaved = true
    } catch (localStorageError) {
      console.error('❌ Error saving to localStorage:', localStorageError)
      if (!backendSaved) {
        console.error('❌ Both backend and localStorage saves failed!')
        return { ok: false, backendSaved: false, localSaved: false }
      }
      // If backend saved but localStorage failed, that's okay
      return { ok: true, backendSaved: true, localSaved: false }
    }

    return { ok: backendSaved || localSaved, backendSaved, localSaved }
  } catch (error) {
    console.error('❌ Unexpected error saving shared dashboard:', error)
    return { ok: false, backendSaved: false, localSaved: false }
  }
}

export const loadSharedDashboard = async (shareId) => {
  try {
    console.log('Loading shared dashboard with shareId:', shareId)
    
    // First try to load from backend (public request – no auth header, so viewers don't trigger token errors)
    try {
      console.log('Attempting to load from backend...')
      const response = await fetchSharedDashboardFromBackend(shareId)
      console.log('Backend response received:', {
        hasData: !!response,
        hasDashboardData: !!response?.dashboardData,
        dashboardType: response?.dashboardData?.dashboardType
      })
      
      if (response && response.dashboardData) {
        console.log('✅ Loaded shared dashboard from backend')
        return response.dashboardData
      }
      if (response && response.dashboardType) {
        console.log('✅ Loaded shared dashboard from backend (root level)')
        return response
      }
      
      console.warn('⚠️ Backend returned data but no dashboardData found')
    } catch (backendError) {
      console.error('❌ Backend error loading shared dashboard:', backendError)
      if (backendError.status === 404 || backendError.response?.status === 404) {
        console.log('Dashboard not found in backend (404), trying localStorage...')
      } else {
        console.log('Backend error, falling back to localStorage...')
      }
    }

    // Fallback to localStorage
    console.log('Attempting to load from localStorage...')
    const shareData = localStorage.getItem(`shared_dashboard_${shareId}`)
    if (shareData) {
      console.log('✅ Loaded shared dashboard from localStorage')
      const parsed = JSON.parse(shareData)
      console.log('LocalStorage data:', {
        hasDashboard: !!parsed.dashboard,
        dashboardType: parsed.dashboardType,
        shareId: parsed.shareId
      })
      return parsed
    }
    
    console.error('❌ Dashboard not found in localStorage either')
    console.log('Available localStorage keys:', Object.keys(localStorage).filter(k => k.startsWith('shared_dashboard_')))
    return null
  } catch (error) {
    console.error('❌ Unexpected error loading shared dashboard:', error)
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





