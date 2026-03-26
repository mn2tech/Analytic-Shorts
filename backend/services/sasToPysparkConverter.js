/**
 * SAS → PySpark conversion (pattern-based, production-oriented).
 * Prefers explicit F.col / F.lit / F.when over F.expr; uses F.expr only when
 * expressions cannot be safely decomposed, with structured warnings.
 */

const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
}

function asVarName(name, fallback = 'df_result') {
  const base = String(name || fallback).replace(/[^a-zA-Z0-9_]/g, '_')
  return /^[a-zA-Z_]/.test(base) ? base : `df_${base}`
}

function makeWarning({ code, severity = SEVERITY.WARNING, message, suggested_action, block_id }) {
  return {
    code,
    severity,
    message,
    suggested_action: suggested_action || '',
    block_id: block_id || null,
  }
}

/** Split on top-level AND/OR (not inside parentheses or quotes). */
function splitTopLevel(expr, pattern) {
  const s = String(expr || '').trim()
  const parts = []
  let depth = 0
  let quote = null
  let buf = ''
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (quote) {
      buf += ch
      if (ch === quote && s[i - 1] !== '\\') quote = null
      i += 1
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      buf += ch
      i += 1
      continue
    }
    if (ch === '(') depth += 1
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (depth === 0) {
      const rest = s.slice(i)
      const m = rest.match(pattern)
      if (m && m.index === 0) {
        parts.push(buf.trim())
        buf = ''
        i += m[0].length
        continue
      }
    }
    buf += ch
    i += 1
  }
  if (buf.trim()) parts.push(buf.trim())
  return parts.filter(Boolean)
}

function splitAnd(expr) {
  return splitTopLevel(expr, /^\s+and\s+/i)
}

function splitOr(expr) {
  return splitTopLevel(expr, /^\s+or\s+/i)
}

/**
 * Convert a SAS-like scalar/condition expression to PySpark Column code.
 * Returns { code, used_expr_fallback, partial_reason }.
 */
