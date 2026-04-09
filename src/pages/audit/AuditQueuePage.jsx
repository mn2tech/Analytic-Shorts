import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  computeAuditQueueKpis,
  filterAuditCases,
  patchAuditCase,
  refreshAuditCases,
  uniqueValues,
} from '../../utils/auditWorkflowModel'

const EMPTY_FILTERS = {
  risk_level: '',
  recommended_action: '',
  state: '',
  product_type: '',
  assigned_auditor: '',
  case_status: '',
  report_month: '',
}

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return String(iso)
  }
}

function badgeClassRisk(level) {
  if (level === 'High') return 'bg-red-100 text-red-800 border-red-200'
  if (level === 'Medium') return 'bg-amber-100 text-amber-900 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function badgeClassAction(action) {
  if (action === 'Immediate Audit') return 'bg-rose-100 text-rose-900 border-rose-200'
  if (action === 'Review') return 'bg-violet-100 text-violet-900 border-violet-200'
  return 'bg-emerald-100 text-emerald-900 border-emerald-200'
}

function SelectFilter({ label, value, onChange, options, placeholder = 'All' }) {
  return (
    <label className="flex flex-col gap-1 min-w-[140px]">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function AuditQueuePage() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selectedCaseId, setSelectedCaseId] = useState('')

  const reload = useCallback(() => {
    const nextCases = refreshAuditCases()
    setCases(Array.isArray(nextCases) ? nextCases : [])
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const filtered = useMemo(() => filterAuditCases(cases, filters), [cases, filters])
  const kpis = useMemo(() => computeAuditQueueKpis(cases), [cases])
  const safeKpis = useMemo(() => ({
    total_flagged_cases: Number(kpis?.total_flagged_cases ?? 0),
    immediate_audit: Number(kpis?.immediate_audit ?? 0),
    review_needed: Number(kpis?.review_needed ?? 0),
    monitor: Number(kpis?.monitor ?? 0),
    estimated_recovery: Number(kpis?.estimated_recovery ?? 0),
    open_cases: Number(kpis?.open_cases ?? 0),
  }), [kpis])
  const selectedCase = useMemo(
    () => filtered.find((c) => String(c?.case_id) === String(selectedCaseId)) || null,
    [filtered, selectedCaseId]
  )

  const riskLevels = useMemo(() => ['High', 'Medium', 'Low'], [])
  const actions = useMemo(() => ['Immediate Audit', 'Review', 'Monitor'], [])
  const states = useMemo(() => uniqueValues(cases, 'state'), [cases])
  const productTypes = useMemo(() => uniqueValues(cases, 'product_type'), [cases])
  const auditors = useMemo(() => uniqueValues(cases, 'assigned_to'), [cases])
  const statuses = useMemo(() => uniqueValues(cases, 'status'), [cases])
  const reportMonths = useMemo(() => uniqueValues(cases, 'report_month'), [cases])

  const setFilter = (key, v) => setFilters((f) => ({ ...f, [key]: v }))

  const onAssign = (c) => {
    const name = window.prompt('Assign auditor', c.assigned_to || '')
    if (name === null) return
    patchAuditCase(c.case_id, { assigned_to: name, assigned_auditor: name, status: 'Assigned' })
    reload()
  }

  const onStartAudit = (c) => {
    patchAuditCase(c.case_id, { status: 'In Review', case_status: 'In Review' })
    reload()
  }

  const onExportRow = (c) => {
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${c.case_id}-summary.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-full bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Compliance Operations</p>
              <h1 className="text-2xl font-semibold text-slate-900 mt-1">Audit Queue</h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                TTB-style review workflow. Cases are built from your Dashboard dataset and the last AI risk run (when available).
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={reload}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Refresh queue
              </button>
              <Link
                to="/dashboard"
                className="px-3 py-2 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
              >
                Open Dashboard
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-8">
            {[
              { label: 'Total Flagged Cases', value: safeKpis.total_flagged_cases, hint: 'High + Medium risk' },
              { label: 'Immediate Audit', value: safeKpis.immediate_audit, hint: 'Action = Immediate' },
              { label: 'Review Needed', value: safeKpis.review_needed, hint: 'Action = Review' },
              { label: 'Monitor', value: safeKpis.monitor, hint: 'Action = Monitor' },
              { label: 'Estimated Recovery', value: formatMoney(safeKpis.estimated_recovery), hint: 'Sum of case estimates' },
              { label: 'Open Cases', value: safeKpis.open_cases, hint: 'Excludes closed' },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{k.label}</p>
                <p className="text-2xl font-semibold text-slate-900 mt-2 tabular-nums">{k.value}</p>
                <p className="text-xs text-slate-500 mt-1">{k.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <SelectFilter
              label="Risk level"
              value={filters.risk_level}
              onChange={(v) => setFilter('risk_level', v)}
              options={riskLevels}
            />
            <SelectFilter
              label="Recommended action"
              value={filters.recommended_action}
              onChange={(v) => setFilter('recommended_action', v)}
              options={actions}
            />
            <SelectFilter
              label="State"
              value={filters.state}
              onChange={(v) => setFilter('state', v)}
              options={states}
            />
            <SelectFilter
              label="Product type"
              value={filters.product_type}
              onChange={(v) => setFilter('product_type', v)}
              options={productTypes}
            />
            <SelectFilter
              label="Assigned auditor"
              value={filters.assigned_auditor}
              onChange={(v) => setFilter('assigned_auditor', v)}
              options={auditors}
            />
            <SelectFilter
              label="Case status"
              value={filters.case_status}
              onChange={(v) => setFilter('case_status', v)}
              options={statuses}
            />
            <SelectFilter
              label="Report month"
              value={filters.report_month}
              onChange={(v) => setFilter('report_month', v)}
              options={reportMonths}
            />
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="ml-auto px-3 py-1.5 text-sm font-medium text-indigo-700 hover:text-indigo-900"
            >
              Clear filters
            </button>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-slate-800 font-medium">No audit cases yet</p>
            <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
              Create audit cases from AI Insights or flagged anomalies.
            </p>
            <Link to="/dashboard" className="inline-block mt-4 text-sm font-semibold text-indigo-600 hover:underline">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <p className="text-sm font-semibold text-slate-800">
                Queue <span className="text-slate-500 font-normal">({filtered.length} of {cases.length})</span>
              </p>
            </div>
            <div className="overflow-auto max-h-[min(70vh,720px)]">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 shadow-[0_1px_0_0_rgba(15,23,42,0.06)]">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-600">
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Case ID</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Permit ID</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Company</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Product</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">State</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap text-right">Risk</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Level</th>
                    <th className="px-3 py-2.5 font-semibold min-w-[160px]">Top reason</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap text-right">Tax gap</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap text-right">Violations</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Action</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Assigned</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Updated</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap sticky right-0 bg-slate-100 z-10 min-w-[220px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filtered.map((c) => (
                    <tr
                      key={c.case_id}
                      className={`group hover:bg-slate-50/80 cursor-pointer ${
                        selectedCaseId && String(selectedCaseId) === String(c.case_id) ? 'bg-indigo-50/50' : ''
                      }`}
                      onClick={() => setSelectedCaseId(String(c.case_id))}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-slate-800 whitespace-nowrap">{c.case_id}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700 whitespace-nowrap">{c.permit_id}</td>
                      <td className="px-3 py-2 text-slate-900 max-w-[200px] truncate" title={c.company_name}>{c.company_name}</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{c.product_type}</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{c.state}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900">{c.risk_score}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${badgeClassRisk(c.risk_level)}`}>
                          {c.risk_level}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 text-xs max-w-[220px]" title={c.top_reason}>{c.top_reason}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-800">{formatMoney(c.tax_gap)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-800">{c.violations_count ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${badgeClassAction(c.recommended_action)}`}>
                          {c.recommended_action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-800 whitespace-nowrap">{c.assigned_to}</td>
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{c.status}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">{formatDate(c.last_updated)}</td>
                      <td className="px-3 py-2 sticky right-0 bg-white group-hover:bg-slate-50/80 border-l border-slate-100 z-10">
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/audit/case/${encodeURIComponent(c.case_id)}`)}
                            className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onAssign(c) }}
                            className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                          >
                            Assign
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onStartAudit(c) }}
                            className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-xs font-medium text-indigo-900 hover:bg-indigo-100"
                          >
                            Start
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onExportRow(c) }}
                            className="px-2 py-1 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                          >
                            Export
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {cases.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
            <p className="text-sm font-semibold text-slate-800 mb-3">Selected case detail</p>
            {!selectedCase ? (
              <p className="text-sm text-slate-600">Select a row to view case details.</p>
            ) : (
              <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div><dt className="text-slate-500">Case ID</dt><dd className="font-medium text-slate-900">{selectedCase.case_id || '—'}</dd></div>
                <div><dt className="text-slate-500">Company</dt><dd className="font-medium text-slate-900">{selectedCase.company_name || '—'}</dd></div>
                <div><dt className="text-slate-500">Risk</dt><dd className="font-medium text-slate-900">{selectedCase.risk_score ?? 0} ({selectedCase.risk_level || '—'})</dd></div>
                <div><dt className="text-slate-500">Top reason</dt><dd className="text-slate-800">{selectedCase.top_reason || '—'}</dd></div>
                <div><dt className="text-slate-500">Action</dt><dd className="text-slate-800">{selectedCase.recommended_action || '—'}</dd></div>
                <div><dt className="text-slate-500">Status</dt><dd className="text-slate-800">{selectedCase.status || '—'}</dd></div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="text-slate-500">Explanation</dt>
                  <dd className="mt-1 text-slate-800">{selectedCase.explanation_text || selectedCase.narrative || 'No explanation available.'}</dd>
                </div>
              </dl>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
