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

    if (!shareId) {
      return res.status(400).json({ error: 'shareId is required' })
    }

    if (!dashboardData) {
      return res.status(400).json({ error: 'dashboardData is required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' })
    }

    // Save shared dashboard to database
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
      return res.status(500).json({ 
        error: 'Failed to save shared dashboard',
        details: error.message 
      })
    }

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

// GET /api/shared/:shareId - Get a shared dashboard
router.get('/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params

    if (!shareId) {
      return res.status(400).json({ error: 'shareId is required' })
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' })
    }

    // Load shared dashboard from database
    const { data, error } = await supabase
      .from('shared_dashboards')
      .select('*')
      .eq('share_id', shareId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return res.status(404).json({ error: 'Shared dashboard not found' })
      }
      console.error('Error loading shared dashboard:', error)
      return res.status(500).json({ 
        error: 'Failed to load shared dashboard',
        details: error.message 
      })
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Shared dashboard has expired' })
    }

    res.json({
      shareId: data.share_id,
      dashboardData: data.dashboard_data,
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
