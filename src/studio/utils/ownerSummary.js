import apiClient from '../../config/api'

const STORAGE_PREFIX = 'ownerSummaryBiz:'

function stableHash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

function buildCacheKey(businessMetrics, meta = {}) {
  const dataset = meta.datasetId || ''
  const signature = stableHash(JSON.stringify(businessMetrics || []))
  return `${dataset || 'no-ds'}|${signature}`
}

/**
 * Generate (or fetch cached) business owner summary from metric rows.
 *
 * @param {Array<{ label: string, value: number|string }>} businessMetrics
 * @param {object} [meta] - { datasetId?: string }
 * @returns {Promise<string>}
 */
export async function generateOwnerSummary(businessMetrics, meta = {}) {
  const metrics = Array.isArray(businessMetrics) ? businessMetrics.filter((m) => m && String(m.label || '').trim()) : []
  if (metrics.length === 0) return ''

  const cacheKey = buildCacheKey(metrics, meta)
  const storageKey = STORAGE_PREFIX + cacheKey

  try {
    const cached = localStorage.getItem(storageKey)
    if (cached && cached.trim()) return cached.trim()
  } catch (_) {}

  const res = await apiClient.post('/api/owner-summary', { businessMetrics: metrics, cacheKey })
  const summary = (res.data?.summary || '').toString().trim()

  if (summary) {
    try {
      localStorage.setItem(storageKey, summary)
    } catch (_) {}
  }
  return summary
}
