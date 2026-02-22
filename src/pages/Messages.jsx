import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getConversations, getThread, sendMessage } from '../services/messagesService'
import Loader from '../components/Loader'

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

export default function Messages() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const withUserId = searchParams.get('with')

  const [conversations, setConversations] = useState([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [thread, setThread] = useState(null)
  const [loadingThread, setLoadingThread] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

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
    setLoadingThread(true)
    setError(null)
    getThread(withUserId)
      .then((data) => {
        setThread(data)
        // Backend marked messages as read; refresh conversation list so blue dot updates
        getConversations().then((r) => setConversations(r.conversations || []))
        window.dispatchEvent(new CustomEvent('messages-unread-changed'))
      })
      .catch((err) => setError(err.response?.data?.error || err.message))
      .finally(() => setLoadingThread(false))
  }, [user, withUserId])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!reply.trim() || !withUserId || sending) return
    setSending(true)
    try {
      const sent = await sendMessage(withUserId, reply.trim())
      setReply('')
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
                No conversations yet. Message someone from the Feed.
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
                <p className="mb-2">Select a conversation or message someone from the Feed.</p>
                <Link to="/feed" className="text-blue-600 hover:underline">Go to Feed</Link>
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
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <p className="text-xs text-gray-500">Make sure the direct_messages migration has been run in Supabase. Then try again from the Feed.</p>
              <Link to="/feed" className="mt-4 text-blue-600 hover:underline text-sm">Back to Feed</Link>
            </div>
          )}
          {withUserId && !loadingThread && !thread && !error && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <p className="text-gray-600 mb-2">Couldn&apos;t open this conversation.</p>
              <Link to="/feed" className="text-blue-600 hover:underline text-sm">Message someone from the Feed</Link>
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {thread.messages?.length === 0 && (
                  <p className="text-center text-gray-500 text-sm">No messages yet. Say hello!</p>
                )}
                {(thread.messages || []).map((m) => {
                  const isMe = m.from_user_id === user.id
                  return (
                    <div
                      key={m.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                          isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
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
              </div>
              {error && (
                <div className="px-4 py-2 bg-red-50 text-red-700 text-sm">{error}</div>
              )}
              <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
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
