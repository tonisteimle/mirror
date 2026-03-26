/**
 * Autocomplete Completions
 *
 * Auto-generated from src/schema/dsl.ts and src/schema/zag-primitives.ts
 * DO NOT EDIT MANUALLY - regenerate from schema!
 */

import { DSL, SCHEMA, ZAG_PRIMITIVES } from '../../src/schema/dsl'

// ============================================================================
// Keywords
// ============================================================================

export const RESERVED_KEYWORDS: string[] = [...DSL.keywords.reserved]

// ============================================================================
// Primitives
// ============================================================================

export const PRIMITIVES: string[] = (() => {
  const names: string[] = []
  for (const [name, def] of Object.entries(DSL.primitives)) {
    names.push(name)
    if (def.aliases) {
      names.push(...def.aliases)
    }
  }
  return names
})()

// ============================================================================
// Zag Primitives
// ============================================================================

export const ZAG_COMPONENTS: string[] = Object.keys(ZAG_PRIMITIVES)

export const ZAG_SLOTS: Record<string, string[]> = (() => {
  const slots: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(ZAG_PRIMITIVES)) {
    slots[name] = def.slots
  }
  return slots
})()

export const ZAG_PROPS: Record<string, string[]> = (() => {
  const props: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(ZAG_PRIMITIVES)) {
    props[name] = def.props
  }
  return props
})()

export const ZAG_EVENTS: Record<string, string[]> = (() => {
  const events: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(ZAG_PRIMITIVES)) {
    events[name] = def.events ?? []
  }
  return events
})()

export const ZAG_ITEM_KEYWORDS: Record<string, string[]> = (() => {
  const keywords: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(ZAG_PRIMITIVES)) {
    keywords[name] = def.itemKeywords ?? ['Item']
  }
  return keywords
})()

// ============================================================================
// Property Aliases
// ============================================================================

export const PROPERTY_ALIASES: Record<string, string> = (() => {
  const aliases: Record<string, string> = {}
  for (const [name, def] of Object.entries(SCHEMA)) {
    for (const alias of def.aliases) {
      aliases[alias] = name
    }
  }
  return aliases
})()

// ============================================================================
// Keywords per Property
// ============================================================================

export const PROPERTY_KEYWORDS: Record<string, string[]> = (() => {
  const keywords: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.keywords) {
      const kw = Object.keys(def.keywords).filter(k => k !== '_standalone')
      if (kw.length > 0) {
        keywords[name] = kw
        // Also add for aliases
        for (const alias of def.aliases) {
          keywords[alias] = kw
        }
      }
    }
  }
  return keywords
})()

// ============================================================================
// All Properties (including 9-zone alignment and pin-*)
// ============================================================================

export const ALL_PROPERTIES: string[] = (() => {
  const props: string[] = []
  for (const [name, def] of Object.entries(SCHEMA)) {
    props.push(name)
    props.push(...def.aliases)
  }
  return props
})()

// ============================================================================
// 9-Zone Alignment Properties
// ============================================================================

export const NINE_ZONE_PROPERTIES: string[] = [
  'top-left', 'tl',
  'top-center', 'tc',
  'top-right', 'tr',
  'center-left', 'cl',
  'center', 'cen',
  'center-right', 'cr',
  'bottom-left', 'bl',
  'bottom-center', 'bc',
  'bottom-right', 'br',
]

// ============================================================================
// Pin/Constraint Properties
// ============================================================================

export const PIN_PROPERTIES: string[] = [
  'pin-left', 'pl',
  'pin-right', 'pr',
  'pin-top', 'pt',
  'pin-bottom', 'pb',
  'pin-center-x', 'pcx',
  'pin-center-y', 'pcy',
  'pin-center', 'pc',
]

// ============================================================================
// Directional Properties (with direction suffixes)
// ============================================================================

export const DIRECTIONAL_PROPERTIES: Record<string, string[]> = (() => {
  const directional: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.directional) {
      directional[name] = def.directional.directions
      for (const alias of def.aliases) {
        directional[alias] = def.directional.directions
      }
    }
  }
  return directional
})()

// ============================================================================
// Color Properties
// ============================================================================

export const COLOR_PROPERTIES: string[] = (() => {
  const colors: string[] = []
  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.color) {
      colors.push(name)
      colors.push(...def.aliases)
    }
  }
  return colors
})()

// ============================================================================
// Token Properties
// ============================================================================

export const TOKEN_PROPERTIES: string[] = (() => {
  const tokens: string[] = []
  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.token) {
      tokens.push(name)
      tokens.push(...def.aliases)
    }
  }
  return tokens
})()

// ============================================================================
// Numeric Properties
// ============================================================================

