// API configuration for different environments
const getApiBaseUrl = () => {
  // In production (Amplify), use environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  
  // In development, use relative path (proxy in vite.config.js)
  if (import.meta.env.DEV) {
    return ''
  }
  
  // Fallback: try to detect if we're on Amplify
  // Amplify will set this automatically if backend is configured
  return ''
}

export const API_BASE_URL = getApiBaseUrl()

// Create axios instance with base URL
import axios from 'axios'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds for file uploads
})

export default apiClient

