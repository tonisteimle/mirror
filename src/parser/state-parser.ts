/**
 * State Parser Module
 *
 * Parses state-related constructs:
 * - State definitions (state open/closed/hover)
 * - Variable declarations (count = 0)
 * - Event handlers (onclick, onhover)
 * - Actions (open, close, toggle, change, assign)
 */

import type { ParserContext } from './parser-context'
import type {
  StateDefinition,
  VariableDeclaration,
  EventHandler,
  ActionStatement,
  Conditional,
  AnimationDefinition
} from './types'
import { parseValue, parseExpression } from './expression-parser'
import { parseCondition } from './condition-parser'
import { ACTION_KEYWORDS, ANIMATION_KEYWORDS, POSITION_KEYWORDS } from '../dsl/properties'

// Helper to check if a token is an action keyword
function isActionKeyword(ctx: ParserContext): boolean {
  const token = ctx.current()
  // ACTION_KEYWORDS are tokenized as COMPONENT_NAME
  // show/hide are also valid actions but tokenized as ANIMATION_ACTION
  return (token?.type === 'COMPONENT_NAME' && ACTION_KEYWORDS.has(token.value)) ||
         (token?.type === 'ANIMATION_ACTION' && (token.value === 'show' || token.value === 'hide'))
}

// Helper to check if a token is a position keyword
// Position keywords can be tokenized as COMPONENT_NAME or PROPERTY (e.g., 'center' is also a flex property)
function isPositionKeyword(ctx: ParserContext): boolean {
  const token = ctx.current()
  return (token?.type === 'COMPONENT_NAME' || token?.type === 'PROPERTY') && POSITION_KEYWORDS.has(token.value)
}

/**
 * Parse a state definition: state name \n properties...
 */
export function parseStateDefinition(ctx: ParserContext, baseIndent: number): StateDefinition | null {
  // Current token should be STATE
  if (ctx.current()?.type !== 'STATE') return null
  const stateLine = ctx.current()!.line
  ctx.advance() // consume 'state'

  // Next should be the state name
  // Accept COMPONENT_NAME or PROPERTY tokens (for system states like 'disabled' which are also properties)
  const currentToken = ctx.current()
  if (currentToken?.type !== 'COMPONENT_NAME' && currentToken?.type !== 'PROPERTY') {
    return null
  }
  const stateName = ctx.advance().value

  const stateDef: StateDefinition = {
    name: stateName,
    properties: {},
    children: [],
    line: stateLine
  }

  // Skip newline
  if (ctx.current()?.type === 'NEWLINE') {
    ctx.advance()
  }

  // Parse state properties (indented lines)
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > baseIndent) {
        ctx.advance() // consume indent

        // Parse property on this line
        if (ctx.current()?.type === 'PROPERTY') {
          const propName = ctx.advance().value
          const val = parseValue(ctx)
          if (val !== null) {
            stateDef.properties[propName] = val
          } else {
            stateDef.properties[propName] = true
          }
        } else if (ctx.current()?.type === 'COMPONENT_NAME') {
          // Could be a child component or content
          ctx.advance() // consume component name
          if (ctx.current()?.type === 'STRING') {
            // It's content for this state
            stateDef.properties['content'] = ctx.advance().value
          }
        }

        if (ctx.current()?.type === 'NEWLINE') {
          ctx.advance()
        }
      } else {
        // Less indent - done with this state
        break
      }
    } else if (token.type === 'NEWLINE') {
      ctx.advance()
    } else {
      // No indent - done with this state
      break
    }
  }

  return stateDef
}

/**
 * Parse a variable declaration: $name = value
 * Variables always use $ prefix for consistency with token references.
 */
export function parseVariableDeclaration(ctx: ParserContext): VariableDeclaration | null {
  // Current should be TOKEN_REF ($variableName)
  if (ctx.current()?.type !== 'TOKEN_REF') return null

  const varName = ctx.current()!.value
  const varLine = ctx.current()!.line

  // Peek ahead to see if next is ASSIGNMENT
  if (ctx.peek(1)?.type !== 'ASSIGNMENT') return null

  ctx.advance() // consume $variable
  ctx.advance() // consume '='

  const value = parseValue(ctx)
  if (value === null) return null

  return {
    name: varName,
    value: value,
    line: varLine
  }
}

/**
 * Parse inline assignment action: $varName = value
 */
function parseInlineAssignment(ctx: ParserContext): ActionStatement | null {
  const token = ctx.current()
  if (!token || token.type !== 'TOKEN_REF') return null

  const name = token.value
  if (ctx.peek(1)?.type !== 'ASSIGNMENT') return null

  const actionLine = token.line
  ctx.advance() // consume $name
  ctx.advance() // consume '='
  const expr = parseExpression(ctx)

  return {
    type: 'assign',
    target: name,
    value: expr ?? undefined,
    line: actionLine
  }
}

/**
 * Parse 'change X to Y' action details.
 */
function parseChangeDetails(ctx: ParserContext, action: ActionStatement): void {
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'to') {
    ctx.advance() // consume 'to'
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      action.toState = ctx.advance().value
    }
  }
}

