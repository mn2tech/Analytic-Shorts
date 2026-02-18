import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY_PORTRAIT_MODE = 'nm2_portrait_mode'

const PortraitModeContext = createContext({
  enabled: false,
  setEnabled: () => {},
  toggle: () => {},
})

export function PortraitModeProvider({ children }) {
  const [enabled, setEnabledState] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PORTRAIT_MODE)
      if (raw === 'true') setEnabledState(true)
    } catch {
      // ignore
    }
  }, [])

  const setEnabled = useCallback((next) => {
    const v = !!next
    setEnabledState(v)
    try {
      localStorage.setItem(STORAGE_KEY_PORTRAIT_MODE, v ? 'true' : 'false')
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(() => setEnabledState((prev) => {
    const v = !prev
    try {
      localStorage.setItem(STORAGE_KEY_PORTRAIT_MODE, v ? 'true' : 'false')
    } catch {
      // ignore
    }
    return v
  }), [])

  const value = useMemo(() => ({ enabled, setEnabled, toggle }), [enabled, setEnabled, toggle])

  return (
    <PortraitModeContext.Provider value={value}>
      {children}
    </PortraitModeContext.Provider>
  )
}

export function usePortraitMode() {
  return useContext(PortraitModeContext)
}

