/**
 * Example routes - re-export from modular example index.
 * Mounted at /api/example in server.js
 */
const exampleRouter = require('./example')

module.exports = exampleRouter
module.exports.getExampleDatasetData = exampleRouter.getExampleDatasetData
