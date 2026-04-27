const { fraudCases, policySnippets, complaintRecords } = require('../data/responsibleAiDemoData')

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function scoreByOverlap(queryTokens, text, tags = []) {
  const tokens = new Set([...tokenize(text), ...tags.map((t) => String(t).toLowerCase())])
  let score = 0
  for (const token of queryTokens) {
    if (tokens.has(token)) score += 1
  }
  return score
}

function retrieveEvidence(query) {
  const queryTokens = tokenize(query)

  const similarCases = fraudCases
    .map((item) => ({
      ...item,
      _score: scoreByOverlap(queryTokens, `${item.title} ${item.summary}`, item.tags),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 3)
    .map(({ _score, ...rest }) => rest)

  const citedPolicies = policySnippets
    .map((item) => ({
      ...item,
      _score: scoreByOverlap(queryTokens, `${item.title} ${item.text}`, item.tags),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 2)
    .map(({ _score, ...rest }) => rest)

  const complaintMatches = complaintRecords
    .map((item) => ({
      ...item,
      _score: scoreByOverlap(queryTokens, `${item.category} ${item.summary}`, item.tags),
    }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 2)
    .map(({ _score, ...rest }) => rest)

  const signalsUsed = [
    { name: 'velocity_pattern', value: queryTokens.includes('velocity') ? 'high' : 'medium' },
    { name: 'geo_anomaly', value: queryTokens.includes('state') || queryTokens.includes('geography') ? 'detected' : 'not-explicit' },
    { name: 'new_payee_risk', value: queryTokens.includes('payee') ? 'elevated' : 'unknown' },
    { name: 'complaint_context', value: complaintMatches.length > 0 ? 'present' : 'missing' },
  ]

  return { similarCases, citedPolicies, complaintMatches, signalsUsed }
}

function buildGroundedAnswer(query, evidence) {
  const topCase = evidence.similarCases[0]
  const topPolicy = evidence.citedPolicies[0]

  const answerSummary = topCase
    ? `Based on prior case ${topCase.id} (${topCase.title}), this inquiry resembles a ${topCase.riskLevel} risk pattern requiring immediate fraud-ops workflow and customer protection controls.`
    : 'The inquiry appears operationally significant; additional context is needed before a final decision.'

  const recommendedNextStep = topPolicy
    ? `Execute policy ${topPolicy.id}: ${topPolicy.title}. Start a documented escalation, apply temporary customer account protections, and issue a customer follow-up SLA update.`
    : 'Escalate to fraud operations and collect supporting evidence before customer communication.'

  const citations = evidence.citedPolicies.map((p) => ({
    policyId: p.id,
    policyTitle: p.title,
    excerpt: p.text,
  }))

  return {
    userQuery: query,
    answerSummary,
    recommendedNextStep,
    citations,
  }
}

function runGuardrails(result) {
  const fullText = `${result.answerSummary} ${result.recommendedNextStep}`.toLowerCase()
  const hasPIILeakage = /\b\d{9}\b|\b\d{16}\b|ssn|social security|account number\b/.test(fullText)
  const hasCitations = Array.isArray(result.citations) && result.citations.length > 0
  const unsupportedClaim = !/policy/i.test(result.recommendedNextStep) && !hasCitations
  const policyScopeMatch = /fraud|customer|ops|policy|escalation/.test(fullText)

  return {
    piiLeakage: {
      passed: !hasPIILeakage,
      detail: hasPIILeakage ? 'Potential PII pattern detected in generated text.' : 'No direct PII pattern detected.',
      status: hasPIILeakage ? 'blocked' : 'passed',
    },
    groundedInEvidence: {
      passed: hasCitations,
      detail: hasCitations ? 'Answer aligns with retrieved policy snippets.' : 'No supporting evidence attached to answer.',
      status: hasCitations ? 'passed' : 'review',
    },
    unsupportedClaims: {
      passed: !unsupportedClaim,
      detail: unsupportedClaim ? 'Recommendation lacks grounding references.' : 'Claims grounded in retrieved policy evidence.',
      status: unsupportedClaim ? 'review' : 'passed',
    },
    policyScope: {
      passed: policyScopeMatch,
      detail: policyScopeMatch ? 'Response stays within banking operations policy scope.' : 'Response may be outside policy scope and needs analyst review.',
      status: policyScopeMatch ? 'passed' : 'review',
    },
    finalSafetyStatus: hasPIILeakage ? 'blocked' : unsupportedClaim || !policyScopeMatch ? 'review' : 'passed',
  }
}

function createInferenceTrace(startedAt, query, evidence, guardrails) {
  const now = Date.now()
  const tokenEstimate = Math.max(120, Math.round(query.length * 1.15) + 180)
  const groundednessRaw = evidence.citedPolicies.length * 0.28 + evidence.similarCases.length * 0.12
  const groundedness = Math.min(0.98, Number(groundednessRaw.toFixed(2)))

  const guardrailChecks = [guardrails.piiLeakage, guardrails.groundedInEvidence, guardrails.unsupportedClaims, guardrails.policyScope]
  const guardrailPassRate = guardrailChecks.filter((g) => g.passed).length / guardrailChecks.length
  const confidence = Number((0.5 * groundedness + 0.5 * guardrailPassRate).toFixed(2))

  return {
    traceId: `trace_${now}`,
    model: 'mock-gpt-banking-ops-v1',
    retrievalProvider: 'mock-similarity-search-v1',
    retrievalHits: evidence.similarCases.length + evidence.citedPolicies.length + evidence.complaintMatches.length,
    durationMs: now - startedAt,
    promptTokens: Math.round(tokenEstimate * 0.68),
    completionTokens: Math.round(tokenEstimate * 0.32),
    totalTokens: tokenEstimate,
    confidence,
    groundedness,
    timestamp: new Date(now).toISOString(),
  }
}

function runResponsibleCopilot(query) {
  const startedAt = Date.now()
  const evidence = retrieveEvidence(query)
  const answer = buildGroundedAnswer(query, evidence)
  const guardrails = runGuardrails(answer)
  const trace = createInferenceTrace(startedAt, query, evidence, guardrails)

  return {
    answer,
    evidence,
    guardrails,
    trace,
  }
}

module.exports = {
  runResponsibleCopilot,
}
