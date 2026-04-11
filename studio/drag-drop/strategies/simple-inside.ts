/**
 * SimpleInsideStrategy
 *
 * Handles drop on empty flex containers.
 * No zone detection, no positioning - just insert as first child.
 *
 * Note: Positioned containers are handled by AbsolutePositionStrategy.
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect } from '../types'
import type { DropStrategy } from './types'
import type { LayoutRect } from '../../core/state'

export class SimpleInsideStrategy implements DropStrategy {
  readonly name = 'SimpleInsideStrategy'

  matches(target: DropTarget): boolean {
    // Match only empty flex containers (no children)
    // Positioned containers are handled by AbsolutePositionStrategy
    return target.layoutType === 'flex' && !target.hasChildren
  }

  calculate(
    _cursor: Point,
    target: DropTarget,
    _source: DragSource,
    _childRects?: unknown,
    _containerRect?: Rect
  ): DropResult {
    // Always insert inside as last child
    return {
      target,
      placement: 'inside',
      targetId: target.nodeId,
      insertionIndex: 0, // First child since container is empty
    }
  }

  getVisualHint(
    result: DropResult,
    _childRects?: unknown,
    containerRect?: Rect,
    layoutInfo?: Map<string, LayoutRect> | null
  ): VisualHint {
    // Show outline around the target container
    if (containerRect) {
      return {
        type: 'outline',
        rect: containerRect,
      }
    }

    // Try to use layoutInfo if available (Phase 5 optimization)
    if (layoutInfo) {
      const layout = layoutInfo.get(result.target.nodeId)
      if (layout) {
        return {
          type: 'outline',
          rect: {
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
          },
        }
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
