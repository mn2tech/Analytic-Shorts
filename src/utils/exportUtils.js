/**
 * Export utilities for saving dashboard reports
 */

/**
 * Export dashboard as PNG image
 */
export const exportAsPNG = async (elementId, filename = 'dashboard-report.png') => {
  try {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Dashboard element not found')
    }

    // Use html2canvas if available, otherwise fallback to screenshot API
    if (typeof window.html2canvas !== 'undefined') {
      const canvas = await window.html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      })
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, 'image/png')
    } else {
      // Fallback: use browser's print to PDF
      window.print()
    }
  } catch (error) {
    console.error('Error exporting as PNG:', error)
    alert('Failed to export dashboard. Please try using the browser\'s print function (Ctrl+P / Cmd+P)')
  }
}

/**
 * Export dashboard as PDF using browser print
 */
export const exportAsPDF = (filename = 'dashboard-report.pdf') => {
  try {
    // Use browser's print dialog
    window.print()
  } catch (error) {
    console.error('Error exporting as PDF:', error)
    alert('Failed to export as PDF. Please use your browser\'s print function (Ctrl+P / Cmd+P) and select "Save as PDF"')
  }
}

/**
 * Copy shareable link to clipboard
 */
export const copyShareableLink = async (shareId) => {
  try {
    const shareUrl = `${window.location.origin}/share/${shareId}`
    await navigator.clipboard.writeText(shareUrl)
    return true
  } catch (error) {
    console.error('Error copying link:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = `${window.location.origin}/share/${shareId}`
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

/**
 * Generate shareable dashboard data
 */
export const generateShareableData = (layouts, widgetVisibility, widgetConfigs, widgetChartTypes) => {
  return {
    layouts,
    widgetVisibility,
    widgetConfigs,
    widgetChartTypes,
    timestamp: new Date().toISOString()
  }
}


























