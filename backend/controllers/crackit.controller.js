const { callAnthropicJson } = require('../services/anthropic.service')

const CODE_REVIEW_SNIPPETS = [
  {
    id: 'js-null-guard',
    title: 'Guard Missing on Nested Access',
    language: 'JavaScript',
    description: 'A production function crashes when profile data is incomplete.',
    buggyCode: `function getUserCity(user) {
  return user.profile.address.city.toLowerCase()
}`,
    hint: 'What happens when profile or address is undefined?',
    expectedFix: 'Add optional chaining or defensive null checks before accessing nested fields.',
  },
  {
    id: 'py-off-by-one',
    title: 'Off-by-One in Loop',
    language: 'Python',
    description: 'An interview-style helper skips the final element in a sorted list check.',
    buggyCode: `def is_sorted(arr):
    for i in range(len(arr) - 2):
        if arr[i] > arr[i + 1]:
            return False
    return True`,
    hint: 'Check loop bounds when comparing adjacent values.',
    expectedFix: 'Iterate to len(arr) - 1 so every adjacent pair is validated.',
  },
  {
    id: 'js-async-await',
    title: 'Missing Await on Async Step',
    language: 'JavaScript',
    description: 'A fetch helper returns before JSON parsing resolves.',
    buggyCode: `async function loadOrders() {
  const res = await fetch('/api/orders')
  const payload = res.json()
  return payload.orders
}`,
    hint: 'One asynchronous call still returns a Promise.',
    expectedFix: 'Await res.json() before dereferencing payload.orders.',
  },
]

const PROMPT_CHALLENGES = [
  {
    id: 'sql-analytics',
    task: 'Generate a SQL query for top 5 products by revenue in the last 30 days.',
    badExamplePrompt: 'Write SQL for revenue stuff fast.',
    hint: 'Specify schema fields, filters, ordering, and output columns.',
  },
  {
    id: 'refactor-code',
    task: 'Refactor a React component for readability and performance.',
    badExamplePrompt: 'Improve this component.',
    hint: 'Define coding standards, constraints, and expected output format.',
  },
  {
    id: 'debug-api',
    task: 'Debug a failing API response returning intermittent 500 errors.',
    badExamplePrompt: 'Fix this API bug.',
    hint: 'Include symptoms, logs, hypotheses, and required diagnostic steps.',
  },
]

function parseSafeInt(value, fallback = 0) {
  const n = Number.parseInt(String(value || ''), 10)
  return Number.isFinite(n) ? n : fallback
}

function withIntentionalImperfection(aiAssistant, language) {
  const shouldInject = Math.random() < 0.35
  if (!shouldInject || !aiAssistant) {
    return { ...aiAssistant, imperfect: false }
  }

  const imperfections = [
    'missing_edge_cases',
    'inefficient_logic',
    'subtle_bug',
    'incomplete_assumptions',
  ]
  const selected = imperfections[Math.floor(Math.random() * imperfections.length)]
  const next = {
    ...aiAssistant,
    draftSolution: aiAssistant.draftSolution || '',
    reasoningSummary: aiAssistant.reasoningSummary || '',
    potentialIssues: Array.isArray(aiAssistant.potentialIssues) ? aiAssistant.potentialIssues : [],
    imperfect: true,
  }

  if (selected === 'missing_edge_cases') {
    next.potentialIssues = [
      'Main flow seems correct, but additional boundary tests are not explicitly covered.',
    ]
  } else if (selected === 'inefficient_logic') {
    next.draftSolution = `${next.draftSolution}\n\n# Note: A straightforward approach may use nested loops for simplicity.`
  } else if (selected === 'subtle_bug') {
    if (String(language || '').toLowerCase().includes('python')) {
      next.draftSolution = `${next.draftSolution}\n\n# Potential implementation detail\nfor i in range(len(arr) - 2):\n    pass`
    } else {
      next.draftSolution = `${next.draftSolution}\n\n// Potential implementation detail\nfor (let i = 0; i <= arr.length; i++) {\n  // ...\n}`
    }
  } else if (selected === 'incomplete_assumptions') {
    next.reasoningSummary = `${next.reasoningSummary}\nAssumption: Inputs are always valid and non-empty.`
  }

  return next
}

