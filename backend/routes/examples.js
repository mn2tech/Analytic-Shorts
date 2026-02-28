const express = require('express')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const Papa = require('papaparse')
const { createClient } = require('@supabase/supabase-js')
const { detectColumnTypes, processData } = require('../controllers/dataProcessor')
const OpenAI = require('openai')

const router = express.Router()
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null

let SAS7BDAT
try {
  SAS7BDAT = require('sas7bdat')
} catch (_) {
  SAS7BDAT = null
}

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    })
  : null

const API_REPORT_VISIBILITY_TABLE = 'shorts_api_report_visibility'

const API_REPORTS = [
  {
    id: 'usaspending-live',
    name: 'USA Spending (Live)',
    description: 'Real-time federal government awards, contracts, and grants from USASpending.gov API',
    endpoint: '/api/example/usaspending/live'
  },
  {
    id: 'unemployment-bls',
    name: 'Unemployment Rate (BLS)',
    description: 'U.S. unemployment rate data from Bureau of Labor Statistics API',
    endpoint: '/api/example/unemployment'
  },
  {
    id: 'cdc-health',
    name: 'CDC Health Data',
    description: 'Health metrics: Death Rate, Birth Rate, and Life Expectancy from CDC (filter by Metric column)',
    endpoint: '/api/example/cdc-health?metric=all'
  },
  {
    id: 'government-budget',
    name: 'Government Budget',
    description: 'Federal budget data by category from U.S. Treasury Fiscal Data API (filter by Budget Category)',
    endpoint: '/api/example/government-budget?category=all'
  },
  {
    id: 'samgov-live',
    name: 'SAM.gov Opportunities (Live)',
    description: 'Real-time federal contract opportunities from SAM.gov (posted within the last 30 days by default)',
    endpoint: '/api/example/samgov/live?ptype=o&limit=200'
  },
  {
    id: 'samgov-agency-report',
    name: 'SAM.gov Agency Opportunities Report',
    description: 'Agency-level rollup of SAM.gov opportunities (count, total/avg award amount, set-asides)',
    endpoint: '/api/example/samgov/agency-report?ptype=o&limit=500'
  },
  {
    id: 'samgov-databank',
    name: 'SAM.gov Entity Data Bank (Live)',
    description: 'Live SAM.gov entity registration records (UEI, status, NAICS, location)',
    endpoint: '/api/example/samgov/databank?size=10'
  },
  {
    id: 'maritime-ais',
    name: 'Maritime AIS Demo',
    description: 'Mock AIS vessel data: timestamp, MMSI, lat/lon, speed (sog), course (cog), vessel type. Use for traffic, top vessels, loitering (sog < 1).',
    endpoint: '/api/datasets/maritime-ais'
  },
]

const HIDEABLE_ENDPOINTS = {
  '/usaspending/live': 'usaspending-live',
  '/unemployment': 'unemployment-bls',
  '/cdc-health': 'cdc-health',
  '/government-budget': 'government-budget',
  '/samgov/live': 'samgov-live',
  '/samgov/agency-report': 'samgov-agency-report',
  '/samgov/databank': 'samgov-databank',
}

const inMemoryHiddenReportIds = new Set()

function getAdminEmails() {
  return process.env.ADMIN_EMAILS
    ? process.env.ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : ['admin@nm2tech-sas.com', 'demo@nm2tech-sas.com']
}

function isAdminUser(user) {
  const email = user?.email?.toLowerCase()
  if (!email) return false
  return getAdminEmails().includes(email)
}

async function getUserFromAuthorizationHeader(req) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ') || !supabase) {
    return null
  }

  const token = authHeader.slice('Bearer '.length).trim()
  if (!token) return null

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

async function getHiddenReportIds() {
  try {
    if (!supabase) {
      return new Set(inMemoryHiddenReportIds)
    }

    const { data, error } = await supabase
      .from(API_REPORT_VISIBILITY_TABLE)
      .select('report_id, is_hidden')
      .eq('is_hidden', true)

    if (error) {
      const isMissingTable = error.code === 'PGRST205' || /does not exist/i.test(String(error.message || ''))
      if (!isMissingTable) {
        console.error('Failed to fetch API report visibility. Falling back to in-memory settings:', error.message)
      }
      return new Set(inMemoryHiddenReportIds)
    }

    return new Set((data || []).map((row) => row.report_id).filter(Boolean))
  } catch (error) {
    console.error('Failed to fetch API report visibility (exception). Falling back to in-memory settings:', error.message)
    return new Set(inMemoryHiddenReportIds)
  }
}

async function setReportVisibility(reportId, isHidden, updatedByEmail) {
  if (isHidden) {
    inMemoryHiddenReportIds.add(reportId)
  } else {
    inMemoryHiddenReportIds.delete(reportId)
  }

  if (!supabase) return

  try {
    const { error } = await supabase
      .from(API_REPORT_VISIBILITY_TABLE)
      .upsert(
        {
          report_id: reportId,
          is_hidden: !!isHidden,
          updated_by: updatedByEmail || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'report_id' }
      )

    if (error) {
      const isMissingTable = error.code === 'PGRST205' || /does not exist/i.test(String(error.message || ''))
      if (!isMissingTable) {
        console.error(`Failed to persist visibility for "${reportId}". Continuing with in-memory settings:`, error.message)
      }
    }
  } catch (error) {
    console.error(`Failed to persist visibility for "${reportId}" (exception). Continuing with in-memory settings:`, error.message)
  }
}

function getOptionalUserFromToken(req, _res, next) {
  getUserFromAuthorizationHeader(req)
    .then((user) => {
      req.user = user
      next()
    })
    .catch(() => {
      req.user = null
      next()
    })
}

function requireAdmin(req, res, next) {
  getUserFromAuthorizationHeader(req)
    .then((user) => {
      req.user = user
      if (!isAdminUser(user)) {
        return res.status(403).json({ error: 'Admin access required' })
      }
      return next()
    })
    .catch(() => res.status(401).json({ error: 'Authentication failed' }))
}

router.get('/api-reports', getOptionalUserFromToken, async (req, res) => {
  try {
    const hiddenReportIds = await getHiddenReportIds()
    const admin = isAdminUser(req.user)

    const reports = API_REPORTS
      .map((report) => {
        const isHidden = hiddenReportIds.has(report.id)
        return { ...report, isHidden }
      })
      .filter((report) => admin || !report.isHidden)

    return res.json({
      reports,
      isAdmin: admin
    })
  } catch (error) {
    console.error('Failed to load API reports:', error)
    return res.status(500).json({ error: 'Failed to load API reports' })
  }
})

router.put('/api-reports/:reportId/visibility', requireAdmin, async (req, res) => {
  try {
    const reportId = String(req.params.reportId || '').trim().toLowerCase()
    const hide = !!req.body?.hidden
    const reportExists = API_REPORTS.some((r) => r.id === reportId)

    if (!reportExists) {
      return res.status(404).json({ error: 'API report not found' })
    }

    await setReportVisibility(reportId, hide, req.user?.email || null)

    return res.json({
      success: true,
      reportId,
      hidden: hide
    })
  } catch (error) {
    console.error('Failed to update API report visibility:', error)
    return res.status(500).json({ error: 'Failed to update API report visibility' })
  }
})

router.use(async (req, res, next) => {
  try {
    const reportId = HIDEABLE_ENDPOINTS[req.path]
    if (!reportId) return next()

    const hiddenReportIds = await getHiddenReportIds()
    if (!hiddenReportIds.has(reportId)) return next()

    const user = await getUserFromAuthorizationHeader(req)
    if (isAdminUser(user)) return next()

    return res.status(403).json({
      error: 'This API report is hidden by admin',
      reportId
    })
  } catch (error) {
    console.error('Visibility guard failed, allowing request:', error)
    return next()
  }
})

// Helper function to process data while preserving numeric values
function processDataPreservingNumbers(data, numericColumns) {
  return data.map((row) => {
    const processed = {}
    Object.keys(row).forEach((key) => {
      const value = row[key]
      // Preserve numeric values for numeric columns
      if (numericColumns.includes(key) && typeof value === 'number') {
        processed[key] = value
      } else if (value === null || value === undefined) {
        processed[key] = ''
      } else {
        processed[key] = String(value).trim()
      }
    })
    return processed
  })
}

