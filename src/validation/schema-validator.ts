/**
 * Schema Validator
 *
 * Validiert Mirror DSL Code gegen das Schema.
 * Findet ALLE Fehler automatisch basierend auf der Source of Truth.
 */

import {
  DSL_SCHEMA,
  getAllProperties,
  getAllEvents,
  getAllActions,
  isValidProperty,
  isValidEvent,
  isValidAction,
  isValidTarget,
  isValidAnimation,
  isValidPosition,
  isValidDirection,
  isValidOpacity,
} from './dsl-schema'
import { findClosestMatch } from '../utils/fuzzy-search'

// =============================================================================
// Types
// =============================================================================

export type ErrorCategory =
  // Syntax errors
  | 'UNKNOWN_PROPERTY'
  | 'UNKNOWN_EVENT'
  | 'UNKNOWN_ACTION'
  | 'UNKNOWN_TARGET'
  | 'UNKNOWN_ANIMATION'
  | 'UNKNOWN_POSITION'
  | 'UNKNOWN_DIRECTION'
  // Value errors
  | 'INVALID_OPACITY_RANGE'
  | 'INVALID_CURSOR_VALUE'
  | 'INVALID_SHADOW_VALUE'
  | 'INVALID_FIT_VALUE'
  | 'INVALID_ALIGN_VALUE'
  | 'INVALID_INPUT_TYPE'
  | 'PX_SUFFIX'
  | 'COLON_AFTER_PROPERTY'
  // Structure errors
  | 'TEXT_ON_SEPARATE_LINE'
  | 'SEMICOLON_CHAINING'
  | 'MISSING_TOKEN_PREFIX'
  | 'TOKEN_AS_PROPERTY'
  | 'MISSING_COLOR_PROPERTY'
  | 'DUPLICATE_ELEMENT_NAMES'

export interface SchemaError {
  category: ErrorCategory
  line: number
  column?: number
  original: string
  message: string
  suggestion?: string
  autoFixable: boolean
}

export interface ValidationResult {
  valid: boolean
  errors: SchemaError[]
  suggestions: Map<string, string>
}

// =============================================================================
// Schema Validator
// =============================================================================

export class SchemaValidator {
  private allProperties: Set<string>
  private allEvents: Set<string>
  private allActions: Set<string>

  constructor() {
    this.allProperties = getAllProperties()
    this.allEvents = getAllEvents()
    this.allActions = getAllActions()
  }

  /**
   * Validate a single property name
   */
  validateProperty(name: string): SchemaError | null {
    if (isValidProperty(name)) {
      return null
    }

    const { match, distance } = findClosestMatch(name, this.allProperties)

    return {
      category: 'UNKNOWN_PROPERTY',
      line: 0,
      original: name,
      message: `Unknown property: "${name}"`,
      suggestion: match && distance <= 2 ? match : undefined,
      autoFixable: match !== null && distance <= 2,
    }
  }

  /**
   * Validate a single event name
   */
  validateEvent(name: string): SchemaError | null {
    if (isValidEvent(name)) {
      return null
    }

    const { match, distance } = findClosestMatch(name, this.allEvents)

    return {
      category: 'UNKNOWN_EVENT',
      line: 0,
      original: name,
      message: `Unknown event: "${name}"`,
      suggestion: match && distance <= 2 ? match : undefined,
      autoFixable: match !== null && distance <= 2,
    }
  }

  /**
   * Validate a single action name
   */
  validateAction(name: string): SchemaError | null {
    if (isValidAction(name)) {
      return null
    }

    const { match, distance } = findClosestMatch(name, this.allActions)

    return {
      category: 'UNKNOWN_ACTION',
      line: 0,
      original: name,
      message: `Unknown action: "${name}"`,
      suggestion: match && distance <= 2 ? match : undefined,
      autoFixable: match !== null && distance <= 2,
    }
  }

  /**
   * Validate a target
   */
  validateTarget(name: string): SchemaError | null {
    if (isValidTarget(name)) {
      return null
    }

    const { match, distance } = findClosestMatch(name, DSL_SCHEMA.targets)

    return {
      category: 'UNKNOWN_TARGET',
      line: 0,
      original: name,
      message: `Unknown target: "${name}"`,
      suggestion: match && distance <= 2 ? match : undefined,
      autoFixable: match !== null && distance <= 2,
    }
  }

