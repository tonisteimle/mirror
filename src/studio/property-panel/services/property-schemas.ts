/**
 * PropertySchemas - Defines the structure and behavior of all properties
 *
 * This module provides:
 * - Schema definitions for each property type
 * - Parse/format functions for compound properties
 * - Validation rules
 */

/**
 * Property type enum
 */
export type PropertyType =
  | 'color'      // #hex or $token
  | 'spacing'    // number or $token, can be multi-value (pad 8 16)
  | 'border'     // width [style] color
  | 'dimension'  // number with optional unit
  | 'enum'       // fixed values (cursor: pointer)
  | 'boolean'    // hidden, visible
  | 'string'     // arbitrary text

/**
 * Property part definition for compound properties
 */
export interface PropertyPart {
  name: string           // 'width', 'color', 'top', etc.
  type: PropertyType     // Type of this part
  default?: string       // Default value if not set
  position?: number      // Position in value order
}

/**
 * Property schema definition
 */
export interface PropertySchema {
  name: string
  canonicalName: string
  type: PropertyType

  // For compound properties
  parts?: PropertyPart[]

  // Validation function
  validate?: (value: string) => boolean

  // Format parsed parts back to string
  format?: (parts: Record<string, string>) => string

  // Parse string value into parts
  parse?: (value: string) => Record<string, string>
}

/**
 * Validate a color value
 */
function validateColor(value: string): boolean {
  return value.startsWith('#') || value.startsWith('$') || value === ''
}

/**
 * Validate a spacing/dimension value
 */
function validateSpacing(value: string): boolean {
  if (!value) return true
  if (value.startsWith('$')) return true
  // Allow number, or multiple numbers separated by spaces
  const parts = value.split(/\s+/)
  return parts.every(p => /^-?\d+(\.\d+)?$/.test(p) || p.startsWith('$'))
}

/**
 * Parse border value: "width [style] color"
 * Examples: "1 #333", "2 solid #fff", "$border.width $border.color"
 */
function parseBorder(value: string): Record<string, string> {
  if (!value) {
    return { width: '1', color: '#333' }
  }

  const parts = value.split(/\s+/)
  const result: Record<string, string> = {
    width: '1',
    color: '#333'
  }

  for (const part of parts) {
    if (part.startsWith('#') || part.startsWith('$')) {
      result.color = part
    } else if (/^\d+$/.test(part)) {
      result.width = part
    }
    // Ignore style for now (solid, dashed, etc.)
  }

  return result
}

/**
 * Format border parts back to string
 */
function formatBorder(parts: Record<string, string>): string {
  const width = parts.width || '1'
  const color = parts.color || '#333'
  return `${width} ${color}`
}

/**
 * Parse padding/margin value: can be 1, 2, or 4 values
 * Examples: "8", "8 16", "8 16 8 16"
 */
function parseSpacing(value: string): Record<string, string> {
  if (!value) {
    return { top: '', right: '', bottom: '', left: '' }
  }

  // If it's a token, apply to all
  if (value.startsWith('$')) {
    return { top: value, right: value, bottom: value, left: value }
  }

  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] }
  }
  if (parts.length === 2) {
    // 2 values: vertical horizontal
    return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] }
  }
  if (parts.length === 4) {
    return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] }
  }

  // Invalid, return as-is in top
  return { top: value, right: '', bottom: '', left: '' }
}

/**
 * Format spacing parts back to string (optimized)
 */
function formatSpacing(parts: Record<string, string>): string {
  const { top, right, bottom, left } = parts

  // Handle empty
  if (!top && !right && !bottom && !left) {
    return ''
  }

  // If any is a token, handle specially
  const isToken = (v: string) => v && v.startsWith('$')
  if (isToken(top) || isToken(right) || isToken(bottom) || isToken(left)) {
    // If all same token, return just that
    if (top === right && right === bottom && bottom === left) {
      return top
    }
    // Otherwise return as 4 values or 2 values
    if (top === bottom && right === left) {
      return `${top} ${right}`
    }
    return `${top} ${right} ${bottom} ${left}`
  }

  // All same: single value
  if (top === right && right === bottom && bottom === left) {
    return top || ''
  }

  // Vertical/horizontal same: two values
  if (top === bottom && right === left) {
    return `${top} ${right}`
  }

  // All four
  return `${top} ${right} ${bottom} ${left}`
}

