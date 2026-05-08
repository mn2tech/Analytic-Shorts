const express = require('express')
const {
  CODE_REVIEW_SNIPPETS,
  PROMPT_CHALLENGES,
  generateQuestion,
  getFeedback,
  runAssistantAction,
  checkCodeReviewAnswer,
  evaluatePrompt,
} = require('../controllers/crackit.controller')

const router = express.Router()

router.get('/meta', (req, res) => {
  res.json({
    codeReviewSnippets: CODE_REVIEW_SNIPPETS,
    promptChallenges: PROMPT_CHALLENGES,
  })
})

router.post('/generate-question', generateQuestion)
router.post('/feedback', getFeedback)
router.post('/assistant-action', runAssistantAction)
router.post('/check-answer', checkCodeReviewAnswer)
router.post('/evaluate-prompt', evaluatePrompt)

module.exports = router
