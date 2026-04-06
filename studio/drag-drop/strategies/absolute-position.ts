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
    source: DragSource
  ): DropResult {
    // Get container rect
    const containerRect = target.element.getBoundingClientRect()

    // Get scroll offsets of the container
    const scrollLeft = target.element.scrollLeft
    const scrollTop = target.element.scrollTop

    // Calculate position relative to container (WITH scroll compensation)
    // This is the position that will be stored in the source code
    const relativeX = cursor.x - containerRect.left + scrollLeft
    const relativeY = cursor.y - containerRect.top + scrollTop

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

  getVisualHint(result: DropResult, _childRects?: unknown, containerRect?: Rect): VisualHint | null {
    // For absolute positioning, show a ghost indicator
    if (result.placement !== 'absolute' || !result.position) {
      return null
    }

    // Ghost position is WITHOUT scroll (for visual display)
    // The result.position already includes scroll offset for code generation
    // But for visual display, we need viewport coordinates

    const targetRect = result.target.element.getBoundingClientRect()
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
