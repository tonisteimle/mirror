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
import type { HitReport, EscapeZoneReport, Reportable } from './reporter/types'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('HitDetector')

/** Pixels from container edge to trigger parent selection */
const ESCAPE_ZONE_SIZE = 24

export class HitDetector implements Reportable<HitReport> {
  // Last detection state for reporting
  private lastCursor: Point = { x: 0, y: 0 }
  private lastElementAtPoint: string | null = null
  private lastResult: HitResult | null = null
  private lastEscapeZone: EscapeZoneReport = {
    detected: false,
    childEnd: null,
    containerEnd: null,
    cursorPos: null,
    usedParent: false,
    parentId: null,
  }

  private resetDetectionState(cursor: Point): void {
    this.lastCursor = cursor
    this.lastEscapeZone = {
      detected: false,
      childEnd: null,
      containerEnd: null,
      cursorPos: null,
      usedParent: false,
      parentId: null,
    }
  }

  detect(cursor: Point, cache: LayoutCache): HitResult | null {
    this.resetDetectionState(cursor)
    const element = document.elementFromPoint(cursor.x, cursor.y)
    if (!element) {
      this.lastElementAtPoint = null
      this.lastResult = null
      return null
    }
    this.lastElementAtPoint = element.getAttribute('data-mirror-id')
    const result = this.findValidContainer(element, cache, cursor)
    this.lastResult = result
    if (!result) log.debug('No valid container at', cursor.x, cursor.y)
    return result
  }

  private tryEscapeToParent(
    element: Element,
    cache: LayoutCache,
    cursor: Point,
    result: HitResult
  ): HitResult | null {
    if (!this.isInEscapeZone(cursor, result, cache)) return null
    const parentResult = this.findParentContainer(element, cache)
    if (!parentResult) return null
    log.debug('Escape zone: using parent', parentResult.containerId)
    this.lastEscapeZone.usedParent = true
    this.lastEscapeZone.parentId = parentResult.containerId
    return parentResult
  }

  private findValidContainer(
    element: Element,
    cache: LayoutCache,
    cursor: Point
  ): HitResult | null {
    let current: Element | null = element
    while (current) {
      const result = this.tryBuildHitResult(current, cache)
      if (result) return this.tryEscapeToParent(current, cache, cursor, result) || result
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

    const detected = isBelowChildren && isNearContainerEdge

    // Record escape zone details for reporting
    this.lastEscapeZone.detected = detected
    this.lastEscapeZone.childEnd = childEnd
    this.lastEscapeZone.containerEnd = containerEnd
    this.lastEscapeZone.cursorPos = cursorPos

    return detected
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

  /** Report current state for debugging */
  report(): HitReport {
    return {
      cursor: { ...this.lastCursor },
      elementAtPoint: this.lastElementAtPoint,
      containerId: this.lastResult?.containerId ?? null,
      layout: this.lastResult?.layout ?? null,
      containerRect: this.lastResult?.containerRect ?? null,
      escapeZone: { ...this.lastEscapeZone },
    }
  }
}
