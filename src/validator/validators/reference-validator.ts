/**
 * Reference Validator
 *
 * Validates token references ($var) and component references (Component.prop).
 */

import type { ASTNode, ParseResult, Expression, ActionStatement, ConditionExpr, ComponentTemplate } from '../../parser/types'
import type { ValidationResult, ValidationDiagnostic } from '../types'
import { ValidatorErrorCodes } from '../error-codes'
import { DiagnosticBuilder } from '../utils/diagnostic-builder'
import { didYouMean } from '../utils/suggestion-engine'

// ============================================
// Reference Validator
// ============================================

/**
 * Validate all references in the parse result
 */
export function validateReferences(result: ParseResult, source?: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = []
  const sourceLines = source?.split('\n') || []

  // Collect defined tokens
  const definedTokens = new Set(result.tokens.keys())

  // Collect defined components (templates + named instances)
  const definedComponents = new Set(result.registry.keys())

  // Track all component names and instance names
  const allNames = new Set<string>()
  collectAllNames(result.nodes, allNames)

  // Validate all nodes
  for (const node of result.nodes) {
    validateNodeReferences(node, {
      definedTokens,
      definedComponents,
      allNames,
      diagnostics,
      sourceLines
    })
  }

  // Validate component templates in registry
  for (const [, template] of result.registry) {
    validateTemplateReferences(template, {
      definedTokens,
      definedComponents,
      allNames,
      diagnostics,
      sourceLines
    })
  }

  // Validate centralized events
  for (const handler of result.centralizedEvents) {
    if (!allNames.has(handler.targetInstance) && !definedComponents.has(handler.targetInstance)) {
      diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.UNDEFINED_COMPONENT, 'reference')
          .message(`Component "${handler.targetInstance}" is not defined`)
          .at(handler.line || 0, 0)
          .suggest('Define the component', `${handler.targetInstance}: ...`)
          .build()
      )
    }

    // Validate actions in the handler
    for (const action of handler.actions) {
      if ('type' in action) {
        validateActionReferences(action as ActionStatement, {
          definedTokens,
          definedComponents,
          allNames,
          diagnostics,
          sourceLines,
          line: handler.line || 0
        })
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

interface ValidationContext {
  definedTokens: Set<string>
  definedComponents: Set<string>
  allNames: Set<string>
  diagnostics: ValidationDiagnostic[]
  sourceLines: string[]
  line?: number
}

function collectAllNames(nodes: ASTNode[], names: Set<string>): void {
  for (const node of nodes) {
    names.add(node.name)
    if (node.instanceName) {
      names.add(node.instanceName)
    }
    collectAllNames(node.children, names)
    if (node.elseChildren) {
      collectAllNames(node.elseChildren, names)
    }
  }
}

function validateNodeReferences(node: ASTNode, ctx: ValidationContext): void {
  const line = node.line || 0
  const column = node.column || 0

  // Check property values for token references
  // Token references can be:
  // 1. Strings starting with "$" (legacy/simple format)
  // 2. Objects { type: 'token', name: 'tokenName' } (unresolved references)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [key, value] of Object.entries(node.properties)) {
    // Extract token name from either format
    let tokenName: string | null = null

    if (typeof value === 'string' && value.startsWith('$')) {
      tokenName = value.slice(1)
    } else if (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<string, unknown>).type === 'token' &&
      typeof (value as Record<string, unknown>).name === 'string'
    ) {
      // Unresolved token reference object
      tokenName = (value as { type: 'token'; name: string }).name
    }

    if (tokenName) {
      // Check if token is defined
      // For dotted tokens like $control.bg, check if full name exists
      // Skip dynamic path references like $item.name (from iteration variables)
      const isIterationVariable = node.iteration?.itemVar === tokenName.split('.')[0]
      const isDataPath = tokenName.split('.')[0] === 'event' || tokenName.split('.')[0] === 'item'

      if (!isIterationVariable && !isDataPath && !ctx.definedTokens.has(tokenName)) {
        const suggestions = didYouMean(tokenName, ctx.definedTokens)
        ctx.diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.UNDEFINED_TOKEN, 'reference')
            .message(`Token "$${tokenName}" is not defined`)
            .at(line, column)
            .source(`$${tokenName}`)
            .suggestAll(suggestions)
            .suggest('Define the token', `$${tokenName}: <value>`)
            .build()
        )
      }
    }

    // Check for component property references (Card.rad)
    if (typeof value === 'string' && value.includes('.') && !value.startsWith('$')) {
      const parts = value.split('.')
      if (parts.length === 2) {
        const [compName] = parts
        if (!ctx.allNames.has(compName) && !ctx.definedComponents.has(compName)) {
          ctx.diagnostics.push(
            DiagnosticBuilder
              .warning(ValidatorErrorCodes.UNDEFINED_COMPONENT, 'reference')
              .message(`Component "${compName}" is not defined`)
              .at(line, column)
              .source(value)
              .build()
          )
        }
      }
    }
  }

  // Check iteration variable
  if (node.iteration) {
    const collectionVar = node.iteration.collectionVar
    if (!ctx.definedTokens.has(collectionVar)) {
      ctx.diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.UNDEFINED_TOKEN, 'reference')
          .message(`Collection variable "$${collectionVar}" is not defined`)
          .at(line, column)
          .source(`$${collectionVar}`)
          .suggest('Define the collection', `$${collectionVar}: [...]`)
          .build()
      )
    }
  }

  // Check condition references
  if (node.condition) {
    validateConditionReferences(node.condition, { ...ctx, line })
  }

  // Check event handlers
  if (node.eventHandlers) {
    for (const handler of node.eventHandlers) {
      for (const action of handler.actions) {
        if ('type' in action) {
          validateActionReferences(action as ActionStatement, { ...ctx, line: handler.line || line })
        } else if ('condition' in action) {
          // Conditional action
          const conditional = action as { condition: ConditionExpr; thenActions: ActionStatement[]; elseActions?: ActionStatement[] }
          validateConditionReferences(conditional.condition, { ...ctx, line: handler.line || line })
          for (const a of conditional.thenActions) {
            validateActionReferences(a, { ...ctx, line: handler.line || line })
          }
          if (conditional.elseActions) {
            for (const a of conditional.elseActions) {
              validateActionReferences(a, { ...ctx, line: handler.line || line })
            }
          }
        }
      }
    }
  }

  // Recursively validate children
  for (const child of node.children) {
    validateNodeReferences(child, ctx)
  }

  if (node.elseChildren) {
    for (const child of node.elseChildren) {
      validateNodeReferences(child, ctx)
    }
  }
}