function sasExprToPySpark(expr, blockId, role = 'condition') {
  const raw = String(expr || '').trim()
  if (!raw) {
    return { code: 'F.lit(True)', used_expr_fallback: false, partial_reason: null }
  }

  // Strip outer parens recursively
  let e = raw
  while (e.startsWith('(') && e.endsWith(')')) {
    e = e.slice(1, -1).trim()
  }

  // String literal
  if ((e.startsWith('"') && e.endsWith('"')) || (e.startsWith("'") && e.endsWith("'"))) {
    const inner = e.slice(1, -1)
    return { code: `F.lit(${JSON.stringify(inner)})`, used_expr_fallback: false, partial_reason: null }
  }

  // Numeric literal
  if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(e)) {
    return { code: `F.lit(${e})`, used_expr_fallback: false, partial_reason: null }
  }

  // Simple identifier → F.col
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(e)) {
    return { code: `F.col(${JSON.stringify(e)})`, used_expr_fallback: false, partial_reason: null }
  }

  // NOT
  const notM = e.match(/^not\s+(.+)$/i)
  if (notM) {
    const inner = sasExprToPySpark(notM[1], blockId, role)
    return {
      code: `~(${inner.code})`,
      used_expr_fallback: inner.used_expr_fallback,
      partial_reason: inner.partial_reason,
    }
  }

  // OR (lower precedence than AND in SAS; split OR first, then AND inside each)
  const orParts = splitOr(e)
  if (orParts.length > 1) {
    const converted = orParts.map((p) => sasExprToPySpark(p, blockId, role))
    if (converted.every((c) => !c.used_expr_fallback)) {
      return {
        code: `(${converted.map((c) => c.code).join(' | ')})`,
        used_expr_fallback: false,
        partial_reason: null,
      }
    }
  }

  // AND (higher precedence than OR; only reached for a single OR segment)
  const andParts = splitAnd(e)
  if (andParts.length > 1) {
    const converted = andParts.map((p) => sasExprToPySpark(p, blockId, role))
    if (converted.every((c) => !c.used_expr_fallback)) {
      return {
        code: `(${converted.map((c) => c.code).join(' & ')})`,
        used_expr_fallback: false,
        partial_reason: null,
      }
    }
  }

  // Comparison: SAS uses = for equality in conditions
  const cmpRe =
    /^(.+?)\s*(>=|<=|<>|><|!=|>|<|^=|ne\b|eq\b|gt\b|lt\b|ge\b|le\b|=)\s*(.+)$/i
  const cm = e.match(cmpRe)
  if (cm) {
    const left = sasExprToPySpark(cm[1].trim(), blockId, 'value')
    const opRaw = cm[2].trim().toLowerCase()
    const right = sasExprToPySpark(cm[3].trim(), blockId, 'value')
    if (!left.used_expr_fallback && !right.used_expr_fallback) {
      let pyOp = '=='
      if (opRaw === '>' || opRaw === 'gt') pyOp = '>'
      else if (opRaw === '<' || opRaw === 'lt') pyOp = '<'
      else if (opRaw === '>=' || opRaw === 'ge') pyOp = '>='
      else if (opRaw === '<=' || opRaw === 'le') pyOp = '<='
      else if (opRaw === '^=' || opRaw === 'ne' || opRaw === '<>' || opRaw === '><' || opRaw === '!=') pyOp = '!='
      else if (opRaw === '=' || opRaw === 'eq') pyOp = '=='
      return {
        code: `(${left.code} ${pyOp} ${right.code})`,
        used_expr_fallback: false,
        partial_reason: null,
      }
    }
  }

  // Arithmetic + - * / with simple tokens (best-effort)
  const arith = tryArithmeticToSpark(e, blockId)
  if (arith) return arith

  // Last resort: F.expr with explicit audit comment in generated code
  return {
    code: `F.expr(${JSON.stringify(e)})`,
    used_expr_fallback: true,
    partial_reason: `Could not decompose SAS ${role}; using F.expr() — review required.`,
  }
}

function tryArithmeticToSpark(e, blockId) {
  const t = e.replace(/\s+/g, ' ').trim()
  // binary ops on simple operands only
  const bin = t.match(/^(.+?)\s*([+\-*/])\s*(.+)$/)
  if (!bin) return null
  const a = sasExprToPySpark(bin[1].trim(), blockId, 'value')
  const b = sasExprToPySpark(bin[3].trim(), blockId, 'value')
  if (a.used_expr_fallback || b.used_expr_fallback) return null
  const op = bin[2]
  return {
    code: `(${a.code} ${op} ${b.code})`,
    used_expr_fallback: false,
    partial_reason: null,
  }
}

function parseIfAssignment(statement) {
  const match = statement.match(/if\s+(.+?)\s+then\s+([a-zA-Z0-9_]+)\s*=\s*(.+?)\s*;?$/i)
  if (!match) return null
  return { condition: match[1].trim(), target: match[2].trim(), value: match[3].trim() }
}

function parseElseAssignment(statement) {
  const match = statement.match(/else\s+([a-zA-Z0-9_]+)\s*=\s*(.+?)\s*;?$/i)
  if (!match) return null
  return { target: match[1].trim(), value: match[2].trim() }
}

function valueExprToSpark(rhs, blockId, warnings) {
  const v = sasExprToPySpark(rhs, blockId, 'value')
  if (v.used_expr_fallback) {
    warnings.push(
      makeWarning({
        code: 'EXPR_FALLBACK_VALUE',
        severity: SEVERITY.WARNING,
        message: `Right-hand side "${rhs.slice(0, 80)}${rhs.length > 80 ? '…' : ''}" was not fully decomposed.`,
        suggested_action: 'Rewrite as explicit F.col / F.lit chains or validate F.expr semantics against Spark SQL.',
        block_id: blockId,
      })
    )
  }
  return v.code
}

