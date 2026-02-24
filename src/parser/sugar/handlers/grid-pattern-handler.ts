/**
 * @module sugar/handlers/grid-pattern-handler
 * @description Grid Pattern Handler - "Grid N" Syntax
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Erkennt "Grid" gefolgt von einer Zahl und setzt grid Property
 *
 * @example
 *   Grid 3            → grid 3 (3-Spalten Grid)
 *   Grid 4            → grid 4 (4-Spalten Grid)
 *   Spalten 2         → grid 2 (Alias)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KEYWORDS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @keyword Grid N     → grid: N
 * @keyword Spalten N  → grid: N (German alias)
 * @keyword Columns N  → grid: N (English alias)
 *
 * @used-by sugar/index.ts
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'

/**
 * Keywords that trigger grid pattern detection.
 */
const GRID_KEYWORDS = new Set(['grid', 'spalten', 'columns', 'cols'])

/**
 * Grid pattern handler.
 * Recognizes "Grid N" pattern and sets grid property.
 */
export const gridPatternHandler: SugarHandler = {
  name: 'grid-pattern',
  priority: 160, // Higher priority to catch before dimension handler
  tokenTypes: ['UNKNOWN_PROPERTY', 'COMPONENT_NAME'],

  canHandle(context: SugarContext): boolean {
    const { ctx, token } = context
    const keyword = token.value.toLowerCase()

    // Check if this is a grid keyword
    if (!GRID_KEYWORDS.has(keyword)) {
      return false
    }

    // Peek at next token - must be a number
    const nextToken = ctx.peek()
    return nextToken !== undefined && nextToken !== null && nextToken.type === 'NUMBER'
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node } = context

    // Consume the grid keyword
    ctx.advance()

    // Consume the number
    const numberToken = ctx.advance()
    const columns = parseInt(numberToken.value, 10)

    // Set grid property
    node.properties.grid = columns

    return { handled: true }
  }
}
