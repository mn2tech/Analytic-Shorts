import React from 'react'
import { getThemeVars } from '../../config/studioThemes'

/**
 * Wraps AAI Studio content and applies CSS variable tokens for the active theme.
 * themeId: 'neutral' | 'govconDark' | 'ecommerceLight' | 'saasMinimal'
 */
export default function StudioThemeProvider({ themeId = 'neutral', children, className = '' }) {
  const vars = getThemeVars(themeId)
  const style = { ...vars }

  return (
    <div data-theme={themeId} style={style} className={className}>
      {children}
    </div>
  )
}
