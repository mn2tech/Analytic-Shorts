import { useMemo, useState } from 'react'

const EXAMPLES = [
  {
    id: 'password-validation',
    title: 'Password Validation Review',
    category: 'Security',
    scenario: 'AI generated a password validation function.',
    codeTitle: 'AI-generated Python code',
    code: `import re

def validate_password(password):
    pattern = r"^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d).{8,}$"
    return bool(re.match(pattern, password))`,
    requirements: [
      'At least 8 characters',
      'Uppercase, lowercase, and number',
      'Safe for production authentication flow',
    ],
    ask: [
      'What security risks exist?',
      'What edge cases are missing?',
      'Would you trust this in production?',
    ],
    review: [
      'Missing None or empty input handling',
      'No password reuse protection strategy',
      'No rate-limiting or brute-force discussion',
      'No hashing/storage guidance',
      'Regex readability and maintainability concerns',
    ],
    lesson: 'Modern engineers validate AI-generated authentication logic instead of blindly trusting it.',
    answers: {
      beginner: 'I would add basic checks for empty inputs and improve clarity before using this.',
      strong: 'I would validate null/empty cases, separate policy checks, and require server-side hashing and rate limiting.',
      senior: 'I would define an auth threat model, add lockout/monitoring strategy, move policy into tested modules, and align with compliance controls.',
    },
  },
  {
    id: 'react-api',
    title: 'React API Component Review',
    category: 'Frontend',
    scenario: 'AI generated a React dashboard component fetching analytics data.',
    codeTitle: 'AI-generated React snippet',
    code: `useEffect(() => {
  fetch('/api/analytics')
    .then((res) => res.json())
    .then((data) => setMetrics(data))
}, [])`,
    requirements: [
      'Production-ready data fetching',
      'Safe unmount behavior',
      'Reliable UX under failures',
    ],
    ask: [
      'What could fail?',
      'Are loading/error states missing?',
      'Could this cause memory leaks?',
    ],
    review: [
      'Missing cleanup/abort handling',
      'Missing try/catch or error boundaries',
      'No loading state for users',
      'No retry strategy',
      'No request timeout handling',
    ],
    lesson: 'AI-generated UI code often misses production readiness.',
    answers: {
      beginner: 'I would add loading and error messages so users know what is happening.',
      strong: 'I would add AbortController cleanup, explicit loading/error states, timeout, and retry with capped attempts.',
      senior: 'I would build a reusable data-fetch layer with observability, request cancellation, stale-data policy, and tested resilience patterns.',
    },
  },
  {
    id: 'sql-validation',
    title: 'SQL Query Validation',
    category: 'Data',
    scenario: 'AI generated a SQL query for a reporting dashboard.',
    codeTitle: 'AI-generated SQL',
    code: `SELECT u.name, o.amount
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= '2026-01-01'`,
    requirements: [
      'Safe query patterns',
      'Accurate aggregations',
      'Performance at scale',
    ],
    ask: [
      'Is the query safe?',
      'Is it performant?',
      'Could duplicates occur?',
    ],
    review: [
      'Missing index strategy discussion',
      'Potential duplicate rows',
      'Unsafe string interpolation risk in dynamic variants',
      'Filters may be too broad',
      'Aggregation/grain alignment concerns',
    ],
    lesson: 'AI-generated SQL must be validated carefully.',
    answers: {
      beginner: 'I would check if the result has duplicate rows and verify filters.',
      strong: 'I would validate join cardinality, parameterize inputs, and profile query plans for index gaps.',
      senior: 'I would define target grain, enforce contract tests, tune indexes/materialization, and monitor query cost regressions in CI.',
    },
  },
  {
    id: 'cloud-deployment',
    title: 'Cloud Deployment Review',
    category: 'DevOps',
    scenario: 'AI generated deployment steps for a cloud application.',
    codeTitle: 'AI-generated deployment steps',
    code: `1. Build Docker image
2. Push image to registry
3. Deploy to cluster
4. Expose service`,
    requirements: [
      'Secure configuration',
      'Operational reliability',
      'Rollback readiness',
    ],
    ask: [
      'What operational risks exist?',
      'What security concerns exist?',
      'What monitoring is missing?',
    ],
    review: [
      'No environment variable management plan',
      'Missing secrets handling approach',
      'No monitoring/logging setup',
      'No rollback strategy',
      'Missing autoscaling considerations',
    ],
    lesson: 'AI can generate deployment logic but engineers must validate production readiness.',
    answers: {
      beginner: 'I would ask where secrets and logs are configured before deploying.',
      strong: 'I would add secret manager usage, health checks, observability, and a rollback runbook.',
      senior: 'I would require progressive delivery, SLO-based alerts, autoscaling policy, disaster recovery drills, and audited change controls.',
    },
  },
  {
    id: 'prompt-engineering',
    title: 'Prompt Engineering Review',
    category: 'AI Workflow',
    scenario: 'AI generated poor dashboard insights because the prompt was vague.',
    codeTitle: 'Weak vs improved prompt',
    code: `Weak:
"Analyze this data and give insights."

Improved:
"You are a healthcare analytics copilot. Analyze ER wait-time data for the last 90 days.
Return 5 findings with trend evidence, confidence level, and one recommended action per finding.
Flag assumptions and data quality risks."`,
    requirements: [
      'Clear business goal',
      'Output structure',
      'Validation instructions',
    ],
    ask: [
      'Why is the improved prompt better?',
      'What additional context helps?',
      'How would you reduce hallucinations?',
    ],
    review: [
      'Improved prompt gives clearer context',
      'Adds stronger constraints',
      'Defines output format',
      'Specifies business objective',
      'Adds validation and risk framing',
    ],
    lesson: 'Prompt quality directly impacts AI engineering quality.',
    answers: {
      beginner: 'The improved prompt is clearer and tells AI exactly what to return.',
      strong: 'The improved prompt narrows scope, defines structure, and asks for explicit assumptions to reduce low-quality outputs.',
      senior: 'I would pair structured prompts with retrieval/grounding, verification checks, and rubric-based scoring for consistent production quality.',
    },
  },
]

