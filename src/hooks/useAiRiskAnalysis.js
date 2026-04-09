import { useCallback, useState } from 'react'
import apiClient from '../config/api'

export function useAiRiskAnalysis() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const run = useCallback(async ({ dataset, schema, options } = {}) => {
    setLoading(true)
    setError('')
    try {
      const response = await apiClient.post('/api/ai/risk-analysis', {
        dataset,
        schema,
        options,
      })
      setResult(response.data || null)
      return response.data
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to run AI risk analysis'
      setError(msg)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError('')
  }, [])

  return {
    loading,
    error,
    result,
    run,
    reset,
  }
}

export default useAiRiskAnalysis
