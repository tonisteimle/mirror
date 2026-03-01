/**
 * @module dsl/schema/types
 * @description Type definitions for Mirror DSL schema
 */

// =============================================================================
// PROPERTY TYPES
// =============================================================================

export type PropertyCategory =
  | 'layout'
  | 'alignment'
  | 'sizing'
  | 'spacing'
  | 'color'
  | 'border'
  | 'typography'
  | 'icon'
  | 'visual'
  | 'scroll'
  | 'hover'
  | 'form'
  | 'image'
  | 'link'
  | 'data'

export type ValueType =
  | 'boolean'     // Standalone property (e.g., horizontal, wrap)
  | 'number'      // Numeric value (e.g., padding 12)
  | 'color'       // Color value (e.g., #333, $token)
  | 'string'      // String value (e.g., font "Inter")
  | 'enum'        // One of predefined values (e.g., cursor pointer)
  | 'compound'    // Multiple components (e.g., border 1 dashed #333)
  | 'keyword'     // Keyword value (e.g., width full)
  | 'mixed'       // Can accept multiple types

export type AcceptedValue =
  | 'number'
  | 'percentage'
  | 'token'
  | 'color-hex'
  | 'color-name'
  | 'keyword'

export interface DirectionSupport {
  supported: boolean
  forms: string[]          // ['left', 'right', 'top', 'bottom']
  shortForms: string[]     // ['l', 'r', 'u', 'd']
  combos: string[]         // ['left-right', 'top-bottom']
  shortCombos: string[]    // ['l-r', 'u-d', 'lr', 'ud']
}

export interface CornerSupport {
  supported: boolean
  forms: string[]          // ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  shortForms: string[]     // ['tl', 'tr', 'bl', 'br']
  edges: string[]          // ['t', 'b', 'l', 'r'] - edge shortcuts
}

export interface CssShorthand {
  minValues: number
  maxValues: number
  expansion: 'padding' | 'radius'  // Which expansion pattern
}

export interface CompoundComponent {
  name: string
  type: 'number' | 'color' | 'enum' | 'string'
  required?: boolean
  values?: string[]        // For enum type
  default?: string | number
}

export interface CompoundDefinition {
  components: CompoundComponent[]
  order: 'any' | 'strict'  // Can components appear in any order?
}

export interface PropertyDefinition {
  // Identification
  name: string                      // Long form = canonical (e.g., 'padding')
  shortForms: string[]              // Short aliases (e.g., ['pad', 'p'])
  category: PropertyCategory

  // Value Type
  valueType: ValueType
  accepts?: AcceptedValue[]
  enumValues?: string[]             // For enum type
  range?: { min?: number; max?: number }
  keywords?: string[]               // Valid keyword values (e.g., 'full', 'hug')

  // Direction Support (padding, margin, border)
  directions?: DirectionSupport

  // Corner Support (radius)
  corners?: CornerSupport

  // CSS Shorthand (1-4 values)
  cssShorthand?: CssShorthand

  // Compound Property (border)
  compound?: CompoundDefinition

  // Documentation
  description: string
  examples: string[]

  // Autocomplete
  autocomplete?: {
    syntax: string
    keywords: string[]              // German + English + synonyms for search
    valuePicker?: 'color' | 'spacing' | 'font' | 'icon' | 'shadow' | 'weight' | 'value' | 'none'
  }
}

// =============================================================================
// EVENT, ACTION, STATE, ANIMATION, KEYWORD TYPES
// =============================================================================

export interface EventDefinition {
  name: string
  description: string
  keyModifiers?: string[]           // For onkeydown/onkeyup: ['escape', 'enter', ...]
  supportsTiming?: boolean          // Can use debounce/delay
  examples: string[]
}

export interface ActionDefinition {
  name: string
  description: string
  validTargets?: string[]           // ['self', 'next', 'prev', ...]
  supportsAnimation?: boolean
  supportsPosition?: boolean
  syntax: string                    // e.g., "open Target [position] [animation]"
  examples: string[]
}

export interface StateDefinition {
  name: string
  type: 'system' | 'behavior'
  description: string
  triggeredBy?: string              // Which action triggers this state
  cssMapping?: string               // CSS pseudo-class (for system states)
}

export interface AnimationDefinition {
  name: string
  type: 'transition' | 'continuous'
  description: string
  defaultDuration?: number
  examples: string[]
}

export interface KeywordDefinition {
  name: string
  category: 'control' | 'timing' | 'target' | 'position' | 'syntax'
  description: string
}

// =============================================================================
// COMPONENT TYPES
// =============================================================================

export interface ComponentDefinition {
  name: string
  aliases: string[]
  // Welche Property-Kategorien sind erlaubt?
  allowedCategories: PropertyCategory[]
  // Zusätzlich explizit erlaubte Properties (auch wenn Kategorie nicht erlaubt)
  allowedProperties?: string[]
  // Verbotene Properties mit Korrekturvorschlag
  forbiddenProperties?: Record<string, string>
  // Pflicht-Properties?
  requiredProperties?: string[]
  // Akzeptiert Text-Content?
  acceptsTextContent: boolean
  // Akzeptiert Kinder?
  acceptsChildren: boolean
  // Beschreibung für Dokumentation
  description: string
}

// =============================================================================
// CORE COMPONENT TYPES
// =============================================================================

export type CoreComponentCategory = 'navigation' | 'form' | 'button' | 'data' | 'feedback'

export interface SlotDefinition {
  name: string
  description: string
  type: 'Icon' | 'Text' | 'Box' | 'Input' | 'custom'
  defaultProperties?: Record<string, unknown>
}

export interface CoreStateDefinition {
  name: string
  description: string
  properties?: Record<string, unknown>
  childOverrides?: Array<{ slot: string; properties: Record<string, unknown> }>
}

export interface CoreComponentDefinition {
  name: string
  category: CoreComponentCategory
  description: string

  // Default Properties
  properties: Record<string, unknown>

  // Slots (named children)
  slots: SlotDefinition[]

  // States (hover, active, expanded, etc.)
  states: CoreStateDefinition[]

  // Event Handlers
  events?: Array<{
    event: string
    target?: string
    actions: string[]
  }>

  // Animations
  showAnimation?: string
  hideAnimation?: string

  // Documentation
  usage: string[]
  examples: string[]

  // Tokens this component uses
  tokens?: string[]
}

// =============================================================================
// DIRECTION & CORNER CONSTANTS
// =============================================================================

export const STANDARD_DIRECTIONS: DirectionSupport = {
  supported: true,
  forms: ['left', 'right', 'top', 'bottom'],
  shortForms: ['l', 'r', 'u', 'd'],
  combos: ['left-right', 'top-bottom'],
  shortCombos: ['l-r', 'u-d', 'lr', 'ud', 't-b', 'tb'],
}

export const STANDARD_CORNERS: CornerSupport = {
  supported: true,
  forms: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  shortForms: ['tl', 'tr', 'bl', 'br'],
  edges: ['t', 'b', 'l', 'r'],
}
