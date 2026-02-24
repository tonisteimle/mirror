/**
 * DSL Schema - Compatibility Layer
 *
 * @deprecated This file is a compatibility layer. New code should import
 * directly from './schema' or '../dsl/properties'.
 *
 * This file re-exports validation functions from the generated schemas
 * to maintain backwards compatibility with existing imports.
 */

// Re-export from generated property schema
export {
  VALID_PROPERTIES,
  BOOLEAN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
  DIRECTIONAL_PROPERTIES,
  VALID_DIRECTIONS,
  CORNER_DIRECTIONS,
  BORDER_STYLES,
  PROPERTY_KEYWORD_VALUES,
  VALUE_CONSTRAINTS,
  isValidProperty,
  getPropertyType,
  isDirectionalProperty,
  isValidDirection,
  isValidCornerDirection,
  isValidOpacity,
} from './schema/property-schema.generated'

// Re-export from generated event schema
export {
  VALID_EVENTS,
  KEY_MODIFIERS,
  TIMING_MODIFIERS,
  VALID_ACTIONS,
  BEHAVIOR_TARGETS,
  VALID_ANIMATIONS,
  POSITION_KEYWORDS,
  SYSTEM_STATES,
  BEHAVIOR_STATES,
  isValidEvent,
  isValidKeyModifier,
  isValidAction,
  isValidAnimation,
  isValidPosition,
  isValidTarget,
  isSystemState,
  isBehaviorState,
} from './schema/event-schema.generated'

// Import for building DSL_SCHEMA compatibility object
import {
  VALID_PROPERTIES,
  BOOLEAN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
  DIRECTIONAL_PROPERTIES,
  VALID_DIRECTIONS,
  CORNER_DIRECTIONS,
  BORDER_STYLES,
  VALUE_CONSTRAINTS,
} from './schema/property-schema.generated'

import {
  VALID_EVENTS,
  KEY_MODIFIERS,
  TIMING_MODIFIERS,
  VALID_ACTIONS,
  BEHAVIOR_TARGETS,
  VALID_ANIMATIONS,
  POSITION_KEYWORDS,
  SYSTEM_STATES,
} from './schema/event-schema.generated'

// Import categorized properties from source of truth
import {
  LAYOUT_PROPERTIES,
  ALIGNMENT_PROPERTIES,
  SIZING_PROPERTIES,
  SPACING_PROPERTIES,
  COLORS_PROPERTIES,
  BORDER_PROPERTIES,
  TYPOGRAPHY_PROPERTIES,
  VISUAL_PROPERTIES,
  SCROLL_PROPERTIES,
  HOVER_PROPERTIES,
  ICON_PROPERTIES,
  FORM_PROPERTIES,
  SEGMENT_PROPERTIES,
  IMAGE_PROPERTIES,
  LINK_PROPERTIES,
  DATA_PROPERTIES,
  VISIBILITY_ACTIONS,
  STATE_ACTIONS,
  SELECTION_ACTIONS,
  NAVIGATION_ACTIONS,
  FORM_ACTIONS,
  DIRECTION_COMBOS,
  SEGMENT_EVENTS,
  DSL_KEYWORDS,
  PRIMITIVES,
} from '../dsl/properties'

// ============================================
// Schema Types (backwards compatibility)
// ============================================

export interface DSLSchema {
  properties: PropertySchema
  directions: Set<string>
  directionCombos: Set<string>
  events: Set<string>
  segmentEvents: Set<string>
  keyModifiers: Set<string>
  timingModifiers: Set<string>
  actions: ActionSchema
  targets: Set<string>
  animations: Set<string>
  positions: Set<string>
  keywords: Set<string>
  primitives: Set<string>
  valueConstraints: typeof VALUE_CONSTRAINTS
  borderStyles: Set<string>
}

export interface PropertySchema {
  layout: Set<string>
  alignment: Set<string>
  sizing: Set<string>
  spacing: Set<string>
  colors: Set<string>
  border: Set<string>
  typography: Set<string>
  visual: Set<string>
  scroll: Set<string>
  hover: Set<string>
  icon: Set<string>
  form: Set<string>
  segment: Set<string>
  image: Set<string>
  link: Set<string>
  data: Set<string>
}

export interface ActionSchema {
  visibility: Set<string>
  state: Set<string>
  selection: Set<string>
  navigation: Set<string>
  form: Set<string>
}

