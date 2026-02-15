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
import { isActionType } from './types'
import { parseValue, parseExpression } from './expression-parser'
import { parseCondition } from './condition-parser'
import { ACTION_KEYWORDS, ANIMATION_KEYWORDS, POSITION_KEYWORDS, BEHAVIOR_TARGETS, KEY_MODIFIERS } from '../dsl/properties'

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

        // Parse ALL properties on this line (multiple properties like: bg #3B82F6 col #FFF)
        while (ctx.current() && ctx.current()!.type !== 'NEWLINE' && ctx.current()!.type !== 'EOF') {
          if (ctx.current()?.type === 'PROPERTY') {
            const propName = ctx.advance().value

            // Handle directional properties: mar l 0, pad t-b 8, etc.
            if (ctx.current()?.type === 'DIRECTION') {
              const directions: string[] = []
              while (ctx.current()?.type === 'DIRECTION') {
                // Split combined directions like 'l-r' into ['l', 'r']
                const dir = ctx.advance().value
                if (dir.includes('-')) {
                  directions.push(...dir.split('-'))
                } else {
                  directions.push(dir)
                }
              }
              // Get the value for these directions
              const val = parseValue(ctx)
              if (val !== null) {
                for (const dir of directions) {
                  stateDef.properties[`${propName}-${dir}`] = val
                }
              }
            } else {
              // Regular property with value
              const val = parseValue(ctx)
              if (val !== null) {
                stateDef.properties[propName] = val
              } else {
                stateDef.properties[propName] = true
              }
            }
          } else if (ctx.current()?.type === 'STRING') {
            // Direct string content for this state (e.g., "Light Mode")
            stateDef.properties['content'] = ctx.advance().value
          } else if (ctx.current()?.type === 'COMPONENT_NAME') {
            // Could be a child component or content
            ctx.advance() // consume component name
            if (ctx.current()?.type === 'STRING') {
              // It's content for this state
              stateDef.properties['content'] = ctx.advance().value
            }
          } else {
            // Unknown token, stop parsing this line
            break
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
 * Parse a behavior state definition: highlight \n properties...
 * The keyword IS the state name (no separate name token).
 * This creates a direct 1:1 mapping between action and state name.
 */
export function parseBehaviorStateDefinition(ctx: ParserContext, baseIndent: number): StateDefinition | null {
  // Current token should be COMPONENT_NAME with a behavior state keyword value
  const currentToken = ctx.current()
  if (currentToken?.type !== 'COMPONENT_NAME') return null

  const stateName = ctx.advance().value // The keyword IS the state name
  const stateLine = currentToken.line

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

  // Parse state properties (indented lines) - same logic as parseStateDefinition
  while (ctx.current() && ctx.current()!.type !== 'EOF') {
    const token = ctx.current()!

    if (token.type === 'INDENT') {
      const indent = parseInt(token.value, 10)
      if (indent > baseIndent) {
        ctx.advance() // consume indent

        // Parse property on this line
        if (ctx.current()?.type === 'PROPERTY') {
          const propName = ctx.advance().value

          // Handle directional properties: mar l 0, pad t-b 8, etc.
          if (ctx.current()?.type === 'DIRECTION') {
            const directions: string[] = []
            while (ctx.current()?.type === 'DIRECTION') {
              // Split combined directions like 'l-r' into ['l', 'r']
              const dir = ctx.advance().value
              if (dir.includes('-')) {
                directions.push(...dir.split('-'))
              } else {
                directions.push(dir)
              }
            }
            // Get the value for these directions
            const val = parseValue(ctx)
            if (val !== null) {
              for (const dir of directions) {
                stateDef.properties[`${propName}-${dir}`] = val
              }
            }
          } else {
            // Regular property with value
            const val = parseValue(ctx)
            if (val !== null) {
              stateDef.properties[propName] = val
            } else {
              stateDef.properties[propName] = true
            }
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
  const actionToken = ctx.advance()
  const actionValue = actionToken.value

  // Validate action type using type guard
  if (!isActionType(actionValue)) {
    ctx.addWarning(
      'P001',
      `Unknown action type "${actionValue}"`,
      actionToken,
      `Valid actions: open, close, toggle, change, show, hide, assign, highlight, select, etc.`
    )
    return null
  }

  const action: ActionStatement = {
    type: actionValue,
    line: actionLine
  }

  // Parse target
  if (actionValue === 'assign') {
    if (ctx.current()?.type === 'TOKEN_REF' || ctx.current()?.type === 'COMPONENT_NAME') {
      action.target = ctx.advance().value
    }
  } else if (actionValue === 'alert') {
    // Alert accepts a string message as target
    if (ctx.current()?.type === 'STRING') {
      action.target = ctx.advance().value
    } else if (ctx.current()?.type === 'COMPONENT_NAME') {
      action.target = ctx.advance().value
    }
  } else if (actionValue === 'highlight' || actionValue === 'select' || actionValue === 'filter' || actionValue === 'deselect') {
    // Behavior actions accept COMPONENT_NAME, ANIMATION ('none'), or PROPERTY tokens as targets
    // 'none' is tokenized as ANIMATION, 'all' as COMPONENT_NAME
    const token = ctx.current()
    if (token?.type === 'COMPONENT_NAME' || token?.type === 'ANIMATION' || token?.type === 'PROPERTY') {
      // Only consume if it's a valid behavior target
      if (BEHAVIOR_TARGETS.has(token.value) || /^[A-Z]/.test(token.value)) {
        action.target = ctx.advance().value
      }
    }
  } else if (actionValue === 'activate' || actionValue === 'deactivate' || actionValue === 'validate' || actionValue === 'reset') {
    // These actions accept self or component names as targets
    const token = ctx.current()
    if (token?.type === 'COMPONENT_NAME' || token?.type === 'PROPERTY') {
      // Accept 'self' or component names
      if (token.value === 'self' || /^[A-Z]/.test(token.value)) {
        action.target = ctx.advance().value
      }
    }
  } else if (actionValue === 'deactivate-siblings' || actionValue === 'clear-selection' || actionValue === 'toggle-state') {
    // These actions don't need a target (implicit self/siblings)
    // No target parsing needed
  } else if (ctx.current()?.type === 'COMPONENT_NAME') {
    action.target = ctx.advance().value
  }

  // Parse action-specific details
  switch (actionValue) {
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
    case 'highlight':
    case 'select':
    case 'filter':
    case 'deselect':
    case 'activate':
    case 'deactivate':
      parseBehaviorActionDetails(ctx, action)
      break
    // Actions without additional details
    case 'deactivate-siblings':
    case 'clear-selection':
    case 'toggle-state':
    case 'validate':
    case 'reset':
      // No additional parsing needed
      break
  }

  return action
}

/**
 * Parse behavior action details: highlight next in dropdown, select self, filter dropdown
 */
function parseBehaviorActionDetails(ctx: ParserContext, action: ActionStatement): void {
  // Check for 'in' keyword: highlight next in dropdown
  if (ctx.current()?.type === 'CONTROL' && ctx.current()?.value === 'in') {
    ctx.advance() // consume 'in'
    if (ctx.current()?.type === 'COMPONENT_NAME') {
      action.inContainer = ctx.advance().value
    }
  }
}

/**
 * Parse an event handler: onclick \n actions...
 * Also supports key modifiers: onkeydown escape close self
 */
export function parseEventHandler(ctx: ParserContext, baseIndent: number): EventHandler | null {
  if (ctx.current()?.type !== 'EVENT') return null

  const eventLine = ctx.current()!.line
  const eventName = ctx.advance().value // onclick, onhover, onkeydown, onclick-outside, etc.

  const handler: EventHandler = {
    event: eventName,
    actions: [],
    line: eventLine
  }

  // Check for key modifier after onkeydown/onkeyup: onkeydown escape close self
  if ((eventName === 'onkeydown' || eventName === 'onkeyup') && ctx.current()?.type === 'COMPONENT_NAME') {
    const possibleModifier = ctx.current()!.value.toLowerCase()
    if (KEY_MODIFIERS.has(possibleModifier)) {
      handler.modifier = ctx.advance().value.toLowerCase()
    }
  }

  // Check for debounce modifier: oninput debounce 300 filter Results
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'debounce') {
    ctx.advance() // consume 'debounce'
    if (ctx.current()?.type === 'NUMBER') {
      handler.debounce = parseInt(ctx.advance().value, 10)
    }
  }

  // Check for delay modifier: onblur delay 200 hide Results
  if (ctx.current()?.type === 'COMPONENT_NAME' && ctx.current()?.value === 'delay') {
    ctx.advance() // consume 'delay'
    if (ctx.current()?.type === 'NUMBER') {
      handler.delay = parseInt(ctx.advance().value, 10)
    }
  }

  // Check for inline actions on same line (supports comma-chaining)
  // Example: onclick activate self, deactivate-siblings
  while (isActionKeyword(ctx)) {
    const action = parseAction(ctx)
    if (action) handler.actions.push(action)

    // Check for comma to continue parsing more actions
    if (ctx.current()?.type === 'COMMA') {
      ctx.advance() // consume comma
      // Continue loop to parse next action
    } else {
      break // No more actions on this line
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
