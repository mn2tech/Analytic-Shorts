const express = require('express')

/**
 * Dependency-free stub router.
 * Some production environments deploy only specific modules; this prevents backend startup failures
 * when AI Health Chat dependencies are not included.
 */

const router = express.Router()

router.post('/ai-health-chat', (_req, res) => {
  res.status(503).json({
    error: 'AI Health Chat not deployed',
    message: 'This environment does not include AI Health Chat dependencies/routes.',
  })
})

module.exports = router
