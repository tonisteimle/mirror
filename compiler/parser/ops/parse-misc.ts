/**
 * Parser ops — parse-misc
 *
 * Extracted from compiler/parser/parser.ts. Functions take `this: Parser`
 * and are bound on the class via class-field assignment.
 */

import { Token } from '../lexer'
import type { CanvasDefinition, JavaScriptBlock, AnimationDefinition, ZagNode } from '../ast'
import { isDevicePreset } from '../../schema/dsl'
import {
  parseZagComponent as parseZagComponentExtracted,
  type ZagParserCallbacks,
} from '../zag-parser'
import { parseAnimationDefinition as parseAnimationDefinitionExtracted } from '../animation-parser'
import type { ParserContext } from '../parser-context'
import { type EachParserCallbacks } from '../each-parser'
import { type StateChildParserCallbacks } from '../state-child-parser'
import type { Parser } from '../parser'
import { MAX_ITERATIONS } from './limits'

export function parseJavaScript(this: Parser): JavaScriptBlock | null {
  const startToken = this.current()
  if (!startToken || !this.source) return null

  // Find position in source from line/column
  // Note: The lexer's column points to the END of the token, not the start
  // So we subtract the token's length to get the actual start column
  const lines = this.source.split('\n')
  let charPos = 0

  for (let i = 0; i < startToken.line - 1; i++) {
    charPos += lines[i].length + 1 // +1 for newline
  }
  const actualStartColumn = startToken.column - startToken.value.length
  charPos += actualStartColumn - 1

  // Extract rest of source as JavaScript
  const code = this.source.slice(charPos).trim()

  // Advance to end
  for (let i = 0; !this.isAtEnd() && i < MAX_ITERATIONS; i++) {
    this.advance()
  }

  return {
    type: 'JavaScript',
    code,
    line: startToken.line,
    column: startToken.column,
  }
}

/**
 * Build a ParserContext from current state, run an extracted sub-parser,
 * and sync the resulting position/errors back. Shared by all sub-parser
 * wrappers (token-parser, ternary-parser, ...) — see compiler/parser/*.ts.
 */
export function withSubParserContext<T>(this: Parser, fn: (ctx: ParserContext) => T): T {
  const ctx: ParserContext = {
    tokens: this.tokens,
    source: this.source,
    loopVariables: this.loopVariables,
    pos: this.pos,
    errors: this.errors,
  }
  const result = fn(ctx)
  this.pos = ctx.pos
  this.errors = ctx.errors
  return result
}

/**
 * Build the callback record passed to state-child-parser.
 */
export function stateChildParserCallbacks(
  this: Parser,
  ctx: ParserContext
): StateChildParserCallbacks {
  return {
    parseProperty: () => {
      this.pos = ctx.pos
      const result = this.parseProperty()
      ctx.pos = this.pos
      return result
    },
    parseInlineProperties: properties => {
      this.pos = ctx.pos
      this.parseInlineProperties(properties)
      ctx.pos = this.pos
    },
    createTextChild: token => this.createTextChild(token),
  }
}

/**
 * Build the callback record passed to each-parser. Each callback syncs
 * `this.pos` ↔ `ctx.pos` so the main parser sees the right position when
 * a sub-parser delegates back into it.
 */
export function eachParserCallbacks(this: Parser, ctx: ParserContext): EachParserCallbacks {
  return {
    parseInstance: token => {
      this.pos = ctx.pos
      const result = this.parseInstance(token)
      ctx.pos = this.pos
      return result
    },
    checkNextIsPropertyName: () => {
      this.pos = ctx.pos
      const result = this.checkNextIsPropertyName()
      ctx.pos = this.pos
      return result
    },
    advancePropertyName: () => {
      this.pos = ctx.pos
      const result = this.advancePropertyName()
      ctx.pos = this.pos
      return result
    },
  }
}

export function parseRoutePath(this: Parser): string | null {
  if (!this.check('IDENTIFIER')) return null

  let path = this.advance().value // First identifier

  // Continue while we see SLASH followed by IDENTIFIER
  while (this.check('SLASH') && this.checkNext('IDENTIFIER')) {
    this.advance() // consume SLASH
    path += '/' + this.advance().value // append next segment
  }

  return path
}

/**
 * Parse a `bind <varName>` or `bind <user.email>` clause and return the
 * resolved path. Caller must have already verified `this.check('BIND')`.
 *
 * Bug #31 fix: consume the full dot-path so `bind user.email` doesn't
 * leave `.email` for the next dispatch iteration (where it would be
 * mis-interpreted as an initialState keyword).
 */
