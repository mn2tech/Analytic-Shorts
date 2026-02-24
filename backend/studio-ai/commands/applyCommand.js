/**
 * Apply a parsed command AST to RunConfigOverrides. Deterministic; no side effects.
 * Returns { overrides } on success or { error } on failure.
 *
 * @param {import('./types').RunConfigOverrides} overrides - Current overrides (will be copied, not mutated)
 * @param {import('./parseCommand').CommandAST} commandAST - Parsed command
 * @returns {{ overrides?: import('./types').RunConfigOverrides, error?: string }}
 */

const { validateGrain, validateCompareMode, createEmptyOverrides } = require('./types')

const HELP_TEXT = {
  help: 'Show this list of commands',
  reset: 'Clear all overrides and use engine defaults',
  theme: 'theme <themeId> — Set UI theme',
  template: 'template <id> — Set template (e.g. general, govcon)',
  measure: 'measure <columnName> — Set primary measure column',
  time: 'time <columnName> — Set time column',
  grain: 'grain day|week|month — Set time aggregation',
  focus: 'focus <col1,col2,...> — Prioritize these dimensions',
  add: 'add <block> — Enable block (trend, drivers, map, geomap, distribution, compare, quality, details, anomaly, geolike)',
  remove: 'remove <block> — Disable block',
  breakdown: 'breakdown by <columnName> — Set breakdown dimension',
  compare: 'compare half|last30|last90 — Compare periods mode',
  topn: 'topn <1-100> — Default limit for Top N blocks',
}

function shallowCopy(o) {
  if (o == null || typeof o !== 'object') return o
  return Array.isArray(o) ? [...o] : { ...o }
}

function deepMergeOverrides(prev, delta) {
  const out = shallowCopy(prev) || {}
  for (const [k, v] of Object.entries(delta)) {
    if (v === undefined) continue
    if (k === 'enabledBlocks' && typeof v === 'object' && v !== null) {
      out.enabledBlocks = { ...(out.enabledBlocks || {}), ...v }
    } else if (k === 'focusDimensions' || k === 'blockOrder') {
      out[k] = Array.isArray(v) ? [...v] : v
    } else {
      out[k] = v
    }
  }
  return out
}

/**
 * @param {import('./types').RunConfigOverrides} overrides
 * @param {import('./parseCommand').CommandAST} commandAST
 * @returns {{ overrides?: import('./types').RunConfigOverrides, error?: string, helpText?: string }}
 */
function applyCommand(overrides, commandAST) {
  const ast = commandAST
  if (!ast || typeof ast.type !== 'string') {
    return { error: 'Invalid command AST' }
  }

  if (ast.type === 'unknown') {
    return { error: ast.error || ast.raw || 'Unknown command' }
  }

  if (ast.type === 'help') {
    const lines = Object.entries(HELP_TEXT).map(([cmd, text]) => `  ${text}`)
    return { overrides: shallowCopy(overrides), helpText: lines.join('\n') }
  }

  const current = overrides && typeof overrides === 'object' ? shallowCopy(overrides) : createEmptyOverrides()

  if (ast.type === 'reset') {
    return { overrides: createEmptyOverrides() }
  }

  if (ast.type === 'theme') {
    return { overrides: deepMergeOverrides(current, { themeId: ast.value || undefined }) }
  }
  if (ast.type === 'template') {
    return { overrides: deepMergeOverrides(current, { templateId: ast.value || undefined }) }
  }
  if (ast.type === 'measure') {
    return { overrides: deepMergeOverrides(current, { primaryMeasure: ast.value || undefined }) }
  }
  if (ast.type === 'time') {
    return { overrides: deepMergeOverrides(current, { timeField: ast.value || undefined }) }
  }
  if (ast.type === 'grain') {
    const v = validateGrain(ast.value)
    if (!v) return { error: 'Invalid grain' }
    return { overrides: deepMergeOverrides(current, { timeGrain: v }) }
  }
  if (ast.type === 'focus') {
    const value = Array.isArray(ast.value) ? ast.value.filter((c) => typeof c === 'string' && c.trim()) : []
    return { overrides: deepMergeOverrides(current, { focusDimensions: value.length ? value : undefined }) }
  }
  if (ast.type === 'add') {
    const blockType = ast.value
    if (!blockType) return { error: 'add: missing block type' }
    const enabled = { ...(current.enabledBlocks || {}), [blockType]: true }
    return { overrides: deepMergeOverrides(current, { enabledBlocks: enabled }) }
  }
  if (ast.type === 'remove') {
    const blockType = ast.value
    if (!blockType) return { error: 'remove: missing block type' }
    const enabled = { ...(current.enabledBlocks || {}), [blockType]: false }
    return { overrides: deepMergeOverrides(current, { enabledBlocks: enabled }) }
  }
  if (ast.type === 'breakdown') {
    return { overrides: deepMergeOverrides(current, { breakdownDimension: ast.value || undefined }) }
  }
  if (ast.type === 'compare') {
    const v = validateCompareMode(ast.value)
    if (!v) return { error: 'Invalid compare mode' }
    return { overrides: deepMergeOverrides(current, { compareMode: v }) }
  }
  if (ast.type === 'topn') {
    const n = Number(ast.value)
    if (!Number.isFinite(n) || n < 1 || n > 100) return { error: 'topn must be 1–100' }
    return { overrides: deepMergeOverrides(current, { topNLimit: n }) }
  }

  return { error: `Unhandled command type: ${ast.type}` }
}

module.exports = { applyCommand, HELP_TEXT }
