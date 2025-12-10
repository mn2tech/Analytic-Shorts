// Utility functions for persisting and restoring dashboard layouts

const LAYOUT_STORAGE_KEY = 'dashboard_layouts'
const WIDGET_VISIBILITY_KEY = 'dashboard_widget_visibility'

/**
 * Save layouts to localStorage
 * @param {Object} layouts - Layouts object with breakpoint keys
 */
export const saveLayouts = (layouts) => {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layouts))
    return true
  } catch (error) {
    console.error('Error saving layouts:', error)
    return false
  }
}

/**
 * Load layouts from localStorage
 * @returns {Object|null} Saved layouts or null if not found
 */
export const loadLayouts = () => {
  try {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
    return null
  } catch (error) {
    console.error('Error loading layouts:', error)
    return null
  }
}

/**
 * Save widget visibility state
 * @param {Object} visibility - Object mapping widget IDs to boolean visibility
 */
export const saveWidgetVisibility = (visibility) => {
  try {
    localStorage.setItem(WIDGET_VISIBILITY_KEY, JSON.stringify(visibility))
    return true
  } catch (error) {
    console.error('Error saving widget visibility:', error)
    return false
  }
}

/**
 * Load widget visibility state
 * @returns {Object|null} Saved visibility state or null if not found
 */
export const loadWidgetVisibility = () => {
  try {
    const saved = localStorage.getItem(WIDGET_VISIBILITY_KEY)
    if (saved) {
      return JSON.parse(saved)
    }
    return null
  } catch (error) {
    console.error('Error loading widget visibility:', error)
    return null
  }
}

/**
 * Reset layouts to default (clear saved layouts)
 */
export const resetLayouts = () => {
  try {
    localStorage.removeItem(LAYOUT_STORAGE_KEY)
    localStorage.removeItem(WIDGET_VISIBILITY_KEY)
    return true
  } catch (error) {
    console.error('Error resetting layouts:', error)
    return false
  }
}