  /**
   * Validate an animation
   */
  validateAnimation(name: string): SchemaError | null {
    if (isValidAnimation(name)) {
      return null
    }

    const { match, distance } = findClosestMatch(name, DSL_SCHEMA.animations)

    return {
      category: 'UNKNOWN_ANIMATION',
      line: 0,
      original: name,
      message: `Unknown animation: "${name}"`,
      suggestion: match && distance <= 2 ? match : undefined,
      autoFixable: match !== null && distance <= 2,
    }
  }

  /**
   * Validate a position
   */
  validatePosition(name: string): SchemaError | null {
    if (isValidPosition(name)) {
      return null
    }

    const { match, distance } = findClosestMatch(name, DSL_SCHEMA.positions)

    return {
      category: 'UNKNOWN_POSITION',
      line: 0,
      original: name,
      message: `Unknown position: "${name}"`,
      suggestion: match && distance <= 2 ? match : undefined,
      autoFixable: match !== null && distance <= 2,
    }
  }

  /**
   * Validate opacity value (must be 0-1)
   */
  validateOpacity(value: number, line: number): SchemaError | null {
    if (isValidOpacity(value)) {
      return null
    }

    // Value > 1 suggests percentage (0-100) used instead of 0-1
    if (value > 1 && value <= 100) {
      return {
        category: 'INVALID_OPACITY_RANGE',
        line,
        original: String(value),
        message: `Opacity must be 0-1, got ${value}. Did you mean ${(value / 100).toFixed(2)}?`,
        suggestion: String((value / 100).toFixed(2).replace(/\.?0+$/, '')),
        autoFixable: true,
      }
    }

    return {
      category: 'INVALID_OPACITY_RANGE',
      line,
      original: String(value),
      message: `Opacity must be 0-1, got ${value}`,
      autoFixable: false,
    }
  }

  /**
   * Validate cursor value
   */
  validateCursor(value: string, line: number): SchemaError | null {
    if (DSL_SCHEMA.valueConstraints.cursor.has(value)) {
      return null
    }

    // Check for hyphenated values (not supported due to lexer)
    if (value.includes('-')) {
      return {
        category: 'INVALID_CURSOR_VALUE',
        line,
        original: value,
        message: `Cursor value "${value}" contains hyphen. Lexer splits on hyphens. Use single-word values: pointer, default, text, move, grab`,
        autoFixable: false,
      }
    }

    const { match } = findClosestMatch(value, DSL_SCHEMA.valueConstraints.cursor)

    return {
      category: 'INVALID_CURSOR_VALUE',
      line,
      original: value,
      message: `Invalid cursor value: "${value}"`,
      suggestion: match || undefined,
      autoFixable: match !== null,
    }
  }

  /**
   * Validate shadow value
   */
  validateShadow(value: string, line: number): SchemaError | null {
    if (DSL_SCHEMA.valueConstraints.shadow.has(value)) {
      return null
    }

    const { match } = findClosestMatch(value, DSL_SCHEMA.valueConstraints.shadow)

    return {
      category: 'INVALID_SHADOW_VALUE',
      line,
      original: value,
      message: `Invalid shadow value: "${value}". Use: sm, md, lg, xl`,
      suggestion: match || undefined,
      autoFixable: match !== null,
    }
  }

