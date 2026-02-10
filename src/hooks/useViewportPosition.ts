/**
 * Hook for calculating viewport-aware position for picker components.
 * Ensures the picker stays within the visible viewport.
 */

import { useMemo } from 'react'
import type { Position } from '../types/common'

export interface UseViewportPositionConfig {
  /** Base position (typically from cursor coordinates) */
  position: Position
  /** Width of the picker element */
  width: number
  /** Maximum height of the picker element */
  maxHeight: number
  /** Margin from viewport edges (default: 20) */
  margin?: number
  /** Whether to flip picker above position if it doesn't fit below (default: true) */
  allowFlipUp?: boolean
  /** Offset between position and picker (default: 0) */
  offset?: number
}

export interface ViewportAdjustedPosition extends Position {
  /** Whether the picker was flipped above the original position */
  flippedUp: boolean
}

/**
 * Calculate viewport-adjusted position for a picker element.
 * Keeps the element within viewport bounds and optionally flips it
 * above the anchor point if there's not enough space below.
 */
export function useViewportPosition(config: UseViewportPositionConfig): ViewportAdjustedPosition {
  const {
    position,
    width,
    maxHeight,
    margin = 20,
    allowFlipUp = true,
    offset = 0,
  } = config

  return useMemo(() => {
    if (typeof window === 'undefined') {
      return { x: position.x, y: position.y, flippedUp: false }
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = position.x
    let y = position.y + offset
    let flippedUp = false

    // Horizontal adjustment: keep within viewport
    if (x + width > viewportWidth - margin) {
      x = viewportWidth - width - margin
    }
    if (x < margin) {
      x = margin
    }

    // Vertical adjustment: flip up if needed
    if (y + maxHeight > viewportHeight - margin) {
      if (allowFlipUp) {
        // Flip above the position
        y = position.y - maxHeight - 24 // 24px gap above
        flippedUp = true
      } else {
        // Just clamp to viewport
        y = viewportHeight - maxHeight - margin
      }
    }

    // Ensure y is not negative
    if (y < margin) {
      y = margin
      flippedUp = false
    }

    return { x, y, flippedUp }
  }, [position.x, position.y, width, maxHeight, margin, allowFlipUp, offset])
}

/**
 * Non-hook version for use in render functions or class components.
 */
export function calculateViewportPosition(config: UseViewportPositionConfig): ViewportAdjustedPosition {
  const {
    position,
    width,
    maxHeight,
    margin = 20,
    allowFlipUp = true,
    offset = 0,
  } = config

  if (typeof window === 'undefined') {
    return { x: position.x, y: position.y, flippedUp: false }
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let x = position.x
  let y = position.y + offset
  let flippedUp = false

  // Horizontal adjustment
  if (x + width > viewportWidth - margin) {
    x = viewportWidth - width - margin
  }
  if (x < margin) {
    x = margin
  }

  // Vertical adjustment
  if (y + maxHeight > viewportHeight - margin) {
    if (allowFlipUp) {
      y = position.y - maxHeight - 24
      flippedUp = true
    } else {
      y = viewportHeight - maxHeight - margin
    }
  }

  if (y < margin) {
    y = margin
    flippedUp = false
  }

  return { x, y, flippedUp }
}
