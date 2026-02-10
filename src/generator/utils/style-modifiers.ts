/**
 * Style modifier utilities for component variants.
 */

import type { CSSProperties } from 'react'

/**
 * Apply modifier classes to base style.
 * Modifiers are variant shortcuts like "-primary", "-ghost", "-rounded".
 */
export function modifiersToStyle(modifiers: string[], baseStyle: CSSProperties): CSSProperties {
  const style = { ...baseStyle }

  for (const mod of modifiers) {
    switch (mod) {
      case '-primary':
        style.backgroundColor = '#3B82F6'
        style.color = '#FFFFFF'
        style.border = 'none'
        style.cursor = 'pointer'
        break
      case '-secondary':
        style.backgroundColor = '#6B7280'
        style.color = '#FFFFFF'
        style.border = 'none'
        style.cursor = 'pointer'
        break
      case '-outlined':
        style.backgroundColor = 'transparent'
        style.border = '2px solid #3B82F6'
        style.color = '#3B82F6'
        style.cursor = 'pointer'
        break
      case '-filled':
        style.backgroundColor = '#3B82F6'
        style.color = '#FFFFFF'
        style.cursor = 'pointer'
        break
      case '-ghost':
        style.backgroundColor = 'transparent'
        style.border = 'none'
        style.cursor = 'pointer'
        break
      case '-disabled':
        style.opacity = 0.5
        style.cursor = 'not-allowed'
        break
      case '-rounded':
        style.borderRadius = '9999px'
        break
    }
  }

  return style
}
