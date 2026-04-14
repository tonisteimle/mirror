/**
 * InsertionCalculator - Pure geometry calculations for insertion position
 *
 * No DOM operations, no side effects.
 * Takes cursor position and cached rects, returns insertion info.
 */

import type { Point, ChildInfo, FlexLayout, InsertionResult } from './types'

export class InsertionCalculator {
  /**
   * Calculate where to insert based on cursor position
   *
   * @param cursor - Current cursor position
   * @param children - Cached child rects, sorted by position
   * @param layout - Container's flex direction
   * @param containerRect - Container's bounding rect
   * @returns Insertion index and indicator position
   */
  calculate(
    cursor: Point,
    children: ChildInfo[],
    layout: FlexLayout,
    containerRect: DOMRect
  ): InsertionResult {
    const isVertical = layout === 'flex-column'

    // Empty container: insert at index 0, indicator at container start
    if (children.length === 0) {
      return this.emptyContainerResult(containerRect, isVertical)
    }

    // Find insertion position among children
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      const result = this.checkChildPosition(cursor, child, i, containerRect, isVertical)
      if (result) return result
    }

    // Cursor is after all children: insert at end
    return this.afterLastChildResult(children, containerRect, isVertical)
  }

  /**
   * Result for empty container
   */
  private emptyContainerResult(containerRect: DOMRect, isVertical: boolean): InsertionResult {
    return {
      index: 0,
      linePosition: {
        x: containerRect.x,
        y: containerRect.y,
      },
      lineSize: isVertical ? containerRect.width : containerRect.height,
      orientation: isVertical ? 'horizontal' : 'vertical',
    }
  }

  /**
   * Check if cursor is before this child's midpoint
   */
  private checkChildPosition(
    cursor: Point,
    child: ChildInfo,
    index: number,
    containerRect: DOMRect,
    isVertical: boolean
  ): InsertionResult | null {
    // Calculate midpoint of child
    const mid = isVertical
      ? child.rect.y + child.rect.height / 2
      : child.rect.x + child.rect.width / 2

    // Cursor position on the relevant axis
    const cursorPos = isVertical ? cursor.y : cursor.x

    // If cursor is before midpoint, insert before this child
    if (cursorPos < mid) {
      return {
        index,
        linePosition: isVertical
          ? { x: containerRect.x, y: child.rect.y }
          : { x: child.rect.x, y: containerRect.y },
        lineSize: isVertical ? containerRect.width : containerRect.height,
        orientation: isVertical ? 'horizontal' : 'vertical',
      }
    }

    return null
  }

  /**
   * Result for inserting after last child
   */
  private afterLastChildResult(
    children: ChildInfo[],
    containerRect: DOMRect,
    isVertical: boolean
  ): InsertionResult {
    const last = children[children.length - 1]

    return {
      index: children.length,
      linePosition: isVertical
        ? { x: containerRect.x, y: last.rect.y + last.rect.height }
        : { x: last.rect.x + last.rect.width, y: containerRect.y },
      lineSize: isVertical ? containerRect.width : containerRect.height,
      orientation: isVertical ? 'horizontal' : 'vertical',
    }
  }
}
