/**
 * Element Duplicate Handler
 *
 * Handles Alt+drag to duplicate an element
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult } from '../types'

export class ElementDuplicateHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    return this.isElementDrop(result) && !!result.isDuplicate
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult> {
    const { source, targetNodeId, placement } = result
    return context.codeModifier.duplicateNode(source.nodeId!, targetNodeId, placement)
  }
}
