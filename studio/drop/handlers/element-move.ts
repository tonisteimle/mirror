/**
 * Element Move Handler
 *
 * Handles moving an element to a new parent/position
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult, GridPlacement } from '../types'

// 9-zone alignment keywords are mutually exclusive on a single Frame.
// Cf. children-ops.ts ALIGNMENT_KEYWORDS — keep the two lists in sync.
const ALIGNMENT_KEYWORDS = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br'] as const

/**
 * Build a `x N, y M [, w P] [, h Q]` snippet for moveNode's
 * options.properties. Default spans (1) are omitted to keep the DSL minimal.
 */
function formatGridProps(p: GridPlacement): string {
  const parts = [`x ${p.x}`, `y ${p.y}`]
  if (p.w > 1) parts.push(`w ${p.w}`)
  if (p.h > 1) parts.push(`h ${p.h}`)
  return parts.join(', ')
}

export class ElementMoveHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    return this.isElementDrop(result) && !result.isDuplicate && !this.isAbsolutePlacement(result)
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult> {
    const { source, targetNodeId, placement, insertionIndex, alignment, gridPlacement } = result

    // Track original source length BEFORE any modifications
    // This is needed because each modification updates the CodeModifier's internal source
    const originalSourceLength = context.codeModifier.getSourceLength()

    // If alignment zone is specified, add it to the PARENT FIRST.
    // addProperty only modifies line content (not line count), so SourceMap
    // positions stay valid. Alignment keywords are mutually exclusive,
    // so strip any existing one before adding the new — otherwise a
    // re-aligned drop produces `Frame center, tl` (two conflicting
    // alignments).
    if (alignment?.zone) {
      for (const kw of ALIGNMENT_KEYWORDS) {
        if (kw !== alignment.zone) {
          context.codeModifier.removeProperty(targetNodeId, kw)
        }
      }
      const alignResult = context.codeModifier.addProperty(targetNodeId, alignment.zone, '')
      if (!alignResult.success) {
        return alignResult
      }
    }

    // Grid placement is folded into the moveNode call via options.properties
    // — moveNode rewrites the source but does NOT refresh sourceMap, so a
    // separate post-move updateProperty would hit a stale line position.
    // Passing the props through `applyOptionalProperties` writes them onto
    // the moved block's first line in the same edit.
    const properties = gridPlacement ? formatGridProps(gridPlacement) : undefined

    // Then move the node - CodeModifier uses updated this.source from addProperty
    const moveResult = context.codeModifier.moveNode(
      source.nodeId!,
      targetNodeId,
      placement,
      insertionIndex,
      properties ? { properties } : undefined
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
