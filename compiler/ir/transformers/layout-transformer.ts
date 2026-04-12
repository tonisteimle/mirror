/**
 * Layout Transformer
 *
 * Pure functions for transforming layout properties to CSS styles.
 * Handles flex and grid layout generation from Mirror's layout DSL.
 *
 * Extracted from ir/index.ts for modularity.
 */

import type { Property } from '../../parser/ast'
import type { IRStyle, IRNode } from '../types'
import {
  isContainer as isContainerPrimitive,
  FLEX_DEFAULTS,
} from '../../schema/layout-defaults'

// =============================================================================
// Types
// =============================================================================

/**
 * Layout properties that affect flex/grid container behavior.
 * Used internally during property transformation.
 */
export interface LayoutContext {
  direction: 'row' | 'column' | null
  justifyContent: string | null
  alignItems: string | null
  flexWrap: string | null
  gap: string | null
  isGrid: boolean
  gridColumns: string | null
  gridAutoFlow: string | null      // 'row' | 'column' | 'dense' | 'row dense' | 'column dense'
  columnGap: string | null         // For gap-x/gx
  rowGap: string | null            // For gap-y/gy
  rowHeight: string | null         // For row-height/rh (grid-auto-rows)
  // Internal alignment tracking (before direction-based mapping)
  _hAlign?: 'start' | 'end' | 'center'
  _vAlign?: 'start' | 'end' | 'center'
  // Track if width/height were explicitly set (for hug-by-default behavior)
  hasExplicitWidth?: boolean
  hasExplicitHeight?: boolean
}

/**
 * Create a fresh LayoutContext with all properties initialized to null/false.
 */
export function createLayoutContext(): LayoutContext {
  return {
    direction: null,
    justifyContent: null,
    alignItems: null,
    flexWrap: null,
    gap: null,
    isGrid: false,
    gridColumns: null,
    gridAutoFlow: null,
    columnGap: null,
    rowGap: null,
    rowHeight: null,
  }
}

// =============================================================================
// Grid Column Resolution
// =============================================================================

/**
 * Resolve grid column specification from property values.
 *
 * @example
 * grid 3         → repeat(3, 1fr)
 * grid auto 250  → repeat(auto-fill, minmax(250px, 1fr))
 * grid 30% 70%   → 30% 70%
 */
export function resolveGridColumns(prop: Property): string | null {
  const values = prop.values

  // grid 3 → repeat(3, 1fr)
  if (values.length === 1 && /^\d+$/.test(String(values[0]))) {
    return `repeat(${values[0]}, 1fr)`
  }

  // grid auto 250 → auto-fill, minmax(250px, 1fr)
  if (values.length === 2 && values[0] === 'auto') {
    const minWidth = /^\d+$/.test(String(values[1])) ? `${values[1]}px` : values[1]
    return `repeat(auto-fill, minmax(${minWidth}, 1fr))`
  }

  // grid 30% 70% → explicit columns
  if (values.length >= 2) {
    return values.map(v => {
      const str = String(v)
      if (/^\d+$/.test(str)) return `${str}px`
      if (str.endsWith('%')) return str
      return str
    }).join(' ')
  }

  return null
}

// =============================================================================
// Alignment Processing
// =============================================================================

/**
 * Apply alignment values to LayoutContext.
 *
 * Key insights:
 * - hor/ver and 9-zone properties all affect direction
 * - The LAST one in source order wins for direction
 * - `center` meaning depends on context (top/bottom vs left/right)
 */
