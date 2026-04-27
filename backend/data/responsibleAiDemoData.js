const fraudCases = [
  {
    id: 'FC-1041',
    title: 'Card Not Present Velocity Spike',
    customerSegment: 'Retail Banking',
    summary: 'Multiple card-not-present transactions from different geographies in under 12 minutes.',
    disposition: 'Temporarily freeze card and require step-up authentication.',
    tags: ['fraud', 'card', 'velocity', 'step-up-auth', 'geolocation'],
    riskLevel: 'high',
  },
  {
    id: 'FC-1079',
    title: 'New Payee Transfer Pattern',
    customerSegment: 'Consumer Checking',
    summary: 'Large outbound transfer to a new payee followed by customer complaint of account takeover.',
    disposition: 'Reverse transfer when possible, reset credentials, and start account takeover workflow.',
    tags: ['fraud', 'transfer', 'new-payee', 'ato', 'complaint'],
    riskLevel: 'high',
  },
  {
    id: 'FC-1112',
    title: 'Disputed ATM Withdrawals',
    customerSegment: 'Branch + ATM',
    summary: 'Customer disputes ATM withdrawals while card presentment logs show unusual terminal location.',
    disposition: 'Escalate to fraud ops and retain ATM camera footage for investigation.',
    tags: ['fraud', 'atm', 'dispute', 'investigation'],
    riskLevel: 'medium',
  },
]

const policySnippets = [
  {
    id: 'POL-AML-220',
    title: 'Suspicious Activity Escalation',
    text: 'Transactions that show account takeover indicators must be escalated to Fraud Operations within 30 minutes and documented with evidence references.',
    tags: ['fraud', 'escalation', 'account takeover', 'evidence'],
  },
  {
    id: 'POL-PRIV-115',
    title: 'PII Handling and Response Redaction',
    text: 'Responses to customers or internal assistants must not expose full account numbers, SSN, or card PAN. Mask sensitive values to last 4 digits only.',
    tags: ['pii', 'privacy', 'redaction', 'account'],
  },
  {
    id: 'POL-OPS-341',
    title: 'Customer Complaint Resolution SLA',
    text: 'Complaints linked to possible fraud require initial customer contact in under 4 business hours and an interim action plan by end of day.',
    tags: ['complaint', 'sla', 'fraud', 'customer-ops'],
  },
]

const complaintRecords = [
  {
    id: 'CMP-801',
    channel: 'Phone',
    category: 'Unauthorized Transfer',
    summary: 'Customer reported a transfer to unknown beneficiary and loss of app access.',
    tags: ['complaint', 'transfer', 'unauthorized', 'app-access'],
  },
  {
    id: 'CMP-845',
    channel: 'Email',
    category: 'Card Fraud',
    summary: 'Customer flagged online purchases in multiple states within one hour.',
    tags: ['complaint', 'card', 'geolocation', 'velocity'],
  },
]

module.exports = {
  fraudCases,
  policySnippets,
  complaintRecords,
}
