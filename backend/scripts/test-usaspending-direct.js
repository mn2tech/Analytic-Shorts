/**
 * Direct test of USAspending fetchers - no server required.
 * Run: node backend/scripts/test-usaspending-direct.js
 */
const { fetchUsaspendingRecentAwards, fetchUsaspendingSpendingOverTime } = require('../utils/govconFetchers')

async function main() {
  const opts = { fy: ['2024', '2025', '2026'], naics: ['561720'], agency: 'TREASURY', limit: 100 }
  console.log('fetchUsaspendingRecentAwards opts:', JSON.stringify(opts, null, 2))

  const withAgency = await fetchUsaspendingRecentAwards(opts)
  console.log('\nWith agency:', { count: (withAgency.data || []).length, error: withAgency.error, status: withAgency.status })
  console.log('Request payload:', JSON.stringify(withAgency._requestPayload || withAgency._debug?.requestPayload, null, 2))
  if (withAgency._debug?.responseBody) console.log('Error response:', JSON.stringify(withAgency._debug.responseBody))

  const noAgency = await fetchUsaspendingRecentAwards({ ...opts, agency: undefined })
  console.log('\nWithout agency:', { count: (noAgency.data || []).length, error: noAgency.error })
  console.log('Request payload:', JSON.stringify(noAgency._requestPayload || noAgency._debug?.requestPayload, null, 2))
}

main().catch(console.error)
