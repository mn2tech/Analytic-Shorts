/**
 * Reference schema for known example datasets.
 * Use for prompts, docs, or validation. Runtime schema for any dataset comes from GET /api/ai/dataset-schema.
 *
 * @see data-and-dashboard-schema.md
 */

/** Known example dataset IDs (built-in + API examples) */
export const KNOWN_DATASET_IDS = [
  'sales',
  'attendance',
  'donations',
  'medical',
  'banking',
  'yearly-income',
  'today-snapshot',
  'revenue-trends',
  'alters-insights',
  'samgov/live'
]

/**
 * Typical field names and types per example dataset.
 * Keys match KNOWN_DATASET_IDS. Types: 'string' | 'number' | 'date'.
 * Actual schema (with examples, min/max) is from the API.
 */
export const KNOWN_DATASETS_FIELDS = {
  sales: [
    { name: 'Date', type: 'date' },
    { name: 'Product', type: 'string' },
    { name: 'Category', type: 'string' },
    { name: 'Sales', type: 'number' },
    { name: 'Region', type: 'string' },
    { name: 'Units', type: 'number' }
  ],
  attendance: [
    { name: 'Date', type: 'date' },
    { name: 'Employee', type: 'string' },
    { name: 'Department', type: 'string' },
    { name: 'Hours', type: 'number' },
    { name: 'Status', type: 'string' }
  ],
  donations: [
    { name: 'Date', type: 'date' },
    { name: 'Donor', type: 'string' },
    { name: 'Category', type: 'string' },
    { name: 'Amount', type: 'number' },
    { name: 'PaymentMethod', type: 'string' }
  ],
  medical: [
    { name: 'Date', type: 'date' },
    { name: 'Patient ID', type: 'string' },
    { name: 'Department', type: 'string' },
    { name: 'Diagnosis', type: 'string' },
    { name: 'Age', type: 'number' },
    { name: 'Blood Pressure (mmHg)', type: 'string' },
    { name: 'Heart Rate (bpm)', type: 'number' },
    { name: 'Temperature (°F)', type: 'number' },
    { name: 'Treatment Cost ($)', type: 'number' },
    { name: 'Medication', type: 'string' },
    { name: 'Visit Duration (min)', type: 'number' },
    { name: 'Status', type: 'string' }
  ],
  banking: [
    { name: 'Date', type: 'date' },
    { name: 'Category', type: 'string' },
    { name: 'Amount', type: 'number' }
  ],
  'yearly-income': [
    { name: 'Year', type: 'date' },
    { name: 'Income', type: 'number' }
  ],
  'today-snapshot': [
    { name: 'date', type: 'date' },
    { name: 'occupancy_rate', type: 'number' },
    { name: 'rooms_available', type: 'number' },
    { name: 'rooms_occupied', type: 'number' },
    { name: 'arrivals_today', type: 'number' },
    { name: 'departures_today', type: 'number' },
    { name: 'revenue_today', type: 'number' },
    { name: 'adr', type: 'number' },
    { name: 'revpar', type: 'number' }
  ],
  'revenue-trends': [
    { name: 'date', type: 'date' },
    { name: 'occupancy_rate', type: 'number' },
    { name: 'revenue', type: 'number' },
    { name: 'adr', type: 'number' },
    { name: 'revpar', type: 'number' }
  ],
  'alters-insights': [
    { name: 'date', type: 'date' },
    { name: 'alert_type', type: 'string' },
    { name: 'severity', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'recommended_action', type: 'string' }
  ],
  'samgov/live': [
    { name: 'noticeId', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'solicitationNumber', type: 'string' },
    { name: 'postedDate', type: 'date' },
    { name: 'updatedDate', type: 'date' },
    { name: 'responseDeadLine', type: 'date' },
    { name: 'type', type: 'string' },
    { name: 'baseType', type: 'string' },
    { name: 'active', type: 'string' },
    { name: 'organization', type: 'string' },
    { name: 'naicsCode', type: 'string' },
    { name: 'classificationCode', type: 'string' },
    { name: 'setAside', type: 'string' },
    { name: 'state', type: 'string' },
    { name: 'uiLink', type: 'string' },
    { name: 'award_amount', type: 'number' }
  ]
}

/**
 * Get field names for a known dataset (for prompts or validation).
 * Returns empty array if dataset is unknown or user dashboard.
 */
export function getKnownFields(datasetId) {
  if (!datasetId || typeof datasetId !== 'string') return []
  const baseId = datasetId.startsWith('dashboard:') ? null : datasetId
  const fields = KNOWN_DATASETS_FIELDS[baseId]
  return fields ? fields.map((f) => f.name) : []
}
