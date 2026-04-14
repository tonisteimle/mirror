/**
 * InsertionCalculator - Pure geometry calculations for insertion position
 *
 * No DOM operations, no side effects.
 * Takes cursor position and cached rects, returns insertion info.
 */

import type { Point, ChildInfo, FlexLayout, InsertionResult } from './types'

export class InsertionCalculator {
  /** Calculate where to insert based on cursor position */
  calculate(
    cursor: Point,
    children: ChildInfo[],
    layout: FlexLayout,
    containerRect: DOMRect
  ): InsertionResult {
    const isVertical = layout === 'flex-column'

    if (children.length === 0) {
      return this.buildResult(0, containerRect.x, containerRect.y, containerRect, isVertical)
    }

    const insertBefore = this.findInsertionIndex(cursor, children, isVertical)
    if (insertBefore !== null) {
      const child = children[insertBefore]
      return this.buildResult(insertBefore, child.rect.x, child.rect.y, containerRect, isVertical)
    }

    return this.resultAfterLast(children, containerRect, isVertical)
  }

  /** Find index to insert before, or null if after all */
  private findInsertionIndex(
    cursor: Point,
    children: ChildInfo[],
    isVertical: boolean
  ): number | null {
    const cursorPos = isVertical ? cursor.y : cursor.x

    for (let i = 0; i < children.length; i++) {
      const mid = this.getChildMidpoint(children[i], isVertical)
      if (cursorPos < mid) return i
    }
    return null
  }

  /** Get midpoint of child on relevant axis */
  private getChildMidpoint(child: ChildInfo, isVertical: boolean): number {
    return isVertical ? child.rect.y + child.rect.height / 2 : child.rect.x + child.rect.width / 2
  }

  /** Build insertion result for given position */
  private buildResult(
    index: number,
    x: number,
    y: number,
    containerRect: DOMRect,
    isVertical: boolean
  ): InsertionResult {
    return {
      index,
      linePosition: isVertical ? { x: containerRect.x, y } : { x, y: containerRect.y },
      lineSize: isVertical ? containerRect.width : containerRect.height,
      orientation: isVertical ? 'horizontal' : 'vertical',
    }
  }

  /** Result for inserting after last child */
  private resultAfterLast(
    children: ChildInfo[],
    containerRect: DOMRect,
    isVertical: boolean
  ): InsertionResult {
    const last = children[children.length - 1]
    const x = last.rect.x + last.rect.width
    const y = last.rect.y + last.rect.height
    return this.buildResult(children.length, x, y, containerRect, isVertical)
  }
}
