/**
 * Autocomplete Engine - Context-aware completions for Mirror DSL
 *
 * Uses schema-completions.ts as Single Source of Truth for all completions.
 */

import { state } from '../core'
import {
  SCHEMA_COMPLETIONS,
  generatePropertyValueCompletions,
  getAllComponentCompletions,
  getAllCompletions,
  isZagComponent,
  getZagSlotsForComponent,
  getZagPropsForComponent,
  getZagEventsForComponent,
  getZagItemKeywords,
  generateKeywordCompletions,
} from './schema-completions'

export interface Completion {
  label: string
  detail?: string
  type: 'property' | 'value' | 'component' | 'token' | 'state' | 'keyword' | 'constant'
  boost?: number
  info?: string
}

export interface AutocompleteRequest {
  lineText: string
  cursorColumn: number
  fullSource?: string
  explicit?: boolean
}

export interface AutocompleteResult {
  completions: Completion[]
  from: number
  to: number
  context: AutocompleteContext
}

export type AutocompleteContext =
  | 'property'     // After comma, component name, or colon
  | 'value'        // After property name
  | 'state'        // After "state "
  | 'slot'         // Indented with capital letter (Zag slot)
  | 'action'       // After event: (onclick:, onhover:, etc.)
  | 'target'       // After action (show, hide, toggle, etc.)
  | 'duration'     // After transition property
  | 'easing'       // After transition duration
  | 'zag-prop'     // Inside a Zag component
  | 'zag-slot'     // Inside a Zag component, typing a slot
  | 'none'

// Priority properties (common ones shown first)
export const PRIORITY_PROPERTIES = new Set([
  'bg', 'background', 'col', 'color', 'pad', 'padding', 'gap', 'g',
  'rad', 'radius', 'bor', 'border', 'width', 'w', 'height', 'h',
  'hor', 'horizontal', 'ver', 'vertical', 'center', 'cen',
  'font-size', 'fs', 'weight', 'opacity', 'o', 'shadow',
  'hover-bg', 'hover-col', 'cursor', 'hidden', 'visible'
])

// Re-export generated completions
export const STATE_NAMES = SCHEMA_COMPLETIONS.states
export const ACTION_COMPLETIONS = SCHEMA_COMPLETIONS.actions
export const TARGET_KEYWORDS = SCHEMA_COMPLETIONS.actionTargets
export const MIRROR_PROPERTIES = SCHEMA_COMPLETIONS.properties
export const PROPERTY_VALUES = SCHEMA_COMPLETIONS.propertyValues

// Duration values for transitions
export const DURATION_COMPLETIONS: Completion[] = [
  { label: '100', detail: '100ms - fast', type: 'constant' },
  { label: '150', detail: '150ms - quick', type: 'constant' },
  { label: '200', detail: '200ms - normal', type: 'constant' },
  { label: '300', detail: '300ms - smooth', type: 'constant' },
  { label: '500', detail: '500ms - slow', type: 'constant' },
]

// Easing functions for transitions
export const EASING_COMPLETIONS: Completion[] = [
  { label: 'ease', detail: 'default easing', type: 'constant' },
  { label: 'ease-in', detail: 'slow start', type: 'constant' },
  { label: 'ease-out', detail: 'slow end', type: 'constant' },
  { label: 'ease-in-out', detail: 'slow start and end', type: 'constant' },
  { label: 'linear', detail: 'constant speed', type: 'constant' },
]

// Event names that trigger action context
export const EVENT_NAMES = SCHEMA_COMPLETIONS.events.map(e => e.label)

// Actions that expect a target - derived from schema
export const ACTIONS_WITH_TARGET = SCHEMA_COMPLETIONS.actionsWithTarget

// Transition properties - derived from schema
export const TRANSITION_PROPERTIES = SCHEMA_COMPLETIONS.transitionProperties

// Mirror keywords - base keywords from schema + additional UI keywords
export const MIRROR_KEYWORDS: Completion[] = [
  // Reserved keywords from schema (as, extends, if, else, each, etc.)
  ...SCHEMA_COMPLETIONS.keywords,

  // Additional keywords not in schema (import is external)
  { label: 'import', detail: 'import file', type: 'keyword' },
  { label: 'state', detail: 'custom state', type: 'keyword' },

  // Timing modifiers
  { label: 'debounce', detail: 'delay until idle', type: 'keyword' },
  { label: 'delay', detail: 'delay action', type: 'keyword' },

  // Animation presets
  { label: 'fade', detail: 'fade animation', type: 'keyword' },
  { label: 'scale', detail: 'scale animation', type: 'keyword' },
  { label: 'slide-up', detail: 'slide up', type: 'keyword' },
  { label: 'slide-down', detail: 'slide down', type: 'keyword' },
  { label: 'slide-left', detail: 'slide left', type: 'keyword' },
  { label: 'slide-right', detail: 'slide right', type: 'keyword' },
  { label: 'spin', detail: 'spin animation', type: 'keyword' },
  { label: 'pulse', detail: 'pulse animation', type: 'keyword' },
  { label: 'bounce', detail: 'bounce animation', type: 'keyword' },

  // Overlay positions
  { label: 'below', detail: 'position below', type: 'keyword' },
  { label: 'above', detail: 'position above', type: 'keyword' },
]

