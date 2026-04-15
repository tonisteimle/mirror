/**
 * Absolute Position Handler
 *
 * Handles updating x/y when element is dropped in absolute positioning mode
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult } from '../types'

export class AbsolutePositionHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    return this.isElementDrop(result) && !result.isDuplicate && this.isAbsolutePlacement(result)
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult> {
    const { x, y } = result.absolutePosition!
    return this.updatePosition(result.source.nodeId!, x, y, context)
  }

  private updatePosition(
    nodeId: string,
    x: number,
    y: number,
    context: DropContext
  ): ModificationResult {
    if (context.robustModifier) {
      return this.useRobustModifier(nodeId, x, y, context)
    }
    return this.useFallbackModifier(nodeId, x, y, context)
  }

  private useRobustModifier(
    nodeId: string,
    x: number,
    y: number,
    context: DropContext
  ): ModificationResult {
    return context.robustModifier!.updatePosition(nodeId, x, y)
  }

  private useFallbackModifier(
    nodeId: string,
    x: number,
    y: number,
    context: DropContext
  ): ModificationResult {
    const resultX = this.updateX(nodeId, x, context)
    if (!resultX.success) return resultX
    return this.updateY(nodeId, y, resultX, context)
  }

  private updateX(nodeId: string, x: number, context: DropContext): ModificationResult {
    return context.codeModifier.updateProperty(nodeId, 'x', String(Math.round(x)))
  }

  private updateY(
    nodeId: string,
    y: number,
    resultX: ModificationResult,
    context: DropContext
  ): ModificationResult {
    const resultY = context.codeModifier.updateProperty(nodeId, 'y', String(Math.round(y)))
    if (!resultY.success) return resultY
    return this.mergeResults(resultX, resultY)
  }

  private mergeResults(
    resultX: ModificationResult,
    resultY: ModificationResult
  ): ModificationResult {
    return {
      success: true,
      newSource: resultY.newSource,
      change: {
        from: resultX.change!.from,
        to: resultX.change!.to,
        insert: resultY.change!.insert,
      },
    }
  }
}
