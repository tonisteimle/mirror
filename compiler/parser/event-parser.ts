/**
 * Event Parser
 *
 * Cohesive cluster around event/action parsing:
 *
 *   - `parseEvent`        — full `onclick:` / inline `onclick action` syntax,
 *                           including key modifiers, timing modifiers, and
 *                           block-mode action lists.
 *   - `parseAction`       — single action (`toggle()`, `show(Menu)`, named
 *                           parameters, multi-element triggers).
 *   - `parseImplicitOnclick` — bare `toggle(), show(Menu)` chains (no `on…`).
 *   - `parseKeysBlock`    — `keys:` block of `key action` pairs.
 *   - `isImplicitOnclickCandidate` — name predicate used by inline-property
 *                                    parser and component-body parser.
 *
 * All recursion stays internal; no callbacks needed — these helpers don't
 * delegate back into the main parser.
 *
 * Extracted from parser.ts.
 */

import type { Token } from './lexer'
import type { Event, Action } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils, MAX_ITERATIONS } from './parser-context'
import {
  PROPERTY_STARTERS,
  ALL_BOOLEAN_PROPERTIES,
  STATE_NAMES,
  KEYBOARD_KEYS,
  EVENT_NAMES,
  ACTION_NAMES,
} from '../schema/parser-helpers'
import { getEvent } from '../schema/dsl'

const U = ParserUtils

/* --------------------------------------------------------------- predicates */

/**
 * True if `name` looks like an implicit onclick action — i.e. an identifier
 * that we should treat as `onclick toggle()` rather than as a property name,
 * boolean property, state name, keyboard key, or explicit event.
 */
export function isImplicitOnclickCandidate(name: string): boolean {
  if (ACTION_NAMES.has(name)) return true
  const excludeSets = [
    PROPERTY_STARTERS,
    ALL_BOOLEAN_PROPERTIES,
    STATE_NAMES,
    KEYBOARD_KEYS,
    EVENT_NAMES,
  ]
  return !excludeSets.some(set => set.has(name))
}

/* ------------------------------------------------------------------ action */

/**
 * Parse a single action: `toggle()`, `show(Menu)`, `cycle(a, b)`, `Menu open`.
 */
export function parseAction(ctx: ParserContext): Action | null {
  const actionToken = U.advance(ctx)

  const action: Action = {
    type: 'Action',
    name: actionToken.value,
    line: actionToken.line,
    column: actionToken.column,
  }

  // Function call syntax required: actionName(arg1, arg2, ...)
  // Examples: toggle(), cycle(a, b, c), show(Menu), animate(FadeIn)
  if (U.check(ctx, 'LPAREN')) {
    U.advance(ctx) // consume '('
    action.args = []
    action.isFunctionCall = true

    let iter = 0
    while (!U.check(ctx, 'RPAREN') && !U.isAtEnd(ctx) && iter < MAX_ITERATIONS) {
      iter++
      // Parse argument (identifier, string, or number)
      // Also handle named parameters: key: value or key: $token
      if (U.check(ctx, 'IDENTIFIER')) {
        const name = U.advance(ctx).value
        // Check for named parameter (key: value)
        if (U.check(ctx, 'COLON')) {
          U.advance(ctx) // consume ':'
          // Get the value (identifier, $token, string, number, or boolean)
          if (U.check(ctx, 'IDENTIFIER')) {
            const val = U.advance(ctx).value
            action.args.push(`${name}: ${val}`)
          } else if (U.check(ctx, 'STRING')) {
            const val = U.advance(ctx).value
            action.args.push(`${name}: ${val}`)
          } else if (U.check(ctx, 'NUMBER')) {
            const val = U.advance(ctx).value
            action.args.push(`${name}: ${val}`)
          }
        } else {
          // Simple identifier argument
          action.args.push(name)
        }
      } else if (U.check(ctx, 'STRING')) {
        action.args.push(U.advance(ctx).value)
      } else if (U.check(ctx, 'NUMBER')) {
        action.args.push(U.advance(ctx).value)
      }

      // Comma between args
      if (U.check(ctx, 'COMMA')) {
        U.advance(ctx)
      } else if (!U.check(ctx, 'RPAREN')) {
        break
      }
    }

    if (U.check(ctx, 'RPAREN')) {
      U.advance(ctx) // consume ')'
    }

    return action
  }

  // Multi-element trigger: ElementName state (e.g., Menu open, Backdrop visible)
  // This is NOT a function call - it sets state on another element
  if (U.check(ctx, 'IDENTIFIER') && !U.checkNext(ctx, 'COLON')) {
    action.target = U.advance(ctx).value
  }

  return action
}

