export function trackEvent(eventName, params = {}) {
  if (!eventName) return
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params)
}