function conditionExprToSpark(cond, blockId, warnings) {
  const v = sasExprToPySpark(cond, blockId, 'condition')
  if (v.used_expr_fallback) {
    warnings.push(
      makeWarning({
        code: 'EXPR_FALLBACK_CONDITION',
        severity: SEVERITY.WARNING,
        message: `IF/WHERE condition "${cond.slice(0, 80)}${cond.length > 80 ? '…' : ''}" fell back to F.expr().`,
        suggested_action: 'Manually translate to explicit Column expressions and add unit tests on edge cases.',
        block_id: blockId,
      })
    )
  }
  return v.code
}

function scoreBlock(base, penalties = []) {
  const p = (penalties || []).reduce((a, b) => a + b, 0)
  return Math.max(0, Math.min(100, Math.round(base - p)))
}

function convertDataStep(block, mode) {
  const blockId = block.id || null
  const warnings = []
  const text = block.input || ''
  const out = block.output_datasets?.[0] || 'output_df'
  const varName = asVarName(`df_${out}`)
  const sourceList = block.input_datasets?.length ? block.input_datasets : ['source_df']
  let penalties = []

  if (sourceList.length > 1) {
    warnings.push(
      makeWarning({
        code: 'MULTI_SET',
        severity: SEVERITY.WARNING,
        message: `Multiple SET sources (${sourceList.join(', ')}) are not concatenated automatically.`,
        suggested_action: 'Use unionByName, joins, or separate pipelines; align schemas before union.',
        block_id: blockId,
      })
    )
    penalties.push(12)
  }

  const setStmt =
    sourceList.length > 1
      ? `${varName} = spark.table("${sourceList[0]}")  # TODO: additional SET sources: ${sourceList.slice(1).join(', ')}`
      : `${varName} = spark.table("${sourceList[0]}")`

  const lines = [setStmt]
  const statements = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  const ifClauses = []
  const elseClauses = []

  for (const statement of statements) {
    const line = statement.endsWith(';') ? statement : `${statement};`
    const ifParsed = parseIfAssignment(line)
    if (ifParsed) {
      ifClauses.push(ifParsed)
      continue
    }
    const elseParsed = parseElseAssignment(line)
    if (elseParsed) {
      elseClauses.push(elseParsed)
      continue
    }
    if (/^\w+\s*=\s*.+;?$/i.test(line) && !/^data\s|^set\s|^merge\s|^run\s*;/i.test(line)) {
      const assignMatch = line.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+?);?$/)
      if (assignMatch) {
        const col = assignMatch[1]
        const rhs = assignMatch[2].trim()
        const rhsCode = valueExprToSpark(rhs, blockId, warnings)
        lines.push(`${varName} = ${varName}.withColumn(${JSON.stringify(col)}, ${rhsCode})`)
      }
    }
  }

  const byCols = (text.match(/\bby\s+([^;]+)/i)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
  const mergeSources = [...text.matchAll(/\bmerge\s+([a-zA-Z0-9_.]+)/gim)].map((m) => m[1])
  if (mergeSources.length > 0) {
    warnings.push(
      makeWarning({
        code: 'MERGE_NOT_FULLY_CONVERTED',
        severity: SEVERITY.WARNING,
        message: `MERGE with ${mergeSources.join(', ')} is not equivalent to a single spark.table() read.`,
        suggested_action: 'Model as join + coalesce columns; verify BY keys and duplicate handling vs SAS.',
        block_id: blockId,
      })
    )
    penalties.push(18)
    lines.push(`# MERGE detected: ${mergeSources.join(', ')}`)
    if (byCols.length > 0) {
      lines.push(`# Suggested join keys from BY: ${byCols.join(', ')}`)
      lines.push(
        `# Example join:\n# left_df = spark.table("${mergeSources[0]}")\n# right_df = spark.table("${mergeSources[1] || mergeSources[0]}")\n# ${varName} = left_df.join(right_df, on=${JSON.stringify(byCols)}, how="inner")`
      )
    } else {
      lines.push('# TODO: define join keys for MERGE conversion.')
    }
  }

  const byTarget = {}
  for (const item of ifClauses) {
    byTarget[item.target] = byTarget[item.target] || []
    byTarget[item.target].push(item)
  }

  for (const target of Object.keys(byTarget)) {
    const chain = byTarget[target]
    const whenParts = chain.map((c) => {
      const condCode = conditionExprToSpark(c.condition, blockId, warnings)
      const valCode = valueExprToSpark(c.value, blockId, warnings)
      return `F.when(${condCode}, ${valCode})`
    })
    const fallback = elseClauses.find((e) => e.target === target)
    const otherwiseExpr = fallback
      ? `.otherwise(${valueExprToSpark(fallback.value, blockId, warnings)})`
      : `.otherwise(F.col(${JSON.stringify(target)}))`
    let whenExpr = whenParts[0] || `F.when(F.lit(False), F.col(${JSON.stringify(target)}))`
    for (let wi = 1; wi < whenParts.length; wi += 1) {
      whenExpr = `${whenExpr}.${whenParts[wi].slice(2)}`
    }
    lines.push(`${varName} = ${varName}.withColumn(${JSON.stringify(target)}, ${whenExpr}${otherwiseExpr})`)
  }

  if (mode === 'optimized') {
    lines.push(`${varName} = ${varName}.cache()`)
  }
  if (mode === 'databricks') {
    lines.push(
      `# Databricks: persist as Delta after validation\n# ${varName}.write.format("delta").mode("overwrite").saveAsTable("${out}")`
    )
  }

  const confidence = scoreBlock(92, penalties)
  const business_impact =
    mergeSources.length > 0
      ? 'Row-level business rules and merges may change grain; downstream aggregates and controls can diverge until joins are verified.'
      : 'Row-level transformations drive reporting and control totals; mis-stated filters or assignments propagate to reconciliation.'

  return {
    code: `# DATA STEP (${out})\n${lines.join('\n')}\n`,
    warnings,
    confidence,
    business_impact,
    next_steps: [
      'Confirm SET/MERGE grain matches legacy row counts.',
      'Add pytest / chispa tests for conditional columns and key integrity.',
      'Register Delta table and compare to SAS extracts in Validation Studio.',
    ],
  }
}

