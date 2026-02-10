/**
 * Schema utility functions for multi-page app support and DashboardSpec (AI Visual Builder).
 * Handles backwards compatibility with single-page and multi-page dashboards.
 */

/**
 * True if schema is the DashboardSpec format (title + filters/charts/kpis, no pages).
 * Used by Studio and StudioAppView to choose renderer.
 */
export function isDashboardSpec(schema) {
  if (!schema || typeof schema !== 'object') return false
  const hasNewShape = Array.isArray(schema.filters) && Array.isArray(schema.charts)
  const noOldPages = !schema.pages || !Array.isArray(schema.pages) || schema.pages.length === 0
  return !!(hasNewShape && (schema.title != null || noOldPages))
}

/**
 * Get effective filters, kpis, and charts from a DashboardSpec.
 * If spec has 2+ tabs, aggregates from all tabs; otherwise uses top-level.
 * Used for summary text and "has content" checks.
 */
export function getSpecContent(spec) {
  if (!spec || typeof spec !== 'object') return { filters: [], kpis: [], charts: [] }
  const tabs = spec.tabs
  if (Array.isArray(tabs) && tabs.length >= 2) {
    const filters = []
    const kpis = []
    const charts = []
    tabs.forEach((t) => {
      if (t && typeof t === 'object') {
        if (Array.isArray(t.filters)) filters.push(...t.filters)
        if (Array.isArray(t.kpis)) kpis.push(...t.kpis)
        if (Array.isArray(t.charts)) charts.push(...t.charts)
      }
    })
    return { filters, kpis, charts }
  }
  return {
    filters: Array.isArray(spec.filters) ? spec.filters : [],
    kpis: Array.isArray(spec.kpis) ? spec.kpis : [],
    charts: Array.isArray(spec.charts) ? spec.charts : []
  }
}

/**
 * True if the DashboardSpec has at least one filter, KPI, or chart (top-level or in tabs).
 */
export function hasSpecContent(spec) {
  const { filters, kpis, charts } = getSpecContent(spec)
  return filters.length + kpis.length + charts.length > 0
}

/**
 * Normalize a dashboard schema to ensure it has pages structure (legacy) or pass through DashboardSpec.
 * @param {Object} schema - Dashboard schema (v1.0, v2.0, or DashboardSpec)
 * @returns {Object} Normalized schema
 */
export function normalizeSchema(schema) {
  if (!schema) {
    return null
  }

  // DashboardSpec (new format): return as-is
  if (isDashboardSpec(schema)) {
    return schema
  }

  // If pages already exist, return as-is
  if (schema.pages && Array.isArray(schema.pages) && schema.pages.length > 0) {
    return schema
  }

  // Convert single-page schema to multi-page format
  const normalized = { ...schema }
  
  // Create default page from existing sections
  const defaultPage = {
    id: 'default',
    title: schema.metadata?.name || 'Dashboard',
    description: schema.metadata?.description || '',
    sections: schema.sections || []
  }

  normalized.pages = [defaultPage]
  
  // Move root-level filters to global_filters if not already present
  if (schema.filters && !normalized.global_filters) {
    normalized.global_filters = schema.filters
  }

  // Set app_id and app_title if not present
  if (!normalized.app_id && schema.metadata?.id) {
    normalized.app_id = schema.metadata.id
  }
  if (!normalized.app_title && schema.metadata?.name) {
    normalized.app_title = schema.metadata.name
  }

  return normalized
}

/**
 * Get the current page from schema
 * @param {Object} schema - Normalized schema
 * @param {string} pageId - Page ID (defaults to first page)
 * @returns {Object|null} Page object or null
 */
export function getPage(schema, pageId = null) {
  if (!schema || !schema.pages || schema.pages.length === 0) {
    return null
  }

  if (pageId) {
    return schema.pages.find(p => p.id === pageId) || schema.pages[0]
  }

  return schema.pages[0]
}

/**
 * Get all filters for a page (global + page-specific)
 * @param {Object} schema - Normalized schema
 * @param {string} pageId - Page ID
 * @returns {Array} Combined filters array
 */
export function getPageFilters(schema, pageId = null) {
  const page = getPage(schema, pageId)
  if (!page) {
    return []
  }

  const globalFilters = schema.global_filters || []
  const pageFilters = page.filters || []

  // Merge filters, with page filters taking precedence for same IDs
  const filterMap = new Map()
  
  // Add global filters first
  globalFilters.forEach(filter => {
    filterMap.set(filter.id, { ...filter, source: 'global' })
  })
  
  // Override with page-specific filters
  pageFilters.forEach(filter => {
    filterMap.set(filter.id, { ...filter, source: 'page' })
  })

  return Array.from(filterMap.values())
}

/**
 * Get all queries for the app
 * @param {Object} schema - Normalized schema
 * @returns {Array} Queries array
 */
export function getQueries(schema) {
  return schema?.queries || []
}

/**
 * Get widget by ID from a page
 * @param {Object} schema - Normalized schema
 * @param {string} pageId - Page ID
 * @param {string} widgetId - Widget ID
 * @returns {Object|null} Widget object or null
 */
export function getWidget(schema, pageId, widgetId) {
  const page = getPage(schema, pageId)
  if (!page || !page.sections) {
    return null
  }

  for (const section of page.sections) {
    if (section.widgets) {
      const widget = section.widgets.find(w => w.id === widgetId)
      if (widget) {
        return widget
      }
    }
  }

  return null
}

/**
 * Check if schema is a multi-page app
 * @param {Object} schema - Schema to check
 * @returns {boolean} True if multi-page
 */
export function isMultiPageApp(schema) {
  return !!(schema?.pages && Array.isArray(schema.pages) && schema.pages.length > 1)
}

/**
 * Check if app is published (view-only mode)
 * @param {Object} schema - Schema to check
 * @returns {boolean} True if published
 */
export function isPublished(schema) {
  return schema?.metadata?.status === 'published'
}

/**
 * Get app metadata
 * @param {Object} schema - Schema
 * @returns {Object} Metadata object
 */
export function getAppMetadata(schema) {
  return {
    appId: schema?.app_id || schema?.metadata?.id,
    appTitle: schema?.app_title || schema?.metadata?.name,
    status: schema?.metadata?.status || 'draft',
    version: schema?.metadata?.version || '1.0.0',
    publishedAt: schema?.metadata?.published_at,
    isTemplate: schema?.metadata?.is_template || false,
    ...schema?.metadata
  }
}
