/**
 * Property Schema
 *
 * Schema definitions for property validation.
 * Built from the single source of truth in dsl/properties.ts
 */

import {
  PROPERTIES,
  BOOLEAN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
  DIRECTIONAL_PROPERTIES,
  DIRECTIONS,
  BORDER_STYLES,
  isDirectionOrCombo
} from '../../dsl/properties'

// ============================================
// Property Type Definitions
// ============================================

export type PropertyType = 'boolean' | 'number' | 'string' | 'color' | 'enum' | 'mixed'

export interface PropertySchema {
  type: PropertyType
  description?: string
  enumValues?: string[]
  minValue?: number
  maxValue?: number
  allowPercentage?: boolean
  allowFull?: boolean
  aliases?: string[]
}

// ============================================
// Property Schemas
// ============================================

/**
 * Get the schema for a property
 */
export function getPropertySchema(property: string): PropertySchema | undefined {
  // Check direct property match
  if (propertySchemas[property]) {
    return propertySchemas[property]
  }

  // Check for directional variant (pad_l, mar_r, bor_u, etc.)
  const match = property.match(/^(pad|mar|bor)_([lrud])$/)
  if (match) {
    const baseProp = match[1]
    if (propertySchemas[baseProp]) {
      return propertySchemas[baseProp]
    }
  }

  return undefined
}

/**
 * Check if a property name is valid
 */
export function isValidProperty(property: string): boolean {
  // Direct match
  if (PROPERTIES.has(property)) return true

  // Directional property variant (pad_l, mar_u, bor_d)
  const match = property.match(/^(pad|mar|bor)_([lrud])$/)
  if (match) return true

  return false
}

/**
 * Check if a value is valid for a boolean property
 */
export function isValidBooleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') return true
  if (value === 'true' || value === 'false') return true
  // Boolean properties can also be present without value (implicit true)
  return value === undefined || value === null
}

/**
 * Check if a value is a valid color
 */
