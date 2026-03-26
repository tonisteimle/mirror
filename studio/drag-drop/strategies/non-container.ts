/**
 * NonContainerStrategy
 *
 * Handles drop on non-container elements (Text, Input, Image, etc.).
 * Placement: before | after (as sibling)
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect } from '../types'
import type { DropStrategy, ChildRect } from './types'

export class NonContainerStrategy implements DropStrategy {
  readonly name = 'NonContainerStrategy'

  matches(target: DropTarget): boolean {
    return target.layoutType === 'none'
  }

  calculate(
    cursor: Point,
    target: DropTarget,
    _source: DragSource
  ): DropResult {
    const rect = target.element.getBoundingClientRect()

    // Determine if cursor is in top or bottom half
    const midY = rect.top + rect.height / 2
    const placement: 'before' | 'after' = cursor.y < midY ? 'before' : 'after'

    return {
      target,
      placement,
      targetId: target.nodeId,
    }
  }

  getVisualHint(result: DropResult, _childRects?: ChildRect[], containerRect?: Rect): VisualHint {
    const rect = result.target.element.getBoundingClientRect()

    // Horizontal line above or below the element
    const y = result.placement === 'before' ? rect.top : rect.bottom
    const thickness = 2

    // Use container width if available for full-width line
    const width = containerRect?.width ?? rect.width

    return {
      type: 'line',
      direction: 'horizontal',
      rect: {
        x: containerRect?.x ?? rect.left,
        y: y - thickness / 2,
        width: width,
        height: thickness,
      },
    }
  }
}
