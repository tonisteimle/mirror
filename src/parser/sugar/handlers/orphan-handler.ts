/**
 * @module sugar/handlers/orphan-handler
 * @description Orphan Handler - Fallback für unzugewiesene Numbers
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Fängt NUMBER Tokens auf, die keinem Property zugewiesen werden konnten
 *
 * Wenn w und h bereits gesetzt sind, können weitere Numbers
 * nicht mehr implizit zugewiesen werden. Der Handler gibt
 * eine Warnung aus, damit der User explizite Properties nutzt.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VERHALTEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @condition Aktiviert wenn w UND h bereits gesetzt
 *   Box 300 400 200    ← 200 ist orphan (w=300, h=400)
 *
 * @warning Generiert Warning-Meldung
 *   "Orphan number '200' - not assigned to any property"
 *
 * @solution Explizites Property verwenden
 *   Box 300 400 rad 200    ← rad explizit angegeben
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPORT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @export orphanNumberHandler (Priority 0)
 *   Niedrigste Priorität - läuft nur wenn kein anderer Handler matched
 *   tokenTypes: ['NUMBER']
 *   canHandle: w !== undefined && h !== undefined
 *
 * @used-by sugar/index.ts
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
