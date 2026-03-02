/**
 * Example routes index - combines all example sub-routers.
 * Mounted at /api/example in server.js
 */
const express = require('express')
const { router: apiReportsRouter, visibilityGuard } = require('./apiReports')
const datasetRoutes = require('./datasetRoutes')
const usaspendingRoutes = require('./usaspendingRoutes')
const samgovRoutes = require('./samgovRoutes')
const externalApisRoutes = require('./externalApisRoutes')
const miscRoutes = require('./miscRoutes')
const { exampleDatasets } = require('../../data/exampleDatasets')

const router = express.Router()

// API reports and visibility (must be first)
router.use(apiReportsRouter)
router.use((req, res, next) => visibilityGuard(req, res, next).catch(next))

// Static datasets
router.use(datasetRoutes)

// USAspending
router.use(usaspendingRoutes)

// SAM.gov
router.use(samgovRoutes)

// External APIs (BLS, CDC, Treasury)
router.use(externalApisRoutes)

// Misc (network, sas7bdat)
router.use(miscRoutes)

function getExampleDatasetData(datasetId) {
  const dataset = exampleDatasets[datasetId]
  return dataset?.data ?? null
}

module.exports = router
module.exports.getExampleDatasetData = getExampleDatasetData
