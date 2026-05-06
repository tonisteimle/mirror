/**
 * Drop Service
 *
 * Coordinates drop handling using Strategy Pattern.
 * Each handler is responsible for one type of drop.
 */

import type { DropResult, DropContext, DropHandler, ModificationResult } from './types'
import { ElementDuplicateHandler } from './handlers/element-duplicate'
import { ElementMoveHandler } from './handlers/element-move'
import { AbsolutePositionHandler } from './handlers/absolute-position'
import { PaletteDropHandler } from './handlers/palette-drop'
import { ZagComponentHandler } from './handlers/zag-component'
import { ChartDropHandler } from './handlers/chart-drop'
import { TemplateDropHandler } from './handlers/template-drop'
import { PureComponentHandler } from './handlers/pure-component'

export class DropService {
  private handlers: DropHandler[]

  constructor() {
    this.handlers = this.createHandlers()
  }

  private createHandlers(): DropHandler[] {
    // Order matters - more specific handlers first, generic fallback last
    return [
      new ElementDuplicateHandler(),
      new AbsolutePositionHandler(),
      new ElementMoveHandler(),
      new PureComponentHandler(), // Pure Mirror components (Checkbox, Switch, Slider) - before Zag!
      new ZagComponentHandler(),
      new ChartDropHandler(), // Charts with dataBlock
      new TemplateDropHandler(), // Presets with mirTemplate
      new PaletteDropHandler(), // Fallback for simple components
    ]
  }

  async handleDrop(result: DropResult, context: DropContext): Promise<ModificationResult | null> {
    // Block move/reorder of each-rendered nodes. The source for such a node
    // is a single template that gets cloned per data row — moving one of the
    // cloned cards has no clean source-side semantics (mutate the data list?
    // unroll the loop?), so we refuse the drop and tell the user where to
    // change ordering instead.
    if (
      result.source.type === 'element' &&
      result.source.nodeId &&
      context.isInEachTemplate?.(result.source.nodeId)
    ) {
      context.emitNotification(
        'info',
        'Aus Daten generiert. Reihenfolge im `each`-Datenblock ändern.'
      )
      return { success: false, error: 'each-template move blocked' }
    }

    // Try each handler in order until one succeeds
    for (const handler of this.handlers) {
      if (!handler.canHandle(result)) continue
      const modResult = await handler.handle(result, context)
      if (modResult !== null) return modResult
    }

    console.warn('[DropService] No handler succeeded for drop:', result.source.type)
    return null
  }
}

// Singleton instance
let dropServiceInstance: DropService | null = null

export function getDropService(): DropService {
  if (!dropServiceInstance) {
    dropServiceInstance = new DropService()
  }
  return dropServiceInstance
}
