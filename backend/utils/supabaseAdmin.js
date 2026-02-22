const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let admin = null
if (supabaseUrl && supabaseServiceKey && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))) {
  try {
    admin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  } catch (e) {
    console.warn('Supabase admin client init failed:', e.message)
  }
}

function getSupabaseAdmin() {
  return admin
}

module.exports = { getSupabaseAdmin }
