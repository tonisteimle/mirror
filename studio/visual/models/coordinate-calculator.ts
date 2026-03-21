/**
 * CoordinateCalculator - Centralized position calculation utilities
 *
 * Pure coordinate calculation functions with no DOM dependencies,
 * making them easily testable.
 *
 * Used by:
 * - DragController (drag-controller.ts)
 * - DropZone model (drop-zone.ts)
 */

import type { Point, Rect } from './coordinate'

// ============================================================================
// Position Calculations
// ============================================================================

/**
 * Calculate element's position relative to its container
 * Used for absolute positioning calculations
 *
 * @param elementRect - The element's bounding rect (in client coordinates)
 * @param containerRect - The container's bounding rect (in client coordinates)
 * @returns Position relative to container (clamped to >= 0)
 */
export function calculateElementPosition(elementRect: Rect, containerRect: Rect): Point {
  const x = elementRect.x - containerRect.x
  const y = elementRect.y - containerRect.y

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
  }
}

/**
 * Calculate the delta (movement) between two points
 *
 * @param start - Starting point
 * @param current - Current point
 * @returns Delta vector { x, y }
 */
export function calculateDragDelta(start: Point, current: Point): Point {
  return {
    x: current.x - start.x,
    y: current.y - start.y,
  }
}

/**
 * Calculate ghost element position during drag
 * Accounts for the grab offset (where within the element the user clicked)
 *
 * @param elementRect - Original element rect
 * @param delta - Movement delta from drag start
 * @param grabOffset - Optional offset from element origin where drag started
 * @returns Ghost position in client coordinates
 */
export function calculateGhostPosition(
  elementRect: Rect,
  delta: Point,
  grabOffset?: Point
): Point {
  return {
    x: elementRect.x + delta.x,
    y: elementRect.y + delta.y,
  }
}

/**
 * Calculate drop position relative to container
 * Used when dropping into an absolute-positioned container
 *
 * @param ghostRect - The ghost element's current rect
 * @param containerRect - The target container's rect
 * @returns Position relative to container (clamped to >= 0, rounded to integers)
 */
export function calculateDropPosition(ghostRect: Rect, containerRect: Rect): Point {
  const x = ghostRect.x - containerRect.x
  const y = ghostRect.y - containerRect.y

  // Validate and clamp
  const validX = Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0
  const validY = Number.isFinite(y) ? Math.max(0, Math.round(y)) : 0

  return { x: validX, y: validY }
}

// ============================================================================
// Absolute Position Calculations
// ============================================================================

/**
 * Calculate new absolute position after drag
 * For absolute → absolute moves, calculates position based on delta
 *
 * @param elementStartPosition - Element's starting position relative to container
 * @param delta - Movement delta from drag
 * @returns New position (clamped to >= 0, rounded to integers)
 */
export function calculateAbsolutePosition(
  elementStartPosition: Point,
  delta: Point
): Point {
  const x = elementStartPosition.x + delta.x
  const y = elementStartPosition.y + delta.y

  // Validate and clamp
  const validX = Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0
  const validY = Number.isFinite(y) ? Math.max(0, Math.round(y)) : 0

  return { x: validX, y: validY }
}

/**
 * Calculate position for flex → absolute transition
 * Uses the cursor position within the container
 *
 * @param cursorPosition - Current cursor position (client coordinates)
 * @param containerRect - Target container's rect
 * @returns Position relative to container (clamped to >= 0, rounded to integers)
 */
export function calculateFlexToAbsolutePosition(
  cursorPosition: Point,
  containerRect: Rect
): Point {
  const x = cursorPosition.x - containerRect.x
  const y = cursorPosition.y - containerRect.y

  // Validate and clamp
  const validX = Number.isFinite(x) ? Math.max(0, Math.round(x)) : 0
  const validY = Number.isFinite(y) ? Math.max(0, Math.round(y)) : 0

  return { x: validX, y: validY }
}

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate and clamp a coordinate value
 * Returns null if invalid (undefined, NaN, Infinity)
 * Returns clamped, rounded integer if valid (minimum 0)
 */
export function validateCoordinate(value: number | undefined): number | null {
  if (value === undefined || value === null) {
    return null
  }
  if (!Number.isFinite(value)) {
    return null
  }
  return Math.max(0, Math.round(value))
}

/**
 * Validate and clamp a point
 * Returns null if either coordinate is invalid
 */
export function validatePoint(point: Point | undefined): Point | null {
  if (!point) return null

  const x = validateCoordinate(point.x)
  const y = validateCoordinate(point.y)

  if (x === null || y === null) return null

  return { x, y }
}

/**
 * Result of coordinate validation
 */
export interface ValidatedCoordinates {
  x: number
  y: number
  valid: boolean
}

/**
 * Validate and clamp coordinates, returning a status object
 */
export function validateAndClampCoordinates(x: number, y: number): ValidatedCoordinates {
  // Check for invalid values (NaN, Infinity, undefined)
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return { x: 0, y: 0, valid: false }
  }

  // Clamp negative values to 0
  return {
    x: Math.max(0, Math.round(x)),
    y: Math.max(0, Math.round(y)),
    valid: true,
  }
}

// ============================================================================
// Grid Snapping
// ============================================================================

/**
 * Snap a point to grid
 *
 * @param point - Point to snap
 * @param gridSize - Grid size (must be > 0)
 * @returns Snapped point (clamped to >= 0)
 */
export function snapPointToGrid(point: Point, gridSize: number): Point {
  if (gridSize <= 0) {
    return {
      x: Math.max(0, Math.round(point.x)),
      y: Math.max(0, Math.round(point.y)),
    }
  }

  return {
    x: Math.max(0, Math.round(point.x / gridSize) * gridSize),
    y: Math.max(0, Math.round(point.y / gridSize) * gridSize),
  }
}

/**
 * Snap a point to grid with validation
 *
 * @param point - Point to snap
 * @param gridSize - Grid size (0 = disabled)
 * @returns Snapped point or original point clamped if grid disabled
 */
export function snapToGridSafe(point: Point, gridSize: number): Point {
  // First validate
  const validated = validateAndClampCoordinates(point.x, point.y)
  if (!validated.valid) {
    return { x: 0, y: 0 }
  }

  // Then snap
  return snapPointToGrid({ x: validated.x, y: validated.y }, gridSize)
}
