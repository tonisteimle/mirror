/**
 * @module sugar/sugar-registry
 * @description Sugar Registry - Handler-Verwaltung mit Prioritäten
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ÜBERSICHT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @brief Registry für Sugar-Handler mit prioritätsbasierter Ausführung
 *
 * Features:
 * - Handler-Registrierung mit Priorität
 * - Indizierung nach Token-Typ für schnellen Lookup
 * - Prioritäts-sortierte Ausführung
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CLASS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @class SugarRegistry
 *
 * @method register(handler)
 *   Registriert Handler, sortiert nach Priorität
 *
 * @method handle(context) → SugarResult
 *   Verarbeitet Token mit registrierten Handlern
 *   - Sucht Handler für Token-Typ
 *   - Führt in Prioritäts-Reihenfolge aus
 *   - Stoppt bei erstem erfolgreichen Handler
 *
 * @method getHandlers() → readonly SugarHandler[]
 *   Gibt alle registrierten Handler (für Tests)
 *
 * @method hasHandlerFor(tokenType) → boolean
 *   Prüft ob Handler für Token-Typ existiert
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @function createSugarRegistry() → SugarRegistry
 *   Factory-Funktion für neue Registry-Instanz
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PRIORITÄTEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @priority Höher = läuft zuerst
 *   Typ-spezifische Handler (Image, Input) → 200
 *   Allgemeine Handler (Dimension, Color) → 100
 *   Fallback Handler (orphan-number) → 50
 *
 * @used-by sugar/index.ts für Default-Registry
 */

import type { SugarHandler, SugarContext, SugarResult } from './types'

/**
 * Registry for sugar syntax handlers.
 * Handlers are executed in priority order (highest first).
 */
export class SugarRegistry {
  private handlers: SugarHandler[] = []
  private handlersByType: Map<string, SugarHandler[]> = new Map()

  /**
   * Register a sugar handler.
   * Handlers are sorted by priority (highest first).
   */
  register(handler: SugarHandler): void {
    this.handlers.push(handler)
    this.handlers.sort((a, b) => b.priority - a.priority)

    // Index by token type for fast lookup
    for (const tokenType of handler.tokenTypes) {
      const existing = this.handlersByType.get(tokenType) || []
      existing.push(handler)
      existing.sort((a, b) => b.priority - a.priority)
      this.handlersByType.set(tokenType, existing)
    }
  }

  /**
   * Process a token using registered handlers.
   * Returns true if any handler processed the token.
   */
  handle(context: SugarContext): SugarResult {
    const tokenType = context.token.type
    const handlers = this.handlersByType.get(tokenType)

    if (!handlers) {
      return { handled: false }
    }

    for (const handler of handlers) {
      if (handler.canHandle(context)) {
        const result = handler.handle(context)
        if (result.handled) {
          return result
        }
      }
    }

    return { handled: false }
  }

  /**
   * Get all registered handlers (for debugging/testing).
   */
  getHandlers(): readonly SugarHandler[] {
    return this.handlers
  }

  /**
   * Check if any handler can process a token type.
   */
  hasHandlerFor(tokenType: string): boolean {
    return this.handlersByType.has(tokenType)
  }
}

/**
 * Create a new sugar registry instance.
 */
export function createSugarRegistry(): SugarRegistry {
  return new SugarRegistry()
}
