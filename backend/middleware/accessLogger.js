const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase = null
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    })
  } catch (error) {
    console.warn('Error initializing Supabase for access logging:', error.message)
  }
}

// Access logging middleware
const accessLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Capture response
  const originalSend = res.send
  res.send = function(data) {
    const responseTime = Date.now() - startTime
    
    // Log access asynchronously (don't block response)
    logAccess(req, res.statusCode, responseTime).catch(err => {
      console.error('Error logging access:', err)
    })
    
    return originalSend.call(this, data)
  }
  
  next()
}

async function logAccess(req, statusCode, responseTime) {
  if (!supabase) return
  
  try {
    // Extract IP address (handles proxies)
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.headers['x-real-ip'] 
      || req.connection?.remoteAddress 
      || req.socket?.remoteAddress
      || 'unknown'
    
    const userAgent = req.headers['user-agent'] || ''
    const path = req.path || req.url
    const method = req.method
    const userId = req.user?.id || null
    const userEmail = req.user?.email || null
    
    // Don't log health checks, static assets, or webhooks
    if (path === '/health' || 
        path === '/api/subscription/webhook' ||
        path.startsWith('/static/') ||
        path.startsWith('/_next/')) {
      return
    }
    
    // Only log API routes
    if (!path.startsWith('/api/')) {
      return
    }
    
    await supabase
      .from('shorts_access_logs')
      .insert({
        user_id: userId,
        user_email: userEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        path: path,
        method: method,
        status_code: statusCode,
        response_time_ms: responseTime
      })
  } catch (error) {
    // Don't throw - logging errors shouldn't break the app
    console.error('Error logging access:', error.message)
  }
}

module.exports = accessLogger

