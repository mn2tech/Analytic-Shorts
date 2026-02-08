/**
 * Clear analytics data from sessionStorage and reload the app (fresh start from home).
 * Use when the user wants to "start over" or recover from a bad state.
 */
export function clearAnalyticsDataAndReload() {
  sessionStorage.removeItem('analyticsData')
  location.reload()
}