// All completions combined (generated from schema + keywords)
export const ALL_COMPLETIONS: Completion[] = [
  ...getAllCompletions(),
  ...MIRROR_KEYWORDS,
  ...SCHEMA_COMPLETIONS.actions,
]

/**
 * Extract named elements from source code for target completion
 */
export function extractElementNames(source: string): string[] {
  const names: string[] = []
  const lines = source.split('\n')

  for (const line of lines) {
    // Definition: Name: = Component or Name: = properties
    const defMatch = line.match(/^([A-Z][a-zA-Z0-9_]*)\s*:\s*=/)
    if (defMatch) {
      names.push(defMatch[1])
      continue
    }

    // Instance: Name = Component
    const instMatch = line.match(/^([A-Z][a-zA-Z0-9_]*)\s*=\s*[A-Z]/)
    if (instMatch) {
      names.push(instMatch[1])
      continue
    }

    // Named component at line start (uppercase, not a definition)
    const compMatch = line.match(/^([A-Z][a-zA-Z0-9_]*)(?:\s|$)/)
    if (compMatch && !line.includes('=') && !line.includes(':')) {
      const name = compMatch[1]
      // Only add if it looks like a custom component (not primitive)
      const primitiveNames = SCHEMA_COMPLETIONS.primitives.map(c => c.label)
      if (!primitiveNames.includes(name)) {
        names.push(name)
      }
    }
  }

  // Deduplicate
  return [...new Set(names)]
}

/**
 * Extract page names from source code
 */
export function extractPageNames(source: string): string[] {
  const pages: string[] = []
  const lines = source.split('\n')

  for (const line of lines) {
    const pageMatch = line.match(/^([A-Z][a-zA-Z0-9_]*Page)\s*:\s*=/)
    if (pageMatch) {
      pages.push(pageMatch[1])
    }
  }

  return [...new Set(pages)]
}

/**
 * Find the parent Zag component for the current position
 */
export function findParentZagComponent(source: string, lineNumber: number): string | null {
  const lines = source.split('\n')
  const currentIndent = lines[lineNumber]?.match(/^(\s*)/)?.[1]?.length ?? 0

  // Search backwards for a Zag component with less indentation
  for (let i = lineNumber - 1; i >= 0; i--) {
    const line = lines[i]
    const indent = line.match(/^(\s*)/)?.[1]?.length ?? 0

    if (indent < currentIndent) {
      // Check if this line starts with a Zag component
      const compMatch = line.match(/^\s*([A-Z][a-zA-Z0-9]*)/)
      if (compMatch && isZagComponent(compMatch[1])) {
        return compMatch[1]
      }
    }
  }

  return null
}

export class AutocompleteEngine {
  /**
   * Detect the context for autocomplete
   */
  detectContext(lineText: string, cursorColumn: number, fullSource?: string, lineNumber?: number): AutocompleteContext {
    const textBefore = lineText.slice(0, cursorColumn)

    // After "state " → state names
    if (textBefore.match(/\bstate\s+$/)) {
      return 'state'
    }

    // After event + colon (onclick:, onhover:, etc.) → action context
    const eventPattern = new RegExp(
      `\\b(${EVENT_NAMES.join('|')})(\\s+\\w+)?:\\s*$`
    )
    if (eventPattern.test(textBefore)) {
      return 'action'
    }

    // After action in chain → target context
    const actionPattern = new RegExp(
      `\\b(${EVENT_NAMES.join('|')})(\\s+\\w+)?:\\s*` +
      `(?:\\w+\\s+\\w+\\s*,\\s*)*` +
      `(${ACTIONS_WITH_TARGET.join('|')})\\s+$`
    )
    if (actionPattern.test(textBefore)) {
      return 'target'
    }

    // After "transition" + property → duration context
    const transitionPropPattern = new RegExp(
      `\\btransition\\s+(${TRANSITION_PROPERTIES.join('|')})\\s+$`
    )
    if (transitionPropPattern.test(textBefore)) {
      return 'duration'
    }

    // After "transition" + property + number → easing context
    const transitionDurationPattern = new RegExp(
      `\\btransition\\s+(${TRANSITION_PROPERTIES.join('|')})\\s+\\d+\\s+$`
    )
    if (transitionDurationPattern.test(textBefore)) {
      return 'easing'
    }

    // Check for Zag slot context (indented, typing capital letter)
    const isIndented = lineText.match(/^\s+/)
    const typingCapital = textBefore.match(/^\s+[A-Z][a-zA-Z0-9]*$/)
    if (isIndented && typingCapital && fullSource && lineNumber !== undefined) {
      const parentZag = findParentZagComponent(fullSource, lineNumber)
      if (parentZag) {
        return 'zag-slot'
      }
    }

    // After a property name (property followed by space) → values
    if (textBefore.match(/\b([\w-]+)\s+$/)) {
      const match = textBefore.match(/\b([\w-]+)\s+$/)
      if (match && PROPERTY_VALUES[match[1].toLowerCase()]) {
        return 'value'
      }
    }

    // After comma, colon, or component name → properties
    if (textBefore.match(/,\s*$/) ||
        textBefore.match(/^\s+$/) ||
        textBefore.match(/^[A-Z]\w*\s+$/) ||
        textBefore.match(/^\s+[A-Z]\w*\s+$/)) {
      return 'property'
    }

    // Definition colon (Name: =) → property context
    if (textBefore.match(/:\s*$/) && !eventPattern.test(textBefore)) {
      return 'property'
    }

    return 'none'
  }

