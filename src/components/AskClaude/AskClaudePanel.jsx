import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardMessage from './DashboardMessage'
import useAskClaude from './useAskClaude'

const TOOL_LABELS = {
  answer_data_question: 'Analyzing your data...',
  create_dashboard: 'Building dashboard...',
  get_example_dataset: 'Fetching example dataset...',
  run_federal_report: 'Searching federal contracts...',
  get_insights: 'Generating AI insights...',
}

function getToolLabel(toolUsed, fallback) {
  if (fallback) return fallback
  return TOOL_LABELS[toolUsed] || ''
}

function MessageBubble({ message, dataContext, onUpgrade }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const toolLabel = getToolLabel(message.toolUsed)

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (_) {
      setCopied(false)
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`group ${isUser ? 'max-w-[92%]' : 'max-w-[98%]'} rounded-2xl px-4 py-3 shadow-sm ${
        isUser
          ? 'bg-blue-600 text-white rounded-br-md'
          : message.upgradeRequired
            ? 'bg-amber-50 text-amber-950 border border-amber-200 rounded-bl-md'
            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
      }`}>
        {toolLabel && !isUser && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            {toolLabel}
          </div>
        )}
        {message.content && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        )}
        {!isUser && message.dashboardSpec && (
          <DashboardMessage spec={message.dashboardSpec} data={dataContext?.data} />
        )}
        {!isUser && message.federalReport?.reportRunId && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
            Report run: <span className="font-mono">{message.federalReport.reportRunId}</span>
          </div>
        )}
        {!isUser && message.upgradeRequired && (
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Upgrade to Pro
          </button>
        )}
        <div className={`mt-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <button
            type="button"
            onClick={copyMessage}
            className={`text-xs transition-colors ${
              isUser
                ? 'text-blue-100 hover:text-white'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton({ toolStatus }) {
  return (
    <div className="flex justify-start">
      <div className="w-64 rounded-2xl rounded-bl-md border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mb-3 text-xs font-medium text-blue-700">
          {getToolLabel(null, toolStatus) || 'Claude is thinking...'}
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-11/12 animate-pulse rounded bg-gray-200" />
          <div className="h-2.5 w-2/3 animate-pulse rounded bg-gray-200" />
          <div className="h-2.5 w-5/6 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  )
}

export default function AskClaudePanel({ dataContext }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, isLoading, toolStatus, canAsk, askClaude, resetConversation } = useAskClaude(dataContext)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isLoading, isOpen])

  const goToPricing = () => {
    setIsOpen(false)
    setIsFullScreen(false)
    navigate('/pricing', { state: { reason: 'ask-claude-upgrade' } })
  }

  useEffect(() => {
    const latest = messages[messages.length - 1]
    if (!latest?.upgradeRequired) return
    const id = window.setTimeout(goToPricing, 700)
    return () => window.clearTimeout(id)
  }, [messages])

  const submit = (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    askClaude(draft)
    setDraft('')
  }

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-900/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
          aria-label="Open Ask Claude"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">AI</span>
          Ask Claude
        </button>
      )}

      {isOpen && (
        <div className={`pointer-events-none fixed inset-0 z-[100] flex p-0 ${isFullScreen ? 'items-stretch justify-stretch' : 'items-end justify-end sm:p-3'}`}>
          <section className={`pointer-events-auto relative flex flex-col overflow-hidden bg-gray-50 shadow-2xl ${
            isFullScreen
              ? 'h-screen w-screen'
              : 'h-[92vh] w-full rounded-t-3xl sm:h-[760px] sm:max-h-[calc(100vh-1.5rem)] sm:w-[560px] sm:rounded-3xl lg:w-[640px] xl:w-[720px]'
          }`}>
            <header className="border-b border-gray-200 bg-white px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Ask Claude</h2>
                  <p className="text-sm text-gray-500">
                    {canAsk ? `${dataContext?.data?.length || 0} rows loaded` : 'Load data to ask questions'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFullScreen((value) => !value)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    {isFullScreen ? 'Exit full' : 'Full screen'}
                  </button>
                  <button
                    type="button"
                    onClick={resetConversation}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      setIsFullScreen(false)
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Close Ask Claude"
                  >
                    <span className="text-xl leading-none">&times;</span>
                  </button>
                </div>
              </div>
            </header>

            <div ref={scrollRef} className={`flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4 ${isFullScreen ? 'mx-auto w-full max-w-6xl' : ''}`}>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} dataContext={dataContext} onUpgrade={goToPricing} />
              ))}
              {isLoading && <LoadingSkeleton toolStatus={toolStatus} />}
            </div>

            <form onSubmit={submit} className="border-t border-gray-200 bg-white p-3 sm:p-4">
              <div className={isFullScreen ? 'mx-auto w-full max-w-6xl' : ''}>
              {!canAsk && (
                <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Upload or open a dataset before asking Claude about your data.
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      submit(event)
                    }
                  }}
                  rows={2}
                  disabled={!canAsk || isLoading}
                  placeholder="Ask about this data or request a dashboard..."
                  className="min-h-[48px] flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={!canAsk || isLoading || !draft.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
