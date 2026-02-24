/**
 * Vitest setup: jsdom does not provide ResizeObserver, which Recharts ResponsiveContainer uses.
 */
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock
