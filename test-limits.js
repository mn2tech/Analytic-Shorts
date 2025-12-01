/**
 * Quick test script for usage limits
 * Run with: node test-limits.js
 * 
 * Make sure:
 * 1. Backend is running on http://localhost:5000
 * 2. You have a valid user token (get from browser localStorage or Supabase)
 * 3. Supabase is configured
 */

const axios = require('axios')

// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:5000'
const USER_TOKEN = process.env.USER_TOKEN || '' // Set this or pass as env var

// Test colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testDashboardLimit() {
  log('\n📊 Testing Dashboard Creation Limit...', 'blue')
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/dashboards`,
      {
        name: 'Test Dashboard',
        data: [{ test: 'data', value: 123 }],
        columns: ['test', 'value'],
        numericColumns: ['value'],
        categoricalColumns: ['test'],
        dateColumns: [],
        selectedNumeric: 'value',
        selectedCategorical: 'test',
        selectedDate: null,
        dashboardView: 'simple'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${USER_TOKEN}`
        },
        validateStatus: () => true // Don't throw on 403
      }
    )

    if (response.status === 201) {
      log('✅ Dashboard created successfully', 'green')
      log(`   Dashboard ID: ${response.data.id}`, 'yellow')
      return true
    } else if (response.status === 403) {
      log('✅ Limit enforcement working!', 'green')
      log(`   Error: ${response.data.error}`, 'yellow')
      log(`   Message: ${response.data.message}`, 'yellow')
      log(`   Limit: ${response.data.limit}`, 'yellow')
      log(`   Current: ${response.data.current}`, 'yellow')
      return false
    } else if (response.status === 401) {
      log('❌ Authentication failed', 'red')
      log('   Make sure USER_TOKEN is set correctly', 'yellow')
      return false
    } else {
      log(`❌ Unexpected status: ${response.status}`, 'red')
      log(`   Response: ${JSON.stringify(response.data)}`, 'yellow')
      return false
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red')
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'yellow')
      log(`   Data: ${JSON.stringify(error.response.data)}`, 'yellow')
    }
    return false
  }
}

async function testUploadLimit() {
  log('\n📤 Testing File Upload Limit...', 'blue')
  log('   Note: This requires a real file upload', 'yellow')
  log('   Test manually by uploading files through the UI', 'yellow')
}

async function testInsightLimit() {
  log('\n🤖 Testing AI Insights Limit...', 'blue')
  log('   Note: This requires a real dashboard with data', 'yellow')
  log('   Test manually by generating insights in the UI', 'yellow')
}

async function testHealthCheck() {
  log('\n🏥 Testing API Health...', 'blue')
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`)
    if (response.status === 200) {
      log('✅ API is running', 'green')
      log(`   Status: ${response.data.status}`, 'yellow')
      return true
    }
  } catch (error) {
    log('❌ API is not running or not accessible', 'red')
    log(`   Error: ${error.message}`, 'yellow')
    log(`   Make sure backend is running on ${API_BASE_URL}`, 'yellow')
    return false
  }
}

async function runTests() {
  log('🧪 Usage Limits Test Suite', 'blue')
  log('='.repeat(50), 'blue')
  
  if (!USER_TOKEN) {
    log('\n⚠️  Warning: USER_TOKEN not set', 'yellow')
    log('   Set it as environment variable:', 'yellow')
    log('   USER_TOKEN=your_token_here node test-limits.js', 'yellow')
    log('   Or get it from browser localStorage:', 'yellow')
    log('   localStorage.getItem("sb-access-token")', 'yellow')
    log('\n   Some tests will be skipped...\n', 'yellow')
  }

  // Test 1: Health check
  const healthOk = await testHealthCheck()
  if (!healthOk) {
    log('\n❌ API is not accessible. Please start the backend first.', 'red')
    process.exit(1)
  }

  // Test 2: Dashboard limit (requires auth)
  if (USER_TOKEN) {
    await testDashboardLimit()
  } else {
    log('\n⏭️  Skipping dashboard limit test (no token)', 'yellow')
  }

  // Test 3: Upload limit (manual test)
  await testUploadLimit()

  // Test 4: Insight limit (manual test)
  await testInsightLimit()

  log('\n' + '='.repeat(50), 'blue')
  log('✅ Test suite completed!', 'green')
  log('\n📝 Next steps:', 'blue')
  log('   1. Test file upload limits manually in the UI', 'yellow')
  log('   2. Test AI insights limits manually in the UI', 'yellow')
  log('   3. Test forecasting feature visibility', 'yellow')
  log('   4. Check usage stats component in dashboard', 'yellow')
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red')
  process.exit(1)
})


