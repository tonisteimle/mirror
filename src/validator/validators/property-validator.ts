/**
 * Property Validator
 *
 * Validates property names and values on AST nodes.
 */

import type { ASTNode, ParseResult } from '../../parser/types'
import type { ValidationResult, ValidationDiagnostic } from '../types'
import { ValidatorErrorCodes } from '../error-codes'
import { DiagnosticBuilder } from '../utils/diagnostic-builder'
import { didYouMean } from '../utils/suggestion-engine'
import {
  PROPERTIES,
  getPropertySchema,
  isValidProperty,
  isValidColor,
  isValidNumber
} from '../schemas/property-schema'

// ============================================
// Property Validator
// ============================================

/**
 * Validate all properties in the parse result
 */
export function validateProperties(result: ParseResult, source?: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []
  const sourceLines = source?.split('\n') || []

  // Validate all nodes recursively
  for (const node of result.nodes) {
    validateNodeProperties(node, diagnostics, sourceLines)
  }

  // Separate by severity
  const errors = diagnostics.filter(d => d.severity === 'error')
  const warnings = diagnostics.filter(d => d.severity === 'warning')
  const info = diagnostics.filter(d => d.severity === 'info')

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info
  }
}

function validateNodeProperties(
  node: ASTNode,
  diagnostics: ValidationDiagnostic[],
  sourceLines: string[]
): void {
  const props = node.properties
  const line = node.line || 0
  const column = node.column || 0

  // Track properties for conflict detection
  const presentProps = new Set<string>()

  for (const [key, value] of Object.entries(props)) {
    // Skip internal properties
    if (key.startsWith('_')) continue

    presentProps.add(key)

    // Check if property name is valid
    if (!isValidProperty(key)) {
      const suggestions = didYouMean(key, PROPERTIES)
      const builder = DiagnosticBuilder
        .warning(ValidatorErrorCodes.UNKNOWN_PROPERTY, 'property')
        .message(`Unknown property "${key}"`)
        .at(line, column)
        .source(key)
        .withValidOptions(Array.from(PROPERTIES).slice(0, 10))

      if (suggestions.length > 0) {
        builder.suggestAll(suggestions)
        builder.message(`Unknown property "${key}" - ${suggestions[0].label}`)
      }

      diagnostics.push(builder.build())
      continue
    }

    // Get property schema for type validation
    const schema = getPropertySchema(key)
    if (!schema) continue

    // Validate property value based on type
    validatePropertyValue(key, value, schema, node, diagnostics)
  }

  // Check for conflicting properties
  checkConflictingProperties(presentProps, node, diagnostics)

  // Validate states
  if (node.states) {
    for (const state of node.states) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for (const [key, value] of Object.entries(state.properties)) {
        if (key.startsWith('_')) continue
        if (!isValidProperty(key)) {
          const suggestions = didYouMean(key, PROPERTIES)
          diagnostics.push(
            DiagnosticBuilder
              .warning(ValidatorErrorCodes.UNKNOWN_PROPERTY, 'property')
              .message(`Unknown property "${key}" in state "${state.name}"`)
              .at(state.line || line, column)
              .source(key)
              .suggestAll(suggestions)
              .build()
          )
        }
      }
    }
  }

  // Recursively validate children
  for (const child of node.children) {
    validateNodeProperties(child, diagnostics, sourceLines)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNodeProperties(child, diagnostics, sourceLines)
    }
  }
}

