/**
 * IR Helpers - Schema-based CSS generation
 *
 * Provides CSS output generation based on the DSL schema.
 * Used by the IR transformer for property-to-CSS conversion.
 */

import { SCHEMA, findProperty, PropertyDef, CSSOutput, DSL } from './dsl'

/**
 * Result of converting a property to CSS
 */
export interface CSSResult {
  styles: Array<{ property: string; value: string }>
  handled: boolean
}

/**
 * Get the canonical CSS property name for a DSL property.
 * Returns the CSS property name or undefined if not found.
 */
export function getCSSPropertyName(dslProperty: string): string | undefined {
  const prop = findProperty(dslProperty)
  if (!prop) return undefined

  // For properties with numeric values, extract the CSS property
  if (prop.numeric) {
    const cssOutput = prop.numeric.css(0)
    if (cssOutput.length > 0) {
      return cssOutput[0].property
    }
  }

  // For color properties
  if (prop.color) {
    const cssOutput = prop.color.css('#000')
    if (cssOutput.length > 0) {
      return cssOutput[0].property
    }
  }

  return undefined
}

/**
 * Non-CSS properties that are valid but don't produce CSS output.
 * These are HTML attributes or special Mirror properties.
 */
export const NON_CSS_PROPERTIES = new Set([
  // HTML attributes
  'content',
  'data',
  'src',
  'alt',
  'placeholder',
  'type',
  'name',
  'value',
  'href',
  'target',
  'for',
  'aria-label',
  'role',
  'tabindex',
  'icon',
  // Animation properties
  'animation',
  'transition',
  'delay',
  'easing',
  'duration',
])

/**
 * Alignment property names for layout processing.
 * These properties affect flex alignment (justify-content, align-items).
 * Includes 9-zone shortcuts which also set direction.
 */
export const ALIGNMENT_PROPERTIES = new Set([
  'left',
  'right',
  'top',
  'bottom',
  'hor-center',
  'ver-center',
  'center',
  'cen',
  'spread',
  // 9-zone shortcuts (set both alignment AND direction)
  'top-left',
  'tl',
  'top-center',
  'tc',
  'top-right',
  'tr',
  'center-left',
  'cl',
  'center-right',
  'cr',
  'bottom-left',
  'bl',
  'bottom-center',
  'bc',
  'bottom-right',
  'br',
])

/**
 * Direction property names for layout processing.
 * These properties set flex-direction.
 */
export const DIRECTION_PROPERTIES = new Set(['horizontal', 'hor', 'vertical', 'ver'])

/**
 * Property name mapping from DSL to CSS.
 * Generated from schema with overrides for special cases.
 */
export const PROPERTY_TO_CSS: Record<string, string> = {
  // From schema - sizing
  width: 'width',
  w: 'width',
  height: 'height',
  h: 'height',
  'min-width': 'min-width',
  minw: 'min-width',
  'max-width': 'max-width',
  maxw: 'max-width',
  'min-height': 'min-height',
  minh: 'min-height',
  'max-height': 'max-height',
  maxh: 'max-height',

  // Spacing
  padding: 'padding',
  pad: 'padding',
  p: 'padding',
  margin: 'margin',
  mar: 'margin',
  m: 'margin',
  gap: 'gap',
  g: 'gap',
  'gap-x': 'column-gap',
  gx: 'column-gap',
  'gap-y': 'row-gap',
  gy: 'row-gap',
  'row-height': 'grid-auto-rows',
  rh: 'grid-auto-rows',

  // Colors
  background: 'background',
  bg: 'background',
  color: 'color',
  col: 'color',
  c: 'color',
  'border-color': 'border-color',
  boc: 'border-color',

  // Border
  border: 'border',
  bor: 'border',
  radius: 'border-radius',
  rad: 'border-radius',

  // Typography
  'font-size': 'font-size',
  fs: 'font-size',
  weight: 'font-weight',
  line: 'line-height',
  font: 'font-family',
  'text-align': 'text-align',

  // Effects
  opacity: 'opacity',
  o: 'opacity',
  opa: 'opacity',
  shadow: 'box-shadow',
  cursor: 'cursor',
  z: 'z-index',

  // Scroll
  scroll: 'overflow-y',
  'scroll-ver': 'overflow-y',
  'scroll-hor': 'overflow-x',
  'scroll-both': 'overflow',
  clip: 'overflow',

  // Animation
  animation: 'animation',
  anim: 'animation',
}

