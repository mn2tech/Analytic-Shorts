const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate URL before creating client
let supabase = null
if (supabaseUrl && supabaseServiceKey) {
  try {
    if (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false
        }
      })
    } else {
      console.warn('Invalid Supabase URL format. Shared dashboard features will not work.')
    }
  } catch (error) {
    console.warn('Error initializing Supabase client:', error.message)
  }
}

if (!supabase) {
  console.warn('Supabase credentials not found or invalid. Shared dashboard features will not work.')
}

// POST /api/shared - Create a shared dashboard
router.post('/', async (req, res) => {
  try {
    const { shareId, dashboardData } = req.body

    console.log('POST /api/shared - Received request:', {
      hasShareId: !!shareId,
      shareId: shareId,
      hasDashboardData: !!dashboardData,
      dashboardDataType: typeof dashboardData
    })

    if (!shareId) {
      return res.status(400).json({ error: 'shareId is required' })
    }

    if (!dashboardData) {
      return res.status(400).json({ error: 'dashboardData is required' })
    }

    if (!supabase) {
      console.error('Supabase not configured')
      return res.status(500).json({ error: 'Database not configured' })
    }

    // Save shared dashboard to database
    console.log('Saving to shared_dashboards table...')
    const { data, error } = await supabase
      .from('shared_dashboards')
      .upsert({
        share_id: shareId,
        dashboard_data: dashboardData,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
      }, {
        onConflict: 'share_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving shared dashboard:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      return res.status(500).json({ 
        error: 'Failed to save shared dashboard',
        details: error.message,
        code: error.code
      })
    }

    console.log('Successfully saved shared dashboard:', {
      shareId: data.share_id,
      createdAt: data.created_at
    })

    res.json({ 
      success: true, 
      shareId: data.share_id,
      expiresAt: data.expires_at
    })
  } catch (error) {
    console.error('Error in POST /api/shared:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
})

// GET /api/shared/:shareId - Get a shared dashboard (PUBLIC - no auth required)
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params

    console.log('Loading shared dashboard:', shareId)

    if (!shareId) {
      return res.status(400).json({ error: 'shareId is required' })
    }

    if (!supabase) {
      console.error('Supabase not configured')
      return res.status(500).json({ error: 'Database not configured' })
    }

    // Load shared dashboard from database
    console.log('Querying shared_dashboards table for share_id:', shareId)
    const { data, error } = await supabase
      .from('shared_dashboards')
      .select('*')
      .eq('share_id', shareId)
      .single()

    if (error) {
      console.error('Supabase query error:', error)
      if (error.code === 'PGRST116') {
        // Not found
        console.log('Shared dashboard not found in database')
        return res.status(404).json({ error: 'Shared dashboard not found' })
      }
      return res.status(500).json({ 
        error: 'Failed to load shared dashboard',
        details: error.message,
        code: error.code
      })
    }

    if (!data) {
      console.log('No data returned from query')
      return res.status(404).json({ error: 'Shared dashboard not found' })
    }

    console.log('Found shared dashboard:', {
      shareId: data.share_id,
      hasDashboardData: !!data.dashboard_data,
      dashboardDataType: typeof data.dashboard_data,
      createdAt: data.created_at,
      expiresAt: data.expires_at
    })

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log('Shared dashboard has expired')
      return res.status(410).json({ error: 'Shared dashboard has expired' })
    }

    // Parse dashboard_data if it's a string
    let dashboardData = data.dashboard_data
    if (typeof dashboardData === 'string') {
      try {
        dashboardData = JSON.parse(dashboardData)
      } catch (parseError) {
        console.error('Error parsing dashboard_data:', parseError)
        return res.status(500).json({ error: 'Invalid dashboard data format' })
      }
    }

    res.json({
      shareId: data.share_id,
      dashboardData: dashboardData,
      createdAt: data.created_at,
      expiresAt: data.expires_at
    })
  } catch (error) {
    console.error('Error in GET /api/shared/:shareId:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    })
  }
})

module.exports = router
