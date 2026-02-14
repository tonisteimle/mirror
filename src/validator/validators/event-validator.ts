/**
 * Event Validator
 *
 * Validates event handler names.
 */

import type { ASTNode, ParseResult } from '../../parser/types'
import type { ValidationResult, ValidationDiagnostic } from '../types'
import { ValidatorErrorCodes } from '../error-codes'
import { DiagnosticBuilder } from '../utils/diagnostic-builder'
import { didYouMean } from '../utils/suggestion-engine'
import { isValidEvent, getValidEvents, findSimilarEvent } from '../schemas/event-schema'

// ============================================
// Event Validator
// ============================================

/**
 * Validate all event handlers in the parse result
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateEvents(result: ParseResult, source?: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []

  // Validate events on nodes
  for (const node of result.nodes) {
    validateNodeEvents(node, diagnostics)
  }

  // Validate centralized events
  for (const handler of result.centralizedEvents) {
    if (!isValidEvent(handler.event)) {
      const similar = findSimilarEvent(handler.event)
      const builder = DiagnosticBuilder
        .warning(ValidatorErrorCodes.UNKNOWN_EVENT, 'event')
        .message(`Unknown event "${handler.event}"`)
        .at(handler.line || 0, 0)
        .source(handler.event)
        .withValidOptions(getValidEvents())

      if (similar) {
        builder.suggest(`Did you mean "${similar}"?`, similar)
      }

      diagnostics.push(builder.build())
    }
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

function validateNodeEvents(node: ASTNode, diagnostics: ValidationDiagnostic[]): void {
  const line = node.line || 0

  if (node.eventHandlers) {
    const seenEvents = new Set<string>()

    for (const handler of node.eventHandlers) {
      // Check for valid event name
      if (!isValidEvent(handler.event)) {
        const similar = findSimilarEvent(handler.event)
        const suggestions = similar
          ? [{ label: `Did you mean "${similar}"?`, replacement: similar }]
          : didYouMean(handler.event, getValidEvents())

        diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.UNKNOWN_EVENT, 'event')
            .message(`Unknown event "${handler.event}"`)
            .at(handler.line || line, 0)
            .source(handler.event)
            .withValidOptions(getValidEvents())
            .suggestAll(suggestions)
            .build()
        )
      }

      // Check for duplicate event handlers
      if (seenEvents.has(handler.event)) {
        diagnostics.push(
          DiagnosticBuilder
            .info(ValidatorErrorCodes.DUPLICATE_EVENT_HANDLER, 'event')
            .message(`Duplicate handler for event "${handler.event}"`)
            .at(handler.line || line, 0)
            .build()
        )
      }
      seenEvents.add(handler.event)
    }
  }

  // Recursively validate children
  for (const child of node.children) {
    validateNodeEvents(child, diagnostics)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNodeEvents(child, diagnostics)
    }
  }
}