/**
 * Parse radius value: same structure as spacing (1, 2, or 4 values)
 */
function parseRadius(value: string): Record<string, string> {
  if (!value) {
    return { tl: '', tr: '', br: '', bl: '' }
  }

  // If it's a token, apply to all
  if (value.startsWith('$')) {
    return { tl: value, tr: value, br: value, bl: value }
  }

  const parts = value.split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    return { tl: parts[0], tr: parts[0], br: parts[0], bl: parts[0] }
  }
  if (parts.length === 2) {
    // 2 values: tl+br, tr+bl
    return { tl: parts[0], tr: parts[1], br: parts[0], bl: parts[1] }
  }
  if (parts.length === 4) {
    return { tl: parts[0], tr: parts[1], br: parts[2], bl: parts[3] }
  }

  // Invalid, return as-is in tl
  return { tl: value, tr: '', br: '', bl: '' }
}

/**
 * Format radius parts back to string (optimized)
 */
function formatRadius(parts: Record<string, string>): string {
  const { tl, tr, br, bl } = parts

  // Handle empty
  if (!tl && !tr && !br && !bl) {
    return ''
  }

  // All same: single value
  if (tl === tr && tr === br && br === bl) {
    return tl || ''
  }

  // Diagonal pairs same: two values
  if (tl === br && tr === bl) {
    return `${tl} ${tr}`
  }

  // All four
  return `${tl} ${tr} ${br} ${bl}`
}

/**
 * All property schemas
 */