async function generateQuestion(req, res) {
  try {
    const { role, language } = req.body || {}
    if (!role || !language) {
      return res.status(400).json({ error: 'role and language are required' })
    }

    const system = 'You generate realistic interview prompts for AI-assisted coding interviews.'
    const userPrompt = [
      `Role: ${role}`,
      `Language: ${language}`,
      '',
      'Return ONLY valid JSON.',
      'Do not include markdown backticks.',
      'Do not include explanation outside JSON.',
      '',
      'Output schema:',
      '{',
      '  "question": "string",',
      '  "scenario": "string",',
      '  "codeSnippet": "string",',
      '  "difficulty": "Easy|Medium|Hard",',
      '  "aiAssistant": {',
      '    "draftSolution": "string",',
      '    "reasoningSummary": "string",',
      '    "potentialIssues": ["..."]',
      '  }',
      '}',
      '',
      'Make it realistic for AI-assisted interview settings.',
    ].join('\n')

    const { parsed } = await callAnthropicJson({ system, userPrompt, maxTokens: 900, temperature: 0.4 })
    const aiAssistant = withIntentionalImperfection(parsed.aiAssistant || {}, language)

    return res.json({
      question: parsed.question || 'Walk through how you would approach this problem.',
      scenario: parsed.scenario || 'AI-assisted coding interview simulation.',
      codeSnippet: parsed.codeSnippet || '',
      difficulty: parsed.difficulty || 'Medium',
      aiAssistant: {
        draftSolution: aiAssistant.draftSolution || 'Start by clarifying assumptions, then derive a baseline algorithm.',
        reasoningSummary: aiAssistant.reasoningSummary || 'Prioritize correctness first, then optimize.',
        potentialIssues: Array.isArray(aiAssistant.potentialIssues) ? aiAssistant.potentialIssues : [],
      },
      assistantMeta: {
        imperfect: Boolean(aiAssistant.imperfect),
      },
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: 'Failed to generate question',
      message: 'Could not generate a new interview question. Please retry.',
      fallback: {
        question: 'Design a function to find the first non-repeating character in a string.',
        scenario: 'Explain your reasoning out loud as if using an AI coding assistant.',
        codeSnippet: '',
        difficulty: 'Medium',
        aiAssistant: {
          draftSolution: 'Use a frequency map in one pass, then scan for the first character with count 1.',
          reasoningSummary: 'This is linear time and easy to explain under interview pressure.',
          potentialIssues: ['Be explicit about empty strings and Unicode handling.'],
        },
      },
    })
  }
}

async function getFeedback(req, res) {
  try {
    const { role, language, question, answer, assistantContext, aiInteractionLog } = req.body || {}
    if (!question || !answer) {
      return res.status(400).json({ error: 'question and answer are required' })
    }

    const system = 'You are an expert interview coach for AI-assisted technical interviews.'
    const userPrompt = [
      `Role: ${role || 'Software Engineer'}`,
      `Language: ${language || 'JavaScript'}`,
      `Question: ${question}`,
      `Candidate answer: ${answer}`,
      `AI assistant context: ${JSON.stringify(assistantContext || {}, null, 2)}`,
      `AI interaction log: ${JSON.stringify(aiInteractionLog || [], null, 2)}`,
      '',
      'Evaluate answer quality, communication, and AI collaboration behavior.',
      'Specifically evaluate whether the candidate validated AI output and avoided blind reliance.',
      '',
      'Return ONLY valid JSON.',
      'Do not include markdown backticks.',
      'Do not include explanation outside JSON.',
      '',
      'Output schema:',
      '{',
      '  "score": 0-10 integer,',
      '  "strengths": ["..."],',
      '  "improvements": ["..."],',
      '  "verdict": "...",',
      '  "categories": {',
      '    "problemUnderstanding": 0-10 integer,',
      '    "aiPromptingSkill": 0-10 integer,',
      '    "aiOutputValidation": 0-10 integer,',
      '    "edgeCaseDetection": 0-10 integer,',
      '    "communication": 0-10 integer,',
      '    "technicalReasoning": 0-10 integer',
      '  },',
      '  "aiCollaborationSummary": "..."',
      '}',
    ].join('\n')

    const { parsed } = await callAnthropicJson({ system, userPrompt, maxTokens: 850, temperature: 0.3 })
    return res.json({
      score: parseSafeInt(parsed.score, 6),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      verdict: parsed.verdict || 'Good effort. Tighten structure and edge-case coverage.',
      categories: {
        problemUnderstanding: parseSafeInt(parsed?.categories?.problemUnderstanding, 6),
        aiPromptingSkill: parseSafeInt(parsed?.categories?.aiPromptingSkill, 6),
        aiOutputValidation: parseSafeInt(parsed?.categories?.aiOutputValidation, 6),
        edgeCaseDetection: parseSafeInt(parsed?.categories?.edgeCaseDetection, 6),
        communication: parseSafeInt(parsed?.categories?.communication, 6),
        technicalReasoning: parseSafeInt(parsed?.categories?.technicalReasoning, 6),
      },
      aiCollaborationSummary: parsed.aiCollaborationSummary || 'Good start. Push harder on validating AI assumptions.',
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: 'Failed to evaluate feedback',
      message: 'Feedback is unavailable right now. Please retry.',
      fallback: {
        score: 6,
        strengths: ['You provided a clear high-level approach.'],
        improvements: ['Add deeper edge-case analysis and complexity discussion.'],
        verdict: 'Solid baseline answer with room for stronger rigor.',
        categories: {
          problemUnderstanding: 6,
          aiPromptingSkill: 6,
          aiOutputValidation: 5,
          edgeCaseDetection: 5,
          communication: 6,
          technicalReasoning: 6,
        },
        aiCollaborationSummary: 'You used AI support appropriately, but need stronger verification and challenge of AI outputs.',
      },
    })
  }
}

