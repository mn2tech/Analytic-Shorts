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
  'yearly-income'
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
