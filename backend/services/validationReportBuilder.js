function deriveStatus(summary) {
  const hasCriticalIssues =
    summary.missing_in_target.length > 0 ||
    summary.missing_in_source.length > 0 ||
    summary.duplicate_keys_source.length > 0 ||
    summary.duplicate_keys_target.length > 0

  if (hasCriticalIssues || summary.mismatched_rows > 0) {
    if (summary.match_percentage >= 99 && summary.mismatched_rows <= 5) {
      return 'WARNING'
    }
    return 'FAIL'
  }
  return 'PASS'
}

function buildSummary(comparison) {
  const summary = {
    match_percentage: comparison.matchPercentage,
    row_count_source: comparison.rowCountSource,
    row_count_target: comparison.rowCountTarget,
    matched_rows: comparison.matchedRows,
    mismatched_rows: comparison.mismatchedRows,
    missing_in_target: comparison.missingInTarget,
    missing_in_source: comparison.missingInSource,
    schema_issues: comparison.schemaIssues,
    column_mismatches: comparison.columnMismatches,
    duplicate_keys_source: comparison.duplicateKeysSource,
    duplicate_keys_target: comparison.duplicateKeysTarget,
  }
  return { status: deriveStatus(summary), ...summary }
}

function buildCsvReport(result) {
  const lines = [
    'section,key,column,source_value,target_value,reason,delta',
  ]
  for (const issue of result.schema_issues) {
    lines.push(`schema,${issue.column || ''},,,,"${issue.type}",`)
  }
  for (const row of result.missing_in_target) {
    lines.push(`missing_in_target,"${row.key}",,,,"missing_in_target",`)
  }
  for (const row of result.missing_in_source) {
    lines.push(`missing_in_source,"${row.key}",,,,"missing_in_source",`)
  }
  for (const row of result.sample_mismatched_rows || []) {
    for (const detail of row.mismatchDetails || []) {
      lines.push(
        `mismatch,"${row.key}","${detail.column}","${String(detail.source ?? '')}","${String(detail.target ?? '')}","${detail.reason || ''}","${detail.delta ?? ''}"`
      )
    }
  }
  return lines.join('\n')
}

function buildAuditOutput(result, metadata = {}) {
  return {
    audit_generated_at: new Date().toISOString(),
    metadata,
    result,
  }
}

function buildPipelineSummary(results = []) {
  const totals = results.reduce(
    (acc, item) => {
      acc.total_pairs += 1
      acc.pass += item.status === 'PASS' ? 1 : 0
      acc.warning += item.status === 'WARNING' ? 1 : 0
      acc.fail += item.status === 'FAIL' ? 1 : 0
      acc.total_mismatched_rows += item.mismatched_rows || 0
      return acc
    },
    { total_pairs: 0, pass: 0, warning: 0, fail: 0, total_mismatched_rows: 0 }
  )
  return totals
}

module.exports = {
  buildSummary,
  buildCsvReport,
  buildAuditOutput,
  buildPipelineSummary,
}