export function applyAlignmentsToContext(values: string[], ctx: LayoutContext): void {
  if (values.length === 0) return

  // Check which dimensions are explicitly set (for context-aware center)
  const hasVertical = values.some(v => ['top', 'bottom', 'ver-center'].includes(v))
  const hasHorizontal = values.some(v => ['left', 'right', 'hor-center'].includes(v))

  // Check if explicit direction (hor/ver) is specified - this takes precedence over 9-zone properties
  const hasExplicitDirection = values.some(v => ['hor', 'horizontal', 'ver', 'vertical'].includes(v))

  for (const name of values) {
    switch (name) {
      // Direction properties - in grid context, affects grid-auto-flow instead
      case 'horizontal':
      case 'hor':
        if (ctx.isGrid) {
          // In grid, hor sets grid-auto-flow: row (or combines with dense)
          const currentFlow = ctx.gridAutoFlow
          if (currentFlow === 'dense' || currentFlow === 'column dense') {
            ctx.gridAutoFlow = 'row dense'
          } else {
            ctx.gridAutoFlow = 'row'
          }
        } else {
          ctx.direction = 'row'
        }
        break
      case 'vertical':
      case 'ver':
        if (ctx.isGrid) {
          // In grid, ver sets grid-auto-flow: column (or combines with dense)
          const currentFlow = ctx.gridAutoFlow
          if (currentFlow === 'dense' || currentFlow === 'row dense') {
            ctx.gridAutoFlow = 'column dense'
          } else {
            ctx.gridAutoFlow = 'column'
          }
        } else {
          ctx.direction = 'column'
        }
        break

      // 9-zone properties: set alignment using _hAlign/_vAlign for direction-aware mapping
      // Direction is only set if no explicit hor/ver is specified
      // This allows "Frame hor, cl" to remain horizontal with vertical centering
      case 'top-left':
      case 'tl':
        if (!hasExplicitDirection) ctx.direction = 'column'
        ctx._vAlign = 'start'
        ctx._hAlign = 'start'
        break
      case 'top-center':
      case 'tc':
        if (!hasExplicitDirection) ctx.direction = 'column'
        ctx._vAlign = 'start'
        ctx._hAlign = 'center'
        break
      case 'top-right':
      case 'tr':
        if (!hasExplicitDirection) ctx.direction = 'column'
        ctx._vAlign = 'start'
        ctx._hAlign = 'end'
        break
      case 'center-left':
      case 'cl':
        if (!hasExplicitDirection) ctx.direction = 'column'
        ctx._vAlign = 'center'
        ctx._hAlign = 'start'
        break
      case 'center-right':
      case 'cr':
        if (!hasExplicitDirection) ctx.direction = 'column'
        ctx._vAlign = 'center'
        ctx._hAlign = 'end'
        break
      case 'bottom-left':
      case 'bl':
        if (!hasExplicitDirection) ctx.direction = 'column'
        ctx._vAlign = 'end'
        ctx._hAlign = 'start'
        break
      case 'bottom-center':
      case 'bc':
        if (!hasExplicitDirection) ctx.direction = 'column'
        ctx._vAlign = 'end'
        ctx._hAlign = 'center'
        break
      case 'bottom-right':
      case 'br':
        if (!hasExplicitDirection) ctx.direction = 'column'
        ctx._vAlign = 'end'
        ctx._hAlign = 'end'
        break

      // Original alignment properties
      case 'center':
      case 'cen':
        if (hasVertical && !hasHorizontal) {
          // With top/bottom → center means horizontal center
          ctx._hAlign = 'center'
        } else if (hasHorizontal && !hasVertical) {
          // With left/right → center means vertical center
          ctx._vAlign = 'center'
        } else {
          // Alone or with both → center both
          ctx.justifyContent = 'center'
          ctx.alignItems = 'center'
        }
        break
      case 'spread':
        ctx.justifyContent = 'space-between'
        break
      case 'left':
        ctx._hAlign = 'start'
        break
      case 'right':
        ctx._hAlign = 'end'
        break
      case 'hor-center':
        ctx._hAlign = 'center'
        break
      case 'top':
        ctx._vAlign = 'start'
        break
      case 'bottom':
        ctx._vAlign = 'end'
        break
      case 'ver-center':
        ctx._vAlign = 'center'
        break
    }
  }
}

// =============================================================================
// Layout Style Generation
// =============================================================================

/**
 * Generate final layout styles from LayoutContext.
 *
 * Key insight: In flexbox, alignment properties mean different CSS depending on direction.
 * - In column: left/right → align-items, top/bottom → justify-content
 * - In row: left/right → justify-content, top/bottom → align-items
 */
