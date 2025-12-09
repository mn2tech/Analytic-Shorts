# 📊 Visitor Monitoring Setup Guide

## Overview
This guide helps you monitor who is accessing your Analytics Shorts website through multiple methods:

1. **Google Analytics** - Frontend visitor tracking
2. **Backend Access Logging** - API request tracking
3. **User Activity Tracking** - Logged-in user actions
4. **Admin Dashboard** - View visitor statistics

---

## Option 1: Google Analytics (Recommended for Frontend)

### Step 1: Get Google Analytics ID

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create an account or sign in
3. Create a new property for your website
4. Get your **Measurement ID** (format: `G-XXXXXXXXXX`)

### Step 2: Add to Frontend

Add the Google Analytics script to `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Step 3: Track Page Views

Add page view tracking in `src/App.jsx`:

```javascript
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function App() {
  const location = useLocation()

  useEffect(() => {
    if (window.gtag) {
      window.gtag('config', 'G-XXXXXXXXXX', {
        page_path: location.pathname
      })
    }
  }, [location])

  // ... rest of your App component
}
```

### Step 4: Track Custom Events

Track important actions like file uploads:

```javascript
// Track file upload
if (window.gtag) {
  window.gtag('event', 'file_upload', {
    event_category: 'engagement',
    event_label: 'CSV Upload'
  })
}
```

---

## Option 2: Backend Access Logging

### Step 1: Create Access Logs Table in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Create access_logs table
CREATE TABLE IF NOT EXISTS shorts_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  path TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON shorts_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON shorts_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_path ON shorts_access_logs(path);

-- Enable RLS (Row Level Security)
ALTER TABLE shorts_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own logs
CREATE POLICY "Users can view own logs" ON shorts_access_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Service role can insert logs
CREATE POLICY "Service role can insert logs" ON shorts_access_logs
  FOR INSERT WITH CHECK (true);
```

### Step 2: Create Access Logging Middleware

Create `backend/middleware/accessLogger.js`:

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let supabase = null
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey)
}

// Access logging middleware
const accessLogger = async (req, res, next) => {
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

async function logAccess(req, res, statusCode, responseTime) {
  if (!supabase) return
  
  try {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    const userAgent = req.headers['user-agent'] || ''
    const path = req.path
    const method = req.method
    const userId = req.user?.id || null
    const userEmail = req.user?.email || null
    
    // Don't log health checks or static assets
    if (path === '/health' || path.startsWith('/static/')) {
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
    console.error('Error logging access:', error)
  }
}

module.exports = accessLogger
```

### Step 3: Add to Backend Server

Add to `backend/server.js`:

```javascript
const accessLogger = require('./middleware/accessLogger')

// Add before routes
app.use(accessLogger)
```

---

## Option 3: User Activity Tracking

### Track Key Actions

Add tracking for important user actions:

```javascript
// In backend routes, after successful actions:
async function trackUserAction(userId, action, details = {}) {
  if (!supabase) return
  
  try {
    await supabase
      .from('shorts_usage_logs')
      .insert({
        user_id: userId,
        action: action,
        details: details,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error tracking user action:', error)
  }
}

// Example usage in upload route:
trackUserAction(req.user?.id, 'file_upload', {
  file_size: req.file?.size,
  file_type: req.file?.mimetype,
  rows_processed: data.length
})
```

---

## Option 4: Admin Dashboard (View Visitors)

### Create Admin Analytics Route

Create `backend/routes/analytics.js`:

```javascript
const express = require('express')
const router = express.Router()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

// Admin middleware - check if user is admin
const isAdmin = async (req, res, next) => {
  const ADMIN_EMAILS = process.env.ADMIN_EMAILS 
    ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
    : []
  
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email?.toLowerCase())) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  
  next()
}

// Get visitor statistics
router.get('/visitors', isAdmin, async (req, res) => {
  try {
    const { days = 7 } = req.query
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(days))
    
    // Get access logs
    const { data: logs, error } = await supabase
      .from('shorts_access_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000)
    
    if (error) throw error
    
    // Aggregate statistics
    const stats = {
      total_visits: logs.length,
      unique_visitors: new Set(logs.map(l => l.user_id || l.ip_address)).size,
      unique_logged_in: new Set(logs.filter(l => l.user_id).map(l => l.user_id)).size,
      top_paths: getTopPaths(logs),
      top_users: getTopUsers(logs),
      visits_by_day: getVisitsByDay(logs),
      average_response_time: logs.reduce((sum, l) => sum + (l.response_time_ms || 0), 0) / logs.length
    }
    
    res.json(stats)
  } catch (error) {
    console.error('Error fetching visitor stats:', error)
    res.status(500).json({ error: 'Failed to fetch visitor statistics' })
  }
})

function getTopPaths(logs) {
  const pathCounts = {}
  logs.forEach(log => {
    pathCounts[log.path] = (pathCounts[log.path] || 0) + 1
  })
  return Object.entries(pathCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, count]) => ({ path, count }))
}

function getTopUsers(logs) {
  const userCounts = {}
  logs.filter(l => l.user_email).forEach(log => {
    userCounts[log.user_email] = (userCounts[log.user_email] || 0) + 1
  })
  return Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([email, count]) => ({ email, count }))
}

function getVisitsByDay(logs) {
  const dayCounts = {}
  logs.forEach(log => {
    const day = new Date(log.created_at).toISOString().split('T')[0]
    dayCounts[day] = (dayCounts[day] || 0) + 1
  })
  return Object.entries(dayCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ day, count }))
}

module.exports = router
```

### Add Route to Server

In `backend/server.js`:

```javascript
const analyticsRoutes = require('./routes/analytics')
app.use('/api/analytics', analyticsRoutes)
```

---

## Quick Setup Checklist

- [ ] Set up Google Analytics account
- [ ] Add Google Analytics script to `index.html`
- [ ] Create `shorts_access_logs` table in Supabase
- [ ] Create `backend/middleware/accessLogger.js`
- [ ] Add access logger to `backend/server.js`
- [ ] Create `backend/routes/analytics.js`
- [ ] Add analytics route to server
- [ ] Set `ADMIN_EMAILS` in backend `.env`
- [ ] Test admin analytics endpoint

---

## What You'll Be Able to Track

### Google Analytics:
- Page views
- User sessions
- Traffic sources
- Device types
- Geographic location
- Custom events (uploads, exports, etc.)

### Backend Logs:
- API requests
- User actions (logged-in users)
- Response times
- Error rates
- Popular endpoints

### Admin Dashboard:
- Total visitors
- Unique visitors
- Most active users
- Popular pages/endpoints
- Daily visit trends

---

## Privacy Considerations

1. **GDPR Compliance**: Add cookie consent banner
2. **IP Anonymization**: Consider hashing IP addresses
3. **Data Retention**: Set up automatic cleanup of old logs
4. **Privacy Policy**: Update to mention tracking

---

## Next Steps

1. Start with Google Analytics (easiest)
2. Add backend logging for API monitoring
3. Build admin dashboard to view statistics
4. Set up alerts for unusual activity

