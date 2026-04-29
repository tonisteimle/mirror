/**
 * Inline Property Parser
 *
 * Parses the comma-separated property list that follows a component or
 * instance name on the same line:
 *
 *   Button "Speichern", bg #2271C1, col white, pad 12 24, hor, gap 8
 *   Frame $cardstyle, $primary
 *   Text "Hello $user.name", weight bold
 *   Frame data $tasks where status == "open"
 *   Card route Home
 *   Input bind email
 *   Button "Action", onclick toggle()
 *
 * Stops at NEWLINE / INDENT / DEDENT / COLON / EOF, or at SEMICOLON when
 * `stopAtSemicolon` is set (used inside inline-child syntax).
 *
 * Recognises these patterns:
 *   - String content (with optional `+` concatenation expressions)
 *   - Data binding (`data` keyword with `where` filter)
 *   - Route (`route` keyword)
 *   - Bind (`bind` keyword with optional dot-path)
 *   - $token references (with property-access chains and method-call args)
 *   - Loop-variable references (when the identifier is in ctx.loopVariables)
 *   - Implicit onclick (`toggle()`, `show(Menu)`, etc.) — via callback
 *   - Inline event syntax (`onclick action`) — via callback
 *   - Inline state-block start (`hover:`) — breaks the loop
 *   - Boolean properties (no value)
 *   - Plain properties — delegated to property-parser
 *
 * Extracted from parser.ts (Phase 5 — sixth incremental cut). Uses
 * callbacks for the parser-level methods that haven't been extracted yet
 * (parseEvent, parseRoutePath, parseDataBindingValues, parseImplicitOnclick,
 * collectExpressionOperand, checkNextIsPropertyName, advancePropertyName,
 * isImplicitOnclickCandidate).
 */

import type { Token } from './lexer'
import type { Property, Event, Expression, TokenReference, ComputedExpression } from './ast'
import type { ParserContext } from './parser-context'
import { ParserUtils } from './parser-context'
import { ALL_BOOLEAN_PROPERTIES, EVENT_NAMES, KEYBOARD_KEYS } from '../schema/parser-helpers'
import { parseProperty } from './property-parser'

const U = ParserUtils

/**
 * Callbacks back to the main parser for methods not yet extracted.
 * Each callback must keep ctx.pos in sync — the wrapper layer in
 * parser.ts handles this via withSubParserContext.
 */
export interface InlinePropertiesCallbacks {
  collectExpressionOperand(parts: ComputedExpression['parts'], operators: string[]): void
  parseDataBindingValues(): { collection: string; filter?: Expression } | null
  parseRoutePath(): string | null
  isImplicitOnclickCandidate(name: string): boolean
  parseImplicitOnclick(): Event | null
  parseEvent(): Event | null
  checkNextIsPropertyName(): boolean
  advancePropertyName(): string
}

/* -------------------------------------------------------------- entry */

export function parseInlineProperties(
  ctx: ParserContext,
  properties: Property[],
  callbacks: InlinePropertiesCallbacks,
  events?: Event[],
  options?: { stopAtSemicolon?: boolean }
): void {
  const stopAtSemicolon = options?.stopAtSemicolon ?? false

  while (
    !U.check(ctx, 'NEWLINE') &&
    !U.check(ctx, 'INDENT') &&
    !U.check(ctx, 'DEDENT') &&
    !U.check(ctx, 'COLON') &&
    !U.isAtEnd(ctx)
  ) {
    if (U.check(ctx, 'COMMA')) {
      U.advance(ctx)
      continue
    }
    if (U.check(ctx, 'SEMICOLON')) {
      if (stopAtSemicolon) break
      U.advance(ctx)
      continue
    }

    if (U.check(ctx, 'STRING')) {
      properties.push(consumeStringContent(ctx, callbacks))
      continue
    }

    if (U.check(ctx, 'DATA')) {
      const prop = consumeDataBinding(ctx, callbacks)
      if (prop) properties.push(prop)
      continue
    }

    if (U.check(ctx, 'ROUTE')) {
      const prop = consumeRoute(ctx, callbacks)
      if (prop) properties.push(prop)
      continue
    }

    if (U.check(ctx, 'BIND')) {
      const prop = consumeBind(ctx)
      if (prop) properties.push(prop)
      continue
    }

    // $token reference (lexer combines $name into single IDENTIFIER).
    if (U.check(ctx, 'IDENTIFIER') && U.current(ctx).value.startsWith('$')) {
      properties.push(consumeTokenRef(ctx, callbacks))
      continue
    }

    if (U.check(ctx, 'IDENTIFIER')) {
      if (handleIdentifier(ctx, properties, events, callbacks)) {
        // handleIdentifier returns true when it consumed something OR signalled
        // a state-block break. The "break" case is signalled by `shouldBreak`.
        continue
      }
      break // inline-state-syntax detected — let caller handle it
    }

    if (U.check(ctx, 'NUMBER')) {
      U.advance(ctx)
      continue
    }

    // Skip unknown tokens to avoid infinite loops (COLON/EQUALS that drift in).
    U.advance(ctx)
  }
}

