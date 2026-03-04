const express = require('express')
const federalEntryRouter = require('./federalEntry')

const router = express.Router()
router.use('/federal-entry', federalEntryRouter)

module.exports = router