function convertProcSql(block, mode) {
  const blockId = block.id || null
  const warnings = []
  const text = (block.input || '').trim()
  const compactSql = text
    .replace(/^\s*proc\s+sql\s*;?/i, '')
    .replace(/\bquit\s*;?\s*$/i, '')
    .trim()

  let penalties = [0]
  if (/\bunion\b/i.test(compactSql)) {
    warnings.push(
      makeWarning({
        code: 'PROC_SQL_UNION',
        severity: SEVERITY.INFO,
        message: 'UNION/UNION ALL detected — validate column order and duplicate policy vs SAS.',
        suggested_action: 'Use unionByName where possible; align nullability and types.',
        block_id: blockId,
      })
    )
    penalties.push(4)
  }
  if (/\(\s*select/i.test(compactSql)) {
    warnings.push(
      makeWarning({
        code: 'PROC_SQL_SUBQUERY',
        severity: SEVERITY.WARNING,
        message: 'Nested subqueries may differ in null handling vs SAS PROC SQL.',
        suggested_action: 'Run EXPLAIN plans; compare row counts on representative slices.',
        block_id: blockId,
      })
    )
    penalties.push(8)
  }
  if (/\bcase\b/i.test(compactSql) && !/^\s*create\s+table/i.test(compactSql)) {
    penalties.push(2)
  }

  const createTable = compactSql.match(/\bcreate\s+table\s+([a-zA-Z0-9_.]+)/i)?.[1]
  const resultVar = asVarName(createTable ? `df_${createTable}` : 'df_sql_result')
  const queryOnly = compactSql.replace(/\bcreate\s+table\s+[a-zA-Z0-9_.]+\s+as\s+/i, '').trim()
  const dbxHint =
    mode === 'databricks'
      ? '\n# Databricks: prefer managed tables / Unity Catalog and job parameters for SQL text.'
      : ''

  if (createTable) {
    warnings.push(
      makeWarning({
        code: 'PROC_SQL_CREATE_TABLE',
        severity: SEVERITY.INFO,
        message: `CREATE TABLE ${createTable} — physical persistence not emitted (SQL only).`,
        suggested_action: 'Add explicit saveAsTable / Delta write with ACID expectations.',
        block_id: blockId,
      })
    )
  }

  const code = `# PROC SQL\nsql_query = """\n${queryOnly}\n"""\n${resultVar} = spark.sql(sql_query)${dbxHint}\n`
  const confidence = scoreBlock(88, penalties)

  return {
    code,
    warnings,
    confidence,
    business_impact:
      'SQL blocks often define critical marts and joins; subtle dialect differences affect balances and population filters.',
    next_steps: [
      'Compare Spark SQL dialect vs SAS (dates, nulls, strings).',
      'Materialize with deterministic partitioning; document SCD rules if any.',
    ],
  }
}

function parseProcSortByClause(text) {
  const byPart = text.match(/\bby\s+([^;]+)/i)?.[1] || ''
  const tokens = byPart.split(/\s+/).filter(Boolean)
  const cols = []
  let i = 0
  while (i < tokens.length) {
    const t = tokens[i]
    const low = t.toLowerCase()
    if (low === 'descending' || low === 'desc') {
      i += 1
      if (i < tokens.length) {
        cols.push({ name: tokens[i].replace(/[^a-zA-Z0-9_]/g, ''), descending: true })
        i += 1
      }
      continue
    }
    if (low === 'ascending' || low === 'asc') {
      i += 1
      if (i < tokens.length) {
        cols.push({ name: tokens[i].replace(/[^a-zA-Z0-9_]/g, ''), descending: false })
        i += 1
      }
      continue
    }
    cols.push({ name: t.replace(/[^a-zA-Z0-9_]/g, ''), descending: false })
    i += 1
  }
  return cols.filter((c) => c.name)
}

function convertProcSort(block) {
  const blockId = block.id || null
  const warnings = []
  const text = block.input || ''
  const inData = text.match(/\bdata\s*=\s*([a-zA-Z0-9_.]+)/i)?.[1] || block.input_datasets?.[0] || 'source_df'
  const outData = text.match(/\bout\s*=\s*([a-zA-Z0-9_.]+)/i)?.[1] || block.output_datasets?.[0] || inData
  const byCols = parseProcSortByClause(text)
  let penalties = []

  const orderParts = byCols.map((c) =>
    c.descending ? `F.col(${JSON.stringify(c.name)}).desc()` : `F.col(${JSON.stringify(c.name)})`
  )
  const byExpr = orderParts.length ? `.orderBy(${orderParts.join(', ')})` : ''

  if (!byCols.length) {
    warnings.push(
      makeWarning({
        code: 'PROC_SORT_NO_BY',
        severity: SEVERITY.WARNING,
        message: 'PROC SORT without BY — only NODUPKEY/global ordering assumptions apply.',
        suggested_action: 'Confirm whether ordering is required for downstream logic; add orderBy keys.',
        block_id: blockId,
      })
    )
    penalties.push(10)
  }

  const nodup = /\bnodupkey\b/i.test(text)
    ? byCols.length
      ? `.dropDuplicates([${byCols.map((c) => JSON.stringify(c.name)).join(', ')}])`
      : '.dropDuplicates()'
    : ''

  if (nodup && !byCols.length) {
    warnings.push(
      makeWarning({
        code: 'PROC_SORT_NODUPKEY_NO_KEYS',
        severity: SEVERITY.WARNING,
        message: 'NODUPKEY without BY columns — dropDuplicates() is global; may not match SAS intent.',
        suggested_action: 'Specify key columns for dropDuplicates to mirror NODUPKEY.',
        block_id: blockId,
      })
    )
    penalties.push(12)
  }

  const code = `# PROC SORT\ndf_${asVarName(outData)} = spark.table(${JSON.stringify(inData)})${byExpr}${nodup}\n`
  const confidence = scoreBlock(90, penalties)

  return {
    code,
    warnings,
    confidence,
    business_impact:
      'Sort order and duplicate removal change which rows survive joins and window functions — affects cohorts and KPIs.',
    next_steps: [
      'Validate row counts before/after sort + dedupe.',
      'If ties matter, add secondary sort keys as in SAS BY statement.',
    ],
  }
}

function inferSummaryAgg(varName, procText) {
  const t = procText.toLowerCase()
  // PROC SUMMARY often implies N + simple stats if VAR present
  if (/\bmean\b/i.test(t)) return { expr: `F.avg(F.col(${JSON.stringify(varName)})).alias("avg_${varName}")`, note: 'mean' }
  if (/\bsum\b/i.test(t)) return { expr: `F.sum(F.col(${JSON.stringify(varName)})).alias("sum_${varName}")`, note: 'sum' }
  if (/\bstd(dev)?\b/i.test(t)) return { expr: `F.stddev(F.col(${JSON.stringify(varName)})).alias("std_${varName}")`, note: 'std' }
  if (/\bmin\b/i.test(t)) return { expr: `F.min(F.col(${JSON.stringify(varName)})).alias("min_${varName}")`, note: 'min' }
  if (/\bmax\b/i.test(t)) return { expr: `F.max(F.col(${JSON.stringify(varName)})).alias("max_${varName}")`, note: 'max' }
  if (/\bn\b/i.test(t) || /\bcount\b/i.test(t))
    return { expr: `F.count(F.col(${JSON.stringify(varName)})).alias("n_${varName}")`, note: 'n' }
  // default common migration path
  return { expr: `F.sum(F.col(${JSON.stringify(varName)})).alias("sum_${varName}")`, note: 'default_sum' }
}

function convertProcSummary(block) {
  const blockId = block.id || null
  const warnings = []
  const text = block.input || ''
  const source = text.match(/\bdata\s*=\s*([a-zA-Z0-9_.]+)/i)?.[1] || block.input_datasets?.[0] || 'source_df'
  const classCols = (text.match(/\bclass\s+([^;]+)/i)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => c.replace(/[^a-zA-Z0-9_]/g, ''))
    .filter(Boolean)

  const varCols = (text.match(/\bvar\s+([^;]+)/i)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => c.replace(/[^a-zA-Z0-9_]/g, ''))
    .filter(Boolean)

  const classExpr = classCols.length ? `.groupBy(${classCols.map((c) => `F.col(${JSON.stringify(c)})`).join(', ')})` : ''
  let penalties = []

  let aggExprs = []
  if (varCols.length) {
    for (const v of varCols) {
      const inf = inferSummaryAgg(v, text)
      if (inf.note === 'default_sum' && !/\b(sum|mean|std|min|max|n\b|count)\b/i.test(text)) {
        warnings.push(
          makeWarning({
            code: 'PROC_SUMMARY_STAT_INFERRED',
            severity: SEVERITY.WARNING,
            message: `No explicit statistic for VAR ${v}; defaulting to sum — verify against SAS output.`,
            suggested_action: 'Add OUTPUT/STAT keywords or PROC MEANS options in SAS reference; set explicit agg.',
            block_id: blockId,
          })
        )
        penalties.push(14)
      }
      aggExprs.push(inf.expr)
    }
  } else {
    aggExprs.push('F.count(F.lit(1)).alias("row_count")')
    warnings.push(
      makeWarning({
        code: 'PROC_SUMMARY_NO_VAR',
        severity: SEVERITY.INFO,
        message: 'PROC SUMMARY without VAR — emitted row_count only.',
        suggested_action: 'If SAS produced column statistics, add VAR clause to conversion input.',
        block_id: blockId,
      })
    )
  }

  const varExpr = aggExprs.join(', ')
  const code = `# PROC SUMMARY\ndf_summary = spark.table(${JSON.stringify(source)})${classExpr}.agg(${varExpr})\n`
  const confidence = scoreBlock(85, penalties)

  return {
    code,
    warnings,
    confidence,
    business_impact:
      'Aggregates feed regulatory and financial reporting; wrong statistic or grain shifts totals materially.',
    next_steps: [
      'Reconcile group totals to SAS PROC SUMMARY/MEANS listing.',
      'Check for CLASS missing levels vs Spark groupBy null behavior.',
    ],
  }
}

function convertMacro(block) {
  const blockId = block.id || null
  const warnings = [
    makeWarning({
      code: 'MACRO_PARTIAL',
      severity: SEVERITY.ERROR,
      message: 'Macros are not expanded; only a Python function scaffold is emitted.',
      suggested_action: 'Inline macro calls manually or build a parameterizable PySpark module with tests.',
      block_id: blockId,
    }),
  ]
  const header = block.input.split(/\r?\n/)[0] || '%macro unresolved();'
  const macroName = header.match(/%macro\s+([a-zA-Z0-9_]+)/i)?.[1] || 'macro_placeholder'
  const params = header.match(/%macro\s+[a-zA-Z0-9_]+\((.*?)\)/i)?.[1] || ''
  const kwargs = params
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `${p}=None`)
    .join(', ')
  const code = `# MACRO — NOT AUTO-CONVERTED\n# ${header}\ndef ${macroName}(spark${kwargs ? `, ${kwargs}` : ''}):\n    raise NotImplementedError("Macro body requires manual migration and tests.")\n`
  return {
    code,
    warnings,
    confidence: 35,
    business_impact:
      'Macros often centralize business parameters; leaving them unexpanded risks silent divergence from legacy behavior.',
    next_steps: [
      'Expand macro calls in SAS or document parameters, then implement PySpark with explicit parameters.',
      'Add contract tests comparing macro-expanded SAS vs Spark.',
    ],
  }
}

