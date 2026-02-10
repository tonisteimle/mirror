/**
 * Shared utility for converting DSL properties to CSS styles.
 * Used by both react-generator.tsx and behaviors/index.ts to avoid duplication.
 */

import type React from 'react'
import { CONTAINER_COMPONENTS, TEXT_COMPONENTS } from '../dsl/properties'
import type { DSLProperties } from '../types/dsl-properties'

// Re-export for backwards compatibility
export type { DSLProperties }

/**
 * Determine if a component is a container (col → backgroundColor)
 * or text component (col → color)
 */
export function isContainerComponent(componentName: string): boolean {
  // Check if it's in the container set
  if (CONTAINER_COMPONENTS.has(componentName)) return true
  // Check if it's in the text set
  if (TEXT_COMPONENTS.has(componentName)) return false
  // Default: if name starts with uppercase and not in text set, assume container
  // User-defined components are assumed to be containers
  return /^[A-Z]/.test(componentName)
}

/**
 * Check if properties contain any hover styles
 */
export function hasHoverStyles(properties: DSLProperties): boolean {
  return Object.keys(properties).some(key => key.startsWith('hover-'))
}

/**
 * Extract hover properties and convert to CSS
 */
export function extractHoverStyles(properties: DSLProperties): React.CSSProperties {
  const hoverStyle: React.CSSProperties = {}

  for (const [key, value] of Object.entries(properties)) {
    if (key.startsWith('hover-')) {
      const prop = key.slice(6) // Remove 'hover-' prefix
      switch (prop) {
        case 'bg':
          // hover-bg maps to backgroundColor
          hoverStyle.backgroundColor = String(value)
          break
        case 'col':
          // hover-col maps to backgroundColor (most common use case for hover)
          hoverStyle.backgroundColor = String(value)
          break
        case 'boc':
          hoverStyle.borderColor = String(value)
          break
        case 'bor':
          hoverStyle.border = `${value}px solid`
          break
        case 'rad':
          hoverStyle.borderRadius = `${value}px`
          break
        case 'opacity':
          hoverStyle.opacity = Number(value)
          break
        case 'scale':
          hoverStyle.transform = `scale(${value})`
          break
      }
    }
  }

  return hoverStyle
}

/**
 * Check if element needs flex display
 */
export function needsFlexDisplay(properties: DSLProperties, hasChildren: boolean): boolean {
  // Explicit layout properties require flex
  if (properties.hor || properties.ver) return true
  if (properties.gap) return true
  if (properties.between) return true
  if (properties.wrap) return true
  if (properties.grow) return true
  // Alignment properties require flex
  if (properties['hor-l'] || properties['hor-cen'] || properties['hor-r']) return true
  if (properties['ver-t'] || properties['ver-cen'] || properties['ver-b']) return true
  if (properties.align_main || properties.align_cross) return true
  // Elements with children typically need flex for layout
  if (hasChildren) return true
  return false
}

/**
 * Convert DSL properties to React CSS properties.
 * This is the single source of truth for property-to-style conversion.
 *
 * @param properties - DSL properties to convert
 * @param hasChildren - Whether the component has children (affects flex display)
 * @param componentName - Component name to determine color mapping (col → backgroundColor or color)
 */
