/**
 * @module dsl/schema-validator
 * @description Validates Mirror DSL code against the DSL schema
 *
 * This validator checks:
 * - Property names are valid
 * - Property values match expected types
 * - Directions are valid for properties that support them
 * - Corners are valid for radius
 * - Compound properties have valid structure
 * - Value ranges are respected (e.g., opacity 0-1)
 */

import {
  DSL_SCHEMA,
  getPropertyDefinitionByAnyName,
  isValidValue,
  isValidDirection,
  isValidCorner,
  normalizePropertyName,
  normalizeDirectionToLong,
  normalizeCornerToLong,
  type PropertyDefinition,
} from './dsl-schema'
import { extractProperties, type ExtractedProperty } from './normalizer'
import {
  getComponentDefinition,
  isForbiddenProperty,
  isPropertyAllowedForComponent,
  findSimilarProperty,
  findSimilarComponent,
} from './master-schema'

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationIssue {
  type: 'error' | 'warning'
  code: ValidationErrorCode
  message: string
  line?: number
  column?: number
  component?: string
  property?: string
  value?: unknown
  suggestion?: string
  autoFix?: {
    replacement: string
    description: string
  }
}

export type ValidationErrorCode =
  | 'UNKNOWN_PROPERTY'
  | 'INVALID_VALUE_TYPE'
  | 'INVALID_DIRECTION'
  | 'INVALID_CORNER'
  | 'VALUE_OUT_OF_RANGE'
  | 'INVALID_ENUM_VALUE'
  | 'MISSING_REQUIRED_VALUE'
  | 'INVALID_COMPOUND_STRUCTURE'
  | 'DIRECTION_NOT_SUPPORTED'
  | 'CORNER_NOT_SUPPORTED'
  | 'DEPRECATED_PROPERTY'
  // Component-specific validation
  | 'FORBIDDEN_PROPERTY'
  | 'UNUSUAL_PROPERTY'
  | 'UNKNOWN_COMPONENT'

export interface ValidationResult {
  valid: boolean
  issues: ValidationIssue[]
  normalizedCode?: string
}

// =============================================================================
// VALIDATOR CLASS
// =============================================================================

export class DslValidator {
  private issues: ValidationIssue[] = []
  private currentLine = 1

  /**
   * Validate Mirror DSL code
   */
  validate(code: string): ValidationResult {
    this.issues = []
    this.currentLine = 1

    const lines = code.split('\n')

    for (const line of lines) {
      this.validateLine(line)
      this.currentLine++
    }

    return {
      valid: this.issues.filter((i) => i.type === 'error').length === 0,
      issues: this.issues,
    }
  }

  /**
   * Validate a single line of DSL code
   */
  private validateLine(line: string): void {
    // Skip empty lines and comments
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('//')) {
      return
    }

    // Extract properties from the line
    const properties = extractProperties(trimmed)

