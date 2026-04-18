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

    // Track original source length BEFORE any modifications
    // This is needed because each modification updates the CodeModifier's internal source
    const originalSourceLength = context.codeModifier.getSourceLength()

    // If alignment zone is specified, add it to the PARENT FIRST
    // addProperty only modifies line content (not line count), so SourceMap positions stay valid
    if (alignment?.zone) {
      const alignResult = context.codeModifier.addProperty(targetNodeId, alignment.zone, '')
      if (!alignResult.success) {
        return alignResult
      }
    }

    // Then move the node - CodeModifier uses updated this.source from addProperty
    const moveResult = context.codeModifier.moveNode(
      source.nodeId!,
      targetNodeId,
      placement,
      insertionIndex
    )

    // If we did both addProperty and moveNode, we need to fix the change range
    // The change.to should be based on the ORIGINAL source length, not the intermediate length
    if (alignment?.zone && moveResult.success && moveResult.change) {
      const fixedChange = {
        from: 0,
        to: originalSourceLength,
        insert: moveResult.newSource!,
      }
      return {
        ...moveResult,
        change: fixedChange,
      }
    }

    // moveResult.newSource includes both the alignment property and the move
    return moveResult
  }
}
