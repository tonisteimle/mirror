/**
 * SpatialCache - Simple spatial index for element lookup
 *
 * Provides spatial queries for finding elements near a point.
 * Uses a simple array-based approach that works well for typical
 * canvas sizes (< 500 elements).
 *
 * For very large canvases (1000+ elements), consider using
 * a proper R-tree implementation.
 */

/**
 * Item stored in the spatial index
 */
export interface SpatialItem {
  /** Bounding box min X (left) */
  minX: number
  /** Bounding box min Y (top) */
  minY: number
  /** Bounding box max X (right) */
  maxX: number
  /** Bounding box max Y (bottom) */
  maxY: number
  /** Mirror node ID */
  nodeId: string
  /** Reference to the DOM element */
  element: HTMLElement
}

/**
 * SpatialCache class
 *
 * Simple array-based spatial index. For typical use cases
 * (< 500 elements), linear search is fast enough and avoids
 * external dependencies.
 */
export class SpatialCache {
  private items: SpatialItem[] = []

  /**
   * Rebuild the spatial index with new elements
   *
   * @param elements - Elements to index (must have data-mirror-id attribute)
   */
  rebuild(elements: HTMLElement[]): void {
    this.items = []
    for (const el of elements) {
      const nodeId = el.dataset.mirrorId
      if (!nodeId) continue
      const rect = el.getBoundingClientRect()
      this.items.push({
        minX: rect.left,
        minY: rect.top,
        maxX: rect.right,
        maxY: rect.bottom,
        nodeId,
        element: el,
      })
    }
  }

  /**
   * Clear the spatial index
   */
  clear(): void {
    this.items = []
  }

  /**
   * Get the number of indexed items
   */
  get size(): number {
    return this.items.length
  }

  /**
   * Check if the cache is empty
   */
  get isEmpty(): boolean {
    return this.items.length === 0
  }

  /**
   * Find items near a point within a radius
   *
   * @param x - X coordinate (client/viewport)
   * @param y - Y coordinate (client/viewport)
   * @param radius - Search radius in pixels (default: 50)
   * @returns Items whose bounding boxes intersect the search area
   */
  findNearPoint(x: number, y: number, radius: number = 50): SpatialItem[] {
    const searchMinX = x - radius
    const searchMinY = y - radius
    const searchMaxX = x + radius
    const searchMaxY = y + radius

    return this.items.filter(
      item =>
        item.maxX >= searchMinX &&
        item.minX <= searchMaxX &&
        item.maxY >= searchMinY &&
        item.minY <= searchMaxY
    )
  }

  /**
   * Find items that contain a specific point
   *
   * @param x - X coordinate (client/viewport)
   * @param y - Y coordinate (client/viewport)
   * @returns Items whose bounding boxes contain the point
   */
  findAtPoint(x: number, y: number): SpatialItem[] {
    return this.items.filter(
      item => x >= item.minX && x <= item.maxX && y >= item.minY && y <= item.maxY
    )
  }

  /**
   * Find items that intersect a rectangle
   *
   * @param minX - Rectangle left edge
   * @param minY - Rectangle top edge
   * @param maxX - Rectangle right edge
   * @param maxY - Rectangle bottom edge
   * @returns Items whose bounding boxes intersect the rectangle
   */
  findInRect(minX: number, minY: number, maxX: number, maxY: number): SpatialItem[] {
    return this.items.filter(
      item => item.maxX >= minX && item.minX <= maxX && item.maxY >= minY && item.minY <= maxY
    )
  }

  /**
   * Get all indexed items
   */
  getAll(): SpatialItem[] {
    return [...this.items]
  }
}

/**
 * Create a new SpatialCache instance
 */
export function createSpatialCache(): SpatialCache {
  return new SpatialCache()
}