    for (const prop of properties) {
      this.validateProperty(prop)
    }
  }

  /**
   * Validate an extracted property
   */
  private validateProperty(prop: ExtractedProperty): void {
    const def = getPropertyDefinitionByAnyName(prop.name)

    // Check if property is known
    if (!def) {
      // Only add issue if it looks like a property (not a component name)
      if (!this.looksLikeComponentName(prop.name)) {
        this.addIssue({
          type: 'warning',
          code: 'UNKNOWN_PROPERTY',
          message: `Unknown property: ${prop.name}`,
          property: prop.name,
          suggestion: this.suggestSimilarProperty(prop.name),
        })
      }
      return
    }

    // Validate direction
    if (prop.direction) {
      this.validateDirection(def, prop.direction)
    }

    // Validate corner
    if (prop.corner) {
      this.validateCorner(def, prop.corner)
    }

    // Validate value
    this.validateValue(def, prop.value)
  }

  /**
   * Validate that a direction is valid for a property
   */
  private validateDirection(def: PropertyDefinition, direction: string): void {
    if (!def.directions?.supported) {
      this.addIssue({
        type: 'error',
        code: 'DIRECTION_NOT_SUPPORTED',
        message: `Property '${def.name}' does not support directions`,
        property: def.name,
        value: direction,
      })
      return
    }

    if (!isValidDirection(def.name, direction)) {
      this.addIssue({
        type: 'error',
        code: 'INVALID_DIRECTION',
        message: `Invalid direction '${direction}' for property '${def.name}'`,
        property: def.name,
        value: direction,
        suggestion: `Valid directions: ${def.directions.forms.join(', ')}`,
      })
    }
  }

  /**
   * Validate that a corner is valid for a property
   */
  private validateCorner(def: PropertyDefinition, corner: string): void {
    if (!def.corners?.supported) {
      this.addIssue({
        type: 'error',
        code: 'CORNER_NOT_SUPPORTED',
        message: `Property '${def.name}' does not support corners`,
        property: def.name,
        value: corner,
      })
      return
    }

    if (!isValidCorner(def.name, corner)) {
      this.addIssue({
        type: 'error',
        code: 'INVALID_CORNER',
        message: `Invalid corner '${corner}' for property '${def.name}'`,
        property: def.name,
        value: corner,
        suggestion: `Valid corners: ${def.corners.forms.join(', ')}`,
      })
    }
  }

  /**
   * Validate a property value
   */
  private validateValue(def: PropertyDefinition, value: unknown): void {
    // Boolean properties don't need a value check
    if (def.valueType === 'boolean') {
      return
    }

    // Check if value is missing when required
    if (value === undefined || value === true) {
      // Boolean check already done above, so this is always a missing value
      this.addIssue({
        type: 'error',
        code: 'MISSING_REQUIRED_VALUE',
        message: `Property '${def.name}' requires a value`,
        property: def.name,
      })
      return
    }

    // Type-specific validation
    switch (def.valueType) {
      case 'number':
        this.validateNumberValue(def, value)
        break
      case 'color':
        this.validateColorValue(def, value)
        break
      case 'enum':
        this.validateEnumValue(def, value)
        break
      case 'string':
        this.validateStringValue(def, value)
        break
      case 'mixed':
      case 'keyword':
        this.validateMixedValue(def, value)
        break
      case 'compound':
        // Compound validation is more complex and handled separately
        break
    }
  }

  /**
   * Validate a number value
   */
  private validateNumberValue(def: PropertyDefinition, value: unknown): void {
    if (typeof value !== 'number' && typeof value !== 'string') {
      this.addIssue({
        type: 'error',
        code: 'INVALID_VALUE_TYPE',
        message: `Property '${def.name}' expects a number, got ${typeof value}`,
        property: def.name,
        value,
      })
      return
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value

    // Check for token references
    if (typeof value === 'string' && value.startsWith('$')) {
      return // Token references are valid
    }

    // Check range
    if (def.range) {
      if (def.range.min !== undefined && numValue < def.range.min) {
        this.addIssue({
          type: 'error',
          code: 'VALUE_OUT_OF_RANGE',
          message: `Value ${numValue} is below minimum ${def.range.min} for '${def.name}'`,
          property: def.name,
          value: numValue,
        })
      }
      if (def.range.max !== undefined && numValue > def.range.max) {
        this.addIssue({
          type: 'error',
          code: 'VALUE_OUT_OF_RANGE',
          message: `Value ${numValue} is above maximum ${def.range.max} for '${def.name}'`,
          property: def.name,
          value: numValue,
        })
      }
    }
  }

  /**
   * Validate a color value
   */
  private validateColorValue(def: PropertyDefinition, value: unknown): void {
    if (typeof value !== 'string') {
      this.addIssue({
        type: 'error',
        code: 'INVALID_VALUE_TYPE',
        message: `Property '${def.name}' expects a color, got ${typeof value}`,
        property: def.name,
        value,
      })
      return
    }

    // Valid formats: #hex, $token, color keywords
    if (
      !value.startsWith('#') &&
      !value.startsWith('$') &&
      !['transparent', 'inherit', 'currentColor'].includes(value)
    ) {
      this.addIssue({
        type: 'warning',
        code: 'INVALID_VALUE_TYPE',
        message: `Color value '${value}' may not be valid. Expected #hex or $token`,
        property: def.name,
        value,
      })
    }

    // Validate hex format
    if (value.startsWith('#')) {
      const hex = value.slice(1)
      if (!/^[0-9a-fA-F]{3,8}$/.test(hex)) {
        this.addIssue({
          type: 'error',
          code: 'INVALID_VALUE_TYPE',
          message: `Invalid hex color format: ${value}`,
          property: def.name,
          value,
        })
      }
    }
  }

  /**
   * Validate an enum value
   */
  private validateEnumValue(def: PropertyDefinition, value: unknown): void {
    if (typeof value !== 'string') {
      this.addIssue({
        type: 'error',
        code: 'INVALID_VALUE_TYPE',
        message: `Property '${def.name}' expects a string, got ${typeof value}`,
        property: def.name,
        value,
      })
      return
    }

    if (def.enumValues && !def.enumValues.includes(value)) {
      this.addIssue({
        type: 'error',
        code: 'INVALID_ENUM_VALUE',
        message: `Invalid value '${value}' for '${def.name}'`,
        property: def.name,
        value,
        suggestion: `Valid values: ${def.enumValues.join(', ')}`,
      })
    }
  }

  /**
   * Validate a string value
   */
  private validateStringValue(def: PropertyDefinition, value: unknown): void {
    if (typeof value !== 'string') {
      this.addIssue({
        type: 'error',
        code: 'INVALID_VALUE_TYPE',
        message: `Property '${def.name}' expects a string, got ${typeof value}`,
        property: def.name,
        value,
      })
    }
  }

  /**
   * Validate a mixed/keyword value
   */
  private validateMixedValue(def: PropertyDefinition, value: unknown): void {
    // Check if it's a valid keyword
    if (typeof value === 'string' && def.keywords?.includes(value)) {
      return
    }

    // Check if it's a valid token reference
    if (typeof value === 'string' && value.startsWith('$')) {
      return
    }

    // Check if it's a valid number (for mixed types that accept numbers)
    if (def.accepts?.includes('number') && typeof value === 'number') {
      return
    }

    // Check if it's a valid percentage
    if (
      def.accepts?.includes('percentage') &&
      typeof value === 'string' &&
      value.endsWith('%')
    ) {
      return
    }

    // If none of the above, it might still be valid depending on context
    // We'll be lenient here
  }

  /**
   * Add a validation issue
   */
  private addIssue(issue: Omit<ValidationIssue, 'line'>): void {
    this.issues.push({
      ...issue,
      line: this.currentLine,
    })
  }

  /**
   * Check if a string looks like a component name (PascalCase)
   */
  private looksLikeComponentName(name: string): boolean {
    return /^[A-Z][a-zA-Z0-9-]*$/.test(name)
  }

  /**
   * Suggest a similar property name for typos
   */
  private suggestSimilarProperty(name: string): string | undefined {
    const allProps = Object.keys(DSL_SCHEMA)
    const normalized = name.toLowerCase()

    // Find properties that start with the same prefix
    const suggestions = allProps.filter(
      (p) => p.toLowerCase().startsWith(normalized.slice(0, 3)) || normalized.startsWith(p.slice(0, 3))
    )

    if (suggestions.length > 0) {
      return `Did you mean: ${suggestions.slice(0, 3).join(', ')}?`
    }

    return undefined
  }
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Validate Mirror DSL code
 */
export function validate(code: string): ValidationResult {
  const validator = new DslValidator()
  return validator.validate(code)
}

/**
 * Check if Mirror DSL code is valid (no errors)
 */
export function isValid(code: string): boolean {
  return validate(code).valid
}

/**
 * Get validation errors only (no warnings)
 */
export function getErrors(code: string): ValidationIssue[] {
  return validate(code).issues.filter((i) => i.type === 'error')
}

/**
 * Get validation warnings only
 */
export function getWarnings(code: string): ValidationIssue[] {
  return validate(code).issues.filter((i) => i.type === 'warning')
}

// =============================================================================
// PROPERTY VALUE VALIDATORS
// =============================================================================

/**
 * Validate a single property with value
 */
export function validatePropertyValue(
  property: string,
  value: unknown,
  direction?: string,
  corner?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const def = getPropertyDefinitionByAnyName(property)

  if (!def) {
    issues.push({
      type: 'warning',
      code: 'UNKNOWN_PROPERTY',
      message: `Unknown property: ${property}`,
      property,
    })
    return issues
  }

  // Validate direction
  if (direction && def.directions?.supported) {
    if (!isValidDirection(def.name, direction)) {
      issues.push({
        type: 'error',
        code: 'INVALID_DIRECTION',
        message: `Invalid direction '${direction}' for property '${def.name}'`,
        property: def.name,
        value: direction,
      })
    }
  } else if (direction && !def.directions?.supported) {
    issues.push({
      type: 'error',
      code: 'DIRECTION_NOT_SUPPORTED',
      message: `Property '${def.name}' does not support directions`,
      property: def.name,
      value: direction,
    })
  }

  // Validate corner
  if (corner && def.corners?.supported) {
    if (!isValidCorner(def.name, corner)) {
      issues.push({
        type: 'error',
        code: 'INVALID_CORNER',
        message: `Invalid corner '${corner}' for property '${def.name}'`,
        property: def.name,
        value: corner,
      })
    }
  } else if (corner && !def.corners?.supported) {
    issues.push({
      type: 'error',
      code: 'CORNER_NOT_SUPPORTED',
      message: `Property '${def.name}' does not support corners`,
      property: def.name,
      value: corner,
    })
  }

  // Validate value with specific error codes
  if (def.valueType === 'number' && typeof value === 'number') {
    // Check range for number properties
    if (def.range) {
      if (def.range.min !== undefined && value < def.range.min) {
        issues.push({
          type: 'error',
          code: 'VALUE_OUT_OF_RANGE',
          message: `Value ${value} is below minimum ${def.range.min} for '${def.name}'`,
          property: def.name,
          value,
        })
      }
      if (def.range.max !== undefined && value > def.range.max) {
        issues.push({
          type: 'error',
          code: 'VALUE_OUT_OF_RANGE',
          message: `Value ${value} is above maximum ${def.range.max} for '${def.name}'`,
          property: def.name,
          value,
        })
      }
    }
  } else if (!isValidValue(def.name, value)) {
    issues.push({
      type: 'error',
      code: 'INVALID_VALUE_TYPE',
      message: `Invalid value for '${def.name}'`,
      property: def.name,
      value,
    })
  }

  return issues
}

// =============================================================================
// COMPONENT-PROPERTY VALIDATION
// =============================================================================

/**
 * Validate that a property is allowed for a specific component.
 * This catches semantic errors like `Icon size 20` (should be `icon-size`)
 */
export function validateComponentProperty(
  componentName: string,
  propertyName: string,
  line?: number
): ValidationIssue | undefined {
  // Check if property is forbidden for this component
  const forbiddenMessage = isForbiddenProperty(componentName, propertyName)
  if (forbiddenMessage) {
    // Extract suggestion from message (e.g., "verwende icon-size" → "icon-size")
    const suggestionMatch = forbiddenMessage.match(/"([^"]+)"/)
    const suggestedProperty = suggestionMatch ? suggestionMatch[1] : undefined

    return {
      type: 'error',
      code: 'FORBIDDEN_PROPERTY',
      message: forbiddenMessage,
      line,
      component: componentName,
      property: propertyName,
      suggestion: suggestedProperty ? `Verwende "${suggestedProperty}"` : undefined,
      autoFix: suggestedProperty
        ? {
            replacement: suggestedProperty,
            description: `Ersetze "${propertyName}" mit "${suggestedProperty}"`,
          }
        : undefined,
    }
  }

  // Check if property is unusual (not forbidden, but not typical either)
  if (!isPropertyAllowedForComponent(componentName, propertyName)) {
    const propDef = getPropertyDefinitionByAnyName(propertyName)
    if (propDef) {
      return {
        type: 'warning',
        code: 'UNUSUAL_PROPERTY',
        message: `Property "${propertyName}" ist unüblich für ${componentName}`,
        line,
        component: componentName,
        property: propertyName,
      }
    }
  }

  return undefined
}

