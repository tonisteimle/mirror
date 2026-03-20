/**
 * Snap Calculator - Pure Functions
 *
 * Provides grid snapping utilities used across the drag-drop system.
 * Single source of truth for all grid snapping calculations.
 */

import type { Point, GridConfig } from './types'

/**
 * Snap a single value to grid
 *
 * @param value - The value to snap
 * @param gridSize - The grid size (must be > 0)
 * @returns The snapped value
 */
export function snapValue(value: number, gridSize: number): number {
  if (gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

/**
 * Snap a point to grid
 *
 * @param point - The point to snap
 * @param grid - Grid configuration with enabled flag and size
 * @returns The snapped point
 */
export function snapToGrid(point: Point, grid: GridConfig): Point {
  if (!grid.enabled || grid.size <= 0) {
    return { x: point.x, y: point.y }
  }

  return {
    x: snapValue(point.x, grid.size),
    y: snapValue(point.y, grid.size),
  }
}