export const NUMERIC_PROPERTIES: string[] = (() => {
  const numeric: string[] = []
  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.numeric) {
      numeric.push(name)
      numeric.push(...def.aliases)
    }
  }
  return numeric
})()

// ============================================================================
// Standalone Properties (no value required)
// ============================================================================

export const STANDALONE_PROPERTIES: string[] = (() => {
  const standalone: string[] = []
  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.keywords?._standalone) {
      standalone.push(name)
      standalone.push(...def.aliases)
    }
  }
  return standalone
})()

// ============================================================================
// Properties by Category
// ============================================================================

export const PROPERTIES_BY_CATEGORY: Record<string, string[]> = (() => {
  const categories: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(SCHEMA)) {
    if (!categories[def.category]) {
      categories[def.category] = []
    }
    categories[def.category].push(name)
    categories[def.category].push(...def.aliases)
  }
  return categories
})()

// ============================================================================
// Events
// ============================================================================

export const EVENTS: string[] = Object.keys(DSL.events)

export const KEY_EVENTS: string[] = Object.entries(DSL.events)
  .filter(([_, def]) => def.acceptsKey)
  .map(([name]) => name)

// ============================================================================
// Actions
// ============================================================================

export const ACTIONS: string[] = Object.keys(DSL.actions)

export const ACTIONS_WITH_TARGETS: string[] = Object.entries(DSL.actions)
  .filter(([_, def]) => def.targets && def.targets.length > 0)
  .map(([name]) => name)

export const ACTION_TARGETS: Record<string, string[]> = (() => {
  const targets: Record<string, string[]> = {}
  for (const [name, def] of Object.entries(DSL.actions)) {
    if (def.targets) {
      targets[name] = def.targets
    }
  }
  return targets
})()

// ============================================================================
// States
// ============================================================================

export const STATES: string[] = Object.keys(DSL.states)

export const SYSTEM_STATES: string[] = Object.entries(DSL.states)
  .filter(([_, def]) => def.system)
  .map(([name]) => name)

export const CUSTOM_STATES: string[] = Object.entries(DSL.states)
  .filter(([_, def]) => !def.system)
  .map(([name]) => name)

// ============================================================================
// Keyboard Keys
// ============================================================================

export const KEYBOARD_KEYS: string[] = [...DSL.keys]

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a property accepts keywords
 */
export function hasKeywords(propertyName: string): boolean {
  return propertyName in PROPERTY_KEYWORDS
}

/**
 * Get keywords for a property
 */
export function getKeywords(propertyName: string): string[] {
  return PROPERTY_KEYWORDS[propertyName] ?? []
}

/**
 * Check if a property is standalone (no value required)
 */
export function isStandalone(propertyName: string): boolean {
  return STANDALONE_PROPERTIES.includes(propertyName)
}

/**
 * Check if a property accepts colors
 */
export function isColorProperty(propertyName: string): boolean {
  return COLOR_PROPERTIES.includes(propertyName)
}

/**
 * Check if a property accepts tokens
 */
export function isTokenProperty(propertyName: string): boolean {
  return TOKEN_PROPERTIES.includes(propertyName)
}

/**
 * Check if a property accepts numbers
 */
export function isNumericProperty(propertyName: string): boolean {
  return NUMERIC_PROPERTIES.includes(propertyName)
}

/**
 * Check if a property has directional variants
 */
export function hasDirections(propertyName: string): boolean {
  return propertyName in DIRECTIONAL_PROPERTIES
}

/**
 * Get directions for a property
 */
export function getDirections(propertyName: string): string[] {
  return DIRECTIONAL_PROPERTIES[propertyName] ?? []
}

/**
 * Check if a name is a Zag component
 */
export function isZagComponent(name: string): boolean {
  return ZAG_COMPONENTS.includes(name)
}

/**
 * Get slots for a Zag component
 */
export function getZagSlots(componentName: string): string[] {
  return ZAG_SLOTS[componentName] ?? []
}

/**
 * Get props for a Zag component
 */
export function getZagProps(componentName: string): string[] {
  return ZAG_PROPS[componentName] ?? []
}

/**
 * Get events for a Zag component
 */
export function getZagEvents(componentName: string): string[] {
  return ZAG_EVENTS[componentName] ?? []
}

/**
 * Get item keywords for a Zag component
 */
export function getZagItemKeywords(componentName: string): string[] {
  return ZAG_ITEM_KEYWORDS[componentName] ?? ['Item']
}

/**
 * Resolve a property alias to its canonical name
 */
export function resolveAlias(alias: string): string {
  return PROPERTY_ALIASES[alias] ?? alias
}
