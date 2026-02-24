/**
 * Renders a shared Studio run (aaiStudioRun) in read-only mode on the feed or shared page.
 * Uses the same block renderer as AAIStudio but with no filter interaction.
 */
import React, { useMemo } from 'react'
import StudioThemeProvider from './aaiStudio/StudioThemeProvider'
import AAIStudioBlockRenderer from './aaiStudio/AAIStudioBlockRenderer'
import { themeMeta } from '../config/studioThemes'

export default function SharedAAIStudioRunView({ sharedData }) {
  const templateId = sharedData?.templateId || 'general'
  const insightBlocks = Array.isArray(sharedData?.insightBlocks) ? sharedData.insightBlocks : []
  const sceneGraph = sharedData?.sceneGraph || {}
  const filterState = sharedData?.filters || { eq: {}, timeRange: null }
  const themeId = themeMeta[sharedData?.themeId] ? sharedData.themeId : (templateId === 'govcon' ? 'ecommerceLight' : 'neutral')

  const orderedBlocks = useMemo(() => {
    const byId = new Map(insightBlocks.map((b) => [b.id, b]))
    const pages = Array.isArray(sceneGraph?.pages) ? sceneGraph.pages : null
    const nodes = Array.isArray(sceneGraph?.nodes) ? sceneGraph.nodes : []
    if (pages?.length && nodes.length) {
      const overview = pages.find((p) => p.id === 'overview') || pages[0]
      const nodeIds = overview?.nodeIds || []
      return nodeIds
        .map((id) => nodes.find((n) => n.id === id))
        .filter(Boolean)
        .map((n) => byId.get(n.blockId))
        .filter(Boolean)
    }
    return insightBlocks.slice()
  }, [insightBlocks, sceneGraph])

  if (orderedBlocks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
        <p className="text-sm">No dashboard content to display.</p>
      </div>
    )
  }

  return (
    <StudioThemeProvider themeId={themeId}>
      <div className="rounded-xl border p-4 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {sharedData?.dashboardTitle && (
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{sharedData.dashboardTitle}</h2>
        )}
        <div className="space-y-4">
          {orderedBlocks.map((block) => (
            <AAIStudioBlockRenderer
              key={block.id}
              block={block}
              filterState={filterState}
              onFilterChange={{}}
              templateId={templateId}
              isSelected={false}
              onSelect={() => {}}
            />
          ))}
        </div>
      </div>
    </StudioThemeProvider>
  )
}
