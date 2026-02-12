// Quick script to verify Supabase setup (manual).
// Run with: node test-auth.js
//
// Note: This is NOT a unit test. It is excluded from `node --test` runs.

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('Testing Supabase Configuration...\n')

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL not found in .env')
  process.exit(1)
} else {
  console.log('✅ SUPABASE_URL:', supabaseUrl)
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env')
  process.exit(1)
} else {
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey.substring(0, 20) + '...')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test database connection
async function testConnection() {
  try {
    console.log('\nTesting database connection...')
    
    // Try to query a table (this will fail if tables don't exist, but that's ok)
    const { data, error } = await supabase
      .from('shorts_dashboards')
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        console.log('⚠️  Table shorts_dashboards does not exist yet')
        console.log('   Run the SQL schema in Supabase SQL Editor')
      } else {
        console.error('❌ Database error:', error.message)
      }
    } else {
      console.log('✅ Database connection successful')
    }
    
    console.log('\n✅ Supabase configuration looks good!')
    console.log('   Make sure you:')
    console.log('   1. Have run the SQL schema in Supabase')
    console.log('   2. Have restarted the backend server')
    console.log('   3. Are logged in to the frontend')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

testConnection()




