/**
 * FlexWithChildrenStrategy
 *
 * Handles drop on flex containers that have children.
 * Placement: before | after (relative to a child)
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect } from '../types'
import type { DropStrategy, ChildRect } from './types'

export class FlexWithChildrenStrategy implements DropStrategy {
  readonly name = 'FlexWithChildrenStrategy'

  matches(target: DropTarget): boolean {
    return target.layoutType === 'flex' && target.hasChildren
  }

  calculate(
    cursor: Point,
    target: DropTarget,
    _source: DragSource,
    childRects: ChildRect[] = []
  ): DropResult {
    if (childRects.length === 0) {
      // Fallback: inside at end
      return {
        target,
        placement: 'inside',
        targetId: target.nodeId,
        insertionIndex: 0,
      }
    }

    // Find closest child and edge
    const { childRect, placement, index } = this.findClosestChild(
      cursor,
      childRects,
      target.direction
    )

    return {
      target,
      placement,
      targetId: childRect.nodeId,
      insertionIndex: placement === 'before' ? index : index + 1,
    }
  }

  getVisualHint(result: DropResult, childRects?: ChildRect[], containerRect?: Rect): VisualHint {
    const isVertical = result.target.direction === 'vertical'

    // Find the target child's rect
    const targetChildRect = childRects?.find(c => c.nodeId === result.targetId)

    if (!targetChildRect || !containerRect) {
      // Fallback: outline the container
      return {
        type: 'outline',
        rect: containerRect ?? { x: 0, y: 0, width: 0, height: 0 },
      }
    }

    // Calculate the insertion line position
    const lineRect = calculateInsertionLineRect(
      targetChildRect.rect,
      result.placement as 'before' | 'after',
      result.target.direction,
      containerRect
    )

    return {
      type: 'line',
      direction: isVertical ? 'horizontal' : 'vertical',
      rect: lineRect,
    }
  }

  /**
   * Find closest child and determine before/after
   */
  private findClosestChild(
    cursor: Point,
    childRects: ChildRect[],
    direction: 'horizontal' | 'vertical'
  ): { childRect: ChildRect; placement: 'before' | 'after'; index: number } {
    const isHorizontal = direction === 'horizontal'

    // Find which child the cursor is closest to
    let closestIndex = 0
    let closestDistance = Infinity

    for (let i = 0; i < childRects.length; i++) {
      const rect = childRects[i].rect
      const center = isHorizontal
        ? rect.x + rect.width / 2
        : rect.y + rect.height / 2
      const cursorPos = isHorizontal ? cursor.x : cursor.y
      const distance = Math.abs(cursorPos - center)

      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = i
      }
    }

    const closestRect = childRects[closestIndex]
    const rect = closestRect.rect

    // Determine before or after
    const cursorPos = isHorizontal ? cursor.x : cursor.y
    const rectStart = isHorizontal ? rect.x : rect.y
    const rectSize = isHorizontal ? rect.width : rect.height
    const rectCenter = rectStart + rectSize / 2

    const placement: 'before' | 'after' = cursorPos < rectCenter ? 'before' : 'after'

    return {
      childRect: closestRect,
      placement,
      index: closestIndex,
    }
  }
}

/**
 * Calculate indicator rect for insertion line
 */
export function calculateInsertionLineRect(
  targetRect: Rect,
  placement: 'before' | 'after',
  direction: 'horizontal' | 'vertical',
  containerRect: Rect,
  thickness: number = 2
): Rect {
  const isVertical = direction === 'vertical'

  if (isVertical) {
    // Horizontal line (for vertical flex layout)
    // Y position based on target element's top/bottom edge
    const y = placement === 'before' ? targetRect.y : targetRect.y + targetRect.height
    return {
      x: containerRect.x, // Use container x for full-width line
      y: y - thickness / 2,
      width: containerRect.width, // Use container width
      height: thickness,
    }
  } else {
    // Vertical line (for horizontal flex layout)
    const x = placement === 'before' ? targetRect.x : targetRect.x + targetRect.width
    return {
      x: x - thickness / 2,
      y: containerRect.y, // Use container y for full-height line
      width: thickness,
      height: containerRect.height, // Use container height
    }
  }
}
