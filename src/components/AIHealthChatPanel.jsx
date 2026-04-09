import { useEffect, useMemo, useRef } from 'react'
import VoiceInputButton from './VoiceInputButton'
import QuickQuestionButtons from './QuickQuestionButtons'

function AiIcon({ className = 'w-4 h-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
      <path
        d="M12 6.6l1.8 2.2 2.8.7-1.7 2.4.1 2.9-2.9-.8-2.8.8.1-2.9-1.8-2.4 2.8-.7L12 6.6z"
        fill="currentColor"
      />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <div className="w-4 h-4 rounded-full border-2 border-blue-200/40 border-t-blue-300 animate-spin" aria-hidden="true" />
  )
}

export default function AIHealthChatPanel({
  open,
  onToggle,
  messages,
  input,
  onInputChange,
  onSend,
  onVoiceTranscript,
  onClear,
  onQuickQuestion,
  loading,
  error,
}) {
  const historyRef = useRef(null)
  const canSend = useMemo(() => Boolean(input?.trim()) && !loading, [input, loading])

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight
    }
  }, [messages, loading, open])

  return (
    <>
      {open && (
        <aside className="fixed right-4 top-14 z-[80] pointer-events-auto h-[min(70vh,620px)] w-[360px] max-w-[92vw] rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
          <div className="h-full flex flex-col">
            <header className="px-4 py-3 bg-blue-700 border-b border-blue-400/30">
              <h2 className="text-sm font-bold tracking-wide text-white flex items-center gap-2">
                <AiIcon className="w-4 h-4" />
                <span>AI Health Chat</span>
              </h2>
              <p className="text-[11px] text-blue-100/90 mt-0.5">
                Operations assistant for throughput, congestion, capacity, LOS, transfers, and ROI only.
              </p>
            </header>

            <div ref={historyRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-950/50">
              {messages.map((message, idx) => (
                <div key={`${message.role}-${idx}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-slate-800 text-slate-100 border border-white/10 rounded-bl-md'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-slate-300 text-xs px-1">
                  <LoadingSpinner />
                  <span>Analyzing live hospital operations...</span>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-slate-900 p-3 space-y-3">
              <QuickQuestionButtons onAsk={onQuickQuestion} disabled={loading} />
              {error && (
                <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-lg px-2.5 py-2">
                  {error}
                </div>
              )}
              <form onSubmit={onSend} className="space-y-2">
                <textarea
                  rows={2}
                  value={input}
                  onChange={(event) => onInputChange?.(event.target.value)}
                  placeholder="Ask about ER congestion, boarding, LOS, occupancy, transfers, or operational impact..."
                  className="w-full resize-none rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={!canSend}
                    className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                  <VoiceInputButton onTranscript={onVoiceTranscript} disabled={loading} />
                  <button
                    type="button"
                    onClick={onClear}
                    disabled={loading}
                    className="px-3 py-2 rounded-lg border border-white/15 bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear Chat
                  </button>
                </div>
              </form>
            </div>
          </div>
        </aside>
      )}

      <button
        type="button"
        onClick={onToggle}
        className="fixed right-4 top-4 z-[81] pointer-events-auto inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg border border-blue-400/50"
      >
        <AiIcon />
        <span>{open ? 'Close' : 'AI Health Chat'}</span>
      </button>
    </>
  )
}
