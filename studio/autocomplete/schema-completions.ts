/**
 * Schema-Based Completions Generator
 *
 * Generates all autocomplete completions dynamically from the DSL schema.
 * This is the Single Source of Truth for completions.
 *
 * Imports:
 * - DSL primitives, events, actions, states from src/schema/dsl.ts
 * - SCHEMA properties from src/schema/dsl.ts
 * - ZAG_PRIMITIVES from src/schema/zag-primitives.ts
 */

import { DSL, SCHEMA, ZAG_PRIMITIVES, type PropertyDef } from '../../compiler/schema/dsl'
import type { Completion } from './index'

// ============================================================================
// Primitive Completions
// ============================================================================

/**
 * Generate completions for DSL primitives (Box, Text, Button, etc.)
 */
export function generatePrimitiveCompletions(): Completion[] {
  const completions: Completion[] = []

  for (const [name, def] of Object.entries(DSL.primitives)) {
    completions.push({
      label: name,
      detail: `<${def.html}> - ${def.description}`,
      type: 'component',
      boost: 10,
    })

    // Add aliases
    if (def.aliases) {
      for (const alias of def.aliases) {
        completions.push({
          label: alias,
          detail: `<${def.html}> (alias for ${name})`,
          type: 'component',
          boost: 9,
        })
      }
    }
  }

  return completions
}

// ============================================================================
// Zag Component Completions
// ============================================================================

/**
 * Generate completions for Zag components (Accordion, Select, Dialog, etc.)
 */
export function generateZagCompletions(): Completion[] {
  const completions: Completion[] = []

  for (const [name, def] of Object.entries(ZAG_PRIMITIVES)) {
    completions.push({
      label: name,
      detail: def.description || `Zag ${name} component`,
      type: 'component',
      boost: 8,
      info: def.pattern ? `Pattern: ${def.pattern}` : undefined,
    })
  }

  return completions
}

/**
 * Get slot completions for a specific Zag component
 */
export function getZagSlotCompletions(componentName: string): Completion[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  if (!primitive) return []

  return primitive.slots.map(slot => ({
    label: `${componentName}${slot}`,
    detail: `Slot of ${componentName}`,
    type: 'component',
    boost: 7,
  }))
}

/**
 * Get all Zag slot completions (prefixed with component name)
 */
export function generateAllZagSlotCompletions(): Completion[] {
  const completions: Completion[] = []

  for (const [name, def] of Object.entries(ZAG_PRIMITIVES)) {
    for (const slot of def.slots) {
      completions.push({
        label: `${name}${slot}`,
        detail: `Slot of ${name}`,
        type: 'component',
        boost: 6,
      })
    }
  }

  return completions
}

/**
 * Get Zag component props as completions
 */
export function getZagPropCompletions(componentName: string): Completion[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  if (!primitive) return []

  return primitive.props.map(prop => ({
    label: prop,
    detail: `${componentName} prop`,
    type: 'property',
    boost: 5,
  }))
}

// ============================================================================
// Property Completions
// ============================================================================

/**
 * Generate completions for all DSL properties
 */
export function generatePropertyCompletions(): Completion[] {
  const completions: Completion[] = []

  for (const [name, def] of Object.entries(SCHEMA)) {
    // Main property
    completions.push({
      label: name,
      detail: def.description,
      type: 'property',
      boost: def.aliases.length > 0 ? 4 : 5, // Prefer short aliases
    })

    // Aliases
    for (const alias of def.aliases) {
      completions.push({
        label: alias,
        detail: `${def.description} (alias for ${name})`,
        type: 'property',
        boost: 5,
      })
    }

    // Directional variants (pad left, margin x, etc.)
    if (def.directional) {
      for (const dir of def.directional.directions) {
        // Create completions for property + direction (e.g., "pad left")
        completions.push({
          label: `${name} ${dir}`,
          detail: `${def.description} (${dir})`,
          type: 'property',
          boost: 3,
        })
        // Also for aliases
        for (const alias of def.aliases) {
          completions.push({
            label: `${alias} ${dir}`,
            detail: `${def.description} (${dir})`,
            type: 'property',
            boost: 3,
          })
        }
      }
    }
  }

  return completions
}

/**
 * Generate value completions for a specific property
 */
export function generatePropertyValueCompletions(propertyName: string): Completion[] {
  // Find property by name or alias
  let prop: PropertyDef | undefined = SCHEMA[propertyName]

  if (!prop) {
    // Search by alias
    for (const def of Object.values(SCHEMA)) {
      if (def.aliases.includes(propertyName)) {
        prop = def
        break
      }
    }
  }

  if (!prop) return []

  const completions: Completion[] = []

  // Add keyword values
  if (prop.keywords) {
    for (const [keyword, valueDef] of Object.entries(prop.keywords)) {
      if (keyword === '_standalone') continue // Skip standalone marker

      completions.push({
        label: keyword,
        detail: valueDef.description,
        type: 'value',
        boost: 5,
      })
    }
  }

  return completions
}

