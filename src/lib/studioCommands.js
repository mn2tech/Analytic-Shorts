/**
 * Deterministic command layer for AAI Studio (frontend mirror of backend/studio-ai/commands).
 * Parse and apply commands locally; no LLM. Used for "Cursor-like" dashboard editing.
 */

const VALID_GRAINS = ['day', 'week', 'month']
const VALID_COMPARE_MODES = ['half', 'last30', 'last90']
const BLOCK_ALIAS_TO_TYPE = {
  trend: 'TrendBlock',
  drivers: 'DriverBlock',
  map: 'GeoBlock',
  geomap: 'GeoBlock',
  distribution: 'TopNBlock',
  compare: 'ComparePeriodsBlock',
  quality: 'DataQualityBlock',
  details: 'DetailsTableBlock',
  anomaly: 'AnomalyBlock',
  geolike: 'GeoLikeBlock',
}

function tokenize(input) {
  const s = typeof input === 'string' ? input.trim() : ''
  if (!s) return []
  const tokens = []
  let i = 0
  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue }
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i++]
      let t = ''
      while (i < s.length && s[i] !== q) {
        if (s[i] === '\\') i++
        if (i < s.length) t += s[i++]
      }
      if (i < s.length) i++
      tokens.push(t)
      continue
    }
    let t = ''
    while (i < s.length && !/\s/.test(s[i]) && s[i] !== ',') t += s[i++]
    if (t) tokens.push(t)
    if (i < s.length && s[i] === ',') i++
  }
  return tokens
}

/**
 * Parse command string into AST. Deterministic.
 * @param {string} input
 * @returns {{ type: string, value?: any, raw?: string, error?: string }}
 */
export function parseCommand(input) {
  const raw = typeof input === 'string' ? input : String(input)
  const tokens = tokenize(raw)
  if (tokens.length === 0) return { type: 'unknown', raw, error: 'Empty command' }

  const cmd = tokens[0].toLowerCase()
  const rest = tokens.slice(1)

  if (cmd === 'help') return { type: 'help' }
  if (cmd === 'reset') return { type: 'reset' }
  if (cmd === 'theme') return { type: 'theme', value: rest.join(' ').trim() || rest[0] || '' }
  if (cmd === 'template') return { type: 'template', value: rest.join(' ').trim() || rest[0] || '' }
  if (cmd === 'measure') return { type: 'measure', value: rest.join(' ').trim() || rest[0] || '' }
  if (cmd === 'time') return { type: 'time', value: rest.join(' ').trim() || rest[0] || '' }
  if (cmd === 'grain') {
    const v = (rest[0] || '').toLowerCase()
    if (!VALID_GRAINS.includes(v)) return { type: 'unknown', raw, error: `grain must be one of: ${VALID_GRAINS.join(', ')}` }
    return { type: 'grain', value: v }
  }
  if (cmd === 'focus') {
    const value = rest.join(',').replace(/,+/g, ',').split(',').map((c) => String(c || '').trim()).filter(Boolean)
    return { type: 'focus', value }
  }
  if (cmd === 'add') {
    const name = (rest[0] || '').toLowerCase().trim()
    const blockType = BLOCK_ALIAS_TO_TYPE[name]
    if (!name) return { type: 'unknown', raw, error: 'add requires a block name' }
    if (!blockType) return { type: 'unknown', raw, error: `add: unknown block. Use one of: ${Object.keys(BLOCK_ALIAS_TO_TYPE).join(', ')}` }
    return { type: 'add', value: blockType }
  }
  if (cmd === 'remove') {
    const name = (rest[0] || '').toLowerCase().trim()
    const blockType = BLOCK_ALIAS_TO_TYPE[name]
    if (!name) return { type: 'unknown', raw, error: 'remove requires a block name' }
    if (!blockType) return { type: 'unknown', raw, error: `remove: unknown block. Use one of: ${Object.keys(BLOCK_ALIAS_TO_TYPE).join(', ')}` }
    return { type: 'remove', value: blockType }
  }
  if (cmd === 'breakdown') {
    const by = rest[0]?.toLowerCase() === 'by' ? rest.slice(1) : rest
    const value = by.join(' ').trim() || by[0] || ''
    if (!value) return { type: 'unknown', raw, error: 'breakdown by <columnName>' }
    return { type: 'breakdown', value: String(value) }
  }
  if (cmd === 'compare') {
    const v = (rest[0] || '').toLowerCase()
    if (!VALID_COMPARE_MODES.includes(v)) return { type: 'unknown', raw, error: `compare must be one of: ${VALID_COMPARE_MODES.join(', ')}` }
    return { type: 'compare', value: v }
  }
  if (cmd === 'topn') {
    const num = parseInt(rest[0], 10)
    if (!Number.isFinite(num) || num < 1 || num > 100) return { type: 'unknown', raw, error: 'topn requires a number between 1 and 100' }
    return { type: 'topn', value: num }
  }
  return { type: 'unknown', raw, error: `Unknown command: ${cmd}. Type "help" for commands.` }
}