/**
 * Validate all properties for a component
 */
export function validateComponentProperties(
  componentName: string,
  properties: Record<string, unknown>,
  line?: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Check if component is known
  const compDef = getComponentDefinition(componentName)
  if (!compDef) {
    // Only warn if it looks like a built-in component name
    const similar = findSimilarComponent(componentName)
    if (similar) {
      issues.push({
        type: 'warning',
        code: 'UNKNOWN_COMPONENT',
        message: `Unbekannte Komponente "${componentName}"`,
        line,
        component: componentName,
        suggestion: `Meintest du "${similar}"?`,
      })
    }
    // Unknown components (custom definitions) are allowed - skip property checks
    return issues
  }

  // Validate each property
  for (const [propName] of Object.entries(properties)) {
    const issue = validateComponentProperty(componentName, propName, line)
    if (issue) {
      issues.push(issue)
    }
  }

  return issues
}

// =============================================================================
// SCHEMA INTROSPECTION
// =============================================================================

/**
 * Get all valid property names (both short and long forms)
 */
export function getAllValidPropertyNames(): string[] {
  const names: string[] = []
  for (const [name, def] of Object.entries(DSL_SCHEMA)) {
    names.push(name)
    names.push(...def.shortForms)
  }
  return names
}

/**
 * Get valid values for an enum property
 */
export function getValidEnumValues(property: string): string[] | undefined {
  const def = getPropertyDefinitionByAnyName(property)
  return def?.enumValues
}

/**
 * Get value range for a number property
 */
export function getValueRange(property: string): { min?: number; max?: number } | undefined {
  const def = getPropertyDefinitionByAnyName(property)
  return def?.range
}

/**
 * Check if a property supports directions (accepts short forms)
 */
export function propertySupportsDirections(property: string): boolean {
  const def = getPropertyDefinitionByAnyName(property)
  return def?.directions?.supported ?? false
}

/**
 * Check if a property supports corners (accepts short forms)
 */
export function propertySupportsCorners(property: string): boolean {
  const def = getPropertyDefinitionByAnyName(property)
  return def?.corners?.supported ?? false
}
