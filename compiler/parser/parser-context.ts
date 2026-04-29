/**
 * Parser Context
 *
 * Shared context and utility methods for all parser modules.
 * Extracted from the main parser to enable modular parsing.
 */

import type { Token, TokenType } from './lexer'
import type { ParseError, SourcePosition } from './ast'

/**
 * Parser state that can be passed to sub-parsers.
 */
export interface ParserState {
  tokens: Token[]
  pos: number
  errors: ParseError[]
  source: string
  loopVariables: Set<string>
  nodeIdCounter: number
}

/**
 * Read-only parser context for sub-parsers.
 * Sub-parsers receive this context and return parse results along with new position.
 */
export interface ParserContext {
  readonly tokens: Token[]
  readonly source: string
  readonly loopVariables: Set<string>
  pos: number
  errors: ParseError[]
}

/**
 * Result from a sub-parser containing the parsed node and new position.
 */
export interface ParseResult<T> {
  node: T | null
  pos: number
  errors?: ParseError[]
}

/**
 * Maximum iterations for while loops to prevent infinite loops.
 */
export const MAX_ITERATIONS = 100000

/**
 * Maximum lookahead distance for line-based scans.
 */
export const MAX_LOOKAHEAD = 1000

/**
 * Maximum depth for condition chains.
 */
export const MAX_CONDITION_DEPTH = 100

/**
 * Parser utility functions - can be used by any sub-parser.
 */
export class ParserUtils {
  /**
   * Get current token at position.
   */
  static current(ctx: ParserContext): Token {
    return ctx.tokens[ctx.pos]
  }

  /**
   * Check if current token matches type.
   */
  static check(ctx: ParserContext, type: TokenType): boolean {
    const token = ctx.tokens[ctx.pos]
    return token && token.type === type
  }

  /**
   * Check if next token matches type.
   */
  static checkNext(ctx: ParserContext, type: TokenType): boolean {
    const nextToken = ctx.tokens[ctx.pos + 1]
    return nextToken && nextToken.type === type
  }

  /**
   * Check token at specific offset.
   */
  static checkAt(ctx: ParserContext, offset: number, type: TokenType): boolean {
    const token = ctx.tokens[ctx.pos + offset]
    return token && token.type === type
  }

  /**
   * Peek at token at specific offset.
   */
  static peekAt(ctx: ParserContext, offset: number): Token | null {
    return ctx.tokens[ctx.pos + offset] || null
  }

  /**
   * Advance to next token and return the previously-current one.
   *
   * EOF acts as a wall: once `pos` lands on an EOF token (or past the end),
   * further calls return the last consumed token without incrementing `pos`.
   * This mirrors parser.ts:advance and prevents sub-parsers from running
   * `pos` off the end on malformed input (e.g. `primary: color =` with no
   * value), which would crash later callers of `current()`.
   */
  static advance(ctx: ParserContext): Token {
    if (!ParserUtils.isAtEnd(ctx)) {
      ctx.pos++
    }
    return ctx.tokens[ctx.pos - 1]
  }

  /**
   * Check if at end of tokens.
   */
  static isAtEnd(ctx: ParserContext): boolean {
    return ctx.pos >= ctx.tokens.length || ctx.tokens[ctx.pos].type === 'EOF'
  }

  /**
   * Skip newline tokens.
   */
  static skipNewlines(ctx: ParserContext): void {
    while (ParserUtils.check(ctx, 'NEWLINE')) {
      ParserUtils.advance(ctx)
    }
  }

  /**
   * Get source position from token.
   */
  static getPosition(token: Token): SourcePosition {
    return {
      line: token.line,
      column: token.column,
      endLine: token.line,
      endColumn: token.column + (token.value?.length || 0),
    }
  }

  /**
   * Report a parse error.
   */
  static reportError(ctx: ParserContext, message: string, token?: Token): void {
    const t = token || ParserUtils.current(ctx)
    ctx.errors.push({
      message,
      line: t?.line ?? 0,
      column: t?.column ?? 0,
    })
  }
}

/**
 * Create a parser context from state.
 */
export function createContext(state: ParserState): ParserContext {
  return {
    tokens: state.tokens,
    source: state.source,
    loopVariables: state.loopVariables,
    pos: state.pos,
    errors: state.errors,
  }
}

/**
 * Update parser state from context.
 */
export function updateState(state: ParserState, ctx: ParserContext): void {
  state.pos = ctx.pos
  state.errors = ctx.errors
}
