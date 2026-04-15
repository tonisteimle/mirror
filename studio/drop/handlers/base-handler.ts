/**
 * Base Handler - Abstract base for all drop handlers
 */

import type { DropHandler, DropResult, DropContext, ModificationResult } from '../types'

export abstract class BaseDropHandler implements DropHandler {
  abstract canHandle(result: DropResult): boolean
  abstract handle(result: DropResult, context: DropContext): Promise<ModificationResult | null>

  protected isElementDrop(result: DropResult): boolean {
    return result.source.type === 'element'
  }

  protected isPaletteDrop(result: DropResult): boolean {
    return result.source.type === 'palette'
  }

  protected isAbsolutePlacement(result: DropResult): boolean {
    return result.placement === 'absolute' && !!result.absolutePosition
  }
}
