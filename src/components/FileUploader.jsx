import { useState, useRef } from 'react'
import apiClient from '../config/api'

function FileUploader({ onUploadSuccess, onError, onUpgradeRequired }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file) return

    // More lenient file type checking for mobile browsers
    // Mobile browsers often report different MIME types
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
      'text/comma-separated-values',
      'application/excel',
      'application/x-excel',
      'application/x-msexcel',
      'application/xls',
      'application/xlsx'
    ]

    const validExtensions = ['.csv', '.xlsx', '.xls']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))

    // Check both MIME type and file extension (mobile browsers are inconsistent)
    if (!validTypes.includes(file.type) && 
        !validExtensions.includes(fileExtension) && 
        !file.name.toLowerCase().endsWith('.csv') && 
        !file.name.toLowerCase().endsWith('.xlsx') && 
        !file.name.toLowerCase().endsWith('.xls')) {
      onError('Please upload a CSV or Excel file (.csv, .xlsx, or .xls)')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      // Don't set Content-Type header - let browser set it with boundary for FormData
      // Mobile browsers are sensitive to this
      const response = await apiClient.post('/api/upload', formData, {
        headers: {
          // Let axios/browser set Content-Type automatically for FormData
          // This is important for mobile browsers
        },
        timeout: 180000, // 3 minutes for mobile (slower networks)
        // Add upload progress for mobile feedback
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            // Log progress for debugging on mobile
            if (percentCompleted % 25 === 0) {
              console.log(`Upload progress: ${percentCompleted}%`)
            }
          }
        },
      })
      onUploadSuccess(response.data)
    } catch (error) {
      console.error('Upload error:', error)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.code === 'ECONNREFUSED') {
        const isProduction = import.meta.env.PROD
        const hasApiUrl = import.meta.env.VITE_API_URL
        
        let errorMessage = 'Cannot connect to backend server.\n\n'
        
        if (isProduction && !hasApiUrl) {
          errorMessage += '⚠️ VITE_API_URL is not configured in Amplify.\n\n'
          errorMessage += 'To fix this:\n'
          errorMessage += '1. Go to AWS Amplify Console\n'
          errorMessage += '2. App settings → Environment variables\n'
          errorMessage += '3. Add: VITE_API_URL = your backend URL\n'
          errorMessage += '4. Redeploy the app\n\n'
          errorMessage += 'Example: https://your-backend-url.com'
        } else if (isProduction && hasApiUrl) {
          errorMessage += 'The backend server may be down or unreachable.\n\n'
          errorMessage += `Current API URL: ${import.meta.env.VITE_API_URL}\n\n`
          errorMessage += 'Please verify:\n'
          errorMessage += '1. Backend server is running\n'
          errorMessage += '2. Backend URL is correct\n'
          errorMessage += '3. CORS is configured properly'
        } else {
          errorMessage += 'Please ensure:\n'
          errorMessage += '1. Backend server is running (npm run server)\n'
          errorMessage += '2. Backend is accessible at http://localhost:5000'
        }
        
        onError(errorMessage)
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        // Mobile-specific timeout message
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        const timeoutMessage = isMobile
          ? 'Upload timeout on mobile. Please try:\n\n1. Use WiFi instead of mobile data\n2. Upload a smaller file\n3. Check your internet connection\n4. Try again in a moment'
          : 'Upload timeout: The file is too large or processing is taking too long. Please try:\n\n1. Upload a smaller file\n2. Check your internet connection\n3. Try again in a moment'
        onError(timeoutMessage)
      } else if (error.response?.status === 403 && error.response?.data?.upgradeRequired) {
        // Show upgrade prompt for limit exceeded errors
        if (onUpgradeRequired) {
          onUpgradeRequired({
            error: error.response.data.error,
            message: error.response.data.message,
            currentPlan: error.response.data.plan || 'free',
            limit: error.response.data.limit,
            fileSize: error.response.data.fileSize,
            limitType: error.response.data.fileSize ? 'fileSizeMB' : 
                       error.response.data.limitType || 'uploadsPerMonth',
            currentUsage: error.response.data.current
          })
        } else {
          // Fallback to regular error if upgrade handler not provided
          onError(error.response.data.message || error.response.data.error)
        }
      } else {
        // Better error messages for mobile
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
        let errorMessage = error.response?.data?.error || error.message || 'Failed to upload file.'
        
        if (isMobile && !error.response) {
          errorMessage += '\n\nMobile troubleshooting:\n1. Check WiFi/mobile data connection\n2. Try a smaller file\n3. Restart the app\n4. Try again'
        } else if (!isMobile) {
          errorMessage += ' Please check your connection and try again.'
        }
        
        onError(errorMessage)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    } else {
      onError('No file selected. Please try again.')
    }
    // Reset input to allow selecting the same file again
    if (e.target) {
      e.target.value = ''
    }
  }

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-4 sm:p-8 text-center transition-all duration-300 ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
      } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      // Mobile: Make entire area clickable
      onClick={(e) => {
        // Only trigger on mobile if clicking the container (not the button)
        if (window.innerWidth <= 768 && !e.target.closest('button') && fileInputRef.current) {
          fileInputRef.current.click()
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={handleFileSelect}
        className="hidden"
        // Mobile-specific attributes
        capture="false"
        multiple={false}
      />
      
      {isUploading ? (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Uploading and processing...</p>
          <p className="text-xs text-gray-500">Please keep this page open</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              {typeof window !== 'undefined' && window.innerWidth <= 768 
                ? 'Tap to upload your file' 
                : 'Drag & drop your file here'}
            </p>
            {typeof window !== 'undefined' && window.innerWidth > 768 && (
              <p className="text-sm text-gray-500 mt-2">or</p>
            )}
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Ensure file input is accessible on mobile
                if (fileInputRef.current) {
                  fileInputRef.current.click()
                }
              }}
              onTouchStart={(e) => {
                // Prevent double-tap zoom on mobile
                e.preventDefault()
              }}
              className="mt-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium touch-manipulation"
              type="button"
            >
              Browse Files
            </button>
            <p className="text-xs text-gray-400 mt-3">Supports CSV and Excel files</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploader

