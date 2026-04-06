/**
 * Validation utilities for Property Panel
 */

import type { ValidationRule } from '../types'

/**
 * Validation rules for different property types
 */
export const VALIDATION_RULES: Record<string, ValidationRule> = {
  // Numeric properties (gap, padding, margin, radius, border width, x, y, z, etc.)
  numeric: {
    pattern: /^(\$[\w.-]+|\d+(\.\d+)?|)$/,
    allowEmpty: true,
    message: 'Nur Zahlen oder $token erlaubt'
  },
  // Size properties (width, height) - can also be "full", "hug"
  size: {
    pattern: /^(\$[\w.-]+|\d+(\.\d+)?|full|hug|auto|)$/i,
    allowEmpty: true,
    message: 'Nur Zahlen, full, hug oder $token erlaubt'
  },
  // Color properties - hex colors or tokens
  color: {
    pattern: /^(\$[\w.-]+|#[0-9A-Fa-f]{3,8}|transparent|)$/,
    allowEmpty: true,
    message: 'Nur #hex oder $token erlaubt'
  },
  // Opacity (0-1 or 0-100)
  opacity: {
    pattern: /^(\$[\w.-]+|\d+(\.\d+)?|)$/,
    allowEmpty: true,
    message: 'Nur 0-1 oder 0-100 erlaubt'
  }
}

/**
 * Map property names to validation types
 */
export const PROPERTY_VALIDATION_TYPE: Record<string, string> = {
  // Numeric
  gap: 'numeric', g: 'numeric',
  x: 'numeric', y: 'numeric', z: 'numeric',
  rotate: 'numeric', rot: 'numeric',
  scale: 'numeric',
  'font-size': 'numeric', fs: 'numeric',
  line: 'numeric',
  blur: 'numeric',
  'backdrop-blur': 'numeric', 'blur-bg': 'numeric',
  // Size
  width: 'numeric', w: 'numeric',
  height: 'numeric', h: 'numeric',
  'min-width': 'numeric', minw: 'numeric',
  'max-width': 'numeric', maxw: 'numeric',
  'min-height': 'numeric', minh: 'numeric',
  'max-height': 'numeric', maxh: 'numeric',
  // Padding/margin
  padding: 'numeric', pad: 'numeric', p: 'numeric',
  margin: 'numeric', m: 'numeric',
  // Border/radius
  radius: 'numeric', rad: 'numeric',
  border: 'numeric', bor: 'numeric',
  // Colors
  background: 'color', bg: 'color',
  color: 'color', col: 'color', c: 'color',
  'border-color': 'color', boc: 'color',
  // Opacity
  opacity: 'opacity', o: 'opacity', opa: 'opacity'
}

/**
 * Validate a property value
 * @returns true if valid, false if invalid
 */
export function validatePropertyValue(
  propName: string,
  value: string,
  input?: HTMLInputElement
): boolean {
  const validationType = PROPERTY_VALIDATION_TYPE[propName]
  if (!validationType) return true // Unknown property types pass validation

  const rule = VALIDATION_RULES[validationType]
  if (!rule) return true

  // Empty values are handled by allowEmpty
  if (value === '' && rule.allowEmpty) {
    if (input) {
      input.classList.remove('invalid')
      input.title = ''
    }
    return true
  }

  const isValid = rule.pattern.test(value)

  if (input) {
    if (isValid) {
      input.classList.remove('invalid')
      input.title = ''
    } else {
      input.classList.add('invalid')
      input.title = rule.message
    }
  }

  return isValid
}
