import { useMemo, useState } from 'react'
import {
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  filterTemplatesBySearch,
  type TemplateCatalogItem,
} from '../../studio/templatesCatalog'

const accent = '#58a6ff'
const sidebarBorder = '#2d323b'
const sidebarText = '#e6edf3'
const sidebarMuted = '#8b949e'

type TemplateGalleryProps = {
  selectedCatalogId: string
  onSelectTemplate: (catalogId: string, engineTemplateId: string) => void
  trackEvent?: (name: string, payload?: Record<string, unknown>) => void
}

export default function TemplateGallery({
  selectedCatalogId,
  onSelectTemplate,
  trackEvent,
}: TemplateGalleryProps) {
  const [category, setCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = useMemo(() => {
    const byCat = getTemplatesByCategory(category)
    return filterTemplatesBySearch(byCat, searchQuery)
  }, [category, searchQuery])

  const handleCardClick = (template: TemplateCatalogItem) => {
    onSelectTemplate(template.id, template.engineTemplateId)
    if (typeof trackEvent === 'function') {
      trackEvent('template_selected', { id: template.id, engineTemplateId: template.engineTemplateId })
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 space-y-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: sidebarText }}>
            Choose a template
          </h1>
          <p className="text-sm mt-1" style={{ color: sidebarMuted }}>
            Start with a proven layout, then upload data to generate dashboards.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="search"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{
              background: 'rgba(255,255,255,0.06)',
              borderColor: sidebarBorder,
              color: sidebarText,
            }}
            aria-label="Search templates"
          />
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={{
                  background: category === cat ? accent : 'rgba(255,255,255,0.06)',
                  color: category === cat ? '#fff' : sidebarMuted,
                  border: `1px solid ${category === cat ? accent : sidebarBorder}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto" style={{ minHeight: 200 }}>
        <div className="grid gap-4 pb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {filteredTemplates.map((template) => {
            const isSelected = selectedCatalogId === template.id
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => handleCardClick(template)}
                className="relative text-left rounded-xl p-5 transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0d1117]"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(88,166,255,0.18), rgba(88,166,255,0.08))'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                  border: `2px solid ${isSelected ? accent : sidebarBorder}`,
                  boxShadow: isSelected ? `0 0 0 1px ${accent}40` : '0 1px 3px rgba(0,0,0,0.2)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(88,166,255,0.2)'
                    e.currentTarget.style.borderColor = `${accent}80`
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.2)'
                    e.currentTarget.style.borderColor = sidebarBorder
                  }
                }}
              >
                {template.recommended && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: accent, color: '#fff' }}>
                    Recommended
                  </span>
                )}
                {isSelected && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.2)', color: sidebarText }}>
                    Selected
                  </span>
                )}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3" style={{ background: 'rgba(88,166,255,0.2)' }}>
                  ◇
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: sidebarText }}>{template.name}</h3>
                <p className="text-xs line-clamp-2" style={{ color: sidebarMuted }}>{template.description}</p>
              </button>
            )
          })}
        </div>
        {filteredTemplates.length === 0 && (
          <p className="text-sm py-8 text-center" style={{ color: sidebarMuted }}>
            No templates match your search.
          </p>
        )}
      </div>
    </div>
  )
}
