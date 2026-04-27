import { describe, it, expect } from 'vitest'
import {
  evaluateParityRecord,
  buildParityDemoState,
  applyParityFilters,
} from './parityComplianceUtils'

const sampleRows = [
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
    nqtl_factor: 'Stricter MH management',
    submission_status: 'Rejected',
    issue_type: '',
    compliance_status: 'Compliant',
    notes: 'missing documentation in packet',
    reporting_period: '2026-Q1',
  },
  {
    mco_name: 'Aetna',
    plan_type: 'Marketplace',
    benefit_classification: 'Outpatient MH',
    service_name: 'Counseling',
    copay_mh: 20,
    copay_med: 20,
    visit_limit_mh: 18,
    visit_limit_med: 18,
    prior_auth_mh: 'No',
    prior_auth_med: 'No',
    nqtl_factor: 'Aligned',
    submission_status: 'Submitted',
    issue_type: 'None',
    compliance_status: 'Compliant',
    notes: 'clean',
    reporting_period: '2026-Q1',
  },
  {
    mco_name: 'Aetna',
    plan_type: 'Marketplace',
    benefit_classification: 'Outpatient MH',
    service_name: '',
    copay_mh: 20,
    copay_med: 20,
    visit_limit_mh: 18,
    visit_limit_med: 18,
    prior_auth_mh: 'No',
    prior_auth_med: 'No',
    nqtl_factor: 'Aligned',
    submission_status: 'Pending',
    issue_type: 'Data Quality',
    compliance_status: 'Compliant',
    notes: 'missing documentation in file',
    reporting_period: '2026-Q2',
  },
]

describe('parityComplianceUtils', () => {
  it('flags non-compliance and data quality evidence correctly', () => {
    const evaluated = evaluateParityRecord(sampleRows[0])
    expect(evaluated.isNonCompliant).toBe(true)
    expect(evaluated.nonCompliantReasons.length).toBeGreaterThan(0)
    expect(evaluated.hasDataQualityIssue).toBe(true)
    expect(evaluated.flag_evidence.some((x) => x.rule === 'Missing Documentation')).toBe(true)
  })

  it('computes risk ranking and summary metrics deterministically', () => {
    const state = buildParityDemoState(sampleRows, {
      mco: 'All',
      compliance: 'All',
      submission: 'All',
      issueType: 'All',
      reportingPeriod: 'All',
    })
    expect(state.metrics.total_mcos).toBe(2)
    expect(state.metrics.total_records).toBe(3)
    expect(state.metrics.non_compliant_count).toBe(1)
    expect(state.metrics.data_quality_issue_count).toBeGreaterThanOrEqual(1)
    expect(state.metrics.mco_risk_score[0].mco_name).toBe('CareFirst')
  })

  it('applies filters by MCO, submission, and period', () => {
    const evaluated = sampleRows.map(evaluateParityRecord)
    const filtered = applyParityFilters(evaluated, {
      mco: 'Aetna',
      compliance: 'All',
      submission: 'Pending',
      issueType: 'All',
      reportingPeriod: '2026-Q2',
    })
    expect(filtered.length).toBe(1)
    expect(filtered[0].mco_name).toBe('Aetna')
    expect(filtered[0].submission_status).toBe('Pending')
  })
})
