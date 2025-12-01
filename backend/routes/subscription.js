const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

// Initialize Stripe (optional - only if key is provided)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null

if (!stripeSecretKey) {
  console.warn('Stripe secret key not found. Payment features will not work.')
}

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
      console.warn('Invalid Supabase URL format. Subscription features will not work.')
    }
  } catch (error) {
    console.warn('Error initializing Supabase client:', error.message)
  }
}

if (!supabase) {
  console.warn('Supabase credentials not found or invalid. Subscription features will not work.')
}

// Middleware to get user from JWT token
const getUserFromToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const token = authHeader.split(' ')[1]

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' })
    }

    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = data.user
    next()
  } catch (error) {
    console.error('Authentication middleware error:', error)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}

// Get current user's subscription
router.get('/', getUserFromToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('shorts_subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no subscription found, return free plan
    if (!data) {
      return res.json({
        plan: 'free',
        status: 'active',
        user_id: req.user.id
      })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching subscription:', error)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
})

// Create Stripe checkout session
router.post('/checkout', getUserFromToken, async (req, res) => {
  try {
    const { priceId } = req.body

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' })
    }

    if (!stripe) {
      console.error('Stripe not configured - STRIPE_SECRET_KEY missing or invalid')
      return res.status(500).json({ 
        error: 'Stripe not configured',
        message: 'Payment processing is not available. Please configure Stripe secret key in backend/.env'
      })
    }

    if (!supabase) {
      console.error('Supabase not configured - cannot access database')
      return res.status(500).json({ 
        error: 'Database not configured',
        message: 'Please configure Supabase credentials in backend/.env'
      })
    }

    // Validate priceId format (should start with 'price_')
    if (!priceId.startsWith('price_') && priceId !== 'price_pro_monthly' && priceId !== 'price_enterprise_monthly') {
      console.error('Invalid price ID format:', priceId)
      return res.status(400).json({ 
        error: 'Invalid price ID',
        message: 'Price ID must be a valid Stripe price ID (starts with "price_"). Please create products in Stripe Dashboard first.'
      })
    }

    // Get or create Stripe customer
    let { data: subscription, error: subError } = await supabase
      .from('shorts_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single()

    if (subError && subError.code !== 'PGRST116') {
      console.error('Error fetching subscription:', subError)
      // Continue anyway - will create new subscription
    }

    let customerId = subscription?.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: req.user.email,
        metadata: {
          userId: req.user.id
        }
      })
      customerId = customer.id

      // Save customer ID to database
      await supabase
        .from('shorts_subscriptions')
        .upsert({
          user_id: req.user.id,
          stripe_customer_id: customerId,
          plan: 'free',
          status: 'active'
        }, {
          onConflict: 'user_id'
        })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing?canceled=true`,
      metadata: {
        userId: req.user.id
      }
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    
    // Provide more detailed error messages
    let errorMessage = 'Failed to create checkout session'
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Stripe error: ${error.message}`
      if (error.message.includes('No such price')) {
        errorMessage = 'Invalid price ID. Please create the product in Stripe Dashboard first.'
      }
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Create Stripe portal session (for managing billing)
router.post('/portal', getUserFromToken, async (req, res) => {
  try {
    const { data: subscription } = await supabase
      .from('shorts_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', req.user.id)
      .single()

    if (!subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
    })

    res.json({ url: session.url })
  } catch (error) {
    console.error('Error creating portal session:', error)
    res.status(500).json({ error: 'Failed to create portal session' })
  }
})

// Get usage statistics
router.get('/usage', getUserFromToken, async (req, res) => {
  try {
    // Get subscription
    const { data: subscription } = await supabase
      .from('shorts_subscriptions')
      .select('plan')
      .eq('user_id', req.user.id)
      .single()

    const plan = subscription?.plan || 'free'

    // Get current month's usage
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    // Count dashboards
    const { count: dashboardCount } = await supabase
      .from('shorts_dashboards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)

    // Count uploads this month
    const { count: uploadCount } = await supabase
      .from('shorts_file_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('upload_date', startOfMonth.toISOString())

    // Count AI insights this month
    const { count: insightCount } = await supabase
      .from('shorts_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('action', 'insight')
      .gte('created_at', startOfMonth.toISOString())

    res.json({
      plan,
      usage: {
        dashboards: dashboardCount || 0,
        uploads: uploadCount || 0,
        insights: insightCount || 0
      }
    })
  } catch (error) {
    console.error('Error fetching usage:', error)
    res.status(500).json({ error: 'Failed to fetch usage' })
  }
})

module.exports = router

