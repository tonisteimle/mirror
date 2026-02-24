/**
 * @module sugar/types
 * @description Sugar Types - Typdefinitionen für Syntactic Sugar
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Typdefinitionen für das Syntactic Sugar Handling System
 *
 * Handler verarbeiten implizite Property-Zuweisungen basierend auf Token-Typen.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * INTERFACES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @interface SugarContext
 *   ctx: ParserContext     → Parser-Kontext für Token-Zugriff
 *   node: ASTNode          → AST-Node der gerade gebaut wird
 *   componentName: string  → Component-Name für typ-spezifisches Handling
 *   token: Token           → Aktuelles Token
 *
 * @interface SugarResult
 *   handled: boolean       → Ob Handler das Token verarbeitet hat
 *   tokensConsumed?: number → Anzahl zusätzlich konsumierter Tokens
 *
 * @interface SugarHandler
 *   name: string           → Handler-Name für Debugging
 *   priority: number       → Priorität (höher = läuft zuerst)
 *   tokenTypes: string[]   → Token-Typen die verarbeitet werden
 *   canHandle(ctx): boolean → Prüft ob Handler Token verarbeiten kann
 *   handle(ctx): SugarResult → Verarbeitet Token
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BEISPIEL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @example Handler Implementation
 *   const colorHandler: SugarHandler = {
 *     name: 'color',
 *     priority: 100,
 *     tokenTypes: ['COLOR'],
 *     canHandle: (ctx) => true,
 *     handle: (ctx) => {
 *       const color = ctx.ctx.advance().value
 *       ctx.node.properties.bg = color
 *       return { handled: true }
 *     }
 *   }
 *
 * @used-by sugar-registry.ts, handlers/*
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
