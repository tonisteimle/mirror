/**
 * Parser Context Module
 *
 * Shared parser state and cursor operations.
 * Provides the core infrastructure for all parser modules.
 *
 * Features:
 * - Token stream navigation with lookahead
 * - Error collection with recovery support
 * - Design token and component template registries
 * - Unique ID generation
 */

import type { Token } from './lexer'
import type { ComponentTemplate, StyleMixin, ASTNode, TokenValue } from './types'
import { isTokenSequence } from './types'
import { ErrorCollector, type ParseError, createError, ErrorCodes } from './errors'

/**
 * Parser Context - shared state and operations for parsing.
 */
export interface ParserContext {
  // Token stream
  readonly tokens: Token[]
  pos: number

  // Source text for error context
  readonly source: string
  readonly sourceLines: string[]

  // Registries
  readonly registry: Map<string, ComponentTemplate>
  readonly designTokens: Map<string, TokenValue>
  readonly styleMixins: Map<string, StyleMixin>
  readonly idCounters: Map<string, number>

  // Error handling (backwards compatible)
  readonly errors: string[]

  // Structured error collection
  readonly errorCollector: ErrorCollector

  // Cursor methods
  current(): Token | undefined
  peek(offset?: number): Token | undefined
  advance(): Token
  skipNewlines(): void

  // Error recovery - skip to next synchronization point
  recover(): void
  recoverToNewline(): void

  // ID generation
  generateId(prefix: string): string

  // Token expansion - resolves token sequences with nested token references
  resolveTokenValue(name: string): Token[]
  expandTokenSequence(tokens: Token[]): Token[]

  // Error helpers
  addError(code: string, message: string, token: Token, hint?: string): void
  addWarning(code: string, message: string, token: Token, hint?: string): void
}

/**
 * Create a new parser context from a token stream.
 */
export function createParserContext(tokens: Token[], source: string = ''): ParserContext {
  const registry = new Map<string, ComponentTemplate>()
  const designTokens = new Map<string, TokenValue>()
  const styleMixins = new Map<string, StyleMixin>()
  const idCounters = new Map<string, number>()
  const errors: string[] = []
  const sourceLines = source.split('\n')
  const errorCollector = new ErrorCollector(source)

  // Collect lexer errors
  for (const token of tokens) {
    if (token.type === 'ERROR') {
      errors.push(`Line ${token.line + 1}: ${token.value}`)
      errorCollector.addError(
        ErrorCodes.UNTERMINATED_STRING,
        token.value,
        token.line,
        token.column
      )
    }
  }

  let pos = 0

  const ctx: ParserContext = {
    tokens,
    get pos() { return pos },
    set pos(value: number) { pos = value },

    source,
    sourceLines,

    registry,
    designTokens,
    styleMixins,
    idCounters,
    errors,
    errorCollector,

    current(): Token | undefined {
      return tokens[pos]
    },

    peek(offset = 1): Token | undefined {
      return tokens[pos + offset]
    },

    advance(): Token {
      return tokens[pos++]
    },

    skipNewlines(): void {
      while (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    },

    /**
     * Recover from an error by skipping to the next synchronization point.
     * Synchronization points are: newlines, EOF, or start of new component/definition.
     */
    recover(): void {
      while (ctx.current() && ctx.current()!.type !== 'EOF') {
        const tokenType = ctx.current()!.type
        // Stop at synchronization points
        if (
          tokenType === 'NEWLINE' ||
          tokenType === 'COMPONENT_NAME' ||
          tokenType === 'COMPONENT_DEF' ||
          tokenType === 'TOKEN_VAR_DEF'
        ) {
          break
        }
        ctx.advance()
      }
    },

    /**
     * Recover to the next newline (simpler recovery).
     */
    recoverToNewline(): void {
      while (ctx.current() && ctx.current()!.type !== 'EOF' && ctx.current()!.type !== 'NEWLINE') {
        ctx.advance()
      }
      if (ctx.current()?.type === 'NEWLINE') {
        ctx.advance()
      }
    },

    generateId(name: string): string {
      const count = (idCounters.get(name) || 0) + 1
      idCounters.set(name, count)
      return `${name}${count}`
    },

    /**
     * Add an error to both the legacy string array and structured collector.
     */
    addError(code: string, message: string, token: Token, hint?: string): void {
      const fullMessage = hint ? `${message}. ${hint}` : message
      errors.push(`Error: Line ${token.line + 1}: ${fullMessage}`)
      errorCollector.addError(code, message, token.line, token.column, {
        hint,
        source: token.value,
        endColumn: token.column + token.value.length,
      })
    },

    /**
     * Add a warning to both the legacy string array and structured collector.
     */
    addWarning(code: string, message: string, token: Token, hint?: string): void {
      const fullMessage = hint ? `${message}. ${hint}` : message
      errors.push(`Warning: Line ${token.line + 1}: ${fullMessage}`)
      errorCollector.addWarning(code, message, token.line, token.column, {
        hint,
        source: token.value,
      })
    },

    /**
     * Resolve a token name to its expanded token sequence.
     * If the token is a simple value, wraps it in a single-element array.
     * If the token is a sequence, expands any nested token references.
     */
    resolveTokenValue(name: string): Token[] {
      const value = designTokens.get(name)
      if (value === undefined) {
        return []
      }

      // Simple value - create a synthetic token
      if (typeof value === 'number') {
        return [{ type: 'NUMBER', value: String(value), line: 0, column: 0 }]
      }
      if (typeof value === 'string') {
        // Check if it's a color
        if (value.startsWith('#')) {
          return [{ type: 'COLOR', value, line: 0, column: 0 }]
        }
        return [{ type: 'STRING', value, line: 0, column: 0 }]
      }

      // Token sequence - expand nested references
      if (isTokenSequence(value)) {
        return ctx.expandTokenSequence(value.tokens)
      }

      return []
    },

    /**
     * Expand a token sequence by recursively resolving any TOKEN_REF tokens.
     */
    expandTokenSequence(tokenSeq: Token[]): Token[] {
      const result: Token[] = []

      for (const token of tokenSeq) {
        if (token.type === 'TOKEN_REF') {
          // Recursively resolve the referenced token
          const expanded = ctx.resolveTokenValue(token.value)
          result.push(...expanded)
        } else {
          result.push(token)
        }
      }

      return result
    }
  }

  return ctx
}

/**
 * Clone children with new IDs for template instantiation.
 * Re-exported from parser-utils for convenience.
 */
export function cloneChildrenWithNewIds(
  children: ASTNode[],
  generateId: (name: string) => string
): ASTNode[] {
  return children.map(child => ({
    ...child,
    id: generateId(child.name),
    // Deep clone properties to avoid shared references
    properties: { ...child.properties },
    children: cloneChildrenWithNewIds(child.children, generateId)
  }))
}