  /**
   * Check for px suffix (common LLM error)
   */
  checkPxSuffix(code: string): SchemaError[] {
    const errors: SchemaError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Match numbers followed by px (not inside strings)
      const matches = line.matchAll(/(\d+)px(?=\s|$)/g)

      for (const match of matches) {
        // Check if inside string
        const beforeMatch = line.substring(0, match.index)
        const quoteCount = (beforeMatch.match(/"/g) || []).length
        if (quoteCount % 2 === 1) continue // Inside string

        errors.push({
          category: 'PX_SUFFIX',
          line: i + 1,
          column: match.index,
          original: match[0],
          message: `Remove "px" suffix. Mirror uses unitless values.`,
          suggestion: match[1],
          autoFixable: true,
        })
      }
    }

    return errors
  }

  /**
   * Check for colons after properties (CSS syntax)
   */
  checkPropertyColons(code: string): SchemaError[] {
    const errors: SchemaError[] = []
    const lines = code.split('\n')

    const propertyPattern = new RegExp(
      `\\b(${Array.from(this.allProperties).join('|')}):\\s*(?=\\S)`,
      'g'
    )

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Skip component definitions (Name:)
      if (/^\s*[A-Z][a-zA-Z]*:/.test(line)) continue

      const matches = line.matchAll(propertyPattern)

      for (const match of matches) {
        // Check if at start of line (component definition)
        const beforeMatch = line.substring(0, match.index).trim()
        if (beforeMatch === '' || /^[A-Z]/.test(beforeMatch)) continue

        errors.push({
          category: 'COLON_AFTER_PROPERTY',
          line: i + 1,
          column: match.index,
          original: match[0],
          message: `Remove colon after property. Use "property value" not "property: value"`,
          suggestion: match[1] + ' ',
          autoFixable: true,
        })
      }
    }

    return errors
  }

  /**
   * Check for semicolon chaining (not supported)
   */
  checkSemicolonChaining(code: string): SchemaError[] {
    const errors: SchemaError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Pattern: event action; action
      if (/on\w+\s+\w+[^;\n]*;\s*\w+/.test(line)) {
        errors.push({
          category: 'SEMICOLON_CHAINING',
          line: i + 1,
          original: line.trim(),
          message: `Semicolon chaining not supported. Use comma or events block.`,
          autoFixable: false,
        })
      }
    }

    return errors
  }

  /**
   * Check for text on separate line
   */
  checkTextOnSeparateLine(code: string): SchemaError[] {
    const errors: SchemaError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i]
      const nextLine = lines[i + 1]

      // Check if next line is just an indented string
      if (/^\s+".+"$/.test(nextLine) && !line.includes('"')) {
        const currentIndent = line.match(/^(\s*)/)?.[1].length ?? 0
        const nextIndent = nextLine.match(/^(\s*)/)?.[1].length ?? 0

        if (nextIndent > currentIndent) {
          errors.push({
            category: 'TEXT_ON_SEPARATE_LINE',
            line: i + 2,
            original: nextLine.trim(),
            message: `Text content must be inline at end of component line, not on separate line.`,
            autoFixable: true,
          })
        }
      }
    }

    return errors
  }

  /**
   * Check for color values without property name
   */
  checkMissingColorProperty(code: string): SchemaError[] {
    const errors: SchemaError[] = []
    const lines = code.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Match hex color not preceded by color property
      const matches = line.matchAll(/(?<!\w)\s(#[0-9A-Fa-f]{3,8})(?=\s|$)/g)

      for (const match of matches) {
        const beforeMatch = line.substring(0, match.index)
        // Check if preceded by a color property
        if (!/\b(background|bg|color|col|c|border-color|boc)\s*$/.test(beforeMatch)) {
          errors.push({
            category: 'MISSING_COLOR_PROPERTY',
            line: i + 1,
            column: match.index,
            original: match[1],
            message: `Color "${match[1]}" needs a property name. Use "background ${match[1]}" or "color ${match[1]}"`,
            autoFixable: false,
          })
        }
      }
    }

    return errors
  }

  /**
   * Full validation of code
   */
  validateFull(code: string): ValidationResult {
    const errors: SchemaError[] = []

    // Structural checks
    errors.push(...this.checkPxSuffix(code))
    errors.push(...this.checkPropertyColons(code))
    errors.push(...this.checkSemicolonChaining(code))
    errors.push(...this.checkTextOnSeparateLine(code))
    errors.push(...this.checkMissingColorProperty(code))

    // Build suggestions map
    const suggestions = new Map<string, string>()
    for (const error of errors) {
      if (error.suggestion) {
        suggestions.set(error.original, error.suggestion)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      suggestions,
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let validatorInstance: SchemaValidator | null = null

export function getSchemaValidator(): SchemaValidator {
  if (!validatorInstance) {
    validatorInstance = new SchemaValidator()
  }
  return validatorInstance
}