function simplify(text) {
  return text
    .replace('cardinality', 'how many matches each row has')
    .replace('materialization', 'precomputed summary tables')
    .replace('progressive delivery', 'safe gradual rollout')
    .replace('observability', 'logs, metrics, and alerts visibility')
}

export default function ExampleReviewsSection({ onStartPractice }) {
  const [selectedId, setSelectedId] = useState(null)
  const [beginnerMode, setBeginnerMode] = useState(true)

  const selected = useMemo(() => EXAMPLES.find((item) => item.id === selectedId) || null, [selectedId])

  const formatText = (text) => (beginnerMode ? simplify(text) : text)

  const startPractice = () => {
    if (!selected || typeof onStartPractice !== 'function') return
    onStartPractice({
      sourceId: selected.id,
      question: `Review this AI-generated solution for: ${selected.title}`,
      scenario: selected.scenario,
      codeSnippet: selected.code,
      difficulty: 'Medium',
      aiAssistant: {
        draftSolution: `Initial AI draft:\n${selected.code}`,
        reasoningSummary: selected.lesson,
        potentialIssues: selected.review.slice(0, 4),
      },
      suggestedPrompt: `Help me validate this example. Focus on: ${selected.ask.join(' ')}`,
      starterNotes: `I want to validate this AI output and improve it before production.`,
    })
    setSelectedId(null)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/25">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Example AI-Native Engineering Reviews</h2>
            <p className="mt-1 text-sm text-slate-300">
              Learn how modern engineers review, validate, and improve AI-generated solutions.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-3 py-2 text-xs font-semibold text-indigo-100">
            <input
              type="checkbox"
              className="h-4 w-4 accent-indigo-500"
              checked={beginnerMode}
              onChange={(e) => setBeginnerMode(e.target.checked)}
            />
            Beginner-Friendly Explanations
          </label>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {EXAMPLES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedId(item.id)}
            className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-slate-900"
          >
            <p className="text-xs uppercase tracking-wide text-indigo-300">{item.category}</p>
            <h3 className="mt-1 text-base font-semibold text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{formatText(item.scenario)}</p>
            <p className="mt-3 text-xs text-slate-400">Tap to open review walkthrough</p>
          </button>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          'AI-generated code is a starting point, not the final answer.',
          'Modern engineers validate AI output before production.',
          'Finding edge cases is often more valuable than typing code quickly.',
          'Clear reasoning is a critical engineering skill.',
        ].map((text) => (
          <article key={text} className="rounded-lg border border-indigo-500/25 bg-indigo-950/30 px-3 py-2 text-xs text-indigo-100">
            {formatText(text)}
          </article>
        ))}
      </section>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-2 sm:items-center sm:p-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-5 shadow-2xl shadow-black/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-indigo-300">{selected.category}</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{selected.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{formatText(selected.scenario)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Close
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={startPractice}
                className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-400"
              >
                Practice this review
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">{selected.codeTitle}</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-black/40 p-3 text-xs text-slate-200">{selected.code}</pre>
                <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">Requirements</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                  {selected.requirements.map((item) => <li key={item}>{formatText(item)}</li>)}
                </ul>
              </article>

              <article className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Review Prompts</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                  {selected.ask.map((item) => <li key={item}>{formatText(item)}</li>)}
                </ul>
                <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">Example Review</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                  {selected.review.map((item) => <li key={item}>{formatText(item)}</li>)}
                </ul>
                <div className="mt-4 rounded-lg border border-indigo-500/25 bg-indigo-950/30 px-3 py-2 text-sm text-indigo-100">
                  <span className="text-xs uppercase tracking-wide text-indigo-300">Key Lesson</span>
                  <p className="mt-1">{formatText(selected.lesson)}</p>
                </div>
              </article>
            </div>

            <article className="mt-4 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">What Strong Answers Look Like</p>
              <div className="mt-2 grid gap-2 lg:grid-cols-3">
                <div className="rounded border border-slate-700 bg-slate-950/60 p-2">
                  <p className="text-xs font-semibold text-slate-300">Beginner Answer</p>
                  <p className="mt-1 text-sm text-slate-200">{formatText(selected.answers.beginner)}</p>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950/60 p-2">
                  <p className="text-xs font-semibold text-slate-300">Strong Engineer Answer</p>
                  <p className="mt-1 text-sm text-slate-200">{formatText(selected.answers.strong)}</p>
                </div>
                <div className="rounded border border-slate-700 bg-slate-950/60 p-2">
                  <p className="text-xs font-semibold text-slate-300">Senior AI-Native Engineer Answer</p>
                  <p className="mt-1 text-sm text-slate-200">{formatText(selected.answers.senior)}</p>
                </div>
              </div>
            </article>
          </div>
        </div>
      )}
    </div>
  )
}
