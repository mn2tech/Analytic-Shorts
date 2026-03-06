import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getConversations, getThread, sendMessage } from '../services/messagesService'
import { searchUsers } from '../services/profileService'
import { supabase } from '../lib/supabase'
import Loader from './Loader'
import EmojiPanel from './EmojiPanel'

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

export default function MessagingPanel({ open, onClose }) {
  const { user, userProfile } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [activeTab, setActiveTab] = useState('focused')
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [thread, setThread] = useState(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [threadError, setThreadError] = useState(null)
  const [partnerTyping, setPartnerTyping] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const panelRef = useRef(null)
  const searchDebounceRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const channelRef = useRef(null)
  const typingDebounceRef = useRef(null)

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' })
  }, [])

  useEffect(() => {
    if (thread?.messages?.length) scrollToBottom(true)
  }, [thread?.messages?.length, scrollToBottom])

  useEffect(() => {
    if (!user || !open) return
    setLoading(true)
    getConversations()
      .then((data) => setConversations(data.conversations || []))
      .catch(() => setConversations([]))
      .finally(() => setLoading(false))
  }, [user, open])

  useEffect(() => {
    const q = search.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      searchUsers(q)
        .then((users) => setSearchResults(users || []))
        .catch(() => setSearchResults([]))
    }, 250)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [search])

  useEffect(() => {
    if (!user?.id || !selectedUserId || !open) return
    if (String(selectedUserId) === String(user.id)) {
      setSelectedUserId(null)
      return
    }
    setLoadingThread(true)
    setThreadError(null)
    getThread(selectedUserId)
      .then((data) => {
        setThread(data)
        setThreadError(null)
        getConversations().then((r) => setConversations(r.conversations || []))
        window.dispatchEvent(new CustomEvent('messages-unread-changed'))
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message
        const details = err.response?.data?.details
        setThreadError(details ? `${msg} (${details})` : msg)
      })
      .finally(() => setLoadingThread(false))
  }, [user, selectedUserId, open])

  useEffect(() => {
    if (!user?.id || !selectedUserId || !open) return
    const channelName = `dm:${[user.id, selectedUserId].sort().join('-')}`
    const channel = supabase.channel(channelName)
    channelRef.current = channel
    let partnerTimeout = null
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId === selectedUserId && payload?.typing) {
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
  }, [user?.id, selectedUserId, open])

  useEffect(() => {
    if (!user?.id || !selectedUserId || !channelRef.current || !open) return
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
  }, [reply, user?.id, selectedUserId, open])

  const handleConversationClick = (otherUserId) => {
    if (String(otherUserId) === String(user?.id)) return
    setSelectedUserId(otherUserId)
  }

  const handleBackToList = () => {
    setSelectedUserId(null)
    setThread(null)
    setReply('')
    setThreadError(null)
    setEmojiOpen(false)
  }

  const retryLoadThread = useCallback(() => {
    if (!selectedUserId || !user) return
    setThreadError(null)
    setLoadingThread(true)
    getThread(selectedUserId)
      .then((data) => {
        setThread(data)
        getConversations().then((r) => setConversations(r.conversations || []))
        window.dispatchEvent(new CustomEvent('messages-unread-changed'))
      })
      .catch((err) => {
        const msg = err.response?.data?.error || err.message
        const details = err.response?.data?.details
        setThreadError(details ? `${msg} (${details})` : msg)
      })
      .finally(() => setLoadingThread(false))
  }, [selectedUserId, user])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!reply.trim() || !selectedUserId || sending) return
    setSending(true)
    try {
      const sent = await sendMessage(selectedUserId, reply.trim())
      setReply('')
      setPartnerTyping(false)
      if (channelRef.current) channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, typing: false } })
      setThread((prev) => (prev ? { ...prev, messages: [...(prev.messages || []), sent] } : null))
    } catch (err) {
      setThreadError(err.response?.data?.error || err.message)
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  const displayList = conversations
    .filter((c) => !search.trim() || c.other_display_name?.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((c) => (activeTab === 'focused' ? c.unread : !c.unread))

  const existingIds = new Set(displayList.map((c) => c.other_user_id))
  const peopleToShow = search.trim().length >= 2
    ? (searchResults || []).filter((u) => !existingIds.has(u.user_id))
    : []

  const hasConversations = displayList.length > 0
  const hasPeople = peopleToShow.length > 0
  const showEmpty = !loading && !hasConversations && !hasPeople

  const showThread = !!selectedUserId
  const panelWidthClass = showThread ? 'max-w-2xl' : 'max-w-md'

  const panelContent = (
    <>
      <div
        className="fixed inset-0 bg-black/20 z-[60]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        data-messaging-panel
        className={`z-[70] w-full ${panelWidthClass} shrink-0 bg-white shadow-2xl flex flex-col transition-[height,max-height] duration-300 ease-out ${
          collapsed
            ? 'h-14 rounded-t-lg shadow-lg'
            : 'h-[85vh] max-h-[85vh] rounded-t-lg'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {showThread && (
              <button
                type="button"
                onClick={handleBackToList}
                className="p-1.5 -ml-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                aria-label="Back to conversations"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm overflow-hidden shrink-0">
              {userProfile?.avatar_url ? (
                <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(userProfile?.name || user?.email)
              )}
            </div>
            <h2 className="font-semibold text-gray-900 truncate">{showThread && thread ? thread.other_display_name : 'Messaging'}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              to={selectedUserId ? `/messages?with=${selectedUserId}` : '/messages'}
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open in full page"
              aria-label="Open messages in full page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
              aria-label={collapsed ? 'Expand messaging panel' : 'Collapse messaging panel'}
            >
              {collapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close messaging panel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {!collapsed && (
        <div className="flex flex-1 min-h-0">
          {/* Left: Conversation list (always visible, narrower when thread open) */}
          <aside className={`flex flex-col border-r border-gray-200 shrink-0 ${showThread ? 'w-56' : 'flex-1 min-w-0'}`}>
            {!showThread && (
              <>
                <div className="px-4 py-2 border-b border-gray-100 shrink-0">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search messages or people"
                      className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex border-b border-gray-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('focused')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'focused' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Focused
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('other')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'other' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Other
                  </button>
                </div>
              </>
            )}
            {showThread && (
              <div className="px-3 py-2 border-b border-gray-100 shrink-0">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            )}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading && <Loader />}
              {!loading && displayList.length === 0 && peopleToShow.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {search.trim().length >= 2 ? 'No matches found 🔍' : activeTab === 'focused' ? 'No unread messages ✨' : 'No other conversations 💬'}
                  {search.trim().length < 2 && !showThread && (
                    <Link to="/feed" onClick={onClose} className="block mt-2 text-blue-600 hover:underline">Message someone from the Feed 👋</Link>
                  )}
                </div>
              )}
              {!loading && (displayList.length > 0 || peopleToShow.length > 0) && (
                <ul>
                  {displayList.map((c) => (
                    <li key={c.other_user_id}>
                      <button
                        type="button"
                        onClick={() => handleConversationClick(c.other_user_id)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${selectedUserId === c.other_user_id ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs overflow-hidden">
                          {c.other_avatar_url ? (
                            <img src={c.other_avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(c.other_display_name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate text-sm">{c.other_display_name}</p>
                          <p className="text-xs text-gray-500 truncate">{c.last_from_me ? 'You: ' : ''}{c.last_message}</p>
                        </div>
                        {c.unread && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />}
                      </button>
                    </li>
                  ))}
                  {peopleToShow.length > 0 && (
                    <>
                      {displayList.length > 0 && (
                        <li className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                          People
                        </li>
                      )}
                      {peopleToShow.map((u) => (
                        <li key={u.user_id}>
                          <button
                            type="button"
                            onClick={() => handleConversationClick(u.user_id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 transition-colors ${selectedUserId === u.user_id ? 'bg-blue-50' : ''}`}
                          >
                            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs overflow-hidden">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                getInitials(u.name)
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 truncate text-sm">{u.name}</p>
                              <p className="text-xs text-gray-500">Start a conversation</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </>
                  )}
                </ul>
              )}
            </div>
          </aside>

          {/* Right: Thread view (when conversation selected) */}
          {showThread && (
            <main className="flex-1 flex flex-col min-w-0 min-h-0">
              {loadingThread && (
                <div className="flex-1 flex items-center justify-center p-6">
                  <Loader />
                </div>
              )}
              {!loadingThread && threadError && !thread && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-red-600 font-medium mb-1">Couldn&apos;t load conversation</p>
                  <p className="text-sm text-gray-600 mb-4">{threadError}</p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={retryLoadThread}
                      className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                    >
                      Retry
                    </button>
                    <button type="button" onClick={handleBackToList} className="px-4 py-2 text-sm text-gray-600 hover:underline">
                      Back
                    </button>
                  </div>
                </div>
              )}
              {!loadingThread && !thread && !threadError && (
                <div className="flex-1 flex items-center justify-center p-6 text-center text-gray-500 text-sm">
                  Couldn&apos;t open this conversation.
                </div>
              )}
              {!loadingThread && thread && (
                <>
                  <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 scroll-smooth min-h-0">
                    {thread.messages?.length === 0 && (
                      <p className="text-center text-gray-500 text-sm">No messages yet. Say hello! 👋</p>
                    )}
                    {(thread.messages || []).map((m) => {
                      const isMe = m.from_user_id === user.id
                      return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
                              isMe ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-900 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                            <p className={`text-xs mt-1 ${isMe ? 'text-blue-200' : 'text-gray-500'}`}>{formatTime(m.created_at)}</p>
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
                  {threadError && (
                    <div className="px-4 py-2 bg-red-50 text-red-700 text-sm shrink-0">{threadError}</div>
                  )}
                  <form onSubmit={handleSend} className="flex flex-col border-t border-gray-200 shrink-0">
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
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0"
                        maxLength={10000}
                      />
                      <button
                        type="submit"
                        disabled={!reply.trim() || sending}
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 shrink-0"
                      >
                        {sending ? '…' : 'Send'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </main>
          )}
        </div>
        )}
      </div>
    </>
  )

  const portalRoot = typeof document !== 'undefined' && (document.getElementById('messaging-portal-root') || document.body)
  return portalRoot ? createPortal(panelContent, portalRoot) : null
}
