import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import DashboardMessage from './DashboardMessage'
import useAskClaude from './useAskClaude'
import { TD } from '../../constants/terminalDashboardPalette'

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

function MessageBubble({ message, dataContext, onUpgrade, showInlineDashboardPreview }) {
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

  const bubbleStyle = isUser
    ? {
        background: TD.ACCENT_BLUE,
        color: '#fff',
        border: 'none',
        borderRadius: '16px',
        borderBottomRightRadius: '6px',
      }
    : message.upgradeRequired
      ? {
          background: 'rgba(245, 158, 11, 0.12)',
          color: '#fde68a',
          border: `0.5px solid rgba(245, 158, 11, 0.35)`,
          borderRadius: '16px',
          borderBottomLeftRadius: '6px',
        }
      : {
          background: TD.CARD_BG,
          color: TD.TEXT_1,
          border: `0.5px solid ${TD.CARD_BORDER}`,
          borderRadius: '16px',
          borderBottomLeftRadius: '6px',
        }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group ${isUser ? 'max-w-[92%]' : 'max-w-[98%]'} rounded-2xl px-4 py-3 shadow-sm`}
        style={bubbleStyle}
      >
        {toolLabel && !isUser && (
          <div
            className="mb-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: 'rgba(59, 130, 246, 0.18)',
              color: TD.ACCENT_MID,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            {toolLabel}
          </div>
        )}
        {message.content && (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
        )}
        {!isUser && showInlineDashboardPreview && message.dashboardSpec && (
          <DashboardMessage spec={message.dashboardSpec} data={dataContext?.data} />
        )}
        {!isUser && message.federalReport?.reportRunId && (
          <div
            className="mt-3 rounded-lg p-3 text-xs"
            style={{
              border: `0.5px solid ${TD.CARD_BORDER}`,
              background: TD.PAGE_BG,
              color: TD.TEXT_2,
            }}
          >
            Report run: <span className="font-mono text-slate-300">{message.federalReport.reportRunId}</span>
          </div>
        )}
        {!isUser && message.upgradeRequired && (
          <button
            type="button"
            onClick={onUpgrade}
            className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold text-white transition"
            style={{ background: TD.ACCENT_BLUE }}
          >
            Upgrade to Pro
          </button>
        )}
        <div className={`mt-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <button
            type="button"
            onClick={copyMessage}
            className="text-xs transition-colors"
            style={
              isUser
                ? { color: 'rgba(255,255,255,0.85)' }
                : { color: TD.TEXT_3 }
            }
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
      <div
        className="w-64 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
        style={{
          border: `0.5px solid ${TD.CARD_BORDER}`,
          background: TD.CARD_BG,
        }}
      >
        <div className="mb-3 text-xs font-medium" style={{ color: TD.ACCENT_MID }}>
          {getToolLabel(null, toolStatus) || 'Claude is thinking...'}
        </div>
        <div className="space-y-2">
          <div className="h-2.5 w-11/12 animate-pulse rounded" style={{ background: TD.GRID }} />
          <div className="h-2.5 w-2/3 animate-pulse rounded" style={{ background: TD.GRID }} />
          <div className="h-2.5 w-5/6 animate-pulse rounded" style={{ background: TD.GRID }} />
        </div>
      </div>
    </div>
  )
}