/**
 * Generate all property value completions (for all properties)
 */
export function generateAllPropertyValueCompletions(): Record<string, Completion[]> {
  const valueMap: Record<string, Completion[]> = {}

  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.keywords) {
      const values: Completion[] = []
      for (const [keyword, valueDef] of Object.entries(def.keywords)) {
        if (keyword === '_standalone') continue

        values.push({
          label: keyword,
          detail: valueDef.description,
          type: 'value',
        })
      }
      if (values.length > 0) {
        valueMap[name] = values
        // Also add for aliases
        for (const alias of def.aliases) {
          valueMap[alias] = values
        }
      }
    }
  }

  return valueMap
}

// ============================================================================
// Event Completions
// ============================================================================

/**
 * Generate completions for all DSL events
 */
export function generateEventCompletions(): Completion[] {
  return Object.entries(DSL.events).map(([name, def]) => ({
    label: name,
    detail: def.description,
    type: 'keyword',
    boost: 4,
    info: def.acceptsKey ? 'Accepts key modifier' : undefined,
  }))
}

// ============================================================================
// Action Completions
// ============================================================================

/**
 * Generate completions for all DSL actions
 */
export function generateActionCompletions(): Completion[] {
  return Object.entries(DSL.actions).map(([name, def]) => ({
    label: name,
    detail: def.description,
    type: 'keyword',
    boost: 4,
    info: def.targets ? `Targets: ${def.targets.join(', ')}` : undefined,
  }))
}

/**
 * Get action target completions (next, prev, first, last, etc.)
 */
export function generateActionTargetCompletions(): Completion[] {
  // Collect all unique targets from actions
  const targets = new Set<string>()

  for (const def of Object.values(DSL.actions)) {
    if (def.targets) {
      for (const target of def.targets) {
        targets.add(target)
      }
    }
  }

  // Add common targets
  const commonTargets = ['self', 'next', 'prev', 'first', 'last', 'all', 'none', 'highlighted', 'selected']
  for (const target of commonTargets) {
    targets.add(target)
  }

  return Array.from(targets).map(target => ({
    label: target,
    detail: `Target: ${target}`,
    type: 'keyword',
    boost: 3,
  }))
}

// ============================================================================
// State Completions
// ============================================================================

/**
 * Generate completions for all DSL states
 */
export function generateStateCompletions(): Completion[] {
  return Object.entries(DSL.states).map(([name, def]) => ({
    label: name,
    detail: def.description,
    type: 'state',
    boost: def.system ? 5 : 4,
    info: def.system ? 'System state (CSS pseudo-class)' : 'Custom state',
  }))
}

/**
 * Get system states only
 */
export function generateSystemStateCompletions(): Completion[] {
  return Object.entries(DSL.states)
    .filter(([_, def]) => def.system)
    .map(([name, def]) => ({
      label: name,
      detail: def.description,
      type: 'state',
      boost: 5,
    }))
}

/**
 * Get custom states only
 */
export function generateCustomStateCompletions(): Completion[] {
  return Object.entries(DSL.states)
    .filter(([_, def]) => !def.system)
    .map(([name, def]) => ({
      label: name,
      detail: def.description,
      type: 'state',
      boost: 4,
    }))
}

// ============================================================================
// Keyboard Key Completions
// ============================================================================

/**
 * Generate completions for keyboard keys (for onkeydown)
 */
export function generateKeyCompletions(): Completion[] {
  return DSL.keys.map(key => ({
    label: key,
    detail: `Keyboard key: ${key}`,
    type: 'constant',
    boost: 3,
  }))
}

// ============================================================================
// Keyword Completions
// ============================================================================

/**
 * Generate completions for reserved keywords (as, extends, if, else, etc.)
 */
export function generateKeywordCompletions(): Completion[] {
  return DSL.keywords.reserved.map(keyword => ({
    label: keyword,
    detail: `Reserved keyword`,
    type: 'keyword',
    boost: 2,
  }))
}

// ============================================================================
// Actions with Targets (derived from schema)
// ============================================================================

/**
 * Get all action names that expect a target element
 */
export function getActionsWithTarget(): string[] {
  return Object.entries(DSL.actions)
    .filter(([_, def]) => def.targets ||
      // Actions that commonly take element targets
      ['show', 'hide', 'toggle', 'open', 'close', 'select', 'focus', 'page'].includes(_))
    .map(([name]) => name)
}

/**
 * Get all possible targets for actions
 */
