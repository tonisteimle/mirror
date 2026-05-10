/**
 * Validation Rules Generator
 *
 * Generates validation rules directly from the DSL schema.
 * This ensures the validator stays in sync with the schema automatically.
 */

import { DSL, SCHEMA, PropertyDef } from '../schema/dsl'
import { ValidationRules, ValueValidator, ValueValidationResult } from './types'

// ============================================================================
// Color Validation
// ============================================================================

/**
 * Hex color literal: `#RGB` / `#RGBA` / `#RRGGBB` / `#RRGGBBAA`.
 * Exported so the strict color-token validator
 * (`validator.ts:validateColorTokenValue`) doesn't keep its own copy.
 */
export const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

// Gradient keywords that can appear in color values
const GRADIENT_KEYWORDS = new Set(['grad', 'grad-ver'])

// Named colors (CSS basic + common)
const NAMED_COLORS = new Set([
  'transparent',
  'currentcolor',
  'inherit',
  'black',
  'white',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'cyan',
  'magenta',
  'gray',
  'grey',
  'pink',
  'brown',
  'navy',
  'teal',
  'lime',
  'aqua',
  'maroon',
  'olive',
  'silver',
  'fuchsia',
])

export function isValidColor(value: string): boolean {
  if (value.startsWith('$')) return true // Token reference
  if (HEX_COLOR_REGEX.test(value)) return true
  return NAMED_COLORS.has(value.toLowerCase())
}

/**
 * CSS length-with-unit values that the validator should accept where a
 * numeric value is expected. Examples: `60ch`, `1.5em`, `100%`, `10vh`.
 *
 * Mirror's primary unit is unitless pixels, but typography (`maxw 60ch`),
 * viewport-relative sizing (`h 100vh`), and percentage layouts (`w 50%`)
 * are first-class CSS patterns that designers use all the time. Rejecting
 * them produces noise that drives users to disable the validator entirely.
 *
 * The runtime CSS pipeline already passes these strings through unchanged
 * (see `compiler/ir/transformers/property-transformer.ts`).
 */
const CSS_LENGTH_REGEX =
  /^-?\d+(\.\d+)?(px|pt|pc|in|cm|mm|ch|em|rem|vh|vw|vmin|vmax|%|fr|deg|rad|turn|s|ms)$/i

/**
 * Generic CSS keywords that pass through unchanged for spacing, sizing,
 * and positional properties (centering pattern, intrinsic sizing).
 * These are universally understood in CSS and the runtime preserves them
 * (`property-transformer.ts:296` "preserve 'auto'").
 */
const CSS_GENERIC_KEYWORDS = new Set([
  'auto',
  'inherit',
  'initial',
  'unset',
  'revert',
  'fit-content',
  'min-content',
  'max-content',
])

/**
 * Properties for which CSS-length-units (`60ch`, `100vh`) and generic
 * CSS keywords (`auto`, `fit-content`) are semantically valid in Mirror.
 * Falsy = strict numeric only (e.g., `opacity 0.8`, never `opacity 50%`).
 *
 * The set is derived from the property category — every spacing/sizing
 * property is permissive, but `opacity`, `scale`, and animation timings
 * stay strict so out-of-range values still surface.
 */
function acceptsCSSLength(prop: PropertyDef): boolean {
  return (
    prop.category === 'spacing' ||
    prop.category === 'sizing' ||
    prop.category === 'typography' ||
    prop.category === 'border'
  )
}

/**
 * Detects CSS-length-with-unit (`60ch`, `1.5em`) — accepted on
 * spacing/sizing properties.
 */
export function isValidCSSLengthValue(val: string): boolean {
  return CSS_LENGTH_REGEX.test(val)
}

/**
 * Detects generic CSS pass-through keywords (`auto`, `fit-content`) —
 * accepted on spacing/sizing properties.
 */
export function isCSSGenericKeyword(val: string): boolean {
  return CSS_GENERIC_KEYWORDS.has(val.toLowerCase())
}

/**
 * Check if a value is valid in a color context (color property values).
 * This includes colors, gradient keywords, and rgba() syntax.
 */
export function isValidColorValue(value: string | number): boolean {
  // Numbers are valid (gradient angles like `grad 45 #a #b`).
  // Accept numeric strings too — the parser sometimes hands us "45".
  if (typeof value === 'number') return true
  if (/^-?\d+(\.\d+)?$/.test(value)) return true

  // Token references
  if (value.startsWith('$')) return true

  // Hex colors
  if (HEX_COLOR_REGEX.test(value)) return true

  // Named colors
  if (NAMED_COLORS.has(value.toLowerCase())) return true

  // Gradient keywords
  if (GRADIENT_KEYWORDS.has(value.toLowerCase())) return true

  // rgba() syntax (e.g., "rgba(255,0,0,0.5)")
  if (value.toLowerCase().startsWith('rgba(') && value.endsWith(')')) return true
  if (value.toLowerCase().startsWith('rgb(') && value.endsWith(')')) return true

  return false
}

// ============================================================================
// Rule Generators
// ============================================================================

/**
 * Build map of primitive aliases to canonical names.
 */
function buildPrimitiveAliasMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [name, def] of Object.entries(DSL.primitives)) {
    map.set(name.toLowerCase(), name)
    def.aliases?.forEach(alias => map.set(alias.toLowerCase(), name))
  }
  return map
}

/**
 * Build map of property names/aliases to definitions.
 */
function buildPropertyMap(): Map<string, PropertyDef> {
  const map = new Map<string, PropertyDef>()

  for (const prop of Object.values(SCHEMA)) {
    map.set(prop.name, prop)
    for (const alias of prop.aliases) {
      map.set(alias, prop)
    }
  }

  return map
}

/**
 * Build map of action names to valid targets.
 */
