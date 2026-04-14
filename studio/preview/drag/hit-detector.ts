/**
 * HitDetector - Finds the drop target container under cursor
 *
 * Uses elementFromPoint() and walks up the DOM to find
 * the nearest valid container with data-mirror-id.
 * Supports flex, grid, and stacked (position: relative) layouts.
 */

import type { Point, HitResult, FlexLayout } from './types'
import type { LayoutCache } from './layout-cache'

export class HitDetector {
  /**
   * Find the container under the cursor
   *
   * @param cursor - Current cursor position
   * @param cache - Layout cache with pre-computed rects
   * @returns Hit result with container info, or null if no valid target
   */
  detect(cursor: Point, cache: LayoutCache): HitResult | null {
    // Get element directly under cursor
    const element = document.elementFromPoint(cursor.x, cursor.y)
    if (!element) return null

    // Walk up the DOM to find nearest valid container
    let current: Element | null = element

    while (current) {
      const nodeId = current.getAttribute('data-mirror-id')

      if (nodeId) {
        const style = getComputedStyle(current)
        const layout = this.detectLayout(style)

        // Accept flex, grid, or stacked containers
        if (layout) {
          const rect = cache.getRect(nodeId)

          if (rect) {
            return {
              containerId: nodeId,
              layout,
              containerRect: rect,
            }
          }
        }
      }

      current = current.parentElement
    }

    return null
  }

  /**
   * Detect the layout type from computed style
   * Returns null if not a valid drop container
   */
  private detectLayout(style: CSSStyleDeclaration): FlexLayout | null {
    // Flex layout
    if (style.display === 'flex') {
      const direction = style.flexDirection
      if (direction === 'row' || direction === 'row-reverse') {
        return 'flex-row'
      }
      return 'flex-column'
    }

    // Grid layout - treat as flex-row for insertion purposes
    if (style.display === 'grid') {
      return 'flex-row'
    }

    // Stacked layout (position: relative with no flex/grid)
    // Mirror's stacked containers use position: relative
    if (style.position === 'relative') {
      return 'flex-column' // Default to column for stacked
    }

    return null
  }
}
