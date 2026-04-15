/**
 * CoordinateTransformer - Centralized coordinate transformation for drag-drop
 *
 * Single source of truth for all coordinate transformations:
 * - Client (screen) → Container-local coordinates
 * - Scale factor handling (CSS transform)
 * - RTL support (Bug 3 fix)
 * - Grid snapping (applied once, in one place)
 * - Bounds clamping (Bug 5 fix)
 * - Screen ↔ Container coordinate conversion for guides
 *
 * This solves:
 * - Bug 7: Coordinate system mixing
 * - Bug 1: Inconsistent scale factors
 * - Bug 9: Double grid-snapping
 * - Bug 3: Incomplete RTL support
 * - Bug 5: No bounds clamping
 * - Bug 8: Smart guides coordinate inconsistency
 */

import { detectLayout, type LayoutInfo } from './utils/layout-detection'

/**
 * Grid settings interface for optional dependency injection
 * This allows src/studio to be used independently of studio/core
 */
export interface GridSettingsProvider {
  get: () => { enabled: boolean; size: number }
}

// Injectable grid settings - set by studio runtime on initialization
let gridSettingsProvider: GridSettingsProvider | null = null

/**
 * Set the grid settings provider (called by studio runtime)
 * This breaks the circular dependency between src/studio and studio/core
 */
export function setGridSettingsProvider(provider: GridSettingsProvider): void {
  gridSettingsProvider = provider
}

/**
 * Point in 2D space
 */
export interface Point {
  x: number
  y: number
}

/**
 * Size dimensions
 */
export interface Size {
  width: number
  height: number
}

/**
 * Bounds for clamping
 */
export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Result of coordinate transformation
 */
export interface TransformResult {
  /** Container-local coordinates (snapped if grid enabled, RTL-corrected) */
  position: Point
  /** Raw container-local coordinates (before snapping, but WITH RTL correction) */
  rawPosition: Point
  /** Whether snapping was applied */
  snapped: boolean
  /** Grid size used for snapping (0 if not snapped) */
  gridSize: number
  /** Layout info of the container */
  layout: LayoutInfo
}

/**
 * Options for coordinate transformation
 */
export interface TransformOptions {
  /** Override grid snapping (default: use global gridSettings) */
  snapToGrid?: boolean
  /** Custom grid size (default: use global gridSettings) */
  gridSize?: number
  /** Clamp to container bounds (default: false) */
  clampToBounds?: boolean
  /** Padding from container edges when clamping */
  edgePadding?: number
  /** Element size for bounds clamping (ensures element stays inside) */
  elementSize?: Size
}

/**
 * CoordinateTransformer class
 *
 * Provides consistent coordinate transformation across all drag-drop operations.
 * Use one instance per drag operation for consistent scale/RTL handling.
 */
export class CoordinateTransformer {
  private containerRect: DOMRect
  private layout: LayoutInfo
  private containerWidth: number
  private containerHeight: number

  constructor(container: HTMLElement) {
    this.containerRect = container.getBoundingClientRect()
    this.layout = detectLayout(container)
    // Store logical dimensions (accounting for scale)
    this.containerWidth = this.containerRect.width / this.layout.scale
    this.containerHeight = this.containerRect.height / this.layout.scale
  }

  /**
   * Transform client (screen) coordinates to container-local coordinates
   *
   * This is the main entry point for coordinate transformation.
   * Handles scale, RTL, snapping, and clamping in one place.
   */
  clientToContainer(
    clientX: number,
    clientY: number,
    options: TransformOptions = {}
  ): TransformResult {
    const { scale, isRTL } = this.layout

    // Step 1: Convert to container-relative coordinates, accounting for scale
    let x = (clientX - this.containerRect.left) / scale
    let y = (clientY - this.containerRect.top) / scale

    // Step 2: Handle RTL (x measured from right edge)
    if (isRTL) {
      x = this.containerWidth - x
    }

    // Store raw position AFTER RTL correction but BEFORE snapping
    const rawPosition: Point = { x, y }

    // Step 3: Apply grid snapping (ONLY HERE - single point of snapping)
    const grid = gridSettingsProvider?.get() ?? { enabled: false, size: 8 }
    const shouldSnap = options.snapToGrid ?? grid.enabled
    const gridSize = options.gridSize ?? grid.size
    let snapped = false

    if (shouldSnap && gridSize > 0) {
      x = this.snapValue(x, gridSize)
      y = this.snapValue(y, gridSize)
      snapped = true
    }

    // Step 4: Apply bounds clamping if requested
    if (options.clampToBounds) {
      const padding = options.edgePadding ?? 0
      const elementWidth = options.elementSize?.width ?? 0
      const elementHeight = options.elementSize?.height ?? 0

      const bounds: Bounds = {
        minX: padding,
        minY: padding,
        maxX: this.containerWidth - padding - elementWidth,
        maxY: this.containerHeight - padding - elementHeight,
      }

      x = this.clamp(x, bounds.minX, bounds.maxX)
      y = this.clamp(y, bounds.minY, bounds.maxY)
    }

    // Step 5: Ensure non-negative (elements can't have negative positions)
    x = Math.max(0, x)
    y = Math.max(0, y)

    return {
      position: { x: Math.round(x), y: Math.round(y) },
      rawPosition,
      snapped,
      gridSize: snapped ? gridSize : 0,
      layout: this.layout,
    }
  }

