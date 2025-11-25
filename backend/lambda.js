// Lambda handler wrapper for Express app
const serverless = require('serverless-http')
const app = require('./server')

// Export the Express app wrapped for Lambda
module.exports.handler = serverless(app, {
  binary: ['image/*', 'application/pdf', 'application/zip']
})

