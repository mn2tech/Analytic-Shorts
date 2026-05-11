import { useEffect, useMemo, useRef, useState } from 'react'

function initialsFromUser(user) {
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return String(name).slice(0, 2).toUpperCase()
}

/** In production, set VITE_API_URL (e.g. https://api.nm2tech-sas.com) so /api calls hit the Node backend. */
function apiUrl(path) {
  const base = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  if (!base) return p
  return `${base}${p}`
}

/** Strip the opening assistant greeting; the API requires the first message to be from the user. */
function toApiMessages(messages) {
  if (!messages.length) return []
  const start = messages[0]?.role === 'assistant' ? 1 : 0
  return messages
    .slice(start)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0)
}

export default function AiAssistantPanel({ user, contractor, accessToken }) {
  const displayName = useMemo(() => {
    return (
      contractor?.name?.trim() ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      (user?.email ? user.email.split('@')[0] : '') ||
      'there'
    )
  }, [contractor?.name, user])

  const greetingText = useMemo(
    () => `Hi ${displayName}! I'm your NM2TECH HR assistant. How can I help you today?`,
    [displayName]
  )

  const [messages, setMessages] = useState(() => [{ role: 'assistant', content: greetingText }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', content: greetingText }]
      }
      return prev
    })
  }, [greetingText])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, error])

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const headerName =
    contractor?.name?.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Contractor'

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!accessToken) {
      setError('Your session has no access token. Sign out and sign in again.')
      return
    }

    setError(null)
    const nextUser = { role: 'user', content: text }
    const history = [...messages, nextUser]
    setMessages(history)
    setInput('')
    setLoading(true)

    const apiMessages = toApiMessages(history)
    if (apiMessages.length === 0) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(apiUrl('/api/ai/chat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: apiMessages,
          contractorName: displayName,
        }),
      })
      const raw = await res.text()
      let data = {}
      try {
        data = raw ? JSON.parse(raw) : {}
      } catch {
        data = {}
      }
      if (!res.ok) {
        const detail =
          (typeof data.error === 'string' && data.error.trim()) ||
          (typeof data.details === 'string' && data.details.trim()) ||
          (typeof data.message === 'string' && data.message.trim()) ||
          (data.code ? `Error code: ${data.code}` : '')
        const snippet =
          typeof raw === 'string' && raw.trim() && !detail ? raw.trim().slice(0, 240) : ''
        throw new Error(detail || snippet || `HTTP ${res.status} (no error body — is the backend on port 5000?)`)
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || '(empty response)' }])
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Request failed'
      let hint = ''
      if (/port 5000|ECONNREFUSED|Failed to fetch|NetworkError/i.test(msg)) {
        hint = ' Start the backend from the repo root (`npm run server`) so Vite can proxy /api to localhost:5000.'
      } else if (!/Anthropic|ANTHROPIC|Database not configured|token|Authentication|Invalid or expired/i.test(msg)) {
        hint = ' If this is an AI error, set ANTHROPIC_API_KEY in backend/.env and restart the backend.'
      }
      setError(`${msg}${hint}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col md:h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold text-slate-900">AI assistant</h1>
      <p className="mt-1 text-sm text-slate-600">Chat with the NM2TECH HR assistant.</p>

      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-full border border-slate-200 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0078D4] text-sm font-semibold text-white">
              {initialsFromUser(user)}
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-900">{headerName}</div>
            <div className="truncate text-xs text-slate-500">{user?.email || ''}</div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[min(85%,28rem)] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-br-md bg-[#0078D4] text-white'
                    : 'rounded-bl-md bg-slate-100 text-slate-800 ring-1 ring-slate-200/80'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex w-full justify-start">
              <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 text-sm italic text-slate-600 ring-1 ring-slate-200/80">
                NM2TECH Assistant is typing...
              </div>
            </div>
          )}
          {error && (
            <div className="flex w-full justify-start">
              <div className="max-w-[min(85%,28rem)] rounded-2xl rounded-bl-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                {error}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-100 p-3">
          <div className="flex gap-2">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
              disabled={!accessToken}
              className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#0078D4] focus:outline-none focus:ring-1 focus:ring-[#0078D4] disabled:bg-slate-50 disabled:text-slate-500"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim() || !accessToken}
              className="shrink-0 self-end rounded-lg bg-[#0078D4] px-4 py-2 text-sm font-semibold text-white hover:bg-[#006cbd] disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
