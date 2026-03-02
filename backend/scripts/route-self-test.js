#!/usr/bin/env node
/**
 * Minimal route self-test - hits main example routes and confirms 200 + shape keys.
 * Run with server already running: cd backend && npm run server (or node server.js)
 * Then: node scripts/route-self-test.js
 */
const BASE = process.env.API_BASE || 'http://localhost:5000'

async function fetch(url) {
  const http = url.startsWith('https') ? require('https') : require('http')
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {}
          resolve({ status: res.statusCode, data: parsed })
        } catch {
          resolve({ status: res.statusCode, data: { raw: data.slice(0, 200) } })
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')) })
  })
}

async function test(name, url, options = {}) {
  const { expectStatus = 200, expectKeys = [], acceptStatuses = [] } = options
  const validStatuses = [expectStatus, ...acceptStatuses]
  try {
    const fullUrl = url.startsWith('http') ? url : `${BASE}${url}`
    const { status, data } = await fetch(fullUrl)
    const ok = validStatuses.length > 0 ? validStatuses.includes(status) : true
    const needsKeys = expectKeys.length > 0 && status === expectStatus
    const hasKeys = !needsKeys || expectKeys.every((k) => k in data)
    const pass = ok && hasKeys
    console.log(pass ? '✓' : '✗', name, status, pass ? '' : `(expected ${validStatuses.join(' or ')}, keys: ${expectKeys.join(',')})`)
    return pass
  } catch (err) {
    console.log('✗', name, err.message)
    return false
  }
}

async function main() {
  console.log('Route self-test against', BASE, '\n')

  const tests = [
    ['GET /api-reports', '/api/example/api-reports', { expectKeys: ['reports'] }],
    ['GET /api/example/sales', '/api/example/sales', { expectKeys: ['data', 'columns', 'numericColumns'] }],
    ['GET /api/example/attendance', '/api/example/attendance', { expectKeys: ['data', 'columns'] }],
    ['GET /api/example/sas7bdat-sample', '/api/example/sas7bdat-sample', { expectKeys: ['data', 'columns'] }],
    ['GET /api/example/samgov/live', '/api/example/samgov/live', { expectStatus: 503, expectKeys: ['error'], acceptStatuses: [200] }],
    ['GET /api/example/unemployment', '/api/example/unemployment', { expectKeys: ['data', 'columns', 'source'], acceptStatuses: [403] }],
    ['GET /api/example/usaspending/live', '/api/example/usaspending/live', { expectKeys: ['data', 'columns', 'source'] }],
    ['GET /api/health', '/api/health', { expectKeys: ['status'] }],
  ]

  let pass = 0
  for (const [name, url, opts] of tests) {
    const ok = await test(name, url, opts)
    if (ok) pass++
  }

  console.log('\n' + pass + '/' + tests.length + ' passed')
  process.exit(pass === tests.length ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