/* ------------------------------------------------------------------- event */

export function parseEvent(ctx: ParserContext): Event | null {
  const eventToken = U.advance(ctx)
  let eventName = eventToken.value
  let eventKey: string | undefined = undefined

  // Expand keyboard shorthands: onkeyenter → onkeydown + key: 'enter'
  const eventDef = getEvent(eventName)
  if (eventDef?.key) {
    eventKey = eventDef.key
    eventName = 'on' + eventDef.dom // e.g., 'onkeydown'
  }

  const event: Event = {
    type: 'Event',
    name: eventName,
    key: eventKey,
    actions: [],
    line: eventToken.line,
    column: eventToken.column,
  }

  // Track if we're in block mode (colon was consumed)
  let isBlockMode = false

  // Handle onclick: syntax (colon directly after event name)
  if (U.check(ctx, 'COLON')) {
    U.advance(ctx) // consume the colon
    isBlockMode = true
  }

  // Check for key modifier with parentheses: onkeydown(arrow-down)
  if (U.check(ctx, 'LPAREN')) {
    U.advance(ctx) // consume (
    if (U.check(ctx, 'IDENTIFIER')) {
      event.key = U.advance(ctx).value
    }
    if (U.check(ctx, 'RPAREN')) {
      U.advance(ctx) // consume )
    }
  }

  // Check for key modifier: onkeydown escape:
  if (U.check(ctx, 'IDENTIFIER')) {
    const next = U.current(ctx)
    if (U.checkNext(ctx, 'COLON')) {
      event.key = next.value
      U.advance(ctx) // key
      U.advance(ctx) // :
      isBlockMode = true
    }
  }

  // Check for timing modifiers
  if (U.check(ctx, 'IDENTIFIER')) {
    const mod = U.current(ctx).value
    if (mod === 'debounce' || mod === 'delay') {
      U.advance(ctx)
      const time = U.advance(ctx)
      event.modifiers = [{ type: mod, value: parseInt(time.value) }]

      if (U.check(ctx, 'COLON')) {
        U.advance(ctx)
        isBlockMode = true
      }
    }
  }

  // Parse inline actions
  let inlineIter = 0
  while (
    !U.check(ctx, 'NEWLINE') &&
    !U.check(ctx, 'COMMA') &&
    !U.check(ctx, 'SEMICOLON') &&
    !U.isAtEnd(ctx) &&
    inlineIter < MAX_ITERATIONS
  ) {
    inlineIter++
    if (U.check(ctx, 'IDENTIFIER')) {
      const action = parseAction(ctx)
      if (action) event.actions.push(action)
    } else {
      break
    }
  }

  // Parse block actions (multi-line) - ONLY if we're in block mode (colon was used)
  // onclick:
  //   Menu open
  //   Backdrop visible
  //
  // IMPORTANT: Only enter block mode if a colon was consumed (isBlockMode = true).
  // Without a colon, any NEWLINE+INDENT is for children of the parent, not event actions.
  //
  // Example that should NOT consume NEWLINE+INDENT:
  //   Frame onclick action
  //     Text "child"     ← This is a child of Frame, not an action of onclick
  if (isBlockMode && U.check(ctx, 'NEWLINE') && U.peekAt(ctx, 1)?.type === 'INDENT') {
    U.skipNewlines(ctx)
  }
  if (isBlockMode && U.check(ctx, 'INDENT')) {
    // Don't consume INDENT if it's followed by a state block pattern (e.g., "on:", "hover:")
    // This happens when an inline event like "onenter toggle()" is followed by a state block
    // Example:
    //   Button "A", onenter toggle()
    //     on:          ← This is a state block, not event actions
    //       bg red
    // Token sequence: INDENT NEWLINE IDENTIFIER COLON
    // We need to skip NEWLINE when checking
    let offset = 1
    while (U.peekAt(ctx, offset)?.type === 'NEWLINE') {
      offset++
    }
    const afterIndent = U.peekAt(ctx, offset) // first non-NEWLINE after INDENT
    const afterIndent2 = U.peekAt(ctx, offset + 1) // token after that
    if (afterIndent?.type === 'IDENTIFIER' && afterIndent2?.type === 'COLON') {
      const name = afterIndent.value
      // State names are lowercase and not event names
      if (name[0] === name[0].toLowerCase() && !EVENT_NAMES.has(name)) {
        // This is a state block - don't consume the INDENT, let parseInstanceBody handle it
        return event
      }
    }

    U.advance(ctx) // consume INDENT
    let blockIter = 0
    while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && blockIter < MAX_ITERATIONS) {
      blockIter++
      U.skipNewlines(ctx)
      if (U.check(ctx, 'DEDENT')) break

      // Parse Element state on each line
      if (U.check(ctx, 'IDENTIFIER')) {
        const action = parseAction(ctx)
        if (action) event.actions.push(action)
      } else {
        // Skip any other tokens to prevent infinite loops
        U.advance(ctx)
      }

      U.skipNewlines(ctx)
    }
    if (U.check(ctx, 'DEDENT')) {
      U.advance(ctx) // consume DEDENT
    }
  }

  return event
}

