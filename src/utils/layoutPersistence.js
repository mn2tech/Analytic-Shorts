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

/**
 * Validate and fix corrupted layouts
 */
export const validateAndFixLayouts = (layouts) => {
  if (!layouts || typeof layouts !== 'object') {
    return null
  }
  
  const validBreakpoints = ['lg', 'md', 'sm', 'xs', 'xxs']
  const fixed = {}
  
  validBreakpoints.forEach(bp => {
    if (Array.isArray(layouts[bp])) {
      // Filter out invalid items
      fixed[bp] = layouts[bp].filter(item => 
        item && 
        typeof item.i === 'string' && 
        typeof item.x === 'number' && 
        typeof item.y === 'number' && 
        typeof item.w === 'number' && 
        typeof item.h === 'number'
      )
    }
  })
  
  return Object.keys(fixed).length > 0 ? fixed : null
}