/* ---------------------------------------------- branch: string content */

function consumeStringContent(ctx: ParserContext, cb: InlinePropertiesCallbacks): Property {
  const str = U.advance(ctx)
  const startLine = str.line
  const startColumn = str.column

  if (!isArithmeticOp(ctx)) {
    return {
      type: 'Property',
      name: 'content',
      values: [str.value],
      line: startLine,
      column: startColumn,
    }
  }

  // String + expression → ComputedExpression.
  const parts: ComputedExpression['parts'] = [str.value]
  const operators: string[] = []
  while (isArithmeticOp(ctx)) {
    operators.push(U.advance(ctx).value)
    cb.collectExpressionOperand(parts, operators)
  }

  return {
    type: 'Property',
    name: 'content',
    values: [{ kind: 'expression', parts, operators }],
    line: startLine,
    column: startColumn,
  }
}

/* --------------------------------------------- branch: data binding */

function consumeDataBinding(ctx: ParserContext, cb: InlinePropertiesCallbacks): Property | null {
  const dataToken = U.advance(ctx)
  const binding = cb.parseDataBindingValues()
  if (!binding) return null

  const values: unknown[] = [binding.collection]
  if (binding.filter) values.push({ filter: binding.filter })

  return {
    type: 'Property',
    name: 'data',
    values: values as Property['values'],
    line: dataToken.line,
    column: dataToken.column,
  }
}

/* ---------------------------------------------------- branch: route */

function consumeRoute(ctx: ParserContext, cb: InlinePropertiesCallbacks): Property | null {
  const routeToken = U.advance(ctx)
  const routePath = cb.parseRoutePath()
  if (!routePath) return null

  return {
    type: 'Property',
    name: '_route', // prefixed for later move into instance.route
    values: [routePath],
    line: routeToken.line,
    column: routeToken.column,
  }
}

/* ----------------------------------------------------- branch: bind */

function consumeBind(ctx: ParserContext): Property | null {
  const bindToken = U.advance(ctx)
  if (!U.check(ctx, 'IDENTIFIER')) return null

  let path = U.advance(ctx).value
  while (U.check(ctx, 'DOT') && U.checkNext(ctx, 'IDENTIFIER')) {
    U.advance(ctx) // .
    path += '.' + U.advance(ctx).value
  }

  return {
    type: 'Property',
    name: 'bind',
    values: [path],
    line: bindToken.line,
    column: bindToken.column,
  }
}

/* ------------------------------------------- branch: $token reference */

function consumeTokenRef(ctx: ParserContext, cb: InlinePropertiesCallbacks): Property {
  const token = U.advance(ctx)
  const startLine = token.line
  const startColumn = token.column

  let tokenName = token.value.slice(1) // strip leading $

  // Method-call args directly after the lexer-combined identifier:
  // `$users.sum(hours)`, `$users.sum(data.stats.value)`.
  if (U.check(ctx, 'LPAREN')) {
    tokenName += consumeMethodCallArgs(ctx)
  }

  // Property access chain: `$item.name`, `$users.sum(hours).avg(x)`.
  while (U.check(ctx, 'DOT')) {
    U.advance(ctx) // .
    if (!U.check(ctx, 'IDENTIFIER')) break
    tokenName += '.' + U.advance(ctx).value
    if (U.check(ctx, 'LPAREN')) {
      tokenName += consumeMethodCallArgs(ctx)
    }
  }

  const tokenRef: TokenReference = { kind: 'token', name: tokenName }

  if (!isArithmeticOp(ctx)) {
    return {
      type: 'Property',
      name: 'propset',
      values: [tokenRef],
      line: startLine,
      column: startColumn,
    }
  }

  const parts: ComputedExpression['parts'] = [tokenRef]
  const operators: string[] = []
  while (isArithmeticOp(ctx)) {
    operators.push(U.advance(ctx).value)
    cb.collectExpressionOperand(parts, operators)
  }

  return {
    type: 'Property',
    name: 'content',
    values: [{ kind: 'expression', parts, operators }],
    line: startLine,
    column: startColumn,
  }
}

/**
 * Consume `(arg1, arg2.path, ...)` and return the assembled string `(arg1, arg2.path, ...)`.
 * Each arg is a dotted path of IDENTIFIER/DATA tokens.
 */