export const HELP_LINES = [
  'help — Show this list',
  'reset — Clear all overrides',
  'theme <id> — Set UI theme',
  'template <id> — Set template (general, govcon, ecommerce, saas)',
  'measure <column> — Primary measure',
  'time <column> — Time column',
  'grain day|week|month — Time aggregation',
  'focus <col1,col2,...> — Prioritize dimensions',
  'add <block> — Enable block (trend, drivers, map, geomap, distribution, compare, quality, details, anomaly, geolike)',
  'remove <block> — Disable block',
  'breakdown by <column> — Breakdown dimension',
  'compare half|last30|last90 — Compare periods',
  'topn <1-100> — Top N limit',
]

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
 * Apply parsed command to overrides. Returns { overrides } or { error } or { helpText }.
 * @param {Object} overrides — Current run config overrides
 * @param {{ type: string, value?: any, error?: string }} commandAST
 * @returns {{ overrides?: Object, error?: string, helpText?: string }}
 */
export function applyCommand(overrides, commandAST) {
  const ast = commandAST
  if (!ast || typeof ast.type !== 'string') return { error: 'Invalid command' }
  if (ast.type === 'unknown') return { error: ast.error || ast.raw || 'Unknown command' }
  if (ast.type === 'help') return { overrides: shallowCopy(overrides), helpText: HELP_LINES.join('\n') }

  const current = overrides && typeof overrides === 'object' ? shallowCopy(overrides) : {}

  if (ast.type === 'reset') return { overrides: {} }
  if (ast.type === 'theme') return { overrides: deepMergeOverrides(current, { themeId: ast.value || undefined }) }
  if (ast.type === 'template') return { overrides: deepMergeOverrides(current, { templateId: ast.value || undefined }) }
  if (ast.type === 'measure') return { overrides: deepMergeOverrides(current, { primaryMeasure: ast.value || undefined }) }
  if (ast.type === 'time') return { overrides: deepMergeOverrides(current, { timeField: ast.value || undefined }) }
  if (ast.type === 'grain') return { overrides: deepMergeOverrides(current, { timeGrain: ast.value }) }
  if (ast.type === 'focus') {
    const value = Array.isArray(ast.value) ? ast.value.filter((c) => typeof c === 'string' && c.trim()) : []
    return { overrides: deepMergeOverrides(current, { focusDimensions: value.length ? value : undefined }) }
  }
  if (ast.type === 'add') {
    const enabled = { ...(current.enabledBlocks || {}), [ast.value]: true }
    return { overrides: deepMergeOverrides(current, { enabledBlocks: enabled }) }
  }
  if (ast.type === 'remove') {
    const enabled = { ...(current.enabledBlocks || {}), [ast.value]: false }
    return { overrides: deepMergeOverrides(current, { enabledBlocks: enabled }) }
  }
  if (ast.type === 'breakdown') return { overrides: deepMergeOverrides(current, { breakdownDimension: ast.value || undefined }) }
  if (ast.type === 'compare') return { overrides: deepMergeOverrides(current, { compareMode: ast.value }) }
  if (ast.type === 'topn') {
    const n = Number(ast.value)
    if (!Number.isFinite(n) || n < 1 || n > 100) return { error: 'topn must be 1–100' }
    return { overrides: deepMergeOverrides(current, { topNLimit: n }) }
  }
  return { error: `Unhandled: ${ast.type}` }
}
