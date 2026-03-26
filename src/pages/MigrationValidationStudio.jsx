import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { buildValidationReport, profileValidationDatasets, runDatasetValidation } from '../api/validationClient'
import apiClient from '../config/api'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const DEFAULT_OPTIONS = {
  numericTolerance: 0.01,
  ignoreCase: true,
  trimWhitespace: true,
  treatNullAsEmpty: true,
  enableToleranceComparison: true,
}

function prettyPercent(value) {
  const n = Number(value || 0)
  return `${n.toFixed(2)}%`
}

function computeValidationConfidence(summary) {
  const matchPct = Number(summary?.match_percentage || 0) / 100
  const status = summary?.status
  const schemaIssuesLen = Array.isArray(summary?.schema_issues) ? summary.schema_issues.length : 0
  const mismatchedRows = Number(summary?.mismatched_rows || 0)

  const statusBoost = status === 'PASS' ? 0.15 : status === 'WARNING' ? 0.07 : 0.03
  const schemaPenalty = Math.min(0.18, schemaIssuesLen * 0.01)
  const mismatchPenalty = Math.min(0.25, mismatchedRows * 0.002)

  const confidence = matchPct * 0.75 + statusBoost - schemaPenalty - mismatchPenalty
  const bounded = Math.max(0, Math.min(1, confidence))
  return Math.round(bounded * 100)
}

function looksLikeDateValue(value) {
  if (value === null || value === undefined || value === '') return false
  if (typeof value === 'number') return false
  const text = String(value).trim()
  if (!text) return false
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return true
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)) return true
  const parsed = Date.parse(text)
  return !Number.isNaN(parsed)
}

