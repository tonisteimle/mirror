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

import {
  DSL,
  SCHEMA,
  ZAG_PRIMITIVES,
  COMPOUND_PRIMITIVES,
  CHART_PRIMITIVES,
  type PropertyDef,
} from '../../compiler/schema/dsl'
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
  return Object.entries(ZAG_PRIMITIVES).flatMap(([name, def]) =>
    def.slots.map(slot => ({
      label: `${name}${slot}`,
      detail: `Slot of ${name}`,
      type: 'component',
      boost: 6,
    }))
  )
}

/**
 * Get Zag slot completions grouped by component
 * Used for context-sensitive completion within a component
 */
export function generateZagSlotsByComponent(): Record<string, Completion[]> {
  const slotsMap: Record<string, Completion[]> = {}

  for (const [name, def] of Object.entries(ZAG_PRIMITIVES)) {
    slotsMap[name] = def.slots.map(slot => ({
      label: slot,
      detail: `Slot of ${name}`,
      type: 'component' as const,
      boost: 7,
    }))
  }

  return slotsMap
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
// Chart Primitive Completions
// ============================================================================

/**
 * Generate completions for Chart primitives (Line, Bar, Pie, etc.)
 */
export function generateChartCompletions(): Completion[] {
  const completions: Completion[] = []

  for (const [name, def] of Object.entries(CHART_PRIMITIVES)) {
    completions.push({
      label: name,
      detail: def.description,
      type: 'component',
      boost: 8,
    })
  }

  return completions
}

// ============================================================================
// Compound Primitive Completions
// ============================================================================

/**
 * Generate completions for Compound primitives (Table, etc.)
 */
export function generateCompoundCompletions(): Completion[] {
  const completions: Completion[] = []

  for (const [name, def] of Object.entries(COMPOUND_PRIMITIVES)) {
    completions.push({
      label: name,
      detail: def.description || `${name} component`,
      type: 'component',
      boost: 8,
    })

    // Add slot completions (Row, Column, Header, etc.)
    if (def.slots) {
      for (const slot of def.slots) {
        completions.push({
          label: slot,
          detail: `${name} slot`,
          type: 'component',
          boost: 7,
        })
      }
    }
  }

  return completions
}

// ============================================================================
// Zag Item Keywords Completions
// ============================================================================

/**
 * Generate completions for Zag item keywords (Tab, NavItem, RadioItem, Option, etc.)
 */
export function generateZagItemKeywordCompletions(): Completion[] {
  const completions: Completion[] = []
  const seen = new Set<string>()

  for (const [name, def] of Object.entries(ZAG_PRIMITIVES)) {
    // Add item keywords (Tab, NavItem, RadioItem, Option, etc.)
    if (def.itemKeywords) {
      for (const keyword of def.itemKeywords) {
        if (!seen.has(keyword)) {
          seen.add(keyword)
          completions.push({
            label: keyword,
            detail: `Item of ${name}`,
            type: 'component',
            boost: 8,
          })
        }
      }
    }

    // Add group keywords (NavGroup, etc.)
    if (def.groupKeywords) {
      for (const keyword of def.groupKeywords) {
        if (!seen.has(keyword)) {
          seen.add(keyword)
          completions.push({
            label: keyword,
            detail: `Group in ${name}`,
            type: 'component',
            boost: 8,
          })
        }
      }
    }
  }

  return completions
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
  const commonTargets = [
    'self',
    'next',
    'prev',
    'first',
    'last',
    'all',
    'none',
    'highlighted',
    'selected',
  ]
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
    .filter(
      ([_, def]) =>
        def.targets ||
        // Actions that commonly take element targets
        ['show', 'hide', 'toggle', 'open', 'close', 'select', 'focus', 'page'].includes(_)
    )
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
// Duration & Easing Completions
// ============================================================================

/**
 * Generate completions for transition durations from schema
 */
export function generateDurationCompletions(): Completion[] {
  return DSL.durations.map(d => ({
    label: d.value,
    detail: `${d.label} - ${d.description}`,
    type: 'constant' as const,
  }))
}

/**
 * Generate completions for easing functions from schema
 */
export function generateEasingCompletions(): Completion[] {
  return DSL.easingFunctions.map(e => ({
    label: e.value,
    detail: e.description,
    type: 'constant' as const,
  }))
}

/**
 * Generate completions for animation presets from schema
 */
export function generateAnimationPresetCompletions(): Completion[] {
  return DSL.animationPresets.map(preset => ({
    label: preset,
    detail: `${preset} animation`,
    type: 'keyword' as const,
  }))
}

// ============================================================================
// Icon Name Completions
// ============================================================================

/**
 * Common Lucide icon names for autocomplete
 */
const COMMON_ICON_NAMES = [
  'activity',
  'airplay',
  'alert-circle',
  'alert-triangle',
  'align-center',
  'align-justify',
  'align-left',
  'align-right',
  'anchor',
  'aperture',
  'archive',
  'arrow-down',
  'arrow-left',
  'arrow-right',
  'arrow-up',
  'at-sign',
  'award',
  'bar-chart',
  'bar-chart-2',
  'battery',
  'bell',
  'bluetooth',
  'bold',
  'book',
  'book-open',
  'bookmark',
  'box',
  'briefcase',
  'calendar',
  'camera',
  'cast',
  'check',
  'check-circle',
  'check-square',
  'chevron-down',
  'chevron-left',
  'chevron-right',
  'chevron-up',
  'chrome',
  'circle',
  'clipboard',
  'clock',
  'cloud',
  'code',
  'codepen',
  'coffee',
  'columns',
  'command',
  'compass',
  'copy',
  'corner-down-left',
  'cpu',
  'credit-card',
  'crop',
  'crosshair',
  'database',
  'delete',
  'disc',
  'dollar-sign',
  'download',
  'droplet',
  'edit',
  'edit-2',
  'edit-3',
  'external-link',
  'eye',
  'eye-off',
  'facebook',
  'fast-forward',
  'feather',
  'figma',
  'file',
  'file-minus',
  'file-plus',
  'file-text',
  'film',
  'filter',
  'flag',
  'folder',
  'folder-minus',
  'folder-plus',
  'framer',
  'frown',
  'gift',
  'git-branch',
  'git-commit',
  'git-merge',
  'git-pull-request',
  'github',
  'gitlab',
  'globe',
  'grid',
  'hard-drive',
  'hash',
  'headphones',
  'heart',
  'help-circle',
  'hexagon',
  'home',
  'image',
  'inbox',
  'info',
  'instagram',
  'italic',
  'key',
  'layers',
  'layout',
  'life-buoy',
  'link',
  'link-2',
  'linkedin',
  'list',
  'loader',
  'lock',
  'log-in',
  'log-out',
  'mail',
  'map',
  'map-pin',
  'maximize',
  'maximize-2',
  'meh',
  'menu',
  'message-circle',
  'message-square',
  'mic',
  'mic-off',
  'minimize',
  'minimize-2',
  'minus',
  'minus-circle',
  'minus-square',
  'monitor',
  'moon',
  'more-horizontal',
  'more-vertical',
  'mouse-pointer',
  'move',
  'music',
  'navigation',
  'navigation-2',
  'octagon',
  'package',
  'paperclip',
  'pause',
  'pause-circle',
  'pen-tool',
  'percent',
  'phone',
  'phone-call',
  'phone-forwarded',
  'phone-incoming',
  'phone-missed',
  'phone-off',
  'phone-outgoing',
  'pie-chart',
  'play',
  'play-circle',
  'plus',
  'plus-circle',
  'plus-square',
  'pocket',
  'power',
  'printer',
  'radio',
  'refresh-ccw',
  'refresh-cw',
  'repeat',
  'rewind',
  'rotate-ccw',
  'rotate-cw',
  'rss',
  'save',
  'scissors',
  'search',
  'send',
  'server',
  'settings',
  'share',
  'share-2',
  'shield',
  'shield-off',
  'shopping-bag',
  'shopping-cart',
  'shuffle',
  'sidebar',
  'skip-back',
  'skip-forward',
  'slack',
  'slash',
  'sliders',
  'smartphone',
  'smile',
  'speaker',
  'square',
  'star',
  'stop-circle',
  'sun',
  'sunrise',
  'sunset',
  'tablet',
  'tag',
  'target',
  'terminal',
  'thermometer',
  'thumbs-down',
  'thumbs-up',
  'toggle-left',
  'toggle-right',
  'tool',
  'trash',
  'trash-2',
  'trello',
  'trending-down',
  'trending-up',
  'triangle',
  'truck',
  'tv',
  'twitch',
  'twitter',
  'type',
  'umbrella',
  'underline',
  'unlock',
  'upload',
  'upload-cloud',
  'user',
  'user-check',
  'user-minus',
  'user-plus',
  'user-x',
  'users',
  'video',
  'video-off',
  'voicemail',
  'volume',
  'volume-1',
  'volume-2',
  'volume-x',
  'watch',
  'wifi',
  'wifi-off',
  'wind',
  'x',
  'x-circle',
  'x-octagon',
  'x-square',
  'youtube',
  'zap',
  'zap-off',
  'zoom-in',
  'zoom-out',
]

/**
 * Generate completions for icon names
 */
export function generateIconNameCompletions(): Completion[] {
  return COMMON_ICON_NAMES.map(name => ({
    label: name,
    detail: `Lucide icon: ${name}`,
    type: 'constant' as const,
    boost: 5,
  }))
}

/**
 * Get all icon names
 */
export function getIconNames(): string[] {
  return COMMON_ICON_NAMES
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
  zagSlots: generateZagSlotsByComponent(),
  zagItemKeywords: generateZagItemKeywordCompletions(),
  chartComponents: generateChartCompletions(),
  compoundComponents: generateCompoundCompletions(),
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
  // Transition/animation completions from schema
  durations: generateDurationCompletions(),
  easings: generateEasingCompletions(),
  animationPresets: generateAnimationPresetCompletions(),
  // Icon name completions
  iconNames: generateIconNameCompletions(),
  // Derived lists for autocomplete context detection
  actionsWithTarget: getActionsWithTarget(),
  transitionProperties: getTransitionProperties(),
}

/**
 * Get all component completions (primitives + Zag + Charts + Compound + Item Keywords)
 */
export function getAllComponentCompletions(): Completion[] {
  return [
    ...SCHEMA_COMPLETIONS.primitives,
    ...SCHEMA_COMPLETIONS.zagComponents,
    ...SCHEMA_COMPLETIONS.zagItemKeywords,
    ...SCHEMA_COMPLETIONS.chartComponents,
    ...SCHEMA_COMPLETIONS.compoundComponents,
  ]
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
