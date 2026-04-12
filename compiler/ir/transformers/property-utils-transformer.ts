/**
 * Property Utils Transformer
 *
 * Pure utility functions for property manipulation and analysis.
 * Handles property merging, layout type detection, and value binding extraction.
 *
 * Extracted from ir/index.ts for modularity.
 */

import type { Property } from '../../parser/ast'
import type { DefaultProperty } from '../../schema/primitives'
import type { LayoutType } from '../types'
import { getCanonicalPropertyName } from '../../schema/parser-helpers'

// =============================================================================
// Property Conversion
// =============================================================================

/**
 * Convert default property definitions to Property objects.
 * Used when resolving component inheritance.
 */
export function convertDefaultsToProperties(defaults: DefaultProperty[]): Property[] {
  return defaults.map(def => ({
    type: 'Property' as const,
    name: def.name,
    values: def.values,
    line: 0,
    column: 0,
  }))
}

// =============================================================================
// Layout Type Detection
// =============================================================================

/**
 * Determine layoutType from properties.
 * Used by drop strategies to determine whether to use absolute positioning.
 *
 * Priority: absolute > grid > flex (if multiple layout properties are present)
 */
export function determineLayoutType(properties: Property[]): LayoutType | undefined {
  let hasAbsolute = false
  let hasGrid = false
  let hasFlex = false

  for (const prop of properties) {
    const name = prop.name.toLowerCase()

    // Absolute layout properties
    if (name === 'stacked') {
      hasAbsolute = true
    }

    // Grid layout
    if (name === 'grid') {
      hasGrid = true
    }

    // Flex layout properties
    if (name === 'hor' || name === 'horizontal' || name === 'ver' || name === 'vertical') {
      hasFlex = true
    }
  }

  // Priority: absolute > grid > flex
  if (hasAbsolute) return 'absolute'
  if (hasGrid) return 'grid'
  if (hasFlex) return 'flex'

  return undefined
}

// =============================================================================
// Property Merging
// =============================================================================

/**
 * Directions recognized for directional properties.
 */
const DIRECTIONS = new Set([
  'left', 'right', 'top', 'bottom', 'down',
  'l', 'r', 't', 'b', 'x', 'y',
  'horizontal', 'vertical', 'hor', 'ver',
  'tl', 'tr', 'bl', 'br',
])

/**
 * Properties that support directional values.
 */
const DIRECTIONAL_PROPS = new Set(['padding', 'margin', 'radius', 'border'])

/**
 * Get unique key for a property, considering directional variants.
 *
 * For directional properties (pad, margin, rad, bor), the key includes direction.
 * This allows multiple directional values to coexist:
 * - pad left 10 → key: "padding:left"
 * - pad right 20 → key: "padding:right"
 * - pad 10 → key: "padding" (overwrites all directional pads)
 */
function getPropertyKey(prop: Property): string {
  // Normalize alias to canonical name (e.g., 'bg' -> 'background')
  // This ensures that 'bg #f00 background #00f' treats them as the same property
  const name = getCanonicalPropertyName(prop.name)
  const values = prop.values

  if (DIRECTIONAL_PROPS.has(name) && values.length >= 2) {
    const firstVal = String(values[0]).toLowerCase()
    if (DIRECTIONS.has(firstVal)) {
      // Include all direction tokens in the key
      const dirs: string[] = []
      for (const v of values) {
        const val = String(v).toLowerCase()
        if (DIRECTIONS.has(val)) {
          dirs.push(val)
        } else {
          break
        }
      }
      return `${name}:${dirs.join(':')}`
    }
  }

  return name
}

/**
 * Merge properties (later values override earlier).
 *
 * For directional properties (pad, margin, rad, bor), the key includes direction.
 * This allows multiple directional values to coexist:
 * - pad left 10 → key: "pad:left"
 * - pad right 20 → key: "pad:right"
 * - pad 10 → key: "pad" (overwrites all directional pads)
 */
export function mergeProperties(base: Property[], overrides: Property[]): Property[] {
  const map = new Map<string, Property>()

  for (const prop of base) {
    map.set(getPropertyKey(prop), prop)
  }
  for (const prop of overrides) {
    map.set(getPropertyKey(prop), prop)
  }
  return Array.from(map.values())
}

// =============================================================================
// Value Binding Extraction
// =============================================================================

/**
 * Extract valueBinding path from properties for two-way data binding.
 * Returns the token path if value property contains a token reference.
 *
 * @example
 * extractValueBinding([{ name: 'value', values: [{ kind: 'token', name: 'user.name' }] }])
 * // → "user.name"
 *
 * extractValueBinding([{ name: 'value', values: ['$user.name'] }])
 * // → "user.name"
 */
export function extractValueBinding(properties: Property[]): string | undefined {
  const valueProp = properties.find(p => p.name === 'value')
  if (!valueProp || !valueProp.values || valueProp.values.length === 0) {
    return undefined
  }

  const firstValue = valueProp.values[0]

  // Check for explicit token reference object
  if (typeof firstValue === 'object' && firstValue !== null && 'kind' in firstValue && firstValue.kind === 'token') {
    return (firstValue as { kind: 'token'; name: string }).name
  }

  // Check for string starting with $ (e.g., "$user.name")
  if (typeof firstValue === 'string' && firstValue.startsWith('$') && /^\$[a-zA-Z_]/.test(firstValue)) {
    return firstValue.slice(1) // Remove $ prefix
  }

  return undefined
}
