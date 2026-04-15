/**
 * Palette Drop Handler
 *
 * Handles dropping regular components from palette
 */

import { BaseDropHandler } from './base-handler'
import type { DropResult, DropContext, ModificationResult } from '../types'

export class PaletteDropHandler extends BaseDropHandler {
  canHandle(result: DropResult): boolean {
    return this.isPaletteDrop(result) && !this.isZagComponent(result)
  }

  async handle(result: DropResult, context: DropContext): Promise<ModificationResult> {
    const properties = this.buildProperties(result, context)
    return this.addComponent(result, properties, context)
  }

  private isZagComponent(result: DropResult): boolean {
    return !!(result.source.children && result.source.children.length > 0)
  }

  private buildProperties(result: DropResult, context: DropContext): string {
    let properties = result.source.properties || ''
    if (this.needsPositionProperties(result)) {
      properties = this.addPositionProperties(properties, result, context)
    }
    return properties
  }

  private needsPositionProperties(result: DropResult): boolean {
    return result.placement === 'absolute' && !!result.absolutePosition
  }

  private addPositionProperties(
    properties: string,
    result: DropResult,
    context: DropContext
  ): string {
    const { x, y } = this.calculateRelativePosition(result, context)
    const posProps = `x ${Math.round(x)}, y ${Math.round(y)}`
    return properties ? `${properties}, ${posProps}` : posProps
  }

  private calculateRelativePosition(
    result: DropResult,
    context: DropContext
  ): { x: number; y: number } {
    const { x, y } = result.absolutePosition!
    const adjusted = this.adjustForParent(x, y, result.targetNodeId, context)
    return this.adjustForZoom(adjusted.x, adjusted.y, context.zoomScale)
  }

  private adjustForParent(
    x: number,
    y: number,
    targetNodeId: string,
    context: DropContext
  ): { x: number; y: number } {
    const target = context.previewContainer.querySelector(`[data-mirror-id="${targetNodeId}"]`)
    if (!target) return { x, y }
    const parentRect = target.getBoundingClientRect()
    const previewRect = context.previewContainer.getBoundingClientRect()
    return {
      x: x - (parentRect.left - previewRect.left),
      y: y - (parentRect.top - previewRect.top),
    }
  }

  private adjustForZoom(x: number, y: number, zoomScale: number): { x: number; y: number } {
    if (!zoomScale || zoomScale === 1) return { x, y }
    return { x: x / zoomScale, y: y / zoomScale }
  }

  private addComponent(
    result: DropResult,
    properties: string,
    context: DropContext
  ): ModificationResult {
    return context.codeModifier.addChild(result.targetNodeId, result.source.componentName!, {
      position: result.insertionIndex ?? 'last',
      properties: properties || undefined,
      textContent: result.source.textContent || undefined,
    })
  }
}
