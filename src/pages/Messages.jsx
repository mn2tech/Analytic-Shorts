import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getConversations, getThread, sendMessage } from '../services/messagesService'
import { supabase } from '../lib/supabase'
import Loader from '../components/Loader'
import EmojiPanel from '../components/EmojiPanel'

const TYPING_DEBOUNCE_MS = 300
const TYPING_TIMEOUT_MS = 2500

function getInitials(name) {
  if (!name || !String(name).trim()) return '?'
  const parts = String(name).trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  return String(name).slice(0, 2).toUpperCase()
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Parse with userId from search ?with= or hash #with= (hash survives email client redirects)
function parseWithUserId(searchParams, location) {
  const fromSearch = searchParams.get('with')
  if (fromSearch) return fromSearch
  const hash = location.hash || ''
  const m = hash.match(/#(?:with|w)=([^&]+)/)
  if (m) {
    try {
      return decodeURIComponent(m[1])
    } catch {
      return null
    }
  }
  return null
}

export default function Messages() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const withUserId = parseWithUserId(searchParams, location)

  // Sync hash to search params so URL is consistent (e.g. when arriving from email link with #with=uuid)
  useEffect(() => {
    if (withUserId && !searchParams.get('with')) {
      setSearchParams({ with: withUserId }, { replace: true })
    }
  }, [withUserId, searchParams, setSearchParams])

  const [conversations, setConversations] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [thread, setThread] = useState(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' })
  }, [])

  useEffect(() => {
    if (thread?.messages?.length) scrollToBottom(true)
  }, [thread?.messages?.length, scrollToBottom])

  const channelRef = useRef(null)

  // Supabase Realtime: typing indicator – subscribe and store channel
  useEffect(() => {
    if (!user?.id || !withUserId) return
    const channelName = `dm:${[user.id, withUserId].sort().join('-')}`
    const channel = supabase.channel(channelName)
    channelRef.current = channel
    let partnerTimeout = null

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId === withUserId && payload?.typing) {
          setPartnerTyping(true)
          if (partnerTimeout) clearTimeout(partnerTimeout)
          partnerTimeout = setTimeout(() => setPartnerTyping(false), TYPING_TIMEOUT_MS)
        }
      })
      .subscribe()

    return () => {
      if (partnerTimeout) clearTimeout(partnerTimeout)
      channelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [user?.id, withUserId])

  const typingDebounceRef = useRef(null)

  useEffect(() => {
    if (!user?.id || !withUserId || !channelRef.current) return
    const ch = channelRef.current
    if (reply.trim().length > 0) {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
      typingDebounceRef.current = setTimeout(() => {
        ch.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, typing: true } })
      }, TYPING_DEBOUNCE_MS)
    } else {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
      typingDebounceRef.current = setTimeout(() => {
        ch.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, typing: false } })
      }, TYPING_DEBOUNCE_MS)
    }
    return () => {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    }
  }, [reply, user?.id, withUserId])

  useEffect(() => {
    if (!user) return
    setLoadingConvos(true)
    getConversations()
      .then((data) => setConversations(data.conversations || []))
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoadingConvos(false))
  }, [user])

  useEffect(() => {
    if (!user || !withUserId) {
      setThread(null)
      return
    }
    if (String(withUserId) === String(user.id)) {
      setSearchParams({})
      setThread(null)
      setError(null)
      return
    }
    setLoadingThread(true)
    setError(null)
    getThread(withUserId)
      .then((data) => {
        setThread(data)
        setError(null)
        // Backend marked messages as read; refresh conversation list so blue dot updates
        getConversations().then((r) => setConversations(r.conversations || []))
        window.dispatchEvent(new CustomEvent('messages-unread-changed'))
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message
        const details = err.response?.data?.details
        setError(details ? `${msg} (${details})` : msg)
        if (msg && String(msg).includes('with yourself')) {
          setSearchParams({})
        }
      })
      .finally(() => setLoadingThread(false))
  }, [user, withUserId])

  const retryLoadThread = useCallback(() => {
    if (!withUserId || !user) return
    setError(null)
    setLoadingThread(true)
    getThread(withUserId)
      .then((data) => {
        setThread(data)
        getConversations().then((r) => setConversations(r.conversations || []))
        window.dispatchEvent(new CustomEvent('messages-unread-changed'))
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message
        const details = err.response?.data?.details
        setError(details ? `${msg} (${details})` : msg)
      })
      .finally(() => setLoadingThread(false))
  }, [withUserId, user])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!reply.trim() || !withUserId || sending) return
    setSending(true)
    try {
      const sent = await sendMessage(withUserId, reply.trim())
      setReply('')
      setPartnerTyping(false)
      if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, typing: false } })
      setThread((prev) => (prev ? { ...prev, messages: [...(prev.messages || []), sent] } : null))
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setSending(false)
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-gray-600">Sign in to view and send messages.</p>
        <Link to="/login" className="mt-4 inline-block text-blue-600 hover:underline">Sign in</Link>
      </div>
    )
  }

  const other = thread ? { id: thread.other_user_id, name: thread.other_display_name, avatar: thread.other_avatar_url } : null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row gap-4 h-[calc(100vh-10rem)] min-h-[400px]">
        {/* Conversation list */}
        <aside className="w-full sm:w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">Messages</h1>
            <p className="text-xs text-gray-500">Message other members</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvos && <Loader />}
            {!loadingConvos && conversations.length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet 💬 Message someone from the Feed 👋
              </div>
            )}
            {!loadingConvos && conversations.length > 0 && (
              <ul>
                {conversations.map((c) => (
                  <li key={c.other_user_id}>
                    <button
                      type="button"
                      onClick={() => setSearchParams({ with: c.other_user_id })}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                        withUserId === c.other_user_id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm overflow-hidden">
                        {c.other_avatar_url ? (
                          <img src={c.other_avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(c.other_display_name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{c.other_display_name}</p>
                        <p className="text-xs text-gray-500 truncate">{c.last_from_me ? 'You: ' : ''}{c.last_message}</p>
                      </div>
                      {c.unread && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600" aria-label="Unread" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <main className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-w-0">
          {!withUserId && (
            <div className="flex-1 flex items-center justify-center text-gray-500 p-6">
              <div className="text-center">
                <p className="mb-2">Select a conversation or message someone from the Feed 💬</p>
                <Link to="/feed" className="text-blue-600 hover:underline">Go to Feed 👋</Link>
              </div>
            </div>
          )}
          {withUserId && loadingThread && (
            <div className="flex-1 flex items-center justify-center p-6">
              <Loader />
            </div>
          )}
          {withUserId && !loadingThread && error && !thread && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-red-600 font-medium mb-1">Couldn&apos;t load conversation</p>
              <p className="text-sm text-gray-600 mb-2">{error}</p>
              {String(error).toLowerCase().includes('auth') || String(error).toLowerCase().includes('token') ? (
                <p className="text-xs text-gray-500 mb-4">Your session may have expired. Try signing in again.</p>
              ) : (
                <p className="text-xs text-gray-500 mb-4">If this link came from an email, try opening it again or message from the Feed.</p>
              )}
              <div className="flex gap-3 justify-center flex-wrap">
                <button
                  type="button"
                  onClick={retryLoadThread}
                  className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                  Retry
                </button>
                <Link to="/feed" className="px-4 py-2 text-sm font-medium text-blue-600 hover:underline">Back to Feed 👋</Link>
              </div>
            </div>
          )}
          {withUserId && !loadingThread && !thread && !error && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-gray-600 mb-2">Couldn&apos;t open this conversation.</p>
              <Link to="/feed" className="text-blue-600 hover:underline text-sm">Message someone from the Feed 👋</Link>
            </div>
          )}
          {withUserId && !loadingThread && thread && (
            <>
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                <Link to="/feed" className="text-gray-500 hover:text-gray-700 sm:hidden">←</Link>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm overflow-hidden">
                  {thread.other_avatar_url ? (
                    <img src={thread.other_avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(thread.other_display_name)
                  )}
                </div>
                <p className="font-semibold text-gray-900">{thread.other_display_name}</p>
              </div>
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 scroll-smooth">
                {thread.messages?.length === 0 && (
                  <p className="text-center text-gray-500 text-sm">No messages yet. Say hello! 👋</p>
                )}
                {(thread.messages || []).map((m) => {
                  const isMe = m.from_user_id === user.id
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
                          isMe ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {partnerTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-500 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                      <span className="inline-flex gap-1" aria-label="Typing">
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} aria-hidden="true" className="h-0" />
              </div>
              {error && (
                <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">{error}</div>
              )}
              <form onSubmit={handleSend} className="flex flex-col border-t border-gray-200">
                {emojiOpen && (
                  <div className="px-4 pt-4 pb-2 border-b border-gray-100 bg-gray-50/50">
                    <EmojiPanel onPick={(emoji) => setReply((r) => r + emoji)} />
                  </div>
                )}
                <div className="flex gap-2 items-center p-4">
                  <button
                    type="button"
                    onClick={() => setEmojiOpen((o) => !o)}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl border text-xl transition-colors ${
                      emojiOpen ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                    aria-label="Insert emoji"
                    title="Insert emoji"
                  >
                    😀
                  </button>
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    maxLength={10000}
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim() || sending}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {sending ? '…' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
