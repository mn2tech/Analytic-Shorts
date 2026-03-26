function asVarName(name, fallback = 'df_result') {
  const base = String(name || fallback).replace(/[^a-zA-Z0-9_]/g, '_')
  return /^[a-zA-Z_]/.test(base) ? base : `df_${base}`
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

function convertDataStep(block, mode) {
  const text = block.input || ''
  const out = block.output_datasets?.[0] || 'output_df'
  const varName = asVarName(`df_${out}`)
  const sourceList = block.input_datasets?.length ? block.input_datasets : ['source_df']
  const setStmt = sourceList.length > 1
    ? `${varName} = spark.table("${sourceList[0]}")  # TODO: handle additional SET sources: ${sourceList.slice(1).join(', ')}`
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
        lines.push(`${varName} = ${varName}.withColumn("${assignMatch[1]}", F.expr(${JSON.stringify(assignMatch[2])}))`)
      }
    }
  }

  const byCols = (text.match(/\bby\s+([^;]+)/i)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
  const mergeSources = [...text.matchAll(/\bmerge\s+([a-zA-Z0-9_.]+)/gim)].map((m) => m[1])
  if (mergeSources.length > 0) {
    lines.push(`# MERGE detected: ${mergeSources.join(', ')}`)
    if (byCols.length > 0) {
      lines.push(`# Suggested join keys from BY clause: ${byCols.join(', ')}`)
      lines.push(`# Example: ${varName} = spark.table("${mergeSources[0]}").join(spark.table("${mergeSources[1] || mergeSources[0]}"), on=${JSON.stringify(byCols)}, how="inner")`)
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
      .map((c) => `F.when(F.expr(${JSON.stringify(c.condition)}), F.expr(${JSON.stringify(c.value)}))`)
      .join('\n    ')
    const fallback = elseClauses.find((e) => e.target === target)
    const otherwiseExpr = fallback
      ? `.otherwise(F.expr(${JSON.stringify(fallback.value)}))`
      : '.otherwise(F.col("' + target + '"))'
    lines.push(`${varName} = ${varName}.withColumn("${target}", ${chain}${otherwiseExpr})`)
  }

  if (mode === 'optimized') {
    lines.push(`${varName} = ${varName}.cache()`)
  }
  if (mode === 'databricks') {
    lines.push(`# Databricks note: consider Delta write\n# ${varName}.write.format("delta").mode("overwrite").saveAsTable("${out}")`)
  }

  return `# DATA STEP (${out})\n${lines.join('\n')}\n`
}

function convertProcSql(block, mode) {
  const text = (block.input || '').trim()
  const compactSql = text
    .replace(/^\s*proc\s+sql\s*;?/i, '')
    .replace(/\bquit\s*;?\s*$/i, '')
    .trim()
  const createTable = compactSql.match(/\bcreate\s+table\s+([a-zA-Z0-9_.]+)/i)?.[1]
  const resultVar = asVarName(createTable ? `df_${createTable}` : 'df_sql_result')
  const queryOnly = compactSql.replace(/\bcreate\s+table\s+[a-zA-Z0-9_.]+\s+as\s+/i, '').trim()
  const dbxHint = mode === 'databricks' ? '\n# Databricks-ready: keep SQL in a notebook cell or temp view pipeline.' : ''
  return `# PROC SQL\nsql_query = """\n${queryOnly}\n"""\n${resultVar} = spark.sql(sql_query)${dbxHint}\n`
}

function convertProcSort(block) {
  const text = block.input || ''
  const inData = text.match(/\bdata\s*=\s*([a-zA-Z0-9_.]+)/i)?.[1] || block.input_datasets?.[0] || 'source_df'
  const outData = text.match(/\bout\s*=\s*([a-zA-Z0-9_.]+)/i)?.[1] || block.output_datasets?.[0] || inData
  const byCols = (text.match(/\bby\s+([^;]+)/i)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => `"${c}"`)
  const byExpr = byCols.length ? `.orderBy(${byCols.join(', ')})` : ''
  const nodup = /\bnodupkey\b/i.test(text)
    ? byCols.length
      ? `.dropDuplicates([${byCols.join(', ')}])`
      : '.dropDuplicates()'
    : ''
  return `# PROC SORT\ndf_${asVarName(outData)} = spark.table("${inData}")${byExpr}${nodup}\n`
}

function convertProcSummary(block) {
  const text = block.input || ''
  const source = text.match(/\bdata\s*=\s*([a-zA-Z0-9_.]+)/i)?.[1] || block.input_datasets?.[0] || 'source_df'
  const classCols = (text.match(/\bclass\s+([^;]+)/i)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => `"${c}"`)
  const varCols = (text.match(/\bvar\s+([^;]+)/i)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((c) => `"${c}"`)
  const classExpr = classCols.length ? `.groupBy(${classCols.join(', ')})` : ''
  const statMap = /mean/i.test(text)
    ? (v) => `F.avg(${v}).alias("avg_${v.replace(/"/g, '')}")`
    : (v) => `F.sum(${v}).alias("sum_${v.replace(/"/g, '')}")`
  const varExpr = varCols.length ? varCols.map(statMap).join(', ') : 'F.count("*").alias("row_count")'
  return `# PROC SUMMARY\ndf_summary = spark.table("${source}")${classExpr}.agg(${varExpr})\n`
}

function convertMacro(block) {
  const header = block.input.split(/\r?\n/)[0] || '%macro unresolved();'
  const macroName = header.match(/%macro\s+([a-zA-Z0-9_]+)/i)?.[1] || 'macro_placeholder'
  const params = header.match(/%macro\s+[a-zA-Z0-9_]+\((.*?)\)/i)?.[1] || ''
  const kwargs = params
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `${p}=None`)
    .join(', ')
  return `# MACRO\n# ${header}\ndef ${macroName}(spark${kwargs ? `, ${kwargs}` : ''}):\n    # TODO: macro body requires manual conversion.\n    return None\n`
}

function convertBlock(block, mode = 'basic') {
  const modeBanner =
    mode === 'optimized'
      ? '# Conversion mode: OPTIMIZED'
      : mode === 'databricks'
        ? '# Conversion mode: DATABRICKS_READY'
        : '# Conversion mode: BASIC'

  let converted = '# Unsupported block'
  const warnings = []
  if (block.type === 'DATA_STEP') converted = convertDataStep(block, mode)
  else if (block.type === 'PROC_SQL') converted = convertProcSql(block, mode)
  else if (block.type === 'PROC_SORT') converted = convertProcSort(block)
  else if (block.type === 'PROC_SUMMARY') converted = convertProcSummary(block)
  else if (block.type === 'MACRO') {
    converted = convertMacro(block)
    warnings.push('Macro conversion is partial in MVP mode. Validate manually.')
  }

  if (/merge\s+/i.test(block.input || '')) {
    warnings.push('MERGE converted with join-key assumptions; verify BY-based join logic.')
  }

  return {
    ...block,
    output: converted,
    converted_code: `${modeBanner}\n${converted}`,
    warnings,
  }
}

function convertSasBlocks(blocks = [], mode = 'basic') {
  const convertedBlocks = blocks.map((b) => convertBlock(b, mode))
  const allWarnings = convertedBlocks.flatMap((b) => b.warnings || [])
  const pysparkCode = [
    'from pyspark.sql import functions as F',
    '',
    ...convertedBlocks.map((b) => b.converted_code),
  ].join('\n\n')

  return {
    blocks: convertedBlocks,
    pyspark_code: pysparkCode,
    warnings: [...new Set(allWarnings)],
  }
}

module.exports = {
  convertSasBlocks,
}
