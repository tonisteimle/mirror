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
    const { source, targetNodeId, placement, insertionIndex, alignment } = result

    // If alignment zone is specified, add it to the PARENT FIRST (before move)
    // This ensures the SourceMap is still valid for the property addition
    if (alignment?.zone) {
      const alignResult = context.codeModifier.addProperty(targetNodeId, alignment.zone, '')
      if (!alignResult.success) {
        return alignResult
      }
      // Update the source map reference for the move operation
      // Note: The move will use the updated source from addProperty
    }

    // Then move the node
    const moveResult = context.codeModifier.moveNode(
      source.nodeId!,
      targetNodeId,
      placement,
      insertionIndex
    )

    return moveResult
  }
}
