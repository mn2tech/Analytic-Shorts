/**
 * StyleDock – Collapsible theme / bar / palette / font controls for the preview.
 */

import { useEffect, useState } from 'react'

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v) }

function updateWidgetById(spec, kind, id, updater) {
  if (!spec || !id) return spec
  const updateArr = (arr) => (Array.isArray(arr) ? arr.map((x) => (x?.id === id ? updater(x) : x)) : arr)
  const next = { ...spec }

  if (kind === 'chart') {
    next.charts = updateArr(next.charts)
  } else if (kind === 'kpi') {
    next.kpis = updateArr(next.kpis)
  }

  if (Array.isArray(next.tabs)) {
    next.tabs = next.tabs.map((t) => {
      if (!t) return t
      if (kind === 'chart') return { ...t, charts: updateArr(t.charts) }
      if (kind === 'kpi') return { ...t, kpis: updateArr(t.kpis) }
      return t
    })
  }
  return next
}

function getWidgetTitle(spec, selectedWidget) {
  const id = selectedWidget?.id
  if (!spec || !id) return null
  const findIn = (arr) => (Array.isArray(arr) ? arr.find((x) => x?.id === id) : null)
  const direct = selectedWidget?.type === 'chart'
    ? (findIn(spec.charts) || (Array.isArray(spec.tabs) ? spec.tabs.map((t) => findIn(t?.charts)).find(Boolean) : null))
    : (findIn(spec.kpis) || (Array.isArray(spec.tabs) ? spec.tabs.map((t) => findIn(t?.kpis)).find(Boolean) : null))
  if (!direct) return id
  return selectedWidget?.type === 'chart' ? (direct.title || direct.id) : (direct.label || direct.id)
}

function getWidgetObject(spec, selectedWidget) {
  const id = selectedWidget?.id
  if (!spec || !id) return null
  const findIn = (arr) => (Array.isArray(arr) ? arr.find((x) => x?.id === id) : null)
  if (selectedWidget?.type === 'chart') {
    return findIn(spec.charts) || (Array.isArray(spec.tabs) ? spec.tabs.map((t) => findIn(t?.charts)).find(Boolean) : null)
  }
  if (selectedWidget?.type === 'kpi') {
    return findIn(spec.kpis) || (Array.isArray(spec.tabs) ? spec.tabs.map((t) => findIn(t?.kpis)).find(Boolean) : null)
  }
  return null
}

const STORAGE_KEY_STYLE_SECTIONS = 'studio_styleDock_sectionsOpen'
function loadSectionsOpen() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STYLE_SECTIONS)
    if (!raw) return null
    const v = JSON.parse(raw)
    return v && typeof v === 'object' ? v : null
  } catch {
    return null
  }
}
function saveSectionsOpen(next) {
  try {
    localStorage.setItem(STORAGE_KEY_STYLE_SECTIONS, JSON.stringify(next))
  } catch (_) {}
}