function validatePropertyValue(
  key: string,
  value: unknown,
  schema: ReturnType<typeof getPropertySchema>,
  node: ASTNode,
  diagnostics: ValidationDiagnostic[]
): void {
  if (!schema) return

  const line = node.line || 0
  const column = node.column || 0

  // Skip token references - they'll be validated separately
  if (typeof value === 'string' && value.startsWith('$')) return

  // Skip unresolved token references (object format)
  if (typeof value === 'object' && value !== null &&
      (value as Record<string, unknown>).type === 'token') return

  switch (schema.type) {
    case 'boolean':
      // Boolean properties can be present without value (implicit true)
      // or have explicit true/false
      if (value !== undefined && value !== true && value !== false &&
          value !== 'true' && value !== 'false') {
        diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.PROPERTY_TYPE_MISMATCH, 'property')
            .message(`Property "${key}" expects a boolean, got "${value}"`)
            .at(line, column)
            .withExpectedType('boolean')
            .withActualValue(String(value))
            .build()
        )
      }
      break

    case 'color':
      if (!isValidColor(value)) {
        diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.INVALID_COLOR, 'property')
            .message(`Invalid color value "${value}" for property "${key}"`)
            .at(line, column)
            .withExpectedType('color (#RGB, #RRGGBB, rgb(), hsl())')
            .withActualValue(String(value))
            .suggest('Use hex color', '#3B82F6')
            .build()
        )
      }
      break

    case 'number':
      if (!isValidNumber(value, schema)) {
        // Check if it's a string that should be a number
        if (typeof value === 'string' && !/^\d+(\.\d+)?%?$/.test(value)) {
          diagnostics.push(
            DiagnosticBuilder
              .warning(ValidatorErrorCodes.PROPERTY_TYPE_MISMATCH, 'property')
              .message(`Property "${key}" expects a number, got "${value}"`)
              .at(line, column)
              .withExpectedType('number')
              .withActualValue(String(value))
              .build()
          )
        } else {
          // Value out of range
          const num = typeof value === 'number' ? value : parseFloat(String(value))
          if (schema.minValue !== undefined && num < schema.minValue) {
            diagnostics.push(
              DiagnosticBuilder
                .warning(ValidatorErrorCodes.PROPERTY_VALUE_OUT_OF_RANGE, 'property')
                .message(`Property "${key}" value ${num} is below minimum ${schema.minValue}`)
                .at(line, column)
                .build()
            )
          }
          if (schema.maxValue !== undefined && num > schema.maxValue) {
            diagnostics.push(
              DiagnosticBuilder
                .warning(ValidatorErrorCodes.PROPERTY_VALUE_OUT_OF_RANGE, 'property')
                .message(`Property "${key}" value ${num} exceeds maximum ${schema.maxValue}`)
                .at(line, column)
                .build()
            )
          }
        }
      }
      break

    case 'enum':
      if (schema.enumValues && !schema.enumValues.includes(String(value))) {
        const suggestions = didYouMean(String(value), schema.enumValues)
        diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.INVALID_ENUM_VALUE, 'property')
            .message(`Invalid value "${value}" for "${key}". Valid: ${schema.enumValues.join(', ')}`)
            .at(line, column)
            .withValidOptions(schema.enumValues)
            .suggestAll(suggestions)
            .build()
        )
      }
      break
  }
}

function checkConflictingProperties(
  props: Set<string>,
  node: ASTNode,
  diagnostics: ValidationDiagnostic[]
): void {
  const line = node.line || 0
  const column = node.column || 0

  // hor and ver conflict
  if (props.has('hor') && props.has('ver')) {
    diagnostics.push(
      DiagnosticBuilder
        .warning(ValidatorErrorCodes.CONFLICTING_PROPERTIES, 'property')
        .message('Properties "hor" and "ver" conflict - use one or the other')
        .at(line, column)
        .build()
    )
  }

  // Multiple alignment properties
  const horAligns = ['hor-l', 'hor-cen', 'hor-r'].filter(p => props.has(p))
  if (horAligns.length > 1) {
    diagnostics.push(
      DiagnosticBuilder
        .warning(ValidatorErrorCodes.CONFLICTING_PROPERTIES, 'property')
        .message(`Conflicting horizontal alignments: ${horAligns.join(', ')}`)
        .at(line, column)
        .build()
    )
  }

  const verAligns = ['ver-t', 'ver-cen', 'ver-b'].filter(p => props.has(p))
  if (verAligns.length > 1) {
    diagnostics.push(
      DiagnosticBuilder
        .warning(ValidatorErrorCodes.CONFLICTING_PROPERTIES, 'property')
        .message(`Conflicting vertical alignments: ${verAligns.join(', ')}`)
        .at(line, column)
        .build()
    )
  }
}