/**
 * Validate token references in component templates (from registry)
 */
function validateTemplateReferences(template: ComponentTemplate, ctx: ValidationContext): void {
  const line = template.line || 0

  // Check property values for token references
  for (const [key, value] of Object.entries(template.properties)) {
    // Extract token name from either format (string or object)
    let tokenName: string | null = null

    if (typeof value === 'string' && value.startsWith('$')) {
      tokenName = value.slice(1)
    } else if (
      typeof value === 'object' &&
      value !== null &&
      (value as Record<string, unknown>).type === 'token' &&
      typeof (value as Record<string, unknown>).name === 'string'
    ) {
      tokenName = (value as { type: 'token'; name: string }).name
    }

    if (tokenName) {
      // Skip dynamic path references like $item.name, $event.value
      const isDataPath = tokenName.split('.')[0] === 'event' || tokenName.split('.')[0] === 'item'

      if (!isDataPath && !ctx.definedTokens.has(tokenName)) {
        const suggestions = didYouMean(tokenName, ctx.definedTokens)
        ctx.diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.UNDEFINED_TOKEN, 'reference')
            .message(`Token "$${tokenName}" is not defined`)
            .at(line, 0)
            .source(`$${tokenName}`)
            .suggestAll(suggestions)
            .suggest('Define the token', `$${tokenName}: <value>`)
            .build()
        )
      }
    }
  }

  // Recursively validate children
  for (const child of template.children) {
    validateNodeReferences(child, ctx)
  }

  // Validate states
  if (template.states) {
    for (const state of template.states) {
      for (const [key, value] of Object.entries(state.properties)) {
        let tokenName: string | null = null

        if (typeof value === 'string' && value.startsWith('$')) {
          tokenName = value.slice(1)
        } else if (
          typeof value === 'object' &&
          value !== null &&
          (value as Record<string, unknown>).type === 'token' &&
          typeof (value as Record<string, unknown>).name === 'string'
        ) {
          tokenName = (value as { type: 'token'; name: string }).name
        }

        if (tokenName && !ctx.definedTokens.has(tokenName)) {
          const suggestions = didYouMean(tokenName, ctx.definedTokens)
          ctx.diagnostics.push(
            DiagnosticBuilder
              .warning(ValidatorErrorCodes.UNDEFINED_TOKEN, 'reference')
              .message(`Token "$${tokenName}" is not defined`)
              .at(line, 0)
              .source(`$${tokenName}`)
              .suggestAll(suggestions)
              .build()
          )
        }
      }
    }
  }
}

