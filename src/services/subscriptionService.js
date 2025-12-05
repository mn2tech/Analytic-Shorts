import apiClient from '../config/api'

// Get current user's subscription
export const getSubscription = async () => {
  try {
    const response = await apiClient.get('/api/subscription')
    return response.data
  } catch (error) {
    console.error('Error fetching subscription:', error)
    throw error
  }
}

// Create Stripe checkout session
export const createCheckoutSession = async (priceId, imageUrl = null) => {
  try {
    const response = await apiClient.post('/api/subscription/checkout', {
      priceId,
      imageUrl
    })
    return response.data
  } catch (error) {
    console.error('Error creating checkout session:', error)
    throw error
  }
}

// Create Stripe portal session (for managing billing)
export const createPortalSession = async () => {
  try {
    const response = await apiClient.post('/api/subscription/portal')
    return response.data
  } catch (error) {
    console.error('Error creating portal session:', error)
    throw error
  }
}

// Cancel subscription
export const cancelSubscription = async () => {
  try {
    const response = await apiClient.post('/api/subscription/cancel')
    return response.data
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw error
  }
}

// Get usage statistics
export const getUsage = async () => {
  try {
    const response = await apiClient.get('/api/subscription/usage')
    return response.data
  } catch (error) {
    console.error('Error fetching usage:', error)
    throw error
  }
}


