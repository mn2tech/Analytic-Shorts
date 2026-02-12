import apiClient from '../../config/api'

const STORAGE_PREFIX = 'ownerSummary:'

function stableHash(str) {
  // Simple non-crypto hash for cache keys.
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

function buildCacheKey(kpis, meta = {}) {
  const date = meta.date || kpis?.date || ''
  const dataset = meta.datasetId || ''
  const signature = stableHash(JSON.stringify(kpis || {}))
  return `${date || 'no-date'}|${dataset || 'no-ds'}|${signature}`
}

/**
 * Generate (or fetch cached) Owner Summary.
 *
 * @param {object} kpis - { occupancy_rate, revenue_today, arrivals_today, adr, revpar }
 * @param {object} [meta] - { date?: string, datasetId?: string }
 * @returns {Promise<string>} summary text body
 */
export async function generateOwnerSummary(kpis, meta = {}) {
  const cacheKey = buildCacheKey(kpis, meta)
  const storageKey = STORAGE_PREFIX + cacheKey

  try {
    const cached = localStorage.getItem(storageKey)
    if (cached && cached.trim()) return cached.trim()
  } catch (_) {}

  const res = await apiClient.post('/api/owner-summary', { kpis, cacheKey })
  const summary = (res.data?.summary || '').toString().trim()

  if (summary) {
    try {
      localStorage.setItem(storageKey, summary)
    } catch (_) {}
  }
  return summary
}

