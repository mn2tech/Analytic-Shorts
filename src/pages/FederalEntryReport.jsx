/**
 * Federal Entry Intelligence Report - template card, Run button, shortlist + executive summary.
 *
 * OVERRIDE RULES:
 * - Custom NAICS (comma-separated) OVERRIDES industry NAICS when filled.
 * - When custom is blank, backend uses industryNaics[] from the selected industry dropdown.
 *
 * ACCESS: All users get 10 minutes free. After that, free users see a paywall. Pro/Enterprise/Admin have unlimited access.
 */
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '../config/api'
import { getIndustryNaics } from '../config/industryNaicsMap'
import { getSubscription } from '../services/subscriptionService'
import { hasFeature, PLANS, FEDERAL_ENTRY_FREE_MINUTES } from '../config/pricing'
import { useAuth } from '../contexts/AuthContext'
import { trackEvent } from '../utils/analytics'

const INDUSTRY_OPTIONS = [
  { value: '', label: 'Select Industry' },
  { value: 'IT_FIRMS', label: 'IT Firms (541512)' },
  { value: 'CONSTRUCTION', label: 'Construction (236220)' },
  { value: 'STAFFING', label: 'Staffing (561320)' },
  { value: 'PROF_SERVICES', label: 'Professional Services (541611)' },
  { value: 'LOGISTICS', label: 'Logistics (488510)' },
  { value: 'JANITORIAL', label: 'Janitorial & Facilities (561720)' },
  { value: 'MANUFACTURING', label: 'Manufacturing (31-33)' },
  { value: 'MEDICAL', label: 'Medical Services (621111, 621999)' },
  { value: 'ENVIRONMENTAL', label: 'Environmental Services (541620)' },
  { value: 'SECURITY', label: 'Security Services (561612)' },
  { value: 'OTHER', label: 'Other (no default NAICS)' },
]

/** Build SAM.gov opportunities search URL with keyword pre-filled (opens search results, not general page). */
function getSamGovSearchUrl(keyword) {
  if (!keyword || typeof keyword !== 'string') return 'https://sam.gov/opportunities'
  const q = encodeURIComponent(String(keyword).trim())
  return `https://sam.gov/search/?index=opp&page=1&sort=-modifiedDate&pageSize=25&sfm%5Bstatus%5D%5Bis_active%5D=true&sfm%5BsimpleSearch%5D%5BkeywordRadio%5D=ALL&sfm%5BsimpleSearch%5D%5BkeywordTags%5D%5B0%5D%5Bkey%5D=${q}&sfm%5BsimpleSearch%5D%5BkeywordTags%5D%5B0%5D%5Bvalue%5D=${q}`
}

const DEFAULT_INPUTS = {
  industryKey: '',
  customNaics: '',
  keywords: [],
  agency: '',
  fy: ['2024', '2025', '2026'],
  limit: 500,
  debug: false,
  usOnly: false,
  preferSetAsides: false,
  excludeVehicleRequired: false,
}

function isAdminByProfile(user, userProfile) {
  if (!user) return false
  const role = userProfile?.role
  return role === 'admin' || role === 'demo'
}

function isDefaultAdminEmail(user) {
  const email = String(user?.email || '').toLowerCase()
  return email === 'admin@nm2tech-sas.com' || email === 'demo@nm2tech-sas.com'
}