function validateConditionReferences(cond: ConditionExpr, ctx: ValidationContext): void {
  switch (cond.type) {
    case 'var':
      // Variable references in conditions are often runtime state, so just info level
      break
    case 'not':
      if (cond.operand) validateConditionReferences(cond.operand, ctx)
      break
    case 'and':
    case 'or':
    case 'comparison':
      if (cond.left) validateConditionReferences(cond.left, ctx)
      if (cond.right) validateConditionReferences(cond.right, ctx)
      break
  }
}

function validateActionReferences(action: ActionStatement, ctx: ValidationContext): void {
  const line = ctx.line || action.line || 0

  // Check action target
  if (action.target) {
    // For 'open', 'show', 'hide', 'change', 'page' - target should be defined
    const actionsNeedingTarget = ['open', 'show', 'hide', 'change', 'page']
    if (actionsNeedingTarget.includes(action.type)) {
      if (action.target !== 'self' &&
          !ctx.allNames.has(action.target) &&
          !ctx.definedComponents.has(action.target)) {
        const suggestions = didYouMean(action.target, ctx.allNames)
        ctx.diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.UNDEFINED_ACTION_TARGET, 'reference')
            .message(`Action target "${action.target}" is not defined`)
            .at(line, 0)
            .source(action.target)
            .suggestAll(suggestions)
            .build()
        )
      }
    }
  }

  // Check assign value for token references
  if (action.type === 'assign' && action.value) {
    validateExpressionReferences(action.value, ctx, line)
  }
}

function validateExpressionReferences(
  value: string | number | boolean | Expression,
  ctx: ValidationContext,
  line: number
): void {
  if (typeof value === 'object' && value !== null) {
    const expr = value as Expression

    if (expr.type === 'variable' && expr.name) {
      if (!ctx.definedTokens.has(expr.name)) {
        // This could be a state variable, so just info level
      }
    }

    if (expr.type === 'component_property') {
      if (expr.componentName && !ctx.allNames.has(expr.componentName) && !ctx.definedComponents.has(expr.componentName)) {
        ctx.diagnostics.push(
          DiagnosticBuilder
            .warning(ValidatorErrorCodes.UNDEFINED_COMPONENT, 'reference')
            .message(`Component "${expr.componentName}" is not defined`)
            .at(line, 0)
            .build()
        )
      }
    }

    if (expr.left) validateExpressionReferences(expr.left, ctx, line)
    if (expr.right) validateExpressionReferences(expr.right, ctx, line)
    if (expr.operand) validateExpressionReferences(expr.operand, ctx, line)
  } else if (typeof value === 'string' && value.startsWith('$')) {
    const tokenName = value.slice(1)
    // Skip dynamic path references like $item.name, $event.value
    const isDataPath = tokenName.split('.')[0] === 'event' || tokenName.split('.')[0] === 'item'

    if (!isDataPath && !ctx.definedTokens.has(tokenName)) {
      ctx.diagnostics.push(
        DiagnosticBuilder
          .warning(ValidatorErrorCodes.UNDEFINED_TOKEN, 'reference')
          .message(`Token "$${tokenName}" is not defined`)
          .at(line, 0)
          .source(`$${tokenName}`)
          .build()
      )
    }
  }
}
