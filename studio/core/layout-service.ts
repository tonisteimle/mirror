/**
 * LayoutService - Unified layout cache management
 *
 * Provides a single source of truth for layout information across all
 * visual systems (HandleManager, ResizeManager, OverlayManager).
 *
 * Features:
 * - Cached layout reads from state.layoutInfo
 * - Automatic fallback to DOM reads when cache miss
 * - Consistent coordinate system (relative to container)
 * - Version tracking for staleness detection
 */

import { state, actions, events } from './index'
import type { LayoutRect } from './state'

export interface LayoutReadOptions {
  /** If true, skip cache and always read from DOM */
  forceDOM?: boolean
  /** Container element for relative positioning (required for DOM fallback) */
  container?: HTMLElement
}

export interface ElementLayout {
  x: number
  y: number
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
  margin: { top: number; right: number; bottom: number; left: number }
  gap: number
  radius: number
  isAbsolute: boolean
  isContainer: boolean
  flexDirection: 'row' | 'column' | null
  parentId: string | null
}

/**
 * LayoutService provides unified access to element layout information.
 *
 * Usage:
 * ```ts
 * const service = createLayoutService({ container: previewContainer })
 *
 * // Get layout for a single element
 * const layout = service.getLayout('node-123')
 *
 * // Get layout with forced DOM read
 * const freshLayout = service.getLayout('node-123', { forceDOM: true })
 *
 * // Get multiple layouts efficiently
 * const layouts = service.getLayouts(['node-1', 'node-2', 'node-3'])
 * ```
 */
export class LayoutService {
  private container: HTMLElement
  private nodeIdAttribute: string

  // Parent-child index for O(1) child lookups (built on-demand, cached)
  private childrenIndex: Map<string, string[]> | null = null
  private childrenIndexVersion: number = -1

  constructor(config: { container: HTMLElement; nodeIdAttribute?: string }) {
    this.container = config.container
    this.nodeIdAttribute = config.nodeIdAttribute || 'data-mirror-id'
  }

  /**
   * Get layout for a single element
   *
   * Priority:
   * 1. Cached layoutInfo from state (fast, no DOM reads)
   * 2. Fallback to DOM read (slower, but always current)
   *
   * @param nodeId - The node ID to get layout for
   * @param options - Optional configuration
   * @returns ElementLayout or null if element not found
   */
  getLayout(nodeId: string, options: LayoutReadOptions = {}): ElementLayout | null {
    // Try cache first (unless forceDOM)
    if (!options.forceDOM) {
      const cached = this.getFromCache(nodeId)
      if (cached) {
        return cached
      }
    }

    // Fallback to DOM read
    const container = options.container || this.container
    return this.readFromDOM(nodeId, container)
  }

  /**
   * Get layouts for multiple elements efficiently
   *
   * @param nodeIds - Array of node IDs
   * @param options - Optional configuration
   * @returns Map from nodeId to ElementLayout
   */
  getLayouts(nodeIds: string[], options: LayoutReadOptions = {}): Map<string, ElementLayout> {
    const result = new Map<string, ElementLayout>()
    const container = options.container || this.container

    for (const nodeId of nodeIds) {
      const layout = this.getLayout(nodeId, { ...options, container })
      if (layout) {
        result.set(nodeId, layout)
      }
    }

    return result
  }

  /**
   * Get layout from cached state.layoutInfo
   */
  private getFromCache(nodeId: string): ElementLayout | null {
    const layoutInfo = state.get().layoutInfo
    const cached = layoutInfo.get(nodeId)

    if (!cached) {
      return null
    }

    // Convert LayoutRect to ElementLayout
    return {
      x: cached.x,
      y: cached.y,
      width: cached.width,
      height: cached.height,
      padding: cached.padding,
      margin: cached.margin,
      gap: cached.gap,
      radius: cached.radius,
      isAbsolute: cached.isAbsolute,
      isContainer: cached.isContainer,
      flexDirection: cached.flexDirection,
      parentId: cached.parentId,
    }
  }