export default function AskClaudePanel({
  dataContext,
  startOpen = false,
  lockOpen = false,
  showInlineDashboardPreview = false,
  onDashboardUpdate,
  onChartLayoutUpdate,
  onVisibilityChange,
}) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(Boolean(startOpen || lockOpen))
  const [isExpanded, setIsExpanded] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [draft, setDraft] = useState('')
  const { messages, isLoading, toolStatus, canAsk, askClaude, resetConversation } = useAskClaude(dataContext, {
    onDashboardUpdate,
    onChartLayoutUpdate,
  })
  const scrollRef = useRef(null)

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isLoading, isOpen])

  const goToPricing = () => {
    setIsOpen(false)
    setIsExpanded(false)
    navigate('/pricing', { state: { reason: 'ask-claude-upgrade' } })
  }

  useEffect(() => {
    if (lockOpen) setIsOpen(true)
  }, [lockOpen])

  useEffect(() => {
    const isVisible = isOpen && !isMinimized
    onVisibilityChange?.(isVisible)
  }, [isOpen, isMinimized, onVisibilityChange])

  useEffect(() => {
    const latest = messages[messages.length - 1]
    if (!latest?.upgradeRequired) return
    const id = window.setTimeout(goToPricing, 700)
    return () => window.clearTimeout(id)
  }, [messages])

  useEffect(() => {
    const onExplainAnomalies = (event) => {
      const message = event.detail?.message
      if (typeof message !== 'string' || !message.trim()) return
      setIsOpen(true)
      setIsMinimized(false)
      askClaude(message.trim())
    }
    window.addEventListener('nm2-ask-claude-explain-anomalies', onExplainAnomalies)
    return () => window.removeEventListener('nm2-ask-claude-explain-anomalies', onExplainAnomalies)
  }, [askClaude])

  useEffect(() => {
    const onPrompt = (event) => {
      const message = event.detail?.message
      if (typeof message !== 'string' || !message.trim()) return
      setIsOpen(true)
      setIsMinimized(false)
      askClaude(message.trim())
    }
    window.addEventListener('nm2-ask-claude-prompt', onPrompt)
    return () => window.removeEventListener('nm2-ask-claude-prompt', onPrompt)
  }, [askClaude])

  const submit = (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    askClaude(draft)
    setDraft('')
  }

  const panelUi = (
    <>
      {!isOpen && !lockOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 z-[9999] inline-flex -translate-y-1/2 translate-x-[28%] flex-col items-center gap-2 rounded-l-xl px-2 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-2xl transition-all duration-200 hover:translate-x-0 focus:translate-x-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: TD.CARD_BORDER,
            background: TD.CARD_BG,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
          aria-label="Open Ask Claude"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] tracking-normal"
            style={{ background: 'rgba(59,130,246,0.25)', color: TD.TEXT_1 }}
          >
            AI
          </span>
          <span className="[writing-mode:vertical-rl] [text-orientation:mixed]" style={{ color: TD.TEXT_2 }}>
            Claude
          </span>
        </button>
      )}

      {(isMinimized || (!isOpen && lockOpen)) && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true)
            setIsMinimized(false)
          }}
          className="fixed right-0 top-1/2 z-[9999] inline-flex -translate-y-1/2 items-center gap-2 rounded-l-xl px-3 py-2 text-sm font-semibold shadow-2xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: TD.CARD_BORDER,
            background: TD.CARD_BG,
            color: TD.TEXT_1,
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          }}
          aria-label="Restore Ask Claude panel"
        >
          Ask Claude
        </button>
      )}

      {isOpen && !isMinimized && (
        <div className="fixed inset-y-0 right-0 z-[100] flex items-stretch justify-end">
          <section
            className={`relative flex h-full w-full flex-col overflow-hidden shadow-2xl sm:w-[480px] ${
              isExpanded ? 'lg:w-[640px] xl:w-[760px]' : 'lg:w-[440px] xl:w-[500px]'
            }`}
            style={{
              borderLeft: `0.5px solid ${TD.CARD_BORDER}`,
              background: TD.PAGE_BG,
              boxShadow: '-12px 0 40px rgba(0,0,0,0.45)',
            }}
          >
            <header
              className="px-5 py-3"
              style={{ borderBottom: `0.5px solid ${TD.CARD_BORDER}`, background: TD.CARD_BG }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: TD.TEXT_1 }}>
                    Ask Claude
                  </h2>
                  <p className="text-sm" style={{ color: TD.TEXT_3 }}>
                    {canAsk ? `${dataContext?.data?.length || 0} rows loaded` : 'Load data to ask questions'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: TD.TEXT_2 }}
                    title="Minimize"
                  >
                    Minimize
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExpanded((value) => !value)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: TD.TEXT_2 }}
                  >
                    {isExpanded ? 'Narrow' : 'Expand'}
                  </button>
                  <button
                    type="button"
                    onClick={resetConversation}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: TD.TEXT_2 }}
                  >
                    Reset
                  </button>
                  {!lockOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        setIsExpanded(false)
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5 hover:text-slate-200"
                      style={{ color: TD.TEXT_3 }}
                      aria-label="Close Ask Claude"
                    >
                      <span className="text-xl leading-none">&times;</span>
                    </button>
                  )}
                </div>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4"
              style={{ background: TD.PAGE_BG }}
            >
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  dataContext={dataContext}
                  onUpgrade={goToPricing}
                  showInlineDashboardPreview={showInlineDashboardPreview}
                />
              ))}
              {isLoading && <LoadingSkeleton toolStatus={toolStatus} />}
            </div>

            <form
              onSubmit={submit}
              className="p-3 sm:p-4"
              style={{ borderTop: `0.5px solid ${TD.CARD_BORDER}`, background: TD.CARD_BG }}
            >
              {!canAsk && (
                <p
                  className="mb-2 rounded-lg px-3 py-2 text-xs"
                  style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#fcd34d',
                    border: '0.5px solid rgba(245, 158, 11, 0.35)',
                  }}
                >
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
                  className="min-h-[48px] flex-1 resize-none rounded-xl px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/35 disabled:opacity-60"
                  style={{
                    border: `0.5px solid ${TD.CARD_BORDER}`,
                    background: TD.PAGE_BG,
                    color: TD.TEXT_1,
                  }}
                />
                <button
                  type="submit"
                  disabled={!canAsk || isLoading || !draft.trim()}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: TD.ACCENT_BLUE }}
                >
                  Send
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )

  if (typeof document === 'undefined') return panelUi
  return createPortal(panelUi, document.body)
}
