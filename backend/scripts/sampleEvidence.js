/**
 * Run Studio build pipeline for sales and opportunity sources and output Evidence JSON.
 * Usage: node backend/scripts/sampleEvidence.js
 * No server required; uses in-memory sales data and a small opportunity fixture.
 */

const path = require('path')
const projectRoot = path.resolve(__dirname, '../..')

// Load backend deps from project root
const { getExampleDatasetData } = require(path.join(projectRoot, 'backend/routes/examples'))
const { inferSchema } = require(path.join(projectRoot, 'backend/studio-ai/data-connectors/normalizer'))
const { profileDataset } = require(path.join(projectRoot, 'backend/studio-ai/engine/profileDataset'))
const { buildSemanticGraph } = require(path.join(projectRoot, 'backend/studio-ai/engine/buildSemanticGraph'))
const { orchestrateAnalysis } = require(path.join(projectRoot, 'backend/studio-ai/engine/orchestrateAnalysis'))
const { executePlan } = require(path.join(projectRoot, 'backend/studio-ai/engine/executePlan'))
const { getTemplate } = require(path.join(projectRoot, 'backend/studio-ai/templates/templates'))
const {
  detectDatasetIntent,
  deriveFields,
  selectPrimaryMetric,
  assembleEvidence,
} = require(path.join(projectRoot, 'backend/studio-ai/evidence'))

function runPipeline(rows, templateId = 'general') {
  const schema = inferSchema(rows, { sampleRowLimit: 5000, sampleValuesLimit: 8 })
  let canonicalForRun = {
    schema,
    rows: rows.slice(),
    metadata: { rowCount: rows.length },
  }
  const initialProfile = profileDataset(canonicalForRun, { maxProfileRows: 5000, sampleValuesLimit: 8 })
  const { rows: derivedRows, addedColumns } = deriveFields(canonicalForRun.rows, initialProfile)
  if (addedColumns.length > 0) {
    canonicalForRun = {
      ...canonicalForRun,
      rows: derivedRows,
      schema: [...canonicalForRun.schema, ...addedColumns],
    }
  }
  const datasetProfile = profileDataset(canonicalForRun, { maxProfileRows: 5000, sampleValuesLimit: 8 })
  const intent = detectDatasetIntent(datasetProfile)
  const primaryMetric = selectPrimaryMetric(datasetProfile, intent, canonicalForRun.rows)
  const template = getTemplate(templateId)
  const buildOptions = {
    template,
    overrides: { ...{}, primaryMeasure: primaryMetric },
  }
  const semanticGraph = buildSemanticGraph(datasetProfile, canonicalForRun, buildOptions)
  const analysisPlan = orchestrateAnalysis(datasetProfile, semanticGraph, canonicalForRun, buildOptions)
  const insightBlocks = executePlan(canonicalForRun, semanticGraph, analysisPlan, {
    maxComputeRows: 20000,
    templateId,
  })
  const evidence = assembleEvidence({
    profile: datasetProfile,
    intent,
    primaryMetric,
    blocks: insightBlocks,
  })
  return evidence
}

// Sales: use built-in example
const salesData = getExampleDatasetData('sales')
if (!salesData || !Array.isArray(salesData)) {
  console.error('Sales example data not found')
  process.exit(1)
}

// Opportunity: minimal SAM-shaped fixture (agency, naics, notice_id, set_aside, posted_date, etc.)
const opportunityRows = [
  {
    notice_id: 'NOTICE-001',
    title: 'Cloud Migration Support',
    agency: 'Department of Defense',
    naics: '541512',
    set_aside: '8A',
    posted_date: '2025-01-15',
    type: 'solicitation',
  },
  {
    notice_id: 'NOTICE-002',
    title: 'IT Infrastructure Modernization',
    agency: 'Department of Energy',
    naics: '541513',
    set_aside: 'SBA',
    posted_date: '2025-01-18',
    type: 'solicitation',
  },
  {
    notice_id: 'NOTICE-003',
    title: 'Cybersecurity Assessment',
    agency: 'Department of Defense',
    naics: '541512',
    set_aside: '8A',
    posted_date: '2025-01-20',
    type: 'solicitation',
  },
  {
    notice_id: 'NOTICE-004',
    title: 'Data Analytics Platform',
    agency: 'GSA',
    naics: '541511',
    set_aside: 'Full and Open',
    posted_date: '2025-01-22',
    type: 'solicitation',
  },
  {
    notice_id: 'NOTICE-005',
    title: 'Help Desk Services',
    agency: 'Department of Energy',
    naics: '541513',
    set_aside: 'HUBZone',
    posted_date: '2025-01-25',
    type: 'solicitation',
  },
  {
    notice_id: 'NOTICE-006',
    title: 'Network Operations',
    agency: 'Department of Defense',
    naics: '541512',
    set_aside: '8A',
    posted_date: '2025-01-28',
    type: 'solicitation',
  },
]

console.log('=== SALES (example dataset) ===\n')
const salesEvidence = runPipeline(salesData, 'general')
console.log(JSON.stringify(salesEvidence, null, 2))

console.log('\n\n=== OPPORTUNITY (SAM-shaped fixture) ===\n')
const opportunityEvidence = runPipeline(opportunityRows, 'govcon')
console.log(JSON.stringify(opportunityEvidence, null, 2))
