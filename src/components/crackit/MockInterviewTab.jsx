import { useEffect, useMemo, useState } from 'react'
import apiClient from '../../config/api'

const ROLES = ['Software Engineer', 'Data Engineer', 'Data Analyst', 'AI/ML Engineer', 'Frontend', 'Backend']
const LANGUAGES = ['Python', 'JavaScript', 'Java', 'TypeScript', 'Go']

function scoreClass(score) {
  if (score >= 8) return 'text-emerald-300 border-emerald-500/40 bg-emerald-900/20'
  if (score >= 6) return 'text-amber-300 border-amber-500/40 bg-amber-900/20'
  return 'text-rose-300 border-rose-500/40 bg-rose-900/20'
}

export default function MockInterviewTab({ onPracticeComplete, presetScenario = null }) {
  const [role, setRole] = useState(ROLES[0])
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [questionLoading, setQuestionLoading] = useState(false)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [error, setError] = useState('')
  const [questionData, setQuestionData] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [assistantData, setAssistantData] = useState(null)
  const [assistantActionLoading, setAssistantActionLoading] = useState(false)
  const [assistantError, setAssistantError] = useState('')
  const [assistantPrompt, setAssistantPrompt] = useState('')
  const [assistantNotes, setAssistantNotes] = useState('')
  const [interactionLog, setInteractionLog] = useState([])

  const canSendFeedback = useMemo(() => questionData && answer.trim().length > 8, [questionData, answer])
  const canUseAssistantActions = Boolean(questionData) && !assistantActionLoading

  useEffect(() => {
    if (!presetScenario?.sourceId) return
    setError('')
    setAssistantError('')
    setFeedback(null)
    setAnswer('')
    setQuestionData({
      question: presetScenario.question,
      scenario: presetScenario.scenario,
      codeSnippet: presetScenario.codeSnippet,
      difficulty: presetScenario.difficulty || 'Medium',
      aiAssistant: presetScenario.aiAssistant || null,
    })
    setAssistantData(presetScenario.aiAssistant || null)
    setAssistantPrompt(presetScenario.suggestedPrompt || '')
    setAssistantNotes(presetScenario.starterNotes || '')
    setInteractionLog([
      {
        action: 'example_seeded',
        prompt: presetScenario.suggestedPrompt || '',
        notes: 'Loaded from Engineering Reviews example.',
        assistantMessage: 'Example review context loaded for simulation.',
      },
    ])
  }, [presetScenario])

  const generateQuestion = async () => {
    setQuestionLoading(true)
    setError('')
    setAssistantError('')
    setFeedback(null)
    setInteractionLog([])
    try {
      const { data } = await apiClient.post('/api/crackit/generate-question', { role, language })
      setQuestionData(data)
      setAssistantData(data?.aiAssistant || null)
    } catch (err) {
      const fallback = err?.response?.data?.fallback
      if (fallback) {
        setQuestionData(fallback)
        setAssistantData(fallback?.aiAssistant || null)
      }
      setError(err?.response?.data?.message || 'Could not generate question. Please retry.')
    } finally {
      setQuestionLoading(false)
    }
  }

  const getFeedback = async () => {
    setFeedbackLoading(true)
    setError('')
    try {
      const { data } = await apiClient.post('/api/crackit/feedback', {
        role,
        language,
        question: questionData?.question || '',
        answer,
        assistantContext: assistantData || {},
        aiInteractionLog: interactionLog,
      })
      setFeedback(data)
      if (typeof onPracticeComplete === 'function') onPracticeComplete()
    } catch (err) {
      const fallback = err?.response?.data?.fallback
      if (fallback) setFeedback(fallback)
      setError(err?.response?.data?.message || 'Feedback failed. Please try again.')
    } finally {
      setFeedbackLoading(false)
    }
  }

  const runAssistantAction = async (action) => {
    if (!questionData) return
    setAssistantActionLoading(true)
    setAssistantError('')
    try {
      const { data } = await apiClient.post('/api/crackit/assistant-action', {
        action,
        role,
        language,
        question: questionData.question,
        scenario: questionData.scenario,
        codeSnippet: questionData.codeSnippet,
        currentDraft: assistantData?.draftSolution || '',
        currentReasoning: assistantData?.reasoningSummary || '',
        currentIssues: assistantData?.potentialIssues || [],
        userPrompt: assistantPrompt,
        userNotes: assistantNotes,
      })
      setAssistantData({
        draftSolution: data?.draftSolution || '',
        reasoningSummary: data?.reasoningSummary || '',
        potentialIssues: Array.isArray(data?.potentialIssues) ? data.potentialIssues : [],
      })
      setInteractionLog((prev) => [
        ...prev,
        {
          action,
          prompt: assistantPrompt,
          notes: assistantNotes,
          assistantMessage: data?.assistantMessage || '',
        },
      ])
      if (data?.suggestedPrompt) {
        setAssistantPrompt(data.suggestedPrompt)
      }
    } catch (err) {
      const fallback = err?.response?.data?.fallback
      if (fallback) {
        setAssistantData({
          draftSolution: fallback.draftSolution || '',
          reasoningSummary: fallback.reasoningSummary || '',
          potentialIssues: Array.isArray(fallback.potentialIssues) ? fallback.potentialIssues : [],
        })
      }
      setAssistantError(err?.response?.data?.message || 'AI Assistant action failed. Please retry.')
    } finally {
      setAssistantActionLoading(false)
    }
  }

  const categories = feedback?.categories || {}

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-4 py-3 text-sm text-indigo-100">
        Modern AI-assisted interviews evaluate how you collaborate with AI tools, not just raw coding.
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/25">
        <h2 className="text-lg font-semibold text-white">Mock Interview</h2>
        <p className="mt-1 text-sm text-slate-300">Simulate AI-assisted interviews and practice your thinking-out-loud flow.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Role</span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-300">Language</span>
            <select
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-400"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={generateQuestion}
          disabled={questionLoading}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {questionLoading ? 'Generating...' : 'Generate Question'}
        </button>

        {error && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-100">{error}</p>}

        {!questionData && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            No question yet. Select role and language, then click Generate Question.
          </div>
        )}

        {questionData && (
          <article className="mt-4 rounded-lg border border-indigo-500/25 bg-slate-950/70 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-wide text-indigo-300">Interview Scenario</p>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-200">
                {questionData.difficulty || 'Medium'}
              </span>
            </div>
            <p className="text-sm text-slate-200">{questionData.scenario || 'AI-assisted interview simulation.'}</p>
            <p className="mt-3 text-sm font-medium text-white">{questionData.question}</p>
            {questionData.codeSnippet && (
              <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-700 bg-black/40 p-3 text-xs text-slate-200">
                <code>{questionData.codeSnippet}</code>
              </pre>
            )}
          </article>
        )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/25">
          <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
          <p className="mt-1 text-sm text-slate-300">Review AI output, validate it, and iterate on prompts like a real interview.</p>

          <textarea
            value={assistantPrompt}
            onChange={(e) => setAssistantPrompt(e.target.value)}
            rows={3}
            placeholder="Prompt the AI assistant (example: include complexity and edge cases)."
            className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400"
          />
          <textarea
            value={assistantNotes}
            onChange={(e) => setAssistantNotes(e.target.value)}
            rows={2}
            placeholder="Your notes on AI weaknesses and assumptions."
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400"
          />

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" disabled={!canUseAssistantActions} onClick={() => runAssistantAction('ask_again')} className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50">Ask AI Again</button>
            <button type="button" disabled={!canUseAssistantActions} onClick={() => runAssistantAction('improve_prompt')} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50">Improve Prompt</button>
            <button type="button" disabled={!canUseAssistantActions} onClick={() => runAssistantAction('validate_solution')} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50">Validate Solution</button>
            <button type="button" disabled={!canUseAssistantActions} onClick={() => runAssistantAction('find_edge_cases')} className="rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-50">Find Edge Cases</button>
          </div>

          {assistantActionLoading && (
            <p className="mt-3 text-sm text-indigo-200">
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-indigo-400" />
              Updating AI assistant...
            </p>
          )}
          {assistantError && <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-900/20 px-3 py-2 text-sm text-rose-100">{assistantError}</p>}

          {!assistantData && (
            <div className="mt-3 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
              Generate a question to receive AI draft assistance.
            </div>
          )}
          {assistantData && (
            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">AI Draft Solution</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-200">{assistantData.draftSolution}</pre>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Reasoning Summary</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{assistantData.reasoningSummary}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Possible Mistakes / Missing Edge Cases</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                  {(assistantData.potentialIssues || []).map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/25">
        <h3 className="text-lg font-semibold text-white">Your Answer + Feedback</h3>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={10}
          placeholder="Explain your approach, reasoning, edge cases, and pseudo-code."
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400"
        />
        <button
          type="button"
          onClick={getFeedback}
          disabled={!canSendFeedback || feedbackLoading}
          className="mt-3 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {feedbackLoading ? 'Evaluating...' : 'Get Feedback'}
        </button>

        {!feedback && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            Submit your response to receive score, strengths, and improvement areas.
          </div>
        )}

        {feedback && (
          <div className="mt-4 space-y-3">
            <div className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${scoreClass(Number(feedback.score || 0))}`}>
              Score: {feedback.score ?? 0}/10
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Strengths</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                {(feedback.strengths || []).map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Improvements</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-200">
                {(feedback.improvements || []).map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-indigo-500/25 bg-indigo-950/30 p-3 text-sm text-indigo-100">
              <p className="text-xs uppercase tracking-wide text-indigo-300">Verdict</p>
              <p className="mt-1">{feedback.verdict}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Interview Scoring Categories</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">Problem Understanding: {categories.problemUnderstanding ?? 0}/10</div>
                <div className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">AI Prompting Skill: {categories.aiPromptingSkill ?? 0}/10</div>
                <div className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">AI Output Validation: {categories.aiOutputValidation ?? 0}/10</div>
                <div className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">Edge Case Detection: {categories.edgeCaseDetection ?? 0}/10</div>
                <div className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">Communication: {categories.communication ?? 0}/10</div>
                <div className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">Technical Reasoning: {categories.technicalReasoning ?? 0}/10</div>
              </div>
            </div>
            {feedback.aiCollaborationSummary && (
              <div className="rounded-lg border border-indigo-500/25 bg-indigo-950/30 p-3 text-sm text-indigo-100">
                <p className="text-xs uppercase tracking-wide text-indigo-300">AI Collaboration Assessment</p>
                <p className="mt-1">{feedback.aiCollaborationSummary}</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