function consumeMethodCallArgs(ctx: ParserContext): string {
  U.advance(ctx) // (
  const args: string[] = []

  while (!U.check(ctx, 'RPAREN') && !U.isAtEnd(ctx)) {
    if (U.check(ctx, 'IDENTIFIER') || U.check(ctx, 'DATA')) {
      let argPath = U.advance(ctx).value
      while (U.check(ctx, 'DOT')) {
        U.advance(ctx) // .
        if (U.check(ctx, 'IDENTIFIER') || U.check(ctx, 'DATA')) {
          argPath += '.' + U.advance(ctx).value
        } else {
          break
        }
      }
      args.push(argPath)
    } else if (U.check(ctx, 'COMMA')) {
      U.advance(ctx)
    } else {
      break
    }
  }

  if (U.check(ctx, 'RPAREN')) U.advance(ctx)
  return '(' + args.join(', ') + ')'
}

/* ------------------------------------------ branch: identifier dispatch */

/**
 * Handles plain IDENTIFIER tokens. Returns true if a property/event was
 * pushed (or the token was otherwise consumed) — the main loop should
 * continue. Returns false if an inline-state-syntax was detected — the
 * main loop should break.
 */
function handleIdentifier(
  ctx: ParserContext,
  properties: Property[],
  events: Event[] | undefined,
  cb: InlinePropertiesCallbacks
): boolean {
  const identName = U.current(ctx).value

  // Loop variable: treat as content (e.g. `Text user.name`).
  if (ctx.loopVariables.has(identName)) {
    properties.push(consumeLoopVarRef(ctx, cb))
    return true
  }

  // Implicit onclick: `toggle()`, `show(Menu)`, etc.
  if (events && U.checkNext(ctx, 'LPAREN') && cb.isImplicitOnclickCandidate(identName)) {
    const implicitEvent = cb.parseImplicitOnclick()
    if (implicitEvent) {
      events.push(implicitEvent)
      return true
    }
  }

  // Inline event syntax: `onclick action`, `onkeydown enter: submit`.
  if (EVENT_NAMES.has(identName) && events) {
    const event = cb.parseEvent()
    if (event) events.push(event)
    return true
  }

  // Inline state syntax detected (`hover:` / `selected:`) — break the main loop.
  if (
    U.checkNext(ctx, 'COLON') &&
    identName[0] === identName[0].toLowerCase() &&
    !KEYBOARD_KEYS.has(identName)
  ) {
    return false
  }

  // Boolean property (no value).
  if (ALL_BOOLEAN_PROPERTIES.has(identName)) {
    const token = U.advance(ctx)
    properties.push({
      type: 'Property',
      name: token.value,
      values: [true],
      line: token.line,
      column: token.column,
    })
    return true
  }

  // Plain property — delegate to property-parser.
  const prop = parseProperty(ctx)
  if (prop) properties.push(prop)
  return true
}

/* ----------------------------------- branch: loop-variable reference */

function consumeLoopVarRef(ctx: ParserContext, cb: InlinePropertiesCallbacks): Property {
  const token = U.advance(ctx)
  const startLine = token.line
  const startColumn = token.column
  let varAccess = token.value

  // Property-access chain (with reserved-keyword support).
  while (U.check(ctx, 'DOT') && cb.checkNextIsPropertyName()) {
    U.advance(ctx) // .
    varAccess += '.' + cb.advancePropertyName()
  }

  // Array indexing: `user.name[0]`, `items[1]`.
  while (U.check(ctx, 'LBRACKET')) {
    U.advance(ctx) // [
    if (U.check(ctx, 'NUMBER')) {
      varAccess += '[' + U.advance(ctx).value + ']'
    }
    if (U.check(ctx, 'RBRACKET')) U.advance(ctx)
  }

  if (!isArithmeticOp(ctx)) {
    return {
      type: 'Property',
      name: 'content',
      values: [{ kind: 'loopVar', name: varAccess }],
      line: startLine,
      column: startColumn,
    }
  }

  // loopVar + arithmetic → ComputedExpression.
  const loopVarRef = { kind: 'loopVar' as const, name: varAccess }
  const parts: ComputedExpression['parts'] = [loopVarRef]
  const operators: string[] = []
  while (isArithmeticOp(ctx)) {
    operators.push(U.advance(ctx).value)
    cb.collectExpressionOperand(parts, operators)
  }

  return {
    type: 'Property',
    name: 'content',
    values: [{ kind: 'expression', parts, operators }],
    line: startLine,
    column: startColumn,
  }
}

/* --------------------------------------------------------- helpers */

function isArithmeticOp(ctx: ParserContext): boolean {
  return (
    U.check(ctx, 'PLUS') || U.check(ctx, 'MINUS') || U.check(ctx, 'STAR') || U.check(ctx, 'SLASH')
  )
}