/* ----------------------------------------------------------- implicit-onclick */

/**
 * Parse implicit onclick syntax: toggle(), show(Menu), etc.
 * Multiple actions can be chained: toggle(), show(Panel)
 */
export function parseImplicitOnclick(ctx: ParserContext): Event | null {
  const startToken = U.current(ctx)
  const actions: Action[] = []

  // Parse first action
  const firstAction = parseAction(ctx)
  if (!firstAction) return null
  actions.push(firstAction)

  // Parse additional actions separated by commas: toggle(), show(Panel)
  let iter = 0
  while (U.check(ctx, 'COMMA') && iter < MAX_ITERATIONS) {
    iter++
    // Look ahead to see if next is a function call
    const nextToken = U.peekAt(ctx, 1)
    const afterThat = U.peekAt(ctx, 2)

    if (!nextToken || nextToken.type !== 'IDENTIFIER') break
    if (!afterThat || afterThat.type !== 'LPAREN') break

    const nextIdent = nextToken.value
    if (!isImplicitOnclickCandidate(nextIdent)) break

    U.advance(ctx) // consume comma
    const nextAction = parseAction(ctx)
    if (nextAction) {
      actions.push(nextAction)
    } else {
      break
    }
  }

  return {
    type: 'Event',
    name: 'onclick',
    actions,
    line: startToken.line,
    column: startToken.column,
  }
}

/* ---------------------------------------------------------------- keysblock */

export function parseKeysBlock(ctx: ParserContext, events: Event[]): void {
  U.advance(ctx) // keys

  // Skip to next line if no immediate INDENT
  U.skipNewlines(ctx)

  if (!U.check(ctx, 'INDENT')) return
  U.advance(ctx)

  let outerIter = 0
  while (!U.check(ctx, 'DEDENT') && !U.isAtEnd(ctx) && outerIter < MAX_ITERATIONS) {
    outerIter++
    U.skipNewlines(ctx)

    if (U.check(ctx, 'DEDENT')) break

    // key action
    if (U.check(ctx, 'IDENTIFIER')) {
      const key = U.advance(ctx)
      const actions: Action[] = []

      // Skip optional colon after key
      if (U.check(ctx, 'COLON')) {
        U.advance(ctx)
      }

      let innerIter = 0
      while (
        !U.check(ctx, 'NEWLINE') &&
        !U.check(ctx, 'DEDENT') &&
        !U.isAtEnd(ctx) &&
        innerIter < MAX_ITERATIONS
      ) {
        innerIter++
        if (U.check(ctx, 'IDENTIFIER')) {
          const action = parseAction(ctx)
          if (action) actions.push(action)
        } else if (U.check(ctx, 'COMMA')) {
          U.advance(ctx)
        } else {
          break
        }
      }

      events.push({
        type: 'Event',
        name: 'onkeydown',
        key: key.value,
        actions,
        line: key.line,
        column: key.column,
      })
    } else {
      U.advance(ctx)
    }
  }

  if (U.check(ctx, 'DEDENT')) U.advance(ctx)
}