export function isValidColor(value: unknown): boolean {
  if (typeof value !== 'string') return false

  // Token reference
  if (value.startsWith('$')) return true

  // Hex color (#RGB, #RRGGBB, #RRGGBBAA)
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value)) return true

  // rgb/rgba
  if (/^rgba?\s*\(/.test(value)) return true

  // hsl/hsla
  if (/^hsla?\s*\(/.test(value)) return true

  // Named colors (basic set)
  const namedColors = new Set([
    'transparent', 'white', 'black', 'red', 'green', 'blue', 'yellow',
    'cyan', 'magenta', 'orange', 'purple', 'pink', 'gray', 'grey',
    'inherit', 'currentColor'
  ])
  if (namedColors.has(value.toLowerCase())) return true

  return false
}

/**
 * Check if a value is a valid number
 */
export function isValidNumber(value: unknown, schema?: PropertySchema): boolean {
  // Token reference
  if (typeof value === 'string' && value.startsWith('$')) return true

  // Percentage
  if (typeof value === 'string' && value.endsWith('%')) {
    if (schema && !schema.allowPercentage) return false
    const num = parseFloat(value)
    return !isNaN(num)
  }

  // 'full' keyword
  if (value === 'full') {
    return schema?.allowFull === true
  }

  // Numeric value
  const num = typeof value === 'number' ? value : parseFloat(String(value))
  if (isNaN(num)) return false

  // Range check
  if (schema) {
    if (schema.minValue !== undefined && num < schema.minValue) return false
    if (schema.maxValue !== undefined && num > schema.maxValue) return false
  }

  return true
}

/**
 * Check if a direction value is valid
 */
export function isValidDirection(value: string): boolean {
  return isDirectionOrCombo(value)
}

// ============================================
// Schema Definitions
// ============================================

const propertySchemas: Record<string, PropertySchema> = {
  // Layout
  hor: { type: 'boolean', description: 'Horizontal flex direction' },
  ver: { type: 'boolean', description: 'Vertical flex direction' },
  gap: { type: 'number', minValue: 0, description: 'Gap between children' },
  'gap-col': { type: 'number', minValue: 0, description: 'Column gap' },
  'gap-row': { type: 'number', minValue: 0, description: 'Row gap' },
  between: { type: 'boolean', description: 'Space-between distribution' },
  wrap: { type: 'boolean', description: 'Allow wrapping' },
  grow: { type: 'boolean', description: 'Flex grow' },
  fill: { type: 'boolean', description: 'Fill available space' },
  cen: { type: 'boolean', description: 'Center on both axes' },
  grid: { type: 'mixed', description: 'CSS Grid layout' },
  rows: { type: 'number', minValue: 1, description: 'Grid rows' },
  stacked: { type: 'boolean', description: 'Stack children (z-layers)' },

  // Alignment
  'hor-l': { type: 'boolean', description: 'Align left' },
  'hor-cen': { type: 'boolean', description: 'Center horizontal' },
  'hor-r': { type: 'boolean', description: 'Align right' },
  'ver-t': { type: 'boolean', description: 'Align top' },
  'ver-cen': { type: 'boolean', description: 'Center vertical' },
  'ver-b': { type: 'boolean', description: 'Align bottom' },

  // Sizing
  w: { type: 'number', minValue: 0, allowPercentage: true, allowFull: true, description: 'Width' },
  h: { type: 'number', minValue: 0, allowPercentage: true, allowFull: true, description: 'Height' },
  full: { type: 'boolean', description: '100% width and height' },
  minw: { type: 'number', minValue: 0, allowPercentage: true, description: 'Minimum width' },
  maxw: { type: 'number', minValue: 0, allowPercentage: true, description: 'Maximum width' },
  minh: { type: 'number', minValue: 0, allowPercentage: true, description: 'Minimum height' },
  maxh: { type: 'number', minValue: 0, allowPercentage: true, description: 'Maximum height' },

  // Spacing
  pad: { type: 'number', minValue: 0, description: 'Padding' },
  padding: { type: 'number', minValue: 0, description: 'Padding', aliases: ['pad'] },
  mar: { type: 'number', minValue: 0, description: 'Margin' },
  margin: { type: 'number', minValue: 0, description: 'Margin', aliases: ['mar'] },

  // Colors
  col: { type: 'color', description: 'Text color' },
  color: { type: 'color', description: 'Text color', aliases: ['col'] },
  bg: { type: 'color', description: 'Background color' },
  boc: { type: 'color', description: 'Border color' },

  // Border
  rad: { type: 'number', minValue: 0, description: 'Border radius' },
  radius: { type: 'number', minValue: 0, description: 'Border radius', aliases: ['rad'] },
  bor: { type: 'mixed', description: 'Border' },
  border: { type: 'mixed', description: 'Border', aliases: ['bor'] },

  // Typography
  size: { type: 'number', minValue: 1, maxValue: 200, description: 'Font size' },
  weight: { type: 'number', minValue: 100, maxValue: 900, description: 'Font weight' },
  font: { type: 'string', description: 'Font family' },
  line: { type: 'number', minValue: 0, description: 'Line height' },
  align: {
    type: 'enum',
    enumValues: ['left', 'center', 'right', 'justify'],
    description: 'Text alignment'
  },
  italic: { type: 'boolean', description: 'Italic text' },
  underline: { type: 'boolean', description: 'Underlined text' },
  lowercase: { type: 'boolean', description: 'Lowercase text' },
  uppercase: { type: 'boolean', description: 'Uppercase text' },
  truncate: { type: 'boolean', description: 'Truncate with ellipsis' },

  // Form inputs
  placeholder: { type: 'string', description: 'Input placeholder' },
  type: {
    type: 'enum',
    enumValues: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local'],
    description: 'Input type'
  },
  disabled: { type: 'boolean', description: 'Disabled state' },
  visible: { type: 'boolean', description: 'Visibility' },

  // Link attributes
  href: { type: 'string', description: 'Link URL' },
  target: {
    type: 'enum',
    enumValues: ['_blank', '_self', '_parent', '_top'],
    description: 'Link target'
  },

  // Slider/Range
  min: { type: 'number', description: 'Minimum value' },
  max: { type: 'number', description: 'Maximum value' },
  step: { type: 'number', minValue: 0, description: 'Step value' },
  value: { type: 'mixed', description: 'Current value' },

  // Visuals
  icon: { type: 'string', description: 'Lucide icon name' },
  src: { type: 'string', description: 'Image source URL' },
  alt: { type: 'string', description: 'Alt text' },
  fit: {
    type: 'enum',
    enumValues: ['cover', 'contain', 'fill', 'none', 'scale-down'],
    description: 'Object fit'
  },
  shadow: {
    type: 'enum',
    enumValues: ['sm', 'md', 'lg', 'xl', '2xl', 'none'],
    description: 'Box shadow'
  },
  opacity: { type: 'number', minValue: 0, maxValue: 1, description: 'Opacity' },
  opa: { type: 'number', minValue: 0, maxValue: 1, description: 'Opacity', aliases: ['opacity'] },
  op: { type: 'number', minValue: 0, maxValue: 1, description: 'Opacity', aliases: ['opacity'] },
  cursor: {
    type: 'enum',
    enumValues: ['pointer', 'default', 'text', 'move', 'not-allowed', 'grab', 'grabbing', 'wait', 'crosshair', 'help'],
    description: 'Cursor style'
  },
  pointer: { type: 'boolean', description: 'Pointer cursor' },
  z: { type: 'number', description: 'Z-index' },
  hidden: { type: 'boolean', description: 'Start hidden' },

  // Scroll
  scroll: { type: 'boolean', description: 'Vertical scroll' },
  'scroll-ver': { type: 'boolean', description: 'Vertical scroll' },
  'scroll-hor': { type: 'boolean', description: 'Horizontal scroll' },
  'scroll-both': { type: 'boolean', description: 'Both directions scroll' },
  snap: { type: 'boolean', description: 'Scroll snap' },
  clip: { type: 'boolean', description: 'Overflow hidden' },

  // Hover states
  'hover-col': { type: 'color', description: 'Text color on hover' },
  'hover-bg': { type: 'color', description: 'Background color on hover' },
  'hover-boc': { type: 'color', description: 'Border color on hover' },
  'hover-bor': { type: 'number', minValue: 0, description: 'Border width on hover' },
  'hover-rad': { type: 'number', minValue: 0, description: 'Border radius on hover' },
  'hover-opacity': { type: 'number', minValue: 0, maxValue: 1, description: 'Opacity on hover' },
  'hover-scale': { type: 'number', minValue: 0, maxValue: 2, description: 'Scale on hover' },
}

// Export property sets for external use
export {
  PROPERTIES,
  BOOLEAN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  STRING_PROPERTIES,
  DIRECTIONAL_PROPERTIES,
  DIRECTIONS,
  BORDER_STYLES
}