async function runAssistantAction(req, res) {
  try {
    const {
      action,
      role,
      language,
      question,
      scenario,
      codeSnippet,
      currentDraft,
      currentReasoning,
      currentIssues,
      userPrompt,
      userNotes,
    } = req.body || {}

    if (!action || !question) {
      return res.status(400).json({ error: 'action and question are required' })
    }

    const system = 'You are an AI coding assistant inside a realistic interview simulator.'
    const actionGuide = {
      ask_again: 'Provide an improved draft solution and reasoning.',
      improve_prompt: 'Rewrite the candidate prompt to be stronger and then provide improved output.',
      validate_solution: 'Critique the current draft and identify correctness risks.',
      find_edge_cases: 'Focus on edge cases and testing strategy gaps.',
    }

    const prompt = [
      `Action: ${action}`,
      `Action intent: ${actionGuide[action] || 'Provide practical assistance.'}`,
      `Role: ${role || 'Software Engineer'}`,
      `Language: ${language || 'JavaScript'}`,
      `Question: ${question}`,
      `Scenario: ${scenario || ''}`,
      `Code snippet context: ${codeSnippet || ''}`,
      `Current draft solution: ${currentDraft || ''}`,
      `Current reasoning summary: ${currentReasoning || ''}`,
      `Current potential issues: ${JSON.stringify(currentIssues || [])}`,
      `Candidate prompt to AI: ${userPrompt || ''}`,
      `Candidate notes: ${userNotes || ''}`,
      '',
      'Return ONLY valid JSON.',
      'Do not include markdown backticks.',
      'Do not include explanation outside JSON.',
      '',
      'Output schema:',
      '{',
      '  "assistantMessage": "string",',
      '  "draftSolution": "string",',
      '  "reasoningSummary": "string",',
      '  "potentialIssues": ["..."],',
      '  "suggestedPrompt": "string"',
      '}',
    ].join('\n')

    const { parsed } = await callAnthropicJson({ system, userPrompt: prompt, maxTokens: 1000, temperature: 0.35 })
    const aiAssistant = withIntentionalImperfection({
      draftSolution: parsed.draftSolution || '',
      reasoningSummary: parsed.reasoningSummary || '',
      potentialIssues: Array.isArray(parsed.potentialIssues) ? parsed.potentialIssues : [],
    }, language)

    return res.json({
      assistantMessage: parsed.assistantMessage || 'Updated assistance generated.',
      draftSolution: aiAssistant.draftSolution || 'Draft solution unavailable.',
      reasoningSummary: aiAssistant.reasoningSummary || 'Reasoning summary unavailable.',
      potentialIssues: Array.isArray(aiAssistant.potentialIssues) ? aiAssistant.potentialIssues : [],
      suggestedPrompt: parsed.suggestedPrompt || 'Request explicit edge cases, constraints, and test coverage.',
      assistantMeta: {
        imperfect: Boolean(aiAssistant.imperfect),
      },
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: 'Failed to run assistant action',
      message: 'Could not update AI assistant output. Please retry.',
      fallback: {
        assistantMessage: 'AI assistant fallback response.',
        draftSolution: 'Clarify assumptions, implement baseline solution, then optimize.',
        reasoningSummary: 'Focus on correctness first, then complexity, then tests.',
        potentialIssues: ['Missing edge-case handling for null, empty, and large inputs.'],
        suggestedPrompt: 'Ask the AI to provide edge cases and a test plan explicitly.',
      },
    })
  }
}

