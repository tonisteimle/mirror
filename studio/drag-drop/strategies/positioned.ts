/**
 * PositionedStrategy
 *
 * Handles drop on positioned containers (pos/stacked).
 * Uses absolute x/y coordinates with optional snapping.
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect, Size, SnapConfig } from '../types'
import type { DropStrategy } from './types'
import { calculateSnap } from '../snap/calculator'

export class PositionedStrategy implements DropStrategy {
  readonly name = 'PositionedStrategy'

  private snapConfig: Partial<SnapConfig>

  constructor(snapConfig: Partial<SnapConfig> = {}) {
    this.snapConfig = snapConfig
  }

  matches(target: DropTarget): boolean {
    return target.isPositioned
  }

  calculate(
    cursor: Point,
    target: DropTarget,
    source: DragSource
  ): DropResult {
    const containerRect = target.element.getBoundingClientRect()

    // Get source size (for snap calculations)
    const sourceSize = this.getSourceSize(source)

    // Calculate position relative to container
    let x = cursor.x - containerRect.left - sourceSize.width / 2
    let y = cursor.y - containerRect.top - sourceSize.height / 2

    // Get sibling rects for snapping
    const siblings = this.getSiblingRects(target, source.nodeId)

    // Apply snapping
    const container: Rect = {
      x: 0,
      y: 0,
      width: containerRect.width,
      height: containerRect.height,
    }

    const snapResult = calculateSnap(
      { x, y },
      sourceSize,
      container,
      siblings,
      this.snapConfig
    )

    // Ensure within bounds
    const finalX = Math.max(0, Math.min(snapResult.position.x, containerRect.width - sourceSize.width))
    const finalY = Math.max(0, Math.min(snapResult.position.y, containerRect.height - sourceSize.height))

    return {
      target,
      placement: 'absolute',
      targetId: target.nodeId,
      position: { x: Math.round(finalX), y: Math.round(finalY) },
    }
  }

  getVisualHint(result: DropResult): VisualHint {
    // For positioned, we show an outline where the element will be placed
    const size = { width: 100, height: 40 } // Default, will be overridden

    return {
      type: 'outline',
      rect: {
        x: result.position?.x ?? 0,
        y: result.position?.y ?? 0,
        width: size.width,
        height: size.height,
      },
      guides: [], // Snap guides added separately
    }
  }

  /**
   * Get source element size
   */
  private getSourceSize(source: DragSource): Size {
    if (source.element) {
      const rect = source.element.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    }

    // Default sizes for palette items
    return getDefaultComponentSize(source.componentName)
  }

  /**
   * Get sibling rects (excluding source element if moving)
   */
  private getSiblingRects(target: DropTarget, excludeNodeId?: string): Rect[] {
    const siblings: Rect[] = []

    const children = target.element.querySelectorAll(':scope > [data-mirror-id]')
    for (const child of children) {
      const nodeId = (child as HTMLElement).dataset.mirrorId
      if (nodeId === excludeNodeId) continue

      const rect = child.getBoundingClientRect()
      const containerRect = target.element.getBoundingClientRect()

      siblings.push({
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      })
    }

    return siblings
  }
}

/**
 * Get default size for component type
 */
export function getDefaultComponentSize(componentName?: string): Size {
  const sizes: Record<string, Size> = {
    Button: { width: 80, height: 36 },
    Text: { width: 100, height: 24 },
    Input: { width: 200, height: 36 },
    Box: { width: 100, height: 100 },
    Image: { width: 150, height: 100 },
    Icon: { width: 24, height: 24 },
  }

  return sizes[componentName ?? ''] ?? { width: 100, height: 40 }
}
