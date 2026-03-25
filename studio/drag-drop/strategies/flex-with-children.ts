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

  getVisualHint(result: DropResult): VisualHint {
    const isVertical = result.target.direction === 'vertical'

    // We need the target element's rect for the indicator
    // This will be filled in by the caller
    return {
      type: 'line',
      direction: isVertical ? 'horizontal' : 'vertical',
      rect: { x: 0, y: 0, width: 0, height: 0 }, // Placeholder - filled by caller
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
  thickness: number = 2
): Rect {
  const isVertical = direction === 'vertical'

  if (isVertical) {
    // Horizontal line
    const y = placement === 'before' ? targetRect.y : targetRect.y + targetRect.height
    return {
      x: targetRect.x,
      y: y - thickness / 2,
      width: targetRect.width,
      height: thickness,
    }
  } else {
    // Vertical line
    const x = placement === 'before' ? targetRect.x : targetRect.x + targetRect.width
    return {
      x: x - thickness / 2,
      y: targetRect.y,
      width: thickness,
      height: targetRect.height,
    }
  }
}