export const PROPERTY_SCHEMAS: Record<string, PropertySchema> = {
  // Background color
  bg: {
    name: 'bg',
    canonicalName: 'background',
    type: 'color',
    validate: validateColor,
  },
  background: {
    name: 'background',
    canonicalName: 'background',
    type: 'color',
    validate: validateColor,
  },

  // Text color
  col: {
    name: 'col',
    canonicalName: 'color',
    type: 'color',
    validate: validateColor,
  },
  color: {
    name: 'color',
    canonicalName: 'color',
    type: 'color',
    validate: validateColor,
  },
  c: {
    name: 'c',
    canonicalName: 'color',
    type: 'color',
    validate: validateColor,
  },

  // Border color
  boc: {
    name: 'boc',
    canonicalName: 'border-color',
    type: 'color',
    validate: validateColor,
  },
  'border-color': {
    name: 'border-color',
    canonicalName: 'border-color',
    type: 'color',
    validate: validateColor,
  },

  // Border (compound: width + color)
  bor: {
    name: 'bor',
    canonicalName: 'border',
    type: 'border',
    parts: [
      { name: 'width', type: 'dimension', default: '1', position: 0 },
      { name: 'color', type: 'color', default: '#333', position: 1 },
    ],
    parse: parseBorder,
    format: formatBorder,
  },
  border: {
    name: 'border',
    canonicalName: 'border',
    type: 'border',
    parts: [
      { name: 'width', type: 'dimension', default: '1', position: 0 },
      { name: 'color', type: 'color', default: '#333', position: 1 },
    ],
    parse: parseBorder,
    format: formatBorder,
  },

  // Padding (compound: can be 1, 2, or 4 values)
  pad: {
    name: 'pad',
    canonicalName: 'padding',
    type: 'spacing',
    parts: [
      { name: 'top', type: 'spacing', position: 0 },
      { name: 'right', type: 'spacing', position: 1 },
      { name: 'bottom', type: 'spacing', position: 2 },
      { name: 'left', type: 'spacing', position: 3 },
    ],
    parse: parseSpacing,
    format: formatSpacing,
    validate: validateSpacing,
  },
  padding: {
    name: 'padding',
    canonicalName: 'padding',
    type: 'spacing',
    parts: [
      { name: 'top', type: 'spacing', position: 0 },
      { name: 'right', type: 'spacing', position: 1 },
      { name: 'bottom', type: 'spacing', position: 2 },
      { name: 'left', type: 'spacing', position: 3 },
    ],
    parse: parseSpacing,
    format: formatSpacing,
    validate: validateSpacing,
  },
  p: {
    name: 'p',
    canonicalName: 'padding',
    type: 'spacing',
    parts: [
      { name: 'top', type: 'spacing', position: 0 },
      { name: 'right', type: 'spacing', position: 1 },
      { name: 'bottom', type: 'spacing', position: 2 },
      { name: 'left', type: 'spacing', position: 3 },
    ],
    parse: parseSpacing,
    format: formatSpacing,
    validate: validateSpacing,
  },

  // Margin (compound: same as padding)
  margin: {
    name: 'margin',
    canonicalName: 'margin',
    type: 'spacing',
    parts: [
      { name: 'top', type: 'spacing', position: 0 },
      { name: 'right', type: 'spacing', position: 1 },
      { name: 'bottom', type: 'spacing', position: 2 },
      { name: 'left', type: 'spacing', position: 3 },
    ],
    parse: parseSpacing,
    format: formatSpacing,
    validate: validateSpacing,
  },
  m: {
    name: 'm',
    canonicalName: 'margin',
    type: 'spacing',
    parts: [
      { name: 'top', type: 'spacing', position: 0 },
      { name: 'right', type: 'spacing', position: 1 },
      { name: 'bottom', type: 'spacing', position: 2 },
      { name: 'left', type: 'spacing', position: 3 },
    ],
    parse: parseSpacing,
    format: formatSpacing,
    validate: validateSpacing,
  },

  // Radius (compound: same structure as spacing)
  rad: {
    name: 'rad',
    canonicalName: 'radius',
    type: 'spacing',
    parts: [
      { name: 'tl', type: 'spacing', position: 0 },
      { name: 'tr', type: 'spacing', position: 1 },
      { name: 'br', type: 'spacing', position: 2 },
      { name: 'bl', type: 'spacing', position: 3 },
    ],
    parse: parseRadius,
    format: formatRadius,
    validate: validateSpacing,
  },
  radius: {
    name: 'radius',
    canonicalName: 'radius',
    type: 'spacing',
    parts: [
      { name: 'tl', type: 'spacing', position: 0 },
      { name: 'tr', type: 'spacing', position: 1 },
      { name: 'br', type: 'spacing', position: 2 },
      { name: 'bl', type: 'spacing', position: 3 },
    ],
    parse: parseRadius,
    format: formatRadius,
    validate: validateSpacing,
  },

  // Gap
  gap: {
    name: 'gap',
    canonicalName: 'gap',
    type: 'dimension',
    validate: validateSpacing,
  },

  // Width/Height
  w: {
    name: 'w',
    canonicalName: 'width',
    type: 'dimension',
  },
  width: {
    name: 'width',
    canonicalName: 'width',
    type: 'dimension',
  },
  h: {
    name: 'h',
    canonicalName: 'height',
    type: 'dimension',
  },
  height: {
    name: 'height',
    canonicalName: 'height',
    type: 'dimension',
  },

  // Hover colors
  'hover-bg': {
    name: 'hover-bg',
    canonicalName: 'hover-background',
    type: 'color',
    validate: validateColor,
  },
  'hover-background': {
    name: 'hover-background',
    canonicalName: 'hover-background',
    type: 'color',
    validate: validateColor,
  },
  'hover-col': {
    name: 'hover-col',
    canonicalName: 'hover-color',
    type: 'color',
    validate: validateColor,
  },
  'hover-color': {
    name: 'hover-color',
    canonicalName: 'hover-color',
    type: 'color',
    validate: validateColor,
  },

  // Icon color
  ic: {
    name: 'ic',
    canonicalName: 'icon-color',
    type: 'color',
    validate: validateColor,
  },
  'icon-color': {
    name: 'icon-color',
    canonicalName: 'icon-color',
    type: 'color',
    validate: validateColor,
  },
}

/**
 * Get schema for a property (by name or canonical name)
 */
export function getPropertySchema(propName: string): PropertySchema {
  const schema = PROPERTY_SCHEMAS[propName]
  if (schema) return schema

  // Default schema for unknown properties
  return {
    name: propName,
    canonicalName: propName,
    type: 'string',
  }
}

/**
 * Get canonical name for a property
 */
export function getCanonicalPropertyName(propName: string): string {
  const schema = PROPERTY_SCHEMAS[propName]
  return schema?.canonicalName || propName
}

/**
 * Check if a property is compound (has parts)
 */
export function isCompoundProperty(propName: string): boolean {
  const schema = PROPERTY_SCHEMAS[propName]
  return Boolean(schema?.parts && schema.parts.length > 0)
}
