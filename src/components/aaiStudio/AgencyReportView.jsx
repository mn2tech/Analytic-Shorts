import { useMemo } from 'react'
import { buildAgencyViewModel } from '../../utils/agencyReportModel'
import TrendBlockView from './TrendBlockView'

/**
 * Client-ready agency report view: executive summary, period KPIs (no min/max), one trend, tables by dimension.
 * No "Latest revenue…", no Sample/Quality penalty, no analyst prompts.
 */
export default function AgencyReportView({
  evidence,
  narrative = {},
  reportMeta = {},
  branding = {},
  narrativeLoading = false,
  loading = false,
}) {
  const model = useMemo(() => buildAgencyViewModel(evidence, narrative), [evidence, narrative])

  if (loading || !evidence) {
    return (
      <div className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }} data-testid="agency-report-view">
        {loading ? 'Loading report…' : 'No evidence yet. Build a dashboard first.'}
      </div>
    )
  }

  const { execSummary, kpiCards, trend, tables, suggestedQuestions } = model

  const trendBlock = trend
    ? {
        id: 'agency-trend-01',
        type: 'TrendBlock',
        title: trend.title,
        payload: {
          series: trend.series,
          timeColumn: trend.timeColumn,
          measure: trend.measure,
          grain: trend.grain,
          anomalies: [],
        },
      }
    : null

  return (
    <div className="space-y-6" data-testid="agency-report-view">
      {/* A) Executive Summary */}
      <section className="rounded-xl p-5" style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
        <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>Executive Summary</h2>
        {narrativeLoading ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading narrative…</p>
        ) : (
          <>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text)' }}>{execSummary.executiveSummary}</p>
            {execSummary.bullets.length > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: 'var(--text)' }}>
                {execSummary.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* B) Key Metrics (4–8 cards, no min/max) */}
      {kpiCards.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>Key Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="agency-kpi-total">
            {kpiCards.map((card, i) => (
              <div
                key={i}
                className="p-4 rounded-xl"
                style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
              >
                <div className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{card.label}</div>
                <div className="text-xl font-bold mt-1" style={{ color: 'var(--text)' }}>{card.value}</div>
                {card.changePct && (
                  <div className={`text-xs mt-1 ${card.changeClass === 'positive' ? 'text-[var(--chart-positive)]' : 'text-[var(--chart-negative)]'}`}>
                    {card.changePct}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* C) Trend (one chart, business title) */}
      {trendBlock && (
        <section>
          <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--text)' }}>{trend.title}</h2>
          {trend.subtitle && (
            <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>{trend.subtitle}</p>
          )}
          <div className="rounded-xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
            <TrendBlockView block={trendBlock} filterState={{}} onFilterChange={{}} />
          </div>
        </section>
      )}

      {/* D) Tables by dimension */}
      {tables.map((t) => (
        <section key={t.title} data-testid={t.testId}>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>{t.title}</h2>
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'var(--card)' }}>
            <table className="w-full text-sm" style={{ color: 'var(--text)' }}>
              <thead>
                <tr style={{ background: 'var(--card-2)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2.5 px-3 font-medium">Name</th>
                  <th className="text-left py-2.5 px-3 font-medium">Value</th>
                  <th className="text-left py-2.5 px-3 font-medium">Share</th>
                </tr>
              </thead>
              <tbody>
                {t.rows.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < t.rows.length - 1 ? '1px solid var(--border)' : undefined }}>
                    <td className="py-2.5 px-3">{row.name}</td>
                    <td className="py-2.5 px-3">{row.value}</td>
                    <td className="py-2.5 px-3">{row.share}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* E) Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <section className="rounded-xl p-5" style={{ background: 'var(--card-2)', border: '1px solid var(--border)' }}>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>Suggested Questions</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm" style={{ color: 'var(--text)' }}>
            {suggestedQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
