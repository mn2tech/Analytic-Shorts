/**
 * AgencyReportView: shell + test IDs for agency report (Executive Summary, KPIs, trend, tables).
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import AgencyReportView from './AgencyReportView'

vi.mock('recharts', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    ResponsiveContainer: ({ children }) =>
      React.createElement('div', { 'data-testid': 'recharts-responsive-container' }, children),
  }
})

afterEach(() => cleanup())

const minimalEvidence = {
  primaryMetric: 'revenue',
  kpis: [
    {
      primaryMeasure: 'revenue',
      periodTotal: 50000,
      change: { abs: -1000, pct: -0.02 },
      rowCount: 1200,
    },
  ],
  trends: [
    {
      measure: 'revenue',
      grain: 'week',
      series: [
        { t: '2026-01-01', sum: 10000 },
        { t: '2026-01-08', sum: 12000 },
      ],
    },
  ],
  breakdowns: [
    {
      dimension: 'product_name',
      rows: [
        { key: 'Widget A', value: 20000 },
        { key: 'Widget B', value: 15000 },
      ],
    },
    {
      dimension: 'state',
      rows: [
        { key: 'CA', value: 25000 },
        { key: 'TX', value: 15000 },
      ],
    },
  ],
  drivers: [],
}

const narrative = {
  executiveSummary: 'Test summary.',
  topInsights: ['Insight one', 'Insight two'],
  suggestedQuestions: ['Question one?'],
}

describe('AgencyReportView', () => {
  it('renders empty state with data-testid when no evidence', () => {
    render(<AgencyReportView evidence={null} narrative={narrative} />)
    const view = screen.getByTestId('agency-report-view')
    expect(view).toBeTruthy()
    expect(view.textContent).toMatch(/No evidence yet|Build a dashboard first/)
  })

  it('renders loading state when loading=true', () => {
    render(<AgencyReportView evidence={minimalEvidence} narrative={narrative} loading />)
    const view = screen.getByTestId('agency-report-view')
    expect(view.textContent).toMatch(/Loading report/)
  })

  it('renders full report with agency-report-view and Executive Summary when evidence provided', () => {
    render(
      <AgencyReportView
        evidence={minimalEvidence}
        narrative={narrative}
        narrativeLoading={false}
        loading={false}
      />
    )
    const view = screen.getByTestId('agency-report-view')
    expect(view).toBeTruthy()
    expect(screen.getByText('Executive Summary')).toBeTruthy()
    expect(screen.getByText('Test summary.')).toBeTruthy()
  })

  it('renders Key Metrics section with agency-kpi-total when evidence has KPIs', () => {
    render(
      <AgencyReportView evidence={minimalEvidence} narrative={narrative} loading={false} />
    )
    const kpiSection = screen.getByTestId('agency-kpi-total')
    expect(kpiSection).toBeTruthy()
    expect(screen.getByText('Key Metrics')).toBeTruthy()
  })

  it('renders table sections with correct data-testids when breakdowns match dimensions', () => {
    render(
      <AgencyReportView evidence={minimalEvidence} narrative={narrative} loading={false} />
    )
    expect(screen.getByTestId('agency-table-products')).toBeTruthy()
    expect(screen.getByTestId('agency-table-regions')).toBeTruthy()
    expect(screen.getByText('Top Products')).toBeTruthy()
    expect(screen.getByText('Top Regions')).toBeTruthy()
  })

  it('renders Suggested Questions when narrative has suggestedQuestions', () => {
    render(
      <AgencyReportView evidence={minimalEvidence} narrative={narrative} loading={false} />
    )
    expect(screen.getByText('Suggested Questions')).toBeTruthy()
    expect(screen.getByText('Question one?')).toBeTruthy()
  })

  it('renders table rows with Name, Value, Share for product breakdown', () => {
    render(
      <AgencyReportView evidence={minimalEvidence} narrative={narrative} loading={false} />
    )
    expect(screen.getByText('Widget A')).toBeTruthy()
    expect(screen.getByText('Widget B')).toBeTruthy()
    expect(screen.getByText('CA')).toBeTruthy()
    expect(screen.getByText('TX')).toBeTruthy()
  })
})