// Example datasets
const exampleDatasets = {
  sales: {
    data: [
      { Date: '2024-01-01', Product: 'Laptop', Category: 'Electronics', Sales: 12500, Region: 'North', Units: 25 },
      { Date: '2024-01-02', Product: 'Mouse', Category: 'Electronics', Sales: 1500, Region: 'North', Units: 150 },
      { Date: '2024-01-03', Product: 'Desk', Category: 'Furniture', Sales: 4500, Region: 'South', Units: 15 },
      { Date: '2024-01-04', Product: 'Chair', Category: 'Furniture', Sales: 3200, Region: 'South', Units: 20 },
      { Date: '2024-01-05', Product: 'Monitor', Category: 'Electronics', Sales: 8500, Region: 'East', Units: 17 },
      { Date: '2024-01-06', Product: 'Keyboard', Category: 'Electronics', Sales: 2400, Region: 'West', Units: 80 },
      { Date: '2024-01-07', Product: 'Table', Category: 'Furniture', Sales: 5600, Region: 'North', Units: 14 },
      { Date: '2024-01-08', Product: 'Laptop', Category: 'Electronics', Sales: 13200, Region: 'East', Units: 26 },
      { Date: '2024-01-09', Product: 'Mouse', Category: 'Electronics', Sales: 1800, Region: 'West', Units: 180 },
      { Date: '2024-01-10', Product: 'Desk', Category: 'Furniture', Sales: 4800, Region: 'North', Units: 16 },
      { Date: '2024-01-11', Product: 'Chair', Category: 'Furniture', Sales: 3400, Region: 'South', Units: 21 },
      { Date: '2024-01-12', Product: 'Monitor', Category: 'Electronics', Sales: 9200, Region: 'East', Units: 18 },
      { Date: '2024-01-13', Product: 'Keyboard', Category: 'Electronics', Sales: 2600, Region: 'West', Units: 85 },
      { Date: '2024-01-14', Product: 'Table', Category: 'Furniture', Sales: 5800, Region: 'South', Units: 15 },
      { Date: '2024-01-15', Product: 'Laptop', Category: 'Electronics', Sales: 14000, Region: 'North', Units: 28 },
      { Date: '2024-01-16', Product: 'Mouse', Category: 'Electronics', Sales: 1600, Region: 'East', Units: 160 },
      { Date: '2024-01-17', Product: 'Desk', Category: 'Furniture', Sales: 5000, Region: 'West', Units: 17 },
      { Date: '2024-01-18', Product: 'Chair', Category: 'Furniture', Sales: 3600, Region: 'North', Units: 22 },
      { Date: '2024-01-19', Product: 'Monitor', Category: 'Electronics', Sales: 9800, Region: 'South', Units: 19 },
      { Date: '2024-01-20', Product: 'Keyboard', Category: 'Electronics', Sales: 2800, Region: 'East', Units: 90 },
    ],
  },
  attendance: {
    data: [
      { Date: '2024-01-01', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-01', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-01', Employee: 'Bob Johnson', Department: 'Sales', Hours: 7.5, Status: 'Present' },
      { Date: '2024-01-02', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-02', Employee: 'Jane Smith', Department: 'Marketing', Hours: 0, Status: 'Absent' },
      { Date: '2024-01-02', Employee: 'Bob Johnson', Department: 'Sales', Hours: 8, Status: 'Present' },
      { Date: '2024-01-03', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-03', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-03', Employee: 'Bob Johnson', Department: 'Sales', Hours: 6, Status: 'Late' },
      { Date: '2024-01-04', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-04', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-04', Employee: 'Bob Johnson', Department: 'Sales', Hours: 8, Status: 'Present' },
      { Date: '2024-01-05', Employee: 'John Doe', Department: 'Engineering', Hours: 4, Status: 'Half Day' },
      { Date: '2024-01-05', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-05', Employee: 'Bob Johnson', Department: 'Sales', Hours: 8, Status: 'Present' },
      { Date: '2024-01-08', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-08', Employee: 'Jane Smith', Department: 'Marketing', Hours: 8, Status: 'Present' },
      { Date: '2024-01-08', Employee: 'Bob Johnson', Department: 'Sales', Hours: 7, Status: 'Present' },
      { Date: '2024-01-09', Employee: 'John Doe', Department: 'Engineering', Hours: 8, Status: 'Present' },
      { Date: '2024-01-09', Employee: 'Jane Smith', Department: 'Marketing', Hours: 0, Status: 'Absent' },
      { Date: '2024-01-09', Employee: 'Bob Johnson', Department: 'Sales', Hours: 8, Status: 'Present' },
    ],
  },
  donations: {
    data: [
      { Date: '2024-01-01', Donor: 'Alice Brown', Category: 'Education', Amount: 500, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-02', Donor: 'Charlie Davis', Category: 'Healthcare', Amount: 1000, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-03', Donor: 'Eve Wilson', Category: 'Environment', Amount: 250, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-04', Donor: 'Frank Miller', Category: 'Education', Amount: 750, PaymentMethod: 'PayPal' },
      { Date: '2024-01-05', Donor: 'Grace Lee', Category: 'Healthcare', Amount: 2000, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-06', Donor: 'Henry Taylor', Category: 'Environment', Amount: 300, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-07', Donor: 'Ivy Chen', Category: 'Education', Amount: 600, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-08', Donor: 'Jack Anderson', Category: 'Healthcare', Amount: 1500, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-09', Donor: 'Karen White', Category: 'Environment', Amount: 400, PaymentMethod: 'PayPal' },
      { Date: '2024-01-10', Donor: 'Liam Garcia', Category: 'Education', Amount: 850, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-11', Donor: 'Mia Martinez', Category: 'Healthcare', Amount: 1200, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-12', Donor: 'Noah Rodriguez', Category: 'Environment', Amount: 350, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-13', Donor: 'Olivia Lopez', Category: 'Education', Amount: 550, PaymentMethod: 'PayPal' },
      { Date: '2024-01-14', Donor: 'Paul Harris', Category: 'Healthcare', Amount: 1800, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-15', Donor: 'Quinn Clark', Category: 'Environment', Amount: 450, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-16', Donor: 'Rachel Lewis', Category: 'Education', Amount: 700, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-17', Donor: 'Sam Walker', Category: 'Healthcare', Amount: 2200, PaymentMethod: 'Bank Transfer' },
      { Date: '2024-01-18', Donor: 'Tina Hall', Category: 'Environment', Amount: 280, PaymentMethod: 'PayPal' },
      { Date: '2024-01-19', Donor: 'Uma Young', Category: 'Education', Amount: 650, PaymentMethod: 'Credit Card' },
      { Date: '2024-01-20', Donor: 'Victor King', Category: 'Healthcare', Amount: 1600, PaymentMethod: 'Bank Transfer' },
    ],
  },
  medical: {
    data: [
      { Date: '2024-01-02', 'Patient ID': 'P001', Department: 'Cardiology', Diagnosis: 'Hypertension', Age: 45, 'Blood Pressure (mmHg)': '145/95', 'Heart Rate (bpm)': 78, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 350, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-03', 'Patient ID': 'P002', Department: 'Orthopedics', Diagnosis: 'Fracture', Age: 32, 'Blood Pressure (mmHg)': '120/80', 'Heart Rate (bpm)': 72, 'Temperature (°F)': 99.2, 'Treatment Cost ($)': 1200, Medication: 'Pain Reliever', 'Visit Duration (min)': 45, Status: 'Completed' },
      { Date: '2024-01-04', 'Patient ID': 'P003', Department: 'Pediatrics', Diagnosis: 'Common Cold', Age: 8, 'Blood Pressure (mmHg)': '110/70', 'Heart Rate (bpm)': 85, 'Temperature (°F)': 100.4, 'Treatment Cost ($)': 150, Medication: 'Antibiotic', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-01-05', 'Patient ID': 'P001', Department: 'Cardiology', Diagnosis: 'Follow-up', Age: 45, 'Blood Pressure (mmHg)': '140/90', 'Heart Rate (bpm)': 75, 'Temperature (°F)': 98.4, 'Treatment Cost ($)': 200, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-06', 'Patient ID': 'P004', Department: 'Neurology', Diagnosis: 'Migraine', Age: 28, 'Blood Pressure (mmHg)': '115/75', 'Heart Rate (bpm)': 68, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 450, Medication: 'Preventive Medication', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-01-07', 'Patient ID': 'P005', Department: 'Emergency', Diagnosis: 'Appendicitis', Age: 35, 'Blood Pressure (mmHg)': '130/85', 'Heart Rate (bpm)': 92, 'Temperature (°F)': 101.2, 'Treatment Cost ($)': 8500, Medication: 'Surgery', 'Visit Duration (min)': 180, Status: 'Emergency' },
      { Date: '2024-01-08', 'Patient ID': 'P006', Department: 'Dermatology', Diagnosis: 'Eczema', Age: 22, 'Blood Pressure (mmHg)': '118/78', 'Heart Rate (bpm)': 70, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 280, Medication: 'Topical Cream', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-09', 'Patient ID': 'P002', Department: 'Orthopedics', Diagnosis: 'Follow-up', Age: 32, 'Blood Pressure (mmHg)': '120/80', 'Heart Rate (bpm)': 74, 'Temperature (°F)': 98.9, 'Treatment Cost ($)': 300, Medication: 'Physical Therapy', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-01-10', 'Patient ID': 'P007', Department: 'Cardiology', Diagnosis: 'Arrhythmia', Age: 58, 'Blood Pressure (mmHg)': '150/100', 'Heart Rate (bpm)': 95, 'Temperature (°F)': 99.1, 'Treatment Cost ($)': 1200, Medication: 'Blood Thinner', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-01-11', 'Patient ID': 'P008', Department: 'Pediatrics', Diagnosis: 'Vaccination', Age: 5, 'Blood Pressure (mmHg)': '105/65', 'Heart Rate (bpm)': 90, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 120, Medication: 'Vaccine', 'Visit Duration (min)': 10, Status: 'Completed' },
      { Date: '2024-01-12', 'Patient ID': 'P009', Department: 'Orthopedics', Diagnosis: 'Back Pain', Age: 42, 'Blood Pressure (mmHg)': '125/82', 'Heart Rate (bpm)': 76, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 550, Medication: 'Muscle Relaxant', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-01-13', 'Patient ID': 'P010', Department: 'Cardiology', Diagnosis: 'Hypertension', Age: 51, 'Blood Pressure (mmHg)': '148/98', 'Heart Rate (bpm)': 80, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 380, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-14', 'Patient ID': 'P003', Department: 'Pediatrics', Diagnosis: 'Follow-up', Age: 8, 'Blood Pressure (mmHg)': '112/72', 'Heart Rate (bpm)': 82, 'Temperature (°F)': 98.9, 'Treatment Cost ($)': 100, Medication: 'Antibiotic', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-01-15', 'Patient ID': 'P011', Department: 'Neurology', Diagnosis: 'Epilepsy', Age: 19, 'Blood Pressure (mmHg)': '116/76', 'Heart Rate (bpm)': 72, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 650, Medication: 'Anticonvulsant', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-01-16', 'Patient ID': 'P012', Department: 'Dermatology', Diagnosis: 'Psoriasis', Age: 38, 'Blood Pressure (mmHg)': '122/80', 'Heart Rate (bpm)': 75, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 420, Medication: 'Topical Treatment', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-17', 'Patient ID': 'P013', Department: 'Emergency', Diagnosis: 'Heart Attack', Age: 62, 'Blood Pressure (mmHg)': '160/110', 'Heart Rate (bpm)': 105, 'Temperature (°F)': 100.8, 'Treatment Cost ($)': 25000, Medication: 'Emergency Care', 'Visit Duration (min)': 240, Status: 'Emergency' },
      { Date: '2024-01-18', 'Patient ID': 'P014', Department: 'Cardiology', Diagnosis: 'Angina', Age: 55, 'Blood Pressure (mmHg)': '142/92', 'Heart Rate (bpm)': 88, 'Temperature (°F)': 99.0, 'Treatment Cost ($)': 800, Medication: 'Nitroglycerin', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-01-19', 'Patient ID': 'P015', Department: 'Orthopedics', Diagnosis: 'Sprain', Age: 29, 'Blood Pressure (mmHg)': '118/78', 'Heart Rate (bpm)': 73, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 320, Medication: 'Ice Pack', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-20', 'Patient ID': 'P016', Department: 'Pediatrics', Diagnosis: 'Asthma', Age: 12, 'Blood Pressure (mmHg)': '108/68', 'Heart Rate (bpm)': 95, 'Temperature (°F)': 99.5, 'Treatment Cost ($)': 280, Medication: 'Inhaler', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-21', 'Patient ID': 'P017', Department: 'Neurology', Diagnosis: 'Stroke', Age: 68, 'Blood Pressure (mmHg)': '170/105', 'Heart Rate (bpm)': 98, 'Temperature (°F)': 100.2, 'Treatment Cost ($)': 18000, Medication: 'Emergency Care', 'Visit Duration (min)': 300, Status: 'Emergency' },
      { Date: '2024-01-22', 'Patient ID': 'P018', Department: 'Dermatology', Diagnosis: 'Acne', Age: 16, 'Blood Pressure (mmHg)': '112/70', 'Heart Rate (bpm)': 78, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 180, Medication: 'Topical Treatment', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-01-23', 'Patient ID': 'P019', Department: 'Cardiology', Diagnosis: 'Hypertension', Age: 48, 'Blood Pressure (mmHg)': '144/94', 'Heart Rate (bpm)': 77, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 360, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-01-24', 'Patient ID': 'P020', Department: 'Orthopedics', Diagnosis: 'Arthritis', Age: 65, 'Blood Pressure (mmHg)': '128/84', 'Heart Rate (bpm)': 79, 'Temperature (°F)': 99.1, 'Treatment Cost ($)': 680, Medication: 'Anti-inflammatory', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-01-25', 'Patient ID': 'P021', Department: 'Pediatrics', Diagnosis: 'Bronchitis', Age: 10, 'Blood Pressure (mmHg)': '106/66', 'Heart Rate (bpm)': 88, 'Temperature (°F)': 100.1, 'Treatment Cost ($)': 240, Medication: 'Antibiotic', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-26', 'Patient ID': 'P022', Department: 'Neurology', Diagnosis: 'Headache', Age: 31, 'Blood Pressure (mmHg)': '114/74', 'Heart Rate (bpm)': 71, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 220, Medication: 'Analgesic', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-27', 'Patient ID': 'P023', Department: 'Dermatology', Diagnosis: 'Allergy', Age: 24, 'Blood Pressure (mmHg)': '120/78', 'Heart Rate (bpm)': 76, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 200, Medication: 'Antihistamine', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-01-28', 'Patient ID': 'P024', Department: 'Cardiology', Diagnosis: 'Follow-up', Age: 55, 'Blood Pressure (mmHg)': '138/88', 'Heart Rate (bpm)': 82, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 250, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-01-29', 'Patient ID': 'P025', Department: 'Emergency', Diagnosis: 'Accident', Age: 41, 'Blood Pressure (mmHg)': '135/88', 'Heart Rate (bpm)': 89, 'Temperature (°F)': 99.8, 'Treatment Cost ($)': 5200, Medication: 'Emergency Care', 'Visit Duration (min)': 120, Status: 'Emergency' },
      { Date: '2024-01-30', 'Patient ID': 'P026', Department: 'Orthopedics', Diagnosis: 'Knee Injury', Age: 36, 'Blood Pressure (mmHg)': '122/80', 'Heart Rate (bpm)': 75, 'Temperature (°F)': 98.9, 'Treatment Cost ($)': 450, Medication: 'Physical Therapy', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-01-31', 'Patient ID': 'P027', Department: 'Pediatrics', Diagnosis: 'Fever', Age: 7, 'Blood Pressure (mmHg)': '104/64', 'Heart Rate (bpm)': 92, 'Temperature (°F)': 101.5, 'Treatment Cost ($)': 160, Medication: 'Antipyretic', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-02-01', 'Patient ID': 'P028', Department: 'Neurology', Diagnosis: 'Multiple Sclerosis', Age: 44, 'Blood Pressure (mmHg)': '124/82', 'Heart Rate (bpm)': 74, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 1500, Medication: 'Immunosuppressant', 'Visit Duration (min)': 45, Status: 'Completed' },
      { Date: '2024-02-02', 'Patient ID': 'P029', Department: 'Dermatology', Diagnosis: 'Sunburn', Age: 18, 'Blood Pressure (mmHg)': '116/74', 'Heart Rate (bpm)': 80, 'Temperature (°F)': 99.2, 'Treatment Cost ($)': 120, Medication: 'Aloe Vera', 'Visit Duration (min)': 10, Status: 'Completed' },
      { Date: '2024-02-03', 'Patient ID': 'P030', Department: 'Cardiology', Diagnosis: 'Heart Failure', Age: 71, 'Blood Pressure (mmHg)': '155/100', 'Heart Rate (bpm)': 102, 'Temperature (°F)': 99.5, 'Treatment Cost ($)': 3500, Medication: 'Diuretic', 'Visit Duration (min)': 50, Status: 'Completed' },
      { Date: '2024-02-04', 'Patient ID': 'P031', Department: 'Orthopedics', Diagnosis: 'Follow-up', Age: 29, 'Blood Pressure (mmHg)': '118/78', 'Heart Rate (bpm)': 74, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 280, Medication: 'Physical Therapy', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-02-05', 'Patient ID': 'P032', Department: 'Pediatrics', Diagnosis: 'Measles', Age: 6, 'Blood Pressure (mmHg)': '102/62', 'Heart Rate (bpm)': 96, 'Temperature (°F)': 101.8, 'Treatment Cost ($)': 320, Medication: 'Vaccine', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-02-06', 'Patient ID': 'P033', Department: 'Neurology', Diagnosis: 'Alzheimer\'s', Age: 75, 'Blood Pressure (mmHg)': '140/90', 'Heart Rate (bpm)': 85, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 2200, Medication: 'Memory Medication', 'Visit Duration (min)': 50, Status: 'Completed' },
      { Date: '2024-02-07', 'Patient ID': 'P034', Department: 'Dermatology', Diagnosis: 'Eczema', Age: 26, 'Blood Pressure (mmHg)': '120/78', 'Heart Rate (bpm)': 72, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 290, Medication: 'Topical Cream', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-02-08', 'Patient ID': 'P035', Department: 'Cardiology', Diagnosis: 'Arrhythmia', Age: 59, 'Blood Pressure (mmHg)': '152/98', 'Heart Rate (bpm)': 97, 'Temperature (°F)': 99.2, 'Treatment Cost ($)': 1100, Medication: 'Blood Thinner', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-02-09', 'Patient ID': 'P036', Department: 'Emergency', Diagnosis: 'Seizure', Age: 33, 'Blood Pressure (mmHg)': '125/82', 'Heart Rate (bpm)': 88, 'Temperature (°F)': 100.5, 'Treatment Cost ($)': 3200, Medication: 'Emergency Care', 'Visit Duration (min)': 180, Status: 'Emergency' },
      { Date: '2024-02-10', 'Patient ID': 'P037', Department: 'Orthopedics', Diagnosis: 'Back Pain', Age: 47, 'Blood Pressure (mmHg)': '126/83', 'Heart Rate (bpm)': 77, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 580, Medication: 'Muscle Relaxant', 'Visit Duration (min)': 35, Status: 'Completed' },
      { Date: '2024-02-11', 'Patient ID': 'P038', Department: 'Pediatrics', Diagnosis: 'Follow-up', Age: 12, 'Blood Pressure (mmHg)': '110/70', 'Heart Rate (bpm)': 87, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 120, Medication: 'Inhaler', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-02-12', 'Patient ID': 'P039', Department: 'Neurology', Diagnosis: 'Migraine', Age: 35, 'Blood Pressure (mmHg)': '118/76', 'Heart Rate (bpm)': 69, 'Temperature (°F)': 98.9, 'Treatment Cost ($)': 480, Medication: 'Preventive Medication', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-02-13', 'Patient ID': 'P040', Department: 'Dermatology', Diagnosis: 'Psoriasis', Age: 41, 'Blood Pressure (mmHg)': '124/81', 'Heart Rate (bpm)': 76, 'Temperature (°F)': 98.8, 'Treatment Cost ($)': 440, Medication: 'Topical Treatment', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-02-14', 'Patient ID': 'P041', Department: 'Cardiology', Diagnosis: 'Hypertension', Age: 52, 'Blood Pressure (mmHg)': '146/96', 'Heart Rate (bpm)': 79, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 370, Medication: 'ACE Inhibitor', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-02-15', 'Patient ID': 'P042', Department: 'Orthopedics', Diagnosis: 'Fracture', Age: 38, 'Blood Pressure (mmHg)': '121/79', 'Heart Rate (bpm)': 73, 'Temperature (°F)': 99.0, 'Treatment Cost ($)': 1100, Medication: 'Pain Reliever', 'Visit Duration (min)': 45, Status: 'Completed' },
      { Date: '2024-02-16', 'Patient ID': 'P043', Department: 'Pediatrics', Diagnosis: 'Common Cold', Age: 9, 'Blood Pressure (mmHg)': '107/67', 'Heart Rate (bpm)': 86, 'Temperature (°F)': 100.3, 'Treatment Cost ($)': 140, Medication: 'Antibiotic', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-02-17', 'Patient ID': 'P044', Department: 'Neurology', Diagnosis: 'Epilepsy', Age: 21, 'Blood Pressure (mmHg)': '117/77', 'Heart Rate (bpm)': 71, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 620, Medication: 'Anticonvulsant', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-02-18', 'Patient ID': 'P045', Department: 'Dermatology', Diagnosis: 'Acne', Age: 14, 'Blood Pressure (mmHg)': '110/68', 'Heart Rate (bpm)': 79, 'Temperature (°F)': 98.5, 'Treatment Cost ($)': 170, Medication: 'Topical Treatment', 'Visit Duration (min)': 15, Status: 'Completed' },
      { Date: '2024-02-19', 'Patient ID': 'P046', Department: 'Cardiology', Diagnosis: 'Angina', Age: 57, 'Blood Pressure (mmHg)': '140/90', 'Heart Rate (bpm)': 86, 'Temperature (°F)': 99.1, 'Treatment Cost ($)': 750, Medication: 'Nitroglycerin', 'Visit Duration (min)': 30, Status: 'Completed' },
      { Date: '2024-02-20', 'Patient ID': 'P047', Department: 'Orthopedics', Diagnosis: 'Arthritis', Age: 63, 'Blood Pressure (mmHg)': '130/86', 'Heart Rate (bpm)': 81, 'Temperature (°F)': 99.2, 'Treatment Cost ($)': 720, Medication: 'Anti-inflammatory', 'Visit Duration (min)': 40, Status: 'Completed' },
      { Date: '2024-02-21', 'Patient ID': 'P048', Department: 'Pediatrics', Diagnosis: 'Asthma', Age: 11, 'Blood Pressure (mmHg)': '109/69', 'Heart Rate (bpm)': 93, 'Temperature (°F)': 99.4, 'Treatment Cost ($)': 270, Medication: 'Inhaler', 'Visit Duration (min)': 25, Status: 'Completed' },
      { Date: '2024-02-22', 'Patient ID': 'P049', Department: 'Neurology', Diagnosis: 'Headache', Age: 27, 'Blood Pressure (mmHg)': '113/73', 'Heart Rate (bpm)': 70, 'Temperature (°F)': 98.6, 'Treatment Cost ($)': 210, Medication: 'Analgesic', 'Visit Duration (min)': 20, Status: 'Completed' },
      { Date: '2024-02-23', 'Patient ID': 'P050', Department: 'Dermatology', Diagnosis: 'Allergy', Age: 20, 'Blood Pressure (mmHg)': '119/77', 'Heart Rate (bpm)': 75, 'Temperature (°F)': 98.7, 'Treatment Cost ($)': 190, Medication: 'Antihistamine', 'Visit Duration (min)': 15, Status: 'Completed' },
    ],
  },
  banking: {
    data: [
      { Date: '2024-01-01', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Alpha', Amount: 12500, Balance: 12500, Status: 'Completed' },
      { Date: '2024-01-02', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Printer Paper & Ink', Amount: -245.50, Balance: 12254.50, Status: 'Completed' },
      { Date: '2024-01-03', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Adobe Creative Suite Subscription', Amount: -52.99, Balance: 12201.51, Status: 'Completed' },
      { Date: '2024-01-04', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Utilities', Description: 'Office Electricity Bill', Amount: -350.00, Balance: 11851.51, Status: 'Completed' },
      { Date: '2024-01-05', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Google Ads Campaign', Amount: -850.00, Balance: 11001.51, Status: 'Completed' },
      { Date: '2024-01-06', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Beta', Amount: 8900, Balance: 19901.51, Status: 'Completed' },
      { Date: '2024-01-07', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Client Meeting - Transportation', Amount: -125.00, Balance: 19776.51, Status: 'Completed' },
      { Date: '2024-01-08', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Cloud Hosting Service', Amount: -199.99, Balance: 19576.52, Status: 'Completed' },
      { Date: '2024-01-09', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Office Furniture', Amount: -450.00, Balance: 19126.52, Status: 'Completed' },
      { Date: '2024-01-10', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Gamma', Amount: 15000, Balance: 34126.52, Status: 'Completed' },
      { Date: '2024-01-11', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Payroll', Description: 'Employee Salary - January', Amount: -8500.00, Balance: 25626.52, Status: 'Completed' },
      { Date: '2024-01-12', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Social Media Ads', Amount: -650.00, Balance: 24976.52, Status: 'Completed' },
      { Date: '2024-01-13', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Legal Consultation', Amount: -1200.00, Balance: 23776.52, Status: 'Completed' },
      { Date: '2024-01-14', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'CRM Software License', Amount: -89.99, Balance: 23686.53, Status: 'Completed' },
      { Date: '2024-01-15', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Recurring Subscription Revenue', Amount: 3200, Balance: 26886.53, Status: 'Completed' },
      { Date: '2024-01-16', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Computer Equipment', Amount: -1850.00, Balance: 25036.53, Status: 'Completed' },
      { Date: '2024-01-17', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Rent', Description: 'Office Rent - January', Amount: -2500.00, Balance: 22536.53, Status: 'Completed' },
      { Date: '2024-01-18', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Email Marketing Platform', Amount: -79.99, Balance: 22456.54, Status: 'Completed' },
      { Date: '2024-01-19', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Business Conference Registration', Amount: -850.00, Balance: 21606.54, Status: 'Completed' },
      { Date: '2024-01-20', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Delta', Amount: 11200, Balance: 32806.54, Status: 'Completed' },
      { Date: '2024-01-21', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Accounting Services', Amount: -450.00, Balance: 32356.54, Status: 'Completed' },
      { Date: '2024-01-22', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Utilities', Description: 'Internet & Phone Service', Amount: -195.00, Balance: 32161.54, Status: 'Completed' },
      { Date: '2024-01-23', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Stationery & Supplies', Amount: -125.50, Balance: 32036.04, Status: 'Completed' },
      { Date: '2024-01-24', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Content Creation Tools', Amount: -299.99, Balance: 31736.05, Status: 'Completed' },
      { Date: '2024-01-25', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Epsilon', Amount: 9800, Balance: 41536.05, Status: 'Completed' },
      { Date: '2024-01-26', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Project Management Tool', Amount: -149.99, Balance: 41386.06, Status: 'Completed' },
      { Date: '2024-01-27', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Client Site Visit - Travel', Amount: -425.00, Balance: 40961.06, Status: 'Completed' },
      { Date: '2024-01-28', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Tax Preparation Services', Amount: -850.00, Balance: 40111.06, Status: 'Completed' },
      { Date: '2024-01-29', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Website Hosting & Domain', Amount: -89.99, Balance: 40021.07, Status: 'Completed' },
      { Date: '2024-01-30', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Recurring Subscription Revenue', Amount: 3200, Balance: 43221.07, Status: 'Completed' },
      { Date: '2024-01-31', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Monthly Office Supplies', Amount: -185.75, Balance: 43035.32, Status: 'Completed' },
      { Date: '2024-02-01', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Zeta', Amount: 14500, Balance: 57535.32, Status: 'Completed' },
      { Date: '2024-02-02', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Google Ads Campaign', Amount: -950.00, Balance: 56585.32, Status: 'Completed' },
      { Date: '2024-02-03', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Design Software License', Amount: -79.99, Balance: 56505.33, Status: 'Completed' },
      { Date: '2024-02-04', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Utilities', Description: 'Office Electricity Bill', Amount: -375.00, Balance: 56130.33, Status: 'Completed' },
      { Date: '2024-02-05', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'LinkedIn Ads Campaign', Amount: -650.00, Balance: 55480.33, Status: 'Completed' },
      { Date: '2024-02-06', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Eta', Amount: 10200, Balance: 65680.33, Status: 'Completed' },
      { Date: '2024-02-07', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Cloud Storage Service', Amount: -199.99, Balance: 65480.34, Status: 'Completed' },
      { Date: '2024-02-08', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Office Equipment Maintenance', Amount: -325.00, Balance: 65155.34, Status: 'Completed' },
      { Date: '2024-02-09', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Theta', Amount: 16800, Balance: 81955.34, Status: 'Completed' },
      { Date: '2024-02-10', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Payroll', Description: 'Employee Salary - February', Amount: -8500.00, Balance: 73455.34, Status: 'Completed' },
      { Date: '2024-02-11', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Facebook Ads Campaign', Amount: -750.00, Balance: 72705.34, Status: 'Completed' },
      { Date: '2024-02-12', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Legal Document Review', Amount: -550.00, Balance: 72155.34, Status: 'Completed' },
      { Date: '2024-02-13', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Business Trip - Accommodation', Amount: -650.00, Balance: 71505.34, Status: 'Completed' },
      { Date: '2024-02-14', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Recurring Subscription Revenue', Amount: 3200, Balance: 74705.34, Status: 'Completed' },
      { Date: '2024-02-15', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Analytics Tool Subscription', Amount: -149.99, Balance: 74555.35, Status: 'Completed' },
      { Date: '2024-02-16', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'New Office Furniture', Amount: -2200.00, Balance: 72355.35, Status: 'Completed' },
      { Date: '2024-02-17', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Rent', Description: 'Office Rent - February', Amount: -2500.00, Balance: 69855.35, Status: 'Completed' },
      { Date: '2024-02-18', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'SEO Tools Subscription', Amount: -199.99, Balance: 69655.36, Status: 'Completed' },
      { Date: '2024-02-19', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Client Meeting - Transportation', Amount: -145.00, Balance: 69510.36, Status: 'Completed' },
      { Date: '2024-02-20', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Iota', Amount: 13200, Balance: 82710.36, Status: 'Completed' },
      { Date: '2024-02-21', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Consulting Services', Amount: -1200.00, Balance: 81510.36, Status: 'Completed' },
      { Date: '2024-02-22', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Utilities', Description: 'Internet & Phone Service', Amount: -195.00, Balance: 81315.36, Status: 'Completed' },
      { Date: '2024-02-23', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Office Supplies', Description: 'Office Supplies Restock', Amount: -225.50, Balance: 81089.86, Status: 'Completed' },
      { Date: '2024-02-24', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Marketing', Description: 'Video Production Tools', Amount: -450.00, Balance: 80639.86, Status: 'Completed' },
      { Date: '2024-02-25', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Client Payment - Project Kappa', Amount: 11500, Balance: 92139.86, Status: 'Completed' },
      { Date: '2024-02-26', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Software', Description: 'Security Software License', Amount: -299.99, Balance: 91839.87, Status: 'Completed' },
      { Date: '2024-02-27', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Travel', Description: 'Industry Conference - Registration', Amount: -1200.00, Balance: 90639.87, Status: 'Completed' },
      { Date: '2024-02-28', 'Account': 'Business Checking', 'Transaction Type': 'Expense', Category: 'Professional Services', Description: 'Financial Advisory Services', Amount: -650.00, Balance: 89989.87, Status: 'Completed' },
      { Date: '2024-02-29', 'Account': 'Business Checking', 'Transaction Type': 'Revenue', Category: 'Sales', Description: 'Recurring Subscription Revenue', Amount: 3200, Balance: 93189.87, Status: 'Completed' },
    ],
  },
  yearlyIncome: {
    data: [
      { Year: '2020', Income: 0 },
      { Year: '2021', Income: 1200 },
      { Year: '2022', Income: 5600 },
      { Year: '2023', Income: 63000 },
      { Year: '2024', Income: 554000 },
      { Year: '2025', Income: 930000 },
    ],
  },
  pharmacy: {
    data: [
      { Date: '2025-01', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store A', Value: 1240 },
      { Date: '2025-01', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store B', Value: 890 },
      { Date: '2025-01', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store A', Value: 3200 },
      { Date: '2025-01', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store B', Value: 2100 },
      { Date: '2025-01', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store A', Value: 84500 },
      { Date: '2025-01', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store B', Value: 62300 },
      { Date: '2025-01', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store A', Value: 0 },
      { Date: '2025-01', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store B', Value: 0 },
      { Date: '2025-02', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store A', Value: 1180 },
      { Date: '2025-02', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store B', Value: 920 },
      { Date: '2025-02', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store A', Value: 3350 },
      { Date: '2025-02', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store B', Value: 2280 },
      { Date: '2025-02', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store A', Value: 87200 },
      { Date: '2025-02', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store B', Value: 65100 },
      { Date: '2025-02', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store A', Value: 0 },
      { Date: '2025-02', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store B', Value: 0 },
      { Date: '2025-03', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store A', Value: 1310 },
      { Date: '2025-03', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store B', Value: 870 },
      { Date: '2025-03', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store A', Value: 3480 },
      { Date: '2025-03', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store B', Value: 2190 },
      { Date: '2025-03', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store A', Value: 89100 },
      { Date: '2025-03', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store B', Value: 63800 },
      { Date: '2025-03', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store A', Value: 0 },
      { Date: '2025-03', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store B', Value: 0 },
      { Date: '2025-04', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store A', Value: 1270 },
      { Date: '2025-04', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store B', Value: 940 },
      { Date: '2025-04', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store A', Value: 3290 },
      { Date: '2025-04', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store B', Value: 2340 },
      { Date: '2025-04', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store A', Value: 86800 },
      { Date: '2025-04', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store B', Value: 66700 },
      { Date: '2025-04', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store A', Value: 0 },
      { Date: '2025-04', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store B', Value: 0 },
      { Date: '2025-05', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store A', Value: 1190 },
      { Date: '2025-05', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store B', Value: 910 },
      { Date: '2025-05', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store A', Value: 3410 },
      { Date: '2025-05', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store B', Value: 2250 },
      { Date: '2025-05', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store A', Value: 88300 },
      { Date: '2025-05', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store B', Value: 64200 },
      { Date: '2025-05', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store A', Value: 0 },
      { Date: '2025-05', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store B', Value: 0 },
      { Date: '2025-06', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store A', Value: 1350 },
      { Date: '2025-06', ReportType: 'Inventory', Metric: 'Units on hand', Location: 'Store B', Value: 880 },
      { Date: '2025-06', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store A', Value: 3560 },
      { Date: '2025-06', ReportType: 'Prescription volume', Metric: 'Scripts dispensed', Location: 'Store B', Value: 2310 },
      { Date: '2025-06', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store A', Value: 90200 },
      { Date: '2025-06', ReportType: 'Revenue', Metric: 'Rx sales ($)', Location: 'Store B', Value: 65900 },
      { Date: '2025-06', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store A', Value: 0 },
      { Date: '2025-06', ReportType: 'Compliance', Metric: 'Controlled recs', Location: 'Store B', Value: 0 },
    ],
  },
  'superbowl-winners': {
    data: [
      { Year: 1967, Winner: 'Green Bay Packers' },
      { Year: 1968, Winner: 'Green Bay Packers' },
      { Year: 1969, Winner: 'New York Jets' },
      { Year: 1970, Winner: 'Kansas City Chiefs' },
      { Year: 1971, Winner: 'Baltimore Colts' },
      { Year: 1972, Winner: 'Dallas Cowboys' },
      { Year: 1973, Winner: 'Miami Dolphins' },
      { Year: 1974, Winner: 'Miami Dolphins' },
      { Year: 1975, Winner: 'Pittsburgh Steelers' },
      { Year: 1976, Winner: 'Pittsburgh Steelers' },
      { Year: 1977, Winner: 'Oakland Raiders' },
      { Year: 1978, Winner: 'Dallas Cowboys' },
      { Year: 1979, Winner: 'Pittsburgh Steelers' },
      { Year: 1980, Winner: 'Pittsburgh Steelers' },
      { Year: 1981, Winner: 'Oakland Raiders' },
      { Year: 1982, Winner: 'San Francisco 49ers' },
      { Year: 1983, Winner: 'Washington Redskins' },
      { Year: 1984, Winner: 'Los Angeles Raiders' },
      { Year: 1985, Winner: 'San Francisco 49ers' },
      { Year: 1986, Winner: 'Chicago Bears' },
      { Year: 1987, Winner: 'New York Giants' },
      { Year: 1988, Winner: 'Washington Redskins' },
      { Year: 1989, Winner: 'San Francisco 49ers' },
      { Year: 1990, Winner: 'San Francisco 49ers' },
      { Year: 1991, Winner: 'New York Giants' },
      { Year: 1992, Winner: 'Washington Redskins' },
      { Year: 1993, Winner: 'Dallas Cowboys' },
      { Year: 1994, Winner: 'Dallas Cowboys' },
      { Year: 1995, Winner: 'San Francisco 49ers' },
      { Year: 1996, Winner: 'Dallas Cowboys' },
      { Year: 1997, Winner: 'Green Bay Packers' },
      { Year: 1998, Winner: 'Denver Broncos' },
      { Year: 1999, Winner: 'Denver Broncos' },
      { Year: 2000, Winner: 'St. Louis Rams' },
      { Year: 2001, Winner: 'Baltimore Ravens' },
      { Year: 2002, Winner: 'New England Patriots' },
      { Year: 2003, Winner: 'Tampa Bay Buccaneers' },
      { Year: 2004, Winner: 'New England Patriots' },
      { Year: 2005, Winner: 'New England Patriots' },
      { Year: 2006, Winner: 'Pittsburgh Steelers' },
      { Year: 2007, Winner: 'Indianapolis Colts' },
      { Year: 2008, Winner: 'New York Giants' },
      { Year: 2009, Winner: 'Pittsburgh Steelers' },
      { Year: 2010, Winner: 'New Orleans Saints' },
      { Year: 2011, Winner: 'Green Bay Packers' },
      { Year: 2012, Winner: 'New York Giants' },
      { Year: 2013, Winner: 'Baltimore Ravens' },
      { Year: 2014, Winner: 'Seattle Seahawks' },
      { Year: 2015, Winner: 'New England Patriots' },
      { Year: 2016, Winner: 'Denver Broncos' },
      { Year: 2017, Winner: 'New England Patriots' },
      { Year: 2018, Winner: 'Philadelphia Eagles' },
      { Year: 2019, Winner: 'New England Patriots' },
      { Year: 2020, Winner: 'Kansas City Chiefs' },
      { Year: 2021, Winner: 'Tampa Bay Buccaneers' },
      { Year: 2022, Winner: 'Los Angeles Rams' },
      { Year: 2023, Winner: 'Kansas City Chiefs' },
      { Year: 2024, Winner: 'Kansas City Chiefs' },
      { Year: 2025, Winner: 'Philadelphia Eagles' },
    ],
  },
  'today-snapshot': {
  data: [
    {
      date: '2026-02-08',
      occupancy_rate: 81,
      rooms_available: 100,
      rooms_occupied: 81,
      arrivals_today: 17,
      departures_today: 15,
      revenue_today: 12100,
      adr: 149.20,
      revpar: 120.50
    },
    {
      date: '2026-02-09',
      occupancy_rate: 82,
      rooms_available: 100,
      rooms_occupied: 82,
      arrivals_today: 18,
      departures_today: 14,
      revenue_today: 12450,
      adr: 151.83,
      revpar: 124.50
    }
  ]
},
  'revenue-trends': {
    data: [
      { date: '2026-02-01', occupancy_rate: 68, revenue: 8900, adr: 131, revpar: 89 },
      { date: '2026-02-02', occupancy_rate: 72, revenue: 9400, adr: 130, revpar: 94 },
      { date: '2026-02-03', occupancy_rate: 70, revenue: 9100, adr: 130, revpar: 91 },
      { date: '2026-02-04', occupancy_rate: 74, revenue: 9900, adr: 134, revpar: 99 },
      { date: '2026-02-05', occupancy_rate: 79, revenue: 10800, adr: 137, revpar: 108 },
      { date: '2026-02-06', occupancy_rate: 88, revenue: 14200, adr: 161, revpar: 142 },
      { date: '2026-02-07', occupancy_rate: 92, revenue: 15800, adr: 172, revpar: 158 },
      { date: '2026-02-08', occupancy_rate: 85, revenue: 13200, adr: 155, revpar: 132 },
      { date: '2026-02-09', occupancy_rate: 82, revenue: 12450, adr: 152, revpar: 125 }
    ]
  },
  'alters-insights': {
    data: [
      { date: '2026-02-09', alert_type: 'Overbooking Risk', severity: 'High', description: '3 rooms overbooked for tonight', recommended_action: 'Close OTA inventory and walk low-value bookings' },
      { date: '2026-02-09', alert_type: 'Low Occupancy Forecast', severity: 'Medium', description: 'Next Tuesday forecast at 55% occupancy', recommended_action: 'Launch midweek promotion or adjust rates' },
      { date: '2026-02-09', alert_type: 'High Cancellations', severity: 'Medium', description: '6 cancellations in the last 24 hours', recommended_action: 'Review cancellation sources and policies' },
      { date: '2026-02-09', alert_type: 'VIP Arrival', severity: 'Low', description: 'Repeat guest arriving today', recommended_action: 'Offer complimentary upgrade or welcome amenity' }
    ]
  },
  usaspending: {
    data: [
      { 'Award Date': '2024-01-15', 'Award Amount': 2500000, 'Recipient Name': 'Tech Solutions Inc', 'Awarding Agency': 'Department of Defense', 'Award Type': 'Contract', State: 'VA', 'NAICS Code': 541511, Description: 'Software Development Services' },
      { 'Award Date': '2024-01-18', 'Award Amount': 1850000, 'Recipient Name': 'Global Construction Group', 'Awarding Agency': 'General Services Administration', 'Award Type': 'Contract', State: 'CA', 'NAICS Code': 236220, Description: 'Building Renovation Project' },
      { 'Award Date': '2024-01-22', 'Award Amount': 3200000, 'Recipient Name': 'Medical Research Labs', 'Awarding Agency': 'National Institutes of Health', 'Award Type': 'Grant', State: 'MD', 'NAICS Code': 541712, Description: 'Biomedical Research Study' },
      { 'Award Date': '2024-01-25', 'Award Amount': 950000, 'Recipient Name': 'Cybersecurity Systems LLC', 'Awarding Agency': 'Department of Homeland Security', 'Award Type': 'Contract', State: 'TX', 'NAICS Code': 541519, Description: 'Network Security Assessment' },
      { 'Award Date': '2024-02-01', 'Award Amount': 4200000, 'Recipient Name': 'Transportation Services Co', 'Awarding Agency': 'Department of Transportation', 'Award Type': 'Contract', State: 'FL', 'NAICS Code': 485111, Description: 'Fleet Vehicle Maintenance' },
      { 'Award Date': '2024-02-05', 'Award Amount': 1650000, 'Recipient Name': 'Environmental Solutions Inc', 'Awarding Agency': 'Environmental Protection Agency', 'Award Type': 'Grant', State: 'WA', 'NAICS Code': 562910, Description: 'Water Quality Monitoring Program' },
      { 'Award Date': '2024-02-08', 'Award Amount': 2800000, 'Recipient Name': 'Aerospace Technologies', 'Awarding Agency': 'NASA', 'Award Type': 'Contract', State: 'AL', 'NAICS Code': 336411, Description: 'Satellite Component Development' },
      { 'Award Date': '2024-02-12', 'Award Amount': 1100000, 'Recipient Name': 'Education Services Group', 'Awarding Agency': 'Department of Education', 'Award Type': 'Grant', State: 'NY', 'NAICS Code': 611710, Description: 'STEM Education Initiative' },
      { 'Award Date': '2024-02-15', 'Award Amount': 3750000, 'Recipient Name': 'Energy Systems Corp', 'Awarding Agency': 'Department of Energy', 'Award Type': 'Contract', State: 'CO', 'NAICS Code': 221112, Description: 'Renewable Energy Research' },
      { 'Award Date': '2024-02-18', 'Award Amount': 2200000, 'Recipient Name': 'Healthcare Innovations', 'Awarding Agency': 'Department of Veterans Affairs', 'Award Type': 'Contract', State: 'NC', 'NAICS Code': 621111, Description: 'Medical Equipment Procurement' },
      { 'Award Date': '2024-02-22', 'Award Amount': 850000, 'Recipient Name': 'Data Analytics Firm', 'Awarding Agency': 'Census Bureau', 'Award Type': 'Contract', State: 'MA', 'NAICS Code': 541511, Description: 'Data Processing Services' },
      { 'Award Date': '2024-02-25', 'Award Amount': 1950000, 'Recipient Name': 'Agricultural Research Center', 'Awarding Agency': 'Department of Agriculture', 'Award Type': 'Grant', State: 'IA', 'NAICS Code': 541712, Description: 'Crop Yield Research' },
      { 'Award Date': '2024-03-01', 'Award Amount': 3100000, 'Recipient Name': 'Defense Contractors Inc', 'Awarding Agency': 'Department of Defense', 'Award Type': 'Contract', State: 'AZ', 'NAICS Code': 336414, Description: 'Military Vehicle Parts' },
      { 'Award Date': '2024-03-05', 'Award Amount': 1400000, 'Recipient Name': 'Public Safety Systems', 'Awarding Agency': 'Department of Justice', 'Award Type': 'Grant', State: 'IL', 'NAICS Code': 541519, Description: 'Law Enforcement Technology' },
      { 'Award Date': '2024-03-08', 'Award Amount': 2650000, 'Recipient Name': 'Infrastructure Builders', 'Awarding Agency': 'Department of Transportation', 'Award Type': 'Contract', State: 'PA', 'NAICS Code': 237310, Description: 'Highway Construction Project' },
      { 'Award Date': '2024-03-12', 'Award Amount': 1750000, 'Recipient Name': 'Marine Research Institute', 'Awarding Agency': 'National Oceanic and Atmospheric Administration', 'Award Type': 'Grant', State: 'OR', 'NAICS Code': 541712, Description: 'Oceanographic Study' },
      { 'Award Date': '2024-03-15', 'Award Amount': 4800000, 'Recipient Name': 'IT Services Corporation', 'Awarding Agency': 'General Services Administration', 'Award Type': 'Contract', State: 'GA', 'NAICS Code': 541511, Description: 'Enterprise IT Support' },
      { 'Award Date': '2024-03-18', 'Award Amount': 920000, 'Recipient Name': 'Social Services Network', 'Awarding Agency': 'Department of Health and Human Services', 'Award Type': 'Grant', State: 'MI', 'NAICS Code': 624190, Description: 'Community Health Program' },
      { 'Award Date': '2024-03-22', 'Award Amount': 2100000, 'Recipient Name': 'Telecommunications Systems', 'Awarding Agency': 'Federal Communications Commission', 'Award Type': 'Contract', State: 'NJ', 'NAICS Code': 517311, Description: 'Network Infrastructure Upgrade' },
      { 'Award Date': '2024-03-25', 'Award Amount': 1350000, 'Recipient Name': 'Wildlife Conservation Org', 'Awarding Agency': 'Department of Interior', 'Award Type': 'Grant', State: 'MT', 'NAICS Code': 813312, Description: 'Wildlife Habitat Restoration' },
      { 'Award Date': '2024-03-28', 'Award Amount': 3400000, 'Recipient Name': 'Aviation Services Group', 'Awarding Agency': 'Federal Aviation Administration', 'Award Type': 'Contract', State: 'OK', 'NAICS Code': 488190, Description: 'Airport Security Systems' },
      { 'Award Date': '2024-04-01', 'Award Amount': 1550000, 'Recipient Name': 'Food Safety Labs', 'Awarding Agency': 'Food and Drug Administration', 'Award Type': 'Grant', State: 'MN', 'NAICS Code': 541712, Description: 'Food Safety Testing Program' },
      { 'Award Date': '2024-04-05', 'Award Amount': 2900000, 'Recipient Name': 'Engineering Consultants', 'Awarding Agency': 'Army Corps of Engineers', 'Award Type': 'Contract', State: 'LA', 'NAICS Code': 541330, Description: 'Flood Control Project Design' },
      { 'Award Date': '2024-04-08', 'Award Amount': 1180000, 'Recipient Name': 'Rural Development Corp', 'Awarding Agency': 'Department of Agriculture', 'Award Type': 'Grant', State: 'ND', 'NAICS Code': 541611, Description: 'Rural Economic Development' },
      { 'Award Date': '2024-04-12', 'Award Amount': 4100000, 'Recipient Name': 'Space Systems Engineering', 'Awarding Agency': 'NASA', 'Award Type': 'Contract', State: 'CA', 'NAICS Code': 336414, Description: 'Spacecraft Propulsion System' },
      { 'Award Date': '2024-04-15', 'Award Amount': 2250000, 'Recipient Name': 'Emergency Response Services', 'Awarding Agency': 'Federal Emergency Management Agency', 'Award Type': 'Grant', State: 'FL', 'NAICS Code': 624230, Description: 'Disaster Preparedness Training' },
      { 'Award Date': '2024-04-18', 'Award Amount': 1680000, 'Recipient Name': 'Financial Services Tech', 'Awarding Agency': 'Department of Treasury', 'Award Type': 'Contract', State: 'DC', 'NAICS Code': 541511, Description: 'Financial System Modernization' },
      { 'Award Date': '2024-04-22', 'Award Amount': 980000, 'Recipient Name': 'Mental Health Services', 'Awarding Agency': 'Substance Abuse and Mental Health Services Administration', 'Award Type': 'Grant', State: 'VT', 'NAICS Code': 621420, Description: 'Mental Health Outreach Program' },
      { 'Award Date': '2024-04-25', 'Award Amount': 2750000, 'Recipient Name': 'Border Security Systems', 'Awarding Agency': 'Customs and Border Protection', 'Award Type': 'Contract', State: 'TX', 'NAICS Code': 541519, Description: 'Surveillance Technology' },
      { 'Award Date': '2024-04-28', 'Award Amount': 1420000, 'Recipient Name': 'Urban Planning Institute', 'Awarding Agency': 'Department of Housing and Urban Development', 'Award Type': 'Grant', State: 'OH', 'NAICS Code': 541611, Description: 'Urban Development Study' },
    ],
  },
}

// Load NFL schedule from CSV (2025 season + playoffs)
const nflSchedulePath = path.join(__dirname, '..', 'data', 'nfl-schedule-2025.csv')
let nflScheduleData = null
function loadNflSchedule() {
  if (nflScheduleData) return nflScheduleData
  try {
    const csv = fs.readFileSync(nflSchedulePath, 'utf8')
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true })
    const numericCols = ['PtsW', 'PtsL', 'YdsW', 'TOW', 'YdsL', 'TOL']
    nflScheduleData = (parsed.data || []).map((row) => {
      const out = { ...row }
      numericCols.forEach((col) => {
        if (out[col] !== undefined && out[col] !== '' && !isNaN(Number(out[col]))) {
          out[col] = Number(out[col])
        }
      })
      if (out.Week !== undefined && out.Week !== '' && /^\d+$/.test(String(out.Week).trim())) {
        out.Week = Number(out.Week)
      }
      return out
    }).filter((row) => row.Winner || row.Loser || row.Week) // keep header-like or data rows
    exampleDatasets['nfl-schedule'] = { data: nflScheduleData }
  } catch (err) {
    console.warn('NFL schedule CSV not loaded:', err.message)
    exampleDatasets['nfl-schedule'] = { data: [] }
  }
  return nflScheduleData
}
loadNflSchedule()

router.get('/sales', (req, res) => {
  const dataset = exampleDatasets.sales
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/attendance', (req, res) => {
  const dataset = exampleDatasets.attendance
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/donations', (req, res) => {
  const dataset = exampleDatasets.donations
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/medical', (req, res) => {
  const dataset = exampleDatasets.medical
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/banking', (req, res) => {
  const dataset = exampleDatasets.banking
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/yearly-income', (req, res) => {
  const dataset = exampleDatasets.yearlyIncome
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/nfl-schedule', (req, res) => {
  const data = loadNflSchedule()
  if (!data || data.length === 0) {
    return res.status(503).json({ error: 'NFL schedule data not available' })
  }
  const columns = Object.keys(data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(data, columns)
  const processedData = processDataPreservingNumbers(data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/pharmacy', (req, res) => {
  const dataset = exampleDatasets.pharmacy
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

// Sample SAS dataset: read from backend/sample-data/sample.sas7bdat if present, else return sales data
router.get('/sas7bdat-sample', async (req, res) => {
  const fallback = () => {
    const dataset = exampleDatasets.sales
    const columns = Object.keys(dataset.data[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
    const processedData = processDataPreservingNumbers(dataset.data, numericColumns)
    return res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
    })
  }
  if (!SAS7BDAT) return fallback()
  const candidates = [
    path.join(__dirname, '../sample-data/sample.sas7bdat'),
    path.join(__dirname, '../../sample-data/sample.sas7bdat'),
    path.join(process.cwd(), 'backend/sample-data/sample.sas7bdat'),
    path.join(process.cwd(), 'sample-data/sample.sas7bdat'),
  ]
  const filePath = candidates.find((p) => fs.existsSync(p))
  if (!filePath) return fallback()
  try {
    const rows = await SAS7BDAT.parse(filePath, { rowFormat: 'object' })
    const data = Array.isArray(rows) ? rows : []
    if (data.length === 0) return fallback()
    const columns = Object.keys(data[0] || {})
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(data, columns)
    const processedData = processDataPreservingNumbers(data, numericColumns)
    return res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
    })
  } catch (err) {
    console.warn('sas7bdat-sample: parse failed, using sales fallback:', err?.message || err)
    return fallback()
  }
})

router.get('/superbowl-winners', (req, res) => {
  const dataset = exampleDatasets['superbowl-winners']
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

router.get('/today-snapshot', (req, res) => {
  const dataset = exampleDatasets['today-snapshot']
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length
  })
})

router.get('/revenue-trends', (req, res) => {
  const dataset = exampleDatasets['revenue-trends']
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length
  })
})

router.get('/alters-insights', (req, res) => {
  const dataset = exampleDatasets['alters-insights']
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length
  })
})

router.get('/usaspending', (req, res) => {
  const dataset = exampleDatasets.usaspending
  const columns = Object.keys(dataset.data[0])
  const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(dataset.data, columns)
  const processedData = processDataPreservingNumbers(dataset.data, numericColumns)

  res.json({
    data: processedData,
    columns,
    numericColumns,
    categoricalColumns,
    dateColumns,
    rowCount: processedData.length,
  })
})

// Route to fetch real-time USASpending data from the official API
router.get('/usaspending/live', async (req, res) => {
  try {
    // Get query parameters for filtering (optional)
    const limit = parseInt(req.query.limit) || 100 // Default to 100 records
    const fiscalYear = parseInt(req.query.fiscal_year) || new Date().getFullYear() // Default to current year
    const awardType = req.query.award_type || null // 'A' for assistance (grants), 'C' for procurement (contracts), or null for all
    const state = req.query.state || null // State code (e.g., 'VA', 'CA')
    
    // Build the API URL - using the spending_by_award endpoint
    const apiUrl = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'
    
    // Prepare the request body for the USASpending API
    // Using the correct format based on API documentation
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    // Calculate fiscal year dates (FY starts Oct 1)
    let startYear = fiscalYear
    let endYear = fiscalYear + 1
    if (currentMonth >= 10) {
      // We're in the new fiscal year
      startYear = currentYear
      endYear = currentYear + 1
    } else {
      // We're still in the previous fiscal year
      startYear = currentYear - 1
      endYear = currentYear
    }
    
    // Build filters object
    // NOTE: award_type_codes is REQUIRED by the API
    const filters = {
      time_period: [
        {
          start_date: `${startYear}-10-01`,
          end_date: `${endYear}-09-30`
        }
      ],
      // award_type_codes is required - use provided type or default to both
      award_type_codes: awardType ? [awardType.toUpperCase()] : ['A', 'C'] // 'A' = grants, 'C' = contracts
    }
    
    // Add optional state filter if provided
    if (state) {
      filters.recipient_locations = [
        {
          country: 'USA',
          state: state.toUpperCase()
        }
      ]
    }
    
    // Use field names that match the API format (capitalized with spaces)
    const requestBody = {
      filters: filters,
      fields: [
        'Award ID',
        'Award Amount',
        'Start Date',
        'Recipient Name',
        'Awarding Agency',
        'Contract Award Type',
        'recipient_location_state_code',
        'naics_code',
        'Description'
      ],
      page: 1,
      limit: Math.min(limit, 100),
      sort: 'Award Amount', // Must match one of the available sort fields
      order: 'desc'
    }
    
    // Add optional filters
    if (awardType) {
      // Award type codes: 'A' for assistance (grants), 'C' for procurement (contracts)
      requestBody.filters.award_type_codes = [awardType.toUpperCase()]
    }
    
    if (state) {
      requestBody.filters.recipient_locations = [
        {
          country: 'USA',
          state: state.toUpperCase()
        }
      ]
    }
    
    // Fetch data from USASpending API using axios
    console.log('Fetching USASpending data from:', apiUrl)
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    
    let response
    try {
      response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })
    } catch (apiError) {
      // Log the full error details
      if (apiError.response) {
        console.error('USASpending API Error Response:', {
          status: apiError.response.status,
          statusText: apiError.response.statusText,
          data: JSON.stringify(apiError.response.data, null, 2)
        })
        throw new Error(`USASpending API error (${apiError.response.status}): ${JSON.stringify(apiError.response.data)}`)
      }
      throw apiError
    }
    
    const apiData = response.data
    console.log('USASpending API response status:', response.status)
    console.log('Response keys:', Object.keys(apiData))
    
    // Transform USASpending API response to our format
    // The API returns results in different structures, so we handle multiple formats
    const results = apiData.results || apiData.data || apiData.awards || []
    console.log('Number of results:', results.length)
    
    if (results.length === 0 && apiData.page_metadata) {
      console.log('API metadata:', JSON.stringify(apiData.page_metadata, null, 2))
    }
    
    const transformedData = results.map((award) => {
      // Handle the API response format - fields are returned with capitalized names
      const awardId = award['Award ID'] || award.Award_ID || award.award_id || award.id || ''
      const awardDate = award['Start Date'] || award['End Date'] || award.Start_Date || award.End_Date || ''
      const awardAmount = parseFloat(
        award['Award Amount'] || 
        award.Award_Amount || 
        0
      )
      const recipientName = award['Recipient Name'] || 
        award.Recipient_Name || 
        'Unknown'
      const awardingAgency = award['Awarding Agency'] || 
        award.Awarding_Agency || 
        'Unknown'
      const awardTypeValue = award['Contract Award Type'] || 
        award.Contract_Award_Type || 
        'Unknown'
      const recipientState = award['recipient_location_state_code'] || 
        award.recipient_location_state_code || 
        ''
      const naicsCode = parseInt(
        award['naics_code'] || 
        award.naics_code || 
        0
      )
      const description = award['Description'] || 
        award.Description || 
        ''
      
      return {
        'Award ID': awardId,
        'Award Date': awardDate,
        'Award Amount': awardAmount,
        'Recipient Name': recipientName,
        'Awarding Agency': awardingAgency,
        'Award Type': awardTypeValue,
        'State': recipientState,
        'NAICS Code': naicsCode,
        'Description': description
      }
    })
    
    if (transformedData.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for the specified filters',
        message: 'Try adjusting the fiscal_year, award_type, or state parameters',
        hint: 'Use ?fiscal_year=2023&limit=50&award_type=C for contracts or award_type=A for grants'
      })
    }
    
    // Process the data
    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)
    
    res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'USASpending.gov API (Real-time)',
      filters: {
        fiscal_year: fiscalYear,
        award_type: awardType,
        state: state,
        limit: limit
      },
      apiResponse: {
        totalRecords: apiData.page_metadata?.total || apiData.count || processedData.length,
        page: apiData.page_metadata?.page || 1
      }
    })
  } catch (error) {
    console.error('Error fetching USASpending data:', error.message)
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response status:', error.response.status)
      console.error('Response data:', JSON.stringify(error.response.data, null, 2))
      res.status(500).json({ 
        error: 'Failed to fetch USASpending data',
        message: error.message,
        apiError: error.response.data,
        status: error.response.status,
        hint: 'The USASpending API returned an error. Try the sample dataset at /api/example/usaspending instead.',
        documentation: 'https://api.usaspending.gov/docs/'
      })
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request)
      res.status(500).json({ 
        error: 'Failed to fetch USASpending data',
        message: 'No response from USASpending API',
        hint: 'The USASpending API may be temporarily unavailable. Try the sample dataset at /api/example/usaspending instead.',
        documentation: 'https://api.usaspending.gov/docs/'
      })
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message)
      res.status(500).json({ 
        error: 'Failed to fetch USASpending data',
        message: error.message,
        hint: 'The USASpending API may be temporarily unavailable. Try the sample dataset at /api/example/usaspending instead.',
        documentation: 'https://api.usaspending.gov/docs/'
      })
    }
  }
})

// Route to fetch real-time SAM.gov opportunities (Get Opportunities Public API)
// Docs: https://open.gsa.gov/api/get-opportunities-public-api/
// Dataset id used by Studio: "samgov/live" (endpoint: /api/example/samgov/live)
const SAMGOV_CACHE_TTL_MS = 5 * 60 * 1000
const samgovCache = new Map() // key -> { ts, payload }
const samgovEntityCache = new Map() // key -> { ts, payload }

function formatMmDdYyyy(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = String(d.getFullYear())
  return `${mm}/${dd}/${yyyy}`
}

function parseFlexibleDateToMs(raw, { endOfDay = false } = {}) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null

  // Accept SAM.gov request-style dates (MM/dd/yyyy)
  const mmdd = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (mmdd) {
    const mm = Number(mmdd[1])
    const dd = Number(mmdd[2])
    const yyyy = Number(mmdd[3])
    if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) return null
    // Use UTC to avoid local TZ surprises.
    const ms = Date.UTC(yyyy, mm - 1, dd, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
    return Number.isFinite(ms) ? ms : null
  }

  // Accept ISO-like strings (YYYY-MM-DD) and timestamps (Date.parse compatible)
  const parsed = Date.parse(s)
  return Number.isNaN(parsed) ? null : parsed
}

function getSamgovUpdatedDateValue(o) {
  // The SAM.gov Get Opportunities Public API v2 currently does not expose an "Updated Date" field
  // (it returns only the latest active version). Keep these fallbacks anyway in case SAM adds it
  // or a different environment includes it.
  return (
    o?.modifiedDate ||
    o?.modified_date ||
    o?.lastModifiedDate ||
    o?.last_modified_date ||
    o?.updatedDate ||
    o?.updated_date ||
    o?.postedDate ||
    ''
  )
}

/**
 * Intent-based search: turn natural language into SAM.gov search keywords.
 * GET /api/example/samgov/expand-intent?q=we need cloud migration and analytics
 * Returns { keywords: ["cloud migration", "analytics", ...] }
 */
router.get('/samgov/expand-intent', async (req, res) => {
  try {
    const q = (req.query.q || req.query.query || '').toString().trim()
    if (!q) {
      return res.status(400).json({ error: 'Missing q (query) parameter' })
    }
    if (!openai) {
      return res.status(503).json({
        error: 'Intent expansion not configured',
        message: 'Set OPENAI_API_KEY in backend .env to use intent-based search.',
        fallback: [q],
      })
    }
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a search assistant for SAM.gov (US federal contract opportunities). Given a user's natural-language intent or goal, output 4 to 8 short search keywords or phrases that would find relevant contract opportunities. Output only a JSON array of strings, no other text. Example: ["cloud migration", "infrastructure modernization", "AWS", "data analytics"]`,
        },
        {
          role: 'user',
          content: q,
        },
      ],
      temperature: 0.3,
      max_tokens: 256,
    })
    const text = completion?.choices?.[0]?.message?.content?.trim() || '[]'
    let keywords = [q]
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed) && parsed.length > 0) {
        keywords = parsed.filter((k) => typeof k === 'string' && k.trim().length > 0).map((k) => k.trim()).slice(0, 8)
        if (keywords.length === 0) keywords = [q]
      }
    } catch (_) {
      keywords = [q]
    }
    return res.json({ keywords, query: q })
  } catch (err) {
    console.error('[samgov/expand-intent]', err?.message || err)
    const q = (req.query.q || req.query.query || '').toString().trim()
    return res.status(500).json({
      error: 'Intent expansion failed',
      message: err?.message || 'Try using a keyword instead.',
      fallback: q ? [q] : [],
    })
  }
})

// Normalize SAM.gov state to a string (API sometimes returns { code: "VA" } or similar)
function normalizeSamgovState(val) {
  if (val == null) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'object') {
    const code = val.code ?? val.stateCode ?? val.state ?? val.abbreviation ?? val.name
    return typeof code === 'string' ? code.trim() : ''
  }
  return String(val).trim()
}

// Shorten SAM.gov organization for display (fullParentPathName is a long hierarchy e.g. "DEPT OF DEFENSE.DLA AVIATION.DLA AVIATION PHILADELPHIA")
function shortenSamgovOrganization(fullParentPathName, organizationName) {
  const full = (fullParentPathName || organizationName || '').toString().trim()
  if (!full) return ''
  // Take last segment: SAM.gov uses "." or " > " as separators (e.g. "DOD.DLA.DLA AVIATION PHILADELPHIA")
  const segments = full.split(/\.\s*|\s*>\s*/).map((s) => s.trim()).filter(Boolean)
  const lastSegment = segments.length > 1 ? segments[segments.length - 1] : full
  const alt = (organizationName || '').toString().trim()
  // Use the shortest non-empty option so we always show a short name when the path has multiple segments
  const candidates = [lastSegment, alt, full].filter(Boolean)
  const best = candidates.reduce((a, b) => (a.length <= b.length ? a : b))
  return best || full
}

router.get('/samgov/live', async (req, res) => {
  try {
    const apiKey = (process.env.SAM_GOV_API_KEY || req.query.api_key || '').toString().trim()
    if (!apiKey) {
      return res.status(503).json({
        error: 'SAM.gov API key not configured',
        message: 'Set SAM_GOV_API_KEY in backend environment (.env) to use this dataset.',
        docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
      })
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 100, 1), 1000)
    const offset = Math.max(parseInt(req.query.offset) || 0, 0)
    const ptype = (req.query.ptype || '').toString().trim() || undefined
    const title = (req.query.title || req.query.q || '').toString().trim() || undefined
    const state = (req.query.state || '').toString().trim() || undefined
    const ncode = (req.query.ncode || '').toString().trim() || undefined
    const rdlfrom = (req.query.rdlfrom || req.query.responseFrom || req.query.response_from || '').toString().trim() || undefined
    const rdlto = (req.query.rdlto || req.query.responseTo || req.query.response_to || '').toString().trim() || undefined
    const updatedWithinDaysRaw = (req.query.updatedWithinDays || req.query.updated_within_days || req.query.updatedDays || '').toString().trim()
    const updatedWithinDays = updatedWithinDaysRaw ? parseInt(updatedWithinDaysRaw, 10) : NaN
    const updatedFromRaw = (req.query.updatedFrom || req.query.updated_from || '').toString().trim()
    const updatedToRaw = (req.query.updatedTo || req.query.updated_to || '').toString().trim()
    const wantsUpdatedFilter =
      (Number.isFinite(updatedWithinDays) && updatedWithinDays > 0) || Boolean(updatedFromRaw) || Boolean(updatedToRaw)

    // postedFrom/postedTo are mandatory.
    // Default behavior: last 30 days. If the caller is filtering by "updated", widen to 1 year so
    // the local updated filter can work across older postings (SAM.gov enforces a 1-year window).
    const postedFromRaw = (req.query.postedFrom || req.query.posted_from || '').toString().trim()
    const postedToRaw = (req.query.postedTo || req.query.posted_to || '').toString().trim()
    const now = new Date()
    const postedTo = postedToRaw || formatMmDdYyyy(now)
    const from = new Date(now)
    // SAM.gov enforces a max 1-year window and can reject exact boundary cases.
    // Use 364 days to stay safely within the allowed range.
    from.setDate(from.getDate() - (wantsUpdatedFilter ? 364 : 30))
    const postedFrom = postedFromRaw || formatMmDdYyyy(from)

    const cacheKey = JSON.stringify({
      limit,
      offset,
      ptype,
      title,
      state,
      ncode,
      postedFrom,
      postedTo,
      updatedWithinDays: Number.isFinite(updatedWithinDays) ? updatedWithinDays : null,
      updatedFrom: updatedFromRaw || null,
      updatedTo: updatedToRaw || null,
    })
    const cached = samgovCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < SAMGOV_CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached.payload)
    }
    res.setHeader('X-Cache', 'MISS')

    const apiUrl = 'https://api.sam.gov/opportunities/v2/search'
    const params = {
      api_key: apiKey,
      limit,
      offset,
      postedFrom,
      postedTo,
      rdlfrom,
      rdlto,
      ...(ptype ? { ptype } : {}),
      ...(title ? { title } : {}),
      ...(state ? { state } : {}),
      ...(ncode ? { ncode } : {})
    }

    const response = await axios.get(apiUrl, { params, timeout: 30000 })
    const raw = response.data
    const items = Array.isArray(raw?.opportunitiesData) ? raw.opportunitiesData : (Array.isArray(raw) ? raw : [])

    if (!items.length) {
      return res.status(404).json({
        error: 'No opportunities found',
        message: 'Try adjusting postedFrom/postedTo, title, state, ncode, or ptype.',
        hint: 'Example: /api/example/samgov/live?postedFrom=01/01/2026&postedTo=02/09/2026&ptype=o&limit=50'
      })
    }

    let transformedData = items.map((o) => {
      const rawState = o?.placeOfPerformance?.state ?? o?.officeAddress?.state ?? ''
      const popState = normalizeSamgovState(rawState)
      const awardAmountRaw = o?.award?.amount
      const award_amount = awardAmountRaw == null || awardAmountRaw === '' ? null : Number(String(awardAmountRaw).replace(/[$,\s]/g, ''))
      return {
        noticeId: o.noticeId || '',
        title: o.title || '',
        solicitationNumber: o.solicitationNumber || '',
        postedDate: o.postedDate || '',
        updatedDate: getSamgovUpdatedDateValue(o),
        responseDeadLine: o.responseDeadLine || '',
        type: o.type || '',
        baseType: o.baseType || '',
        active: o.active || '',
        organization: shortenSamgovOrganization(o.fullParentPathName, o.organizationName),
        naicsCode: o.naicsCode || '',
        classificationCode: o.classificationCode || '',
        setAside: o.setAside || o.typeOfSetAsideDescription || '',
        state: popState,
        uiLink: o.uiLink || '',
        award_amount: Number.isFinite(award_amount) ? award_amount : null,
        opportunity_count: 1
      }
    })

    if (wantsUpdatedFilter) {
      const nowMs = Date.now()
      const fromMs = Number.isFinite(updatedWithinDays) && updatedWithinDays > 0
        ? nowMs - updatedWithinDays * 24 * 60 * 60 * 1000
        : parseFlexibleDateToMs(updatedFromRaw, { endOfDay: false })
      const toMs = Number.isFinite(updatedWithinDays) && updatedWithinDays > 0
        ? nowMs
        : parseFlexibleDateToMs(updatedToRaw, { endOfDay: true })

      transformedData = transformedData.filter((row) => {
        const uMs = parseFlexibleDateToMs(row?.updatedDate)
        if (uMs == null) return false
        if (fromMs != null && uMs < fromMs) return false
        if (toMs != null && uMs > toMs) return false
        return true
      })
    }

    if (!transformedData.length) {
      return res.status(404).json({
        error: 'No opportunities found',
        message: wantsUpdatedFilter
          ? 'No opportunities matched the updated date filter. Try widening updatedWithinDays or adjusting updatedFrom/updatedTo.'
          : 'No opportunities returned.',
        hint: wantsUpdatedFilter ? 'Example: /api/example/samgov/live?updatedWithinDays=30&ptype=o&limit=200' : undefined
      })
    }

    const columns = Object.keys(transformedData[0])
    const { numericColumns: detectedNumericColumns, categoricalColumns: detectedCategoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)

    // SAM.gov identifiers can look numeric but must stay categorical (never sum NAICS/solicitation/set-aside/classification).
    const forceCategorical = new Set(['naicsCode', 'solicitationNumber', 'classificationCode', 'setAside', 'noticeId'])
    const numericColumns = detectedNumericColumns.filter((c) => !forceCategorical.has(c))
    if (columns.includes('opportunity_count') && !numericColumns.includes('opportunity_count')) {
      numericColumns.push('opportunity_count')
    }
    if (columns.includes('award_amount') && !numericColumns.includes('award_amount')) {
      numericColumns.push('award_amount')
    }
    const categoricalColumns = Array.from(new Set([...detectedCategoricalColumns, ...Array.from(forceCategorical)]))

    const processedData = processDataPreservingNumbers(transformedData, numericColumns)

    const payload = {
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'SAM.gov Opportunities API (Real-time)',
      filters: { postedFrom, postedTo, rdlfrom, rdlto, limit, offset, ptype, title, state, ncode, updatedWithinDays, updatedFrom: updatedFromRaw, updatedTo: updatedToRaw },
      notes: wantsUpdatedFilter
        ? [
            'SAM.gov Get Opportunities Public API v2 does not expose an explicit "Updated Date" field; "updatedDate" is best-effort and may fall back to postedDate.',
          ]
        : undefined,
    }

    samgovCache.set(cacheKey, { ts: Date.now(), payload })
    return res.json(payload)
  } catch (error) {
    console.error('Error fetching SAM.gov opportunities:', error.message)
    const status = error.response?.status
    const data = error.response?.data
    if (status) {
      return res.status(502).json({
        error: 'SAM.gov API error',
        status,
        message: data?.message || data?.error || error.message,
        hint: status === 400 ? 'Check date format (MM/dd/yyyy) and required postedFrom/postedTo parameters.' : undefined,
        docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
      })
    }
    return res.status(500).json({
      error: 'Failed to fetch SAM.gov opportunities',
      message: error.message,
      docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
    })
  }
})

// Route to fetch SAM.gov opportunities and return an agency-level report
// Endpoint: /api/example/samgov/agency-report
router.get('/samgov/agency-report', async (req, res) => {
  try {
    const apiKey = (process.env.SAM_GOV_API_KEY || req.query.api_key || '').toString().trim()
    if (!apiKey) {
      return res.status(503).json({
        error: 'SAM.gov API key not configured',
        message: 'Set SAM_GOV_API_KEY in backend environment (.env) to use this dataset.',
        docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
      })
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 500, 1), 1000)
    const offset = Math.max(parseInt(req.query.offset) || 0, 0)
    const ptype = (req.query.ptype || '').toString().trim() || undefined
    const title = (req.query.title || req.query.q || '').toString().trim() || undefined
    const state = (req.query.state || '').toString().trim() || undefined
    const ncode = (req.query.ncode || '').toString().trim() || undefined
    const rdlfrom = (req.query.rdlfrom || req.query.responseFrom || req.query.response_from || '').toString().trim() || undefined
    const rdlto = (req.query.rdlto || req.query.responseTo || req.query.response_to || '').toString().trim() || undefined

    const postedFromRaw = (req.query.postedFrom || req.query.posted_from || '').toString().trim()
    const postedToRaw = (req.query.postedTo || req.query.posted_to || '').toString().trim()
    const now = new Date()
    const postedTo = postedToRaw || formatMmDdYyyy(now)
    const from = new Date(now)
    from.setDate(from.getDate() - 30)
    const postedFrom = postedFromRaw || formatMmDdYyyy(from)

    const apiUrl = 'https://api.sam.gov/opportunities/v2/search'
    const params = {
      api_key: apiKey,
      limit,
      offset,
      postedFrom,
      postedTo,
      ...(rdlfrom ? { rdlfrom } : {}),
      ...(rdlto ? { rdlto } : {}),
      ...(ptype ? { ptype } : {}),
      ...(title ? { title } : {}),
      ...(state ? { state } : {}),
      ...(ncode ? { ncode } : {})
    }

    const response = await axios.get(apiUrl, { params, timeout: 30000 })
    const raw = response.data
    const items = Array.isArray(raw?.opportunitiesData) ? raw.opportunitiesData : (Array.isArray(raw) ? raw : [])

    if (!items.length) {
      return res.status(404).json({
        error: 'No opportunities found',
        message: 'Try adjusting postedFrom/postedTo, title, state, ncode, or ptype.',
        hint: 'Example: /api/example/samgov/agency-report?postedFrom=01/01/2026&postedTo=02/09/2026&ptype=o&limit=500'
      })
    }

    const grouped = new Map()
    for (const o of items) {
      const agency = shortenSamgovOrganization(o?.fullParentPathName, o?.organizationName) || 'Unknown Agency'
      const awardAmountRaw = o?.award?.amount
      const awardAmount = awardAmountRaw == null || awardAmountRaw === '' ? null : Number(String(awardAmountRaw).replace(/[$,\s]/g, ''))

      if (!grouped.has(agency)) {
        grouped.set(agency, {
          agency,
          opportunity_count: 0,
          known_award_count: 0,
          total_award_amount: 0,
          states: new Set(),
          setAsideTypes: new Set(),
        })
      }

      const rec = grouped.get(agency)
      rec.opportunity_count += 1
      if (Number.isFinite(awardAmount) && awardAmount > 0) {
        rec.total_award_amount += awardAmount
        rec.known_award_count += 1
      }

      const popState = o?.placeOfPerformance?.state?.code || o?.placeOfPerformance?.state || o?.officeAddress?.state || ''
      if (popState) rec.states.add(String(popState))
      const sa = o?.setAside || o?.typeOfSetAsideDescription || ''
      if (sa) rec.setAsideTypes.add(String(sa))
    }

    const reportRows = Array.from(grouped.values())
      .map((r) => ({
        agency: r.agency,
        opportunity_count: r.opportunity_count,
        total_award_amount: Number(r.total_award_amount.toFixed(2)),
        avg_award_amount: r.known_award_count > 0 ? Number((r.total_award_amount / r.known_award_count).toFixed(2)) : 0,
        known_award_count: r.known_award_count,
        states_covered: Array.from(r.states).sort().join(', '),
        set_aside_types: Array.from(r.setAsideTypes).sort().join(' | ')
      }))
      .sort((a, b) => (b.opportunity_count - a.opportunity_count) || (b.total_award_amount - a.total_award_amount))

    const columns = Object.keys(reportRows[0] || {})
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(reportRows, columns)
    const processedData = processDataPreservingNumbers(reportRows, numericColumns)

    return res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'SAM.gov Opportunities API (Agency Report)',
      filters: { postedFrom, postedTo, rdlfrom, rdlto, limit, offset, ptype, title, state, ncode }
    })
  } catch (error) {
    console.error('Error fetching SAM.gov agency report:', error.message)
    const status = error.response?.status
    const data = error.response?.data
    if (status) {
      return res.status(502).json({
        error: 'SAM.gov API error',
        status,
        message: data?.message || data?.error || error.message,
        docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
      })
    }
    return res.status(500).json({
      error: 'Failed to fetch SAM.gov agency report',
      message: error.message,
      docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
    })
  }
})

// Route to fetch opportunity rows for a specific agency from SAM.gov
// Endpoint: /api/example/samgov/agency-opportunities?agency=<agency name>
router.get('/samgov/agency-opportunities', async (req, res) => {
  try {
    const apiKey = (process.env.SAM_GOV_API_KEY || req.query.api_key || '').toString().trim()
    if (!apiKey) {
      return res.status(503).json({
        error: 'SAM.gov API key not configured',
        message: 'Set SAM_GOV_API_KEY in backend environment (.env) to use this dataset.',
        docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
      })
    }

    const agency = (req.query.agency || '').toString().trim()
    if (!agency) {
      return res.status(400).json({
        error: 'Missing agency parameter',
        message: 'Provide agency name via ?agency=...'
      })
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 500, 1), 1000)
    const offset = Math.max(parseInt(req.query.offset) || 0, 0)
    const ptype = (req.query.ptype || '').toString().trim() || undefined
    const rdlfrom = (req.query.rdlfrom || req.query.responseFrom || req.query.response_from || '').toString().trim() || undefined
    const rdlto = (req.query.rdlto || req.query.responseTo || req.query.response_to || '').toString().trim() || undefined
    const updatedWithinDaysRaw = (req.query.updatedWithinDays || req.query.updated_within_days || req.query.updatedDays || '').toString().trim()
    const updatedWithinDays = updatedWithinDaysRaw ? parseInt(updatedWithinDaysRaw, 10) : NaN
    const updatedFromRaw = (req.query.updatedFrom || req.query.updated_from || '').toString().trim()
    const updatedToRaw = (req.query.updatedTo || req.query.updated_to || '').toString().trim()
    const wantsUpdatedFilter =
      (Number.isFinite(updatedWithinDays) && updatedWithinDays > 0) || Boolean(updatedFromRaw) || Boolean(updatedToRaw)
    const postedFromRaw = (req.query.postedFrom || req.query.posted_from || '').toString().trim()
    const postedToRaw = (req.query.postedTo || req.query.posted_to || '').toString().trim()

    const now = new Date()
    const postedTo = postedToRaw || formatMmDdYyyy(now)
    const from = new Date(now)
    // Keep the request safely inside SAM.gov's 1-year max range.
    from.setDate(from.getDate() - (wantsUpdatedFilter ? 364 : 30))
    const postedFrom = postedFromRaw || formatMmDdYyyy(from)

    const apiUrl = 'https://api.sam.gov/opportunities/v2/search'
    const params = {
      api_key: apiKey,
      limit,
      offset,
      postedFrom,
      postedTo,
      ...(rdlfrom ? { rdlfrom } : {}),
      ...(rdlto ? { rdlto } : {}),
      ...(ptype ? { ptype } : {}),
    }

    const response = await axios.get(apiUrl, { params, timeout: 30000 })
    const raw = response.data
    const items = Array.isArray(raw?.opportunitiesData) ? raw.opportunitiesData : (Array.isArray(raw) ? raw : [])
    const agencyLower = agency.toLowerCase()
    const filteredItems = items.filter((o) => {
      const org = (o?.fullParentPathName || o?.organizationName || '').toString().toLowerCase()
      return org.includes(agencyLower)
    })

    if (!filteredItems.length) {
      return res.status(404).json({
        error: 'No opportunities found for agency',
        message: `No opportunities matched agency: ${agency}`,
        hint: 'Try a broader agency term or a wider date range.'
      })
    }

    let transformedData = filteredItems.map((o) => {
      const rawState = o?.placeOfPerformance?.state ?? o?.officeAddress?.state ?? ''
      const popState = normalizeSamgovState(rawState)
      const awardAmountRaw = o?.award?.amount
      const award_amount = awardAmountRaw == null || awardAmountRaw === '' ? null : Number(String(awardAmountRaw).replace(/[$,\s]/g, ''))
      return {
        noticeId: o.noticeId || '',
        title: o.title || '',
        solicitationNumber: o.solicitationNumber || '',
        postedDate: o.postedDate || '',
        updatedDate: getSamgovUpdatedDateValue(o),
        responseDeadLine: o.responseDeadLine || '',
        type: o.type || '',
        baseType: o.baseType || '',
        active: o.active || '',
        organization: shortenSamgovOrganization(o.fullParentPathName, o.organizationName),
        naicsCode: o.naicsCode || '',
        classificationCode: o.classificationCode || '',
        setAside: o.setAside || o.typeOfSetAsideDescription || '',
        state: popState,
        uiLink: o.uiLink || '',
        award_amount: Number.isFinite(award_amount) ? award_amount : null,
        opportunity_count: 1
      }
    })

    if (wantsUpdatedFilter) {
      const nowMs = Date.now()
      const fromMs = Number.isFinite(updatedWithinDays) && updatedWithinDays > 0
        ? nowMs - updatedWithinDays * 24 * 60 * 60 * 1000
        : parseFlexibleDateToMs(updatedFromRaw, { endOfDay: false })
      const toMs = Number.isFinite(updatedWithinDays) && updatedWithinDays > 0
        ? nowMs
        : parseFlexibleDateToMs(updatedToRaw, { endOfDay: true })

      transformedData = transformedData.filter((row) => {
        const uMs = parseFlexibleDateToMs(row?.updatedDate)
        if (uMs == null) return false
        if (fromMs != null && uMs < fromMs) return false
        if (toMs != null && uMs > toMs) return false
        return true
      })
    }

    if (!transformedData.length) {
      return res.status(404).json({
        error: 'No opportunities found for agency',
        message: wantsUpdatedFilter
          ? `No opportunities for agency matched the updated date filter: ${agency}`
          : `No opportunities matched agency: ${agency}`,
        hint: wantsUpdatedFilter ? 'Try widening updatedWithinDays or adjusting updatedFrom/updatedTo.' : 'Try a broader agency term or a wider date range.'
      })
    }

    const columns = Object.keys(transformedData[0] || {})
    const { numericColumns: detectedNumericColumns, categoricalColumns: detectedCategoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    const forceCategorical = new Set(['naicsCode', 'solicitationNumber', 'classificationCode', 'setAside', 'noticeId'])
    const numericColumns = detectedNumericColumns.filter((c) => !forceCategorical.has(c))
    if (columns.includes('opportunity_count') && !numericColumns.includes('opportunity_count')) {
      numericColumns.push('opportunity_count')
    }
    if (columns.includes('award_amount') && !numericColumns.includes('award_amount')) {
      numericColumns.push('award_amount')
    }
    const categoricalColumns = Array.from(new Set([...detectedCategoricalColumns, ...Array.from(forceCategorical)]))
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)

    return res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'SAM.gov Opportunities API (Agency Drill-down)',
      filters: { agency, postedFrom, postedTo, rdlfrom, rdlto, limit, offset, ptype, updatedWithinDays, updatedFrom: updatedFromRaw, updatedTo: updatedToRaw },
      notes: wantsUpdatedFilter
        ? [
            'SAM.gov Get Opportunities Public API v2 does not expose an explicit "Updated Date" field; "updatedDate" is best-effort and may fall back to postedDate.',
          ]
        : undefined,
    })
  } catch (error) {
    console.error('Error fetching SAM.gov agency opportunities:', error.message)
    const status = error.response?.status
    const data = error.response?.data
    if (status) {
      return res.status(502).json({
        error: 'SAM.gov API error',
        status,
        message: data?.message || data?.error || error.message,
        docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
      })
    }
    return res.status(500).json({
      error: 'Failed to fetch SAM.gov agency opportunities',
      message: error.message,
      docs: 'https://open.gsa.gov/api/get-opportunities-public-api/'
    })
  }
})

// Route to fetch SAM.gov Entity "data bank" (Entity Information API)
// Docs: https://open.gsa.gov/api/entity-api/
// Endpoint: /api/example/samgov/databank
router.get('/samgov/databank', async (req, res) => {
  try {
    const apiKey = (process.env.SAM_GOV_API_KEY || req.query.api_key || '').toString().trim()
    if (!apiKey) {
      return res.status(503).json({
        error: 'SAM.gov API key not configured',
        message: 'Set SAM_GOV_API_KEY in backend environment (.env) to use this dataset.',
        docs: 'https://open.gsa.gov/api/entity-api/'
      })
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1)
    // SAM Entity API is strict on page size; keep within supported window.
    const size = Math.min(Math.max(parseInt(req.query.size) || 10, 1), 10)
    const q = (req.query.q || req.query.keyword || req.query.name || '').toString().trim() || undefined
    const ueiSAM = (req.query.uei || req.query.ueiSAM || '').toString().trim() || undefined
    const legalBusinessName = (req.query.legalBusinessName || '').toString().trim() || undefined
    const naicsCode = (req.query.naicsCode || req.query.naics || '').toString().trim() || undefined
    const registrationStatus = (req.query.registrationStatus || '').toString().trim() || undefined

    const cacheKey = JSON.stringify({ page, size, q, ueiSAM, legalBusinessName, naicsCode, registrationStatus })
    const cached = samgovEntityCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < SAMGOV_CACHE_TTL_MS) {
      res.setHeader('X-Cache', 'HIT')
      return res.json(cached.payload)
    }
    res.setHeader('X-Cache', 'MISS')

    const apiUrl = 'https://api.sam.gov/entity-information/v4/entities'
    const params = {
      api_key: apiKey,
      page,
      size,
      ...(q ? { q } : {}),
      ...(ueiSAM ? { ueiSAM } : {}),
      ...(legalBusinessName ? { legalBusinessName } : {}),
      ...(naicsCode ? { naicsCode } : {}),
      ...(registrationStatus ? { registrationStatus } : {}),
    }

    const response = await axios.get(apiUrl, { params, timeout: 20000 })
    const raw = response.data
    const items = Array.isArray(raw?.entityData)
      ? raw.entityData
      : Array.isArray(raw?.entities)
        ? raw.entities
        : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
            ? raw.data
            : Array.isArray(raw)
              ? raw
              : []

    if (!items.length) {
      return res.status(404).json({
        error: 'No entities found',
        message: 'Try adjusting q/name/ueiSAM/naicsCode/registrationStatus filters.',
        hint: 'Example: /api/example/samgov/databank?q=information%20technology&size=10',
        docs: 'https://open.gsa.gov/api/entity-api/'
      })
    }

    const transformedData = items.map((e) => {
      const core = e?.entityRegistration || e?.coreData || e || {}
      const addr = core?.physicalAddress || e?.physicalAddress || {}
      const naicsList = e?.naicsList || core?.naicsList || e?.naicsCodes || []
      const businessTypes = e?.businessTypes || core?.businessTypes || []

      const uei = core?.ueiSAM || e?.ueiSAM || e?.uei || ''
      const entityName = core?.legalBusinessName || e?.legalBusinessName || e?.entityName || ''
      const naicsPrimary = e?.naicsCode || core?.naicsCode || (Array.isArray(naicsList) && naicsList[0]?.naicsCode) || ''

      return {
        ueiSAM: uei,
        legalBusinessName: entityName,
        registrationStatus: core?.registrationStatus || e?.registrationStatus || '',
        registrationDate: core?.registrationDate || e?.registrationDate || '',
        expirationDate: core?.expirationDate || e?.expirationDate || '',
        cageCode: core?.cageCode || e?.cageCode || '',
        naicsCode: naicsPrimary,
        state: addr?.stateOrProvinceCode || addr?.state || e?.state || '',
        country: addr?.countryCode || addr?.country || e?.country || '',
        businessTypes: Array.isArray(businessTypes)
          ? businessTypes.map((b) => b?.businessTypeDesc || b?.businessTypeCode || b).filter(Boolean).join('; ')
          : String(businessTypes || ''),
        samEntityLink: uei ? `https://sam.gov/entity/${uei}` : ''
      }
    })

    const columns = Object.keys(transformedData[0] || {})
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    // Treat classification-like fields as categorical even if numeric-like.
    const forceCategorical = new Set(['ueiSAM', 'cageCode', 'naicsCode'])
    const safeNumericColumns = numericColumns.filter((c) => !forceCategorical.has(c))
    const safeCategoricalColumns = Array.from(new Set([...categoricalColumns, ...Array.from(forceCategorical)]))
    const processedData = processDataPreservingNumbers(transformedData, safeNumericColumns)

    const payload = {
      data: processedData,
      columns,
      numericColumns: safeNumericColumns,
      categoricalColumns: safeCategoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'SAM.gov Entity Information API (Data Bank)',
      filters: { page, size, q, ueiSAM, legalBusinessName, naicsCode, registrationStatus }
    }

    samgovEntityCache.set(cacheKey, { ts: Date.now(), payload })
    return res.json(payload)
  } catch (error) {
    console.error('Error fetching SAM.gov entity data bank:', error.message)
    const status = error.response?.status
    const data = error.response?.data
    if (status) {
      return res.status(502).json({
        error: 'SAM.gov API error',
        status,
        message: data?.message || data?.error || error.message,
        hint: status === 400 ? 'Entity API may reject page size > 10. Try size=10.' : undefined,
        docs: 'https://open.gsa.gov/api/entity-api/'
      })
    }
    return res.status(500).json({
      error: 'Failed to fetch SAM.gov data bank',
      message: error.message,
      docs: 'https://open.gsa.gov/api/entity-api/'
    })
  }
})

// Drill-down: fetch subawards/subcontractors for a set of prime award IDs
// Usage: GET /api/example/usaspending/subawards?award_ids=ID1,ID2,...&limit=200
router.get('/usaspending/subawards', async (req, res) => {
  try {
    const awardIdsRaw = (req.query.award_ids || '').toString().trim()
    const limit = Math.min(parseInt(req.query.limit) || 200, 500)

    if (!awardIdsRaw) {
      return res.status(400).json({
        error: 'Missing award_ids',
        message: 'Provide award_ids as a comma-separated list.',
      })
    }

    // Cap to avoid hammering the API
    const awardIds = awardIdsRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10)

    // NOTE: USASpending subaward data is queried through the search endpoint
    // with filters for prime_award_id. Subawards are returned as regular awards
    // that have a parent award relationship.
    const apiUrl = 'https://api.usaspending.gov/api/v2/search/spending_by_award/'

    const allResults = []

    for (const award_id of awardIds) {
      // Try different filter approaches - USASpending API may not support prime_award_id filter
      // Try using the search endpoint with parent_award_id or related filters
      const body = {
        filters: {
          // Try parent_award_id or prime_award_id - API may use different field names
          parent_award_id: award_id,
          award_type_codes: ['A', 'C'],
        },
        fields: [
          'Award ID',
          'Award Amount',
          'Recipient Name',
          'Start Date',
          'Awarding Agency',
          'Description',
        ],
        page: 1,
        limit: Math.min(limit, 500),
        sort: 'Award Amount',
        order: 'desc',
      }

      try {
        const resp = await axios.post(apiUrl, body, {
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          timeout: 30000,
        })
        const results = resp.data?.results || resp.data?.data || []
        if (results.length > 0) {
          results.forEach((r) => allResults.push({ ...r, __prime_award_id: award_id }))
        } else {
          // If parent_award_id doesn't work, try prime_award_id
          const body2 = {
            filters: {
              prime_award_id: award_id,
              award_type_codes: ['A', 'C'],
            },
            fields: [
              'Award ID',
              'Award Amount',
              'Recipient Name',
              'Start Date',
              'Awarding Agency',
              'Description',
            ],
            page: 1,
            limit: Math.min(limit, 500),
            sort: 'Award Amount',
            order: 'desc',
          }
          try {
            const resp2 = await axios.post(apiUrl, body2, {
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              timeout: 30000,
            })
            const results2 = resp2.data?.results || resp2.data?.data || []
            results2.forEach((r) => allResults.push({ ...r, __prime_award_id: award_id }))
          } catch (e2) {
            // Both approaches failed - this award may not have subawards or API doesn't support this filter
            console.log(`No subawards found for award_id: ${award_id} (tried parent_award_id and prime_award_id)`)
          }
        }
      } catch (e) {
        // If one award id fails, continue with others
        console.error('Subawards fetch failed for award_id:', award_id, e?.response?.status || e?.message)
        if (e?.response?.data) {
          console.error('Error details:', JSON.stringify(e.response.data).substring(0, 200))
        }
      }
    }

    // Transform into a generic table
    // The API returns awards with fields like 'Recipient Name', 'Award Amount', etc.
    const transformed = allResults.map((r) => {
      const subName = r['Recipient Name'] || r.recipient_name || 'Unknown'
      const subAmount = parseFloat(r['Award Amount'] || r.award_amount || 0)
      const subDate = r['Start Date'] || r.start_date || r.action_date || ''
      const primeAwardId = r.__prime_award_id || ''
      const desc = r.Description || r.description || ''

      return {
        'Prime Award ID': primeAwardId,
        'Subcontractor Name': subName,
        'Subaward Amount': subAmount,
        'Subaward Date': subDate,
        Description: desc,
      }
    })

    const columns = ['Prime Award ID', 'Subcontractor Name', 'Subaward Amount', 'Subaward Date', 'Description']
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformed, columns)

    return res.json({
      data: transformed,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: transformed.length,
      source: 'USASpending.gov API (Subawards)',
      note: 'Subaward coverage varies by award; some primes may have no reported subawards.',
    })
  } catch (err) {
    console.error('Subawards route error:', err)
    return res.status(500).json({
      error: 'Failed to fetch subawards',
      message: err?.message || 'Unknown error',
    })
  }
})

// Network visualization example - ideal for SAS Visual Investigator style analysis
router.get('/network', (req, res) => {
  try {
    // Read the network data CSV file
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '../../sample-network-data.csv'), // From backend/routes/
      path.join(__dirname, '../../../sample-network-data.csv'), // Alternative
      path.join(process.cwd(), 'sample-network-data.csv') // From project root
    ]
    
    let csvPath = null
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        csvPath = testPath
        break
      }
    }
    
    if (!csvPath) {
      console.error('Network data file not found. Tried paths:', possiblePaths)
      console.error('__dirname:', __dirname)
      console.error('process.cwd():', process.cwd())
      return res.status(404).json({ 
        error: 'Network example data file not found',
        message: `File not found. Tried: ${possiblePaths.join(', ')}`,
        currentDir: __dirname,
        cwd: process.cwd()
      })
    }
    
    console.log('Loading network data from:', csvPath)
    
    let csvContent
    try {
      csvContent = fs.readFileSync(csvPath, 'utf-8')
      console.log('CSV file read successfully, length:', csvContent.length)
    } catch (readError) {
      console.error('Error reading CSV file:', readError)
      return res.status(500).json({
        error: 'Failed to read network data file',
        message: readError.message
      })
    }
    
    // Use papaparse for proper CSV parsing (handles quoted fields, commas in values, etc.)
    let parseResult
    try {
      parseResult = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        transform: (value) => value.trim()
      })
      console.log('CSV parsed successfully, rows:', parseResult.data.length)
    } catch (parseError) {
      console.error('Error parsing CSV:', parseError)
      return res.status(500).json({
        error: 'Failed to parse CSV file',
        message: parseError.message
      })
    }

    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn('CSV parsing warnings:', parseResult.errors)
    }

    const data = parseResult.data.filter(row => {
      // Filter out completely empty rows
      return Object.values(row).some(val => val && val.toString().trim() !== '')
    })

    if (data.length === 0) {
      return res.status(400).json({ 
        error: 'No data found',
        message: 'CSV file contains no valid data rows'
      })
    }

    console.log('Filtered data rows:', data.length)

    // Try to parse Amount column as number
    const processedData = data.map(row => {
      const processed = { ...row }
      if (processed.Amount && !isNaN(processed.Amount)) {
        processed.Amount = parseFloat(processed.Amount)
      }
      return processed
    })

    // Detect column types
    let columnTypes
    let finalData
    try {
      columnTypes = detectColumnTypes(processedData)
      console.log('Column types detected:', {
        numeric: columnTypes.numericColumns,
        categorical: columnTypes.categoricalColumns,
        date: columnTypes.dateColumns
      })
      finalData = processDataPreservingNumbers(processedData, columnTypes.numericColumns)
    } catch (detectError) {
      console.error('Error detecting column types:', detectError)
      return res.status(500).json({
        error: 'Failed to process data',
        message: detectError.message
      })
    }

    const columns = Object.keys(finalData[0] || {})

    console.log(`Network example loaded: ${finalData.length} rows, ${columns.length} columns`)

    res.json({
      data: finalData,
      columns: columns,
      numericColumns: columnTypes.numericColumns,
      categoricalColumns: columnTypes.categoricalColumns,
      dateColumns: columnTypes.dateColumns,
      rowCount: finalData.length
    })
  } catch (error) {
    console.error('Error loading network example:', error)
    res.status(500).json({ 
      error: 'Failed to load network example data',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// Route to fetch unemployment rate data from BLS API
router.get('/unemployment', async (req, res) => {
  try {
    // Get query parameters
    const startYear = parseInt(req.query.start_year) || new Date().getFullYear() - 5 // Default to last 5 years
    const endYear = parseInt(req.query.end_year) || new Date().getFullYear()
    const blsApiKey = process.env.BLS_API_KEY || null // Optional API key for v2.0 (v1.0 works without key)
    
    // BLS API endpoint
    const apiUrl = 'https://api.bls.gov/publicAPI/v2/timeseries/data/'
    
    // National unemployment rate series ID
    const seriesId = 'LNS14000000' // U.S. unemployment rate, seasonally adjusted
    
    // Build request body
    const requestBody = {
      seriesid: [seriesId],
      startyear: startYear.toString(),
      endyear: endYear.toString(),
      registrationkey: blsApiKey || undefined // Only include if API key is provided
    }
    
    // Remove undefined values
    if (!requestBody.registrationkey) {
      delete requestBody.registrationkey
    }
    
    console.log('Fetching BLS unemployment data from:', apiUrl)
    console.log('Request parameters:', { startYear, endYear, hasApiKey: !!blsApiKey })
    
    // Fetch data from BLS API
    let response
    try {
      response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      })
    } catch (apiError) {
      if (apiError.response) {
        console.error('BLS API Error Response:', {
          status: apiError.response.status,
          statusText: apiError.response.statusText,
          data: JSON.stringify(apiError.response.data, null, 2)
        })
        throw new Error(`BLS API error (${apiError.response.status}): ${JSON.stringify(apiError.response.data)}`)
      }
      throw apiError
    }
    
    const apiData = response.data
    console.log('BLS API response status:', response.status)
    console.log('BLS API status:', apiData.status)
    
    // Check for API errors
    if (apiData.status !== 'REQUEST_SUCCEEDED') {
      const errorMessage = apiData.message?.[0] || 'Unknown error from BLS API'
      console.error('BLS API error:', errorMessage)
      return res.status(500).json({
        error: 'BLS API request failed',
        message: errorMessage,
        hint: 'The BLS API may require registration for v2.0. You can register at https://www.bls.gov/developers/api_signature_v2.htm',
        documentation: 'https://www.bls.gov/developers/api_signature_v2.htm'
      })
    }
    
    // Extract data from response
    const results = apiData.Results?.series?.[0]?.data || []
    
    if (results.length === 0) {
      return res.status(404).json({
        error: 'No unemployment data found',
        message: `No data available for the period ${startYear}-${endYear}`,
        hint: 'Try adjusting the start_year and end_year parameters'
      })
    }
    
    // Transform BLS data to our format
    // BLS returns data in reverse chronological order (newest first)
    // We'll reverse it to show oldest first for better time series visualization
    const transformedData = results
      .reverse()
      .map((item) => {
        // BLS format: year, period (M01-M12 for months), value
        const year = item.year
        const period = item.period
        const month = period.replace('M', '') // Convert M01 to 01, M12 to 12
        const monthName = new Date(year, parseInt(month) - 1).toLocaleString('default', { month: 'long' })
        const date = `${year}-${month.padStart(2, '0')}-01` // Use first day of month
        const unemploymentRate = parseFloat(item.value)
        
        return {
          Date: date,
          Year: year.toString(),
          Month: monthName,
          'Unemployment Rate (%)': unemploymentRate,
          Period: period
        }
      })
    
    // Process the data
    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)
    
    res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'Bureau of Labor Statistics (BLS) API',
      series: 'LNS14000000 (U.S. Unemployment Rate, Seasonally Adjusted)',
      filters: {
        start_year: startYear,
        end_year: endYear
      },
      note: blsApiKey 
        ? 'Using BLS API v2.0 with registration key' 
        : 'Using BLS API v1.0 (no registration required). For higher rate limits, register at https://www.bls.gov/developers/api_signature_v2.htm'
    })
  } catch (error) {
    console.error('Error fetching BLS unemployment data:', error.message)
    if (error.response) {
      res.status(500).json({
        error: 'Failed to fetch unemployment data',
        message: error.message,
        apiError: error.response.data,
        status: error.response.status,
        hint: 'The BLS API may be temporarily unavailable. Check https://www.bls.gov/developers/ for status.',
        documentation: 'https://www.bls.gov/developers/api_signature_v2.htm'
      })
    } else if (error.request) {
      res.status(500).json({
        error: 'Failed to fetch unemployment data',
        message: 'No response from BLS API',
        hint: 'The BLS API may be temporarily unavailable. Check your internet connection.',
        documentation: 'https://www.bls.gov/developers/api_signature_v2.htm'
      })
    } else {
      res.status(500).json({
        error: 'Failed to fetch unemployment data',
        message: error.message,
        hint: 'Check backend logs for more details.',
        documentation: 'https://www.bls.gov/developers/api_signature_v2.htm'
      })
    }
  }
})

// CDC Health Data API - Disease Surveillance and Health Statistics
router.get('/cdc-health', async (req, res) => {
  try {
    // Get query parameters
    const startYear = parseInt(req.query.start_year) || new Date().getFullYear() - 5 // Default to last 5 years
    const endYear = parseInt(req.query.end_year) || new Date().getFullYear()
    const metric = req.query.metric || 'mortality' // mortality, birth_rate, life_expectancy, or 'all' for all metrics
    
    // CDC Data API endpoint - Using CDC Wonder API alternative or public health data
    // For this implementation, we'll use a CDC public dataset endpoint
    // Note: CDC doesn't have a unified REST API like BLS, so we'll use their data portal
    
    // Using CDC's public health statistics from data.cdc.gov
    // This is a simplified example - in production, you'd use CDC Wonder API or specific dataset endpoints
    const apiUrl = 'https://data.cdc.gov/resource/'
    
    // For demonstration, we'll create sample health data based on CDC patterns
    // In production, you would call actual CDC API endpoints
    console.log('Fetching CDC health data')
    console.log('Request parameters:', { startYear, endYear, metric })
    
    // Generate health statistics data (in production, this would come from CDC API)
    const transformedData = []
    const currentYear = new Date().getFullYear()
    
    // Determine which metrics to include
    const metricsToInclude = metric === 'all' 
      ? ['mortality', 'birth_rate', 'life_expectancy']
      : [metric]
    
    // Generate monthly data for the requested range
    for (let year = startYear; year <= endYear; year++) {
      for (let month = 1; month <= 12; month++) {
        // Skip future months
        if (year === currentYear && month > new Date().getMonth() + 1) {
          break
        }
        
        const date = `${year}-${String(month).padStart(2, '0')}-01`
        const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
        
        // Generate data for each metric
        for (const currentMetric of metricsToInclude) {
          // Simulate health metrics (in production, fetch from CDC API)
          // These are example values - replace with actual API calls
          let healthMetric = 0
          let metricName = ''
          
          if (currentMetric === 'mortality') {
            // Age-adjusted death rate per 100,000 (example values)
            healthMetric = 750 + Math.random() * 50 - (year - startYear) * 2 // Decreasing trend
            metricName = 'Death Rate (per 100,000)'
          } else if (currentMetric === 'birth_rate') {
            // Births per 1,000 population (example values)
            healthMetric = 12 + Math.random() * 1
            metricName = 'Birth Rate (per 1,000)'
          } else if (currentMetric === 'life_expectancy') {
            // Life expectancy in years (example values)
            healthMetric = 78 + (year - startYear) * 0.1 + Math.random() * 0.5 // Increasing trend
            metricName = 'Life Expectancy (years)'
          }
          
          transformedData.push({
            Date: date,
            Year: year.toString(),
            Month: monthName,
            'Health Metric': parseFloat(healthMetric.toFixed(2)),
            Metric: metricName,
            Period: `M${String(month).padStart(2, '0')}`
          })
        }
      }
    }
    
    if (transformedData.length === 0) {
      return res.status(404).json({
        error: 'No health data found',
        message: `No data available for the period ${startYear}-${endYear}`,
        hint: 'Try adjusting the start_year and end_year parameters'
      })
    }
    
    // Process the data
    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    
    // Ensure 'Metric' column is always included in categoricalColumns for filtering
    if (!categoricalColumns.includes('Metric') && columns.includes('Metric')) {
      categoricalColumns.push('Metric')
    }
    
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)
    
    res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'Centers for Disease Control and Prevention (CDC)',
      metric: metric,
      filters: {
        start_year: startYear,
        end_year: endYear,
        metric: metric
      },
      note: 'This is a demonstration endpoint. For production use, integrate with CDC Wonder API or specific CDC dataset APIs. See https://wonder.cdc.gov/ for CDC data access.'
    })
  } catch (error) {
    console.error('Error fetching CDC health data:', error.message)
    res.status(500).json({
      error: 'Failed to fetch health data',
      message: error.message,
      hint: 'The CDC API may be temporarily unavailable. Check https://wonder.cdc.gov/ for CDC data access.',
      documentation: 'https://wonder.cdc.gov/'
    })
  }
})

// Government Budget Data API - Federal Budget and Fiscal Data
router.get('/government-budget', async (req, res) => {
  try {
    // Get query parameters
    const startYear = parseInt(req.query.start_year) || new Date().getFullYear() - 5 // Default to last 5 years
    const endYear = parseInt(req.query.end_year) || new Date().getFullYear()
    const category = req.query.category || 'all' // all, defense, healthcare, education, infrastructure, etc.
    
    // Treasury Fiscal Data API endpoint
    // Using fiscaldata.treasury.gov for federal budget data
    // Note: This is a demonstration - in production, use actual Treasury API endpoints
    console.log('Fetching government budget data')
    console.log('Request parameters:', { startYear, endYear, category })
    
    // Fetch real government budget data from Treasury Fiscal Data API
    // Using Treasury's API for federal budget receipts and outlays
    const transformedData = []
    const currentYear = new Date().getFullYear()
    
    try {
      // Treasury Fiscal Data API endpoint for federal budget
      // Using the "Receipts, Outlays, and Surplus or Deficit" dataset
      const treasuryApiUrl = 'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/rcpt_outlays'
      
      console.log('Fetching real budget data from Treasury API:', treasuryApiUrl)
      
      // Build query parameters for Treasury API
      const treasuryParams = {
        filter: `record_date:gte:${startYear}-01-01,record_date:lte:${endYear}-12-31`,
        sort: 'record_date',
        page: { size: 1000 } // Get up to 1000 records
      }
      
      // Fetch from Treasury API
      const treasuryResponse = await axios.get(treasuryApiUrl, {
        params: treasuryParams,
        headers: {
          'Accept': 'application/json'
        },
        timeout: 30000
      })
      
      if (treasuryResponse.data && treasuryResponse.data.data && treasuryResponse.data.data.length > 0) {
        // Transform Treasury API data to our format
        treasuryResponse.data.data.forEach((item) => {
          const recordDate = item.record_date
          const year = new Date(recordDate).getFullYear()
          const month = new Date(recordDate).getMonth() + 1
          const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
          
          // Treasury API provides: receipts, outlays, surplus_or_deficit
          // We'll create categories from these
          const categories = []
          
          if (item.receipts) {
            categories.push({
              'Fiscal Year': year.toString(),
              'Year': year.toString(),
              'Month': monthName,
              'Budget Category': 'Receipts',
              'Budget Amount (Billions $)': parseFloat((parseFloat(item.receipts) / 1000).toFixed(2)), // Convert millions to billions
              'Date': recordDate
            })
          }
          
          if (item.outlays) {
            categories.push({
              'Fiscal Year': year.toString(),
              'Year': year.toString(),
              'Month': monthName,
              'Budget Category': 'Outlays',
              'Budget Amount (Billions $)': parseFloat((parseFloat(item.outlays) / 1000).toFixed(2)),
              'Date': recordDate
            })
          }
          
          if (item.surplus_or_deficit) {
            categories.push({
              'Fiscal Year': year.toString(),
              'Year': year.toString(),
              'Month': monthName,
              'Budget Category': 'Surplus/Deficit',
              'Budget Amount (Billions $)': parseFloat((parseFloat(item.surplus_or_deficit) / 1000).toFixed(2)),
              'Date': recordDate
            })
          }
          
          transformedData.push(...categories)
        })
        
        console.log('Successfully fetched real budget data from Treasury API:', transformedData.length, 'records')
      } else {
        throw new Error('No data returned from Treasury API')
      }
    } catch (apiError) {
      console.warn('Failed to fetch from Treasury API, using fallback data:', apiError.message)
      
      // Fallback to demonstration data if API fails
      // Generate monthly data for better time series visualization
      const budgetCategories = category === 'all' 
        ? ['Defense', 'Healthcare', 'Education', 'Infrastructure', 'Social Security', 'Interest on Debt']
        : [category]
      
      for (let year = startYear; year <= endYear; year++) {
        if (year > currentYear) break
        
        for (let month = 1; month <= 12; month++) {
          // Skip future months
          if (year === currentYear && month > new Date().getMonth() + 1) {
            break
          }
          
          const date = `${year}-${String(month).padStart(2, '0')}-01`
          const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' })
          
          for (const budgetCategory of budgetCategories) {
            // Simulate budget amounts in billions (fallback only)
            // Annual amounts divided by 12 for monthly, with some variation
            let budgetAmount = 0
            const baseAmounts = {
              'Defense': 700,
              'Healthcare': 1200,
              'Education': 80,
              'Infrastructure': 100,
              'Social Security': 1100,
              'Interest on Debt': 300
            }
            
            const base = baseAmounts[budgetCategory] || 100
            const growthFactor = 1 + (year - startYear) * 0.02
            const monthlyBase = (base * growthFactor) / 12 // Annual divided by 12
            const variation = (Math.random() - 0.5) * 0.1 // ±5% variation
            budgetAmount = monthlyBase * (1 + variation)
            
            transformedData.push({
              'Fiscal Year': year.toString(),
              'Year': year.toString(),
              'Month': monthName,
              'Budget Category': budgetCategory,
              'Budget Amount (Billions $)': parseFloat(budgetAmount.toFixed(2)),
              'Date': date
            })
          }
        }
      }
    }
    
    if (transformedData.length === 0) {
      return res.status(404).json({
        error: 'No budget data found',
        message: `No data available for the period ${startYear}-${endYear}`,
        hint: 'Try adjusting the start_year and end_year parameters'
      })
    }
    
    // Process the data
    const columns = Object.keys(transformedData[0])
    const { numericColumns, categoricalColumns, dateColumns } = detectColumnTypes(transformedData, columns)
    
    // Ensure 'Budget Category' column is always included in categoricalColumns for filtering
    if (!categoricalColumns.includes('Budget Category') && columns.includes('Budget Category')) {
      categoricalColumns.push('Budget Category')
    }
    
    const processedData = processDataPreservingNumbers(transformedData, numericColumns)
    
    res.json({
      data: processedData,
      columns,
      numericColumns,
      categoricalColumns,
      dateColumns,
      rowCount: processedData.length,
      source: 'U.S. Treasury Fiscal Data',
      category: category,
      filters: {
        start_year: startYear,
        end_year: endYear,
        category: category
      },
      note: transformedData.length > 0 && transformedData[0]['Budget Category'] === 'Receipts' 
        ? 'Real data from U.S. Treasury Fiscal Data API (https://fiscaldata.treasury.gov/)'
        : 'Using demonstration data. Real Treasury API data will be used when available.'
    })
  } catch (error) {
    console.error('Error fetching government budget data:', error.message)
    res.status(500).json({
      error: 'Failed to fetch budget data',
      message: error.message,
      hint: 'The Treasury API may be temporarily unavailable. Check https://fiscaldata.treasury.gov/ for Treasury data access.',
      documentation: 'https://fiscaldata.treasury.gov/'
    })
  }
})

// Export helper function to get dataset data (for use by other routes)
function getExampleDatasetData(datasetId) {
  const dataset = exampleDatasets[datasetId]
  if (!dataset || !dataset.data) {
    return null
  }
  return dataset.data
}

module.exports = router
module.exports.getExampleDatasetData = getExampleDatasetData