/**
 * Parse 'assign X to expr' action details.
 */
function parseAssignDetails(ctx: ParserContext, action: ActionStatement): void {
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'to') {
    ctx.advance() // consume 'to'
    const expr = parseExpression(ctx)
    if (expr) {
      action.value = expr
    }
  }
}

/**
 * Parse position, animation, and duration for open/close actions.
 */
function parseOpenCloseDetails(ctx: ParserContext, action: ActionStatement): void {
  if (!ctx.current()) return

  // Position keyword (below, above, left, right, center)
  if (isPositionKeyword(ctx)) {
    action.position = ctx.advance().value as ActionStatement['position']
  }

  // Animation keyword (slide-up, fade, scale, etc.)
  if (ctx.current()?.type === 'ANIMATION') {
    action.animation = ctx.advance().value
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

/**
 * Parse an action: open X, close X, change X to Y, toggle X, assign $var to expr
 */
export function parseAction(ctx: ParserContext): ActionStatement | null {
  const token = ctx.current()
  if (!token) return null

  // Handle inline assignment: $varName = value
  if (token.type === 'TOKEN_REF') {
    return parseInlineAssignment(ctx)
  }

  // Check if it's an action keyword (now tokenized as COMPONENT_NAME)
  if (!isActionKeyword(ctx)) return null

  const actionLine = token.line
  const actionType = ctx.advance().value as ActionStatement['type']

  const action: ActionStatement = {
    type: actionType,
    line: actionLine
  }

  // Parse target
  if (actionType === 'assign') {
    if (ctx.current()?.type === 'TOKEN_REF' || ctx.current()?.type === 'COMPONENT_NAME') {
      action.target = ctx.advance().value
    }
  } else if (actionType === 'alert') {
    // Alert accepts a string message as target
    if (ctx.current()?.type === 'STRING') {
      action.target = ctx.advance().value
    } else if (ctx.current()?.type === 'COMPONENT_NAME') {
      action.target = ctx.advance().value
    }
  } else if (ctx.current()?.type === 'COMPONENT_NAME') {
    action.target = ctx.advance().value
  }

  // Parse action-specific details
  switch (actionType) {
    case 'change':
      parseChangeDetails(ctx, action)
      break
    case 'assign':
      parseAssignDetails(ctx, action)
      break
    case 'open':
    case 'close':
      parseOpenCloseDetails(ctx, action)
      break
  }

  return action
}

/**
 * Parse an event handler: onclick \n actions...
 */
export function parseEventHandler(ctx: ParserContext, baseIndent: number): EventHandler | null {
  if (ctx.current()?.type !== 'EVENT') return null

  const eventLine = ctx.current()!.line
  const eventName = ctx.advance().value // onclick, onhover, etc.

  const handler: EventHandler = {
    event: eventName,
    actions: [],
    line: eventLine
  }

  // Check for inline action on same line
  if (isActionKeyword(ctx)) {
    const action = parseAction(ctx)
    if (action) handler.actions.push(action)
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
          ctx.advance() // consume 'if'
          const condition = parseCondition(ctx)
          if (condition) {
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
              if (actionIndent > indent) {
                ctx.advance() // consume indent
                const action = parseAction(ctx)
                if (action) {
                  conditional.thenActions.push(action)
                }
                if (ctx.current()?.type === 'NEWLINE') {
                  ctx.advance()
                }
              } else {
                break
              }
            }

            handler.actions.push(conditional)
          }
        } else {
          // Regular action
          const action = parseAction(ctx)
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
 * Parse an animation action: show fade slide-up 300, hide fade 200, animate spin 1000
 *
 * Syntax:
 *   show [animation...] [duration]
 *   hide [animation...] [duration]
 *   animate [animation] [duration]
 */
export function parseAnimationAction(ctx: ParserContext): AnimationDefinition | null {
  const token = ctx.current()
  if (!token || token.type !== 'ANIMATION_ACTION') return null

  const actionLine = token.line
  const actionType = ctx.advance().value as 'show' | 'hide' | 'animate'

  const animDef: AnimationDefinition = {
    type: actionType,
    animations: [],
    line: actionLine
  }

  // Parse animation names and duration
  while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
    const current = ctx.current()!

    if (current.type === 'ANIMATION') {
      // Animation keyword (fade, slide-up, spin, etc.)
      animDef.animations.push(ctx.advance().value)
    } else if (current.type === 'COMPONENT_NAME' && ANIMATION_KEYWORDS.has(current.value)) {
      // Animation might be tokenized as COMPONENT_NAME
      animDef.animations.push(ctx.advance().value)
    } else if (current.type === 'NUMBER') {
      // Duration in ms
      animDef.duration = parseInt(ctx.advance().value, 10)
      break // Duration is always last
    } else {
      // Unknown token, stop parsing
      break
    }
  }

  // Default duration if not specified
  if (animDef.duration === undefined) {
    animDef.duration = actionType === 'animate' ? 1000 : 300
  }

  return animDef
}