function convertBlock(block, mode = 'basic') {
  const modeBanner =
    mode === 'optimized'
      ? '# Conversion mode: OPTIMIZED'
      : mode === 'databricks'
        ? '# Conversion mode: DATABRICKS_READY'
        : '# Conversion mode: BASIC'

  const warnings = []
  let result = {
    code: '# Unsupported block\n',
    warnings,
    confidence: 40,
    business_impact: 'Unknown block type may affect pipeline completeness.',
    next_steps: ['Review unrecognized SAS and translate manually.'],
  }

  if (block.type === 'DATA_STEP') result = convertDataStep(block, mode)
  else if (block.type === 'PROC_SQL') result = convertProcSql(block, mode)
  else if (block.type === 'PROC_SORT') result = convertProcSort(block)
  else if (block.type === 'PROC_SUMMARY') result = convertProcSummary(block)
  else if (block.type === 'MACRO') result = convertMacro(block)
  else {
    warnings.push(
      makeWarning({
        code: 'BLOCK_UNSUPPORTED',
        severity: SEVERITY.ERROR,
        message: `Block type ${block.type} is not converted.`,
        suggested_action: 'Add support in parser/converter or hand-translate this section.',
        block_id: block.id,
      })
    )
  }

  const mergedWarnings = [...(result.warnings || []), ...warnings]
  const converted_code = `${modeBanner}\n${result.code}`

  return {
    ...block,
    output: result.code,
    converted_code,
    warnings: mergedWarnings,
    conversion_confidence: result.confidence,
    business_impact: result.business_impact,
    next_steps: result.next_steps || [],
  }
}

