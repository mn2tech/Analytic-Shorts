/**
 * AppLayout – top Navbar + main content + footer (no left sidebar).
 * Renders only <Outlet /> when Studio is in fullscreen (localStorage aiVisualBuilder_fullScreen).
 */

import { useState, useCallback, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ChatBot from '../components/ChatBot'
import MessagingPanel from '../components/MessagingPanel'
import { useAuth } from '../contexts/AuthContext'
import { getUnreadCount } from '../services/messagesService'

const STORAGE_KEY_FULLSCREEN = 'aiVisualBuilder_fullScreen'

function AppLayout() {
  const location = useLocation()
  const { user } = useAuth()
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0)
  const [messagingPanelOpen, setMessagingPanelOpen] = useState(false)

  const refreshMessagesUnread = useCallback(() => {
    if (!user) return
    getUnreadCount().then(setMessagesUnreadCount).catch(() => setMessagesUnreadCount(0))
  }, [user])

  useEffect(() => {
    if (!user) {
      setMessagesUnreadCount(0)
      return
    }
    refreshMessagesUnread()
    const onChanged = () => refreshMessagesUnread()
    window.addEventListener('messages-unread-changed', onChanged)
    const onFocus = () => refreshMessagesUnread()
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('messages-unread-changed', onChanged)
      window.removeEventListener('focus', onFocus)
    }
  }, [user, refreshMessagesUnread])

  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.replace('#', '')
    if (!id) return
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => clearTimeout(t)
  }, [location.pathname, location.hash])

  const isStudioFullscreen =
    location.pathname.startsWith('/studio') &&
    typeof window !== 'undefined' &&
    (() => {
      try {
        return localStorage.getItem(STORAGE_KEY_FULLSCREEN) === 'true'
      } catch {
        return false
      }
    })()

  if (isStudioFullscreen) {
    return <Outlet />
  }

  const hideFooter = location.pathname.startsWith('/studio')

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-slate-950">
      <header className="shrink-0">
        <div className="border-b border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <Navbar
            onOpenMessaging={() => setMessagingPanelOpen(true)}
            messagesUnreadCount={messagesUnreadCount}
          />
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      <ChatBot />
      {user && <MessagingPanel open={messagingPanelOpen} onClose={() => setMessagingPanelOpen(false)} />}
    </div>
  )
}

export default AppLayout
