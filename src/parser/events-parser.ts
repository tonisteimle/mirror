/**
 * Events Parser Module
 *
 * Parses the centralized `events` block:
 * - Event handlers targeting named instances: `Email onchange`
 * - Property assignments: `Email.value = "x"`
 * - Conditional actions: `if Email.value and Password.value`
 */

import type { ParserContext } from './parser-context'
import type {
  CentralizedEventHandler,
  ActionStatement,
  Conditional
} from './types'
import { parseExpression } from './expression-parser'
import { parseCondition } from './condition-parser'
import { ANIMATION_KEYWORDS, POSITION_KEYWORDS } from '../dsl/properties'

/**
 * Parse the `events` block.
 * Syntax:
 * ```
 * events
 *   Email onchange
 *     Error.visible = false
 *   Submit onclick
 *     if Email.value and Password.value
 *       page Dashboard
 * ```
 */
export function parseEventsBlock(ctx: ParserContext): CentralizedEventHandler[] {
  const handlers: CentralizedEventHandler[] = []

  // Current token should be EVENTS
  if (ctx.current()?.type !== 'EVENTS') return handlers
  ctx.advance() // consume 'events'

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse event handlers (indented lines)
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > 0) {
        ctx.advance() // consume indent

        // Parse: ComponentName event
        // e.g., Email onchange, Submit onclick
        if (ctx.current()?.type === 'COMPONENT_NAME') {
          const handler = parseCentralizedEventHandler(ctx, indent)
          if (handler) {
            handlers.push(handler)
          }
        }

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else {
      // No indent - done with events block
      break
    }
  }

  return handlers
}

/**
 * Parse a centralized event handler.
 * Syntax: `ComponentName event` followed by indented actions
 */
function parseCentralizedEventHandler(ctx: ParserContext, baseIndent: number): CentralizedEventHandler | null {
  const targetLine = ctx.current()!.line
  const targetInstance = ctx.advance().value // ComponentName

  // Next should be an event keyword (onclick, onchange, etc.)
  if (ctx.current()?.type !== 'EVENT') {
    return null
  }
  const eventName = ctx.advance().value

  const handler: CentralizedEventHandler = {
    targetInstance,
    event: eventName,
    actions: [],
    line: targetLine
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse actions in block (indented lines)
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > baseIndent) {
        ctx.advance() // consume indent

        // Check for conditional: if ...
        if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'if') {
          const conditional = parseConditionalBlock(ctx, indent)
          if (conditional) {
            handler.actions.push(conditional)
          }
        }
        // Check for property assignment: Component.property = value
        else if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.peek(1)?.type === 'ASSIGNMENT') {
          const action = parsePropertyAssignment(ctx)
          if (action) {
            handler.actions.push(action)
          }
        }
        // Check for action keyword (open, close, toggle, page, etc.)
        else if (ctx.current()?.type === 'ACTION') {
          const action = parseActionStatement(ctx)
          if (action) {
            handler.actions.push(action)
          }
        }

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        // Less indent - done with handler
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else {
      break
    }
  }

  return handler
}

/**
 * Parse a conditional block within centralized events.
 * Syntax: `if condition` followed by indented then-actions, optionally followed by `else` block
 */
