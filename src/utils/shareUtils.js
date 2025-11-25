// Utility functions for sharing dashboards

export const generateShareId = () => {
  return `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const saveSharedDashboard = (shareId, dashboardData) => {
  try {
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

export const loadSharedDashboard = (shareId) => {
  try {
    const shareData = localStorage.getItem(`shared_dashboard_${shareId}`)
    if (shareData) {
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