function Section({ id, title, open, onToggle, children, right }) {
  return (
    <div className="border-b border-gray-200">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left ${
          open ? 'bg-white' : 'bg-transparent'
        } hover:bg-white/70`}
        aria-expanded={open}
      >
        <div className="min-w-0 flex items-center gap-2">
          <span className="text-xs text-gray-500 w-4">{open ? '▾' : '▸'}</span>
          <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </button>
      {open && (
        <div className="px-3 pb-3 pt-2 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

export default function StyleDock({ spec, onSpecChange, selectedWidget, onClearSelection }) {
  const [collapsed, setCollapsed] = useState(false)
  const [numbersTarget, setNumbersTarget] = useState('dashboard') // 'dashboard' | 'selected'
  const canTargetSelected = !!selectedWidget?.id && (selectedWidget?.type === 'kpi' || selectedWidget?.type === 'chart')
  const [sectionsOpen, setSectionsOpen] = useState(() => {
    const stored = loadSectionsOpen()
    return stored || {
      numbers: true,
      theme: true,
      bar: false,
      palette: false,
      measure: false,
      font: false
    }
  })

  // Keep hooks count stable: always run this effect, even if spec is null.
  useEffect(() => {
    if (!canTargetSelected) setNumbersTarget('dashboard')
  }, [canTargetSelected])

  useEffect(() => {
    saveSectionsOpen(sectionsOpen)
  }, [sectionsOpen])

  if (!spec) return null

  const updateStyle = (key, value) => {
    onSpecChange((s) => (s ? { ...s, style: { ...(s?.style || {}), [key]: value } } : null))
  }

  const globalFmt = isObj(spec?.style?.valueFormat) ? spec.style.valueFormat : null
  const selectedObj = getWidgetObject(spec, selectedWidget)
  const selectedFmt = isObj(selectedObj?.format) ? selectedObj.format : null

  const activeNumbersFmt = numbersTarget === 'selected' ? selectedFmt : globalFmt
  const activeNumbersType = activeNumbersFmt?.type || 'auto'
  const activeNumbersDecimals = typeof activeNumbersFmt?.decimals === 'number' ? activeNumbersFmt.decimals : 2
  const activeNumbersPrefix = typeof activeNumbersFmt?.prefix === 'string' ? activeNumbersFmt.prefix : '$'
  const activeNumbersSuffix = typeof activeNumbersFmt?.suffix === 'string' ? activeNumbersFmt.suffix : ''
  const activeNumbersGrouping = activeNumbersFmt?.grouping === true

  const selectedTitle = getWidgetTitle(spec, selectedWidget)

  const setGlobalFormat = (next) => updateStyle('valueFormat', next)
  const setSelectedFormat = (next) => {
    if (!selectedWidget?.id || !selectedWidget?.type) return
    onSpecChange((s) => updateWidgetById(s, selectedWidget.type, selectedWidget.id, (w) => ({ ...w, format: next })))
  }
  const setActiveNumbersFormat = (next) => {
    if (numbersTarget === 'selected') return setSelectedFormat(next)
    return setGlobalFormat(next)
  }
  const setSelectedWidgetProps = (patch) => {
    if (!selectedWidget?.id || !selectedWidget?.type) return
    onSpecChange((s) => updateWidgetById(s, selectedWidget.type, selectedWidget.id, (w) => {
      const next = { ...w, ...(patch || {}) }
      Object.keys(patch || {}).forEach((k) => {
        if (next[k] === undefined) delete next[k]
      })
      return next
    }))
  }

  const canApplyToSelectedChart = numbersTarget === 'selected' && selectedWidget?.type === 'chart' && !!selectedWidget?.id
  const effectiveBarLook = canApplyToSelectedChart
    ? (selectedObj?.barStyle ?? spec?.style?.barStyle ?? 'sheen')
    : (spec?.style?.barStyle || 'sheen')
  const effectivePalette = canApplyToSelectedChart
    ? (selectedObj?.palette ?? spec?.style?.palette ?? 'default')
    : (spec?.style?.palette || 'default')

  const setPalette = (palette) => {
    if (canApplyToSelectedChart) return setSelectedWidgetProps({ palette })
    return updateStyle('palette', palette)
  }
  const setBarLook = (barStyle) => {
    if (canApplyToSelectedChart) return setSelectedWidgetProps({ barStyle })
    return updateStyle('barStyle', barStyle)
  }
  const resetSelectedOverrides = () => {
    if (!selectedWidget?.id || !selectedWidget?.type) return
    onSpecChange((s) => updateWidgetById(s, selectedWidget.type, selectedWidget.id, (w) => {
      const next = { ...w }
      delete next.format
      delete next.palette
      delete next.barStyle
      return next
    }))
  }

  const toggleSection = (id) => {
    setSectionsOpen((s) => ({ ...(s || {}), [id]: !s?.[id] }))
  }

  const hasSelection = !!selectedWidget?.id

  return (
    <div
      className={`flex-shrink-0 border-l border-gray-300 bg-gray-100 flex flex-col overflow-hidden transition-[width] duration-200 ${
        collapsed ? 'w-12' : 'w-72'
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={`flex items-center border-gray-300 hover:bg-gray-50 min-h-11 ${
          collapsed
            ? 'justify-center p-2 w-full border-b'
            : 'justify-between gap-2 px-3 py-2 text-left border-b'
        }`}
        title={collapsed ? 'Expand format panel' : 'Collapse format panel'}
      >
        {collapsed ? (
          <span className="text-gray-500 text-xs">▶</span>
        ) : (
          <>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Format</div>
              <div className="text-[11px] text-gray-500 truncate">
                {selectedWidget?.id ? `Selected: ${selectedTitle || selectedWidget.id}` : 'Click a KPI or chart to format'}
              </div>
            </div>
            <span className="text-gray-400 text-xs">◀</span>
          </>
        )}
      </button>
      {!collapsed && (
        <div className="flex flex-col overflow-y-auto flex-1 min-h-0">
          {/* Tableau-like target strip */}
          <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
            <div className="text-[11px] font-medium text-gray-600 mb-1">Apply to</div>
            <div className="grid grid-cols-2 rounded border border-gray-300 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => setNumbersTarget('dashboard')}
                className={`px-2 py-1.5 text-xs font-semibold transition-colors ${
                  numbersTarget === 'dashboard'
                    ? 'bg-white text-gray-900 border-b-2 border-blue-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-white border-b-2 border-transparent'
                }`}
                aria-pressed={numbersTarget === 'dashboard'}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => canTargetSelected && setNumbersTarget('selected')}
                disabled={!canTargetSelected}
                className={`px-2 py-1.5 text-xs font-semibold transition-colors border-l border-gray-200 ${
                  numbersTarget === 'selected'
                    ? 'bg-white text-gray-900 border-b-2 border-blue-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-white border-b-2 border-transparent'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title={canTargetSelected ? 'Apply only to selected widget' : 'Select a widget first'}
                aria-pressed={numbersTarget === 'selected'}
              >
                Selected
              </button>
            </div>
            {hasSelection && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="text-[11px] text-gray-600 truncate" title={selectedTitle || selectedWidget.id}>
                  Selected: {selectedTitle || selectedWidget.id}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => resetSelectedOverrides()}
                    className="text-[11px] text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                    title="Reset selected widget overrides"
                  >
                    Reset
                  </button>
                  {typeof onClearSelection === 'function' && (
                    <button
                      type="button"
                      onClick={() => onClearSelection()}
                      className="text-[11px] text-gray-600 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                      title="Clear selection"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-2">
          <Section
            id="numbers"
            title="Numbers"
            open={!!sectionsOpen?.numbers}
            onToggle={toggleSection}
          >
            <div className="flex flex-col gap-2">
              <select
                value={activeNumbersType}
                onChange={(e) => {
                  const t = e.target.value
                  if (t === 'auto') return setActiveNumbersFormat(null)
                  const base = isObj(activeNumbersFmt) ? activeNumbersFmt : {}
                  setActiveNumbersFormat({
                    ...base,
                    type: t,
                    decimals: activeNumbersDecimals,
                    prefix: t === 'currency' ? activeNumbersPrefix : (base.prefix ?? ''),
                    suffix: activeNumbersSuffix,
                    grouping: t === 'number' ? activeNumbersGrouping : undefined
                  })
                }}
                className="px-2 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700"
                title="Default number format"
              >
                <option value="auto">Auto</option>
                <option value="currency">Amount ($)</option>
                <option value="number">Number</option>
                <option value="percent">Percent</option>
              </select>
              {activeNumbersType !== 'auto' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Decimals</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={activeNumbersDecimals}
                        onChange={(e) => {
                          const d = Number(e.target.value)
                          if (!Number.isFinite(d)) return
                          setActiveNumbersFormat({ ...(activeNumbersFmt || {}), type: activeNumbersType, decimals: Math.max(0, Math.min(10, d)) })
                        }}
                      className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {activeNumbersType === 'currency' && (
                      <div className="w-16">
                        <label className="text-xs text-gray-500">$</label>
                        <input
                          value={activeNumbersPrefix}
                          onChange={(e) => setActiveNumbersFormat({ ...(activeNumbersFmt || {}), type: 'currency', prefix: e.target.value, decimals: activeNumbersDecimals })}
                        className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Currency symbol/prefix"
                        />
                      </div>
                    )}
                  </div>
                  {activeNumbersType === 'number' && (
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={activeNumbersGrouping}
                        onChange={(e) => setActiveNumbersFormat({ ...(activeNumbersFmt || {}), type: 'number', decimals: activeNumbersDecimals, grouping: e.target.checked })}
                      />
                      Use commas (1,234)
                    </label>
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section id="theme" title="Theme (dashboard)" open={!!sectionsOpen?.theme} onToggle={toggleSection}>
            <div className="flex flex-col gap-1">
              {['light', 'dark', 'executive'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateStyle('theme', t)}
                  className={`px-3 py-2 text-sm rounded text-left capitalize transition-colors ${(spec?.style?.theme || 'light') === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {t === 'executive' ? 'Executive' : t}
                </button>
              ))}
            </div>
          </Section>

          <Section id="bar" title={numbersTarget === 'selected' ? 'Bar look (selected chart)' : 'Bar look (dashboard)'} open={!!sectionsOpen?.bar} onToggle={toggleSection}>
            <div className="flex flex-col gap-1">
              {['sheen', 'flat'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBarLook(b)}
                  className={`px-3 py-2 text-sm rounded text-left capitalize transition-colors ${effectiveBarLook === b ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {b}
                </button>
              ))}
              {numbersTarget === 'selected' && !canApplyToSelectedChart && (
                <div className="text-xs text-gray-500 mt-1">
                  Select a chart (not a KPI) to apply bar look to “Selected”.
                </div>
              )}
            </div>
          </Section>

          <Section id="palette" title={numbersTarget === 'selected' ? 'Palette (selected chart)' : 'Palette (dashboard)'} open={!!sectionsOpen?.palette} onToggle={toggleSection}>
            <div className="flex flex-col gap-1">
              {['default', 'minimal', 'pastel'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPalette(p)}
                  className={`px-3 py-2 text-sm rounded text-left capitalize transition-colors ${effectivePalette === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
              {numbersTarget === 'selected' && !canApplyToSelectedChart && (
                <div className="text-xs text-gray-500 mt-1">
                  Select a chart (not a KPI) to apply palette to “Selected”.
                </div>
              )}
            </div>
          </Section>

          <Section id="measure" title="Measure size" open={!!sectionsOpen?.measure} onToggle={toggleSection}>
            <div className="flex flex-col gap-1">
              {[
                { id: 'small', label: 'Small' },
                { id: 'medium', label: 'Medium' },
                { id: 'large', label: 'Large' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateStyle('measureSize', id)}
                  className={`px-3 py-2 text-sm rounded text-left transition-colors ${(spec?.style?.measureSize || 'medium') === id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>

          <Section id="font" title="Font" open={!!sectionsOpen?.font} onToggle={toggleSection}>
            <div className="flex flex-col gap-1">
              {[
                { id: 'system', label: 'System' },
                { id: 'sans', label: 'Sans' },
                { id: 'serif', label: 'Serif' },
                { id: 'mono', label: 'Monospace' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => updateStyle('fontFamily', id)}
                  className={`px-3 py-2 text-sm rounded text-left transition-colors ${(spec?.style?.fontFamily || 'system') === id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Section>
          </div>
        </div>
      )}
    </div>
  )
}
