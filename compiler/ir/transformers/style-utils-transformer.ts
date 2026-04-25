/**
 * Style Utils Transformer
 *
 * Pure utility functions for CSS value formatting and transformation.
 * Handles px units, directional spacing, border formatting, and boolean properties.
 *
 * Extracted from ir/index.ts for modularity.
 */

import type {
  TokenReference,
  LoopVarReference,
  Conditional,
  ComputedExpression,
} from '../../parser/ast'

// Local type definition - matches parser usage
type PropertyValue =
  | string
  | number
  | boolean
  | TokenReference
  | LoopVarReference
  | Conditional
  | ComputedExpression
import type { IRStyle } from '../types'
import { DIRECTION_MAP, schemaPropertyToCSS } from '../../schema/ir-helpers'

// =============================================================================
// CSS Value Formatting
// =============================================================================

/**
 * Properties that need px units for numeric values.
 */
const NEEDS_PX_PROPERTIES = new Set([
  'padding',
  'pad',
  'p',
  'margin',
  'm',
  'gap',
  'g',
  'gap-x',
  'gx',
  'gap-y',
  'gy',
  'row-height',
  'rh',
  'width',
  'w',
  'height',
  'h',
  'min-width',
  'minw',
  'max-width',
  'maxw',
  'min-height',
  'minh',
  'max-height',
  'maxh',
  'font-size',
  'fs',
  'radius',
  'rad',
  'border-radius',
  'border',
  'bor',
])

/**
 * Format CSS value with appropriate units.
 * Adds px units to numeric values for properties that need them.
 *
 * @example
 * formatCSSValue('padding', '8 16') → '8px 16px'
 * formatCSSValue('opacity', '0.5') → '0.5'
 */
export function formatCSSValue(property: string, value: string): string {
  if (NEEDS_PX_PROPERTIES.has(property)) {
    // Handle multi-value properties (e.g., "8 16" → "8px 16px")
    return value
      .split(' ')
      .map(v => {
        // Only add px to integer values (incl. negatives), not values with existing units
        // (%, vh, vw, vmin, vmax, em, rem, etc.)
        if (/^-?\d+$/.test(v)) {
          return `${v}px`
        }
        return v
      })
      .join(' ')
  }

  return value
}

// =============================================================================
// Directional Spacing
// =============================================================================

/**
 * Parse directional spacing (padding/margin).
 * Uses DIRECTION_MAP from schema/ir-helpers.ts.
 *
 * Supports:
 * - pad left 20                    → padding-left: 20px
 * - pad top 8 bottom 24            → padding-top: 8px, padding-bottom: 24px
 * - pad left right 8               → padding-left: 8px, padding-right: 8px
 * - margin top bottom left 4       → margin-top/bottom/left: 4px
 * - pad x 16                       → padding-left: 16px, padding-right: 16px
 * - pad y 8                        → padding-top: 8px, padding-bottom: 8px
 */
export function parseDirectionalSpacing(property: string, values: PropertyValue[]): IRStyle[] {
  const styles: IRStyle[] = []

  let i = 0
  while (i < values.length) {
    const val = String(values[i])

    // Check if this is a direction (using centralized DIRECTION_MAP)
    if (DIRECTION_MAP[val]) {
      // Collect all consecutive directions
      const directions: string[] = []
      while (i < values.length && DIRECTION_MAP[String(values[i])]) {
        directions.push(...DIRECTION_MAP[String(values[i])])
        i++
      }

      // Next value should be the actual value
      if (i < values.length) {
        const numVal = String(values[i])
        const px = /^-?\d+$/.test(numVal) ? `${numVal}px` : numVal

        // Apply value to all collected directions (deduplicated)
        const uniqueDirs = [...new Set(directions)]
        for (const dir of uniqueDirs) {
          styles.push({ property: `${property}-${dir}`, value: px })
        }
        i++
      }
    } else {
      i++
    }
  }
  return styles
}

// =============================================================================
// Border Formatting
// =============================================================================

/**
 * Border styles that are recognized.
 */
const BORDER_STYLES = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
  'none',
])

/**
 * Format border value.
 * Converts shorthand border values to full CSS border format.
 *
 * @example
 * formatBorderValue([1, '#333']) → '1px solid #333'
 * formatBorderValue([2, 'dashed', '#666']) → '2px dashed #666'
 */
export function formatBorderValue(values: PropertyValue[]): string {
  const parts: string[] = []
  let hasStyle = false

  for (const v of values) {
    const str = String(v)
    if (/^\d+$/.test(str)) {
      parts.push(`${str}px`)
    } else if (BORDER_STYLES.has(str)) {
      hasStyle = true
      parts.push(str)
    } else {
      parts.push(str)
    }
  }

  // If no explicit style, add 'solid' after width
  if (!hasStyle && parts.length > 0 && parts[0].endsWith('px')) {
    parts.splice(1, 0, 'solid')
  }

  // If no explicit color was provided (parts contains only width and/or style),
  // add currentColor — matches the behavior of the schema-driven `border-*` paths.
  const hasColor = parts.some(p => !p.endsWith('px') && !BORDER_STYLES.has(p))
  if (!hasColor && parts.length > 0 && parts[0].endsWith('px')) {
    parts.push('currentColor')
  }

  return parts.join(' ')
}

// =============================================================================
// Boolean Property Conversion
// =============================================================================

/**
 * Convert boolean/standalone properties to CSS styles.
 * First tries schema, then falls back to hardcoded alignment properties.
 *
 * @example
 * booleanPropertyToCSS('left') → [{ property: 'align-items', value: 'flex-start' }, ...]
 * booleanPropertyToCSS('stacked') → [{ property: 'position', value: 'relative' }]
 */
export function booleanPropertyToCSS(name: string): IRStyle[] {
  // Try schema first
  const schemaResult = schemaPropertyToCSS(name, [true])
  if (schemaResult.handled && schemaResult.styles.length > 0) {
    return schemaResult.styles
  }

  // Fallback for properties not fully in schema or with special handling
  switch (name) {
    // Alignment: Using column layout defaults (frame default)
    // In column: left/right → align-items, top/bottom → justify-content
    // IMPORTANT: Must also set display: flex and flex-direction: column for alignment to work
    case 'left':
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'column' },
        { property: 'align-items', value: 'flex-start' },
      ]
    case 'right':
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'column' },
        { property: 'align-items', value: 'flex-end' },
      ]
    case 'top':
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'column' },
        { property: 'justify-content', value: 'flex-start' },
      ]
    case 'bottom':
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'column' },
        { property: 'justify-content', value: 'flex-end' },
      ]
    case 'hor-center':
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'column' },
        { property: 'align-items', value: 'center' },
      ]
    case 'ver-center':
      return [
        { property: 'display', value: 'flex' },
        { property: 'flex-direction', value: 'column' },
        { property: 'justify-content', value: 'center' },
      ]
    // Stacked container (absolute layout)
    case 'stacked':
      return [{ property: 'position', value: 'relative' }]
    default:
      return []
  }
}