export function propertiesToStyle(
  properties: DSLProperties,
  hasChildren: boolean = false,
  componentName: string = ''
): React.CSSProperties {
  const style: React.CSSProperties = {}
  const isContainer = isContainerComponent(componentName)

  // Only set flex display when needed
  if (needsFlexDisplay(properties, hasChildren)) {
    style.display = 'flex'
    style.flexDirection = 'row'
  }

  // Process direction first so centering can check it
  if (properties.ver) {
    style.flexDirection = 'column'
  }

  for (const [key, value] of Object.entries(properties)) {
    switch (key) {
      // Layout direction
      case 'hor':
        style.flexDirection = 'row'
        break
      case 'ver':
        style.flexDirection = 'column'
        break

      // Alignment - main axis
      case 'align_main':
        if (value === 'cen') style.justifyContent = 'center'
        else if (value === 'l' || value === 'u') style.justifyContent = 'flex-start'
        else if (value === 'r' || value === 'd') style.justifyContent = 'flex-end'
        else if (value === 'between') style.justifyContent = 'space-between'
        break

      // Alignment - cross axis
      case 'align_cross':
        if (value === 'cen') style.alignItems = 'center'
        else if (value === 'l' || value === 'u') style.alignItems = 'flex-start'
        else if (value === 'r' || value === 'd') style.alignItems = 'flex-end'
        break

      case 'between':
        style.justifyContent = 'space-between'
        break
      case 'wrap':
        style.flexWrap = 'wrap'
        break

      // Absolute alignment (independent of flex direction)
      case 'hor-l':
        if (style.flexDirection === 'column') {
          style.alignItems = 'flex-start'
        } else {
          style.justifyContent = 'flex-start'
        }
        break
      case 'hor-cen':
        if (style.flexDirection === 'column') {
          style.alignItems = 'center'
        } else {
          style.justifyContent = 'center'
        }
        break
      case 'hor-r':
        if (style.flexDirection === 'column') {
          style.alignItems = 'flex-end'
        } else {
          style.justifyContent = 'flex-end'
        }
        break
      case 'ver-t':
        if (style.flexDirection === 'column') {
          style.justifyContent = 'flex-start'
        } else {
          style.alignItems = 'flex-start'
        }
        break
      case 'ver-cen':
        if (style.flexDirection === 'column') {
          style.justifyContent = 'center'
        } else {
          style.alignItems = 'center'
        }
        break
      case 'ver-b':
        if (style.flexDirection === 'column') {
          style.justifyContent = 'flex-end'
        } else {
          style.alignItems = 'flex-end'
        }
        break

      // Flex properties
      case 'grow':
        style.flexGrow = 1
        break
      case 'shrink':
        style.flexShrink = Number(value)
        break
      case 'gap':
        // TODO: Support direction modifiers like pad/mar:
        // gap l-r → columnGap, gap u-d → rowGap
        // For now, gap applies to both row and column
        style.gap = `${value}px`
        break

      // Sizing
      case 'w':
        style.width = value === 'full' ? '100%' : `${value}px`
        break
      case 'h':
        style.height = value === 'full' ? '100%' : `${value}px`
        break
      case 'minw':
        style.minWidth = `${value}px`
        break
      case 'maxw':
        style.maxWidth = `${value}px`
        break
      case 'minh':
        style.minHeight = `${value}px`
        break
      case 'maxh':
        style.maxHeight = `${value}px`
        break
      case 'full':
        style.width = '100%'
        style.height = '100%'
        break

      // Spacing - Padding
      case 'pad':
        style.padding = `${value}px`
        break
      case 'pad_l':
        style.paddingLeft = `${value}px`
        break
      case 'pad_r':
        style.paddingRight = `${value}px`
        break
      case 'pad_u':
        style.paddingTop = `${value}px`
        break
      case 'pad_d':
        style.paddingBottom = `${value}px`
        break

      // Spacing - Margin
      case 'mar':
        style.margin = `${value}px`
        break
      case 'mar_l':
        style.marginLeft = `${value}px`
        break
      case 'mar_r':
        style.marginRight = `${value}px`
        break
      case 'mar_u':
        style.marginTop = `${value}px`
        break
      case 'mar_d':
        style.marginBottom = `${value}px`
        break

      // Colors - Unified color system
      case 'bg':
        // bg → always backgroundColor
        style.backgroundColor = String(value)
        break
      case 'col':
        // col → backgroundColor for containers, color for text components
        if (isContainer) {
          style.backgroundColor = String(value)
        } else {
          style.color = String(value)
        }
        break
      case 'boc':
        // Border color (standalone property)
        style.borderColor = String(value)
        break

      // Border - compound properties
      case 'rad':
        style.borderRadius = `${value}px`
        break
      case 'border':
      case 'bor':
        // Legacy: bor 1 → 1px solid
        style.border = `${value}px solid`
        break
      case 'bor_width':
        // Will be combined with style and color below
        break
      case 'bor_style':
        // Will be combined with width and color below
        break
      case 'bor_color':
        // Will be combined with width and style below
        break

      // Typography
      case 'size':
        style.fontSize = `${value}px`
        break
      case 'weight':
        style.fontWeight = Number(value)
        break
      case 'font':
        style.fontFamily = String(value)
        break
      case 'line':
        style.lineHeight = Number(value)
        break
      case 'align':
        style.textAlign = String(value) as 'left' | 'center' | 'right' | 'justify'
        break
      case 'italic':
        if (value) style.fontStyle = 'italic'
        break
      case 'underline':
        if (value) style.textDecoration = 'underline'
        break
      case 'uppercase':
        if (value) style.textTransform = 'uppercase'
        break
      case 'lowercase':
        if (value) style.textTransform = 'lowercase'
        break
      case 'truncate':
        if (value) {
          style.overflow = 'hidden'
          style.textOverflow = 'ellipsis'
          style.whiteSpace = 'nowrap'
        }
        break

      // Overflow
      case 'scroll':
        if (value) style.overflow = 'auto'
        break
      case 'scroll-x':
        if (value) style.overflowX = 'auto'
        break
      case 'scroll-y':
        if (value) style.overflowY = 'auto'
        break
      case 'clip':
        if (value) style.overflow = 'hidden'
        break

      // Effects
      case 'opacity':
        style.opacity = Number(value)
        break
      case 'shadow':
        style.boxShadow = String(value)
        break
      case 'cursor':
        style.cursor = String(value)
        break
      case 'pointer':
        style.pointerEvents = String(value) as 'none' | 'auto'
        break
      case 'z':
        style.zIndex = Number(value)
        break

      // Visibility (for overlays)
      case 'hidden':
        if (value) style.display = 'none'
        break
    }
  }

  // Handle compound border (bor_width, bor_style, bor_color)
  if (properties.bor_width !== undefined || properties.bor_style || properties.bor_color) {
    const width = properties.bor_width !== undefined ? `${properties.bor_width}px` : '1px'
    const borderStyle = (properties.bor_style as string) || 'solid'
    const color = (properties.bor_color as string) || 'currentColor'
    style.border = `${width} ${borderStyle} ${color}`
  }

  // Handle directional compound borders
  const directions = ['l', 'r', 'u', 'd'] as const
  const cssSides = { l: 'Left', r: 'Right', u: 'Top', d: 'Bottom' } as const

  for (const dir of directions) {
    const widthKey = `bor_${dir}_width`
    const styleKey = `bor_${dir}_style`
    const colorKey = `bor_${dir}_color`

    if (properties[widthKey] !== undefined || properties[styleKey] || properties[colorKey]) {
      const width = properties[widthKey] !== undefined ? `${properties[widthKey]}px` : '1px'
      const borderStyle = (properties[styleKey] as string) || 'solid'
      const color = (properties[colorKey] as string) || 'currentColor'
      const cssProp = `border${cssSides[dir]}` as keyof React.CSSProperties
      ;(style as Record<string, string>)[cssProp] = `${width} ${borderStyle} ${color}`
    }
  }

  // Legacy: Handle directional borders with old syntax (bor_l, bor_r, etc.)
  const legacyBorderColor = properties.boc ? String(properties.boc) : 'currentColor'
  if (properties.bor_l && !properties.bor_l_width) {
    style.borderLeft = `${properties.bor_l}px solid ${legacyBorderColor}`
  }
  if (properties.bor_r && !properties.bor_r_width) {
    style.borderRight = `${properties.bor_r}px solid ${legacyBorderColor}`
  }
  if (properties.bor_u && !properties.bor_u_width) {
    style.borderTop = `${properties.bor_u}px solid ${legacyBorderColor}`
  }
  if (properties.bor_d && !properties.bor_d_width) {
    style.borderBottom = `${properties.bor_d}px solid ${legacyBorderColor}`
  }

  // Add CSS transition for smooth hover effects
  if (hasHoverStyles(properties)) {
    style.transition = 'all 0.15s ease'
  }

  return style
}

/**
 * Simplified version for behavior handlers that don't need hasChildren logic.
 * Delegates to the main function.
 */
export function getStylesFromNode(properties: DSLProperties): React.CSSProperties {
  return propertiesToStyle(properties, false)
}
