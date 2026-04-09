import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getAuditCaseById,
  patchAuditCase,
  refreshAuditCases,
} from '../../utils/auditWorkflowModel'

function formatMoney(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return String(iso)
  }
}

function badgeRisk(level) {
  if (level === 'High') return 'bg-red-100 text-red-800 border-red-200'
  if (level === 'Medium') return 'bg-amber-100 text-amber-900 border-amber-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function badgeAction(action) {
  if (action === 'Immediate Audit') return 'bg-rose-100 text-rose-900 border-rose-200'
  if (action === 'Review') return 'bg-violet-100 text-violet-900 border-violet-200'
  return 'bg-emerald-100 text-emerald-900 border-emerald-200'
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/90">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

export default function AuditCaseDetailPage() {
  const { caseId: rawCaseId } = useParams()
  const caseId = rawCaseId ? decodeURIComponent(rawCaseId) : ''
  const navigate = useNavigate()
  const [c, setC] = useState(null)

  const reload = useCallback(() => {
    refreshAuditCases()
    setC(getAuditCaseById(caseId))
  }, [caseId])

  useEffect(() => {
    reload()
  }, [reload])

  const onAssign = () => {
    if (!c) return
    const name = window.prompt('Assign auditor', c.assigned_to || '')
    if (name === null) return
    patchAuditCase(c.case_id, { assigned_to: name, assigned_auditor: name, status: 'Assigned' })
    reload()
  }

  const onStartAudit = () => {
    if (!c) return
    patchAuditCase(c.case_id, { status: 'In Review', case_status: 'In Review' })
    reload()
  }

  const onEscalate = () => {
    if (!c) return
    patchAuditCase(c.case_id, {
      escalation_note: `${c.escalation_note || ''}\n[Escalated ${new Date().toISOString()}] Routed to regional lead.`,
    })
    reload()
    window.alert('Case escalated (note appended).')
  }

  const onClose = () => {
    if (!c) return
    if (!window.confirm('Close this case?')) return
    patchAuditCase(c.case_id, { status: 'Closed', case_status: 'Closed' })
    reload()
  }

  const onExportPdf = () => {
    window.print()
  }

  const onGenerateSummary = () => {
    if (!c) return
    const text = [
      `Case ${c.case_id}`,
      c.company_name,
      c.narrative || '',
      `Risk ${c.risk_score} (${c.risk_level})`,
      `Recommended: ${c.recommended_action}`,
    ].join('\n')
    window.alert(`Case summary (preview):\n\n${text}`)
  }

  const onDownloadPacket = () => {
    if (!c) return
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${c.case_id}-packet.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!c) {
    return (
      <div className="min-h-full bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <p className="text-slate-900 font-medium">Case not found</p>
          <p className="text-sm text-slate-600 mt-2">
            Refresh the queue from the Dashboard or open Audit Queue to rebuild cases.
          </p>
          <Link to="/audit" className="inline-block mt-4 text-sm font-semibold text-indigo-600 hover:underline">
            Back to Audit Queue
          </Link>
        </div>
      </div>
    )
  }

  const ev = c.evidence || {}

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 print:bg-white">
      <div className="border-b border-slate-200 bg-white print:border-0">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link to="/audit" className="text-xs font-semibold text-indigo-600 hover:underline">
                ← Audit Queue
              </Link>
              <h1 className="text-2xl font-semibold text-slate-900 mt-2">{c.company_name}</h1>
              <p className="text-sm text-slate-600 mt-1 font-mono">{c.permit_id}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeRisk(c.risk_level)}`}>
                  Risk: {c.risk_level}
                </span>
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeAction(c.recommended_action)}`}>
                  {c.recommended_action}
                </span>
                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-800">
                  Status: {c.status}
                </span>
                <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700">
                  Auditor: {c.assigned_to}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button type="button" onClick={onAssign} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50">
                Assign
              </button>
              <button type="button" onClick={onStartAudit} className="px-3 py-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700">
                Start Audit
              </button>
              <button type="button" onClick={onEscalate} className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-sm font-medium text-amber-900 hover:bg-amber-100">
                Escalate
              </button>
              <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50">
                Close Case
              </button>
              <button type="button" onClick={onExportPdf} className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-900 text-sm font-medium text-white hover:bg-slate-800">
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Section title="Case summary">
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500 font-medium">Company profile</dt>
              <dd className="mt-1 text-slate-900">{c.company_profile}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Product type</dt>
              <dd className="mt-1 text-slate-900">{c.product_type}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">State</dt>
              <dd className="mt-1 text-slate-900">{c.state}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Report month</dt>
              <dd className="mt-1 text-slate-900">{c.report_month}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 font-medium">Filing history</dt>
              <dd className="mt-1">
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
                  {(c.filing_history || []).map((row, i) => (
                    <li key={i} className="flex justify-between gap-4 px-3 py-2 bg-white text-sm">
                      <span className="text-slate-600">{row.date}</span>
                      <span className="text-slate-800 font-medium">{row.type}</span>
                      <span className="text-slate-700 tabular-nums">{row.amount}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 font-medium">Prior issues</dt>
              <dd className="mt-1">
                <ul className="list-disc ml-5 text-slate-800 space-y-1">
                  {(c.prior_issues || []).map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="Explainability">
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-slate-500 font-medium">Risk score</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{c.risk_score}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Tax gap</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{formatMoney(c.tax_gap)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Inspection score</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{c.inspection_score ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Violations count</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{c.violations_count ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Anomaly flag</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold border ${c.anomaly_flag ? 'bg-amber-100 text-amber-900 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {c.anomaly_flag ? 'Yes' : 'No'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Top reason</dt>
              <dd className="mt-1 text-slate-900">{c.top_reason}</dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-slate-500 font-medium">Narrative explanation</dt>
              <dd className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 leading-relaxed">
                {c.explanation_text || c.narrative}
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="Recommended action">
          <dl className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-slate-500 font-medium">Workflow</dt>
              <dd className="mt-1">
                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold border ${badgeAction(c.recommended_action)}`}>
                  {c.recommended_action}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Estimated recovery</dt>
              <dd className="mt-1 text-slate-900 font-semibold tabular-nums">{formatMoney(c.estimated_recovery_case)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Priority</dt>
              <dd className="mt-1 text-slate-900">{c.priority}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Due date</dt>
              <dd className="mt-1 text-slate-900">{formatDate(c.due_date)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 font-medium">Escalation note</dt>
              <dd className="mt-1 rounded-lg border border-slate-200 bg-amber-50/60 px-3 py-2 text-slate-800 whitespace-pre-wrap">
                {c.escalation_note}
              </dd>
            </div>
          </dl>
        </Section>

        <Section title="Audit timeline">
          <ol className="relative border-l border-slate-200 ml-2 space-y-4 pl-6">
            {(c.timeline || []).map((step, i) => (
              <li key={i} className="text-sm">
                <span className="absolute -left-[9px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-300" />
                <p className="font-semibold text-slate-900">{step.stage}</p>
                <p className="text-slate-600 text-xs mt-0.5">
                  {step.date ? formatDate(step.date) : '—'} · <span className="capitalize">{step.status}</span>
                </p>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Evidence & documents">
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-slate-500 font-medium mb-2">Filing records</p>
              <ul className="space-y-1">
                {(ev.filingRecords || []).map((x, i) => (
                  <li key={i} className="text-slate-800">
                    <span className="text-slate-400 font-mono text-xs mr-2">DOC</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-slate-500 font-medium mb-2">Inspection history</p>
              <ul className="space-y-1">
                {(ev.inspectionHistory || []).map((x, i) => (
                  <li key={i} className="text-slate-800">
                    <span className="text-slate-400 font-mono text-xs mr-2">INS</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
              <p className="text-slate-500 font-medium mb-2">AI summary</p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800">{ev.aiSummary || c.top_reason}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-slate-500 font-medium mb-1">Notes</p>
              <textarea
                className="w-full min-h-[88px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="Add operational notes…"
                defaultValue={ev.notes || ''}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-6 print:hidden">
            <button
              type="button"
              onClick={onGenerateSummary}
              className="px-3 py-2 rounded-lg bg-slate-900 text-sm font-medium text-white hover:bg-slate-800"
            >
              Generate case summary
            </button>
            <button
              type="button"
              onClick={onDownloadPacket}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
            >
              Download case packet
            </button>
          </div>
        </Section>

        <Section title="Outcome tracking">
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-slate-500 font-medium">Confirmed issue</dt>
              <dd className="mt-1 text-slate-900">{c.outcome?.confirmed_issue == null ? 'TBD' : c.outcome.confirmed_issue ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Recovered tax amount</dt>
              <dd className="mt-1 text-slate-900 tabular-nums">{c.outcome?.recovered_tax_amount || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Penalty amount</dt>
              <dd className="mt-1 text-slate-900 tabular-nums">{c.outcome?.penalty_amount || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Time spent (hours)</dt>
              <dd className="mt-1 text-slate-900 tabular-nums">{c.outcome?.time_spent_hours || '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">Resolution status</dt>
              <dd className="mt-1 text-slate-900">{c.outcome?.resolution_status || '—'}</dd>
            </div>
          </dl>
        </Section>
      </div>
    </div>
  )
}
