const { createClient } = require('@supabase/supabase-js')

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
      console.warn('Invalid Supabase URL format. Usage limits will not work.')
    }
  } catch (error) {
    console.warn('Error initializing Supabase client:', error.message)
  }
}

if (!supabase) {
  console.warn('Supabase not configured. Usage limits will not be enforced.')
}

// Plan limits configuration (matches frontend pricing.js)
const PLAN_LIMITS = {
  free: {
    dashboards: 3,
    uploadsPerMonth: 5,
    fileSizeMB: 5,
    aiInsights: 5,
    exports: 10,
    forecasting: false
  },
  pro: {
    dashboards: -1, // unlimited (matches frontend)
    uploadsPerMonth: -1, // unlimited (matches frontend)
    fileSizeMB: 50, // matches frontend
    aiInsights: 100, // matches frontend
    exports: -1, // unlimited
    forecasting: true
  },
  business: {
    dashboards: -1, // unlimited
    uploadsPerMonth: 200,
    fileSizeMB: 100,
    aiInsights: 200,
    exports: -1, // unlimited
    forecasting: true
  },
  enterprise: {
    dashboards: -1, // unlimited
    uploadsPerMonth: -1, // unlimited
    fileSizeMB: 500,
    aiInsights: -1, // unlimited
    exports: -1, // unlimited
    forecasting: true
  },
  admin: {
    dashboards: -1, // unlimited
    uploadsPerMonth: -1, // unlimited
    fileSizeMB: -1, // unlimited (no limit)
    aiInsights: -1, // unlimited
    exports: -1, // unlimited
    forecasting: true
  },
  demo: {
    dashboards: -1, // unlimited
    uploadsPerMonth: -1, // unlimited
    fileSizeMB: -1, // unlimited (no limit)
    aiInsights: -1, // unlimited
    exports: -1, // unlimited
    forecasting: true
  }
}

// Admin/Demo email list (can be configured via environment variable)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS 
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : ['admin@nm2tech-sas.com', 'demo@nm2tech-sas.com'] // Default admin/demo emails

// Check if user is admin or demo
async function isAdminOrDemo(userId, userEmail) {
  if (!userId || !userEmail) return false
  
  const emailLower = userEmail.toLowerCase()
  
  // Check if email is in admin list
  if (ADMIN_EMAILS.includes(emailLower)) {
    return true
  }
  
  // Check if user has admin/demo plan in subscription
  try {
    const { data } = await supabase
      .from('shorts_subscriptions')
      .select('plan')
      .eq('user_id', userId)
      .single()
    
    if (data && (data.plan === 'admin' || data.plan === 'demo')) {
      return true
    }
  } catch (error) {
    // Ignore errors, continue with email check
  }
  
  return false
}

// Get user's subscription
async function getUserSubscription(userId, userEmail = null) {
  try {
    // Check if user is admin/demo first
    if (userEmail && await isAdminOrDemo(userId, userEmail)) {
      // Check subscription table for admin/demo plan
      const { data } = await supabase
        .from('shorts_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (data && (data.plan === 'admin' || data.plan === 'demo')) {
        return data
      }
      
      // If email is admin/demo but no subscription record, return admin plan
      return { plan: 'admin', status: 'active' }
    }
    
    const { data, error } = await supabase
      .from('shorts_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // Default to free plan if no subscription found
    return data || { plan: 'free', status: 'active' }
  } catch (error) {
    console.error('Error fetching subscription:', error)
    // Default to free plan on error
    return { plan: 'free', status: 'active' }
  }
}

// Get current usage for a specific limit type
async function getCurrentUsage(userId, limitType) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  try {
    switch (limitType) {
      case 'dashboards': {
        const { count } = await supabase
          .from('shorts_dashboards')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        return count || 0
      }

      case 'uploadsPerMonth': {
        const { count } = await supabase
          .from('shorts_file_uploads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('upload_date', startOfMonth.toISOString())
        return count || 0
      }

      case 'aiInsights': {
        const { count } = await supabase
          .from('shorts_usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('action', 'insight')
          .gte('created_at', startOfMonth.toISOString())
        return count || 0
      }

      case 'exports': {
        const { count } = await supabase
          .from('shorts_usage_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('action', 'export')
          .gte('created_at', startOfMonth.toISOString())
        return count || 0
      }

      default:
        return 0
    }
  } catch (error) {
    console.error(`Error getting usage for ${limitType}:`, error)
    return 0
  }
}

// Check if user can perform an action
async function checkLimit(userId, limitType, additionalUsage = 1, userEmail = null) {
  try {
    const subscription = await getUserSubscription(userId, userEmail)
    const plan = subscription.plan || 'free'
    
    // Admin and demo users have unlimited access
    if (plan === 'admin' || plan === 'demo') {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        plan: plan
      }
    }
    
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

    const limit = limits[limitType]

    // -1 means unlimited
    if (limit === -1) {
      return {
        allowed: true,
        remaining: -1,
        limit: -1,
        plan: plan
      }
    }

    // Check feature availability (for boolean features like forecasting)
    if (limitType === 'forecasting' && limit === false) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        plan: plan,
        message: 'Forecasting is only available in Pro plans and above'
      }
    }

    const currentUsage = await getCurrentUsage(userId, limitType)
    const newUsage = currentUsage + additionalUsage
    const remaining = limit - newUsage

    return {
      allowed: remaining >= 0,
      remaining: Math.max(0, remaining),
      limit: limit,
      currentUsage: currentUsage,
      plan: plan,
      message: remaining < 0 
        ? `You've reached your ${limitType} limit. Please upgrade to continue.`
        : null
    }
  } catch (error) {
    console.error('Error checking limit:', error)
    // On error, allow the action (fail open, but log it)
    return {
      allowed: true,
      remaining: -1,
      limit: -1,
      plan: 'free',
      error: 'Error checking limits'
    }
  }
}

