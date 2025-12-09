// Pricing Plans Configuration
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null, // No Stripe price ID for free plan
    interval: 'month',
    description: 'Perfect for getting started',
    features: [
      '5 dashboards',
      '10 file uploads/month',
      'Basic charts',
      'CSV/Excel support',
      'Community support'
    ],
    limits: {
      dashboards: 5,
      uploadsPerMonth: 10,
      fileSizeMB: 5,
      aiInsights: 5,
      exports: 10,
      forecasting: false
    },
    popular: false
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: import.meta.env.VITE_STRIPE_PRO_PRICE_ID || 'price_pro_monthly', // Set in .env
    interval: 'month',
    description: 'For power users and small teams',
    image: import.meta.env.VITE_PRO_PLAN_IMAGE || '/images/pro-plan.jpg', // Plan image URL (local or external)
    features: [
      'Unlimited dashboards',
      'Unlimited file uploads',
      'Advanced charts + forecasting',
      'Export to PDF/Excel',
      'Priority support',
      'Larger file sizes (50MB)',
      '100 AI insights/month'
    ],
    limits: {
      dashboards: -1, // unlimited
      uploadsPerMonth: -1, // unlimited
      fileSizeMB: 50,
      aiInsights: 100,
      exports: -1, // unlimited
      forecasting: true
    },
    popular: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 49,
    priceId: import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
    interval: 'month',
    description: 'For teams and organizations (Early Access)',
    image: import.meta.env.VITE_ENTERPRISE_PLAN_IMAGE || '/images/enterprise-plan.jpg', // Plan image URL (local or external)
    features: [
      'Everything in Pro',
      'API access (Coming Soon)',
      'White-label option (Coming Soon)',
      'Dedicated support',
      'Custom integrations (Coming Soon)',
      '500MB file sizes',
      'Unlimited AI insights',
      'Custom branding (Coming Soon)'
    ],
    limits: {
      dashboards: -1, // unlimited
      uploadsPerMonth: -1, // unlimited
      fileSizeMB: 500,
      aiInsights: -1, // unlimited
      exports: -1, // unlimited
      forecasting: true
    },
    popular: false
  }
}

// Helper function to get plan by ID
export const getPlan = (planId) => {
  return PLANS[planId] || PLANS.free
}

// Helper function to check if feature is available
export const hasFeature = (subscription, feature) => {
  const plan = getPlan(subscription?.plan || 'free')
  
  switch (feature) {
    case 'forecasting':
      return plan.limits.forecasting
    case 'unlimited_dashboards':
      return plan.limits.dashboards === -1
    case 'unlimited_uploads':
      return plan.limits.uploadsPerMonth === -1
    default:
      return false
  }
}

// Helper function to check usage limits
export const checkLimit = (subscription, limitType, currentUsage) => {
  const plan = getPlan(subscription?.plan || 'free')
  const limit = plan.limits[limitType]
  
  // -1 means unlimited
  if (limit === -1) return { allowed: true, remaining: -1 }
  
  const remaining = limit - currentUsage
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: limit
  }
}

