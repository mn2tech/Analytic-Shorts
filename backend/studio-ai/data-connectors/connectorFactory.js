const { csvConnector } = require('./csvConnector')
const { apiConnector } = require('./apiConnector')
const { dbConnector } = require('./dbConnector')
const { samGovConnector } = require('./samGovConnector')

function buildBaseUrlFromReq(req) {
  const proto = (req && req.get && (req.get('x-forwarded-proto') || req.protocol)) || 'http'
  const host = (req && req.get && req.get('host')) || `localhost:${process.env.PORT || 5000}`
  return `${proto}://${host}`
}

function resolveInternalDatasetUrl(datasetId, req) {
  const base = buildBaseUrlFromReq(req)
  const id = String(datasetId || '').trim().replace(/^example:/, '').replace(/^dataset:/, '')
  if (!id) return null

  // Known special dataset that lives under /api/datasets.
  if (id === 'maritime-ais') return `${base}/api/datasets/maritime-ais`

  const encoded = encodeURIComponent(id).replace(/%2F/g, '/')
  return `${base}/api/example/${encoded}`
}

/**
 * Universal connector factory.
 *
 * Accepts either:
 * - { sourceType: "csv"|"api"|"db"|"samgov"|"external", ... }
 * - legacy-ish: { datasetId?: string, customEndpoint?: string, data?: any[] }
 */
async function connectorFactory(inputConfig, opts = {}) {
  const cfg = inputConfig || {}
  const sourceType = cfg.sourceType || cfg.type || null

  // Back-compat / convenience: customEndpoint -> generic api
  if (!sourceType && cfg.customEndpoint) {
    return apiConnector(
      { url: String(cfg.customEndpoint).trim(), method: 'GET' },
      { timeoutMs: opts.timeoutMs, cacheTtlMs: opts.cacheTtlMs }
    )
  }

  // Back-compat: datasetId -> internal example/datasets API (or datalake via csvConnector)
  if (!sourceType && cfg.datasetId) {
    try {
      // First try datalake-based connector (allows "datalake:<id>" or plain id).
      return await csvConnector(
        { datasetId: String(cfg.datasetId).trim() },
        { sampleRowLimit: opts.sampleRowLimit, cacheTtlMs: opts.cacheTtlMs }
      )
    } catch (_) {
      const url = resolveInternalDatasetUrl(cfg.datasetId, opts.req)
      if (!url) throw new Error('connectorFactory: datasetId could not be resolved')
      return apiConnector(
        { url, method: 'GET' },
        { timeoutMs: opts.timeoutMs, cacheTtlMs: opts.cacheTtlMs }
      )
    }
  }

  switch (String(sourceType || '').toLowerCase()) {
    case 'csv':
      return csvConnector(cfg, opts)
    case 'api':
    case 'external':
      return apiConnector(cfg, opts)
    case 'samgov':
      return samGovConnector(cfg, { ...opts, req: opts.req })
    case 'db':
      return dbConnector(cfg, opts)
    default:
      throw new Error(`connectorFactory: unsupported sourceType "${sourceType}"`)
  }
}

module.exports = { connectorFactory }