// Middleware to check dashboard limit
async function checkDashboardLimit(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const limitCheck = await checkLimit(req.user.id, 'dashboards', 1, req.user.email)

  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: 'Dashboard limit reached',
      message: `You've reached your limit of ${limitCheck.limit} dashboards. Please upgrade to create more.`,
      limit: limitCheck.limit,
      current: limitCheck.currentUsage,
      plan: limitCheck.plan,
      upgradeRequired: true
    })
  }

  req.limitCheck = limitCheck
  next()
}

// Middleware to check upload limit
async function checkUploadLimit(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const subscription = await getUserSubscription(req.user.id, req.user.email)
  const plan = subscription.plan || 'free'
  
  // Admin and demo users have unlimited access - skip limit checks
  if (plan === 'admin' || plan === 'demo') {
    req.limitCheck = { allowed: true, remaining: -1, limit: -1, plan: plan }
    return next()
  }

  const fileSizeMB = req.file ? (req.file.size / (1024 * 1024)) : 0
  const planLimits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  // Check file size limit
  if (planLimits.fileSizeMB !== -1 && fileSizeMB > planLimits.fileSizeMB) {
    return res.status(403).json({
      error: 'File size limit exceeded',
      message: `File size (${fileSizeMB.toFixed(2)}MB) exceeds your plan limit of ${planLimits.fileSizeMB}MB. Please upgrade to upload larger files.`,
      fileSize: fileSizeMB,
      limit: planLimits.fileSizeMB,
      plan: plan,
      upgradeRequired: true
    })
  }

  // Check upload count limit
  const limitCheck = await checkLimit(req.user.id, 'uploadsPerMonth', 1, req.user.email)

  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: 'Upload limit reached',
      message: `You've reached your monthly upload limit of ${limitCheck.limit}. Please upgrade to upload more files.`,
      limit: limitCheck.limit,
      current: limitCheck.currentUsage,
      plan: limitCheck.plan,
      upgradeRequired: true
    })
  }

  req.limitCheck = limitCheck
  next()
}

// Middleware to check AI insights limit (returns false if limit exceeded, true if allowed)
async function checkInsightLimit(req, res, next) {
  if (!req.user || !req.user.id) {
    if (next) next() // Allow if no user
    return true
  }

  const limitCheck = await checkLimit(req.user.id, 'aiInsights', 1, req.user.email)

  if (!limitCheck.allowed) {
    if (res) {
      res.status(403).json({
        error: 'AI insights limit reached',
        message: `You've reached your monthly AI insights limit of ${limitCheck.limit}. Please upgrade for more insights.`,
        limit: limitCheck.limit,
        current: limitCheck.currentUsage,
        plan: limitCheck.plan,
        upgradeRequired: true
      })
    }
    return false
  }

  if (req) req.limitCheck = limitCheck
  if (next) next()
  return true
}

// Middleware to check export limit
async function checkExportLimit(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const limitCheck = await checkLimit(req.user.id, 'exports', 1, req.user.email)

  if (!limitCheck.allowed) {
    return res.status(403).json({
      error: 'Export limit reached',
      message: `You've reached your monthly export limit of ${limitCheck.limit}. Please upgrade for unlimited exports.`,
      limit: limitCheck.limit,
      current: limitCheck.currentUsage,
      plan: limitCheck.plan,
      upgradeRequired: true
    })
  }

  req.limitCheck = limitCheck
  next()
}

// Check if feature is available (for forecasting, etc.)
async function checkFeatureAccess(userId, feature, userEmail = null) {
  const subscription = await getUserSubscription(userId, userEmail)
  const plan = subscription.plan || 'free'
  
  // Admin and demo users have access to all features
  if (plan === 'admin' || plan === 'demo') {
    return true
  }
  
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free

  switch (feature) {
    case 'forecasting':
      return limits.forecasting === true
    default:
      return false
  }
}

module.exports = {
  checkLimit,
  checkDashboardLimit,
  checkUploadLimit,
  checkInsightLimit,
  checkExportLimit,
  checkFeatureAccess,
  getUserSubscription,
  getCurrentUsage,
  isAdminOrDemo,
  PLAN_LIMITS
}

