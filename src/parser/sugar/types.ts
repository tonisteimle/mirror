/**
 * Sugar Module Types
 *
 * Type definitions for the syntactic sugar handling system.
 * Handlers process implicit property assignments based on token types.
 */

import type { ParserContext } from '../parser-context'
import type { ASTNode } from '../types'
import type { Token } from '../lexer'

/**
 * Context passed to sugar handlers.
 * Contains all information needed to process sugar syntax.
 */
export interface SugarContext {
  /** The parser context for token access and registries */
  ctx: ParserContext
  /** The AST node being built */
  node: ASTNode
  /** The component name (for type-specific handling) */
  componentName: string
  /** Current token being processed */
  token: Token
}

/**
 * Result from a sugar handler.
 */
export interface SugarResult {
  /** Whether the handler processed the token */
  handled: boolean
  /** Optional: number of additional tokens consumed */
  tokensConsumed?: number
}

/**
 * Sugar handler interface.
 * Handlers process specific token types and apply implicit property assignments.
 */
export interface SugarHandler {
  /** Handler name for debugging */
  name: string
  /** Priority (higher = runs first) */
  priority: number
  /** Token types this handler can process */
  tokenTypes: string[]
  /**
   * Check if this handler can process the given context.
   * Called before handle() to allow handlers to decline.
   */
  canHandle(context: SugarContext): boolean
  /**
   * Process the sugar syntax and apply properties to the node.
   * Should advance the parser context as needed.
   */
  handle(context: SugarContext): SugarResult
}
