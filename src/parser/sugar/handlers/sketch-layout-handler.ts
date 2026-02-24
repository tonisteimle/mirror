/**
 * @module sugar/handlers/sketch-layout-handler
 * @description Sketch Layout Handler - Deutsche Layout-Keywords
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Verarbeitet deutsche Layout-Keywords für Sketch-Mode
 *
 * @example
 *   Box links         → Box hor-l
 *   Box rechts        → Box hor-r
 *   Box zentriert     → Box cen
 *   Row oben          → Row ver-t
 *   Row unten         → Row ver-b
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * KEYWORDS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @keyword links     → hor-l (links ausrichten)
 * @keyword rechts    → hor-r (rechts ausrichten)
 * @keyword oben      → ver-t (oben ausrichten)
 * @keyword unten     → ver-b (unten ausrichten)
 * @keyword zentriert → cen (zentrieren)
 * @keyword mitte     → cen (zentrieren, Alias)
 *
 * @used-by sugar/index.ts
 */

import type { SugarHandler, SugarContext, SugarResult } from '../types'

/**
 * German layout keywords mapping.
 * Maps German keywords to Mirror layout properties.
 */
const GERMAN_LAYOUT_KEYWORDS: Map<string, { prop: string; value: unknown }[]> = new Map([
  // Horizontal alignment
  ['links', [{ prop: 'hor-l', value: true }]],
  ['rechts', [{ prop: 'hor-r', value: true }]],

  // Vertical alignment
  ['oben', [{ prop: 'ver-t', value: true }]],
  ['unten', [{ prop: 'ver-b', value: true }]],

  // Center alignment
  ['zentriert', [{ prop: 'cen', value: true }]],
  ['mitte', [{ prop: 'cen', value: true }]],

  // Direction
  ['horizontal', [{ prop: 'hor', value: true }]],
  ['vertikal', [{ prop: 'ver', value: true }]],

  // Distribution
  ['verteilt', [{ prop: 'between', value: true }]],
  ['gleichverteilt', [{ prop: 'between', value: true }]],
])

/**
 * Check if a token value is a German layout keyword.
 */
function isGermanLayoutKeyword(value: string): boolean {
  return GERMAN_LAYOUT_KEYWORDS.has(value.toLowerCase())
}

/**
 * Sketch layout handler.
 * Recognizes German layout keywords and applies corresponding Mirror properties.
 */
export const sketchLayoutHandler: SugarHandler = {
  name: 'sketch-layout',
  priority: 150, // Higher priority to catch keywords before other handlers
  tokenTypes: ['UNKNOWN_PROPERTY', 'COMPONENT_NAME'],

  canHandle(context: SugarContext): boolean {
    const { token } = context
    // Handle if token value is a known German keyword
    return isGermanLayoutKeyword(token.value)
  },

  handle(context: SugarContext): SugarResult {
    const { ctx, node, token } = context
    const keyword = token.value.toLowerCase()
    const mappings = GERMAN_LAYOUT_KEYWORDS.get(keyword)

    if (!mappings) {
      return { handled: false }
    }

    // Consume the keyword token
    ctx.advance()

    // Apply all property mappings
    for (const mapping of mappings) {
      node.properties[mapping.prop] = mapping.value
    }

    return { handled: true }
  }
}
