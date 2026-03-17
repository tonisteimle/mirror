/**
 * Parser Helpers - Generated from Schema
 *
 * Provides property sets for the parser based on the DSL schema.
 * This ensures parser property recognition stays in sync with schema.
 */

import { SCHEMA, PropertyDef } from './dsl'

/**
 * Properties that START a new property - used for automatic separation.
 * These are properties that take values (numeric, color, keyword).
 *
 * When parsing "Box h 300 bg #333", the parser recognizes "bg" as a property starter
 * and separates it into two properties: h: [300] and bg: [#333]
 *
 * NOTE: Boolean properties (hor, ver, center, wrap, etc.) are NOT included here
 * because they are handled separately in component body parsing.
 */
export const PROPERTY_STARTERS = new Set<string>([
  // From schema - properties that take values
  ...Object.values(SCHEMA)
    .filter(prop => prop.numeric || prop.color || (prop.keywords && !prop.keywords._standalone))
    .flatMap(prop => [prop.name, ...prop.aliases]),

  // Additional properties not in schema (content, HTML attributes, etc.)
  'content', 'href', 'src', 'placeholder',
  'icon-size', 'is', 'icon-color', 'ic', 'icon-weight', 'iw',
  'animation', 'anim',
  'x-offset', 'y-offset',

  // Hover variants
  'hover-bg', 'hover-col', 'hover-opacity', 'hover-opa',
  'hover-scale', 'hover-bor', 'hover-border', 'hover-boc',
  'hover-border-color', 'hover-rad', 'hover-radius',
])

/**
 * Boolean properties - standalone properties that need no value.
 * These have a _standalone keyword in the schema.
 */
export const BOOLEAN_PROPERTIES = new Set<string>([
  // From schema - properties with _standalone keyword
  ...Object.values(SCHEMA)
    .filter(prop => prop.keywords?._standalone)
    .flatMap(prop => [prop.name, ...prop.aliases]),

  // Additional boolean properties not in schema
  'focusable',
  'readonly',
])

/**
 * Layout boolean properties that should trigger property separation.
 * These are layout modifiers that commonly appear after value-taking properties.
 *
 * Position booleans (left, right, top, bottom) are NOT included
 * because they're commonly used as values for "align".
 */
export const LAYOUT_BOOLEANS = new Set<string>([
  // Core layout booleans
  'horizontal', 'hor', 'vertical', 'ver',
  'center', 'cen',
  'spread', 'wrap', 'stacked',
  'pos', 'positioned',

  // Position
  'absolute', 'abs', 'fixed', 'relative',

  // Visibility
  'hidden', 'visible', 'disabled',

  // Scroll
  'scroll', 'scroll-ver', 'scroll-hor', 'scroll-both', 'clip',

  // Typography modifiers
  'truncate', 'italic', 'underline', 'uppercase', 'lowercase',

  // Flex
  'grow', 'shrink',

  // Input
  'focusable', 'readonly',
])

/**
 * Get all property names and aliases from the schema.
 */
export function getAllSchemaPropertyNames(): Set<string> {
  const names = new Set<string>()
  for (const prop of Object.values(SCHEMA)) {
    names.add(prop.name)
    for (const alias of prop.aliases) {
      names.add(alias)
    }
  }
  return names
}

/**
 * Check if a property name is a valid property from the schema.
 */
export function isValidProperty(name: string): boolean {
  return getAllSchemaPropertyNames().has(name) ||
    PROPERTY_STARTERS.has(name) ||
    BOOLEAN_PROPERTIES.has(name)
}

/**
 * Get canonical property name from alias.
 * Returns the input if it's already canonical or not found.
 */
export function getCanonicalPropertyName(nameOrAlias: string): string {
  for (const prop of Object.values(SCHEMA)) {
    if (prop.name === nameOrAlias) return prop.name
    if (prop.aliases.includes(nameOrAlias)) return prop.name
  }
  return nameOrAlias
}