function downloadText(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function uploadDataset(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post('/api/upload', formData, { timeout: 300000 })
  return response.data
}

function truncateValue(value, maxLen = 140) {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'string' ? value : String(value)
  if (s.length <= maxLen) return s
  return `${s.slice(0, maxLen)}…`
}

function mismatchReasonToRule(reason) {
  if (!reason) return 'RULE'
  const r = String(reason)
  if (r === 'numeric_tolerance_exceeded') return 'TOLERANCE'
  if (r === 'null_mismatch') return 'NULL/EMPTY'
  if (r === 'value_mismatch') return 'NORMALIZATION'
  return r.toUpperCase()
}

export default function MigrationValidationStudio() {
  const location = useLocation()
  const { user, userProfile } = useAuth()
  const [pairs, setPairs] = useState([{ name: 'Primary Pair', source: null, target: null }])
  const [keyColumns, setKeyColumns] = useState([])
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [result, setResult] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const migrationPayload = location.state?.migrationPayload || null
  const [migrationPrefillApplied, setMigrationPrefillApplied] = useState(false)

  const [activeResultsTab, setActiveResultsTab] = useState('Overview')
  const [selectedBlockType, setSelectedBlockType] = useState('ALL') // ALL | DATA_STEP | PROC_SQL | PROC_SUMMARY
  const [sampleMismatchPage, setSampleMismatchPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerRecord, setDrawerRecord] = useState(null)

  const auditPanelRef = useRef(null)
  const [runMeta, setRunMeta] = useState(null) // { runId, executedBy, timestamp, runtimeMs, confidencePct }

  const primaryPair = pairs[0]
  const allColumns = useMemo(() => primaryPair?.source?.columns || [], [primaryPair])
  const canRunPrimary = !!primaryPair?.source?.data?.length && !!primaryPair?.target?.data?.length && keyColumns.length > 0
  const hasPipelinePairs = pairs.length > 1 && pairs.every((pair) => pair?.source?.data?.length && pair?.target?.data?.length)

  useEffect(() => {
    if (!migrationPayload || migrationPrefillApplied) return
    const recommended = migrationPayload?.recommended || {}
    if (Array.isArray(recommended.keyColumns) && recommended.keyColumns.length > 0) {
      setKeyColumns(recommended.keyColumns)
    }
    if (recommended.options && typeof recommended.options === 'object') {
      setOptions((prev) => ({ ...prev, ...recommended.options }))
    }
    setMigrationPrefillApplied(true)
  }, [migrationPayload, migrationPrefillApplied])

  const setPairValue = (index, side, value) => {
    setPairs((prev) => prev.map((pair, i) => (i === index ? { ...pair, [side]: value } : pair)))
  }

  const handleUpload = async (index, side, file) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const parsed = await uploadDataset(file)
      setPairValue(index, side, { ...parsed, fileName: file.name })
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Dataset upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const runProfile = async () => {
    if (!primaryPair?.source?.data || !primaryPair?.target?.data) return
    setError('')
    try {
      const prof = await profileValidationDatasets({
        sourceData: primaryPair.source.data,
        targetData: primaryPair.target.data,
      })
      setProfile(prof)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to profile datasets.')
    }
  }

  const runValidation = async () => {
    const startedAt = Date.now()
    const runId = `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    const executedBy = user?.email || userProfile?.name || 'anonymous'
    const startedIso = new Date().toISOString()
    setLoading(true)
    setError('')
    setResult(null)
    setSampleMismatchPage(1)
    try {
      const payload = hasPipelinePairs
        ? {
            keyColumns,
            options,
            datasetPairs: pairs.map((pair) => ({
              name: pair.name,
              sourceData: pair.source.data,
              targetData: pair.target.data,
              keyColumns,
            })),
          }
        : {
            sourceData: primaryPair.source.data,
            targetData: primaryPair.target.data,
            keyColumns,
            options,
          }
      const response = await runDatasetValidation(payload)
      setResult(response)

      const effectiveSummary = response?.pipeline_mode ? response?.aggregate : response
      const runtimeMs = Date.now() - startedAt
      const confidencePct = computeValidationConfidence(effectiveSummary)
      setRunMeta({
        runId,
        executedBy,
        timestamp: startedIso,
        runtimeMs,
        confidencePct,
      })
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Validation failed.')
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = async (format) => {
    if (!result) return
    try {
      const metadata = {
        module: 'migration-validation-studio',
        run_id: runMeta?.runId,
        executed_by: runMeta?.executedBy,
        executed_at: runMeta?.timestamp,
        validation_mode: migrationPayload?.mode || 'key-based-reconciliation',
        key_columns: keyColumns || [],
        tolerance: options?.numericTolerance,
      }
      const report = await buildValidationReport(result, format, metadata)
      if (format === 'csv') {
        downloadText('migration-validation-report.csv', report.content, 'text/csv')
        return
      }
      downloadText('migration-validation-report.json', JSON.stringify(report.content, null, 2), 'application/json')
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to build report.')
    }
  }

  const downloadAuditPdf = async () => {
    if (!auditPanelRef.current) return
    try {
      const panelEl = auditPanelRef.current
      const canvas = await html2canvas(panelEl, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')

      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      const filename = `migration-audit-${runMeta?.runId || 'unknown'}.pdf`
      pdf.save(filename)
    } catch (err) {
      console.error('Audit PDF generation failed:', err)
      setError(err?.message || 'Failed to generate Audit PDF.')
    }
  }

  const summary = result?.pipeline_mode ? result?.aggregate : result
  const schemaIssues = result?.schema_issues || []
  const columnMismatches = result?.column_mismatches || {}
  const missingInSource = result?.missing_in_source || []
  const missingInTarget = result?.missing_in_target || []
  const sampleRows = result?.sample_mismatched_rows || []
  const mismatchEntries = Object.entries(columnMismatches)
    .sort((a, b) => b[1] - a[1])
    .map(([column, count]) => ({ column, count }))
  const maxMismatchCount = mismatchEntries[0]?.count || 1
  const comparedRowCount = (summary?.matched_rows || 0) + (summary?.mismatched_rows || 0)
  const statusTone =
    summary?.status === 'PASS'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : summary?.status === 'WARNING'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200'

  const currentStep = result
    ? 4
    : canRunPrimary || hasPipelinePairs
      ? 3
      : keyColumns.length > 0
        ? 2
        : primaryPair?.source?.data && primaryPair?.target?.data
          ? 2
          : 1

  const stepItems = ['Upload', 'Configure', 'Validate', 'Results']
  const rootCauses = [
    { label: 'Schema issues', value: schemaIssues.length },
    { label: 'Missing in target', value: summary?.missing_in_target?.length || 0 },
    { label: 'Missing in source', value: summary?.missing_in_source?.length || 0 },
    { label: 'Duplicate keys', value: (summary?.duplicate_keys_source?.length || 0) + (summary?.duplicate_keys_target?.length || 0) },
    { label: 'Tolerance breaches', value: summary?.mismatched_rows || 0 },
  ].filter((item) => item.value > 0)
  const rootCauseReasons = useMemo(() => {
    const reasons = []
    const mismatchMap = new Map()
    for (const row of sampleRows) {
      for (const detail of row?.mismatchDetails || []) {
        const current = mismatchMap.get(detail.column) || {
          count: 0,
          dateLike: false,
          reasonCounts: {},
        }
        current.count += 1
        current.reasonCounts[detail.reason || 'value_mismatch'] = (current.reasonCounts[detail.reason || 'value_mismatch'] || 0) + 1
        if (looksLikeDateValue(detail.source) || looksLikeDateValue(detail.target)) {
          current.dateLike = true
        }
        mismatchMap.set(detail.column, current)
      }
    }

    const topEntry = [...mismatchMap.entries()].sort((a, b) => b[1].count - a[1].count)[0]
    if (topEntry) {
      const [column, info] = topEntry
      if (info.dateLike || column.toLowerCase().includes('date')) {
        reasons.push(`Likely date-format mismatch in \`${column}\` (e.g., YYYY-MM-DD vs MM/DD/YYYY).`)
      }
      const topReason = Object.entries(info.reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (topReason === 'numeric_tolerance_exceeded') {
        reasons.push(`Numeric values in \`${column}\` exceeded the configured tolerance (${options.numericTolerance}).`)
      } else if (topReason === 'null_mismatch') {
        reasons.push(`Null/empty handling differences detected for \`${column}\`.`)
      } else if (!reasons.length) {
        reasons.push(`Value normalization mismatch detected in \`${column}\` (formatting or transformation differences).`)
      }
    }

    if ((summary?.missing_in_target?.length || 0) > 0) {
      reasons.push('Some source keys are missing in target output.')
    }
    if ((summary?.missing_in_source?.length || 0) > 0) {
      reasons.push('Some target keys are missing in source output.')
    }
    if ((summary?.duplicate_keys_source?.length || 0) + (summary?.duplicate_keys_target?.length || 0) > 0) {
      reasons.push('Duplicate business keys found; this can create false mismatches.')
    }
    return reasons
  }, [sampleRows, summary, options.numericTolerance])

  const pipelineColumnMapping = useMemo(() => {
    const pipelineBlocks = Array.isArray(migrationPayload?.pipelineBlocks) ? migrationPayload.pipelineBlocks : []
    const blockTypes = ['DATA_STEP', 'PROC_SQL', 'PROC_SUMMARY']

    const columnsByBlock = {}
    for (const t of blockTypes) columnsByBlock[t] = new Set()

    for (const block of pipelineBlocks) {
      const type = block?.type
      if (!blockTypes.includes(type)) continue
      const constructs = block?.constructs || {}
      const candidates = [
        ...(Array.isArray(constructs.by_columns) ? constructs.by_columns : []),
        ...(Array.isArray(constructs.class_columns) ? constructs.class_columns : []),
        ...(Array.isArray(constructs.var_columns) ? constructs.var_columns : []),
      ]
      for (const c of candidates) {
        if (!c) continue
        columnsByBlock[type].add(String(c).toLowerCase())
      }
    }

    const columnToBlocks = new Map() // columnLower -> Set(blockType)
    const affectedBlockMismatchCounts = { DATA_STEP: 0, PROC_SQL: 0, PROC_SUMMARY: 0 }

    for (const { column, count } of mismatchEntries) {
      const colLower = String(column || '').toLowerCase()
      const hits = []
      for (const t of blockTypes) {
        if (columnsByBlock[t]?.has(colLower)) hits.push(t)
      }
      if (!hits.length) continue
      columnToBlocks.set(colLower, new Set(hits))
      for (const t of hits) affectedBlockMismatchCounts[t] += Number(count || 0)
    }

    return {
      columnsByBlock,
      columnToBlocks,
      affectedBlockMismatchCounts,
      hasMapping: columnToBlocks.size > 0,
    }
  }, [migrationPayload, mismatchEntries])

  const selectedColumnsFilter = useMemo(() => {
    if (selectedBlockType === 'ALL') return null
    if (!pipelineColumnMapping?.hasMapping) return null // if mapping is unavailable, don't hide data
    const out = new Set()
    for (const { column } of mismatchEntries) {
      const colLower = String(column || '').toLowerCase()
      const blocks = pipelineColumnMapping.columnToBlocks.get(colLower)
      if (blocks && blocks.has(selectedBlockType)) out.add(colLower)
    }
    return out
  }, [selectedBlockType, pipelineColumnMapping, mismatchEntries])

  const filteredMismatchEntries = useMemo(() => {
    if (!selectedColumnsFilter) return mismatchEntries
    return mismatchEntries.filter((e) => selectedColumnsFilter.has(String(e.column || '').toLowerCase()))
  }, [mismatchEntries, selectedColumnsFilter])

  const filteredSchemaIssues = useMemo(() => {
    if (!selectedColumnsFilter) return schemaIssues
    return schemaIssues.filter((issue) => {
      const col = issue?.column
      return col ? selectedColumnsFilter.has(String(col).toLowerCase()) : false
    })
  }, [schemaIssues, selectedColumnsFilter])

  const flattenedSampleMismatchRows = useMemo(() => {
    const recordByKey = new Map()
    for (const rec of sampleRows || []) {
      if (rec?.key != null) recordByKey.set(rec.key, rec)
    }

    const out = []
    for (const rec of sampleRows || []) {
      const businessKey = rec?.key
      const details = Array.isArray(rec?.mismatchDetails) ? rec.mismatchDetails : []
      for (const d of details) {
        const column = d?.column
        const colLower = String(column || '').toLowerCase()
        const blocks = pipelineColumnMapping?.columnToBlocks?.get(colLower)
        const passes =
          selectedBlockType === 'ALL' ||
          !pipelineColumnMapping?.hasMapping ||
          (blocks && blocks.has(selectedBlockType))

        if (!passes) continue

        out.push({
          businessKey,
          column,
          sourceValue: d?.source,
          targetValue: d?.target,
          delta: d?.delta,
          reason: d?.reason,
          rule: mismatchReasonToRule(d?.reason),
          record: recordByKey.get(businessKey),
        })
      }
    }
    return out
  }, [sampleRows, pipelineColumnMapping, selectedBlockType])

  const sampleMismatchPageSize = 20
  const sampleMismatchTotalPages = Math.max(
    1,
    Math.ceil(flattenedSampleMismatchRows.length / sampleMismatchPageSize)
  )
  const pagedSampleMismatchRows = flattenedSampleMismatchRows.slice(
    (sampleMismatchPage - 1) * sampleMismatchPageSize,
    sampleMismatchPage * sampleMismatchPageSize
  )

  const confidencePct = runMeta?.confidencePct ?? computeValidationConfidence(summary || {})
  const confidenceLevel = confidencePct >= 95 ? 'High' : confidencePct >= 80 ? 'Medium' : 'Low'
  const missingTotal = (summary?.missing_in_target?.length || 0) + (summary?.missing_in_source?.length || 0)
  const schemaIssuesTotal = schemaIssues?.length || 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Migration Validation Studio</h1>
              <p className="text-sm text-slate-600 mt-2">
                Validate SAS to Python/PySpark/Databricks migrations with key-based reconciliation and audit-ready reporting.
              </p>
            </div>
            {summary?.status && (
              <div className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${statusTone}`}>
                {summary.status}
              </div>
            )}
          </div>
          <div className="mt-5">
            <div className="flex items-center gap-2 overflow-x-auto">
              {stepItems.map((step, index) => {
                const stepNumber = index + 1
                const done = currentStep > stepNumber
                const active = currentStep === stepNumber
                return (
                  <div key={step} className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full border text-xs font-semibold flex items-center justify-center ${
                        done
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : active
                            ? 'bg-blue-50 border-blue-300 text-blue-700'
                            : 'bg-white border-slate-300 text-slate-500'
                      }`}
                    >
                      {stepNumber}
                    </div>
                    <div className={`text-sm ${active ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{step}</div>
                    {index < stepItems.length - 1 && <div className="w-8 h-px bg-slate-300" />}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        {migrationPayload && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-sm text-indigo-900">
            Migration context received from SAS to PySpark Studio: mode <strong>{migrationPayload.mode}</strong>, {migrationPayload.blockCount} block(s), {migrationPayload.warnings?.length || 0} warning(s).
            {migrationPrefillApplied && (
              <span> Recommended validation settings have been applied.</span>
            )}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Upload</h2>
            <button
              type="button"
              onClick={() => setPairs((prev) => [...prev, { name: `Dataset Pair ${prev.length + 1}`, source: null, target: null }])}
              className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Add Dataset Pair
            </button>
          </div>
          <p className="text-xs text-slate-500">CSV/XLSX supported. For larger files, upload and parsing may take longer.</p>
          {pairs.map((pair, index) => (
            <div key={`${pair.name}-${index}`} className="border border-slate-200 rounded-xl p-4">
              <div className="font-medium text-slate-800 mb-3">{pair.name}</div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <label className="block border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">Source Dataset (SAS output)</span>
                  <input type="file" accept=".csv,.xlsx" className="mt-3 block w-full text-sm" onChange={(e) => handleUpload(index, 'source', e.target.files?.[0])} />
                  <span className="text-xs text-slate-500 block mt-2">{pair.source?.fileName || 'No source file uploaded.'}</span>
                </label>
                <label className="block border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <span className="text-sm font-medium text-slate-700">Target Dataset (Python/PySpark output)</span>
                  <input type="file" accept=".csv,.xlsx" className="mt-3 block w-full text-sm" onChange={(e) => handleUpload(index, 'target', e.target.files?.[0])} />
                  <span className="text-xs text-slate-500 block mt-2">{pair.target?.fileName || 'No target file uploaded.'}</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Configure</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <label className="block border border-slate-200 rounded-xl p-4">
              <span className="text-sm font-medium text-slate-700">Business Key Columns</span>
              <select
                multiple
                value={keyColumns}
                onChange={(e) => setKeyColumns(Array.from(e.target.selectedOptions, (option) => option.value))}
                className="mt-3 h-36 w-full border border-slate-300 rounded-lg p-2 text-sm"
              >
                {allColumns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2">Select one or more business keys for exact row matching.</p>
            </label>
            <div className="space-y-3 border border-slate-200 rounded-xl p-4">
              <div className="text-sm font-medium text-slate-700">Validation Rules</div>
              <label className="block">
                <span className="text-sm text-slate-700">Numeric tolerance</span>
                <input
                  type="number"
                  step="0.0001"
                  value={options.numericTolerance}
                  onChange={(e) => setOptions((prev) => ({ ...prev, numericTolerance: Number(e.target.value) }))}
                  className="mt-2 w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </label>
              {[
                ['ignoreCase', 'Ignore case'],
                ['trimWhitespace', 'Trim whitespace'],
                ['treatNullAsEmpty', 'Treat null equals empty'],
                ['enableToleranceComparison', 'Enable tolerance comparison'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!options[key]}
                    onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Validate</h2>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runProfile}
              disabled={!primaryPair?.source?.data || !primaryPair?.target?.data || uploading}
              className="px-4 py-2 rounded-lg bg-slate-700 text-white disabled:opacity-50"
            >
              Profile Datasets
            </button>
            <button
              type="button"
              onClick={runValidation}
              disabled={(!canRunPrimary && !hasPipelinePairs) || uploading || loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50"
            >
              Run Validation
            </button>
            {(loading || uploading) && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="w-4 h-4 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
                {loading ? 'Validation in progress...' : 'Uploading datasets...'}
              </div>
            )}
          </div>
          {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
        </div>

        {!result ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-slate-500">
            Upload source and target datasets, choose business keys, configure rules, then run validation.
          </div>
        ) : (
          <>
            {/* Decision-first Executive Hero */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex items-start gap-4">
                  <div
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold ${
                      summary?.status === 'PASS'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : summary?.status === 'WARNING'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {summary?.status || 'N/A'}
                  </div>
                  <div>
                    <div className="text-3xl font-semibold text-slate-900">
                      {prettyPercent(summary?.match_percentage || 0)}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {summary?.status === 'PASS'
                        ? 'Reconciliation complete: no record-level mismatches detected.'
                        : summary?.status === 'WARNING'
                          ? `Reconciliation complete with reviewable differences (${summary?.mismatched_rows || 0} mismatches, ${missingTotal} missing).`
                          : `Reconciliation failed: ${summary?.mismatched_rows || 0} mismatches and ${missingTotal} missing records require investigation.`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[340px]">
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Source dataset</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1 truncate" title={primaryPair?.source?.fileName || ''}>
                      {primaryPair?.source?.fileName || 'Source - not provided'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Target dataset</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1 truncate" title={primaryPair?.target?.fileName || ''}>
                      {primaryPair?.target?.fileName || 'Target - not provided'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Runtime</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {runMeta?.runtimeMs != null ? `${(runMeta.runtimeMs / 1000).toFixed(1)}s` : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Validation confidence</p>
                    <p className="text-sm font-semibold text-slate-900 mt-1">
                      {confidencePct}% <span className="text-xs text-slate-500 font-normal">({confidenceLevel})</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">KPI Summary</h2>
              {(() => {
                const criticalRegex = /(revenue|balance|amount|interest|profit|net|gross|principal)/i
                const criticalMismatch = mismatchEntries.reduce((acc, e) => {
                  if (criticalRegex.test(String(e.column || ''))) return acc + Number(e.count || 0)
                  return acc
                }, 0)
                const materiality = criticalMismatch > 0 ? (summary?.status === 'PASS' ? 'Low' : 'High') : 'Low'
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{summary?.status || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">Match %</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{prettyPercent(summary?.match_percentage || 0)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">Matched Rows</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{summary?.matched_rows || 0}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">Mismatched Rows</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{summary?.mismatched_rows || 0}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">Missing Rows</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{missingTotal}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <p className="text-xs text-slate-500">Schema Issues</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{schemaIssuesTotal}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2 lg:col-span-1">
                      <p className="text-xs text-slate-500">Materiality (optional)</p>
                      <p className="text-sm font-semibold text-slate-900 mt-1">{materiality}</p>
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Root Cause + Pipeline Impact */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Root Cause Analysis</h2>
                {rootCauses.length === 0 ? (
                  <p className="text-sm text-slate-600">No material root causes detected. Validation is fully aligned.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                      {rootCauses.map((item) => (
                        <div key={item.label} className="rounded-xl border border-slate-200 p-4">
                          <p className="text-xs text-slate-500">{item.label}</p>
                          <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {rootCauseReasons.length > 0 && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Likely Reasons</p>
                        <ul className="text-sm text-blue-900 space-y-1">
                          {rootCauseReasons.map((reason, idx) => (
                            <li key={`${reason}-${idx}`}>- {reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Pipeline Impact</h2>
                <p className="text-sm text-slate-600 mb-3">
                  Filter drill-down by the SAS-to-PySpark conversion blocks most likely responsible for mismatches.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'ALL', label: 'All blocks', count: mismatchEntries.reduce((a, b) => a + Number(b.count || 0), 0) },
                    { id: 'DATA_STEP', label: 'DATA STEP', count: pipelineColumnMapping?.affectedBlockMismatchCounts?.DATA_STEP || 0 },
                    { id: 'PROC_SQL', label: 'PROC SQL', count: pipelineColumnMapping?.affectedBlockMismatchCounts?.PROC_SQL || 0 },
                    { id: 'PROC_SUMMARY', label: 'PROC SUMMARY', count: pipelineColumnMapping?.affectedBlockMismatchCounts?.PROC_SUMMARY || 0 },
                  ].map((chip) => {
                    const active = selectedBlockType === chip.id
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          setSelectedBlockType(chip.id)
                          setSampleMismatchPage(1)
                          setDrawerOpen(false)
                          setDrawerRecord(null)
                        }}
                        className={`px-3 py-2 rounded-full border text-sm font-medium transition-colors ${
                          active
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{chip.label}</span>
                        <span className="ml-2 text-xs opacity-90">
                          {chip.count > 0 ? chip.count : ''}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {!pipelineColumnMapping?.hasMapping && (
                  <div className="mt-4 text-xs text-slate-500">
                    Block-to-column mapping was not available in the migration handoff. Showing all mismatches.
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 flex-wrap">
                {['Overview', 'Schema', 'Columns', 'Missing Records', 'Sample Mismatches'].map((t) => {
                  const active = activeResultsTab === t
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveResultsTab(t)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        active
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>

              <div className="mt-5">
                {activeResultsTab === 'Overview' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                      <p className="text-sm text-slate-700">
                        Decision summary: <span className="font-semibold">{summary?.status || 'N/A'}</span> with match{" "}
                        <span className="font-semibold">{prettyPercent(summary?.match_percentage || 0)}</span>. Engine detected{" "}
                        <span className="font-semibold">{summary?.mismatched_rows || 0}</span> mismatched rows across{" "}
                        <span className="font-semibold">{Object.keys(columnMismatches || {}).length}</span> column(s).
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-900 mb-2">Likely mismatch drivers</h3>
                      {rootCauseReasons.length === 0 ? (
                        <p className="text-sm text-slate-600">No likely reasons detected.</p>
                      ) : (
                        <ul className="text-sm text-slate-700 space-y-1 list-disc ml-5">
                          {rootCauseReasons.map((reason, idx) => (
                            <li key={`${reason}-${idx}`}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {activeResultsTab === 'Schema' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-900 mb-2">Type mismatches</h3>
                      {filteredSchemaIssues.filter((i) => i.type === 'datatype_mismatch').length === 0 ? (
                        <p className="text-sm text-slate-600">No datatype mismatches.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left border-b border-slate-200">
                                <th className="py-2">Column</th>
                                <th>Source Type</th>
                                <th>Target Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSchemaIssues
                                .filter((i) => i.type === 'datatype_mismatch')
                                .map((issue, idx) => (
                                  <tr key={`${issue.column || 'col'}-${idx}`} className="border-b border-slate-100">
                                    <td className="py-2">{issue.column}</td>
                                    <td className="py-2">{issue.sourceType}</td>
                                    <td className="py-2">{issue.targetType}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900 mb-2">Missing columns (in target)</h3>
                        {filteredSchemaIssues.filter((i) => i.type === 'missing_in_target').length === 0 ? (
                          <p className="text-sm text-slate-600">None.</p>
                        ) : (
                          <ul className="text-sm text-slate-700 space-y-1">
                            {filteredSchemaIssues
                              .filter((i) => i.type === 'missing_in_target')
                              .map((i, idx) => (
                                <li key={`${i.column}-${idx}`}>{i.column}</li>
                              ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900 mb-2">Extra columns (in target)</h3>
                        {filteredSchemaIssues.filter((i) => i.type === 'missing_in_source').length === 0 ? (
                          <p className="text-sm text-slate-600">None.</p>
                        ) : (
                          <ul className="text-sm text-slate-700 space-y-1">
                            {filteredSchemaIssues
                              .filter((i) => i.type === 'missing_in_source')
                              .map((i, idx) => (
                                <li key={`${i.column}-${idx}`}>{i.column}</li>
                              ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeResultsTab === 'Columns' && (
                  <div className="space-y-3">
                    {filteredMismatchEntries.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
                        No column mismatches for the selected block filter.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 p-4">
                        <h3 className="font-semibold text-slate-900 mb-3">Ranked mismatch summary</h3>
                        <div className="space-y-3">
                          {filteredMismatchEntries.map((e) => {
                            const denom = comparedRowCount || 1
                            const colMatchPct = Math.max(0, 100 - (Number(e.count || 0) / denom) * 100)
                            const ratio = Number(e.count || 0) / denom
                            const severity = ratio >= 0.05 ? 'High' : ratio >= 0.02 ? 'Medium' : 'Low'
                            const barW = Math.max(6, (Number(e.count || 0) / maxMismatchCount) * 100)
                            const severityColor =
                              severity === 'High' ? 'bg-rose-600' : severity === 'Medium' ? 'bg-amber-500' : 'bg-emerald-600'

                            return (
                              <div key={e.column} className="rounded-xl border border-slate-100 p-3">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="min-w-[160px]">
                                    <div className="text-sm font-semibold text-slate-900 truncate">{e.column}</div>
                                    <div className="text-xs text-slate-500">Severity: {severity}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-semibold text-slate-900">{e.count} mismatches</div>
                                    <div className="text-xs text-slate-500">Match: {colMatchPct.toFixed(2)}%</div>
                                  </div>
                                </div>
                                <div className="mt-2 h-2 rounded bg-slate-100 overflow-hidden">
                                  <div className={`${severityColor} h-2 rounded`} style={{ width: `${barW}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeResultsTab === 'Missing Records' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-900 mb-2">Missing in source</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left border-b border-slate-200">
                              <th className="py-2">Key</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(summary?.missing_in_source || []).slice(0, 50).map((row, idx) => (
                              <tr key={`${row.key}-${idx}`} className="border-b border-slate-100">
                                <td className="py-2">{row.key}</td>
                              </tr>
                            ))}
                            {missingInSource?.length === 0 && (
                              <tr>
                                <td className="py-2 text-sm text-slate-600">None.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Showing first 50 keys. Total: {summary?.missing_in_source?.length || 0}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                      <h3 className="font-semibold text-slate-900 mb-2">Missing in target</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left border-b border-slate-200">
                              <th className="py-2">Key</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(summary?.missing_in_target || []).slice(0, 50).map((row, idx) => (
                              <tr key={`${row.key}-${idx}`} className="border-b border-slate-100">
                                <td className="py-2">{row.key}</td>
                              </tr>
                            ))}
                            {missingInTarget?.length === 0 && (
                              <tr>
                                <td className="py-2 text-sm text-slate-600">None.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-xs text-slate-500 mt-2">
                        Showing first 50 keys. Total: {summary?.missing_in_target?.length || 0}
                      </div>
                    </div>
                  </div>
                )}

                {activeResultsTab === 'Sample Mismatches' && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-slate-900">Record-level mismatches</h3>
                          <p className="text-sm text-slate-600 mt-1">
                            Click a row to open the right-side record detail drawer.
                          </p>
                        </div>
                        <div className="text-xs text-slate-500">
                          Showing page <span className="font-semibold">{sampleMismatchPage}</span> of{' '}
                          <span className="font-semibold">{sampleMismatchTotalPages}</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left border-b border-slate-200">
                              <th className="py-2">Business Key</th>
                              <th className="py-2">Column</th>
                              <th className="py-2">Source Value</th>
                              <th className="py-2">Target Value</th>
                              <th className="py-2">Delta</th>
                              <th className="py-2">Rule</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedSampleMismatchRows.length === 0 ? (
                              <tr>
                                <td className="py-3 text-sm text-slate-600" colSpan={6}>
                                  No sample mismatches for this filter.
                                </td>
                              </tr>
                            ) : (
                              pagedSampleMismatchRows.map((row, idx) => (
                                <tr
                                  key={`${row.businessKey}-${row.column}-${idx}`}
                                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                                  onClick={() => {
                                    setDrawerRecord(row.record)
                                    setDrawerOpen(true)
                                  }}
                                >
                                  <td className="py-2">{row.businessKey}</td>
                                  <td className="py-2 font-medium text-slate-900">{row.column}</td>
                                  <td className="py-2">{truncateValue(row.sourceValue, 60)}</td>
                                  <td className="py-2">{truncateValue(row.targetValue, 60)}</td>
                                  <td className="py-2">{row.delta == null ? '-' : String(row.delta)}</td>
                                  <td className="py-2">
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs border border-slate-200 bg-white">
                                      {row.rule}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-xs text-slate-500">
                          Total mismatch entries: {flattenedSampleMismatchRows.length}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 disabled:opacity-50"
                            disabled={sampleMismatchPage === 1}
                            onClick={() => setSampleMismatchPage((p) => Math.max(1, p - 1))}
                          >
                            Previous
                          </button>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 disabled:opacity-50"
                            disabled={sampleMismatchPage === sampleMismatchTotalPages}
                            onClick={() => setSampleMismatchPage((p) => Math.min(sampleMismatchTotalPages, p + 1))}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Record Detail Drawer */}
            {drawerOpen && drawerRecord && (
              <>
                <div
                  className="fixed inset-0 bg-black/30 z-[60]"
                  onClick={() => {
                    setDrawerOpen(false)
                    setDrawerRecord(null)
                  }}
                />
                <aside className="fixed right-0 top-0 h-screen w-[420px] z-[70] bg-white border-l border-slate-200 shadow-xl flex flex-col">
                  <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wide">Record Detail</div>
                      <div className="text-lg font-semibold text-slate-900 mt-1">Key: {drawerRecord?.key}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerOpen(false)
                        setDrawerRecord(null)
                      }}
                      className="px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>

                  <div className="p-4 overflow-auto space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-2">Mismatch rules</h3>
                      <div className="space-y-2">
                        {(drawerRecord?.mismatchDetails || []).map((d, idx) => (
                          <div key={`${d.column}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="font-medium text-slate-900">{d.column}</div>
                              <span className="text-xs px-2 py-1 rounded-full border border-slate-200 bg-white">
                                {mismatchReasonToRule(d.reason)}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-2">
                              Delta: {d.delta == null ? '-' : String(d.delta)} | Reason: {d.reason || '-'}
                            </div>
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                                <div className="text-[11px] text-slate-500">Source</div>
                                <div className="text-sm text-slate-900 break-all">{truncateValue(d.source, 120)}</div>
                              </div>
                              <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
                                <div className="text-[11px] text-slate-500">Target</div>
                                <div className="text-sm text-slate-900 break-all">{truncateValue(d.target, 120)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Source row</div>
                        <pre className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-2 overflow-auto">
                          {truncateValue(JSON.stringify(drawerRecord?.sourceRow || {}, null, 2), 900)}
                        </pre>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3">
                        <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Target row</div>
                        <pre className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-2 overflow-auto">
                          {truncateValue(JSON.stringify(drawerRecord?.targetRow || {}, null, 2), 900)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </aside>
              </>
            )}

            {/* Audit & Sign-Off */}
            <div ref={auditPanelRef} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Audit & Sign-Off</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Generate audit-ready reconciliation artifacts for governance and sign-off.
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => downloadReport('json')}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Download JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadReport('csv')}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Download CSV
                  </button>
                  <button
                    type="button"
                    onClick={downloadAuditPdf}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Download Audit PDF
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Run ID</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">{runMeta?.runId || '—'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Executed by</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">{runMeta?.executedBy || '—'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Timestamp</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">
                    {runMeta?.timestamp ? new Date(runMeta.timestamp).toLocaleString() : '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Validation mode</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">{migrationPayload?.mode || 'Key-based reconciliation'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 md:col-span-2">
                  <div className="text-xs text-slate-500">Key columns</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">{(keyColumns || []).length ? keyColumns.join(', ') : '—'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500">Tolerance</div>
                  <div className="text-sm font-semibold text-slate-900 mt-1">{options?.numericTolerance ?? DEFAULT_OPTIONS.numericTolerance}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {profile && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Profile Snapshot</h2>
            <p className="text-sm text-slate-600">
              Source rows: {profile.sourceProfile?.rowCount || 0} | Target rows: {profile.targetProfile?.rowCount || 0}
            </p>
            <p className="text-sm text-slate-600">Schema issues found: {profile.schemaDiff?.schemaIssues?.length || 0}</p>
          </div>
        )}
      </div>
    </div>
  )
}
