import { createContext, useContext, useState, useCallback } from 'react'

const NotificationContext = createContext(null)

const TOAST_DURATION_MS = 4000

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), TOAST_DURATION_MS)
  }, [removeToast])

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg shadow-lg px-4 py-3 text-sm font-medium text-white transition-all duration-200 ${
              t.type === 'success'
                ? 'bg-green-600'
                : t.type === 'error'
                  ? 'bg-red-600'
                  : t.type === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-gray-800'
            }`}
            role="alert"
          >
            {t.message}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const ctx = useContext(NotificationContext)
  if (!ctx) return { notify: () => {} }
  return ctx
}