async function checkCodeReviewAnswer(req, res) {
  try {
    const { snippetId, userAnswer } = req.body || {}
    if (!snippetId || !userAnswer) {
      return res.status(400).json({ error: 'snippetId and userAnswer are required' })
    }

    const snippet = CODE_REVIEW_SNIPPETS.find((item) => item.id === snippetId)
    if (!snippet) {
      return res.status(404).json({ error: 'Snippet not found' })
    }

    const system = 'You evaluate debugging/code-review interview answers.'
    const userPrompt = [
      `Snippet title: ${snippet.title}`,
      `Language: ${snippet.language}`,
      `Description: ${snippet.description}`,
      `Buggy code: ${snippet.buggyCode}`,
      `Expected fix metadata: ${snippet.expectedFix}`,
      '',
      `Candidate answer: ${userAnswer}`,
      '',
      'Return ONLY valid JSON.',
      'Do not include markdown backticks.',
      'Do not include explanation outside JSON.',
      '',
      'Output schema:',
      '{',
      '  "correct": true|false,',
      '  "explanation": "...",',
      '  "fixedCode": "...",',
      '  "tip": "..."',
      '}',
    ].join('\n')

    const { parsed } = await callAnthropicJson({ system, userPrompt, maxTokens: 850, temperature: 0.2 })
    return res.json({
      correct: Boolean(parsed.correct),
      explanation: parsed.explanation || 'Review the control flow and missing safeguards.',
      fixedCode: parsed.fixedCode || '',
      tip: parsed.tip || 'State root cause first, then show the exact fix.',
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: 'Failed to check answer',
      message: 'Could not validate the answer. Please retry.',
      fallback: {
        correct: false,
        explanation: 'Unable to evaluate right now. Re-check root cause and propose corrected code.',
        fixedCode: '',
        tip: 'In interviews, explicitly call out failure mode and corrected logic.',
      },
    })
  }
}

async function evaluatePrompt(req, res) {
  try {
    const { challengeId, task, userPromptText } = req.body || {}
    if (!userPromptText || !(challengeId || task)) {
      return res.status(400).json({ error: 'challengeId or task plus userPromptText are required' })
    }

    const selectedChallenge = PROMPT_CHALLENGES.find((item) => item.id === challengeId)
    const targetTask = selectedChallenge?.task || task
    const badExamplePrompt = selectedChallenge?.badExamplePrompt || ''

    const system = 'You are a prompt-engineering interviewer for AI software development workflows.'
    const prompt = [
      `Task: ${targetTask}`,
      `Bad example prompt: ${badExamplePrompt}`,
      `Candidate improved prompt: ${userPromptText}`,
      '',
      'Score the prompt for clarity, constraints, and output quality guidance.',
      '',
      'Return ONLY valid JSON.',
      'Do not include markdown backticks.',
      'Do not include explanation outside JSON.',
      '',
      'Output schema:',
      '{',
      '  "score": 0-10 integer,',
      '  "whatWorks": ["..."],',
      '  "whatToImprove": ["..."],',
      '  "idealPrompt": "..."',
      '}',
    ].join('\n')

    const { parsed } = await callAnthropicJson({ system, userPrompt: prompt, maxTokens: 900, temperature: 0.3 })
    return res.json({
      score: parseSafeInt(parsed.score, 7),
      whatWorks: Array.isArray(parsed.whatWorks) ? parsed.whatWorks : [],
      whatToImprove: Array.isArray(parsed.whatToImprove) ? parsed.whatToImprove : [],
      idealPrompt: parsed.idealPrompt || 'Provide explicit task context, constraints, and expected output structure.',
    })
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: 'Failed to evaluate prompt',
      message: 'Prompt evaluation is temporarily unavailable. Please retry.',
      fallback: {
        score: 7,
        whatWorks: ['You defined a clear objective.'],
        whatToImprove: ['Add stricter constraints and output format requirements.'],
        idealPrompt: 'Include role, context, constraints, edge cases, and required output format.',
      },
    })
  }
}

module.exports = {
  CODE_REVIEW_SNIPPETS,
  PROMPT_CHALLENGES,
  generateQuestion,
  getFeedback,
  runAssistantAction,
  checkCodeReviewAnswer,
  evaluatePrompt,
}
