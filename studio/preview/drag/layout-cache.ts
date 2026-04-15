/**
 * LayoutCache - Caches element rectangles for O(1) lookup during drag
 *
 * Built once at drag start, invalidated at drag end.
 * Avoids expensive getBoundingClientRect() calls during mouse move.
 */

import type { ChildInfo } from './types'
import type { CacheReport, Reportable } from './reporter/types'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('LayoutCache')

export class LayoutCache implements Reportable<CacheReport> {
  private rects = new Map<string, DOMRect>()
  private children = new Map<string, ChildInfo[]>()
  private containerElement: HTMLElement | null = null

  /** Build the cache - call once at drag start */
  build(container: HTMLElement): void {
    this.invalidate()
    this.containerElement = container
    this.cacheAllRects(container)
    this.buildChildrenMap(container)
    log.info('Cache built:', this.rects.size, 'elements')
  }

  /** Cache rects for all elements with data-mirror-id */
  private cacheAllRects(container: HTMLElement): void {
    const elements = container.querySelectorAll('[data-mirror-id]')
    for (const el of elements) {
      const nodeId = el.getAttribute('data-mirror-id')
      if (nodeId) {
        const rect = el.getBoundingClientRect()
        this.rects.set(nodeId, rect)
      }
    }
  }

  /** Group children by parent and sort by position */
  private buildChildrenMap(container: HTMLElement): void {
    const elements = container.querySelectorAll('[data-mirror-id]')
    for (const el of elements) this.addToParent(el)
    this.sortAllChildren()
  }

  /** Add element to its parent's children list */
  private addToParent(el: Element): void {
    const nodeId = el.getAttribute('data-mirror-id')
    const rect = nodeId ? this.rects.get(nodeId) : null
    if (!nodeId || !rect) return

    const parentId = this.getParentId(el)
    if (!parentId) return

    if (!this.children.has(parentId)) this.children.set(parentId, [])
    this.children.get(parentId)!.push({ nodeId, rect })
  }

  /** Get data-mirror-id of nearest parent container */
  private getParentId(el: Element): string | null {
    const parent = el.parentElement?.closest('[data-mirror-id]')
    return parent?.getAttribute('data-mirror-id') ?? null
  }

  /** Sort all children by position (top-to-bottom, left-to-right) */
  private sortAllChildren(): void {
    for (const kids of this.children.values()) {
      kids.sort((a, b) => this.comparePositions(a.rect, b.rect))
    }
  }

  /** Compare two rects by position */
  private comparePositions(a: DOMRect, b: DOMRect): number {
    const topDiff = a.top - b.top
    return Math.abs(topDiff) > 5 ? topDiff : a.left - b.left
  }

  /**
   * Get cached rect for a node - O(1)
   */
  getRect(nodeId: string): DOMRect | null {
    return this.rects.get(nodeId) ?? null
  }

  /**
   * Get children of a container, sorted by position - O(1)
   */
  getChildren(containerId: string): ChildInfo[] {
    return this.children.get(containerId) ?? []
  }

  /**
   * Check if cache has any data
   */
  isEmpty(): boolean {
    return this.rects.size === 0
  }

  /**
   * Get the container element
   */
  getContainer(): HTMLElement | null {
    return this.containerElement
  }

  /**
   * Clear all cached data
   * Call at drag end
   */
  invalidate(): void {
    this.rects.clear()
    this.children.clear()
    this.containerElement = null
  }

  /** Report current state for debugging */
  report(): CacheReport {
    return {
      elementCount: this.rects.size,
      containerCount: this.children.size,
      isEmpty: this.rects.size === 0,
      containerElement: this.containerElement?.getAttribute('data-mirror-id') ?? null,
    }
  }
}