/**
 * Check if a property has a keyword value in the schema.
 */
export function hasKeywordValue(propName: string, value: string): boolean {
  const prop = findProperty(propName)
  if (!prop?.keywords) return false
  return value in prop.keywords
}

/**
 * Get CSS output for a keyword value.
 * Returns the CSS styles or empty array if not a valid keyword.
 */
export function getKeywordCSS(propName: string, value: string): CSSOutput[] {
  const prop = findProperty(propName)
  if (!prop?.keywords) return []

  const keyword = prop.keywords[value]
  if (!keyword) return []

  return keyword.css
}

/**
 * Get CSS output for a numeric value.
 * Returns the CSS styles or empty array if not numeric property.
 */
export function getNumericCSS(propName: string, value: number): CSSOutput[] {
  const prop = findProperty(propName)
  if (!prop?.numeric) return []

  return prop.numeric.css(value)
}

/**
 * Get CSS output for a color value.
 * Returns the CSS styles or empty array if not color property.
 */
export function getColorCSS(propName: string, value: string): CSSOutput[] {
  const prop = findProperty(propName)
  if (!prop?.color) return []

  return prop.color.css(value)
}

/**
 * Get CSS output for a standalone (boolean) property.
 * Returns the CSS styles or empty array if not standalone.
 */
export function getStandaloneCSS(propName: string): CSSOutput[] {
  const prop = findProperty(propName)
  if (!prop?.keywords?._standalone) return []

  return prop.keywords._standalone.css
}

/**
 * Check if a property is a standalone (boolean) property.
 */
export function isStandaloneProperty(propName: string): boolean {
  const prop = findProperty(propName)
  return !!prop?.keywords?._standalone
}

/**
 * Try to convert a property value to CSS using the schema.
 *
 * @returns CSSResult with handled=true if schema handled it, false otherwise
 */
export function schemaPropertyToCSS(
  propName: string,
  values: (string | number | boolean)[]
): CSSResult {
  const prop = findProperty(propName)

  // Not in schema
  if (!prop) {
    return { styles: [], handled: false }
  }

  // Boolean/standalone property
  if (values.length === 0 || (values.length === 1 && values[0] === true)) {
    if (prop.keywords?._standalone) {
      return {
        styles: prop.keywords._standalone.css.map(c => ({
          property: c.property,
          value: c.value,
        })),
        handled: true,
      }
    }
  }

  const value = values[0]

  // Keyword value
  if (typeof value === 'string' && prop.keywords && prop.keywords[value]) {
    return {
      styles: prop.keywords[value].css.map(c => ({
        property: c.property,
        value: c.value,
      })),
      handled: true,
    }
  }

  // Numeric value
  if (typeof value === 'number' && prop.numeric) {
    return {
      styles: prop.numeric.css(value).map(c => ({
        property: c.property,
        value: c.value,
      })),
      handled: true,
    }
  }

  // Numeric string (e.g., "16" or "16px" or "50%")
  if (typeof value === 'string' && prop.numeric) {
    const numMatch = value.match(/^(-?\d+(?:\.\d+)?)(px|%)?$/)
    if (numMatch) {
      const num = parseFloat(numMatch[1])
      const explicitUnit = numMatch[2]
      const cssOutput = prop.numeric.css(num)
      return {
        styles: cssOutput.map(c => {
          // Schema's css() function hard-codes the unit (usually 'px'). When the
          // user wrote an explicit unit (e.g. `w 50%` → unit '%'), preserve it
          // instead of overriding to px. We swap any trailing 'px' on the
          // schema-emitted value with the user's unit.
          if (explicitUnit && explicitUnit !== 'px' && typeof c.value === 'string') {
            const replaced = c.value.replace(/(\d+(?:\.\d+)?)px\b/g, `$1${explicitUnit}`)
            return { property: c.property, value: replaced }
          }
          return { property: c.property, value: c.value }
        }),
        handled: true,
      }
    }
  }

  // Color value
  if (typeof value === 'string' && prop.color) {
    if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
      return {
        styles: prop.color.css(value).map(c => ({
          property: c.property,
          value: c.value,
        })),
        handled: true,
      }
    }
  }

  // Not handled by schema (special cases)
  return { styles: [], handled: false }
}

/**
 * Convert a simple property to CSS using schema or direct mapping.
 * Handles: numeric values, color values, keyword values.
 * Does NOT handle: directional properties, multi-value properties, special cases.
 */
