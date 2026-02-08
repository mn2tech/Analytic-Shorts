// API configuration for different environments
import axios from 'axios'
import { supabase } from '../lib/supabase'

const getApiBaseUrl = () => {
  // In production (Amplify), use environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // In development, use same origin so Vite proxies /api to backend (avoids CORS / network errors)
  if (import.meta.env.DEV) {
    return ''
  }
  
  // Fallback: try to detect if we're on Amplify
  // Amplify will set this automatically if backend is configured
  return ''
}

export const API_BASE_URL = getApiBaseUrl()

// Debug: Log API URL in production (remove in production if needed)
if (import.meta.env.PROD) {
  console.log('API Base URL:', API_BASE_URL || 'Not set - using relative paths')
  console.log('VITE_API_URL env var:', import.meta.env.VITE_API_URL || 'Not set')
  console.log('Environment:', import.meta.env.MODE)
}

// Helper function to check backend connectivity
export const checkBackendHealth = async () => {
  try {
    const response = await apiClient.get('/api/health', { timeout: 5000 })
    return { 
      connected: true, 
      status: response.data?.status,
      message: response.data?.message 
    }
  } catch (error) {
    console.error('Backend health check failed:', error)
    return { 
      connected: false, 
      error: error.message,
      apiUrl: API_BASE_URL || 'Not configured',
      needsConfig: !import.meta.env.VITE_API_URL && import.meta.env.PROD
    }
  }
}

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 minutes for file uploads (increased from 30s for large files)
})

// Add auth token to all requests
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session in API interceptor:', error)
    }
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    } else {
      console.warn('No access token found in session')
    }
  } catch (error) {
    console.error('Error getting session:', error)
  }
  return config
})

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.status, error.response.data)
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error:', error.message)
      console.error('API Base URL:', API_BASE_URL || 'Not configured')
      console.error('VITE_API_URL:', import.meta.env.VITE_API_URL || 'Not set')
      
      // Add helpful error message for production
      if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
        console.error('⚠️ VITE_API_URL is not configured in Amplify environment variables!')
      }
    } else {
      // Something else happened
      console.error('Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default apiClient

