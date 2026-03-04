/**
 * Integration test for USAspending in Federal Entry pipeline.
 * Run with: node backend/scripts/test-usaspending-integration.js
 *
 * Prereqs: Backend server running on port 5000 (npm run server or npm run dev:all).
 * IMPORTANT: Restart the server after backend changes to pick up govconFetchers updates.
 */
const http = require('http')
const https = require('https')

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000'

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const isHttps = url.protocol === 'https:'
    const lib = isHttps ? https : http
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    const req = lib.request(opts, (res) => {
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} })
        } catch {
          resolve({ status: res.statusCode, data: { raw: data } })
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  console.log('=== USAspending Federal Entry Integration Test ===\n')
  console.log('Payload: naics=["561720"], fy=["2024","2025","2026"], agency="TREASURY", debug=true')
  console.log('Ensure the backend server has been restarted after any govconFetchers changes.\n')

  const runRes = await request('POST', '/api/reports/federal-entry/run', {
    naics: ['561720'],
    fy: ['2024', '2025', '2026'],
    agency: 'TREASURY',
    debug: true,
  })

  if (runRes.status !== 202) {
    console.error('POST /run failed:', runRes.status, runRes.data)
    process.exit(1)
  }

  const reportRunId = runRes.data.reportRunId
  console.log('Report started:', reportRunId)
  console.log('Polling for completion (max 90s)...\n')

  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    const sumRes = await request('GET', `/api/reports/federal-entry/${reportRunId}/summary`)
    const dataRes = await request('GET', `/api/reports/federal-entry/${reportRunId}/data`)
    const d = sumRes.data
    const dataJson = (dataRes.data && dataRes.data.data) || {}
    if (d.status === 'completed') {
      console.log('Report completed.\n')
      console.log('--- USAspending Payloads & Counts ---\n')

      const debug = d.debug || dataJson.debug || {}
      const awardsQuery = debug.awardsQuery || {}
      const spendQuery = debug.spendQuery || {}

      console.log('spending_by_award requestPayload:')
      console.log(JSON.stringify(awardsQuery.requestPayload ?? 'undefined (not captured)', null, 2))
      console.log('\nspending_by_award: awardsCount =', awardsQuery.awardsCount ?? debug.awardsCount ?? 'N/A')
      if (awardsQuery.agencyFallbackUsed) console.log('(agency fallback used: queried without agency filter)')
      if (awardsQuery.error) {
        console.log('spending_by_award ERROR:', JSON.stringify(awardsQuery.error, null, 2))
      }

      console.log('\n---\nspending_over_time requestPayload:')
      console.log(JSON.stringify(spendQuery.requestPayload, null, 2))
      console.log('\nspending_over_time: spendCount =', spendQuery.spendCount ?? debug.spendCount ?? 'N/A')
      if (spendQuery.error) {
        console.log('spending_over_time ERROR:', JSON.stringify(spendQuery.error, null, 2))
      }

      const awardsCount = awardsQuery.awardsCount ?? debug.awardsCount ?? 0
      if (awardsCount === 0 && !awardsQuery.error) {
        console.log('\n⚠️  WARNING: awardsCount is 0 but no error captured. Check USAspending API response.')
      } else if (awardsCount > 0) {
        console.log('\n✓ awardsCount > 0')
      }

      process.exit(awardsQuery.error ? 1 : 0)
    }
    if (d.status === 'failed') {
      console.error('Report failed.')
      process.exit(1)
    }
  }

  console.error('Timeout waiting for report')
  process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
