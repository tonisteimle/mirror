/**
 * @module sugar/handlers/color-handler
 * @description Color Handler - Farben zu bg/col Properties
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Verarbeitet COLOR Tokens als implizite Farb-Properties
 *
 * Verwendet inferColorProperty für Component-spezifische Zuweisung.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERHALTEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @rule Text Components → col (text color)
 *   Text #3B82F6   → col: #3B82F6
 *   Label #FFFFFF  → col: #FFFFFF
 *
 * @rule Container Components → bg (background)
 *   Box #3B82F6    → bg: #3B82F6
 *   Card #1E1E1E   → bg: #1E1E1E
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @export colorHandler (Priority 100)
 *   tokenTypes: ['COLOR']
 *   canHandle: immer true
 *
 * @used-by sugar/index.ts
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'
import { inferColorProperty } from '../../property-inference'

/**
 * Color handler for COLOR tokens.
 * Infers the appropriate color property from component type.
 */
export const colorHandler: SugarHandler = {
  name: 'color',
  priority: 100,
  tokenTypes: ['COLOR'],

  canHandle(_context: SugarContext): boolean {
    // Always handle COLOR tokens
    return true
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node, componentName } = context
    const colorValue = ctx.advance().value
    const inferredProp = inferColorProperty(componentName, node.properties)
    node.properties[inferredProp] = colorValue
    return { handled: true }
  }
}
