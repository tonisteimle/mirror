/**
 * AlignmentZone Model - 9-zone detection for empty flex containers
 *
 * No DOM dependencies. Determines alignment based on cursor position
 * within an empty container, using a 3x3 grid of logical zones.
 */

import type { Point, Rect } from './coordinate'

// ============================================================================
// Types
// ============================================================================

/**
 * Horizontal position within container
 */
export type HorizontalZone = 'left' | 'center' | 'right'

/**
 * Vertical position within container
 */
export type VerticalZone = 'top' | 'center' | 'bottom'

/**
 * Combined zone identifier
 */
export type ZoneId =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center-center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

/**
 * Container layout direction
 */
export type ContainerDirection = 'vertical' | 'horizontal'

/**
 * Result of zone detection
 */
export interface AlignmentZoneResult {
  /** Combined zone identifier */
  zone: ZoneId
  /** Horizontal component */
  horizontal: HorizontalZone
  /** Vertical component */
  vertical: VerticalZone
  /** Align property to set on parent container */
  alignProperty: string
  /** Visual indicator position (where to show the snap indicator) */
  indicatorPosition: Point
}

// ============================================================================
// Zone Detection
// ============================================================================

/**
 * Detect which of the 9 zones the cursor is in
 */
export function detectZone(cursor: Point, containerRect: Rect): { horizontal: HorizontalZone; vertical: VerticalZone } {
  const relativeX = cursor.x - containerRect.x
  const relativeY = cursor.y - containerRect.y

  const thirdWidth = containerRect.width / 3
  const thirdHeight = containerRect.height / 3

  // Determine horizontal zone
  let horizontal: HorizontalZone
  if (relativeX < thirdWidth) {
    horizontal = 'left'
  } else if (relativeX < thirdWidth * 2) {
    horizontal = 'center'
  } else {
    horizontal = 'right'
  }

  // Determine vertical zone
  let vertical: VerticalZone
  if (relativeY < thirdHeight) {
    vertical = 'top'
  } else if (relativeY < thirdHeight * 2) {
    vertical = 'center'
  } else {
    vertical = 'bottom'
  }

  return { horizontal, vertical }
}

/**
 * Get combined zone ID from horizontal and vertical components
 */
export function getZoneId(horizontal: HorizontalZone, vertical: VerticalZone): ZoneId {
  return `${vertical}-${horizontal}` as ZoneId
}

/**
 * Calculate the center position of a zone (for indicator placement)
 */
export function getZoneCenter(
  zone: { horizontal: HorizontalZone; vertical: VerticalZone },
  containerRect: Rect
): Point {
  const thirdWidth = containerRect.width / 3
  const thirdHeight = containerRect.height / 3

  // Calculate X position
  let x: number
  switch (zone.horizontal) {
    case 'left':
      x = containerRect.x + thirdWidth / 2
      break
    case 'center':
      x = containerRect.x + containerRect.width / 2
      break
    case 'right':
      x = containerRect.x + thirdWidth * 2.5
      break
  }

  // Calculate Y position
  let y: number
  switch (zone.vertical) {
    case 'top':
      y = containerRect.y + thirdHeight / 2
      break
    case 'center':
      y = containerRect.y + containerRect.height / 2
      break
    case 'bottom':
      y = containerRect.y + thirdHeight * 2.5
      break
  }

  return { x, y }
}

// ============================================================================
// Align Property Mapping
// ============================================================================

/**
 * Get the align property string for a zone in a vertical container
 */
export function getVerticalContainerAlign(horizontal: HorizontalZone, vertical: VerticalZone): string {
  // Vertical container: main axis is Y, cross axis is X
  // vertical component affects justify (main axis)
  // horizontal component affects align (cross axis)

  if (vertical === 'center' && horizontal === 'center') {
    return 'center'
  }

  const parts: string[] = []

  // Vertical alignment (main axis for ver container)
  if (vertical !== 'center') {
    parts.push(vertical)
  }

  // Horizontal alignment (cross axis for ver container)
  if (horizontal !== 'center') {
    parts.push(horizontal)
  }

  if (parts.length === 0) {
    return 'center'
  }

  return `align ${parts.join(' ')}`
}

/**
 * Get the align property string for a zone in a horizontal container
 */
export function getHorizontalContainerAlign(horizontal: HorizontalZone, vertical: VerticalZone): string {
  // Horizontal container: main axis is X, cross axis is Y
  // horizontal component affects justify (main axis)
  // vertical component affects align (cross axis)

  if (vertical === 'center' && horizontal === 'center') {
    return 'center'
  }

  const parts: string[] = []

  // Vertical alignment (cross axis for hor container)
  if (vertical !== 'center') {
    parts.push(vertical)
  }

  // Horizontal alignment (main axis for hor container)
  if (horizontal !== 'center') {
    parts.push(horizontal)
  }

  if (parts.length === 0) {
    return 'center'
  }

  return `align ${parts.join(' ')}`
}

/**
 * Get align property for any container direction
 */
export function getAlignProperty(
  horizontal: HorizontalZone,
  vertical: VerticalZone,
  direction: ContainerDirection
): string {
  if (direction === 'vertical') {
    return getVerticalContainerAlign(horizontal, vertical)
  }
  return getHorizontalContainerAlign(horizontal, vertical)
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Detect alignment zone and return full result with align property
 */
export function detectAlignmentZone(
  cursor: Point,
  containerRect: Rect,
  direction: ContainerDirection
): AlignmentZoneResult {
  const { horizontal, vertical } = detectZone(cursor, containerRect)
  const zone = getZoneId(horizontal, vertical)
  const alignProperty = getAlignProperty(horizontal, vertical, direction)
  const indicatorPosition = getZoneCenter({ horizontal, vertical }, containerRect)

  return {
    zone,
    horizontal,
    vertical,
    alignProperty,
    indicatorPosition,
  }
}

// ============================================================================
// Indicator Rect
// ============================================================================

/**
 * Calculate the indicator rect for a zone
 * The indicator shows where the element will be placed
 */
export function calculateIndicatorRect(
  zone: { horizontal: HorizontalZone; vertical: VerticalZone },
  containerRect: Rect,
  elementSize: { width: number; height: number }
): Rect {
  const center = getZoneCenter(zone, containerRect)

  // Center the indicator on the zone center
  return {
    x: center.x - elementSize.width / 2,
    y: center.y - elementSize.height / 2,
    width: elementSize.width,
    height: elementSize.height,
  }
}
