/**
 * Parser Helpers - Generated from Schema
 *
 * Provides property sets for the parser based on the DSL schema.
 * This ensures parser property recognition stays in sync with schema.
 *
 * IMPORTANT: All constants here are derived from dsl.ts schema.
 * DO NOT add hardcoded values - add them to dsl.ts instead.
 */

import { SCHEMA, DSL, PropertyDef } from './dsl'

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
  // ALL from schema - properties that take values (numeric, color, keywords, or custom)
  ...Object.values(SCHEMA)
    .filter(prop =>
      prop.numeric ||
      prop.color ||
      (prop.keywords && Object.keys(prop.keywords).length > 0 && !prop.keywords._standalone)
    )
    .flatMap(prop => [prop.name, ...prop.aliases]),
  // Special keywords that take a value
  'bind',  // bind varName - tracks active exclusive() child content
])

/**
 * Boolean properties - standalone properties that need no value.
 * These have a _standalone keyword in the schema.
 */
export const BOOLEAN_PROPERTIES = new Set<string>([
  // ALL from schema - properties with _standalone keyword
  ...Object.values(SCHEMA)
    .filter(prop => prop.keywords?._standalone)
    .flatMap(prop => [prop.name, ...prop.aliases]),
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
  'spread', 'wrap', 'stacked', 'dense',

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

// ============================================================================
// KEYBOARD KEYS - from DSL.keys
// ============================================================================

/**
 * Valid keyboard keys for onkeydown/onkeyup events.
 * These are NOT inline states - they're event modifiers.
 * Source: DSL.keys in dsl.ts
 */
export const KEYBOARD_KEYS = new Set<string>(DSL.keys)

// ============================================================================
// STATES - from DSL.states
// ============================================================================

/**
 * All state names (system + custom).
 * Source: DSL.states in dsl.ts
 */
export const STATE_NAMES = new Set<string>(Object.keys(DSL.states))

/**
 * System states that map to CSS pseudo-classes (:hover, :focus, etc.)
 * Source: DSL.states where system === true
 */
export const SYSTEM_STATES = new Set<string>(
  Object.entries(DSL.states)
    .filter(([_, def]) => def.system)
    .map(([name]) => name)
)

/**
 * Custom states that use data-state attribute.
 * Source: DSL.states where system !== true
 */
export const CUSTOM_STATES = new Set<string>(
  Object.entries(DSL.states)
    .filter(([_, def]) => !def.system)
    .map(([name]) => name)
)

/**
 * State modifiers for the interaction model.
 * - exclusive: only one element in group can have this state
 * - toggle: same trigger toggles state on/off
 * - initial: explicitly mark as initial state
 */
export const STATE_MODIFIERS = new Set<string>([
  'exclusive', 'toggle', 'initial',
])

// ============================================================================
// DIRECTIONAL PROPERTIES - from SCHEMA[prop].directional
// ============================================================================

/**
 * Properties that support directional values (pad left 8, margin x 16, etc.)
 * Source: Properties with directional config in SCHEMA
 */
export const DIRECTIONAL_PROPERTIES = new Set<string>(
  Object.values(SCHEMA)
    .filter(prop => prop.directional)
    .flatMap(prop => [prop.name, ...prop.aliases])
)

/**
 * All valid direction keywords across all directional properties.
 */
export const DIRECTION_KEYWORDS = new Set<string>(
  Object.values(SCHEMA)
    .filter(prop => prop.directional)
    .flatMap(prop => prop.directional!.directions)
)

/**
 * Get valid directions for a specific property.
 */
export function getDirectionsForProperty(nameOrAlias: string): string[] {
  // Find property by name or alias
  for (const prop of Object.values(SCHEMA)) {
    if (prop.name === nameOrAlias || prop.aliases.includes(nameOrAlias)) {
      return prop.directional?.directions ?? []
    }
  }
  return []
}

/**
 * Check if a value is a direction keyword for a given property.
 */
export function isDirectionForProperty(propertyName: string, value: string): boolean {
  const directions = getDirectionsForProperty(propertyName)
  return directions.includes(value)
}

// ============================================================================
// ACTIONS - from DSL.actions
// ============================================================================

/**
 * All action names.
 * Source: DSL.actions in dsl.ts
 */
export const ACTION_NAMES = new Set<string>(Object.keys(DSL.actions))

/**
 * Actions that accept targets (highlight next, highlight prev, etc.)
 */
export const ACTIONS_WITH_TARGETS = new Map<string, string[]>(
  Object.entries(DSL.actions)
    .filter(([_, def]) => def.targets)
    .map(([name, def]) => [name, def.targets!])
)

// ============================================================================
// EVENTS - from DSL.events
// ============================================================================

/**
 * All event names.
 * Source: DSL.events in dsl.ts
 */
export const EVENT_NAMES = new Set<string>(Object.keys(DSL.events))

/**
 * Events that accept key modifiers (onkeydown enter:, onkeyup escape:)
 */
export const EVENTS_WITH_KEY = new Set<string>(
  Object.entries(DSL.events)
    .filter(([_, def]) => def.acceptsKey)
    .map(([name]) => name)
)

// ============================================================================
// ANIMATIONS - from DSL.animationPresets and DSL.easingFunctions
// ============================================================================

/**
 * Animation presets for state transitions.
 * Source: DSL.animationPresets in dsl.ts
 */
export const ANIMATION_PRESETS = new Set<string>(DSL.animationPresets)

/**
 * Easing functions for animations.
 * Source: DSL.easingFunctions in dsl.ts
 */
export const EASING_FUNCTIONS = new Set<string>(DSL.easingFunctions.map(e => e.value))

/**
 * Parse duration string (e.g., "0.2s", "200ms") to seconds.
 * Returns undefined if not a valid duration.
 */
export function parseDuration(value: string): number | undefined {
  // Check for seconds format: 0.2s, 1s, .5s
  const secondsMatch = value.match(/^(\d*\.?\d+)s$/)
  if (secondsMatch) {
    return parseFloat(secondsMatch[1])
  }
  // Check for milliseconds format: 200ms, 1000ms
  const msMatch = value.match(/^(\d+)ms$/)
  if (msMatch) {
    return parseInt(msMatch[1], 10) / 1000
  }
  return undefined
}
