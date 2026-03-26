/**
 * SimpleInsideStrategy
 *
 * Handles drop on empty containers or containers where we just want to insert inside.
 * No zone detection, no positioning - just insert as last child.
 *
 * This is the Webflow-style approach for empty containers.
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect } from '../types'
import type { DropStrategy } from './types'

export class SimpleInsideStrategy implements DropStrategy {
  readonly name = 'SimpleInsideStrategy'

  matches(target: DropTarget): boolean {
    // Match empty flex containers (no children)
    // Also match positioned containers (we treat them as simple insert)
    return (
      (target.layoutType === 'flex' && !target.hasChildren) ||
      target.layoutType === 'positioned'
    )
  }

  calculate(
    _cursor: Point,
    target: DropTarget,
    _source: DragSource
  ): DropResult {
    // Always insert inside as last child
    return {
      target,
      placement: 'inside',
      targetId: target.nodeId,
      insertionIndex: 0, // First child since container is empty
    }
  }

  getVisualHint(result: DropResult, _childRects?: unknown, containerRect?: Rect): VisualHint {
    // Show outline around the target container
    if (containerRect) {
      return {
        type: 'outline',
        rect: containerRect,
      }
    }

    // Fallback to element rect
    const rect = result.target.element.getBoundingClientRect()
    return {
      type: 'outline',
      rect: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
    }
  }
}
