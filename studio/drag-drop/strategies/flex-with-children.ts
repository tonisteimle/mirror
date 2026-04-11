/**
 * FlexWithChildrenStrategy
 *
 * Handles drop on flex containers that have children.
 * Placement: before | after (relative to a child)
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect } from '../types'
import type { DropStrategy, ChildRect } from './types'
import type { LayoutRect } from '../../core/state'

export class FlexWithChildrenStrategy implements DropStrategy {
  readonly name = 'FlexWithChildrenStrategy'

  matches(target: DropTarget): boolean {
    return target.layoutType === 'flex' && target.hasChildren
  }

  calculate(
    cursor: Point,
    target: DropTarget,
    source: DragSource,
    childRects: ChildRect[] = [],
    _containerRect?: Rect
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
    const { childRect, placement, index, isNoOp } = this.findClosestChild(
      cursor,
      childRects,
      target.direction,
      source
    )

    return {
      target,
      placement,
      targetId: childRect.nodeId,
      insertionIndex: placement === 'before' ? index : index + 1,
      isNoOp,
    }
  }

  getVisualHint(
    result: DropResult,
    childRects?: ChildRect[],
    containerRect?: Rect,
    _layoutInfo?: Map<string, LayoutRect> | null
  ): VisualHint | null {
    // Don't show indicator for no-op positions
    if (result.isNoOp) {
      return null
    }

    const isVertical = result.target.direction === 'vertical'

    if (!childRects || childRects.length === 0 || !containerRect) {
      // Fallback: outline the container
      return {
        type: 'outline',
        rect: containerRect ?? { x: 0, y: 0, width: 0, height: 0 },
      }
    }

    // Calculate the gap midpoint between siblings
    const insertionIndex = result.insertionIndex ?? 0
    const lineRect = calculateGapMidpointRect(
      childRects,
      insertionIndex,
      isVertical,
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
    direction: 'horizontal' | 'vertical',
    source: DragSource
  ): { childRect: ChildRect; placement: 'before' | 'after'; index: number; isNoOp?: boolean } {
    const isHorizontal = direction === 'horizontal'

    // Find source element's current index (if it's a canvas element being moved)
    let sourceIndex = -1
    if (source.type === 'canvas' && source.nodeId) {
      sourceIndex = childRects.findIndex(c => c.nodeId === source.nodeId)
    }

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

    // Check if this would be a no-op (no actual change)
    let isNoOp = false
    if (sourceIndex !== -1) {
      const insertionIndex = placement === 'before' ? closestIndex : closestIndex + 1
      // Inserting at current position or position+1 means no change
      isNoOp = insertionIndex === sourceIndex || insertionIndex === sourceIndex + 1
    }

    return {
      childRect: closestRect,
      placement,
      index: closestIndex,
      isNoOp,
    }
  }
}

/**
 * Calculate indicator rect at the midpoint of the gap between siblings
 *
 * insertionIndex determines where in the children array the new element will be inserted:
 * - 0 = before first child
 * - N = after child N-1, before child N
 * - children.length = after last child
 */
export function calculateGapMidpointRect(
  childRects: ChildRect[],
  insertionIndex: number,
  isVertical: boolean,
  containerRect: Rect,
  thickness: number = 2
): Rect {
  // Sort children by position
  const sorted = [...childRects].sort((a, b) => {
    return isVertical
      ? a.rect.y - b.rect.y
      : a.rect.x - b.rect.x
  })

  let linePos: number

  if (insertionIndex <= 0) {
    // Before first child - line at top/left edge of first child
    const firstChild = sorted[0]
    linePos = isVertical ? firstChild.rect.y : firstChild.rect.x
  } else if (insertionIndex >= sorted.length) {
    // After last child - line at bottom/right edge of last child
    const lastChild = sorted[sorted.length - 1]
    linePos = isVertical
      ? lastChild.rect.y + lastChild.rect.height
      : lastChild.rect.x + lastChild.rect.width
  } else {
    // Between two children - line at midpoint of gap
    const prevChild = sorted[insertionIndex - 1]
    const nextChild = sorted[insertionIndex]

    if (isVertical) {
      const prevBottom = prevChild.rect.y + prevChild.rect.height
      const nextTop = nextChild.rect.y
      linePos = (prevBottom + nextTop) / 2
    } else {
      const prevRight = prevChild.rect.x + prevChild.rect.width
      const nextLeft = nextChild.rect.x
      linePos = (prevRight + nextLeft) / 2
    }
  }

  if (isVertical) {
    return {
      x: containerRect.x,
      y: linePos - thickness / 2,
      width: containerRect.width,
      height: thickness,
    }
  } else {
    return {
      x: linePos - thickness / 2,
      y: containerRect.y,
      width: thickness,
      height: containerRect.height,
    }
  }
}
