/**
 * Orphan Number Handler
 *
 * Handles NUMBER tokens that can't be assigned to w or h.
 * Emits a warning for orphan numbers.
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'

/**
 * Orphan number handler.
 * Runs with lowest priority to catch numbers that no other handler processed.
 */
export const orphanNumberHandler: SugarHandler = {
  name: 'orphan-number',
  priority: 0, // Lowest priority - fallback handler
  tokenTypes: ['NUMBER'],

  canHandle(context: SugarContext): boolean {
    // Only handle if both w and h are already set
    const { node } = context
    return node.properties.w !== undefined && node.properties.h !== undefined
  },

  handle(context: SugarContext): SugarResult {
    const { ctx } = context
    const orphanToken = ctx.advance()
    ctx.errors.push(
      `Warning: Line ${orphanToken.line + 1}: Orphan number "${orphanToken.value}" - not assigned to any property`
    )
    return { handled: true }
  }
}
