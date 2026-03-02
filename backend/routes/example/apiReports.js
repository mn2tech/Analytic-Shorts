/**
 * API reports listing and visibility control.
 * Routes: GET /api-reports, PUT /api-reports/:reportId/visibility
 * Also provides visibility middleware for hideable endpoints.
 */
const express = require('express')
const { createClient } = require('@supabase/supabase-js')
const { API_REPORTS, HIDEABLE_ENDPOINTS, API_REPORT_VISIBILITY_TABLE } = require('./constants')

const router = express.Router()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
  : null

const inMemoryHiddenReportIds = new Set()

function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || 'admin@nm2tech-sas.com,demo@nm2tech-sas.com'
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
}

function isAdminUser(user) {
  const email = user?.email?.trim().toLowerCase()
  return email ? getAdminEmails().includes(email) : false
}

async function getUserFromAuthorizationHeader(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ') || !supabase) return null
  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return null
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    return error || !user ? null : user
  } catch {
    return null
  }
}

async function getHiddenReportIds() {
  try {
    if (!supabase) return new Set(inMemoryHiddenReportIds)
    const { data, error } = await supabase
      .from(API_REPORT_VISIBILITY_TABLE)
      .select('report_id, is_hidden')
      .eq('is_hidden', true)
    if (error) {
      const isMissingTable = error.code === 'PGRST205' || /does not exist/i.test(String(error.message || ''))
      if (!isMissingTable) console.error('Failed to fetch API report visibility. Falling back to in-memory:', error.message)
      return new Set(inMemoryHiddenReportIds)
    }
    return new Set((data || []).map((row) => row.report_id).filter(Boolean))
  } catch (error) {
    console.error('Failed to fetch API report visibility (exception). Falling back to in-memory:', error.message)
    return new Set(inMemoryHiddenReportIds)
  }
}

async function setReportVisibility(reportId, isHidden, updatedByEmail) {
  if (isHidden) inMemoryHiddenReportIds.add(reportId)
  else inMemoryHiddenReportIds.delete(reportId)
  if (!supabase) return
  try {
    const { error } = await supabase
      .from(API_REPORT_VISIBILITY_TABLE)
      .upsert(
        { report_id: reportId, is_hidden: !!isHidden, updated_by: updatedByEmail || null, updated_at: new Date().toISOString() },
        { onConflict: 'report_id' }
      )
    if (error) {
      const isMissingTable = error.code === 'PGRST205' || /does not exist/i.test(String(error.message || ''))
      if (!isMissingTable) console.error(`Failed to persist visibility for "${reportId}". Continuing with in-memory:`, error.message)
    }
  } catch (error) {
    console.error(`Failed to persist visibility for "${reportId}" (exception). Continuing with in-memory:`, error.message)
  }
}

function getOptionalUserFromToken(req, _res, next) {
  getUserFromAuthorizationHeader(req).then((user) => { req.user = user; next() }).catch(() => { req.user = null; next() })
}

function requireAdmin(req, res, next) {
  getUserFromAuthorizationHeader(req)
    .then((user) => {
      req.user = user
      if (!isAdminUser(user)) return res.status(403).json({ error: 'Admin access required' })
      next()
    })
    .catch(() => res.status(401).json({ error: 'Authentication failed' }))
}

router.get('/api-reports', getOptionalUserFromToken, async (req, res) => {
  try {
    const hiddenReportIds = await getHiddenReportIds()
    const admin = isAdminUser(req.user)
    const reports = API_REPORTS
      .map((r) => ({ ...r, isHidden: hiddenReportIds.has(r.id) }))
      .filter((r) => admin || !r.isHidden)
    return res.json({ reports, isAdmin: admin })
  } catch (error) {
    console.error('Failed to load API reports:', error)
    return res.status(500).json({ error: 'Failed to load API reports' })
  }
})

router.put('/api-reports/:reportId/visibility', requireAdmin, async (req, res) => {
  try {
    const reportId = String(req.params.reportId || '').trim().toLowerCase()
    const hide = !!req.body?.hidden
    if (!API_REPORTS.some((r) => r.id === reportId)) return res.status(404).json({ error: 'API report not found' })
    await setReportVisibility(reportId, hide, req.user?.email || null)
    return res.json({ success: true, reportId, hidden: hide })
  } catch (error) {
    console.error('Failed to update API report visibility:', error)
    return res.status(500).json({ error: 'Failed to update API report visibility' })
  }
})

/** Middleware: block non-admin access to hidden report endpoints. */
async function visibilityGuard(req, res, next) {
  try {
    const reportId = HIDEABLE_ENDPOINTS[req.path]
    if (!reportId) return next()
    const hiddenReportIds = await getHiddenReportIds()
    if (!hiddenReportIds.has(reportId)) return next()
    const user = await getUserFromAuthorizationHeader(req)
    if (isAdminUser(user)) return next()
    return res.status(403).json({ error: 'This API report is hidden by admin', reportId })
  } catch (error) {
    console.error('Visibility guard failed, allowing request:', error)
    next()
  }
}

module.exports = { router, visibilityGuard }