  /**
   * Transform container-local coordinates to render coordinates
   *
   * Used when rendering visual elements (preview, guides) in a different
   * coordinate space (e.g., main container vs. nested container).
   *
   * @param position - Container-local position
   * @param targetContainerRect - The rect of the target render container
   * @param mainContainerRect - The rect of the main preview container
   */
  containerToRender(
    position: Point,
    targetContainerRect: DOMRect,
    mainContainerRect: DOMRect
  ): Point {
    const { scale } = this.layout
    const offsetX = (targetContainerRect.left - mainContainerRect.left) / scale
    const offsetY = (targetContainerRect.top - mainContainerRect.top) / scale
    return { x: offsetX + position.x, y: offsetY + position.y }
  }

  /**
   * Snap a single value to grid
   */
  snapValue(value: number, gridSize: number): number {
    if (gridSize <= 0) return value
    return Math.round(value / gridSize) * gridSize
  }

  /**
   * Snap a point to grid (for external use when grid params are known)
   */
  snapPoint(point: Point, gridSize: number): Point {
    return {
      x: this.snapValue(point.x, gridSize),
      y: this.snapValue(point.y, gridSize),
    }
  }

  /**
   * Clamp a value to a range
   */
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * Get container dimensions (logical, accounting for scale)
   */
  getContainerSize(): Size {
    return {
      width: this.containerWidth,
      height: this.containerHeight,
    }
  }

  /**
   * Get container rect (screen coordinates)
   */
  getContainerRect(): DOMRect {
    return this.containerRect
  }

  /**
   * Get layout info
   */
  getLayout(): LayoutInfo {
    return this.layout
  }

  /**
   * Get scale factor
   */
  getScale(): number {
    return this.layout.scale
  }

  /**
   * Check if RTL mode
   */
  isRTL(): boolean {
    return this.layout.isRTL
  }

  /**
   * Refresh container rect (call if container moved/resized during drag)
   */
  refresh(container: HTMLElement): void {
    this.containerRect = container.getBoundingClientRect()
    this.layout = detectLayout(container)
    this.containerWidth = this.containerRect.width / this.layout.scale
    this.containerHeight = this.containerRect.height / this.layout.scale
  }

  // ============================================================================
  // Bug 8 Fix: Screen ↔ Container conversion for Smart Guides
  // ============================================================================

  /**
   * Convert container-local position to screen (client) coordinates
   * Used for Smart Guides which work in screen coordinates
   *
   * Bug 8 fix: Ensures guides align correctly regardless of scale/scroll
   */
  containerToScreen(position: Point): Point {
    const { scale, isRTL } = this.layout

    let x = position.x
    if (isRTL) {
      // In RTL, x is measured from right edge - convert back
      x = this.containerWidth - x
    }

    return {
      x: this.containerRect.left + x * scale,
      y: this.containerRect.top + position.y * scale,
    }
  }

  /**
   * Convert screen coordinates to container-local (without snapping)
   * Used for reading positions from DOM elements
   */
  screenToContainer(screenX: number, screenY: number): Point {
    const { scale, isRTL } = this.layout

    let x = (screenX - this.containerRect.left) / scale
    const y = (screenY - this.containerRect.top) / scale

    if (isRTL) {
      x = this.containerWidth - x
    }

    return { x, y }
  }

  /**
   * Create a DOMRect in screen coordinates from container-local position and size
   * Used for Smart Guide calculations
   *
   * Bug 8 fix: Consistent rect creation for guide alignment
   */
  createScreenRect(position: Point, size: Size): DOMRect {
    const screenPos = this.containerToScreen(position)
    const { scale } = this.layout

    return new DOMRect(screenPos.x, screenPos.y, size.width * scale, size.height * scale)
  }

  // ============================================================================
  // Bug 5 Fix: Bounds clamping helpers
  // ============================================================================

  /**
   * Clamp a position to stay within container bounds
   * Ensures element doesn't go outside container
   *
   * Bug 5 fix: Prevents elements from being positioned outside container
   */
  clampToContainerBounds(position: Point, elementSize: Size, padding: number = 0): Point {
    const maxX = Math.max(0, this.containerWidth - elementSize.width - padding)
    const maxY = Math.max(0, this.containerHeight - elementSize.height - padding)

    return {
      x: this.clamp(position.x, padding, maxX),
      y: this.clamp(position.y, padding, maxY),
    }
  }

  /**
   * Check if a position is within container bounds
   */
  isWithinBounds(position: Point, elementSize: Size = { width: 0, height: 0 }): boolean {
    return (
      position.x >= 0 &&
      position.y >= 0 &&
      position.x + elementSize.width <= this.containerWidth &&
      position.y + elementSize.height <= this.containerHeight
    )
  }
}

/**
 * Create a CoordinateTransformer for a container
 */
export function createCoordinateTransformer(container: HTMLElement): CoordinateTransformer {
  return new CoordinateTransformer(container)
}
