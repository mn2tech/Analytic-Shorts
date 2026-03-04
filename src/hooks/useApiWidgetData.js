/**
 * Generic widget data loader for API-driven widgets.
 * Calls endpoint with params, handles 200/403/503 gracefully.
 */
import { useState, useEffect, useCallback } from 'react'
import apiClient from '../config/api'

/**
 * @param {string} endpoint - e.g. '/api/example/samgov/live'
 * @param {Object} [params={}] - Query params merged with defaultParams
 * @returns {{ data: any, rowCount: number, status: string, error: string | null, message: string | null, loading: boolean, refetch: () => void }}
 */
export function useApiWidgetData(endpoint, params = {}) {
  const [data, setData] = useState(null)
  const [rowCount, setRowCount] = useState(0)
  const [status, setStatus] = useState('idle') // idle | loading | success | blocked | error
  const [error, setError] = useState(null)
  const [friendlyMessage, setFriendlyMessage] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!endpoint) {
      setStatus('error')
      setError('No endpoint configured')
      return
    }
    setLoading(true)
    setError(null)
    setFriendlyMessage(null)
    setStatus('loading')
    try {
      const response = await apiClient.get(endpoint, {
        params,
        timeout: 30000,
        validateStatus: () => true,
      })
      const statusCode = response.status
      const body = response.data

      if (statusCode === 200) {
        let rows = null
        let count = 0
        if (Array.isArray(body)) {
          rows = body
          count = body.length
        } else if (body?.data && Array.isArray(body.data)) {
          rows = body.data
          count = body.rowCount ?? body.data.length
        } else if (body?.results && Array.isArray(body.results)) {
          rows = body.results
          count = body.results.length
        } else if (typeof body === 'object' && body !== null) {
          rows = body
          count = 1
        }
        setData(rows)
        setRowCount(count)
        setStatus('success')
      } else if (statusCode === 403) {
        setStatus('blocked')
        setError(body?.error || 'Access denied')
        setFriendlyMessage(
          body?.message || 'This report is hidden or requires admin access.'
        )
      } else if (statusCode === 503) {
        setStatus('blocked')
        setError(body?.error || 'Service unavailable')
        setFriendlyMessage(
          body?.message ||
            'API key not configured. Add SAM_GOV_API_KEY to backend .env for SAM.gov widgets.'
        )
      } else {
        setStatus('error')
        setError(body?.error || body?.message || `HTTP ${statusCode}`)
        setFriendlyMessage(
          body?.hint || body?.details || 'The request failed. Try again later.'
        )
      }
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Network error')
      setFriendlyMessage(
        err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend. Ensure the API server is running.'
          : err.message || 'Request failed.'
      )
    } finally {
      setLoading(false)
    }
  }, [endpoint, JSON.stringify(params)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    rowCount,
    status,
    error,
    friendlyMessage,
    loading,
    refetch: fetchData,
  }
}