export function simplePropertyToCSS(propName: string, value: string | number): CSSResult {
  // Try schema first
  const schemaResult = schemaPropertyToCSS(propName, [value])
  if (schemaResult.handled) {
    return schemaResult
  }

  // Direct CSS property mapping for properties not fully in schema
  const cssProperty = PROPERTY_TO_CSS[propName]
  if (!cssProperty) {
    return { styles: [], handled: false }
  }

  // Format value (add px for numeric properties, but not unitless ones like z-index, opacity)
  let cssValue = String(value)
  if (typeof value === 'number' || /^\d+$/.test(cssValue)) {
    const needsPx = new Set([
      'padding',
      'pad',
      'p',
      'margin',
      'm',
      'gap',
      'g',
      'width',
      'w',
      'height',
      'h',
      'min-width',
      'minw',
      'max-width',
      'maxw',
      'min-height',
      'minh',
      'max-height',
      'maxh',
      'font-size',
      'fs',
      'radius',
      'rad',
      'border-radius',
      'border',
      'bor',
    ])
    // z, opacity, weight, line-height etc. don't need px
    if (needsPx.has(propName)) {
      cssValue = `${value}px`
    }
  }

  return {
    styles: [{ property: cssProperty, value: cssValue }],
    handled: true,
  }
}

// ============================================================================
// Hover Properties
// ============================================================================

/**
 * Properties that support hover- prefix variants.
 * Maps base property name to CSS property.
 */
export const HOVER_PROPERTIES: Record<string, string> = {
  bg: 'background',
  background: 'background',
  col: 'color',
  color: 'color',
  c: 'color',
  opacity: 'opacity',
  opa: 'opacity',
  o: 'opacity',
  scale: 'transform', // special handling needed
  bor: 'border',
  border: 'border',
  boc: 'border-color',
  'border-color': 'border-color',
  rad: 'border-radius',
  radius: 'border-radius',
}

/**
 * System states that support a `<state>-<prop>` shorthand syntax.
 * E.g. hover-bg, focus-bor, active-col, disabled-opa.
 */
const STATE_PROPERTY_PREFIXES = ['hover', 'focus', 'active', 'disabled'] as const

/**
 * Convert a state-prefixed property (hover-bg, focus-bor, …) to CSS.
 * Returns CSS styles with the matching state if handled.
 *
 * Renamed from `hoverPropertyToCSS` to a generic state-aware helper but kept
 * the export name for backwards compatibility.
 */
export function hoverPropertyToCSS(
  propName: string,
  value: string | number
): { styles: Array<{ property: string; value: string; state: string }>; handled: boolean } {
  // Detect any of the supported state prefixes
  let state: string | null = null
  let baseProp = ''
  for (const prefix of STATE_PROPERTY_PREFIXES) {
    if (propName.startsWith(`${prefix}-`)) {
      state = prefix
      baseProp = propName.slice(prefix.length + 1)
      break
    }
  }
  if (!state) {
    return { styles: [], handled: false }
  }

  const cssProp = HOVER_PROPERTIES[baseProp]
  if (!cssProp) {
    return { styles: [], handled: false }
  }

  let cssValue = String(value)

  // Special handling for scale
  if (baseProp === 'scale') {
    cssValue = `scale(${value})`
  }
  // Add px for numeric values on certain properties
  else if (['rad', 'radius', 'bor', 'border'].includes(baseProp)) {
    if (/^\d+$/.test(cssValue)) {
      cssValue = `${cssValue}px`
    }
  }

  return {
    styles: [{ property: cssProp, value: cssValue, state }],
    handled: true,
  }
}

// ============================================================================
// Directional Properties
// ============================================================================

/**
 * Direction mapping for spacing/border/radius properties.
 * Maps direction keywords to CSS direction suffixes.
 */
export const DIRECTION_MAP: Record<string, string[]> = {
  left: ['left'],
  right: ['right'],
  top: ['top'],
  bottom: ['bottom'],
  down: ['bottom'], // Alias
  l: ['left'],
  r: ['right'],
  t: ['top'],
  b: ['bottom'],
  x: ['left', 'right'], // Horizontal shortcut
  y: ['top', 'bottom'], // Vertical shortcut
  horizontal: ['left', 'right'],
  vertical: ['top', 'bottom'],
  hor: ['left', 'right'],
  ver: ['top', 'bottom'],
}

/**
 * Corner mapping for radius properties.
 */
