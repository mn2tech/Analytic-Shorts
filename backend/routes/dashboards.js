const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')
const { checkDashboardLimit } = require('../middleware/usageLimits')

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate URL before creating client
let supabase = null
if (supabaseUrl && supabaseServiceKey) {
  try {
    // Basic URL validation
    if (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')) {
      supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false
        }
      })
    } else {
      console.warn('Invalid Supabase URL format. Dashboard features will not work.')
    }
  } catch (error) {
    console.warn('Error initializing Supabase client:', error.message)
  }
}

if (!supabase) {
  console.warn('Supabase credentials not found or invalid. Dashboard features will not work.')
}

// Middleware to get user from JWT token
const getUserFromToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    const token = authHeader.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    if (!supabase) {
      console.error('Supabase not configured')
      return res.status(500).json({ error: 'Database not configured' })
    }
    
    // Verify token and get user
    // Note: With service role key, we can verify any user's token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error) {
      console.error('Token verification error:', error.message || error)
      return res.status(401).json({ error: 'Invalid or expired token', details: error.message })
    }
    
    if (!user || !user.id) {
      console.error('No user found in token. User:', user)
      return res.status(401).json({ error: 'Invalid token - no user found' })
    }
    
    console.log('Authenticated user:', user.id, user.email)
    req.user = user
    next()
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return res.status(401).json({ error: 'Authentication failed', details: error.message })
  }
}

// Get all dashboards for the current user
router.get('/', getUserFromToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shorts_dashboards')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    res.json(data || [])
  } catch (error) {
    console.error('Error fetching dashboards:', error)
    res.status(500).json({ error: 'Failed to fetch dashboards' })
  }
})

// Get a specific dashboard by ID
router.get('/:id', getUserFromToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shorts_dashboards')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Dashboard not found' })
      }
      throw error
    }
    
    res.json(data)
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard' })
  }
})

// Create a new dashboard (with usage limit check)
router.post('/', getUserFromToken, checkDashboardLimit, async (req, res) => {
  try {
    // Safety check
    if (!req.user || !req.user.id) {
      console.error('req.user is undefined:', req.user)
      return res.status(401).json({ error: 'User not authenticated' })
    }
    
    const {
      name,
      data,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      selectedNumeric,
      selectedCategorical,
      selectedDate,
      dashboardView,
      schema
    } = req.body
    
    // For Studio dashboards, data can be empty (data comes from data_source)
    // Only require data for non-studio dashboards
    if (!data && dashboardView !== 'studio') {
      return res.status(400).json({ error: 'Dashboard data is required' })
    }
    
    const insertData = {
      user_id: req.user.id,
      name: name || 'Untitled Dashboard',
      data: data || [], // Allow empty array for Studio dashboards
      columns: columns || [],
      numeric_columns: numericColumns || [],
      categorical_columns: categoricalColumns || [],
      date_columns: dateColumns || [],
      selected_numeric: selectedNumeric,
      selected_categorical: selectedCategorical,
      selected_date: selectedDate,
      dashboard_view: dashboardView || 'advanced'
    }
    
    // Add schema if provided (for Studio dashboards)
    // Only include schema if it's provided (to avoid cache issues)
    if (schema !== undefined && schema !== null) {
      try {
        insertData.schema = typeof schema === 'string' ? schema : JSON.stringify(schema)
      } catch (err) {
        console.error('Error stringifying schema:', err)
        // Continue without schema if stringification fails
      }
    }
    
    const { data: dashboard, error } = await supabase
      .from('shorts_dashboards')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase insert error:', error)
      console.error('Insert data keys:', Object.keys(insertData))
      console.error('Schema type:', typeof insertData.schema)
      throw error
    }
    
    // Log usage
    await supabase.from('shorts_usage_logs').insert({
      user_id: req.user.id,
      action: 'dashboard_create',
      resource_type: 'dashboard',
      metadata: { dashboard_id: dashboard.id, name: dashboard.name }
    })
    
    res.status(201).json(dashboard)
  } catch (error) {
    console.error('Error creating dashboard:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    res.status(500).json({ 
      error: 'Failed to create dashboard',
      message: error.message || 'Unknown error',
      details: error.details || error.hint || 'Check server logs for more information'
    })
  }
})

// Update a dashboard
router.put('/:id', getUserFromToken, async (req, res) => {
  try {
    const {
      name,
      data,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      selectedNumeric,
      selectedCategorical,
      selectedDate,
      dashboardView,
      schema
    } = req.body
    
    // First verify the dashboard belongs to the user
    const { data: existing, error: fetchError } = await supabase
      .from('shorts_dashboards')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single()
    
    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Dashboard not found' })
    }
    
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (data !== undefined) updateData.data = data
    if (columns !== undefined) updateData.columns = columns
    if (numericColumns !== undefined) updateData.numeric_columns = numericColumns
    if (categoricalColumns !== undefined) updateData.categorical_columns = categoricalColumns
    if (dateColumns !== undefined) updateData.date_columns = dateColumns
    if (selectedNumeric !== undefined) updateData.selected_numeric = selectedNumeric
    if (selectedCategorical !== undefined) updateData.selected_categorical = selectedCategorical
    if (selectedDate !== undefined) updateData.selected_date = selectedDate
    if (dashboardView !== undefined) updateData.dashboard_view = dashboardView
    if (schema !== undefined) {
      updateData.schema = typeof schema === 'string' ? schema : JSON.stringify(schema)
    }
    
    const { data: dashboard, error } = await supabase
      .from('shorts_dashboards')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single()
    
    if (error) throw error
    
    res.json(dashboard)
  } catch (error) {
    console.error('Error updating dashboard:', error)
    res.status(500).json({ error: 'Failed to update dashboard' })
  }
})

// Delete a dashboard
router.delete('/:id', getUserFromToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('shorts_dashboards')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
    
    if (error) throw error
    
    res.json({ message: 'Dashboard deleted successfully' })
  } catch (error) {
    console.error('Error deleting dashboard:', error)
    res.status(500).json({ error: 'Failed to delete dashboard' })
  }
})

module.exports = router