  /**
   * Read layout directly from DOM
   */
  private readFromDOM(nodeId: string, container: HTMLElement): ElementLayout | null {
    const element = container.querySelector(
      `[${this.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null

    if (!element) {
      return null
    }

    const rect = element.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const style = window.getComputedStyle(element)

    const padding = {
      top: parseFloat(style.paddingTop) || 0,
      right: parseFloat(style.paddingRight) || 0,
      bottom: parseFloat(style.paddingBottom) || 0,
      left: parseFloat(style.paddingLeft) || 0,
    }

    const margin = {
      top: parseFloat(style.marginTop) || 0,
      right: parseFloat(style.marginRight) || 0,
      bottom: parseFloat(style.marginBottom) || 0,
      left: parseFloat(style.marginLeft) || 0,
    }

    const gap = parseFloat(style.gap) || 0
    const radius = parseFloat(style.borderRadius) || 0
    const isAbsolute = style.position === 'absolute'
    const isContainer =
      (style.display === 'flex' || style.display === 'grid') && element.children.length > 0

    let flexDirection: 'row' | 'column' | null = null
    if (style.display === 'flex') {
      flexDirection =
        style.flexDirection === 'row' || style.flexDirection === 'row-reverse' ? 'row' : 'column'
    }

    // Get parent ID
    const parentElement = element.parentElement?.closest(`[${this.nodeIdAttribute}]`)
    const parentId = parentElement?.getAttribute(this.nodeIdAttribute) || null

    return {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
      padding,
      margin,
      gap,
      radius,
      isAbsolute,
      isContainer,
      flexDirection,
      parentId,
    }
  }

  /**
   * Check if layout cache is currently valid (has data)
   */
  hasCache(): boolean {
    return state.get().layoutInfo.size > 0
  }

  /**
   * Get current layout version for staleness checks
   */
  getVersion(): number {
    return state.get().layoutVersion
  }

  /**
   * Invalidate the layout cache
   */
  invalidate(reason: 'scroll' | 'zoom' | 'resize' | 'transform' | 'manual' = 'manual'): void {
    actions.invalidateLayoutInfo(reason)
  }

  /**
   * Build parent-child index for O(1) lookups
   * Only rebuilds when layout version changes
   */
  private ensureChildrenIndex(): Map<string, string[]> {
    const currentVersion = state.get().layoutVersion

    // Return cached index if version matches
    if (this.childrenIndex && this.childrenIndexVersion === currentVersion) {
      return this.childrenIndex
    }

    // Build new index
    const layoutInfo = state.get().layoutInfo
    const index = new Map<string, string[]>()

    for (const [nodeId, layout] of layoutInfo) {
      if (layout.parentId) {
        const siblings = index.get(layout.parentId)
        if (siblings) {
          siblings.push(nodeId)
        } else {
          index.set(layout.parentId, [nodeId])
        }
      }
    }

    // Cache the index
    this.childrenIndex = index
    this.childrenIndexVersion = currentVersion

    return index
  }

  /**
   * Get child node IDs for a parent (O(1) lookup after index is built)
   *
   * @param parentId - Parent node ID
   * @returns Array of child node IDs
   */
  getChildIds(parentId: string): string[] {
    const index = this.ensureChildrenIndex()
    return index.get(parentId) || []
  }

  /**
   * Get children layouts for a container
   *
   * @param parentId - Parent node ID
   * @returns Array of child ElementLayouts sorted by position
   */
  getChildrenLayouts(parentId: string): ElementLayout[] {
    const layoutInfo = state.get().layoutInfo
    const childIds = this.getChildIds(parentId)
    const children: ElementLayout[] = []

    // Use index for O(1) lookup instead of O(n) iteration
    for (const nodeId of childIds) {
      const layout = layoutInfo.get(nodeId)
      if (layout) {
        children.push({
          x: layout.x,
          y: layout.y,
          width: layout.width,
          height: layout.height,
          padding: layout.padding,
          margin: layout.margin,
          gap: layout.gap,
          radius: layout.radius,
          isAbsolute: layout.isAbsolute,
          isContainer: layout.isContainer,
          flexDirection: layout.flexDirection,
          parentId: layout.parentId,
        })
      }
    }

    // Sort by position (top to bottom, left to right)
    children.sort((a, b) => {
      if (Math.abs(a.y - b.y) < 5) {
        return a.x - b.x
      }
      return a.y - b.y
    })

    return children
  }

  /**
   * Calculate gap position between first two children of a container
   *
   * @param parentId - Parent node ID
   * @returns Gap center position or null if not applicable
   */
  getGapPosition(parentId: string): { x: number; y: number; isHorizontal: boolean } | null {
    const parent = this.getLayout(parentId)
    if (!parent || !parent.isContainer) {
      return null
    }

    const children = this.getChildrenLayouts(parentId)
    if (children.length < 2) {
      return null
    }

    const isHorizontal = parent.flexDirection === 'row'
    const first = children[0]
    const second = children[1]

    if (isHorizontal) {
      return {
        x: (first.x + first.width + second.x) / 2,
        y: parent.y + parent.height / 2,
        isHorizontal: true,
      }
    } else {
      return {
        x: parent.x + parent.width / 2,
        y: (first.y + first.height + second.y) / 2,
        isHorizontal: false,
      }
    }
  }
}

/**
 * Create a new LayoutService instance
 */
export function createLayoutService(config: {
  container: HTMLElement
  nodeIdAttribute?: string
}): LayoutService {
  return new LayoutService(config)
}

// Singleton instance for global access
let globalLayoutService: LayoutService | null = null

/**
 * Get the global LayoutService instance
 */
export function getLayoutService(): LayoutService | null {
  return globalLayoutService
}

/**
 * Set the global LayoutService instance
 */
export function setLayoutService(service: LayoutService | null): void {
  globalLayoutService = service
}
