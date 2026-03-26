function normalizeLine(line) {
  return String(line || '').trim()
}

function detectBlockType(startLine) {
  const line = normalizeLine(startLine).toLowerCase()
  if (line.startsWith('data ')) return 'DATA_STEP'
  if (line.startsWith('proc sql')) return 'PROC_SQL'
  if (line.startsWith('proc sort')) return 'PROC_SORT'
  if (line.startsWith('proc summary')) return 'PROC_SUMMARY'
  if (line.startsWith('%macro ')) return 'MACRO'
  return 'OTHER'
}

function extractDatasetHints(blockText, type) {
  const text = String(blockText || '')
  const input = []
  const output = []

  if (type === 'DATA_STEP') {
    const out = text.match(/^\s*data\s+([a-zA-Z0-9_.]+)/im)
    if (out) output.push(out[1])
    const setMatches = [...text.matchAll(/\bset\s+([a-zA-Z0-9_.]+)/gim)]
    setMatches.forEach((m) => input.push(m[1]))
    const mergeMatches = [...text.matchAll(/\bmerge\s+([a-zA-Z0-9_.]+)/gim)]
    mergeMatches.forEach((m) => input.push(m[1]))
  }

  if (type === 'PROC_SORT') {
    const inData = text.match(/\bdata\s*=\s*([a-zA-Z0-9_.]+)/im)
    const outData = text.match(/\bout\s*=\s*([a-zA-Z0-9_.]+)/im)
    if (inData) input.push(inData[1])
    if (outData) output.push(outData[1])
  }

  if (type === 'PROC_SQL') {
    const createTable = text.match(/\bcreate\s+table\s+([a-zA-Z0-9_.]+)/im)
    if (createTable) output.push(createTable[1])
    const fromMatches = [...text.matchAll(/\bfrom\s+([a-zA-Z0-9_.]+)/gim)]
    fromMatches.forEach((m) => input.push(m[1]))
    const joinMatches = [...text.matchAll(/\bjoin\s+([a-zA-Z0-9_.]+)/gim)]
    joinMatches.forEach((m) => input.push(m[1]))
  }

  const byColumns = (text.match(/\bby\s+([^;]+)/im)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
  const classColumns = (text.match(/\bclass\s+([^;]+)/im)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
  const varColumns = (text.match(/\bvar\s+([^;]+)/im)?.[1] || '')
    .split(/\s+/)
    .filter(Boolean)
  const macroParams = type === 'MACRO'
    ? ((text.match(/%macro\s+[a-zA-Z0-9_]+\((.*?)\)/i)?.[1] || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean))
    : []

  return {
    input_datasets: [...new Set(input)],
    output_datasets: [...new Set(output)],
    constructs: {
      by_columns: byColumns,
      class_columns: classColumns,
      var_columns: varColumns,
      macro_params: macroParams,
    },
  }
}

function parseSasCode(sasCode = '') {
  const code = String(sasCode || '')
    .replace(/;\s*(data|proc|%macro|%mend)\b/gi, ';\n$1')
    .replace(/\b(run|quit)\s*;\s*(data|proc|%macro)\b/gi, '$1;\n$2')
  const lines = code.split(/\r?\n/)
  const blocks = []
  const warnings = []
  let i = 0

  while (i < lines.length) {
    const line = normalizeLine(lines[i])
    if (!line) {
      i += 1
      continue
    }

    const type = detectBlockType(line)
    if (type === 'OTHER') {
      i += 1
      continue
    }

    const start = i
    let end = i
    const terminal = type === 'PROC_SQL' ? /\bquit\s*;/i : type === 'MACRO' ? /\b%mend\b/i : /\brun\s*;/i
    while (end < lines.length) {
      if (terminal.test(lines[end])) break
      end += 1
    }

    const blockLines = lines.slice(start, Math.min(end + 1, lines.length))
    const raw = blockLines.join('\n')
    const datasets = extractDatasetHints(raw, type)
    blocks.push({
      id: `block_${blocks.length + 1}`,
      type,
      line_start: start + 1,
      line_end: Math.min(end + 1, lines.length),
      input: raw,
      ...datasets,
    })
    i = Math.max(end + 1, i + 1)
  }

  if (!blocks.length) warnings.push('No recognized SAS blocks found. Check syntax or upload full script.')
  if (/%include\b/i.test(code)) warnings.push('External %INCLUDE dependencies are not resolved in MVP mode.')
  if (/\bcall\s+execute\b/i.test(code)) warnings.push('CALL EXECUTE is dynamic and may require manual conversion.')

  return { blocks, warnings }
}

module.exports = {
  parseSasCode,
}
