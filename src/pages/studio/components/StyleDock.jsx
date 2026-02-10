/**
 * StyleDock – Collapsible theme / bar / palette / font controls for the preview.
 */

import { useState } from 'react'

export default function StyleDock({ spec, onSpecChange }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!spec) return null

  const updateStyle = (key, value) => {
    onSpecChange((s) => (s ? { ...s, style: { ...(s?.style || {}), [key]: value } } : null))
  }

  return (
    <div
      className={`flex-shrink-0 border-l border-gray-200 bg-gray-50/80 flex flex-col overflow-hidden transition-[width] duration-200 ${collapsed ? 'w-10' : 'w-44'}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={`flex items-center border-gray-200 hover:bg-gray-100 min-h-10 ${collapsed ? 'justify-center p-2 w-full border-b border-gray-200' : 'justify-between gap-1 p-2 text-left border-b border-gray-200'}`}
        title={collapsed ? 'Expand style panel' : 'Collapse style panel'}
      >
        {collapsed ? (
          <span className="text-gray-500 text-xs">▶</span>
        ) : (
          <>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Style</span>
            <span className="text-gray-400 text-xs">◀</span>
          </>
        )}
      </button>
      {!collapsed && (
        <div className="flex flex-col p-3 gap-4 overflow-y-auto flex-1 min-h-0">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Theme</span>
            <div className="flex flex-col gap-1">
              {['light', 'dark', 'executive'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateStyle('theme', t)}
                  className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.theme || 'light') === t ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {t === 'executive' ? 'Executive' : t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Bar look</span>
            <div className="flex flex-col gap-1">
              {['sheen', 'flat'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => updateStyle('barStyle', b)}
                  className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.barStyle || 'sheen') === b ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Palette</span>
            <div className="flex flex-col gap-1">
              {['default', 'minimal', 'pastel'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => updateStyle('palette', p)}
                  className={`px-2 py-1.5 text-sm rounded text-left capitalize ${(spec?.style?.palette || 'default') === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Measure size</span>
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
                  className={`px-2 py-1.5 text-sm rounded text-left ${(spec?.style?.measureSize || 'medium') === id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">Font</span>
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
                  className={`px-2 py-1.5 text-sm rounded text-left ${(spec?.style?.fontFamily || 'system') === id ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
