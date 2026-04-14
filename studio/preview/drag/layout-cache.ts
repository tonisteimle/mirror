/**
 * LayoutCache - Caches element rectangles for O(1) lookup during drag
 *
 * Built once at drag start, invalidated at drag end.
 * Avoids expensive getBoundingClientRect() calls during mouse move.
 */

import type { ChildInfo } from './types'

export class LayoutCache {
  private rects = new Map<string, DOMRect>()
  private children = new Map<string, ChildInfo[]>()
  private containerElement: HTMLElement | null = null

  /**
   * Build the cache by traversing all elements with data-mirror-id
   * Call once at drag start
   */
  build(container: HTMLElement): void {
    this.invalidate()
    this.containerElement = container

    // Collect all element rects
    const elements = container.querySelectorAll('[data-mirror-id]')
    for (const el of elements) {
      const nodeId = el.getAttribute('data-mirror-id')
      if (nodeId) {
        this.rects.set(nodeId, el.getBoundingClientRect())
      }
    }

    // Build parent-child relationships
    this.buildChildrenMap(container)
  }

  /**
   * Group children by their parent container and sort by position
   */
  private buildChildrenMap(container: HTMLElement): void {
    const elements = container.querySelectorAll('[data-mirror-id]')

    for (const el of elements) {
      const nodeId = el.getAttribute('data-mirror-id')
      if (!nodeId) continue

      const rect = this.rects.get(nodeId)
      if (!rect) continue

      // Find parent with data-mirror-id
      const parent = el.parentElement?.closest('[data-mirror-id]')
      if (!parent) continue

      const parentId = parent.getAttribute('data-mirror-id')
      if (!parentId) continue

      // Add to parent's children list
      if (!this.children.has(parentId)) {
        this.children.set(parentId, [])
      }
      this.children.get(parentId)!.push({ nodeId, rect })
    }

    // Sort children by position (top-to-bottom, left-to-right)
    for (const kids of this.children.values()) {
      kids.sort((a, b) => {
        const topDiff = a.rect.top - b.rect.top
        if (Math.abs(topDiff) > 5) return topDiff
        return a.rect.left - b.rect.left
      })
    }
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
}
