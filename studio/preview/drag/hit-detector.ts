/**
 * HitDetector - Finds the drop target container under cursor
 *
 * Uses elementFromPoint() and walks up the DOM to find
 * the nearest flex container with data-mirror-id.
 */

import type { Point, HitResult, FlexLayout } from './types'
import type { LayoutCache } from './layout-cache'

export class HitDetector {
  /**
   * Find the flex container under the cursor
   *
   * @param cursor - Current cursor position
   * @param cache - Layout cache with pre-computed rects
   * @returns Hit result with container info, or null if no valid target
   */
  detect(cursor: Point, cache: LayoutCache): HitResult | null {
    // Get element directly under cursor
    const element = document.elementFromPoint(cursor.x, cursor.y)
    if (!element) return null

    // Walk up the DOM to find nearest flex container
    let current: Element | null = element

    while (current) {
      const nodeId = current.getAttribute('data-mirror-id')

      if (nodeId) {
        const style = getComputedStyle(current)

        // Only accept flex containers
        if (style.display === 'flex') {
          const rect = cache.getRect(nodeId)

          if (rect) {
            return {
              containerId: nodeId,
              layout: this.getFlexLayout(style),
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
   * Determine flex layout direction from computed style
   */
  private getFlexLayout(style: CSSStyleDeclaration): FlexLayout {
    const direction = style.flexDirection

    // row, row-reverse → flex-row
    // column, column-reverse → flex-column
    if (direction === 'row' || direction === 'row-reverse') {
      return 'flex-row'
    }

    return 'flex-column'
  }
}
