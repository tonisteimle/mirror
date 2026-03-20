/**
 * Coordinate Model - Pure coordinate transformation utilities
 *
 * No DOM dependencies. Handles transformations between:
 * - Client coordinates (mouse events)
 * - Canvas coordinates (preview container)
 * - Element coordinates (relative to parent)
 */

// ============================================================================
// Types
// ============================================================================

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Bounds {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * Transform context containing offsets and scale
 */
export interface CoordinateContext {
  /** Canvas offset from client origin */
  canvasOffset: Point
  /** Current scale factor (zoom level) */
  scale: number
  /** Scroll offset within canvas */
  scrollOffset: Point
}

// ============================================================================
// Coordinate Transformations
// ============================================================================

/**
 * Convert client coordinates to canvas coordinates
 */
export function clientToCanvas(client: Point, context: CoordinateContext): Point {
  return {
    x: (client.x - context.canvasOffset.x + context.scrollOffset.x) / context.scale,
    y: (client.y - context.canvasOffset.y + context.scrollOffset.y) / context.scale,
  }
}

/**
 * Convert canvas coordinates to client coordinates
 */
export function canvasToClient(canvas: Point, context: CoordinateContext): Point {
  return {
    x: canvas.x * context.scale + context.canvasOffset.x - context.scrollOffset.x,
    y: canvas.y * context.scale + context.canvasOffset.y - context.scrollOffset.y,
  }
}

/**
 * Convert element-relative coordinates to canvas coordinates
 */
export function elementToCanvas(point: Point, elementRect: Rect): Point {
  return {
    x: elementRect.x + point.x,
    y: elementRect.y + point.y,
  }
}

/**
 * Convert canvas coordinates to element-relative coordinates
 */
export function canvasToElement(point: Point, elementRect: Rect): Point {
  return {
    x: point.x - elementRect.x,
    y: point.y - elementRect.y,
  }
}

// ============================================================================
// Rect Utilities
// ============================================================================

/**
 * Get center point of a rect
 */
export function getCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  }
}

/**
 * Get bounds from rect
 */
export function rectToBounds(rect: Rect): Bounds {
  return {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
  }
}

/**
 * Get rect from bounds
 */
export function boundsToRect(bounds: Bounds): Rect {
  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
  }
}

/**
 * Check if a point is inside a rect
 */
export function pointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

/**
 * Check if two rects intersect
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  )
}

/**
 * Get intersection of two rects (returns null if no intersection)
 */
export function getIntersection(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.x, b.x)
  const top = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)

  if (right <= left || bottom <= top) {
    return null
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

/**
 * Get union of two rects (bounding box)
 */
export function getUnion(a: Rect, b: Rect): Rect {
  const left = Math.min(a.x, b.x)
  const top = Math.min(a.y, b.y)
  const right = Math.max(a.x + a.width, b.x + b.width)
  const bottom = Math.max(a.y + a.height, b.y + b.height)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

/**
 * Expand rect by padding
 */
export function expandRect(rect: Rect, padding: number): Rect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

/**
 * Contract rect by padding (opposite of expand)
 */
export function contractRect(rect: Rect, padding: number): Rect {
  return expandRect(rect, -padding)
}

// ============================================================================
// Point Utilities
// ============================================================================

/**
 * Calculate distance between two points
 */
export function distance(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Calculate delta between two points
 */
export function delta(from: Point, to: Point): Point {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
  }
}

/**
 * Add two points
 */
export function addPoints(a: Point, b: Point): Point {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
  }
}

/**
 * Subtract point b from point a
 */
export function subtractPoints(a: Point, b: Point): Point {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  }
}

/**
 * Scale a point by a factor
 */
export function scalePoint(point: Point, factor: number): Point {
  return {
    x: point.x * factor,
    y: point.y * factor,
  }
}

/**
 * Round point coordinates to integers
 */
export function roundPoint(point: Point): Point {
  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
  }
}

/**
 * Clamp point within bounds
 */
export function clampPoint(point: Point, bounds: Bounds): Point {
  return {
    x: Math.max(bounds.left, Math.min(bounds.right, point.x)),
    y: Math.max(bounds.top, Math.min(bounds.bottom, point.y)),
  }
}

// ============================================================================
// Grid Utilities
// ============================================================================

/**
 * Snap a value to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

/**
 * Snap a point to grid
 */
export function snapPointToGrid(point: Point, gridSize: number): Point {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  }
}

/**
 * Snap a rect to grid (position only, not size)
 */
export function snapRectToGrid(rect: Rect, gridSize: number): Rect {
  return {
    x: snapToGrid(rect.x, gridSize),
    y: snapToGrid(rect.y, gridSize),
    width: rect.width,
    height: rect.height,
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create default coordinate context
 */
export function createCoordinateContext(
  canvasOffset: Point = { x: 0, y: 0 },
  scale: number = 1,
  scrollOffset: Point = { x: 0, y: 0 }
): CoordinateContext {
  return { canvasOffset, scale, scrollOffset }
}
