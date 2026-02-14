/**
 * Library Validator
 *
 * Validates library component usage, slots, and multiplicity.
 */

import type { ASTNode, ParseResult } from '../../parser/types'
import type { ValidationResult, ValidationDiagnostic } from '../types'
import { ValidatorErrorCodes } from '../error-codes'
import { DiagnosticBuilder } from '../utils/diagnostic-builder'
import {
  isLibraryComponent,
  getLibrarySchema,
  getValidSlots,
  isMultipleSlot,
  findSimilarSlot,
  findSimilarLibraryComponent
} from '../schemas/library-schema'

// ============================================
// Library Validator
// ============================================

/**
 * Validate all library component usage in the parse result
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateLibraryComponents(result: ParseResult, source?: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []

  // Validate all nodes
  for (const node of result.nodes) {
    validateNode(node, diagnostics, null)
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

function validateNode(
  node: ASTNode,
  diagnostics: ValidationDiagnostic[],
  parentLibrary: string | null
): void {
  const line = node.line || 0
  const column = node.column || 0

  // Get the library type - either from _libraryType or name
  const libraryType = node._libraryType || (node._isLibrary ? node.name : null)

  if (libraryType && isLibraryComponent(libraryType)) {
    // This is a library component - validate its slots
    validateLibrarySlots(node, libraryType, diagnostics)

    // Validate children as potential slots
    for (const child of node.children) {
      validateNode(child, diagnostics, libraryType)
    }
  } else if (parentLibrary) {
    // This node is inside a library component - check if it's a valid slot
    const validSlots = getValidSlots(parentLibrary)

    if (validSlots.length > 0 && !validSlots.includes(node.name)) {
      // Check if it might be a typo
      const similar = findSimilarSlot(parentLibrary, node.name)

      // Only report if the name looks like it could be a slot (starts with uppercase)
      if (node.name[0] === node.name[0].toUpperCase()) {
        const builder = DiagnosticBuilder
          .warning(ValidatorErrorCodes.INVALID_SLOT, 'library')
          .message(`"${node.name}" is not a valid slot for "${parentLibrary}"`)
          .at(line, column)
          .source(node.name)
          .withValidOptions(validSlots)

        if (similar) {
          builder.suggest(`Did you mean "${similar}"?`, similar)
        }

        diagnostics.push(builder.build())
      }
    }

    // Continue validation for nested children
    for (const child of node.children) {
      validateNode(child, diagnostics, parentLibrary)
    }
  } else {
    // Regular component - check if it might be a mistyped library component
    if (node.name[0] === node.name[0].toUpperCase()) {
      const similar = findSimilarLibraryComponent(node.name)
      if (similar && similar.toLowerCase() !== node.name.toLowerCase()) {
        // Only suggest if the case is wrong
        diagnostics.push(
          DiagnosticBuilder
            .info(ValidatorErrorCodes.UNKNOWN_LIBRARY_COMPONENT, 'library')
            .message(`"${node.name}" might be the library component "${similar}"`)
            .at(line, column)
            .suggest(`Use "${similar}"`, similar)
            .build()
        )
      }
    }

    // Continue validation for children
    for (const child of node.children) {
      validateNode(child, diagnostics, null)
    }
  }

  // Validate else children
  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNode(child, diagnostics, parentLibrary)
    }
  }
}

function validateLibrarySlots(
  node: ASTNode,
  libraryType: string,
  diagnostics: ValidationDiagnostic[]
): void {
  const line = node.line || 0
  const schema = getLibrarySchema(libraryType)
  if (!schema) return

  // Count slot occurrences
  const slotCounts = new Map<string, number>()

  for (const child of node.children) {
    const slotName = child.name
    const count = slotCounts.get(slotName) || 0
    slotCounts.set(slotName, count + 1)
  }

  // Check for required slots
  for (const requiredSlot of schema.requiredSlots) {
    if (!slotCounts.has(requiredSlot)) {
      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.MISSING_REQUIRED_SLOT, 'library')
          .message(`Library component "${libraryType}" requires slot "${requiredSlot}"`)
          .at(line, 0)
          .withComponent(libraryType)
          .suggest(`Add ${requiredSlot}`, `${requiredSlot}`)
          .build()
      )
    }
  }

  // Check for slot multiplicity
  for (const [slotName, count] of slotCounts) {
    if (count > 1 && !isMultipleSlot(libraryType, slotName)) {
      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.SLOT_MULTIPLICITY_EXCEEDED, 'library')
          .message(`Slot "${slotName}" can only appear once in "${libraryType}"`)
          .at(line, 0)
          .withComponent(libraryType)
          .build()
      )
    }
  }
}