function overallConfidence(blocks) {
  if (!blocks.length) return 0
  const vals = blocks.map((b) => b.conversion_confidence ?? 0)
  const min = Math.min(...vals)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  // Conservative: weight minimum heavily for audit use
  return Math.round(min * 0.45 + avg * 0.55)
}

function buildBusinessImpactSummary(blocks, structuredWarnings) {
  const hasError = structuredWarnings.some((w) => w.severity === SEVERITY.ERROR)
  const hasMerge = structuredWarnings.some((w) => w.code === 'MERGE_NOT_FULLY_CONVERTED')
  const macro = blocks.some((b) => b.type === 'MACRO')
  const parts = []
  if (hasError) parts.push('One or more blocks require manual implementation before production.')
  if (macro) parts.push('Macro logic is not executable as-is; dependent jobs may stall or diverge.')
  if (hasMerge) parts.push('Merge/join semantics need validation against legacy match-merge behavior.')
  if (!parts.length) {
    parts.push(
      'Converted constructs follow common PySpark patterns; remaining risk is dialect and data edge cases — validate with Migration Validation Studio.'
    )
  }
  return parts.join(' ')
}

function buildNextStepsRecommendations(blocks, structuredWarnings) {
  const out = new Set()
  for (const b of blocks) {
    for (const s of b.next_steps || []) out.add(s)
  }
  if (structuredWarnings.some((w) => w.code?.startsWith('EXPR_FALLBACK'))) {
    out.add('Replace remaining F.expr fallbacks with tested Column logic and document assumptions.')
  }
  if (structuredWarnings.some((w) => w.code === 'MACRO_PARTIAL')) {
    out.add('Schedule macro design review with owners of parameterized SAS jobs.')
  }
  out.add('Run Migration Validation Studio on representative extracts + stress partitions.')
  return [...out].slice(0, 12)
}