// ============================================
// Legacy DSL_SCHEMA Object
// ============================================

/**
 * @deprecated Use individual schema imports instead
 * Now uses imports from dsl/properties.ts (Source of Truth)
 */
export const DSL_SCHEMA: DSLSchema = {
  properties: {
    layout: LAYOUT_PROPERTIES,
    alignment: ALIGNMENT_PROPERTIES,
    sizing: SIZING_PROPERTIES,
    spacing: SPACING_PROPERTIES,
    colors: COLORS_PROPERTIES,
    border: BORDER_PROPERTIES,
    typography: TYPOGRAPHY_PROPERTIES,
    visual: VISUAL_PROPERTIES,
    scroll: SCROLL_PROPERTIES,
    hover: HOVER_PROPERTIES,
    form: FORM_PROPERTIES,
    segment: SEGMENT_PROPERTIES,
    image: IMAGE_PROPERTIES,
    link: LINK_PROPERTIES,
    data: DATA_PROPERTIES,
    icon: ICON_PROPERTIES,
  },
  directions: VALID_DIRECTIONS,
  directionCombos: DIRECTION_COMBOS,
  events: VALID_EVENTS,
  segmentEvents: SEGMENT_EVENTS,
  keyModifiers: KEY_MODIFIERS,
  timingModifiers: TIMING_MODIFIERS,
  actions: {
    visibility: VISIBILITY_ACTIONS,
    state: STATE_ACTIONS,
    selection: SELECTION_ACTIONS,
    navigation: NAVIGATION_ACTIONS,
    form: FORM_ACTIONS,
  },
  targets: BEHAVIOR_TARGETS,
  animations: VALID_ANIMATIONS,
  positions: POSITION_KEYWORDS,
  keywords: DSL_KEYWORDS,
  primitives: PRIMITIVES,
  borderStyles: BORDER_STYLES,
  valueConstraints: VALUE_CONSTRAINTS,
}

// ============================================
// Helper Functions (backwards compatibility)
// ============================================

/**
 * Get all valid properties as a flat set
 * @deprecated Use VALID_PROPERTIES directly
 */
export function getAllProperties(): Set<string> {
  return VALID_PROPERTIES
}

/**
 * Get all valid events
 * @deprecated Use VALID_EVENTS directly
 */
export function getAllEvents(): Set<string> {
  const allEvents = new Set<string>()
  VALID_EVENTS.forEach(e => allEvents.add(e))
  allEvents.add('onfill')
  allEvents.add('oncomplete')
  allEvents.add('onempty')
  return allEvents
}

/**
 * Get all valid actions as a flat set
 * @deprecated Use VALID_ACTIONS directly
 */
export function getAllActions(): Set<string> {
  return VALID_ACTIONS
}

/**
 * Get property category
 */
export function getPropertyCategory(name: string): string | null {
  for (const [category, props] of Object.entries(DSL_SCHEMA.properties)) {
    if (props.has(name)) {
      return category
    }
  }
  return null
}

/**
 * Get action category
 */
export function getActionCategory(name: string): string | null {
  for (const [category, actions] of Object.entries(DSL_SCHEMA.actions)) {
    if (actions.has(name)) {
      return category
    }
  }
  return null
}

/**
 * Check if a keyword is valid
 */
export function isValidKeyword(name: string): boolean {
  return DSL_SCHEMA.keywords.has(name)
}

/**
 * Check if a primitive is valid
 */
export function isValidPrimitive(name: string): boolean {
  return DSL_SCHEMA.primitives.has(name)
}

/**
 * Simple code validation - validates lines for common errors
 * @deprecated Use the unified validation pipeline instead
 */
export function validateCode(code: string): { errors: Array<{ line: number; message: string; category: string }> } {
  const errors: Array<{ line: number; message: string; category: string }> = []
  const lines = code.split('\n')

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) return

    // Check for px suffix
    if (/\b\d+px\b/.test(trimmed)) {
      errors.push({
        line: index + 1,
        message: 'Remove "px" suffix - numbers are already in pixels',
        category: 'PX_SUFFIX'
      })
    }

    // Check for colons after properties
    if (/\b(pad|margin|border|radius|width|height|gap)\s*:/.test(trimmed)) {
      errors.push({
        line: index + 1,
        message: 'Remove colon after property - use space instead',
        category: 'COLON_AFTER_PROPERTY'
      })
    }
  })

  return { errors }
}
