const DEFAULT_TTL_MS = 5 * 60 * 1000

// key -> { value, expiresAt }
const dataCache = new Map()

// key -> { columns: string[], updatedAt }
const schemaCache = new Map()

function getCached(key) {
  const hit = dataCache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    dataCache.delete(key)
    return null
  }
  return hit.value
}

function setCached(key, value, { ttlMs = DEFAULT_TTL_MS } = {}) {
  dataCache.set(key, { value, expiresAt: Date.now() + Math.max(1000, ttlMs) })
}

function recordSchema(key, schemaColumns) {
  if (!key) return { added: [], removed: [], changed: false }
  const cols = Array.isArray(schemaColumns) ? schemaColumns.filter(Boolean) : []
  const prev = schemaCache.get(key)
  schemaCache.set(key, { columns: cols, updatedAt: Date.now() })
  if (!prev) return { added: [], removed: [], changed: false }
  const prevSet = new Set(prev.columns || [])
  const nextSet = new Set(cols)
  const added = cols.filter((c) => !prevSet.has(c))
  const removed = (prev.columns || []).filter((c) => !nextSet.has(c))
  const changed = added.length > 0 || removed.length > 0
  return { added, removed, changed }
}

function clearCache() {
  dataCache.clear()
  schemaCache.clear()
}

function getCacheStats() {
  return {
    dataEntries: dataCache.size,
    schemaEntries: schemaCache.size,
    ttlMs: DEFAULT_TTL_MS,
  }
}

module.exports = {
  DEFAULT_TTL_MS,
  getCached,
  setCached,
  recordSchema,
  clearCache,
  getCacheStats,
}