function normalizeParserWarnings(stringWarnings, blocks) {
  return (stringWarnings || []).map((msg, i) =>
    makeWarning({
      code: 'PARSER_GENERIC',
      severity: SEVERITY.WARNING,
      message: String(msg),
      suggested_action: 'Verify SAS structure, includes, and block boundaries.',
      block_id: blocks[0]?.id || null,
    })
  )
}

function convertSasBlocks(blocks = [], mode = 'basic', parserWarnings = []) {
  const convertedBlocks = blocks.map((b) => convertBlock(b, mode))
  const parserStructured = normalizeParserWarnings(parserWarnings, blocks)
  const blockWarnings = convertedBlocks.flatMap((b) => b.warnings || [])
  const allStructured = [...parserStructured, ...blockWarnings]

  const overall = overallConfidence(convertedBlocks)
  const business_impact_summary = buildBusinessImpactSummary(convertedBlocks, allStructured)
  const next_steps_recommendations = buildNextStepsRecommendations(convertedBlocks, allStructured)

  const pysparkCode = ['from pyspark.sql import functions as F', '', ...convertedBlocks.map((b) => b.converted_code)].join(
    '\n\n'
  )

  // De-dupe warnings by code+message+block_id
  const seen = new Set()
  const deduped = []
  for (const w of allStructured) {
    const k = `${w.code}|${w.message}|${w.block_id || ''}`
    if (seen.has(k)) continue
    seen.add(k)
    deduped.push(w)
  }

  return {
    blocks: convertedBlocks,
    pyspark_code: pysparkCode,
    warnings: deduped,
    overall_conversion_confidence: overall,
    business_impact_summary,
    next_steps_recommendations,
  }
}

module.exports = {
  convertSasBlocks,
  SEVERITY,
  makeWarning,
}