function FederalEntryReport() {
  const { user, userProfile } = useAuth()
  const [subscription, setSubscription] = useState(null)
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [adminCheckDone, setAdminCheckDone] = useState(false)
  const [reportRunId, setReportRunId] = useState(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [shortlist, setShortlist] = useState([])
  const [barrierScore, setBarrierScore] = useState(null)
  const [barrierLevel, setBarrierLevel] = useState(null)
  const [recommendedNaics, setRecommendedNaics] = useState(null)
  const [naicsComparison, setNaicsComparison] = useState([])
  const [debugInfo, setDebugInfo] = useState(null)
  const [confidenceLevel, setConfidenceLevel] = useState(null)
  const [confidenceReason, setConfidenceReason] = useState(null)
  const [growthRatePercent, setGrowthRatePercent] = useState(null)
  const [inputs, setInputs] = useState(DEFAULT_INPUTS)

  useEffect(() => {
    getSubscription()
      .then((sub) => {
        setSubscription(sub)
        setSubscriptionLoaded(true)
      })
      .catch(() => setSubscriptionLoaded(true))
  }, [])

  useEffect(() => {
    if (!user) {
      setAdminCheckDone(true)
      return
    }
    apiClient.get('/api/analytics/admin-check', { timeout: 5000 })
      .then((res) => {
        setHasAdminAccess(!!res?.data?.isAdmin)
        setAdminCheckDone(true)
      })
      .catch(() => setAdminCheckDone(true))
  }, [user])

  const isAdmin = isAdminByProfile(user, userProfile) || isDefaultAdminEmail(user) || hasAdminAccess
  const hasPaidAccess = hasFeature(subscription, 'federalEntryReport') || isAdmin

  const [usageSeconds, setUsageSeconds] = useState(() => {
    try {
      const stored = sessionStorage.getItem('federalEntry_freeUsageSeconds')
      return stored ? parseInt(stored, 10) : 0
    } catch {
      return 0
    }
  })

  const isFreeUser = !hasPaidAccess
  const freeLimitSeconds = FEDERAL_ENTRY_FREE_MINUTES * 60
  const usageExceeded = isFreeUser && usageSeconds >= freeLimitSeconds

  useEffect(() => {
    if (!isFreeUser) return
    const interval = setInterval(() => {
      setUsageSeconds((prev) => {
        const next = prev + 1
        try {
          sessionStorage.setItem('federalEntry_freeUsageSeconds', String(next))
        } catch {}
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [isFreeUser])

  const industryNaics = useMemo(() => getIndustryNaics(inputs.industryKey), [inputs.industryKey])
  const customNaicsArray = useMemo(
    () => (inputs.customNaics || '').split(/[,\s]+/).map((s) => s.trim()).filter(Boolean),
    [inputs.customNaics]
  )
  const resolvedNaics = customNaicsArray.length > 0 ? customNaicsArray : industryNaics

  if (!subscriptionLoaded || (user && !adminCheckDone)) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  const runReport = async () => {
    if (usageExceeded) return
    setRunning(true)
    setError(null)
    setSummary(null)
    setShortlist([])
    setBarrierScore(null)
    setBarrierLevel(null)
    setRecommendedNaics(null)
    setNaicsComparison([])
    setDebugInfo(null)
    try {
      const payload = {
        industryKey: inputs.industryKey || undefined,
        naics: resolvedNaics,
        keywords: inputs.keywords,
        agency: inputs.agency || undefined,
        fy: inputs.fy,
        limit: inputs.limit,
        debug: inputs.debug,
        usOnly: inputs.usOnly,
        preferSetAsides: inputs.preferSetAsides,
        excludeVehicleRequired: inputs.excludeVehicleRequired,
      }
      const { data } = await apiClient.post('/api/reports/federal-entry/run', payload)
      setReportRunId(data.reportRunId)
      pollForCompletion(data.reportRunId)
    } catch (err) {
      const data = err?.response?.data
      const msg = data?.message || data?.error || err?.message || 'Failed to start report'
      setError(msg)
      setRunning(false)
    }
  }

  const pollForCompletion = async (id) => {
    const maxAttempts = 60
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      try {
        const { data } = await apiClient.get(`/api/reports/federal-entry/${id}/summary`)
        if (data.status === 'completed') {
          trackEvent('federal_report', {
            event_category: 'engagement',
            event_label: 'report_generated',
          })
          setSummary(data.summary || {})
          setShortlist(data.first_win_shortlist || [])
          setBarrierScore(data.barrierScore)
          setBarrierLevel(data.barrierLevel)
          setRecommendedNaics(data.recommendedNaics)
          setNaicsComparison(data.naicsComparison || [])
          setDebugInfo(data.debug || null)
          setConfidenceLevel(data.confidenceLevel || null)
          setConfidenceReason(data.confidenceReason || null)
          setGrowthRatePercent(data.growthRatePercent != null ? data.growthRatePercent : null)
          setRunning(false)
          return
        }
        if (data.status === 'failed') {
          setError('Report generation failed')
          setRunning(false)
          return
        }
      } catch {
        // continue polling
      }
    }
    setError('Report timed out')
    setRunning(false)
  }

  const downloadLeads = async () => {
    if (!reportRunId) return
    const base = import.meta.env.VITE_API_URL || ''
    const url = `${base || window.location.origin}/api/reports/federal-entry/${reportRunId}/leads.csv`
    try {
      const res = await fetch(url, { credentials: 'include' })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `federal-entry-leads-${reportRunId.slice(0, 8)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {usageExceeded && (
        <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-lg font-bold text-amber-900 mb-2">Free trial limit reached</h2>
          <p className="text-gray-700 mb-4">
            You&apos;ve used your {FEDERAL_ENTRY_FREE_MINUTES} minutes of free access. Upgrade to Pro for unlimited Federal Entry reports.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
          >
            View Plans & Upgrade
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Federal Entry Intelligence Report</h1>
          <p className="text-sm text-gray-500">For companies pursuing their first federal contract—no GSA schedule or existing vehicle required</p>
        </div>
        <Link
          to="/publish/link?template=federal-entry"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <span>📤</span>
          Add to Feed
        </Link>
      </div>

      {/* Template Card */}
      <div className="rounded-xl border-2 border-indigo-200 bg-white shadow-lg p-6 mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Federal Entry Report</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enter your company profile to find first-win opportunities. Combines opportunities, agency rollup, spend data, and recent awards. Computes fit/barrier scores and AI summary.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Industry Category</label>
              <select
                value={inputs.industryKey || ''}
                onChange={(e) => setInputs((prev) => ({ ...prev, industryKey: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Custom NAICS (comma-separated)</label>
              <input
                type="text"
                value={inputs.customNaics || ''}
                onChange={(e) => setInputs((prev) => ({ ...prev, customNaics: e.target.value.trim() }))}
                placeholder="e.g. 541512, 541511"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-xs text-gray-500">Overrides industry NAICS when filled</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Keywords (comma-separated)</label>
              <input
                type="text"
                value={(inputs.keywords || []).join(', ')}
                onChange={(e) => setInputs((prev) => ({ ...prev, keywords: e.target.value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean) }))}
                placeholder="e.g. data analytics, IT support"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-xs text-gray-500">Leave blank for broad search</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Target agency</label>
              <input
                type="text"
                value={inputs.agency || ''}
                onChange={(e) => setInputs((prev) => ({ ...prev, agency: e.target.value.trim() }))}
                placeholder="e.g. TREASURY, DOD, GSA"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-xs text-gray-500">Leave blank for all agencies</p>
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-medium text-gray-600 mb-1">Fiscal years</label>
              <input
                type="text"
                value={(inputs.fy || []).join(', ')}
                onChange={(e) => setInputs((prev) => ({ ...prev, fy: e.target.value.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean) }))}
                placeholder="2024, 2025, 2026"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!inputs.usOnly}
                onChange={(e) => setInputs((prev) => ({ ...prev, usOnly: e.target.checked }))}
                className="rounded border-gray-300"
              />
              US-only
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!inputs.preferSetAsides}
                onChange={(e) => setInputs((prev) => ({ ...prev, preferSetAsides: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Prefer set-asides
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!inputs.excludeVehicleRequired}
                onChange={(e) => setInputs((prev) => ({ ...prev, excludeVehicleRequired: e.target.checked }))}
                className="rounded border-gray-300"
              />
              Exclude vehicle-required
            </label>
          </div>
          <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
            <span className="text-xs text-gray-500 font-mono">
              Industry: {INDUSTRY_OPTIONS.find((o) => o.value === inputs.industryKey)?.label ?? 'all'} | NAICS: {resolvedNaics.length ? resolvedNaics.join(', ') : 'none'} | Keywords: {(inputs.keywords || []).length ? (inputs.keywords || []).join(', ') : 'all'} | Agency: {inputs.agency || 'broad'} | FY: {(inputs.fy || []).length ? (inputs.fy || []).join(', ') : '2024, 2025, 2026'}
            </span>
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {isFreeUser && !usageExceeded && (
                <span className="text-xs text-amber-700">
                  Free trial: {Math.max(0, Math.ceil((freeLimitSeconds - usageSeconds) / 60))} min left
                </span>
              )}
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!inputs.debug}
                  onChange={(e) => setInputs((prev) => ({ ...prev, debug: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                Debug
              </label>
              <button
                type="button"
                onClick={runReport}
                disabled={running || resolvedNaics.length === 0 || usageExceeded}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {running ? 'Running...' : usageExceeded ? 'Upgrade to continue' : 'Run Report'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {debugInfo && (
        <details className="mb-6 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
          <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100">
            Debug output (resolvedFilters, sampleOpportunityNaics, samQuery, samCount, awardsQuery, awardsCount, spendQuery, spendCount)
          </summary>
          <pre className="p-4 text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}

      {(barrierScore != null || barrierLevel || recommendedNaics || growthRatePercent != null) && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-amber-800">Entry Barrier:</span>
          <span className="text-sm font-mono text-amber-900">{barrierScore ?? '—'}</span>
          <span className={`text-sm font-semibold px-2 py-0.5 rounded ${barrierLevel === 'High' ? 'bg-red-200 text-red-800' : barrierLevel === 'Medium' ? 'bg-amber-200 text-amber-800' : 'bg-green-200 text-green-800'}`}>
            {barrierLevel ?? '—'}
          </span>
          {growthRatePercent != null && (
            <span className="text-sm font-medium text-amber-800">
              Growth: <span className="font-mono text-amber-900">{growthRatePercent}%</span>
            </span>
          )}
          {growthRatePercent == null && (barrierScore != null || barrierLevel) && (
            <span className="text-sm font-medium text-amber-800">Growth: N/A</span>
          )}
          {recommendedNaics && (
            <span className="text-sm font-medium text-amber-800">
              Recommended NAICS: <span className="font-mono text-amber-900">{recommendedNaics}</span> (Lowest Entry Barrier)
            </span>
          )}
          {(confidenceLevel || summary?.scores?.confidence) && (
            <span className="text-xs text-amber-700" title={confidenceReason || ''}>
              Confidence: {confidenceLevel ?? summary?.scores?.confidence ?? '—'}
              {confidenceReason && ` — ${confidenceReason}`}
            </span>
          )}
        </div>
      )}

      {naicsComparison.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-800 px-4 py-3 border-b border-gray-100 bg-gray-50">NAICS Comparison (by Entry Barrier)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100">
                  <th className="text-left py-2 px-3 font-medium">NAICS</th>
                  <th className="text-right py-2 px-3 font-medium">Barrier Score</th>
                  <th className="text-right py-2 px-3 font-medium">Barrier Level</th>
                  <th className="text-right py-2 px-3 font-medium">Growth %</th>
                  <th className="text-right py-2 px-3 font-medium">Concentration %</th>
                </tr>
              </thead>
              <tbody>
                {naicsComparison.map((row, i) => (
                  <tr key={row.naics || i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono">{row.naics ?? '—'}</td>
                    <td className="py-2 px-3 text-right font-medium">{row.barrierScore ?? '—'}</td>
                    <td className="py-2 px-3 text-right">{row.barrierLevel ?? '—'}</td>
                    <td className="py-2 px-3 text-right">{row.growthRatePercent != null ? `${row.growthRatePercent}%` : 'N/A'}</td>
                    <td className="py-2 px-3 text-right">{row.concentrationPercent != null ? `${row.concentrationPercent}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(summary?.executiveSummary?.marketStatement || summary?.executive_summary) && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Executive Summary</h3>
          <div className="text-gray-700 whitespace-pre-wrap text-sm">{summary.executiveSummary?.marketStatement ?? summary.executive_summary}</div>
          {summary.executiveSummary?.whyItMatters && (
            <div className="mt-3 pt-3 border-t border-gray-200 text-gray-600 text-sm">{summary.executiveSummary.whyItMatters}</div>
          )}
        </div>
      )}

      {summary?.recommendedEntryPath?.path && (
        <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-indigo-800 mb-1">Recommended Entry Path</h3>
          <span className="text-sm font-medium text-indigo-900">{summary.recommendedEntryPath.path}</span>
          {summary.recommendedEntryPath.why && <p className="mt-1 text-sm text-indigo-700">{summary.recommendedEntryPath.why}</p>}
        </div>
      )}

      {summary?.tactical30DayPlan && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tactical 30-Day Action Plan</h3>
          {summary.tactical30DayPlan.agencyPositioning && summary.tactical30DayPlan.agencyPositioning.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">1. Agency Positioning (Next 30 Days)</h4>
              <ul className="space-y-3 text-sm text-gray-700">
                {summary.tactical30DayPlan.agencyPositioning.map((a, i) => (
                  <li key={i} className="pl-3 border-l-2 border-amber-200">
                    <span className="font-medium">{a.agency}</span>
                    {a.whyAttractive && <p className="mt-0.5 text-gray-600">{a.whyAttractive}</p>}
                    {a.action && <p className="mt-0.5">{a.action} {a.timelineDays && `(${a.timelineDays} days)`}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.tactical30DayPlan.immediateBidTargets && summary.tactical30DayPlan.immediateBidTargets.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">2. Immediate Bid Targets (0–14 Days)</h4>
              <ul className="space-y-3 text-sm text-gray-700">
                {summary.tactical30DayPlan.immediateBidTargets.map((b, i) => (
                  <li key={i} className="pl-3 border-l-2 border-emerald-200">
                    <span className="font-medium">{b.title || b.noticeId}</span>
                    {b.recommendation && <span className="ml-2 text-gray-500">({b.recommendation})</span>}
                    {b.why && <p className="mt-0.5 text-gray-600">{b.why}</p>}
                    {b.immediateAction && <p className="mt-0.5">{b.immediateAction}</p>}
                    {b.riskLevel && <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-gray-100">Risk: {b.riskLevel}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {summary.tactical30DayPlan.entryStrategyRecommendation && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">3. Entry Strategy Recommendation</h4>
              <p className="text-sm text-gray-700">
                <span className="font-medium">{summary.tactical30DayPlan.entryStrategyRecommendation.path}</span>
                {summary.tactical30DayPlan.entryStrategyRecommendation.why && (
                  <> — {summary.tactical30DayPlan.entryStrategyRecommendation.why}</>
                )}
              </p>
            </div>
          )}
          {summary.tactical30DayPlan.riskFlags && summary.tactical30DayPlan.riskFlags.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">4. Risk Flags</h4>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {summary.tactical30DayPlan.riskFlags.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {summary?.captureStrategyBrief && (
        <div className="mb-6 rounded-xl border-2 border-slate-200 bg-slate-50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-800 text-white">
            <h3 className="text-lg font-semibold">Federal Capture Strategy Brief</h3>
            <p className="text-sm text-slate-300 mt-0.5">Premium strategy deliverable — market posture, incumbent landscape, opportunity-level capture</p>
          </div>
          <div className="p-6 space-y-6">
            {summary.captureStrategyBrief.marketPositionAssessment && (
              <section>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">1. Market Position Assessment</h4>
                <p className="text-sm text-gray-700 mb-1">{summary.captureStrategyBrief.marketPositionAssessment.interpretation}</p>
                <p className="text-sm text-gray-700 mb-1">{summary.captureStrategyBrief.marketPositionAssessment.implications}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-semibold rounded ${summary.captureStrategyBrief.marketPositionAssessment.marketPosture === 'Favorable' ? 'bg-emerald-200 text-emerald-800' : summary.captureStrategyBrief.marketPositionAssessment.marketPosture === 'Incumbent-Dominated' ? 'bg-red-200 text-red-800' : summary.captureStrategyBrief.marketPositionAssessment.marketPosture === 'Competitive' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-800'}`}>
                  Market Posture: {summary.captureStrategyBrief.marketPositionAssessment.marketPosture ?? '—'}
                </span>
              </section>
            )}
            {summary.captureStrategyBrief.incumbentLandscape && (
              <section>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">2. Incumbent & Competitive Landscape</h4>
                <p className="text-sm text-gray-700 mb-1">{summary.captureStrategyBrief.incumbentLandscape.integratorDominance}</p>
                <p className="text-sm text-gray-700 mb-1">{summary.captureStrategyBrief.incumbentLandscape.primeWinLikelihood}</p>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-semibold">Positioning:</span> {summary.captureStrategyBrief.incumbentLandscape.positioningRecommendation}
                  {summary.captureStrategyBrief.incumbentLandscape.recommendationReason && (
                    <> — {summary.captureStrategyBrief.incumbentLandscape.recommendationReason}</>
                  )}
                </p>
              </section>
            )}
            {summary.captureStrategyBrief.opportunityCaptureStrategy && summary.captureStrategyBrief.opportunityCaptureStrategy.length > 0 && (
              <section>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">3. Opportunity-Level Capture Strategy (Top 3)</h4>
                <ul className="space-y-3">
                  {summary.captureStrategyBrief.opportunityCaptureStrategy.map((o, i) => (
                    <li key={i} className="pl-3 border-l-2 border-indigo-200">
                      <span className="font-medium text-gray-800">{o.title || o.noticeId}</span>
                      <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100">{o.recommendation}</span>
                      {o.bidNoBid && <span className={`ml-1 text-xs font-semibold px-1.5 py-0.5 rounded ${o.bidNoBid === 'Bid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{o.bidNoBid}</span>}
                      {o.why && <p className="mt-0.5 text-sm text-gray-600">{o.why}</p>}
                      {o.tacticalNextStep && <p className="mt-0.5 text-sm text-indigo-700">Next 14 days: {o.tacticalNextStep}</p>}
                      {o.riskLevel && <span className="inline-block mt-1 text-xs text-gray-500">Risk: {o.riskLevel}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {summary.captureStrategyBrief.captureRoadmap && (
              <section>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">4. 30–60–90 Day Capture Roadmap</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(summary.captureStrategyBrief.captureRoadmap.days0to30?.length ?? 0) > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <h5 className="text-xs font-bold text-slate-600 mb-2">0–30 Days</h5>
                      <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                        {summary.captureStrategyBrief.captureRoadmap.days0to30.map((a, j) => (
                          <li key={j}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(summary.captureStrategyBrief.captureRoadmap.days30to60?.length ?? 0) > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <h5 className="text-xs font-bold text-slate-600 mb-2">30–60 Days</h5>
                      <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                        {summary.captureStrategyBrief.captureRoadmap.days30to60.map((a, j) => (
                          <li key={j}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(summary.captureStrategyBrief.captureRoadmap.days60to90?.length ?? 0) > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <h5 className="text-xs font-bold text-slate-600 mb-2">60–90 Days</h5>
                      <ul className="list-disc list-inside text-xs text-gray-700 space-y-0.5">
                        {summary.captureStrategyBrief.captureRoadmap.days60to90.map((a, j) => (
                          <li key={j}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
            {summary.captureStrategyBrief.structuralRiskMitigation && summary.captureStrategyBrief.structuralRiskMitigation.length > 0 && (
              <section>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">5. Structural Risk & Mitigation</h4>
                <ul className="space-y-2">
                  {summary.captureStrategyBrief.structuralRiskMitigation.map((r, i) => (
                    <li key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                      <span className="font-medium text-gray-800 text-sm">{r.risk}</span>
                      <p className="text-sm text-gray-600 mt-0.5">{r.mitigation}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      )}

      {shortlist.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden mb-6">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800">First Win Shortlist (Top 20)</h3>
            <button
              type="button"
              onClick={downloadLeads}
              className="text-sm text-indigo-600 hover:underline"
            >
              Download leads.csv
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100">
                  <th className="text-left py-2 px-3 font-medium">Notice ID</th>
                  <th className="text-left py-2 px-3 font-medium">Title</th>
                  <th className="text-left py-2 px-3 font-medium">Organization</th>
                  <th className="text-right py-2 px-3 font-medium">Win</th>
                  <th className="text-right py-2 px-3 font-medium">Fit</th>
                  <th className="text-right py-2 px-3 font-medium">First Win</th>
                  <th className="text-right py-2 px-3 font-medium">Barrier</th>
                  <th className="text-left py-2 px-3 font-medium">Deadline</th>
                  <th className="text-left py-2 px-3 font-medium">Contact</th>
                </tr>
              </thead>
              <tbody>
                {shortlist.map((row, i) => (
                  <tr key={row.noticeId || i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">
                      {(row.uiLink || (row.noticeId && `https://sam.gov/opp/${row.noticeId}/view`)) ? (
                        <a href={row.uiLink || `https://sam.gov/opp/${row.noticeId}/view`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{row.noticeId || '—'}</a>
                      ) : (row.noticeId || '—')}
                    </td>
                    <td className="py-2 px-3 max-w-[200px] truncate" title={row.title}>
                      {(row.uiLink || (row.noticeId && `https://sam.gov/opp/${row.noticeId}/view`)) ? (
                        <a href={row.uiLink || `https://sam.gov/opp/${row.noticeId}/view`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate block">{row.title || '—'}</a>
                      ) : (row.title || '—')}
                    </td>
                    <td className="py-2 px-3 max-w-[150px] truncate">{row.organization || '—'}</td>
                    <td className="py-2 px-3 text-right font-medium">{row.win_score ?? '—'}</td>
                    <td className="py-2 px-3 text-right">{row.fit_score ?? '—'}</td>
                    <td className="py-2 px-3 text-right" title={row.firstWinBreakdown ? Object.entries(row.firstWinBreakdown).map(([k, v]) => `${k}: ${v}`).join(', ') : ''}>{row.first_win_score ?? '—'}</td>
                    <td className="py-2 px-3 text-right">{row.barrier_score ?? '—'}</td>
                    <td className="py-2 px-3 text-xs">{row.responseDeadLine || '—'}</td>
                    <td className="py-2 px-3 text-xs max-w-[180px]">
                      {row.pointOfContact && (row.pointOfContact.fullName || row.pointOfContact.email || row.pointOfContact.phone) ? (
                        <span className="text-indigo-600">
                          {row.pointOfContact.fullName && <span className="block truncate">{row.pointOfContact.fullName}</span>}
                          {row.pointOfContact.email && <a href={`mailto:${row.pointOfContact.email}`} className="block truncate hover:underline">{row.pointOfContact.email}</a>}
                          {row.pointOfContact.phone && <a href={`tel:${row.pointOfContact.phone}`} className="block truncate hover:underline">{row.pointOfContact.phone}</a>}
                        </span>
                      ) : (row.uiLink || (row.noticeId && `https://sam.gov/opp/${row.noticeId}/view`)) ? (
                        <a href={row.uiLink || `https://sam.gov/opp/${row.noticeId}/view`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                          View on SAM.gov
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {((summary?.nextActions?.length ?? summary?.next_actions?.length) ?? 0) > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Next Actions</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {(summary.nextActions ?? summary.next_actions ?? []).map((item, i) => (
              <li key={i}>
                {typeof item === 'string' ? item : `${item.action} (Owner: ${item.owner ?? 'Company'}, ${item.timelineDays ?? '?'} days)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary?.targetList && summary.targetList.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Target List</h3>
          <p className="text-xs text-gray-500 mb-3">Click links to view opportunity details or look up companies on SAM.gov.</p>
          <ul className="space-y-3 text-sm text-gray-700">
            {summary.targetList.map((t, i) => (
              <li key={i} className="flex flex-col gap-0.5 py-1 border-b border-gray-100 last:border-0">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium">{t.target}</span>
                  <span className="text-gray-500">({t.type})</span>
                  {t.reason && <span className="text-gray-600">— {t.reason}</span>}
                </span>
                {(t.email || t.phone || t.pocName) ? (
                  <span className="text-xs text-indigo-600 mt-0.5">
                    {t.pocName && <span>{t.pocName}</span>}
                    {t.pocName && (t.email || t.phone) && ' · '}
                    {t.email && <a href={`mailto:${t.email}`} className="hover:underline">{t.email}</a>}
                    {t.email && t.phone && ' · '}
                    {t.phone && <a href={`tel:${t.phone}`} className="hover:underline">{t.phone}</a>}
                  </span>
                ) : (
                  <span className="text-xs text-indigo-600 mt-0.5">
                    {t.noticeId ? (
                      <a href={`https://sam.gov/opp/${t.noticeId}/view`} target="_blank" rel="noopener noreferrer" className="hover:underline">View opportunity on SAM.gov</a>
                    ) : (
                      <a href={getSamGovSearchUrl(t.target)} target="_blank" rel="noopener noreferrer" className="hover:underline">Search on SAM.gov</a>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default FederalEntryReport