export function getAllActionTargets(): string[] {
  const targets = new Set<string>()

  // Collect targets from schema
  for (const def of Object.values(DSL.actions)) {
    if (def.targets) {
      for (const target of def.targets) {
        targets.add(target)
      }
    }
  }

  // Add common targets not in schema
  const commonTargets = ['self', 'all', 'none', 'highlighted', 'selected']
  for (const target of commonTargets) {
    targets.add(target)
  }

  return Array.from(targets)
}

// ============================================================================
// Transition Properties (derived from schema)
// ============================================================================

/**
 * Get properties that can be transitioned (animatable CSS properties)
 */
export function getTransitionProperties(): string[] {
  const transitionable: string[] = []

  for (const [name, def] of Object.entries(SCHEMA)) {
    // Properties that generate CSS that can be animated
    if (def.color || def.numeric || def.keywords?._standalone) {
      transitionable.push(name)
      transitionable.push(...def.aliases)
    }
  }

  // Add 'all' as a special value
  return ['all', ...transitionable]
}

// ============================================================================
// Combined Completions
// ============================================================================

/**
 * All generated completions combined
 */
export const SCHEMA_COMPLETIONS = {
  primitives: generatePrimitiveCompletions(),
  zagComponents: generateZagCompletions(),
  zagSlots: generateAllZagSlotCompletions(),
  properties: generatePropertyCompletions(),
  propertyValues: generateAllPropertyValueCompletions(),
  events: generateEventCompletions(),
  actions: generateActionCompletions(),
  actionTargets: generateActionTargetCompletions(),
  states: generateStateCompletions(),
  systemStates: generateSystemStateCompletions(),
  customStates: generateCustomStateCompletions(),
  keys: generateKeyCompletions(),
  keywords: generateKeywordCompletions(),
  // Derived lists for autocomplete context detection
  actionsWithTarget: getActionsWithTarget(),
  transitionProperties: getTransitionProperties(),
}

/**
 * Get all component completions (primitives + Zag)
 */
export function getAllComponentCompletions(): Completion[] {
  return [...SCHEMA_COMPLETIONS.primitives, ...SCHEMA_COMPLETIONS.zagComponents]
}

/**
 * Get all completions for general autocomplete
 */
export function getAllCompletions(): Completion[] {
  return [
    ...SCHEMA_COMPLETIONS.primitives,
    ...SCHEMA_COMPLETIONS.zagComponents,
    ...SCHEMA_COMPLETIONS.properties,
    ...SCHEMA_COMPLETIONS.events,
  ]
}

// ============================================================================
// Context-Sensitive Helpers
// ============================================================================

/**
 * Check if a component name is a Zag component
 */
export function isZagComponent(name: string): boolean {
  return name in ZAG_PRIMITIVES
}

/**
 * Get Zag component slots for context-sensitive completion
 */
export function getZagSlotsForComponent(componentName: string): string[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  return primitive?.slots ?? []
}

/**
 * Get Zag component props for context-sensitive completion
 */
export function getZagPropsForComponent(componentName: string): string[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  return primitive?.props ?? []
}

/**
 * Get Zag component events for context-sensitive completion
 */
export function getZagEventsForComponent(componentName: string): string[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  return primitive?.events ?? []
}

/**
 * Get Zag item keywords for a component
 */
export function getZagItemKeywords(componentName: string): string[] {
  const primitive = ZAG_PRIMITIVES[componentName]
  return primitive?.itemKeywords ?? ['Item']
}

// ============================================================================
// Utility: Generate property names list
// ============================================================================

/**
 * Get all property names including aliases
 */
export function getAllPropertyNames(): string[] {
  const names: string[] = []

  for (const [name, def] of Object.entries(SCHEMA)) {
    names.push(name)
    names.push(...def.aliases)
  }

  return names
}

/**
 * Get standalone properties (no value required)
 */
export function getStandaloneProperties(): string[] {
  const standalone: string[] = []

  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.keywords?._standalone) {
      standalone.push(name)
      standalone.push(...def.aliases)
    }
  }

  return standalone
}

/**
 * Get color properties (accept hex colors)
 */
export function getColorProperties(): string[] {
  const colors: string[] = []

  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.color) {
      colors.push(name)
      colors.push(...def.aliases)
    }
  }

  return colors
}

/**
 * Get numeric properties (accept numbers)
 */
export function getNumericProperties(): string[] {
  const numeric: string[] = []

  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.numeric) {
      numeric.push(name)
      numeric.push(...def.aliases)
    }
  }

  return numeric
}

/**
 * Get token properties (accept $tokens)
 */
export function getTokenProperties(): string[] {
  const tokens: string[] = []

  for (const [name, def] of Object.entries(SCHEMA)) {
    if (def.token) {
      tokens.push(name)
      tokens.push(...def.aliases)
    }
  }

  return tokens
}
