const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

// Initialize Stripe (optional - only if key is provided)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecretKey ? require('stripe')(stripeSecretKey) : null

if (!stripeSecretKey) {
  console.warn('Stripe secret key not found. Webhook features will not work.')
}

// Initialize Supabase (optional - only if credentials are valid)
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
      console.warn('Invalid Supabase URL format. Webhook features will not work.')
    }
  } catch (error) {
    console.warn('Error initializing Supabase client:', error.message)
  }
}

if (!supabase) {
  console.warn('Supabase not configured. Webhook features will not work.')
}

// Stripe webhook endpoint (must be raw body, not JSON parsed)
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

router.post('/webhook', async (req, res) => {
  // Check if Stripe is configured
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' })
  }

  const sig = req.headers['stripe-signature']

  let event

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await handleSubscriptionCancellation(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object
        await handlePaymentSuccess(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        await handlePaymentFailure(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

async function handleSubscriptionUpdate(subscription) {
  try {
    const customerId = subscription.customer
    const priceId = subscription.items.data[0]?.price?.id

    // Determine plan from price ID
    let plan = 'free'
    if (priceId === process.env.STRIPE_PRO_PRICE_ID || priceId === process.env.VITE_STRIPE_PRO_PRICE_ID) {
      plan = 'pro'
    } else if (priceId === process.env.STRIPE_ENTERPRISE_PRICE_ID || priceId === process.env.VITE_STRIPE_ENTERPRISE_PRICE_ID) {
      plan = 'enterprise'
    }

    // Find user by Stripe customer ID
    const { data: subscriptionData } = await supabase
      .from('shorts_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!subscriptionData) {
      console.error('User not found for customer:', customerId)
      return
    }

    // Update subscription
    await supabase
      .from('shorts_subscriptions')
      .update({
        plan: plan,
        status: subscription.status,
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', subscriptionData.user_id)

    console.log(`Subscription updated for user ${subscriptionData.user_id}: ${plan}`)
  } catch (error) {
    console.error('Error handling subscription update:', error)
    throw error
  }
}

async function handleSubscriptionCancellation(subscription) {
  try {
    const customerId = subscription.customer

    const { data: subscriptionData } = await supabase
      .from('shorts_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (!subscriptionData) {
      console.error('User not found for customer:', customerId)
      return
    }

    // Downgrade to free plan
    await supabase
      .from('shorts_subscriptions')
      .update({
        plan: 'free',
        status: 'cancelled',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', subscriptionData.user_id)

    console.log(`Subscription cancelled for user ${subscriptionData.user_id}`)
  } catch (error) {
    console.error('Error handling subscription cancellation:', error)
    throw error
  }
}

async function handlePaymentSuccess(invoice) {
  try {
    const customerId = invoice.customer
    const subscriptionId = invoice.subscription

    if (!subscriptionId) return // One-time payment, not subscription

    const subscription = await stripe.subscriptions.retrieve(subscriptionId)
    await handleSubscriptionUpdate(subscription)
  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailure(invoice) {
  try {
    const customerId = invoice.customer

    const { data: subscriptionData } = await supabase
      .from('shorts_subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .single()

    if (subscriptionData) {
      await supabase
        .from('shorts_subscriptions')
        .update({
          status: 'past_due',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', subscriptionData.user_id)

      console.log(`Payment failed for user ${subscriptionData.user_id}`)
    }
  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

module.exports = router

