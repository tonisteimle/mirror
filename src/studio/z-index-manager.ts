/**
 * Z-Index Manager for Absolute Containers
 *
 * Bug 6 fix: Manages z-index stacking order for elements in absolute/positioned containers.
 *
 * Features:
 * - Track highest z-index in a container
 * - Auto-assign z-index to new/moved elements (bring to front)
 * - Bring to front / Send to back operations
 * - Normalize z-indices to prevent unbounded growth
 */

/**
 * Z-Index operation result
 */
export interface ZIndexResult {
  /** The z-index value to apply */
  zIndex: number
  /** Whether other elements need their z-index updated */
  needsNormalization: boolean
}

/**
 * Element z-index info
 */
export interface ElementZInfo {
  nodeId: string
  zIndex: number
  element: HTMLElement
}

/**
 * Z-Index Manager
 */
export class ZIndexManager {
  private container: HTMLElement
  private nodeIdAttribute: string

  /** Threshold for normalizing z-indices (prevent unbounded growth) */
  private static readonly NORMALIZE_THRESHOLD = 1000
  /** Base z-index for elements */
  private static readonly BASE_Z_INDEX = 1

  constructor(container: HTMLElement, nodeIdAttribute = 'data-mirror-id') {
    this.container = container
    this.nodeIdAttribute = nodeIdAttribute
  }

  /**
   * Get z-index for a new element (will be on top)
   */
  getZIndexForNew(): ZIndexResult {
    const highest = this.getHighestZIndex()
    const newZ = highest + 1

    return {
      zIndex: newZ,
      needsNormalization: newZ > ZIndexManager.NORMALIZE_THRESHOLD,
    }
  }

  /**
   * Get z-index to bring an element to front
   */
  bringToFront(nodeId: string): ZIndexResult {
    const highest = this.getHighestZIndex()
    const current = this.getElementZIndex(nodeId)

    // Already on top
    if (current >= highest) {
      return { zIndex: current, needsNormalization: false }
    }

    const newZ = highest + 1
    return {
      zIndex: newZ,
      needsNormalization: newZ > ZIndexManager.NORMALIZE_THRESHOLD,
    }
  }

  /**
   * Get z-index to send an element to back
   */
  sendToBack(nodeId: string): ZIndexResult {
    const lowest = this.getLowestZIndex()
    const current = this.getElementZIndex(nodeId)

    // Already on bottom
    if (current <= lowest) {
      return { zIndex: current, needsNormalization: false }
    }

    // Use lowest - 1, but not below BASE_Z_INDEX
    const newZ = Math.max(ZIndexManager.BASE_Z_INDEX, lowest - 1)

    // If we can't go lower, we need to normalize all z-indices
    if (newZ === lowest) {
      return { zIndex: newZ, needsNormalization: true }
    }

    return { zIndex: newZ, needsNormalization: false }
  }

  /**
   * Move element one layer up
   */
  moveUp(nodeId: string): ZIndexResult {
    const elements = this.getAllElementsWithZIndex()
    const currentZ = this.getElementZIndex(nodeId)

    // Find next higher z-index
    const higherElements = elements.filter(e => e.zIndex > currentZ)
    if (higherElements.length === 0) {
      return { zIndex: currentZ, needsNormalization: false }
    }

    const nextHigher = Math.min(...higherElements.map(e => e.zIndex))
    return { zIndex: nextHigher + 1, needsNormalization: false }
  }

  /**
   * Move element one layer down
   */
  moveDown(nodeId: string): ZIndexResult {
    const elements = this.getAllElementsWithZIndex()
    const currentZ = this.getElementZIndex(nodeId)

    // Find next lower z-index
    const lowerElements = elements.filter(e => e.zIndex < currentZ)
    if (lowerElements.length === 0) {
      return { zIndex: currentZ, needsNormalization: false }
    }

    const nextLower = Math.max(...lowerElements.map(e => e.zIndex))
    return { zIndex: Math.max(ZIndexManager.BASE_Z_INDEX, nextLower - 1), needsNormalization: false }
  }

  /**
   * Get normalized z-indices for all elements
   * Returns a map of nodeId -> new z-index
   */
  getNormalizedZIndices(): Map<string, number> {
    const elements = this.getAllElementsWithZIndex()

    // Sort by current z-index
    elements.sort((a, b) => a.zIndex - b.zIndex)

    // Assign sequential z-indices starting from BASE
    const result = new Map<string, number>()
    elements.forEach((el, index) => {
      result.set(el.nodeId, ZIndexManager.BASE_Z_INDEX + index)
    })

    return result
  }

  /**
   * Get the highest z-index in the container
   */
  getHighestZIndex(): number {
    const elements = this.getAllElementsWithZIndex()
    if (elements.length === 0) return ZIndexManager.BASE_Z_INDEX

    return Math.max(...elements.map(e => e.zIndex))
  }

  /**
   * Get the lowest z-index in the container
   */
  getLowestZIndex(): number {
    const elements = this.getAllElementsWithZIndex()
    if (elements.length === 0) return ZIndexManager.BASE_Z_INDEX

    return Math.min(...elements.map(e => e.zIndex))
  }

  /**
   * Get z-index of a specific element
   */
  getElementZIndex(nodeId: string): number {
    const element = this.container.querySelector(
      `[${this.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null

    if (!element) return ZIndexManager.BASE_Z_INDEX

    const zIndex = parseInt(element.style.zIndex || '0', 10)
    return isNaN(zIndex) ? ZIndexManager.BASE_Z_INDEX : zIndex
  }

  /**
   * Get all elements with their z-index info
   */
  private getAllElementsWithZIndex(): ElementZInfo[] {
    const elements: ElementZInfo[] = []

    const children = this.container.querySelectorAll(`[${this.nodeIdAttribute}]`)
    for (const child of Array.from(children)) {
      const element = child as HTMLElement
      const nodeId = element.getAttribute(this.nodeIdAttribute)

      // Only include direct children (not nested)
      if (nodeId && element.parentElement === this.container) {
        const zIndex = parseInt(element.style.zIndex || '0', 10)
        elements.push({
          nodeId,
          zIndex: isNaN(zIndex) ? ZIndexManager.BASE_Z_INDEX : zIndex,
          element,
        })
      }
    }

    return elements
  }
}

/**
 * Create a ZIndexManager for a container
 */
export function createZIndexManager(
  container: HTMLElement,
  nodeIdAttribute?: string
): ZIndexManager {
  return new ZIndexManager(container, nodeIdAttribute)
}
