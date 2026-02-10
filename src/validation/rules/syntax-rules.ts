/**
 * Syntax validation rules
 */

import type {
  ValidationError,
  ValidationWarning,
  TabType
} from '../types'
import {
  KNOWN_PROPERTIES,
  COLOR_PROPERTIES,
  NUMBER_PROPERTIES,
  BOOLEAN_PROPERTIES
} from '../types'
import { analyzeLine, startsWithComponentName } from '../analyzers/line-analyzer'
import { correctColor } from '../correctors/color-corrector'
import { findClosestMatch } from '../../utils/fuzzy-search'

export interface SyntaxValidationResult {
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Validate syntax of a single line
 */
export function validateLineSyntax(
  line: string,
  lineNumber: number,
  tab: TabType
): SyntaxValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const trimmed = line.trim()

  // Empty lines are valid
  if (!trimmed) {
    return { errors, warnings }
  }

  // Comments are valid
  if (trimmed.startsWith('//')) {
    return { errors, warnings }
  }

  // Every non-empty line must start with a component name
  if (!startsWithComponentName(line)) {
    // Check if it looks like just properties (common LLM mistake)
    if (/^[a-z]/.test(trimmed)) {
      errors.push({
        type: 'INVALID_SYNTAX',
        tab,
        line: lineNumber,
        message: 'Line must start with a component name (e.g., "Box ver gap 8" not "ver gap 8")',
        source: line
      })
    } else if (!/^\s+[A-Z]/.test(line) && !/^\s+[a-z]/.test(line)) {
      // Not indented content either
      errors.push({
        type: 'INVALID_SYNTAX',
        tab,
        line: lineNumber,
        message: 'Invalid line - expected component name or indented content',
        source: line
      })
    }
    return { errors, warnings }
  }

  // Parse and validate
  const parsed = analyzeLine(line, lineNumber)

  // Validate properties
  for (const prop of parsed.properties) {
    const propLower = prop.name.toLowerCase()

    // Check if property is known
    if (!KNOWN_PROPERTIES.has(propLower) && !propLower.match(/^(pad|mar)_[lrud]$/)) {
      // Try to find similar property
      const { match, distance } = findClosestMatch(propLower, KNOWN_PROPERTIES)

      if (match && distance <= 2) {
        warnings.push({
          type: 'SIMILAR_PROPERTY',
          tab,
          line: lineNumber,
          message: `Unknown property "${prop.name}"`,
          suggestion: `Did you mean "${match}"?`
        })
      } else {
        errors.push({
          type: 'UNKNOWN_PROPERTY',
          tab,
          line: lineNumber,
          message: `Unknown property "${prop.name}"`,
          source: line
        })
      }
      continue
    }

    // Validate property value
    if (COLOR_PROPERTIES.has(propLower)) {
      if (prop.value !== null && typeof prop.value === 'string') {
        const colorResult = correctColor(prop.value)
        if (!colorResult.isValid && colorResult.confidence < 0.5) {
          errors.push({
            type: 'INVALID_COLOR',
            tab,
            line: lineNumber,
            message: `Invalid color value "${prop.value}" for property "${prop.name}"`,
            source: line
          })
        }
      } else if (prop.value === null) {
        errors.push({
          type: 'MISSING_VALUE',
          tab,
          line: lineNumber,
          message: `Property "${prop.name}" requires a color value`,
          source: line
        })
      }
    }

    if (NUMBER_PROPERTIES.has(propLower)) {
      if (prop.value !== null && typeof prop.value !== 'number') {
        // Check if it's a string that looks like a number with unit
        if (typeof prop.value === 'string' && /^\d+px$/.test(prop.value)) {
          warnings.push({
            type: 'POSSIBLE_TYPO',
            tab,
            line: lineNumber,
            message: `Property "${prop.name}" value "${prop.value}" has unit - DSL uses unitless numbers`,
            suggestion: `Use just the number: ${parseInt(prop.value)}`
          })
        } else if (typeof prop.value === 'string' && !/^\d+$/.test(prop.value)) {
          errors.push({
            type: 'INVALID_VALUE',
            tab,
            line: lineNumber,
            message: `Property "${prop.name}" requires a number value, got "${prop.value}"`,
            source: line
          })
        }
      } else if (prop.value === null) {
        errors.push({
          type: 'MISSING_VALUE',
          tab,
          line: lineNumber,
          message: `Property "${prop.name}" requires a number value`,
          source: line
        })
      }
    }

    if (BOOLEAN_PROPERTIES.has(propLower)) {
      // Boolean properties shouldn't have values (they're flags)
      if (prop.value !== null && prop.value !== true) {
        warnings.push({
          type: 'REDUNDANT_PROPERTY',
          tab,
          line: lineNumber,
          message: `Property "${prop.name}" is a flag and doesn't need a value`,
          suggestion: `Just use "${prop.name}" without a value`
        })
      }
    }
  }

  return { errors, warnings }
}

/**
 * Validate syntax of entire code block
 */
export function validateSyntax(
  code: string,
  tab: TabType
): SyntaxValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const lines = code.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const result = validateLineSyntax(lines[i], i + 1, tab)
    errors.push(...result.errors)
    warnings.push(...result.warnings)
  }

  return { errors, warnings }
}

/**
 * Check for conflicting properties
 */
export function checkPropertyConflicts(
  code: string,
  tab: TabType
): ValidationWarning[] {
  const warnings: ValidationWarning[] = []
  const lines = code.split('\n')

  // Conflicting property pairs
  const conflicts: [string, string, string][] = [
    ['hor', 'ver', 'Layout can only be horizontal OR vertical'],
    ['hor-l', 'hor-r', 'Cannot align both left and right horizontally'],
    ['hor-l', 'hor-cen', 'Cannot align both left and center horizontally'],
    ['hor-r', 'hor-cen', 'Cannot align both right and center horizontally'],
    ['ver-t', 'ver-b', 'Cannot align both top and bottom vertically'],
    ['ver-t', 'ver-cen', 'Cannot align both top and center vertically'],
    ['ver-b', 'ver-cen', 'Cannot align both bottom and center vertically'],
  ]

  for (let i = 0; i < lines.length; i++) {
    const parsed = analyzeLine(lines[i], i + 1)
    const propNames = new Set(parsed.properties.map(p => p.name.toLowerCase()))

    for (const [prop1, prop2, message] of conflicts) {
      if (propNames.has(prop1) && propNames.has(prop2)) {
        warnings.push({
          type: 'REDUNDANT_PROPERTY',
          tab,
          line: i + 1,
          message: `Conflicting properties: ${prop1} and ${prop2}`,
          suggestion: message
        })
      }
    }
  }

  return warnings
}
