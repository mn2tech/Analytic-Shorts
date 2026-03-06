/**
 * SAS PROC Parser - Strict subset for PROC SUMMARY, PROC MEANS, PROC FREQ.
 * Converts SAS-like code to canonical spec JSON for pandas execution.
 *
 * SAFETY: Only supports PROC SUMMARY, PROC MEANS, PROC FREQ.
 * Rejects: DATA steps, %macros, %include, proc sql, libname, options, x commands, file I/O.
 */

const FORBIDDEN_PATTERNS = [
  { pattern: /\bdata\s+\w+\s*;/i, message: 'DATA steps are not supported' },
  { pattern: /%include\b/i, message: '%include is not supported' },
  { pattern: /%macro\b|%mend\b|%\w+/i, message: 'Macros are not supported' },
  { pattern: /\bproc\s+sql\b/i, message: 'PROC SQL is not supported' },
  { pattern: /\blibname\b/i, message: 'LIBNAME is not supported' },
  { pattern: /\boptions\s+/i, message: 'OPTIONS statement is not supported' },
  { pattern: /\bx\s+['"`]/i, message: 'X command is not supported' },
  { pattern: /\bfilename\b|\bfile\s+['"`]/i, message: 'File I/O is not supported' },
  { pattern: /\bput\s+_all_|\bput\s+file\b/i, message: 'PUT to file is not supported' },
]

const ALLOWED_PROCS = ['summary', 'means', 'freq']

/**
 * Tokenize SAS PROC code into tokens with line/col info.
 */
function tokenize(code) {
  if (typeof code !== 'string') return []
  const tokens = []
  let line = 1
  let col = 1
  let i = 0
  const len = code.length

  while (i < len) {
    // Skip whitespace
    if (/\s/.test(code[i])) {
      if (code[i] === '\n') {
        line++
        col = 1
      } else {
        col++
      }
      i++
      continue
    }
    if (code[i] === ';' || code[i] === '(' || code[i] === ')' || code[i] === '/' || code[i] === '=' || code[i] === ',') {
      tokens.push({ type: 'punct', value: code[i], line, col })
      col++
      i++
      continue
    }
    // Word (identifier or keyword)
    if (/[a-zA-Z_$]/.test(code[i])) {
      const start = i
      const startCol = col
      while (i < len && /[a-zA-Z0-9_$.]/.test(code[i])) {
        i++
        col++
      }
      const value = code.slice(start, i)
      tokens.push({ type: 'word', value, line: line, col: startCol })
      continue
    }
    // Number
    if (/[0-9.]/.test(code[i])) {
      const start = i
      const startCol = col
      while (i < len && /[0-9.]/.test(code[i])) {
        i++
        col++
      }
      tokens.push({ type: 'number', value: code.slice(start, i), line: line, col: startCol })
      continue
    }
    i++
    col++
  }
  return tokens
}

/**
 * Get current token or null; advance if consume is true.
 */
function peek(tokens, idx, consume = false) {
  const t = tokens[idx] || null
  if (consume && t) return { token: t, nextIdx: idx + 1 }
  return { token: t, nextIdx: idx }
}

/**
 * Parse a PROC block. Returns { proc, options, statements } or throws.
 */
function parseProcBlock(tokens, startIdx = 0) {
  let i = startIdx
  const result = { proc: null, options: {}, statements: [] }

  // PROC name
  const procTk = tokens[i]
  if (!procTk || procTk.type !== 'word' || procTk.value.toLowerCase() !== 'proc') {
    return { error: { code: 'EXPECTED_PROC', message: 'Expected PROC keyword', line: procTk?.line ?? 1, col: procTk?.col ?? 1 } }
  }
  i++

  const nameTk = tokens[i]
  if (!nameTk || nameTk.type !== 'word') {
    return { error: { code: 'EXPECTED_PROC_NAME', message: 'Expected PROC name after PROC', line: nameTk?.line ?? 1, col: nameTk?.col ?? 1 } }
  }
  const procName = nameTk.value.toLowerCase()
  if (!ALLOWED_PROCS.includes(procName)) {
    return { error: { code: 'UNSUPPORTED_SYNTAX', message: `PROC ${nameTk.value} is not supported. Only PROC SUMMARY, PROC MEANS, PROC FREQ.`, line: nameTk.line, col: nameTk.col } }
  }
  result.proc = procName === 'means' ? 'summary' : procName
  i++

  // Options before semicolon (DATA=, NWAY, etc.)
  while (i < tokens.length) {
    const tk = tokens[i]
    if (!tk || tk.value === ';') break
    if (tk.type === 'word' && tk.value.toLowerCase() === 'data' && tokens[i + 1]?.value === '=') {
      i += 2
      const dataTk = tokens[i]
      if (dataTk?.type === 'word') {
        const ref = dataTk.value
        if (ref.toLowerCase().startsWith('work.')) {
          result.options.dataRef = ref.split('.')[1] || ref
        } else {
          result.options.dataRef = ref
        }
        i++
      }
    } else if (tk.type === 'word' && tk.value.toUpperCase() === 'NWAY') {
      result.options.nway = true
      i++
    } else {
      i++
    }
  }

  // Consume first semicolon (end of PROC line)
  if (tokens[i]?.value === ';') i++

  // Collect statements: CLASS, VAR, OUTPUT, TABLES. Each runs from keyword to next ;
  const stKeywords = ['class', 'var', 'output', 'tables']
  while (i < tokens.length) {
    const tk = tokens[i]
    if (!tk) break
    if (tk.type === 'word' && tk.value.toLowerCase() === 'run') {
      i++
      break
    }
    if (tk.type === 'word' && tk.value.toLowerCase() === 'proc') break
    if (tk.type === 'word' && stKeywords.includes(tk.value.toLowerCase())) {
      const start = i
      i++
      while (i < tokens.length && tokens[i]?.value !== ';') i++
      result.statements.push({ tokens: [tk], start })
      if (tokens[i]?.value === ';') i++
    } else {
      i++
    }
  }

  return { ...result, nextIdx: i }
}

/**
 * Parse CLASS statement: CLASS col1 col2 ...;
 */
function parseClassStatement(tokens, startIdx) {
  const cols = []
  let i = startIdx
  while (i < tokens.length) {
    const tk = tokens[i]
    if (!tk || tk.value === ';') break
    if (tk.type === 'word' && !['class'].includes(tk.value.toLowerCase())) {
      cols.push(tk.value)
    }
    i++
  }
  return { columns: cols, nextIdx: i }
}

/**
 * Parse VAR statement: VAR col1 col2 ...;
 */
function parseVarStatement(tokens, startIdx) {
  const cols = []
  let i = startIdx
  while (i < tokens.length) {
    const tk = tokens[i]
    if (!tk || tk.value === ';') break
    if (tk.type === 'word' && !['var'].includes(tk.value.toLowerCase())) {
      cols.push(tk.value)
    }
    i++
  }
  return { columns: cols, nextIdx: i }
}

/**
 * Parse OUTPUT statement: OUTPUT OUT=name MEAN= SUM= N= MIN= MAX=;
 * Stats without vars apply to all VAR columns.
 */
function parseOutputStatement(tokens, startIdx) {
  const result = { name: 'out', stats: [] }
  let i = startIdx
  while (i < tokens.length) {
    const tk = tokens[i]
    if (!tk || tk.value === ';') break
    if (tk.type === 'word' && tk.value.toLowerCase() === 'out' && tokens[i + 1]?.value === '=') {
      const nameTk = tokens[i + 2]
      if (nameTk?.type === 'word') {
        const ref = nameTk.value
        result.name = ref.toLowerCase().startsWith('work.') ? ref.split('.')[1] : ref
      }
      i += 3
      continue
    }
    const upper = tk.type === 'word' ? tk.value.toUpperCase() : ''
    if (['MEAN=', 'SUM=', 'N=', 'MIN=', 'MAX='].includes(upper) || ['MEAN', 'SUM', 'N', 'MIN', 'MAX'].includes(upper)) {
      const stat = upper.replace('=', '').toLowerCase()
      if (stat === 'n') result.stats.push('count')
      else result.stats.push(stat)
    }
    i++
  }
  return { ...result, nextIdx: i }
}

/**
 * Parse TABLES statement: TABLES col1 col2 ...;
 */
function parseTablesStatement(tokens, startIdx) {
  const cols = []
  let i = startIdx
  while (i < tokens.length) {
    const tk = tokens[i]
    if (!tk || tk.value === ';') break
    if (tk.type === 'word' && !['tables'].includes(tk.value.toLowerCase())) {
      cols.push(tk.value)
    }
    i++
  }
  return { columns: cols, nextIdx: i }
}

/**
 * Convert SAS PROC code to canonical spec JSON.
 * @param {string} code - SAS PROC code
 * @returns {{ success: true, spec: object } | { success: false, errors: array }}
 */
function parse(code) {
  if (typeof code !== 'string' || !code.trim()) {
    return { success: false, errors: [{ code: 'EMPTY_CODE', message: 'Code is required', line: 1, col: 1 }] }
  }

  for (const { pattern, message } of FORBIDDEN_PATTERNS) {
    const match = code.match(pattern)
    if (match) {
      const lines = code.substring(0, match.index).split('\n')
      const line = lines.length
      const col = (lines[lines.length - 1] || '').length + 1
      return { success: false, errors: [{ code: 'UNSUPPORTED_SYNTAX', message, line, col }] }
    }
  }

  const tokens = tokenize(code)
  const specs = []
  const errors = []
  let i = 0

  while (i < tokens.length) {
    const tk = tokens[i]
    if (!tk) break
    if (tk.type === 'word' && tk.value.toLowerCase() === 'proc') {
      const parsed = parseProcBlock(tokens, i)
      if (parsed.error) {
        errors.push(parsed.error)
        break
      }
      i = parsed.nextIdx

      let groupBy = []
      let metrics = []
      let options = { nway: !!parsed.options.nway, dataRef: parsed.options.dataRef }
      let output = { name: 'out' }
      let tablesColumns = []

      for (const st of parsed.statements) {
        const first = st.tokens[0]
        if (!first || first.type !== 'word') continue
        const kw = first.value.toLowerCase()
        const stStart = st.start

        if (kw === 'class') {
          const r = parseClassStatement(tokens, stStart)
          groupBy = r.columns
        } else if (kw === 'var') {
          const r = parseVarStatement(tokens, stStart)
          if (r.columns.length > 0) {
            metrics = r.columns.map(col => ({ col, agg: [] }))
          }
        } else if (kw === 'output') {
          const r = parseOutputStatement(tokens, stStart)
          output = { name: r.name }
          if (r.stats.length > 0) {
            const aggs = [...new Set(r.stats)]
            metrics = metrics.length > 0
              ? metrics.map(m => ({ ...m, agg: aggs }))
              : [{ col: '*', agg: aggs }]
          }
        } else if (kw === 'tables') {
          const r = parseTablesStatement(tokens, stStart)
          tablesColumns = r.columns
        }
      }

      if (parsed.proc === 'summary' || parsed.proc === 'means') {
        if (metrics.length === 0) {
          metrics = [{ col: '*', agg: ['mean', 'sum', 'count', 'min', 'max'] }]
        }
        // PROC MEANS/SUMMARY with VAR but no OUTPUT: use default aggs
        const defaultAggs = ['mean', 'sum', 'count', 'min', 'max']
        metrics = metrics.map((m) => (m.agg && m.agg.length > 0 ? m : { ...m, agg: defaultAggs }))
        specs.push({
          task: 'summary',
          group_by: groupBy,
          metrics,
          options,
          output
        })
      } else if (parsed.proc === 'freq') {
        if (tablesColumns.length === 0) {
          errors.push({ code: 'MISSING_TABLES', message: 'PROC FREQ requires TABLES statement', line: 1, col: 1 })
        } else {
          specs.push({
            task: 'freq',
            columns: tablesColumns,
            outputs: tablesColumns.map(col => ({ name: `freq_${col}`, column: col })),
            options: { dropna: false }
          })
        }
      }
    } else {
      i++
    }
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  if (specs.length === 0) {
    return { success: false, errors: [{ code: 'NO_VALID_PROC', message: 'No valid PROC block found', line: 1, col: 1 }] }
  }

  const spec = specs.length === 1 ? specs[0] : { tasks: specs }
  return { success: true, spec }
}

module.exports = { parse, tokenize, ALLOWED_PROCS, FORBIDDEN_PATTERNS }
