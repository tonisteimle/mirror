/**
 * State Validator
 *
 * Validates state definitions and references.
 */

import type { ASTNode, ParseResult, ActionStatement } from '../../parser/types'
import type { ValidationResult, ValidationDiagnostic } from '../types'
import { ValidatorErrorCodes } from '../error-codes'
import { DiagnosticBuilder } from '../utils/diagnostic-builder'
import { isSystemState } from '../schemas/event-schema'

// ============================================
// State Validator
// ============================================

/**
 * Validate all state definitions and references in the parse result
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateStates(result: ParseResult, source?: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []

  // Collect all defined states per component
  const componentStates = new Map<string, Set<string>>()

  // First pass: collect state definitions
  for (const node of result.nodes) {
    collectStates(node, componentStates)
  }

  // Second pass: validate state references
  for (const node of result.nodes) {
    validateNodeStates(node, componentStates, diagnostics)
  }

  // Validate centralized events
  for (const handler of result.centralizedEvents) {
    for (const action of handler.actions) {
      if ('type' in action) {
        validateActionStateRef(
          action as ActionStatement,
          componentStates,
          handler.line || 0,
          diagnostics
        )
      }
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

function collectStates(node: ASTNode, componentStates: Map<string, Set<string>>): void {
  const name = node.instanceName || node.name

  if (node.states && node.states.length > 0) {
    const states = componentStates.get(name) || new Set()

    for (const state of node.states) {
      states.add(state.name)
    }

    componentStates.set(name, states)
  }

  // Recursively collect from children
  for (const child of node.children) {
    collectStates(child, componentStates)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      collectStates(child, componentStates)
    }
  }
}

function validateNodeStates(
  node: ASTNode,
  componentStates: Map<string, Set<string>>,
  diagnostics: ValidationDiagnostic[]
): void {
  const line = node.line || 0
  const name = node.instanceName || node.name

  // Validate state definitions
  if (node.states) {
    const seenStates = new Set<string>()

    for (const state of node.states) {
      // Check for duplicate state definitions
      if (seenStates.has(state.name)) {
        diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.DUPLICATE_STATE, 'state')
            .message(`Duplicate state definition "${state.name}"`)
            .at(state.line || line, 0)
            .source(state.name)
            .build()
        )
      }
      seenStates.add(state.name)

      // Check for reserved system states
      if (isSystemState(state.name)) {
        diagnostics.push(
          DiagnosticBuilder
            .info(ValidatorErrorCodes.RESERVED_STATE, 'state')
            .message(`State "${state.name}" is a system state and is automatically handled`)
            .at(state.line || line, 0)
            .source(state.name)
            .build()
        )
      }

      // Check for empty state definitions
      const hasProperties = Object.keys(state.properties).filter(k => !k.startsWith('_')).length > 0
      const hasChildren = state.children && state.children.length > 0

      if (!hasProperties && !hasChildren) {
        diagnostics.push(
          DiagnosticBuilder
            .info(ValidatorErrorCodes.EMPTY_STATE, 'state')
            .message(`State "${state.name}" has no properties or children`)
            .at(state.line || line, 0)
            .build()
        )
      }
    }
  }

  // Validate event handler state references
  if (node.eventHandlers) {
    for (const handler of node.eventHandlers) {
      for (const action of handler.actions) {
        if ('type' in action) {
          validateActionStateRef(
            action as ActionStatement,
            componentStates,
            handler.line || line,
            diagnostics,
            name
          )
        }
      }
    }
  }

  // Recursively validate children
  for (const child of node.children) {
    validateNodeStates(child, componentStates, diagnostics)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNodeStates(child, componentStates, diagnostics)
    }
  }
}

function validateActionStateRef(
  action: ActionStatement,
  componentStates: Map<string, Set<string>>,
  line: number,
  diagnostics: ValidationDiagnostic[],
  currentComponent?: string
): void {
  // Only 'change' action references states
  if (action.type !== 'change' || !action.toState) return

  const targetComponent = action.target === 'self' ? currentComponent : action.target

  if (targetComponent) {
    const states = componentStates.get(targetComponent)

    if (states && !states.has(action.toState)) {
      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.UNDEFINED_STATE, 'state')
          .message(`State "${action.toState}" is not defined on component "${targetComponent}"`)
          .at(action.line || line, 0)
          .source(action.toState)
          .withValidOptions(Array.from(states))
          .build()
      )
    }
  }
}