export const CORNER_MAP: Record<string, string[]> = {
  tl: ['top-left'],
  tr: ['top-right'],
  bl: ['bottom-left'],
  br: ['bottom-right'],
  t: ['top-left', 'top-right'],
  b: ['bottom-left', 'bottom-right'],
  l: ['top-left', 'bottom-left'],
  r: ['top-right', 'bottom-right'],
}

/**
 * Border direction mapping.
 */
export const BORDER_DIRECTION_MAP: Record<string, string[]> = {
  t: ['top'],
  top: ['top'],
  b: ['bottom'],
  bottom: ['bottom'],
  down: ['bottom'],
  l: ['left'],
  left: ['left'],
  r: ['right'],
  right: ['right'],
  x: ['left', 'right'],
  y: ['top', 'bottom'],
  horizontal: ['left', 'right'],
  hor: ['left', 'right'],
  vertical: ['top', 'bottom'],
  ver: ['top', 'bottom'],
}

/**
 * Check if a value is a direction keyword.
 */
export function isDirection(value: string): boolean {
  return value in DIRECTION_MAP
}

/**
 * Check if a value is a corner keyword.
 */
export function isCorner(value: string): boolean {
  return value in CORNER_MAP
}

/**
 * Get direction suffixes for a direction keyword.
 */
export function getDirections(keyword: string): string[] {
  return DIRECTION_MAP[keyword] || []
}

/**
 * Get corner suffixes for a corner keyword.
 */
export function getCorners(keyword: string): string[] {
  return CORNER_MAP[keyword] || []
}

// ============================================================================
// Property Categories
// ============================================================================

/**
 * Get all properties that accept tokens.
 */
export function getTokenAcceptingProperties(): string[] {
  const result: string[] = []
  for (const prop of Object.values(SCHEMA)) {
    if (prop.token) {
      result.push(prop.name)
      result.push(...prop.aliases)
    }
  }
  return result
}

/**
 * Get all properties that accept colors.
 */
export function getColorAcceptingProperties(): string[] {
  const result: string[] = []
  for (const prop of Object.values(SCHEMA)) {
    if (prop.color) {
      result.push(prop.name)
      result.push(...prop.aliases)
    }
  }
  return result
}

// ============================================================================
// Property to Token Suffix Mapping
// ============================================================================

/**
 * Maps property names to their token suffixes.
 * Used for context-based token resolution.
 * e.g., 'bg' -> '.bg' means 'primary' with property 'bg' looks for 'primary.bg'
 */
export const PROPERTY_TO_TOKEN_SUFFIX: Record<string, string> = {
  // Background
  bg: '.bg',
  background: '.bg',
  // Color
  col: '.col',
  color: '.col',
  c: '.col',
  // Border color
  boc: '.boc',
  'border-color': '.boc',
  // Radius
  rad: '.rad',
  radius: '.rad',
  // Padding
  pad: '.pad',
  padding: '.pad',
  p: '.pad',
  // Margin
  mar: '.mar',
  margin: '.mar',
  m: '.mar',
  // Gap
  gap: '.gap',
  g: '.gap',
  // Width/Height
  w: '.w',
  width: '.w',
  h: '.h',
  height: '.h',
  // Font size
  fs: '.fs',
  'font-size': '.fs',
  // Icon
  ic: '.ic',
  'icon-color': '.ic',
  is: '.is',
  'icon-size': '.is',
}

// ============================================================================
// Event Mapping
// ============================================================================

/**
 * Map Mirror event name to DOM event name using schema.
 * Falls back to stripping 'on' prefix if not in schema.
 */
export function mapEventToDom(eventName: string): string {
  const event = DSL.events[eventName]
  if (event) {
    return event.dom
  }
  // Fallback: strip 'on' prefix
  return eventName.replace(/^on/, '')
}

// ============================================================================
// Primitive/Tag Mapping
// ============================================================================

/**
 * Get HTML tag for a primitive name using schema.
 * Handles case-insensitive lookup and aliases.
 * Falls back to 'div' for unknown primitives.
 */
export function getHtmlTag(primitiveName: string): string {
  const normalizedName = primitiveName.toLowerCase()

  // Check all primitives
  for (const [name, def] of Object.entries(DSL.primitives)) {
    // Check main name
    if (name.toLowerCase() === normalizedName) {
      return def.html
    }
    // Check aliases
    if (def.aliases) {
      for (const alias of def.aliases) {
        if (alias.toLowerCase() === normalizedName) {
          return def.html
        }
      }
    }
  }

  // Fallback to div
  return 'div'
}
