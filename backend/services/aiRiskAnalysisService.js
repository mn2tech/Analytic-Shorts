const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')
const { getPythonCommand, getPythonPrefixArgs } = require('../utils/python')

const MAX_INLINE_ROWS = 10000

function normalizeAiRiskResponse(result = {}, extraWarnings = []) {
  const summary = (result && typeof result.summary === 'object' && result.summary) || {}
  const records = Array.isArray(result?.records) ? result.records : []
  const charts = (result && typeof result.charts === 'object' && result.charts) || {}
  const warnings = [
    ...extraWarnings,
    ...(Array.isArray(result?.warnings) ? result.warnings : []),
  ]
  const modelMetadata =
    (result && typeof result.model_metadata === 'object' && result.model_metadata) || {}

  return {
    // Canonical, normalized envelope expected by all consumers.
    summary: {
      total_records: Number(summary.total_records || records.length || 0),
      high_risk_count: Number(summary.high_risk_count || 0),
      medium_risk_count: Number(summary.medium_risk_count || 0),
      low_risk_count: Number(summary.low_risk_count || 0),
      anomaly_count: Number(summary.anomaly_count || 0),
      model_type: summary.model_type || modelMetadata.model_type || 'unknown',
      analysis_mode: summary.analysis_mode || modelMetadata.analysis_mode || 'unsupervised',
      fallback_rule_based: Boolean(
        summary.fallback_rule_based ??
        result?.fallback_rule_based ??
        modelMetadata.fallback_rule_based ??
        false
      ),
    },
    records,
    charts: {
      feature_importance: Array.isArray(charts.feature_importance) ? charts.feature_importance : [],
      risk_by_dimension: Array.isArray(charts.risk_by_dimension) ? charts.risk_by_dimension : [],
      anomaly_scatter: Array.isArray(charts.anomaly_scatter) ? charts.anomaly_scatter : [],
      // Preserve any additional chart keys from Python for backward compatibility.
      ...charts,
    },
    warnings,
    model_metadata: {
      engine: modelMetadata.engine || 'ai_risk_engine',
      analysis_mode: modelMetadata.analysis_mode || summary.analysis_mode || 'unsupervised',
      model_type: modelMetadata.model_type || summary.model_type || 'unknown',
      feature_count: Number(modelMetadata.feature_count || 0),
      max_rows: Number(modelMetadata.max_rows || 0),
      anomaly_contamination: Number.isFinite(Number(modelMetadata.anomaly_contamination))
        ? Number(modelMetadata.anomaly_contamination)
        : null,
      shap_used: Boolean(modelMetadata.shap_used ?? false),
      // Preserve any additional metadata keys from Python for backward compatibility.
      ...modelMetadata,
    },
    fallback_rule_based: Boolean(
      result?.fallback_rule_based ??
      summary.fallback_rule_based ??
      modelMetadata.fallback_rule_based ??
      false
    ),
    // Backward compatibility passthrough fields used by some existing callers.
    features_used: Array.isArray(result?.features_used) ? result.features_used : [],
    risk_distribution: Array.isArray(result?.risk_distribution) ? result.risk_distribution : [],
  }
}

function validateDataset(dataset) {
  if (!Array.isArray(dataset)) return 'dataset must be an array of JSON records'
  if (dataset.length === 0) return 'dataset must not be empty'
  for (let i = 0; i < dataset.length; i++) {
    const row = dataset[i]
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return `dataset[${i}] must be an object`
    }
  }
  return null
}

async function runAiRiskAnalysis({ dataset, schema = null, options = {} }) {
  const validationError = validateDataset(dataset)
  if (validationError) {
    const err = new Error(validationError)
    err.status = 400
    throw err
  }

  const limitedDataset = dataset.slice(0, MAX_INLINE_ROWS)
  const warnings = []
  if (dataset.length > MAX_INLINE_ROWS) {
    warnings.push(`Input dataset exceeded ${MAX_INLINE_ROWS} rows and was truncated for analysis.`)
  }

  const payload = {
    dataset: limitedDataset,
    schema: schema || undefined,
    options: {
      ...(options || {}),
      max_rows: Math.min(MAX_INLINE_ROWS, Number(options?.max_rows || MAX_INLINE_ROWS)),
    },
  }

  const tmpFile = path.join(os.tmpdir(), `ai_risk_${Date.now()}_${Math.floor(Math.random() * 100000)}.json`)
  fs.writeFileSync(tmpFile, JSON.stringify(payload), 'utf8')

  const workerPath = path.join(__dirname, '..', 'python', 'ai_risk_engine.py')
  const pyCmd = getPythonCommand()
  const pyArgs = [...getPythonPrefixArgs(), workerPath, '--input', tmpFile]

  const result = await new Promise((resolve, reject) => {
    const proc = spawn(pyCmd, pyArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    proc.on('error', (err) => {
      const message = err.code === 'ENOENT'
        ? `Python not found. Install Python 3 and ensure '${pyCmd}' is on PATH, or set PYTHON_CMD.`
        : err.message
      reject(new Error(message))
    })
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `AI risk worker exited with code ${code}`))
        return
      }
      try {
        resolve(JSON.parse((stdout || '').trim()))
      } catch (_e) {
        reject(new Error('AI risk worker returned invalid JSON output'))
      }
    })
  }).finally(() => {
    try {
      fs.unlinkSync(tmpFile)
    } catch (_) {
      // ignore
    }
  })

  if (result?.error) {
    const err = new Error(result.error)
    err.status = 422
    throw err
  }

  return normalizeAiRiskResponse(result, warnings)
}

module.exports = {
  runAiRiskAnalysis,
  normalizeAiRiskResponse,
}