export function generateLayoutStyles(ctx: LayoutContext, primitive: string): IRStyle[] {
  const styles: IRStyle[] = []

  // Grid takes precedence
  if (ctx.isGrid) {
    styles.push({ property: 'display', value: 'grid' })
    if (ctx.gridColumns) {
      styles.push({ property: 'grid-template-columns', value: ctx.gridColumns })
    }
    if (ctx.gridAutoFlow) {
      styles.push({ property: 'grid-auto-flow', value: ctx.gridAutoFlow })
    }
    if (ctx.rowHeight) {
      styles.push({ property: 'grid-auto-rows', value: ctx.rowHeight })
    }
    // Handle gaps: specific gaps take precedence over general gap
    if (ctx.columnGap) {
      styles.push({ property: 'column-gap', value: ctx.columnGap })
    }
    if (ctx.rowGap) {
      styles.push({ property: 'row-gap', value: ctx.rowGap })
    }
    // Use general gap only if no specific gaps are set
    if (ctx.gap && !ctx.columnGap && !ctx.rowGap) {
      styles.push({ property: 'gap', value: ctx.gap })
    }
    return styles
  }

  // Determine final direction
  // Non-container primitives should NOT get default flex layout
  const primitiveLower = primitive?.toLowerCase() || ''
  const isContainer = isContainerPrimitive(primitiveLower)
  const direction = ctx.direction || (isContainer ? 'column' : null)

  // If no layout properties were set and not a container, skip flex styles
  const hasLayoutProps = direction || ctx.justifyContent || ctx.alignItems ||
                        ctx._hAlign || ctx._vAlign || ctx.flexWrap

  if (!hasLayoutProps && !isContainer) {
    if (ctx.gap) {
      // Gap without flex context - just return gap
      styles.push({ property: 'gap', value: ctx.gap })
    }
    return styles
  }

  // Add flex display
  styles.push({ property: 'display', value: 'flex' })

  // Add direction (default column for containers)
  const finalDirection = direction || 'column'
  styles.push({ property: 'flex-direction', value: finalDirection })

  // Hug content by default: elements should fit their content unless explicit width is set
  // This prevents the common "everything is full-width" problem in flex layouts
  if (!ctx.hasExplicitWidth) {
    styles.push({ property: 'width', value: 'fit-content' })
  }

  // Map horizontal/vertical alignment to justify-content/align-items based on direction
  const hAlign = ctx._hAlign
  const vAlign = ctx._vAlign

  const alignValue = (align: 'start' | 'end' | 'center'): string => {
    if (align === 'start') return 'flex-start'
    if (align === 'end') return 'flex-end'
    return 'center'
  }

  if (finalDirection === 'column') {
    // Column: horizontal → align-items, vertical → justify-content
    if (hAlign) {
      ctx.alignItems = alignValue(hAlign)
    } else if (!ctx.alignItems) {
      // SYMMETRIC: Both column and row default to flex-start
      ctx.alignItems = FLEX_DEFAULTS.column.alignItems
    }
    if (vAlign) {
      ctx.justifyContent = alignValue(vAlign)
    }
  } else {
    // Row: horizontal → justify-content, vertical → align-items
    if (hAlign) {
      ctx.justifyContent = alignValue(hAlign)
    }
    if (vAlign) {
      ctx.alignItems = alignValue(vAlign)
    } else if (!ctx.alignItems) {
      // SYMMETRIC: Both column and row default to flex-start
      // Use `center` explicitly for vertical centering in horizontal layouts
      ctx.alignItems = FLEX_DEFAULTS.row.alignItems
    }
  }

  // Add justify-content if set
  if (ctx.justifyContent) {
    styles.push({ property: 'justify-content', value: ctx.justifyContent })
  }

  // Add align-items if set
  if (ctx.alignItems) {
    styles.push({ property: 'align-items', value: ctx.alignItems })
  }

  // Add flex-wrap
  if (ctx.flexWrap) {
    styles.push({ property: 'flex-wrap', value: ctx.flexWrap })
  }

  // Add gaps (gap-x and gap-y work in flex too)
  if (ctx.columnGap) {
    styles.push({ property: 'column-gap', value: ctx.columnGap })
  }
  if (ctx.rowGap) {
    styles.push({ property: 'row-gap', value: ctx.rowGap })
  }
  // Use general gap only if no specific gaps are set
  if (ctx.gap && !ctx.columnGap && !ctx.rowGap) {
    styles.push({ property: 'gap', value: ctx.gap })
  }

  return styles
}

// =============================================================================
// Child Layout Context Adjustments
// =============================================================================

/**
 * Apply absolute positioning adjustments to children of a stacked (position: relative) container.
 *
 * This handles:
 * 1. Adding position: absolute to children
 * 2. Converting flex-based "full" sizing to percentage-based sizing
 * 3. Converting flex alignment to CSS position properties (top/left/right/bottom)
 *
 * @param children - The IRNode children to adjust (modified in place)
 * @param parentStyles - The parent's styles to check for position: relative
 */
