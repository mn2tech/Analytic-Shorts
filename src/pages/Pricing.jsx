import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { PLANS } from '../config/pricing'
import { createCheckoutSession } from '../services/subscriptionService'
import { useAuth } from '../contexts/AuthContext'
import { getSubscription } from '../services/subscriptionService'

function Pricing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState({})
  const [currentPlan, setCurrentPlan] = useState(null)

  useEffect(() => {
    if (user) {
      loadSubscription()
    }
  }, [user])

  const loadSubscription = async () => {
    try {
      const subscription = await getSubscription()
      setCurrentPlan(subscription?.plan || 'free')
    } catch (error) {
      console.error('Error loading subscription:', error)
    }
  }

  const handleUpgrade = async (planId) => {
    if (!user) {
      navigate('/signup')
      return
    }

    if (planId === 'free') {
      // Can't "upgrade" to free, but can cancel
      return
    }

    const plan = PLANS[planId]
    if (!plan.priceId) {
      alert('This plan is not available for purchase yet.')
      return
    }

    setLoading({ [planId]: true })

    try {
      const { url } = await createCheckoutSession(plan.priceId)
      if (!url) {
        throw new Error('No checkout URL returned')
      }
      // Redirect to Stripe Checkout
      window.location.href = url
    } catch (error) {
      console.error('Error creating checkout session:', error)
      
      // Show more helpful error message
      let errorMessage = 'Failed to start checkout. Please try again.'
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(`Checkout Error: ${errorMessage}\n\nPlease check:\n1. Backend is running\n2. Stripe is configured\n3. Products are created in Stripe Dashboard`)
      setLoading({ [planId]: false })
    }
  }

  const getButtonText = (planId) => {
    if (currentPlan === planId) {
      return 'Current Plan'
    }
    if (planId === 'free') {
      return 'Current Plan'
    }
    if (currentPlan === 'free' && planId !== 'free') {
      return 'Upgrade'
    }
    if (PLANS[currentPlan]?.price > PLANS[planId]?.price) {
      return 'Downgrade'
    }
    return 'Upgrade'
  }

  const isCurrentPlan = (planId) => {
    return currentPlan === planId
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Start free, upgrade as you grow
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.values(PLANS).map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl shadow-lg p-8 border-2 transition-all ${
                plan.popular
                  ? 'border-blue-500 scale-105 relative'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-600">/{plan.interval}</span>
                  )}
                </div>
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrentPlan(plan.id) || loading[plan.id]}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isCurrentPlan(plan.id)
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {loading[plan.id] ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  getButtonText(plan.id)
                )}
              </button>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change plans later?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes
                take effect immediately, and we'll prorate the billing.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards through Stripe. Your payment
                information is securely processed and never stored on our servers.
              </p>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! The Free plan is available forever. You can also try Pro or
                Enterprise plans with a 14-day free trial (no credit card
                required for trial).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Pricing

