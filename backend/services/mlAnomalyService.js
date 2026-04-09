const { runAiRiskAnalysis } = require('./aiRiskAnalysisService')

function adaptCanonicalToLegacyAnomalyShape(canonical = {}) {
  const records = Array.isArray(canonical?.records) ? canonical.records : []
  const rows = records.map((record) => ({
    ...(record?.raw && typeof record.raw === 'object' ? record.raw : {}),
    anomaly_flag: Boolean(record?.anomaly_flag),
    anomaly_score: Number(record?.anomaly_score ?? 0),
  }))
  const topAnomalies = rows
    .filter((r) => r.anomaly_flag)
    .sort((a, b) => Number(b.anomaly_score || 0) - Number(a.anomaly_score || 0))
    .slice(0, 25)

  const totalRows = Number(canonical?.summary?.total_records || rows.length || 0)
  const anomalyCount = Number(canonical?.summary?.anomaly_count || topAnomalies.length || 0)
  const anomalyPercent = totalRows > 0 ? (anomalyCount / totalRows) * 100 : 0

  return {
    summary: {
      total_rows: totalRows,
      anomaly_count: anomalyCount,
      anomaly_percent: Number(anomalyPercent.toFixed(2)),
      // Explicitly show this legacy endpoint is backed by canonical scoring.
      model_type: canonical?.summary?.model_type || canonical?.model_metadata?.model_type || 'unknown',
      fallback_rule_based: Boolean(canonical?.fallback_rule_based ?? canonical?.summary?.fallback_rule_based ?? false),
    },
    rows,
    top_anomalies: topAnomalies,
    warnings: Array.isArray(canonical?.warnings) ? canonical.warnings : [],
    model_metadata: canonical?.model_metadata || {},
    fallback_rule_based: Boolean(canonical?.fallback_rule_based ?? canonical?.summary?.fallback_rule_based ?? false),
  }
}

async function detectAnomalies({ rows, columns, contamination }) {
  if (!Array.isArray(rows) || rows.length === 0) {
    const err = new Error('rows must be a non-empty array')
    err.status = 400
    throw err
  }
  if (!Array.isArray(columns) || columns.length === 0) {
    const err = new Error('columns must be a non-empty array')
    err.status = 400
    throw err
  }

  const payload = {
    dataset: rows,
    options: {
      anomaly_contamination: Number.isFinite(Number(contamination)) ? Number(contamination) : undefined,
      preferred_numeric_columns: columns,
      selected_numeric_columns: columns,
      max_rows: Math.min(rows.length, 10000),
    },
  }

  try {
    const canonical = await runAiRiskAnalysis(payload)
    return adaptCanonicalToLegacyAnomalyShape(canonical)
  } catch (error) {
    const err = new Error(error?.message || 'Failed to run canonical AI risk scoring')
    err.status = Number.isFinite(error?.status) ? error.status : 502
    throw err
  }
}

module.exports = {
  detectAnomalies,
  adaptCanonicalToLegacyAnomalyShape,
}