export function applyAbsolutePositioningToChildren(children: IRNode[], parentStyles: IRStyle[]): void {
  const isRelativeContainer = parentStyles.some(s => s.property === 'position' && s.value === 'relative')
  if (!isRelativeContainer) return

  for (const child of children) {
    // Only add if child doesn't already have position set
    const hasPosition = child.styles.some(s => s.property === 'position')
    if (!hasPosition) {
      child.styles.push({ property: 'position', value: 'absolute' })
    }

    // Convert flex-based "full" to percentage-based sizing for absolute elements
    // flex: 1 1 0% and align-self: stretch don't work for absolute positioned elements
    const hasFlex = child.styles.some(s => s.property === 'flex' && s.value === '1 1 0%')
    const hasStretch = child.styles.some(s => s.property === 'align-self' && s.value === 'stretch')
    if (hasFlex || hasStretch) {
      // Detect which dimension had "full" by checking min-width/min-height: 0
      const hasMinWidth0 = child.styles.some(s => s.property === 'min-width' && s.value === '0')
      const hasMinHeight0 = child.styles.some(s => s.property === 'min-height' && s.value === '0')

      // Remove flex-related styles, but keep explicit min-width/min-height values
      const filteredStyles = child.styles.filter(s => {
        if (s.property === 'flex') return false
        if (s.property === 'align-self') return false
        // Only remove min-width: 0 / min-height: 0, keep explicit values
        if (s.property === 'min-width' && s.value === '0') return false
        if (s.property === 'min-height' && s.value === '0') return false
        return true
      })
      child.styles.length = 0
      child.styles.push(...filteredStyles)

      // Add percentage-based sizing
      if (hasMinWidth0) child.styles.push({ property: 'width', value: '100%' })
      if (hasMinHeight0) child.styles.push({ property: 'height', value: '100%' })
    }

    // Convert flex-based alignment to CSS position properties for stacked containers
    // This enables: `bottom, left` → position at bottom-left corner
    const justifyContent = child.styles.find(s => s.property === 'justify-content')?.value
    const alignItems = child.styles.find(s => s.property === 'align-items')?.value
    const flexDirection = child.styles.find(s => s.property === 'flex-direction')?.value

    // Only apply position-based offsets when using column direction (default)
    // In column layout: justify-content controls vertical, align-items controls horizontal
    if (flexDirection === 'column' || !flexDirection) {
      // Vertical positioning (justify-content)
      const hasTop = child.styles.some(s => s.property === 'top')
      const hasBottom = child.styles.some(s => s.property === 'bottom')
      if (!hasTop && !hasBottom) {
        if (justifyContent === 'flex-end') {
          child.styles.push({ property: 'bottom', value: '0' })
        } else if (justifyContent === 'flex-start') {
          child.styles.push({ property: 'top', value: '0' })
        } else if (justifyContent === 'center') {
          // Center vertically using top: 50% and transform
          child.styles.push({ property: 'top', value: '50%' })
          const hasTransform = child.styles.some(s => s.property === 'transform')
          if (!hasTransform) {
            child.styles.push({ property: 'transform', value: 'translateY(-50%)' })
          }
        }
      }

      // Horizontal positioning (align-items)
      const hasLeft = child.styles.some(s => s.property === 'left')
      const hasRight = child.styles.some(s => s.property === 'right')
      if (!hasLeft && !hasRight) {
        if (alignItems === 'flex-start') {
          child.styles.push({ property: 'left', value: '0' })
        } else if (alignItems === 'flex-end') {
          child.styles.push({ property: 'right', value: '0' })
        } else if (alignItems === 'center') {
          // Center horizontally using left: 50% and transform
          child.styles.push({ property: 'left', value: '50%' })
          const existingTransform = child.styles.find(s => s.property === 'transform')
          if (existingTransform) {
            // Combine with existing translateY if present
            if (existingTransform.value === 'translateY(-50%)') {
              existingTransform.value = 'translate(-50%, -50%)'
            }
          } else {
            child.styles.push({ property: 'transform', value: 'translateX(-50%)' })
          }
        }
      }
    }
  }
}

/**
 * Apply grid context adjustments to children.
 *
 * In grid containers, flex: 1 1 0% has no effect - grid cells fill automatically.
 * This removes unnecessary flex-related styles from grid children.
 *
 * @param children - The IRNode children to adjust (modified in place)
 * @param parentStyles - The parent's styles to check for display: grid
 */
export function applyGridContextToChildren(children: IRNode[], parentStyles: IRStyle[]): void {
  const isGridContainer = parentStyles.some(s => s.property === 'display' && s.value === 'grid')
  if (!isGridContainer) return

  for (const child of children) {
    const hasFlex = child.styles.some(s => s.property === 'flex' && s.value === '1 1 0%')
    if (hasFlex) {
      // Remove flex-related styles (they don't work in grid context)
      // But keep explicit min-width/min-height values
      const filteredStyles = child.styles.filter(s => {
        if (s.property === 'flex') return false
        if (s.property === 'align-self') return false
        // Only remove min-width: 0 / min-height: 0, keep explicit values
        if (s.property === 'min-width' && s.value === '0') return false
        if (s.property === 'min-height' && s.value === '0') return false
        return true
      })
      child.styles.length = 0
      child.styles.push(...filteredStyles)
      // No need to add width/height - grid cells fill their area automatically
    }
  }
}
