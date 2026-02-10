/**
 * Parser Context Module
 *
 * Shared parser state and cursor operations.
 * Provides the core infrastructure for all parser modules.
 */

import type { Token } from './lexer'
import type { ComponentTemplate, StyleMixin, ASTNode, TokenValue } from './types'
import { isTokenSequence } from './types'

/**
 * Parser Context - shared state and operations for parsing.
 */
export interface ParserContext {
  // Token stream
  readonly tokens: Token[]
  pos: number

  // Registries
  readonly registry: Map<string, ComponentTemplate>
  readonly designTokens: Map<string, TokenValue>
  readonly styleMixins: Map<string, StyleMixin>
  readonly idCounters: Map<string, number>
  readonly errors: string[]

  // Cursor methods
  current(): Token | undefined
  peek(offset?: number): Token | undefined
  advance(): Token
  skipNewlines(): void

  // ID generation
  generateId(prefix: string): string

  // Token expansion - resolves token sequences with nested token references
  resolveTokenValue(name: string): Token[]
  expandTokenSequence(tokens: Token[]): Token[]
}

/**
 * Create a new parser context from a token stream.
 */
export function createParserContext(tokens: Token[]): ParserContext {
  const registry = new Map<string, ComponentTemplate>()
  const designTokens = new Map<string, TokenValue>()
  const styleMixins = new Map<string, StyleMixin>()
  const idCounters = new Map<string, number>()
  const errors: string[] = []

  // Collect lexer errors
  for (const token of tokens) {
    if (token.type === 'ERROR') {
      errors.push(`Line ${token.line + 1}: ${token.value}`)
    }
  }

  let pos = 0

  const ctx: ParserContext = {
    tokens,
    get pos() { return pos },
    set pos(value: number) { pos = value },

    registry,
    designTokens,
    styleMixins,
    idCounters,
    errors,

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

    generateId(name: string): string {
      const count = (idCounters.get(name) || 0) + 1
      idCounters.set(name, count)
      return `${name}${count}`
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
    children: cloneChildrenWithNewIds(child.children, generateId)
  }))
}
