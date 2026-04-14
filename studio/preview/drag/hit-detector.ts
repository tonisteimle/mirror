/**
 * HitDetector - Finds the drop target container under cursor
 *
 * Uses elementFromPoint() and walks up the DOM to find
 * the nearest valid container with data-mirror-id.
 * Supports flex, grid, and stacked (position: relative) layouts.
 *
 * Edge Detection: When cursor is in an "escape zone" near the container's
 * edge (below children), the parent container is returned instead.
 * This allows dragging elements out of nested containers.
 */

import type { Point, HitResult, FlexLayout } from './types'
import type { LayoutCache } from './layout-cache'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('HitDetector')

/** Pixels from container edge to trigger parent selection */
const ESCAPE_ZONE_SIZE = 24

export class HitDetector {
  /** Find the container under the cursor */
  detect(cursor: Point, cache: LayoutCache): HitResult | null {
    const element = document.elementFromPoint(cursor.x, cursor.y)
    if (!element) {
      return null
    }

    const result = this.findValidContainer(element, cache, cursor)
    // Debug logging only - use log.debug for frequent operations
    if (!result) {
      log.debug('No valid container at', cursor.x, cursor.y)
    }
    return result
  }

  /** Walk up DOM to find nearest valid container */
  private findValidContainer(
    element: Element,
    cache: LayoutCache,
    cursor: Point
  ): HitResult | null {
    let current: Element | null = element

    while (current) {
      const result = this.tryBuildHitResult(current, cache)
      if (result) {
        // Check if cursor is in escape zone - if so, try parent instead
        if (this.isInEscapeZone(cursor, result, cache)) {
          const parentResult = this.findParentContainer(current, cache)
          if (parentResult) {
            log.debug('Escape zone: using parent', parentResult.containerId)
            return parentResult
          }
        }
        return result
      }
      current = current.parentElement
    }
    return null
  }

  /** Find parent container (skip current) */
  private findParentContainer(element: Element, cache: LayoutCache): HitResult | null {
    let current = element.parentElement
    while (current) {
      const result = this.tryBuildHitResult(current, cache)
      if (result) return result
      current = current.parentElement
    }
    return null
  }

  /** Check if cursor is in escape zone (near bottom edge, below children) */
  private isInEscapeZone(cursor: Point, hit: HitResult, cache: LayoutCache): boolean {
    const children = cache.getChildren(hit.containerId)
    if (children.length === 0) return false

    const isVertical = hit.layout === 'flex-column'

    // Get the last child's bottom/right edge
    const lastChild = children[children.length - 1]
    const childEnd = isVertical
      ? lastChild.rect.y + lastChild.rect.height
      : lastChild.rect.x + lastChild.rect.width

    // Get the container's bottom/right edge
    const containerEnd = isVertical
      ? hit.containerRect.y + hit.containerRect.height
      : hit.containerRect.x + hit.containerRect.width

    // Cursor position on relevant axis
    const cursorPos = isVertical ? cursor.y : cursor.x

    // Is cursor below/after last child AND near container edge?
    const isBelowChildren = cursorPos > childEnd
    const isNearContainerEdge = containerEnd - cursorPos < ESCAPE_ZONE_SIZE

    return isBelowChildren && isNearContainerEdge
  }

  /** Try to build HitResult for element */
  private tryBuildHitResult(el: Element, cache: LayoutCache): HitResult | null {
    const nodeId = el.getAttribute('data-mirror-id')
    if (!nodeId) return null

    const style = getComputedStyle(el)
    const layout = this.detectLayout(style)
    if (!layout) return null

    const rect = cache.getRect(nodeId)
    if (!rect) return null

    return { containerId: nodeId, layout, containerRect: rect }
  }

  /** Detect layout type from computed style */
  private detectLayout(style: CSSStyleDeclaration): FlexLayout | null {
    if (style.display === 'flex') return this.getFlexDirection(style)
    if (style.display === 'grid') return 'flex-row'
    if (style.position === 'relative') return 'flex-column'
    return null
  }

  /** Get flex direction as layout type */
  private getFlexDirection(style: CSSStyleDeclaration): FlexLayout {
    const dir = style.flexDirection
    return dir === 'row' || dir === 'row-reverse' ? 'flex-row' : 'flex-column'
  }
}
