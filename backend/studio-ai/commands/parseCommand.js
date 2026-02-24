/**
 * Deterministic command parser for Studio command layer.
 * Parses a single line of input into a Command AST.
 * No LLM; purely rule-based.
 *
 * Supported commands:
 *   help
 *   reset
 *   theme <themeId>
 *   template <templateId>
 *   measure <columnName>
 *   time <columnName>
 *   grain day|week|month
 *   focus <col1,col2,...>
 *   add <blockName>   (trend, drivers, map, geomap, distribution, compare, quality, details, anomaly, geolike)
 *   remove <blockName>
 *   breakdown by <columnName>
 *   compare half|last30|last90
 *   topn <number>
 *
 * @typedef {{ type: 'help' }} HelpCommand
 * @typedef {{ type: 'reset' }} ResetCommand
 * @typedef {{ type: 'theme', value: string }} ThemeCommand
 * @typedef {{ type: 'template', value: string }} TemplateCommand
 * @typedef {{ type: 'measure', value: string }} MeasureCommand
 * @typedef {{ type: 'time', value: string }} TimeCommand
 * @typedef {{ type: 'grain', value: 'day'|'week'|'month' }} GrainCommand
 * @typedef {{ type: 'focus', value: string[] }} FocusCommand
 * @typedef {{ type: 'add', value: string }} AddBlockCommand
 * @typedef {{ type: 'remove', value: string }} RemoveBlockCommand
 * @typedef {{ type: 'breakdown', value: string }} BreakdownCommand
 * @typedef {{ type: 'compare', value: 'half'|'last30'|'last90' }} CompareCommand
 * @typedef {{ type: 'topn', value: number }} TopNCommand
 * @typedef {{ type: 'unknown', raw: string, error?: string }} UnknownCommand
 *
 * @typedef {HelpCommand|ResetCommand|ThemeCommand|TemplateCommand|MeasureCommand|TimeCommand|GrainCommand|FocusCommand|AddBlockCommand|RemoveBlockCommand|BreakdownCommand|CompareCommand|TopNCommand|UnknownCommand} CommandAST
 */

const { BLOCK_ALIAS_TO_TYPE, VALID_GRAINS, VALID_COMPARE_MODES } = require('./types')

function trim(s) {
  return typeof s === 'string' ? s.trim() : ''
}

function tokenize(input) {
  const s = trim(input)
  if (!s) return []
  const tokens = []
  let i = 0
  while (i < s.length) {
    if (/\s/.test(s[i])) {
      i++
      continue
    }
    if (s[i] === '"' || s[i] === "'") {
      const q = s[i]
      i++
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
    while (i < s.length && !/\s/.test(s[i]) && s[i] !== ',') {
      t += s[i++]
    }
    if (t) tokens.push(t)
    if (i < s.length && s[i] === ',') {
      i++
    }
  }
  return tokens
}

/**
 * Parse command string into AST. Deterministic.
 * @param {string} input - Raw user input (e.g. "grain month")
 * @returns {CommandAST}
 */
function parseCommand(input) {
  const raw = typeof input === 'string' ? input : String(input)
  const tokens = tokenize(raw)
  if (tokens.length === 0) {
    return { type: 'unknown', raw, error: 'Empty command' }
  }

  const cmd = tokens[0].toLowerCase()
  const rest = tokens.slice(1)

  if (cmd === 'help') {
    return { type: 'help' }
  }
  if (cmd === 'reset') {
    return { type: 'reset' }
  }
  if (cmd === 'theme') {
    const value = rest.join(' ').trim() || rest[0] || ''
    return { type: 'theme', value: String(value) }
  }
  if (cmd === 'template') {
    const value = rest.join(' ').trim() || rest[0] || ''
    return { type: 'template', value: String(value) }
  }
  if (cmd === 'measure') {
    const value = rest.join(' ').trim() || rest[0] || ''
    return { type: 'measure', value: String(value) }
  }
  if (cmd === 'time') {
    const value = rest.join(' ').trim() || rest[0] || ''
    return { type: 'time', value: String(value) }
  }
  if (cmd === 'grain') {
    const v = (rest[0] || '').toLowerCase()
    const value = VALID_GRAINS.includes(v) ? v : null
    if (!value) {
      return { type: 'unknown', raw, error: `grain must be one of: ${VALID_GRAINS.join(', ')}` }
    }
    return { type: 'grain', value }
  }
  if (cmd === 'focus') {
    const combined = rest.join(',').replace(/,+/g, ',')
    const value = combined.split(',').map((c) => trim(c)).filter(Boolean)
    return { type: 'focus', value }
  }
  if (cmd === 'add') {
    const name = (rest[0] || '').toLowerCase().trim()
    const blockType = BLOCK_ALIAS_TO_TYPE[name] || (name in BLOCK_ALIAS_TO_TYPE ? BLOCK_ALIAS_TO_TYPE[name] : null)
    const valid = Object.keys(BLOCK_ALIAS_TO_TYPE)
    if (!name) {
      return { type: 'unknown', raw, error: 'add requires a block name' }
    }
    if (!blockType) {
      return { type: 'unknown', raw, error: `add: unknown block. Use one of: ${valid.join(', ')}` }
    }
    return { type: 'add', value: blockType }
  }
  if (cmd === 'remove') {
    const name = (rest[0] || '').toLowerCase().trim()
    const blockType = BLOCK_ALIAS_TO_TYPE[name] || null
    const valid = Object.keys(BLOCK_ALIAS_TO_TYPE)
    if (!name) {
      return { type: 'unknown', raw, error: 'remove requires a block name' }
    }
    if (!blockType) {
      return { type: 'unknown', raw, error: `remove: unknown block. Use one of: ${valid.join(', ')}` }
    }
    return { type: 'remove', value: blockType }
  }
  if (cmd === 'breakdown') {
    const by = rest[0] && rest[0].toLowerCase() === 'by' ? rest.slice(1) : rest
    const value = by.join(' ').trim() || by[0] || ''
    if (!value) {
      return { type: 'unknown', raw, error: 'breakdown by <columnName>' }
    }
    return { type: 'breakdown', value: String(value) }
  }
  if (cmd === 'compare') {
    const v = (rest[0] || '').toLowerCase()
    const value = VALID_COMPARE_MODES.includes(v) ? v : null
    if (!value) {
      return { type: 'unknown', raw, error: `compare must be one of: ${VALID_COMPARE_MODES.join(', ')}` }
    }
    return { type: 'compare', value }
  }
  if (cmd === 'topn') {
    const num = parseInt(rest[0], 10)
    if (!Number.isFinite(num) || num < 1 || num > 100) {
      return { type: 'unknown', raw, error: 'topn requires a number between 1 and 100' }
    }
    return { type: 'topn', value: num }
  }

  return { type: 'unknown', raw, error: `Unknown command: ${cmd}. Type "help" for commands.` }
}

module.exports = { parseCommand, tokenize }
