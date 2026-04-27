import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import ParityFiltersBar from '../features/mh-parity/components/ParityFiltersBar'
import ParityKpiCards from '../features/mh-parity/components/ParityKpiCards'
import ParityExecutiveSummary from '../features/mh-parity/components/ParityExecutiveSummary'
import ParityInsightBlocks from '../features/mh-parity/components/ParityInsightBlocks'
import { fetchMhParityDemoDataset } from '../services/mhParityDemoService'
import { buildParityDemoState, exportRecordsToCsv } from '../features/mh-parity/parityComplianceUtils'

const DEFAULT_FILTERS = {
  mco: 'All',
  compliance: 'All',
  submission: 'All',
  issueType: 'All',
  reportingPeriod: 'All',
}

const CHART_COLORS = ['#22d3ee', '#fb7185', '#a78bfa', '#f59e0b', '#34d399', '#f472b6']

function statusBadge(status) {
  if (status === 'Compliant') return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
  if (status === 'Non-Compliant') return 'bg-rose-500/20 text-rose-200 border-rose-500/30'
  if (status === 'Data Quality Issue') return 'bg-violet-500/20 text-violet-200 border-violet-500/30'
  if (status === 'Missing Submission') return 'bg-amber-500/20 text-amber-200 border-amber-500/30'
  return 'bg-slate-500/20 text-slate-200 border-slate-500/30'
}

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function MentalHealthParityMcoHelpdeskDemo() {
  const [rawData, setRawData] = useState([])
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [viewMode, setViewMode] = useState('executive')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function loadData() {
      try {
        setLoading(true)
        const dataset = await fetchMhParityDemoDataset()
        if (mounted) {
          setRawData(dataset)
          setError('')
        }
      } catch (err) {
        if (mounted) setError(err?.response?.data?.error || err?.message || 'Unable to load parity demo data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const viewModel = useMemo(() => buildParityDemoState(rawData, filters), [rawData, filters])

  const options = useMemo(() => {
    const unique = (selector) => ['All', ...new Set(viewModel.allRecords.map(selector).filter(Boolean))]
    return {
      mco: unique((row) => row.mco_name),
      compliance: unique((row) => row.derived_compliance_status),
      submission: unique((row) => row.submission_status),
      issueType: unique((row) => row.derived_issue_type),
      reportingPeriod: unique((row) => row.reporting_period),
    }
  }, [viewModel.allRecords])

  const issueKeys = useMemo(() => {
    const keys = new Set()
    viewModel.issueTypeByMco.forEach((item) => {
      Object.keys(item).forEach((key) => {
        if (key !== 'mco_name') keys.add(key)
      })
    })
    return [...keys].slice(0, 5)
  }, [viewModel.issueTypeByMco])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-8">
        <p className="text-sm">Loading Mental Health Parity MCO Helpdesk Demo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 px-6 py-8">
        <p className="text-sm text-rose-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-[1650px] mx-auto px-5 py-6 space-y-4">
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Healthcare Compliance Demo</p>
            <h1 className="text-2xl font-bold">Mental Health Parity MCO Helpdesk Demo</h1>
            <p className="text-sm text-slate-300 mt-1">
              Track MCO submission readiness, parity compliance findings, and helpdesk issues using a structured parity review dataset.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('executive')}
              className={`px-3 py-1.5 rounded-md text-xs border ${viewMode === 'executive' ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100' : 'border-slate-600 text-slate-300'}`}
            >
              Executive View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('analyst')}
              className={`px-3 py-1.5 rounded-md text-xs border ${viewMode === 'analyst' ? 'border-violet-400 bg-violet-500/20 text-violet-100' : 'border-slate-600 text-slate-300'}`}
            >
              Analyst View
            </button>
            <button
              type="button"
              onClick={() => downloadCsv('mh-parity-filtered-records.csv', exportRecordsToCsv(viewModel.filteredRecords))}
              className="px-3 py-1.5 rounded-md text-xs border border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              Export Filtered CSV
            </button>
          </div>
        </header>

        <ParityFiltersBar
          filters={filters}
          options={options}
          onChange={(field, value) => setFilters((prev) => ({ ...prev, [field]: value }))}
          onReset={() => setFilters(DEFAULT_FILTERS)}
        />

        <ParityKpiCards metrics={viewModel.metrics} />

        <ParityExecutiveSummary
          executiveSummary={viewModel.executiveSummary}
          topFollowUpMcos={viewModel.topFollowUpMcos}
          mostCommonIssue={viewModel.mostCommonIssue}
        />

        <ParityInsightBlocks insightBlocks={viewModel.insightBlocks} />

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <article className="xl:col-span-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold mb-3">Non-Compliant Findings by MCO</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viewModel.nonCompliantByMco}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mco_name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Bar dataKey="non_compliant_findings" fill="#fb7185" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="xl:col-span-5 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold mb-3">Issue Type by MCO</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viewModel.issueTypeByMco}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="mco_name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Legend />
                  {issueKeys.map((key, index) => (
                    <Bar key={key} dataKey={key} stackId="issues" fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="xl:col-span-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold mb-3">Submission Status Distribution</h2>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={viewModel.submissionStatusDistribution}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={90}
                    label
                  >
                    {viewModel.submissionStatusDistribution.map((entry, index) => (
                      <Cell key={entry.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <article className="xl:col-span-8 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold mb-3">Detailed Record Review</h2>
            <div className="overflow-auto max-h-[380px] border border-slate-700 rounded-lg">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-950 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">MCO</th>
                    <th className="text-left px-3 py-2">Service</th>
                    <th className="text-left px-3 py-2">Submission</th>
                    <th className="text-left px-3 py-2">Compliance</th>
                    <th className="text-left px-3 py-2">Issue Type</th>
                    <th className="text-left px-3 py-2">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.filteredRecords.map((row, index) => (
                    <tr key={`${row.mco_name}-${index}`} className="border-t border-slate-800">
                      <td className="px-3 py-2">{row.mco_name}</td>
                      <td className="px-3 py-2">{row.service_name || 'Unknown Service'}</td>
                      <td className="px-3 py-2">{row.submission_status}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-md border ${statusBadge(row.derived_compliance_status)}`}>
                          {row.derived_compliance_status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{row.derived_issue_type}</td>
                      <td className="px-3 py-2">{row.reporting_period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="xl:col-span-4 rounded-xl border border-slate-700 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold mb-3">Helpdesk Queue</h2>
            <div className="space-y-2 max-h-[380px] overflow-auto pr-1">
              {viewModel.helpdeskQueue.slice(0, 14).map((item, index) => (
                <div key={`${item.mco_name}-${index}`} className="border border-slate-700 rounded-lg bg-slate-950/60 p-3">
                  <div className="flex justify-between gap-2">
                    <p className="text-xs font-semibold text-slate-200">{item.mco_name}</p>
                    <span className={`px-2 py-0.5 text-[11px] rounded-md border ${statusBadge(item.derived_compliance_status)}`}>
                      {item.submission_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.service_name || 'Unknown Service'} - {item.derived_issue_type}</p>
                  {viewMode === 'analyst' ? (
                    <ul className="mt-2 text-[11px] text-amber-200 space-y-1">
                      {item.flag_evidence.map((evidence, evidenceIndex) => (
                        <li key={`${item.mco_name}-${index}-${evidenceIndex}`}>- {evidence.evidence}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}
