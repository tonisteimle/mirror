/**
 * Strategy Utilities
 *
 * Shared helper functions for drop strategies.
 *
 * IMPORTANT: All functions here work with VIEWPORT COORDINATES only.
 * Do NOT use layoutInfo (container-relative) for visual rendering.
 * See types.ts for coordinate system documentation.
 */

import type { Rect } from '../types'

// ============================================
// Rect Helpers
// ============================================

/**
 * Get a rect from containerRect or fall back to DOM measurement.
 * Always returns viewport coordinates.
 */
export function getRectOrFallback(
  containerRect: Rect | undefined,
  element: HTMLElement
): Rect {
  if (containerRect) {
    return containerRect
  }
  const domRect = element.getBoundingClientRect()
  return {
    x: domRect.left,
    y: domRect.top,
    width: domRect.width,
    height: domRect.height,
  }
}

/**
 * Get viewport rect from DOM element.
 * This is the canonical way to get visual coordinates.
 */
export function getViewportRect(element: HTMLElement): Rect {
  const domRect = element.getBoundingClientRect()
  return {
    x: domRect.left,
    y: domRect.top,
    width: domRect.width,
    height: domRect.height,
  }
}
