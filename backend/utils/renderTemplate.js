/**
 * Render HTML from Mustache-style template. Used for agency PDF report.
 * Uses 'mustache' package if installed; otherwise a minimal inline renderer.
 */
const fs = require('fs')
const path = require('path')

let Mustache = null
try {
  Mustache = require('mustache')
} catch (_) {
  // mustache not installed: use minimal renderer below
}

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'agency_report.html')
const AGENCY_TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'agency_report_agency.html')
let templateCache = null
let agencyTemplateCache = null

function loadTemplate() {
  if (templateCache) return templateCache
  templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  return templateCache
}

function loadAgencyTemplate() {
  if (agencyTemplateCache) return agencyTemplateCache
  agencyTemplateCache = fs.readFileSync(AGENCY_TEMPLATE_PATH, 'utf8')
  return agencyTemplateCache
}

/**
 * Minimal Mustache-like renderer: {{key}}, {{#key}}...{{/key}}, {{.}}
 * Escapes HTML for {{key}}; sections get context/array iteration.
 */
function renderSimple(template, data) {
  function escapeHtml(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
  function get(ctx, key) {
    if (ctx == null) return undefined
    if (key === '.') return ctx
    return ctx[key]
  }
  function render(str, ctx) {
    // Process {{#key}}...{{/key}} (section/array; \1 backref ensures matching close)
    const sectionRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/(\1)\}\}/g
    let out = str.replace(sectionRegex, (_, key, inner) => {
      const val = get(ctx, key)
      if (Array.isArray(val)) {
        return val.map((item) => render(inner, typeof item === 'object' && item !== null ? item : { '.': item })).join('')
      }
      if (val && typeof val === 'object') {
        return render(inner, val)
      }
      if (val) return render(inner, ctx)
      return ''
    })
    // Replace {{key}} and {{.}} (simple vars)
    out = out.replace(/\{\{(\.|[^}#/][^}]*)\}\}/g, (_, key) => {
      const k = key.trim()
      const v = k === '.' ? ctx : get(ctx, k)
      return v != null ? escapeHtml(String(v)) : ''
    })
    return out
  }
  return render(template, data)
}

/**
 * Render the agency report HTML with the given view model.
 * @param {Object} data - View model from buildPdfModel (agencyName, reportTitle, kpis, topInsights, etc.)
 * @returns {string} HTML string
 */
function renderAgencyReportHtml(data) {
  const template = loadTemplate()
  if (Mustache) {
    return Mustache.render(template, data)
  }
  return renderSimple(template, data)
}

/**
 * Flatten AgencyReportModel and render agency-mode HTML (client-ready, tables by dimension).
 * @param {Object} model - From buildAgencyReportModel: { header, execSummary, kpiCards, trend, tables, suggestedQuestions }
 * @returns {string} HTML string
 */
function renderAgencyModeReportHtml(model) {
  const h = model.header || {}
  const exec = model.execSummary || {}
  const bullets = exec.bullets || []
  const data = {
    agencyName: h.agencyName,
    agencyLogoUrl: h.agencyLogoUrl,
    reportTitle: h.reportTitle,
    clientName: h.clientName,
    dateRange: h.dateRange,
    generatedAt: h.generatedAt,
    executiveSummary: exec.executiveSummary,
    bullets,
    hasBullets: bullets.length > 0,
    kpis: model.kpiCards || [],
    hasKpis: model.hasKpis,
    trendTitle: model.trend?.title,
    trendSubtitle: model.trend?.subtitle,
    trendChartImageUrl: model.trend?.trendChartImageUrl,
    tables: model.tables || [],
    suggestedQuestions: model.suggestedQuestions || [],
    hasSuggestedQuestions: model.hasSuggestedQuestions,
  }
  const template = loadAgencyTemplate()
  if (Mustache) {
    return Mustache.render(template, data)
  }
  return renderSimple(template, data)
}

module.exports = { renderAgencyReportHtml, renderAgencyModeReportHtml, loadTemplate, loadAgencyTemplate }
