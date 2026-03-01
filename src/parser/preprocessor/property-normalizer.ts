/**
 * @module parser/preprocessor/property-normalizer
 * @description Normalizes property names, directions, and corners to canonical form
 *
 * Uses the DSL Schema as single source of truth.
 */

import {
  normalizePropertyName as schemaPropertyName,
  normalizeDirectionToShort,
  normalizeCornerToLong,
} from '../../dsl/dsl-schema'

// =============================================================================
// PROPERTY NAME NORMALIZATION
// =============================================================================

/**
 * Normalize a property name to its canonical (long) form
 *
 * @example
 * normalizePropertyName('pad')  // → 'padding'
 * normalizePropertyName('bg')   // → 'background'
 * normalizePropertyName('col')  // → 'color'
 */
export function normalizePropertyName(name: string): string {
  return schemaPropertyName(name)
}

// =============================================================================
// DIRECTION NORMALIZATION
// =============================================================================

/**
 * Normalize a direction to its canonical (short) form
 *
 * NOTE: We use SHORT forms (l, r, t, b) because the parser's lexer
 * recognizes these as DIRECTION tokens. Long forms (left, right, top, bottom)
 * are tokenized as PROPERTY tokens (alignment keywords).
 *
 * @example
 * normalizeDirection('left')      // → 'l'
 * normalizeDirection('bottom')    // → 'b'
 * normalizeDirection('left-right')// → 'l-r'
 * normalizeDirection('top-bottom')// → 't-b'
 * normalizeDirection('l')         // → 'l' (unchanged)
 */
export function normalizeDirection(dir: string): string {
  // Handle combos (hyphenated or concatenated)
  if (dir.includes('-') || /^[lrtbud]{2,}$/.test(dir)) {
    return normalizeDirectionComboToShort(dir)
  }

  // Single direction
  return normalizeDirectionToShort(dir)
}

/**
 * Normalize a direction combo to short form
 */
function normalizeDirectionComboToShort(combo: string): string {
  if (combo.includes('-')) {
    return combo
      .split('-')
      .map(normalizeDirectionToShort)
      .join('-')
  }
  // Handle concatenated short forms (e.g., 'lr', 'ud')
  if (/^[lrudtb]+$/.test(combo) && combo.length > 1) {
    return combo
      .split('')
      .map(normalizeDirectionToShort)
      .join('-')
  }
  return normalizeDirectionToShort(combo)
}

// =============================================================================
// CORNER NORMALIZATION
// =============================================================================

/**
 * Normalize a corner to its canonical (short) form
 *
 * NOTE: We use SHORT forms (tl, tr, bl, br) for parser compatibility,
 * matching our approach with directions.
 *
 * @example
 * normalizeCorner('tl')         // → 'tl' (unchanged)
 * normalizeCorner('br')         // → 'br' (unchanged)
 * normalizeCorner('top-left')   // → 'tl'
 */
export function normalizeCorner(corner: string): string {
  return normalizeCornerToShort(corner)
}

/**
 * Normalize a corner to short form
 */
function normalizeCornerToShort(corner: string): string {
  const longToShort: Record<string, string> = {
    'top-left': 'tl',
    'top-right': 'tr',
    'bottom-left': 'bl',
    'bottom-right': 'br',
  }
  return longToShort[corner] ?? corner
}

// =============================================================================
// COMPOUND NORMALIZATIONS
// =============================================================================

/**
 * Normalize a full property declaration
 * Handles property name + optional direction/corner
 *
 * @example
 * normalizePropertyDeclaration('pad', 'l')      // → { property: 'padding', direction: 'left' }
 * normalizePropertyDeclaration('rad', 'tl')     // → { property: 'radius', corner: 'top-left' }
 * normalizePropertyDeclaration('bg')            // → { property: 'background' }
 */
export function normalizePropertyDeclaration(
  property: string,
  modifier?: string
): {
  property: string
  direction?: string
  corner?: string
} {
  const normalizedProperty = normalizePropertyName(property)

  if (!modifier) {
    return { property: normalizedProperty }
  }

  // Check if it's a corner (short forms: tl, tr, bl, br)
  if (/^(tl|tr|bl|br|top-left|top-right|bottom-left|bottom-right)$/.test(modifier)) {
    return {
      property: normalizedProperty,
      corner: normalizeCorner(modifier),
    }
  }

  // Otherwise treat as direction
  return {
    property: normalizedProperty,
    direction: normalizeDirection(modifier),
  }
}

// =============================================================================
// HOVER PROPERTY NORMALIZATION
// =============================================================================

/**
 * Normalize hover property names
 *
 * @example
 * normalizeHoverProperty('hover-bg')   // → 'hover-background'
 * normalizeHoverProperty('hover-col')  // → 'hover-color'
 */
export function normalizeHoverProperty(name: string): string {
  if (!name.startsWith('hover-')) {
    return normalizePropertyName(name)
  }

  // Extract the base property after 'hover-'
  const base = name.slice(6)
  const normalizedBase = normalizePropertyName(base)

  return `hover-${normalizedBase}`
}

// =============================================================================
// COMPONENT REFERENCE NORMALIZATION
// =============================================================================

/**
 * Normalize a component reference
 * Normalizes the property part of Component.property references
 *
 * @example
 * normalizeComponentRef('Base.bg')       // → 'Base.background'
 * normalizeComponentRef('Card.pad')      // → 'Card.padding'
 * normalizeComponentRef('Theme.color')   // → 'Theme.color' (unchanged, already long form)
 */
export function normalizeComponentRef(ref: string): string {
  const dotIndex = ref.indexOf('.')
  if (dotIndex === -1) return ref

  const component = ref.slice(0, dotIndex)
  const property = ref.slice(dotIndex + 1)
  const normalizedProperty = normalizePropertyName(property)

  return `${component}.${normalizedProperty}`
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a string is a valid direction
 */
export function isDirection(str: string): boolean {
  const directions = new Set([
    'left', 'right', 'top', 'bottom',
    'l', 'r', 't', 'b', 'u', 'd',
    'left-right', 'top-bottom', 'l-r', 't-b', 'u-d', 'lr', 'tb', 'ud',
  ])
  return directions.has(str)
}

/**
 * Check if a string is a valid corner
 */
export function isCorner(str: string): boolean {
  const corners = new Set([
    'top-left', 'top-right', 'bottom-left', 'bottom-right',
    'tl', 'tr', 'bl', 'br',
  ])
  return corners.has(str)
}
