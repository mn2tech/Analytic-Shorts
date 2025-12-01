import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a dummy Supabase client if credentials are missing (prevents crashes)
// The app will still work, but auth features won't function
let supabase

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Auth features will not work.')
  console.warn('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
  // Create client with placeholder values to prevent crashes
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }

