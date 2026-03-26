import { useEffect, useMemo, useState } from 'react'

const KPI_METRICS = [
  { id: 'acceleration', label: 'Migration acceleration', value: 42, suffix: '%' },
  { id: 'validation_saved', label: 'Validation effort saved', value: 58, suffix: '%' },
  { id: 'recon_reduction', label: 'Reconciliation time reduction', value: 51, suffix: '%' },
  { id: 'audit_risk', label: 'Audit risk reduction', value: 36, suffix: '%' },
]

function fmtCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value || 0))
}

function fmtNumber(value) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.max(0, value || 0))
}

function downloadTextFile(filename, content, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function toIsoStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

export default function RoiCalculator() {
  const [numPrograms, setNumPrograms] = useState(120)
  const [avgHoursPerProgram, setAvgHoursPerProgram] = useState(18)
  const [hourlyRate, setHourlyRate] = useState(110)
  const [validationEffortPct, setValidationEffortPct] = useState(35)
  const [savedEstimates, setSavedEstimates] = useState([])
  const [saveMessage, setSaveMessage] = useState('')

  const model = useMemo(() => {
    const programs = Number(numPrograms || 0)
    const avgHours = Number(avgHoursPerProgram || 0)
    const rate = Number(hourlyRate || 0)
    const validationPct = Number(validationEffortPct || 0) / 100

    const baselineHours = programs * avgHours
    const baselineCost = baselineHours * rate

    const migrationAccelerationPct = KPI_METRICS[0].value / 100
    const validationSavedPct = KPI_METRICS[1].value / 100
    const reconciliationReductionPct = KPI_METRICS[2].value / 100

    const migrationHoursSaved = baselineHours * migrationAccelerationPct
    const validationHours = baselineHours * validationPct
    const validationHoursSaved = validationHours * validationSavedPct
    const reconciliationHoursSaved = baselineHours * 0.18 * reconciliationReductionPct
    const totalHoursSaved = migrationHoursSaved + validationHoursSaved + reconciliationHoursSaved

    const reducedHours = Math.max(0, baselineHours - totalHoursSaved)
    const reducedCost = reducedHours * rate
    const savings = Math.max(0, baselineCost - reducedCost)

    return {
      baselineHours,
      baselineCost,
      reducedHours,
      reducedCost,
      totalHoursSaved,
      savings,
      savingsPct: baselineCost > 0 ? (savings / baselineCost) * 100 : 0,
      migrationHoursSaved,
      validationHoursSaved,
      reconciliationHoursSaved,
    }
  }, [numPrograms, avgHoursPerProgram, hourlyRate, validationEffortPct])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('roiCalculatorEstimates')
      const parsed = raw ? JSON.parse(raw) : []
      setSavedEstimates(Array.isArray(parsed) ? parsed : [])
    } catch {
      setSavedEstimates([])
    }
  }, [])

  const estimatePayload = useMemo(
    () => ({
      createdAt: new Date().toISOString(),
      inputs: {
        numberOfSasPrograms: Number(numPrograms || 0),
        averageHoursPerProgram: Number(avgHoursPerProgram || 0),
        hourlyRateUsd: Number(hourlyRate || 0),
        validationEffortPct: Number(validationEffortPct || 0),
      },
      outputs: {
        totalCostWithoutTool: Number(model.baselineCost || 0),
        reducedCostWithTool: Number(model.reducedCost || 0),
        savings: Number(model.savings || 0),
        hoursSaved: Number(model.totalHoursSaved || 0),
      },
    }),
    [numPrograms, avgHoursPerProgram, hourlyRate, validationEffortPct, model]
  )

  const saveEstimate = () => {
    const next = [estimatePayload, ...savedEstimates].slice(0, 10)
    setSavedEstimates(next)
    try {
      localStorage.setItem('roiCalculatorEstimates', JSON.stringify(next))
      setSaveMessage('Estimate saved locally.')
      setTimeout(() => setSaveMessage(''), 2500)
    } catch {
      setSaveMessage('Failed to save estimate locally.')
      setTimeout(() => setSaveMessage(''), 2500)
    }
  }

  const exportCsv = () => {
    const rows = [
      ['field', 'value'],
      ['createdAt', estimatePayload.createdAt],
      ['numberOfSasPrograms', estimatePayload.inputs.numberOfSasPrograms],
      ['averageHoursPerProgram', estimatePayload.inputs.averageHoursPerProgram],
      ['hourlyRateUsd', estimatePayload.inputs.hourlyRateUsd],
      ['validationEffortPct', estimatePayload.inputs.validationEffortPct],
      ['totalCostWithoutTool', estimatePayload.outputs.totalCostWithoutTool],
      ['reducedCostWithTool', estimatePayload.outputs.reducedCostWithTool],
      ['savings', estimatePayload.outputs.savings],
      ['hoursSaved', estimatePayload.outputs.hoursSaved],
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    downloadTextFile(`roi-estimate-${toIsoStamp()}.csv`, csv, 'text/csv;charset=utf-8')
  }

  const exportJson = () => {
    const json = JSON.stringify(estimatePayload, null, 2)
    downloadTextFile(`roi-estimate-${toIsoStamp()}.json`, json, 'application/json')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">
            SAS Migration ROI Calculator &amp; Business Impact
          </h1>
          <p className="text-slate-600 mt-2 max-w-3xl">
            Estimate migration economics, validation productivity gains, and audit risk reduction before committing to full-scale SAS modernization.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KPI_METRICS.map((metric) => (
            <article key={metric.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {metric.value}
                {metric.suffix}
              </p>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Interactive Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm text-slate-700">
                Number of SAS programs
                <input
                  type="number"
                  min="0"
                  value={numPrograms}
                  onChange={(e) => setNumPrograms(Number(e.target.value || 0))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </label>
              <label className="text-sm text-slate-700">
                Avg hours per program
                <input
                  type="number"
                  min="0"
                  value={avgHoursPerProgram}
                  onChange={(e) => setAvgHoursPerProgram(Number(e.target.value || 0))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </label>
              <label className="text-sm text-slate-700">
                Hourly rate (USD)
                <input
                  type="number"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value || 0))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </label>
              <label className="text-sm text-slate-700">
                Validation effort (% of migration)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={validationEffortPct}
                  onChange={(e) => setValidationEffortPct(Number(e.target.value || 0))}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={saveEstimate}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-800 text-sm"
              >
                Save Estimate
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="inline-flex items-center justify-center px-3.5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-sm"
              >
                Export JSON
              </button>
              {saveMessage && <span className="text-xs text-slate-500">{saveMessage}</span>}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-2xl p-6 shadow-sm border border-emerald-600">
            <p className="text-xs uppercase tracking-wide text-emerald-100">Estimated annual savings</p>
            <p className="mt-3 text-4xl font-bold">{fmtCurrency(model.savings)}</p>
            <p className="mt-2 text-sm text-emerald-50">Equivalent to {model.savingsPct.toFixed(1)}% reduction in migration and validation spend.</p>
            <div className="mt-6 pt-4 border-t border-emerald-300/40">
              <p className="text-xs text-emerald-100">Hours saved</p>
              <p className="text-2xl font-semibold">{fmtNumber(model.totalHoursSaved)} hrs</p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Before vs After</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200 text-slate-600">
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 pr-3">Before</th>
                  <th className="py-2 pr-3">After</th>
                  <th className="py-2">Delta</th>
                </tr>
              </thead>
              <tbody className="text-slate-800">
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3">Total effort</td>
                  <td className="py-2 pr-3">{fmtNumber(model.baselineHours)} hrs</td>
                  <td className="py-2 pr-3">{fmtNumber(model.reducedHours)} hrs</td>
                  <td className="py-2 text-emerald-700 font-medium">-{fmtNumber(model.totalHoursSaved)} hrs</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3">Total cost</td>
                  <td className="py-2 pr-3">{fmtCurrency(model.baselineCost)}</td>
                  <td className="py-2 pr-3">{fmtCurrency(model.reducedCost)}</td>
                  <td className="py-2 text-emerald-700 font-medium">-{fmtCurrency(model.savings)}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">Validation workload</td>
                  <td className="py-2 pr-3">{fmtNumber(model.baselineHours * (validationEffortPct / 100))} hrs</td>
                  <td className="py-2 pr-3">{fmtNumber((model.baselineHours * (validationEffortPct / 100)) - model.validationHoursSaved)} hrs</td>
                  <td className="py-2 text-emerald-700 font-medium">-{fmtNumber(model.validationHoursSaved)} hrs</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Savings breakdown</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                <span className="text-slate-700">Migration automation gains</span>
                <span className="font-semibold text-slate-900">{fmtNumber(model.migrationHoursSaved)} hrs</span>
              </div>
              <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                <span className="text-slate-700">Validation acceleration gains</span>
                <span className="font-semibold text-slate-900">{fmtNumber(model.validationHoursSaved)} hrs</span>
              </div>
              <div className="flex items-center justify-between border border-slate-200 rounded-lg p-3">
                <span className="text-slate-700">Reconciliation reduction gains</span>
                <span className="font-semibold text-slate-900">{fmtNumber(model.reconciliationHoursSaved)} hrs</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Risk reduction</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="border border-slate-200 rounded-lg p-3">Standardized validation rules reduce manual reconciliation defects.</li>
              <li className="border border-slate-200 rounded-lg p-3">Audit-ready evidence packages improve control transparency for regulators.</li>
              <li className="border border-slate-200 rounded-lg p-3">Faster mismatch triage lowers cutover risk across critical banking reports.</li>
            </ul>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Banking use case example</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            A mid-tier bank migrating 300 SAS programs for risk and finance reporting reduced manual validation cycles from quarterly to monthly release cadence. With automated conversion + reconciliation, the team cut approximately 4,500 analyst hours annually and accelerated CCAR-related model refresh timelines.
          </p>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Saved estimates</h2>
          {savedEstimates.length === 0 ? (
            <p className="text-sm text-slate-500">No saved estimates yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200 text-slate-600">
                    <th className="py-2 pr-3">Saved at</th>
                    <th className="py-2 pr-3">Programs</th>
                    <th className="py-2 pr-3">Savings</th>
                    <th className="py-2">Hours saved</th>
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {savedEstimates.map((item, idx) => (
                    <tr key={`${item.createdAt}-${idx}`} className="border-b border-slate-100">
                      <td className="py-2 pr-3">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">{fmtNumber(item?.inputs?.numberOfSasPrograms || 0)}</td>
                      <td className="py-2 pr-3 font-medium text-emerald-700">{fmtCurrency(item?.outputs?.savings || 0)}</td>
                      <td className="py-2">{fmtNumber(item?.outputs?.hoursSaved || 0)} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Ready to quantify your migration program?</h3>
            <p className="text-sm text-slate-600 mt-1">Use this estimate as an executive baseline, then validate with real datasets in Migration Validation Studio.</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.assign('/migration-validation-studio')}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium"
          >
            Start Validation Workflow
          </button>
        </section>
      </div>
    </div>
  )
}
