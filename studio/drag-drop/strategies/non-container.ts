/**
 * NonContainerStrategy
 *
 * Handles drop on non-container elements (Text, Input, Image, etc.).
 * Placement: before | after (as sibling)
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect } from '../types'
import type { DropStrategy, ChildRect } from './types'
import type { LayoutRect } from '../../core/state'

export class NonContainerStrategy implements DropStrategy {
  readonly name = 'NonContainerStrategy'

  matches(target: DropTarget): boolean {
    return target.layoutType === 'none'
  }

  calculate(
    cursor: Point,
    target: DropTarget,
    _source: DragSource,
    _childRects?: ChildRect[],
    containerRect?: Rect
  ): DropResult {
    // Use passed containerRect (which is actually target rect for non-containers)
    // or fall back to DOM read
    const rect = containerRect ?? target.element.getBoundingClientRect()

    // Determine if cursor is in top or bottom half
    // Note: rect.y === rect.top for DOMRect, and our Rect uses y
    const midY = rect.y + rect.height / 2
    const placement: 'before' | 'after' = cursor.y < midY ? 'before' : 'after'

    return {
      target,
      placement,
      targetId: target.nodeId,
    }
  }

  getVisualHint(
    result: DropResult,
    _childRects?: ChildRect[],
    containerRect?: Rect,
    layoutInfo?: Map<string, LayoutRect> | null
  ): VisualHint {
    let rect: { top: number; bottom: number; left: number; width: number; height: number }

    // Try to use layoutInfo if available (Phase 5 optimization)
    if (layoutInfo) {
      const layout = layoutInfo.get(result.target.nodeId)
      if (layout) {
        rect = {
          top: layout.y,
          bottom: layout.y + layout.height,
          left: layout.x,
          width: layout.width,
          height: layout.height,
        }
      } else {
        const domRect = result.target.element.getBoundingClientRect()
        rect = {
          top: domRect.top,
          bottom: domRect.bottom,
          left: domRect.left,
          width: domRect.width,
          height: domRect.height,
        }
      }
    } else {
      const domRect = result.target.element.getBoundingClientRect()
      rect = {
        top: domRect.top,
        bottom: domRect.bottom,
        left: domRect.left,
        width: domRect.width,
        height: domRect.height,
      }
    }

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
