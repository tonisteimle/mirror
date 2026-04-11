/**
 * AbsolutePositionStrategy
 *
 * Handles drop on positioned (stacked) containers.
 * Calculates absolute x/y position relative to container.
 *
 * Key differences from flex layout:
 * - Uses cursor position directly for drop coordinates
 * - Shows ghost indicator instead of insertion line
 * - Returns 'absolute' placement with x/y position
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect, Size } from '../types'
import type { DropStrategy } from './types'
import type { LayoutRect } from '../../core/state'

/** Default size for ghost when source doesn't specify one */
const DEFAULT_GHOST_SIZE: Size = { width: 100, height: 40 }

export class AbsolutePositionStrategy implements DropStrategy {
  readonly name = 'AbsolutePositionStrategy'

  matches(target: DropTarget): boolean {
    // Match only positioned containers (stacked layout)
    return target.layoutType === 'positioned'
  }

  calculate(
    cursor: Point,
    target: DropTarget,
    source: DragSource,
    _childRects?: unknown,
    containerRect?: Rect
  ): DropResult {
    // Use passed containerRect or fall back to DOM read
    const rect = containerRect ?? target.element.getBoundingClientRect()

    // Get scroll offsets of the container
    const scrollLeft = target.element.scrollLeft
    const scrollTop = target.element.scrollTop

    // Calculate position relative to container (WITH scroll compensation)
    // This is the position that will be stored in the source code
    // Note: rect.x === rect.left for DOMRect, and our Rect uses x/y
    const relativeX = cursor.x - rect.x + scrollLeft
    const relativeY = cursor.y - rect.y + scrollTop

    // Get ghost size for centering
    const ghostSize = source.size ?? DEFAULT_GHOST_SIZE

    // Center the ghost on cursor
    const centeredX = Math.round(relativeX - ghostSize.width / 2)
    const centeredY = Math.round(relativeY - ghostSize.height / 2)

    // Clamp to container bounds (optional: ensure element stays within container)
    const clampedX = Math.max(0, centeredX)
    const clampedY = Math.max(0, centeredY)

    return {
      target,
      placement: 'absolute',
      targetId: target.nodeId,
      position: {
        x: clampedX,
        y: clampedY,
      },
      ghostSize, // Store for use in getVisualHint
    }
  }

  getVisualHint(
    result: DropResult,
    _childRects?: unknown,
    containerRect?: Rect,
    layoutInfo?: Map<string, LayoutRect> | null
  ): VisualHint | null {
    // For absolute positioning, show a ghost indicator
    if (result.placement !== 'absolute' || !result.position) {
      return null
    }

    // Ghost position is WITHOUT scroll (for visual display)
    // The result.position already includes scroll offset for code generation
    // But for visual display, we need viewport coordinates

    let targetRect: { left: number; top: number }

    // Try to use layoutInfo if available (Phase 5 optimization)
    if (layoutInfo) {
      const layout = layoutInfo.get(result.target.nodeId)
      if (layout) {
        targetRect = { left: layout.x, top: layout.y }
      } else {
        targetRect = result.target.element.getBoundingClientRect()
      }
    } else {
      targetRect = result.target.element.getBoundingClientRect()
    }

    const scrollLeft = result.target.element.scrollLeft
    const scrollTop = result.target.element.scrollTop

    // Convert from scroll-compensated to viewport coordinates
    const viewportX = targetRect.left + result.position.x - scrollLeft
    const viewportY = targetRect.top + result.position.y - scrollTop

    // Use ghostSize from result (set in calculate) or default
    const ghostSize = result.ghostSize ?? DEFAULT_GHOST_SIZE

    return {
      type: 'ghost',
      rect: {
        x: viewportX,
        y: viewportY,
        width: ghostSize.width,
        height: ghostSize.height,
      },
      ghostSize,
    }
  }
}