function buildActionTargetMap(): Map<string, string[]> {
  const map = new Map<string, string[]>()

  for (const [name, def] of Object.entries(DSL.actions)) {
    if (def.targets) {
      map.set(name, def.targets)
    }
  }

  return map
}

/**
 * Create a value validator for a specific property.
 */
function createValidatorForProperty(prop: PropertyDef): ValueValidator {
  return (values: (string | number | boolean)[]): ValueValidationResult => {
    const errors: string[] = []

    // Standalone boolean - no value expected
    if (prop.keywords?._standalone) {
      if (values.length === 0) {
        return { valid: true, errors: [] }
      }
      // Having values is also OK (could be directional or combined)
    }

    // Empty values for non-standalone
    if (values.length === 0 && !prop.keywords?._standalone) {
      errors.push(`Property "${prop.name}" requires a value`)
      return { valid: false, errors }
    }

    for (let i = 0; i < values.length; i++) {
      const val = values[i]

      // Token references are always valid (checked separately)
      if (typeof val === 'string' && val.startsWith('$')) {
        continue
      }

      // Check directional modifier
      if (prop.directional && i === 0 && typeof val === 'string') {
        if (prop.directional.directions.includes(val)) {
          continue // Valid direction, check next values
        }
      }

      // Check keyword values
      if (prop.keywords && typeof val === 'string') {
        const validKeywords = Object.keys(prop.keywords).filter(k => k !== '_standalone')
        if (validKeywords.length > 0) {
          // Only error if it looks like it should be a keyword (not a number, not a color)
          if (!val.startsWith('#') && isNaN(Number(val))) {
            if (!validKeywords.includes(val) && !prop.directional?.directions.includes(val)) {
              // Check if it's the only allowed input type
              if (!prop.numeric && !prop.color) {
                errors.push(
                  `Invalid value "${val}" for "${prop.name}". ` +
                    `Valid keywords: ${validKeywords.join(', ')}`
                )
              }
            }
          }
        }
      }

      // Check numeric values
      if (prop.numeric) {
        if (typeof val === 'number') {
          // Valid number
        } else if (typeof val === 'string') {
          const num = Number(val)
          if (!isNaN(num)) {
            // String that's a valid number
          } else if (!val.startsWith('#') && !val.startsWith('$')) {
            // Not a number, color, or token - might be a keyword or CSS value
            const validKeywords = Object.keys(prop.keywords || {}).filter(k => k !== '_standalone')
            const isKeyword = validKeywords.includes(val)
            const isDirection = prop.directional?.directions.includes(val) ?? false
            const isCSSLength = acceptsCSSLength(prop) && isValidCSSLengthValue(val)
            const isCSSKeyword = acceptsCSSLength(prop) && isCSSGenericKeyword(val)
            if (!isKeyword && !isDirection && !isCSSLength && !isCSSKeyword) {
              errors.push(`Invalid numeric value "${val}" for "${prop.name}"`)
            }
          }
        }
      }

      // Check color values
      if (prop.color && typeof val !== 'boolean') {
        if (!isValidColorValue(val)) {
          if (typeof val === 'string' && val.startsWith('#')) {
            // Invalid hex format
            errors.push(
              `Invalid hex color "${val}" for "${prop.name}". ` +
                `Use #RGB, #RGBA, #RRGGBB, or #RRGGBBAA format`
            )
          } else {
            // Invalid color value (not a recognized color, gradient, or function)
            errors.push(
              `Invalid color "${val}" for "${prop.name}". ` +
                `Use hex (#RGB, #RRGGBB), named colors (white, black), ` +
                `gradients (grad #a #b), or rgba(r,g,b,a)`
            )
          }
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }
}

/**
 * Build value validators for all properties.
 */
function buildValueValidators(): Map<string, ValueValidator> {
  const validators = new Map<string, ValueValidator>()

  for (const prop of Object.values(SCHEMA)) {
    validators.set(prop.name, createValidatorForProperty(prop))
    // Also register under aliases
    for (const alias of prop.aliases) {
      validators.set(alias, createValidatorForProperty(prop))
    }
  }

  return validators
}

// ============================================================================
// Main Generator
// ============================================================================

let cachedRules: ValidationRules | null = null

/**
 * Generate all validation rules from the schema.
 * Results are cached for performance.
 */
export function generateValidationRules(): ValidationRules {
  if (cachedRules) {
    return cachedRules
  }

  cachedRules = {
    // Primitives
    validPrimitives: new Set(Object.keys(DSL.primitives).map(p => p.toLowerCase())),
    primitiveAliases: buildPrimitiveAliasMap(),

    // Properties
    validProperties: buildPropertyMap(),
    propertyValueValidators: buildValueValidators(),

    // Events
    validEvents: new Set(Object.keys(DSL.events)),
    eventsWithKeys: new Set(
      Object.entries(DSL.events)
        .filter(([_, def]) => def.acceptsKey)
        .map(([name]) => name)
    ),

    // Keys
    validKeys: new Set(DSL.keys.map(k => k.toLowerCase())),

    // Actions
    validActions: new Set(Object.keys(DSL.actions)),
    actionTargets: buildActionTargetMap(),

    // States — built-in (hover/focus/...) plus size-states that respond
    // to CSS container-queries (compact/regular/wide). Custom user-
    // defined size states are handled at validation time, not here.
    validStates: new Set([...Object.keys(DSL.states), ...Object.keys(DSL.sizeStates)]),
    systemStates: new Set(
      Object.entries(DSL.states)
        .filter(([_, def]) => def.system)
        .map(([name]) => name)
    ),
  }

  return cachedRules
}

/**
 * Clear the cached rules (useful for testing).
 */
export function clearRulesCache(): void {
  cachedRules = null
}
