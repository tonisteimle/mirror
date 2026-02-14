/**
 * Action Validator
 *
 * Validates action syntax, targets, animations, and positions.
 */

import type { ASTNode, ParseResult, ActionStatement, Conditional } from '../../parser/types'
import type { ValidationResult, ValidationDiagnostic } from '../types'
import { ValidatorErrorCodes } from '../error-codes'
import { DiagnosticBuilder } from '../utils/diagnostic-builder'
import { didYouMean } from '../utils/suggestion-engine'
import {
  isValidAction,
  getActionSchema,
  getValidActions,
  findSimilarAction,
  isValidAnimation,
  getValidAnimations,
  findSimilarAnimation,
  isValidPosition,
  getValidPositions,
  findSimilarPosition
} from '../schemas/event-schema'

// ============================================
// Action Validator
// ============================================

/**
 * Validate all actions in the parse result
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateActions(result: ParseResult, source?: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []

  // Validate actions on nodes
  for (const node of result.nodes) {
    validateNodeActions(node, diagnostics)
  }

  // Validate centralized events
  for (const handler of result.centralizedEvents) {
    for (const action of handler.actions) {
      validateAction(action, handler.line || 0, diagnostics)
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

function validateNodeActions(node: ASTNode, diagnostics: ValidationDiagnostic[]): void {
  const line = node.line || 0

  if (node.eventHandlers) {
    for (const handler of node.eventHandlers) {
      for (const action of handler.actions) {
        validateAction(action, handler.line || line, diagnostics)
      }
    }
  }

  // Recursively validate children
  for (const child of node.children) {
    validateNodeActions(child, diagnostics)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNodeActions(child, diagnostics)
    }
  }
}

function validateAction(
  action: ActionStatement | Conditional,
  line: number,
  diagnostics: ValidationDiagnostic[]
): void {
  // Handle conditional actions
  if ('condition' in action) {
    const conditional = action as Conditional
    for (const a of conditional.thenActions) {
      validateActionStatement(a, conditional.line || line, diagnostics)
    }
    if (conditional.elseActions) {
      for (const a of conditional.elseActions) {
        validateActionStatement(a, conditional.line || line, diagnostics)
      }
    }
    return
  }

  validateActionStatement(action as ActionStatement, line, diagnostics)
}

function validateActionStatement(
  action: ActionStatement,
  line: number,
  diagnostics: ValidationDiagnostic[]
): void {
  const actionLine = action.line || line

  // Validate action type
  if (!isValidAction(action.type)) {
    const similar = findSimilarAction(action.type)
    const suggestions = similar
      ? [{ label: `Did you mean "${similar}"?`, replacement: similar }]
      : didYouMean(action.type, getValidActions())

    diagnostics.push(
      DiagnosticBuilder
        .error(ValidatorErrorCodes.UNKNOWN_ACTION, 'action')
        .message(`Unknown action "${action.type}"`)
        .at(actionLine, 0)
        .source(action.type)
        .withValidOptions(getValidActions())
        .suggestAll(suggestions)
        .build()
    )
    return
  }

  // Get action schema for further validation
  const schema = getActionSchema(action.type)
  if (!schema) return

  // Check required target
  if (schema.requiresTarget && !action.target) {
    diagnostics.push(
      DiagnosticBuilder
        .error(ValidatorErrorCodes.MISSING_ACTION_TARGET, 'action')
        .message(`Action "${action.type}" requires a target`)
        .at(actionLine, 0)
        .suggest('Add target', `${action.type} ComponentName`)
        .build()
    )
  }

  // Check required state for 'change' action
  if (schema.requiresState && !action.toState) {
    diagnostics.push(
      DiagnosticBuilder
        .error(ValidatorErrorCodes.MISSING_CHANGE_TO, 'action')
        .message('Action "change" requires "to" followed by state name')
        .at(actionLine, 0)
        .suggest('Add state', 'change self to stateName')
        .build()
    )
  }

  // Validate animation if present
  if (action.animation && schema.supportsAnimation) {
    if (!isValidAnimation(action.animation)) {
      const similar = findSimilarAnimation(action.animation)
      const suggestions = similar
        ? [{ label: `Did you mean "${similar}"?`, replacement: similar }]
        : didYouMean(action.animation, getValidAnimations())

      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.INVALID_ACTION_ANIMATION, 'action')
          .message(`Invalid animation "${action.animation}"`)
          .at(actionLine, 0)
          .source(action.animation)
          .withValidOptions(getValidAnimations())
          .suggestAll(suggestions)
          .build()
      )
    }
  } else if (action.animation && !schema.supportsAnimation) {
    diagnostics.push(
      DiagnosticBuilder
        .info(ValidatorErrorCodes.INVALID_ACTION_ANIMATION, 'action')
        .message(`Action "${action.type}" does not support animations`)
        .at(actionLine, 0)
        .build()
    )
  }

  // Validate position if present
  if (action.position && schema.supportsPosition) {
    if (!isValidPosition(action.position)) {
      const similar = findSimilarPosition(action.position)
      const suggestions = similar
        ? [{ label: `Did you mean "${similar}"?`, replacement: similar }]
        : didYouMean(action.position, getValidPositions())

      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.INVALID_ACTION_POSITION, 'action')
          .message(`Invalid position "${action.position}"`)
          .at(actionLine, 0)
          .source(action.position)
          .withValidOptions(getValidPositions())
          .suggestAll(suggestions)
          .build()
      )
    }
  } else if (action.position && !schema.supportsPosition) {
    diagnostics.push(
      DiagnosticBuilder
        .info(ValidatorErrorCodes.INVALID_ACTION_POSITION, 'action')
        .message(`Action "${action.type}" does not support positions`)
        .at(actionLine, 0)
        .build()
    )
  }

  // Validate duration if present
  if (action.duration !== undefined && schema.supportsDuration) {
    if (typeof action.duration !== 'number' || action.duration < 0) {
      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.INVALID_ACTION_DURATION, 'action')
          .message('Duration must be a positive number in milliseconds')
          .at(actionLine, 0)
          .build()
      )
    }
  }
}
