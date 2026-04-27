import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import MentalHealthParityMcoHelpdeskDemo from './MentalHealthParityMcoHelpdeskDemo'

vi.mock('recharts', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...mod,
    ResponsiveContainer: ({ children }) => React.createElement('div', { 'data-testid': 'recharts-responsive-container' }, children),
  }
})

vi.mock('../services/mhParityDemoService', () => ({
  fetchMhParityDemoDataset: vi.fn(async () => ([
    {
      mco_name: 'CareFirst',
      plan_type: 'Medicaid',
      benefit_classification: 'Outpatient MH',
      service_name: 'Therapy',
      copay_mh: 30,
      copay_med: 20,
      visit_limit_mh: 8,
      visit_limit_med: 20,
      prior_auth_mh: 'Yes',
      prior_auth_med: 'No',
      nqtl_factor: 'Mismatch',
      submission_status: 'Rejected',
      issue_type: '',
      compliance_status: 'Compliant',
      notes: 'missing documentation in packet',
      reporting_period: '2026-Q1',
    },
  ])),
}))

describe('MentalHealthParityMcoHelpdeskDemo', () => {
  it('renders demo title and table after loading', async () => {
    render(<MentalHealthParityMcoHelpdeskDemo />)
    await waitFor(() => {
      expect(screen.getByText(/Mental Health Parity MCO Helpdesk Demo/i)).toBeTruthy()
      expect(screen.getByText(/Detailed Record Review/i)).toBeTruthy()
    })
  })
})
