/**
 * Measurement Calculator
 * Feature 6: Measurement Overlays
 *
 * Calculates distances between elements for visual feedback.
 * Shows measurements from selected element to:
 * - Container edges (padding visualization)
 * - Sibling elements (gap visualization)
 */

import type { Measurement, Rect, MeasurementConfig } from './types'

const DEFAULT_CONFIG: Required<MeasurementConfig> = {
  minDistance: 1,
  maxMeasurements: 8,
}

/**
 * Calculate measurements from a selected element to its container and siblings
 */
export function calculateMeasurements(
  selectedId: string,
  selectedRect: Rect,
  siblings: Map<string, Rect>,
  containerRect: Rect,
  config: MeasurementConfig = {}
): Measurement[] {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const measurements: Measurement[] = []

  // Calculate distances to container edges
  measurements.push(...calculateContainerMeasurements(selectedId, selectedRect, containerRect))

  // Calculate distances to siblings
  measurements.push(...calculateSiblingMeasurements(selectedId, selectedRect, siblings))

  // Filter by minimum distance and limit count
  return measurements
    .filter(m => m.distance >= cfg.minDistance)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, cfg.maxMeasurements)
}

/**
 * Calculate measurements from element to container edges
 */
function calculateContainerMeasurements(
  nodeId: string,
  rect: Rect,
  container: Rect
): Measurement[] {
  const measurements: Measurement[] = []

  // Distance to top edge
  const topDistance = rect.y - container.y
  if (topDistance > 0) {
    measurements.push({
      from: nodeId,
      to: 'container',
      edge: 'top',
      distance: Math.round(topDistance),
      labelPosition: {
        x: rect.x + rect.width / 2,
        y: container.y + topDistance / 2,
      },
      lineStart: { x: rect.x + rect.width / 2, y: container.y },
      lineEnd: { x: rect.x + rect.width / 2, y: rect.y },
      direction: 'vertical',
    })
  }

  // Distance to bottom edge
  const bottomDistance = (container.y + container.height) - (rect.y + rect.height)
  if (bottomDistance > 0) {
    measurements.push({
      from: nodeId,
      to: 'container',
      edge: 'bottom',
      distance: Math.round(bottomDistance),
      labelPosition: {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height + bottomDistance / 2,
      },
      lineStart: { x: rect.x + rect.width / 2, y: rect.y + rect.height },
      lineEnd: { x: rect.x + rect.width / 2, y: container.y + container.height },
      direction: 'vertical',
    })
  }

  // Distance to left edge
  const leftDistance = rect.x - container.x
  if (leftDistance > 0) {
    measurements.push({
      from: nodeId,
      to: 'container',
      edge: 'left',
      distance: Math.round(leftDistance),
      labelPosition: {
        x: container.x + leftDistance / 2,
        y: rect.y + rect.height / 2,
      },
      lineStart: { x: container.x, y: rect.y + rect.height / 2 },
      lineEnd: { x: rect.x, y: rect.y + rect.height / 2 },
      direction: 'horizontal',
    })
  }

  // Distance to right edge
  const rightDistance = (container.x + container.width) - (rect.x + rect.width)
  if (rightDistance > 0) {
    measurements.push({
      from: nodeId,
      to: 'container',
      edge: 'right',
      distance: Math.round(rightDistance),
      labelPosition: {
        x: rect.x + rect.width + rightDistance / 2,
        y: rect.y + rect.height / 2,
      },
      lineStart: { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
      lineEnd: { x: container.x + container.width, y: rect.y + rect.height / 2 },
      direction: 'horizontal',
    })
  }

  return measurements
}

/**
 * Calculate measurements from element to nearest siblings
 */
function calculateSiblingMeasurements(
  nodeId: string,
  rect: Rect,
  siblings: Map<string, Rect>
): Measurement[] {
  const measurements: Measurement[] = []

  for (const [siblingId, siblingRect] of siblings) {
    if (siblingId === nodeId) continue

    // Check horizontal relationship (left-right)
    const horizontalMeasurement = calculateHorizontalGap(nodeId, rect, siblingId, siblingRect)
    if (horizontalMeasurement) {
      measurements.push(horizontalMeasurement)
    }

    // Check vertical relationship (top-bottom)
    const verticalMeasurement = calculateVerticalGap(nodeId, rect, siblingId, siblingRect)
    if (verticalMeasurement) {
      measurements.push(verticalMeasurement)
    }
  }

  return measurements
}

/**
 * Calculate horizontal gap between two elements
 */
function calculateHorizontalGap(
  fromId: string,
  fromRect: Rect,
  toId: string,
  toRect: Rect
): Measurement | null {
  // Check if elements overlap vertically (are horizontally adjacent)
  const verticalOverlap = !(
    fromRect.y + fromRect.height < toRect.y ||
    toRect.y + toRect.height < fromRect.y
  )

  if (!verticalOverlap) return null

  // Calculate horizontal distance
  let distance: number
  let lineStartX: number
  let lineEndX: number
  let edge: 'left' | 'right'

  if (fromRect.x + fromRect.width < toRect.x) {
    // toRect is to the right of fromRect
    distance = toRect.x - (fromRect.x + fromRect.width)
    lineStartX = fromRect.x + fromRect.width
    lineEndX = toRect.x
    edge = 'right'
  } else if (toRect.x + toRect.width < fromRect.x) {
    // toRect is to the left of fromRect
    distance = fromRect.x - (toRect.x + toRect.width)
    lineStartX = toRect.x + toRect.width
    lineEndX = fromRect.x
    edge = 'left'
  } else {
    // Overlapping horizontally
    return null
  }

  if (distance <= 0) return null

  // Calculate vertical center of overlap
  const overlapTop = Math.max(fromRect.y, toRect.y)
  const overlapBottom = Math.min(fromRect.y + fromRect.height, toRect.y + toRect.height)
  const centerY = (overlapTop + overlapBottom) / 2

  return {
    from: fromId,
    to: toId,
    edge,
    distance: Math.round(distance),
    labelPosition: {
      x: (lineStartX + lineEndX) / 2,
      y: centerY,
    },
    lineStart: { x: lineStartX, y: centerY },
    lineEnd: { x: lineEndX, y: centerY },
    direction: 'horizontal',
  }
}

/**
 * Calculate vertical gap between two elements
 */
function calculateVerticalGap(
  fromId: string,
  fromRect: Rect,
  toId: string,
  toRect: Rect
): Measurement | null {
  // Check if elements overlap horizontally (are vertically adjacent)
  const horizontalOverlap = !(
    fromRect.x + fromRect.width < toRect.x ||
    toRect.x + toRect.width < fromRect.x
  )

  if (!horizontalOverlap) return null

  // Calculate vertical distance
  let distance: number
  let lineStartY: number
  let lineEndY: number
  let edge: 'top' | 'bottom'

  if (fromRect.y + fromRect.height < toRect.y) {
    // toRect is below fromRect
    distance = toRect.y - (fromRect.y + fromRect.height)
    lineStartY = fromRect.y + fromRect.height
    lineEndY = toRect.y
    edge = 'bottom'
  } else if (toRect.y + toRect.height < fromRect.y) {
    // toRect is above fromRect
    distance = fromRect.y - (toRect.y + toRect.height)
    lineStartY = toRect.y + toRect.height
    lineEndY = fromRect.y
    edge = 'top'
  } else {
    // Overlapping vertically
    return null
  }

  if (distance <= 0) return null

  // Calculate horizontal center of overlap
  const overlapLeft = Math.max(fromRect.x, toRect.x)
  const overlapRight = Math.min(fromRect.x + fromRect.width, toRect.x + toRect.width)
  const centerX = (overlapLeft + overlapRight) / 2

  return {
    from: fromId,
    to: toId,
    edge,
    distance: Math.round(distance),
    labelPosition: {
      x: centerX,
      y: (lineStartY + lineEndY) / 2,
    },
    lineStart: { x: centerX, y: lineStartY },
    lineEnd: { x: centerX, y: lineEndY },
    direction: 'vertical',
  }
}