function parseConditionalBlock(ctx: ParserContext, baseIndent: number): Conditional | null {
  ctx.advance() // consume 'if'
  const condition = parseCondition(ctx)
  if (!condition) return null

  const conditional: Conditional = {
    condition,
    thenActions: [],
    line: ctx.current()?.line
  }

  // Skip newline after condition
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse then-actions (deeper indent)
  while (ctx.current()?.type === 'INDENT') {
    const actionIndent = parseInt(ctx.current()!.value, 10)
    if (actionIndent > baseIndent) {
      ctx.advance() // consume indent

      // Check for property assignment
      if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.peek(1)?.type === 'ASSIGNMENT') {
        const action = parsePropertyAssignment(ctx)
        if (action) {
          conditional.thenActions.push(action)
        }
      }
      // Check for action keyword
      else if (ctx.current()?.type === 'ACTION') {
        const action = parseActionStatement(ctx)
        if (action) {
          conditional.thenActions.push(action)
        }
      }

      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  // Check for 'else'
  if (ctx.current()?.type === 'INDENT') {
    const elseIndent = parseInt(ctx.current()!.value, 10)
    if (elseIndent === baseIndent) {
      const savedPos = ctx.pos
      ctx.advance() // consume indent

      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance() // consume 'else'
        conditional.elseActions = []

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }

        // Parse else-actions
        while (ctx.current()?.type === 'INDENT') {
          const actionIndent = parseInt(ctx.current()!.value, 10)
          if (actionIndent > baseIndent) {
            ctx.advance() // consume indent

            if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.peek(1)?.type === 'ASSIGNMENT') {
              const action = parsePropertyAssignment(ctx)
              if (action) {
                conditional.elseActions.push(action)
              }
            } else if (ctx.current()?.type === 'ACTION') {
              const action = parseActionStatement(ctx)
              if (action) {
                conditional.elseActions.push(action)
              }
            }

            if (ctx.current()?.type === 'NEWLINE') {
              ctx.advance()
            }
          } else {
            break
          }
        }
      } else {
        ctx.pos = savedPos // rewind
      }
    }
  }

  return conditional
}

/**
 * Parse a property assignment: Component.property = value
 * e.g., Email.value = "test", Submit.disabled = true
 */
function parsePropertyAssignment(ctx: ParserContext): ActionStatement | null {
  const line = ctx.current()!.line
  const componentName = ctx.advance().value // Component name

  // Consume the '='
  if (ctx.current()?.type !== 'ASSIGNMENT') {
    return null
  }
  ctx.advance()

  // Parse the value expression
  const expr = parseExpression(ctx)

  return {
    type: 'set_property',
    componentName,
    propertyName: undefined, // Will be extracted from componentName if it contains a dot
    value: expr ?? undefined,
    line
  }
}

/**
 * Parse an action statement: open, close, toggle, page, etc.
 */
function parseActionStatement(ctx: ParserContext): ActionStatement | null {
  const line = ctx.current()!.line
  const actionType = ctx.advance().value // open, close, toggle, page, etc.

  const action: ActionStatement = {
    type: actionType as ActionStatement['type'],
    line
  }

  // Get target (component name)
  if (ctx.current()?.type === 'COMPONENT_NAME') {
    action.target = ctx.advance().value
  }

  // For 'change X to Y'
  if (actionType === 'change' && ctx.current()?.type === 'ACTION' && ctx.current()?.value === 'to') {
    ctx.advance() // consume 'to'
    if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'ACTION') {
      action.toState = ctx.advance().value
    }
  }

  // For open/close: optionally parse position, animation and duration
  if ((actionType === 'open' || actionType === 'close') && ctx.current()) {
    // Position keyword (below, above, left, right, center)
    if (ctx.current()?.type === 'POSITION') {
      action.position = ctx.advance().value as ActionStatement['position']
    } else if (ctx.current()?.type === 'COMPONENT_NAME' && POSITION_KEYWORDS.has(ctx.current()!.value)) {
      action.position = ctx.advance().value as ActionStatement['position']
    }

    // Animation keyword (slide-up, fade, scale, etc.)
    if (ctx.current()?.type === 'ANIMATION') {
      action.animation = ctx.advance().value
      // Optional: duration in ms
      if (ctx.current()?.type === 'NUMBER') {
        action.duration = parseInt(ctx.advance().value, 10)
      }
    } else if (ctx.current()?.type === 'COMPONENT_NAME' || ctx.current()?.type === 'PROPERTY') {
      const maybeAnimation = ctx.current()!.value
      if (ANIMATION_KEYWORDS.has(maybeAnimation)) {
        action.animation = ctx.advance().value
        if (ctx.current()?.type === 'NUMBER') {
          action.duration = parseInt(ctx.advance().value, 10)
        }
      }
    }
  }

  return action
}