export function parseBindPath(this: Parser): string | null {
  this.advance() // consume 'bind'
  if (!this.check('IDENTIFIER')) return null

  let path = this.advance().value
  while (this.check('DOT') && this.checkNext('IDENTIFIER')) {
    this.advance() // consume DOT
    path += '.' + this.advance().value
  }
  return path
}

/**
 * Parse a `selection <varName>` clause and return the bound variable
 * name. Caller must have already verified `this.check('SELECTION')`.
 */
export function parseSelectionVar(this: Parser): string | null {
  this.advance() // consume 'selection'
  if (!this.check('IDENTIFIER')) return null
  return this.advance().value
}

/**
 * Parse a `route <Target>` or `route <path/to/page>` clause and return
 * the resolved path. Caller must have already verified `this.check('ROUTE')`.
 */
export function parseRouteClause(this: Parser): string | null {
  this.advance() // consume 'route'
  return this.parseRoutePath()
}

/**
 * Wrapper method that calls the extracted Zag parser.
 * Creates context and callbacks for the modular parser.
 */
export function parseZagComponentWithContext(
  this: Parser,
  nameToken: Token,
  colonAlreadyConsumed = false
): ZagNode {
  const ctx: ParserContext = {
    tokens: this.tokens,
    source: this.source,
    loopVariables: this.loopVariables,
    pos: this.pos,
    errors: this.errors,
  }

  const callbacks: ZagParserCallbacks = {
    parseInlineProperties: (properties, events) => {
      this.pos = ctx.pos
      this.parseInlineProperties(properties, events)
      ctx.pos = this.pos
    },
    parseProperty: () => {
      this.pos = ctx.pos
      const result = this.parseProperty()
      ctx.pos = this.pos
      return result
    },
    parseNumericArray: () => {
      this.pos = ctx.pos
      const result = this.parseNumericArray()
      ctx.pos = this.pos
      return result
    },
    parseEvent: () => {
      this.pos = ctx.pos
      const result = this.parseEvent()
      ctx.pos = this.pos
      return result
    },
    parseInstance: token => {
      this.pos = ctx.pos
      const result = this.parseInstance(token)
      ctx.pos = this.pos
      return result
    },
    skipNewlines: () => {
      this.pos = ctx.pos
      this.skipNewlines()
      ctx.pos = this.pos
    },
    previous: () => {
      this.pos = ctx.pos
      const result = this.previous()
      ctx.pos = this.pos
      return result
    },
    hasColonOnLine: () => {
      this.pos = ctx.pos
      const result = this.hasColonOnLine()
      ctx.pos = this.pos
      return result
    },
  }

  const result = parseZagComponentExtracted(ctx, nameToken, callbacks, colonAlreadyConsumed)
  this.pos = ctx.pos
  this.errors = ctx.errors
  return result
}

/**
 * Wrapper method that calls the extracted Animation parser.
 * Creates context for the modular parser.
 */
export function parseAnimationDefinitionWithContext(
  this: Parser,
  nameToken: Token
): AnimationDefinition | null {
  const ctx: ParserContext = {
    tokens: this.tokens,
    source: this.source,
    loopVariables: this.loopVariables,
    pos: this.pos,
    errors: this.errors,
  }

  const result = parseAnimationDefinitionExtracted(ctx, nameToken)
  this.pos = ctx.pos
  this.errors = ctx.errors
  return result
}

/**
 * Parse canvas definition
 *
 * Syntax:
 *   canvas bg #1a1a1a, w 375, h 812, col white
 *   canvas mobile
 *   canvas tablet, bg #1a1a1a
 *   canvas desktop
 */
export function parseCanvas(this: Parser): CanvasDefinition {
  const startToken = this.advance() // consume CANVAS
  const canvas: CanvasDefinition = {
    type: 'Canvas',
    properties: [],
    line: startToken.line,
    column: startToken.column,
  }

  // Check for device preset (mobile, tablet, desktop — sourced from schema)
  if (this.check('IDENTIFIER')) {
    const deviceValue = this.current().value.toLowerCase()
    if (isDevicePreset(deviceValue)) {
      canvas.device = deviceValue
      this.advance() // consume device preset
    }
  }

  // Parse properties (comma-separated, same line)
  while (
    !this.check('NEWLINE') &&
    !this.check('INDENT') &&
    !this.check('DEDENT') &&
    !this.isAtEnd()
  ) {
    // Skip commas
    while (this.check('COMMA')) {
      this.advance()
    }
    if (this.check('NEWLINE') || this.check('INDENT') || this.check('DEDENT')) break

    const prop = this.parseProperty()
    if (prop) {
      canvas.properties.push(prop)
    }
  }

  return canvas
}
