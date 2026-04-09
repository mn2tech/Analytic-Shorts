/**
 * Derives business-rule hints from record raw fields + anomaly flag.
 * These are intentionally secondary when model-native top_reasons are available.
 */

function parseNum(v) {
  if (v === null || v === undefined || v === '') return NaN
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(String(v).replace(/[$,\s]/g, ''))
  return Number.isFinite(n) ? n : NaN
}

/**
 * @param {object} record - AI risk record ({ raw, anomaly_flag, top_reasons, fallback_rule_based, ... })
 * @returns {string[]}
 */
export function deriveAiInsightsBusinessHints(record) {
  const raw = record?.raw && typeof record.raw === 'object' && !Array.isArray(record.raw) ? record.raw : {}
  const reasons = []

  const taxGap = parseNum(raw.tax_gap ?? raw.taxGap)
  if (Number.isFinite(taxGap) && taxGap > 2000) {
    reasons.push('High Tax Gap')
  }

  const violations = parseNum(raw.violations_count ?? raw.violationsCount)
  if (Number.isFinite(violations) && violations >= 3) {
    reasons.push('Multiple Violations')
  }

  const inspection = parseNum(raw.inspection_score ?? raw.inspectionScore)
  if (Number.isFinite(inspection) && inspection < 70) {
    reasons.push('Low Inspection Score')
  }

  const anomalyTrue =
    record?.anomaly_flag === true
    || record?.anomaly_flag === 1
    || raw?.anomaly_flag === true
    || raw?.anomaly_flag === 1
  if (anomalyTrue) {
    reasons.push('Anomaly Detected')
  }

  return reasons
}

/**
 * Backward-compatible helper for existing UI bullet lists.
 * Precedence logic:
 * 1) If fallback_rule_based=true, business hints are primary.
 * 2) Otherwise, model reasons are primary and business hints are secondary context.
 *
 * @param {object} record
 * @returns {string[]}
 */
export function deriveAiInsightsTopReasonsList(record) {
  const fallbackRuleBased = Boolean(record?.fallback_rule_based)
  const businessHints = deriveAiInsightsBusinessHints(record)
  const modelReasons = (record?.top_reasons || [])
    .map((x) => x?.feature)
    .filter(Boolean)

  if (fallbackRuleBased) {
    return [...businessHints, ...modelReasons]
  }
  return [...modelReasons, ...businessHints]
}

/**
 * Comma-separated top reason string for compact table/card display.
 * Precedence logic:
 * - Model reasons are authoritative by default.
 * - Business hints are appended as hints when available.
 * - If fallback_rule_based=true, business hints may be primary.
 *
 * @param {object} record
 * @returns {string}
 */
export function formatAiInsightsTopReasons(record) {
  const fallbackRuleBased = Boolean(record?.fallback_rule_based)
  const businessHints = deriveAiInsightsBusinessHints(record)
  const modelReasons = (record?.top_reasons || []).map((x) => x?.feature).filter(Boolean)

  if (fallbackRuleBased) {
    if (businessHints.length) {
      return businessHints.join(', ')
    }
    if (modelReasons.length) {
      return modelReasons.join(', ')
    }
    return ''
  }

  if (modelReasons.length) {
    const primary = modelReasons.join(', ')
    if (!businessHints.length) return primary
    return `${primary} (hints: ${businessHints.join(', ')})`
  }
  if (businessHints.length) {
    return businessHints.join(', ')
  }
  return ''
}
