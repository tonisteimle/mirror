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
import { parseAction } from './state-parser'
import { ACTION_KEYWORDS, KEY_MODIFIERS } from '../dsl/properties'

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
 * Syntax: `ComponentName event [modifier]` followed by indented actions
 * Examples:
 *   Button onclick
 *   Input onkeydown escape
 *   Menu onclick-outside
 */
function parseCentralizedEventHandler(ctx: ParserContext, baseIndent: number): CentralizedEventHandler | null {
  const targetLine = ctx.current()!.line
  const targetInstance = ctx.advance().value // ComponentName

  // Next should be an event keyword (onclick, onchange, onkeydown, onclick-outside, etc.)
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

  // Check for key modifier after onkeydown/onkeyup: onkeydown escape
  if ((eventName === 'onkeydown' || eventName === 'onkeyup') && ctx.current()?.type === 'COMPONENT_NAME') {
    const possibleModifier = ctx.current()!.value.toLowerCase()
    if (KEY_MODIFIERS.has(possibleModifier)) {
      handler.modifier = ctx.advance().value.toLowerCase()
    }
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
        } else {
          // Property assignment or action keyword
          const action = parseEventAction(ctx)
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
 * Parse a single event action (property assignment or action keyword).
 */
function parseEventAction(ctx: ParserContext): ActionStatement | null {
  // Check for property assignment: Component.property = value
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.peek(1)?.type === 'ASSIGNMENT') {
    return parsePropertyAssignment(ctx)
  }
  // Check for action keyword: open, close, toggle, etc.
  // Note: Most action keywords are tokenized as COMPONENT_NAME, but show/hide/animate
  // are tokenized as ANIMATION_ACTION (they're in ANIMATION_ACTION_KEYWORDS)
  const token = ctx.current()
  if (token && ACTION_KEYWORDS.has(token.value)) {
    if (token.type === 'COMPONENT_NAME' || token.type === 'ANIMATION_ACTION') {
      return parseAction(ctx)
    }
  }
  return null
}

/**
 * Parse actions in an indented block until indent decreases.
 */
function parseActionsBlock(ctx: ParserContext, baseIndent: number): ActionStatement[] {
  const actions: ActionStatement[] = []

  while (ctx.current()?.type === 'INDENT') {
    const actionIndent = parseInt(ctx.current()!.value, 10)
    if (actionIndent > baseIndent) {
      ctx.advance() // consume indent

      const action = parseEventAction(ctx)
      if (action) {
        actions.push(action)
      }

      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    } else {
      break
    }
  }

  return actions
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

  // Parse then-actions
  conditional.thenActions = parseActionsBlock(ctx, baseIndent)

  // Check for 'else'
  if (ctx.current()?.type === 'INDENT') {
    const elseIndent = parseInt(ctx.current()!.value, 10)
    if (elseIndent === baseIndent) {
      const savedPos = ctx.pos
      ctx.advance() // consume indent

      if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'else') {
        ctx.advance() // consume 'else'

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }

        // Parse else-actions
        conditional.elseActions = parseActionsBlock(ctx, baseIndent)
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
