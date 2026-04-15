/**
 * Element Move Handler
 *
 * Handles moving an element to a new parent/position
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult } from '../types'

export class ElementMoveHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    return this.isElementDrop(result) && !result.isDuplicate && !this.isAbsolutePlacement(result)
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult> {
    const { source, targetNodeId, placement, insertionIndex } = result
    return context.codeModifier.moveNode(source.nodeId!, targetNodeId, placement, insertionIndex)
  }
}
