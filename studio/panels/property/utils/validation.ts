/**
 * Validation Utilities
 *
 * Input validation for property panel fields.
 */

import { VALIDATION_RULES, PROPERTY_VALIDATION_TYPE, type ValidationRule } from '../types'

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  message?: string
}

/**
 * Validate a property value
 */
export function validateProperty(property: string, value: string): ValidationResult {
  // Get the validation type for this property
  const validationType = PROPERTY_VALIDATION_TYPE[property]
  if (!validationType) {
    // No validation rule - accept anything
    return { valid: true }
  }

  const rule = VALIDATION_RULES[validationType]
  if (!rule) {
    return { valid: true }
  }

  return validateWithRule(value, rule)
}

/**
 * Validate a value against a specific rule
 */
export function validateWithRule(value: string, rule: ValidationRule): ValidationResult {
  // Check empty
  if (!value || value.trim() === '') {
    return { valid: rule.allowEmpty }
  }

  // Check pattern
  if (!rule.pattern.test(value)) {
    return { valid: false, message: rule.message }
  }

  return { valid: true }
}

/**
 * Apply validation styling to an input
 */
export function applyValidationStyle(input: HTMLInputElement, result: ValidationResult): void {
  if (result.valid) {
    input.classList.remove('invalid')
    input.removeAttribute('title')
  } else {
    input.classList.add('invalid')
    if (result.message) {
      input.setAttribute('title', result.message)
    }
  }
}

/**
 * Validate and style an input element
 */
export function validateInput(input: HTMLInputElement, property: string): ValidationResult {
  const result = validateProperty(property, input.value)
  applyValidationStyle(input, result)
  return result
}

/**
 * Parse a numeric value, handling tokens
 */
export function parseNumericValue(value: string): number | null {
  if (!value || value.startsWith('$')) {
    return null
  }

  const num = parseFloat(value)
  return isNaN(num) ? null : num
}

/**
 * Parse a size value (can be number, 'full', 'hug', 'auto')
 */
export function parseSizeValue(value: string): { type: 'number' | 'keyword' | 'token'; value: number | string } | null {
  if (!value) return null

  if (value.startsWith('$')) {
    return { type: 'token', value }
  }

  const keywords = ['full', 'hug', 'auto']
  if (keywords.includes(value.toLowerCase())) {
    return { type: 'keyword', value: value.toLowerCase() }
  }

  const num = parseFloat(value)
  if (!isNaN(num)) {
    return { type: 'number', value: num }
  }

  return null
}

/**
 * Parse a color value
 */
export function parseColorValue(value: string): { type: 'hex' | 'token' | 'named' | 'transparent'; value: string } | null {
  if (!value) return null

  if (value.startsWith('$')) {
    return { type: 'token', value }
  }

  if (value === 'transparent') {
    return { type: 'transparent', value }
  }

  if (value.startsWith('#')) {
    return { type: 'hex', value }
  }

  // Could be a named color like 'white', 'black', etc.
  const namedColors = ['white', 'black', 'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'gray', 'grey']
  if (namedColors.includes(value.toLowerCase())) {
    return { type: 'named', value: value.toLowerCase() }
  }

  return null
}

/**
 * Format a number for display
 */
export function formatNumber(num: number, decimals: number = 2): string {
  if (Number.isInteger(num)) {
    return String(num)
  }
  return num.toFixed(decimals).replace(/\.?0+$/, '')
}

/**
 * Clamp a number to a range
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Validate padding/margin values (can be 1-4 numbers)
 */
export function validateSpacingValue(value: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { valid: true }
  }

  // Token reference
  if (value.startsWith('$')) {
    return { valid: true }
  }

  // Split by whitespace
  const parts = value.trim().split(/\s+/)
  if (parts.length > 4) {
    return { valid: false, message: 'Max 4 values (top right bottom left)' }
  }

  // Each part should be a number
  for (const part of parts) {
    if (!/^\d+(\.\d+)?$/.test(part)) {
      return { valid: false, message: 'Nur Zahlen oder $token erlaubt' }
    }
  }

  return { valid: true }
}
