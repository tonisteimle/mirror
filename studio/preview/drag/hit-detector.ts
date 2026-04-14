/**
 * HitDetector - Finds the drop target container under cursor
 *
 * Uses elementFromPoint() and walks up the DOM to find
 * the nearest valid container with data-mirror-id.
 * Supports flex, grid, and stacked (position: relative) layouts.
 */

import type { Point, HitResult, FlexLayout } from './types'
import type { LayoutCache } from './layout-cache'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('HitDetector')

export class HitDetector {
  /** Find the container under the cursor */
  detect(cursor: Point, cache: LayoutCache): HitResult | null {
    const element = document.elementFromPoint(cursor.x, cursor.y)
    if (!element) {
      log.warn('No element at cursor', cursor)
      return null
    }

    log.warn(
      'elementFromPoint returned:',
      element.tagName,
      element.className,
      'mirror-id:',
      element.getAttribute('data-mirror-id')
    )
    const result = this.findValidContainer(element, cache)
    if (!result) {
      log.warn(
        'No valid container found starting from',
        element.tagName,
        element.getAttribute('data-mirror-id')
      )
    }
    return result
  }

  /** Walk up DOM to find nearest valid container */
  private findValidContainer(element: Element, cache: LayoutCache): HitResult | null {
    let current: Element | null = element

    while (current) {
      const result = this.tryBuildHitResult(current, cache)
      if (result) return result
      current = current.parentElement
    }
    return null
  }

  /** Try to build HitResult for element */
  private tryBuildHitResult(el: Element, cache: LayoutCache): HitResult | null {
    const nodeId = el.getAttribute('data-mirror-id')
    if (!nodeId) return null

    const style = getComputedStyle(el)
    const layout = this.detectLayout(style)
    if (!layout) {
      log.warn(
        'No valid layout for',
        nodeId,
        '- display:',
        style.display,
        'position:',
        style.position
      )
      return null
    }

    const rect = cache.getRect(nodeId)
    if (!rect) {
      log.warn('No rect in cache for', nodeId)
      return null
    }

    log.warn('Found valid container:', nodeId, 'layout:', layout)
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