  /**
   * Get completions based on context
   */
  getCompletions(request: AutocompleteRequest): AutocompleteResult {
    const { lineText, cursorColumn, fullSource, explicit } = request

    // Find word at cursor
    const textBefore = lineText.slice(0, cursorColumn)
    const wordMatch = textBefore.match(/[\w-]*$/)
    const typed = wordMatch ? wordMatch[0].toLowerCase() : ''
    const from = cursorColumn - (wordMatch ? wordMatch[0].length : 0)

    // Get line number for context detection
    const lineNumber = fullSource ? fullSource.slice(0, fullSource.indexOf(lineText)).split('\n').length - 1 : 0

    const context = this.detectContext(lineText, from, fullSource, lineNumber)

    // State context
    if (context === 'state') {
      let completions = [...STATE_NAMES]
      if (typed) {
        completions = completions.filter(c => c.label.startsWith(typed))
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Action context (after onclick:, onhover:, etc.)
    if (context === 'action') {
      let completions = [...ACTION_COMPLETIONS]
      if (typed) {
        completions = completions.filter(c =>
          c.label.toLowerCase().startsWith(typed)
        )
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Target context (after show, hide, toggle, etc.)
    if (context === 'target') {
      let completions: Completion[] = [...TARGET_KEYWORDS]

      // Add element names from source
      if (fullSource) {
        const elementNames = extractElementNames(fullSource)
        const elementCompletions: Completion[] = elementNames.map(name => ({
          label: name,
          detail: 'element',
          type: 'component' as const
        }))
        completions = [...elementCompletions, ...completions]
      }

      if (typed) {
        completions = completions.filter(c =>
          c.label.toLowerCase().startsWith(typed)
        )
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Zag slot context
    if (context === 'zag-slot' && fullSource) {
      const parentZag = findParentZagComponent(fullSource, lineNumber)
      if (parentZag) {
        const slots = getZagSlotsForComponent(parentZag)
        let completions: Completion[] = slots.map(slot => ({
          label: `${parentZag}${slot}`,
          detail: `Slot of ${parentZag}`,
          type: 'component' as const,
          boost: 10,
        }))

        // Also add item keywords for the component
        const itemKeywords = getZagItemKeywords(parentZag)
        for (const keyword of itemKeywords) {
          completions.push({
            label: keyword,
            detail: `Item in ${parentZag}`,
            type: 'component',
            boost: 9,
          })
        }

        if (typed) {
          completions = completions.filter(c =>
            c.label.toLowerCase().startsWith(typed.toLowerCase())
          )
        }

        return { completions, from, to: cursorColumn, context }
      }
    }

    // Duration context (after transition property)
    if (context === 'duration') {
      let completions = DURATION_COMPLETIONS
      if (typed) {
        completions = completions.filter(c =>
          c.label.startsWith(typed)
        )
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Easing context (after transition duration)
    if (context === 'easing') {
      let completions = EASING_COMPLETIONS
      if (typed) {
        completions = completions.filter(c =>
          c.label.toLowerCase().startsWith(typed)
        )
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Value context
    if (context === 'value') {
      const propMatch = lineText.slice(0, from).match(/\b([\w-]+)\s*$/)
      if (propMatch) {
        const propName = propMatch[1].toLowerCase()
        let values = PROPERTY_VALUES[propName] || generatePropertyValueCompletions(propName)
        if (typed) {
          values = values.filter(v => v.label.toLowerCase().startsWith(typed))
        }
        if (values.length > 0) {
          return { completions: values, from, to: cursorColumn, context }
        }
      }
    }

    // Property context (includes keywords for explicit trigger)
    if (context === 'property' || explicit) {
      let completions = [...ALL_COMPLETIONS]

      // Add Zag slot completions if in a Zag component
      if (fullSource) {
        const parentZag = findParentZagComponent(fullSource, lineNumber)
        if (parentZag) {
          const slots = getZagSlotsForComponent(parentZag)
          const slotCompletions: Completion[] = slots.map(slot => ({
            label: `${parentZag}${slot}`,
            detail: `Slot of ${parentZag}`,
            type: 'component' as const,
            boost: 10,
          }))
          completions = [...slotCompletions, ...completions]
        }
      }

      if (typed) {
        completions = completions.filter(c =>
          c.label.toLowerCase().startsWith(typed) ||
          c.label.toLowerCase().includes(typed)
        )
        // Sort: prefix matches first
        completions.sort((a, b) => {
          const aStarts = a.label.toLowerCase().startsWith(typed)
          const bStarts = b.label.toLowerCase().startsWith(typed)
          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
          return a.label.localeCompare(b.label)
        })
      } else {
        // Priority properties first
        completions.sort((a, b) => {
          const aPriority = PRIORITY_PROPERTIES.has(a.label)
          const bPriority = PRIORITY_PROPERTIES.has(b.label)
          if (aPriority && !bPriority) return -1
          if (!aPriority && bPriority) return 1
          // Boost higher-boosted completions
          const aBoost = a.boost ?? 0
          const bBoost = b.boost ?? 0
          if (aBoost !== bBoost) return bBoost - aBoost
          return a.label.localeCompare(b.label)
        })
      }

      return { completions: completions.slice(0, 50), from, to: cursorColumn, context }
    }

    return { completions: [], from, to: cursorColumn, context: 'none' }
  }

  /**
   * Get completions for a specific property's values
   */
  getPropertyValues(propertyName: string): Completion[] {
    return PROPERTY_VALUES[propertyName.toLowerCase()] || generatePropertyValueCompletions(propertyName)
  }

  /**
   * Get all state names
   */
  getStateNames(): Completion[] {
    return STATE_NAMES
  }

  /**
   * Get all properties
   */
  getProperties(): Completion[] {
    return MIRROR_PROPERTIES
  }

  /**
   * Get all keywords
   */
  getKeywords(): Completion[] {
    return MIRROR_KEYWORDS
  }

  /**
   * Get all completions
   */
  getAllCompletions(): Completion[] {
    return ALL_COMPLETIONS
  }

  /**
   * Get action completions (for after events)
   */
  getActionCompletions(): Completion[] {
    return ACTION_COMPLETIONS
  }

  /**
   * Get target completions (for after actions)
   */
  getTargetCompletions(source?: string): Completion[] {
    const completions = [...TARGET_KEYWORDS]
    if (source) {
      const elementNames = extractElementNames(source)
      const elementCompletions: Completion[] = elementNames.map(name => ({
        label: name,
        detail: 'element',
        type: 'component' as const
      }))
      return [...elementCompletions, ...completions]
    }
    return completions
  }

  /**
   * Get duration completions (for transitions)
   */
  getDurationCompletions(): Completion[] {
    return DURATION_COMPLETIONS
  }

  /**
   * Get easing completions (for transitions)
   */
  getEasingCompletions(): Completion[] {
    return EASING_COMPLETIONS
  }

  /**
   * Get Zag slot completions for a specific component
   */
  getZagSlotCompletions(componentName: string): Completion[] {
    const slots = getZagSlotsForComponent(componentName)
    return slots.map(slot => ({
      label: `${componentName}${slot}`,
      detail: `Slot of ${componentName}`,
      type: 'component' as const,
    }))
  }

  /**
   * Get Zag prop completions for a specific component
   */
  getZagPropCompletions(componentName: string): Completion[] {
    const props = getZagPropsForComponent(componentName)
    return props.map(prop => ({
      label: prop,
      detail: `${componentName} prop`,
      type: 'property' as const,
    }))
  }

  /**
   * Get all Zag components
   */
  getZagComponents(): Completion[] {
    return SCHEMA_COMPLETIONS.zagComponents
  }
}

export function createAutocompleteEngine(): AutocompleteEngine {
  return new AutocompleteEngine()
}

let globalEngine: AutocompleteEngine | null = null

export function getAutocompleteEngine(): AutocompleteEngine {
  if (!globalEngine) globalEngine = createAutocompleteEngine()
  return globalEngine
}

// Re-export CodeMirror integration
export { mirrorCompletions, createSlotCompletions } from './codemirror'
