/**
 * Snap Calculator - Pure Function
 *
 * Calculates snapped position based on container, siblings, and configuration.
 * No DOM dependencies - fully testable.
 */

import type { Point, Size, Rect, SnapConfig, SnapGuide, SnapResult } from './types'
import { DEFAULT_SNAP_CONFIG } from './types'

/**
 * Calculate snapped position
 *
 * @param position - Current position (top-left of dragged element)
 * @param sourceSize - Size of dragged element
 * @param container - Container rect
 * @param siblings - Sibling rects
 * @param config - Snap configuration
 */
export function calculateSnap(
  position: Point,
  sourceSize: Size,
  container: Rect,
  siblings: Rect[],
  config: Partial<SnapConfig> = {}
): SnapResult {
  const cfg: SnapConfig = { ...DEFAULT_SNAP_CONFIG, ...config }
  const guides: SnapGuide[] = []

  let { x, y } = position

  // Grid snapping (highest priority)
  if (cfg.gridSize > 0) {
    x = Math.round(x / cfg.gridSize) * cfg.gridSize
    y = Math.round(y / cfg.gridSize) * cfg.gridSize
    // Grid doesn't add visual guides
  }

  // Edge snapping
  if (cfg.snapToEdges) {
    const edgeResult = snapToEdges(x, y, sourceSize, container, cfg.threshold)
    x = edgeResult.x
    y = edgeResult.y
    guides.push(...edgeResult.guides)
  }

  // Center snapping
  if (cfg.snapToCenter) {
    const centerResult = snapToCenter(x, y, sourceSize, container, cfg.threshold)
    x = centerResult.x
    y = centerResult.y
    guides.push(...centerResult.guides)
  }

  // Sibling snapping
  if (cfg.snapToSiblings && siblings.length > 0) {
    const siblingResult = snapToSiblings(x, y, sourceSize, siblings, cfg.threshold)
    x = siblingResult.x
    y = siblingResult.y
    guides.push(...siblingResult.guides)
  }

  return {
    position: { x, y },
    snapped: guides.length > 0,
    guides,
  }
}

/**
 * Snap to container edges
 */
function snapToEdges(
  x: number,
  y: number,
  sourceSize: Size,
  container: Rect,
  threshold: number
): { x: number; y: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = []

  // Left edge
  if (Math.abs(x - container.x) <= threshold) {
    x = container.x
    guides.push({ axis: 'x', position: container.x, type: 'edge' })
  }
  // Right edge (source right aligns with container right)
  else if (Math.abs((x + sourceSize.width) - (container.x + container.width)) <= threshold) {
    x = container.x + container.width - sourceSize.width
    guides.push({ axis: 'x', position: container.x + container.width, type: 'edge' })
  }

  // Top edge
  if (Math.abs(y - container.y) <= threshold) {
    y = container.y
    guides.push({ axis: 'y', position: container.y, type: 'edge' })
  }
  // Bottom edge (source bottom aligns with container bottom)
  else if (Math.abs((y + sourceSize.height) - (container.y + container.height)) <= threshold) {
    y = container.y + container.height - sourceSize.height
    guides.push({ axis: 'y', position: container.y + container.height, type: 'edge' })
  }

  return { x, y, guides }
}

/**
 * Snap to container center
 */
function snapToCenter(
  x: number,
  y: number,
  sourceSize: Size,
  container: Rect,
  threshold: number
): { x: number; y: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = []

  const containerCenterX = container.x + container.width / 2
  const containerCenterY = container.y + container.height / 2

  const sourceCenterX = x + sourceSize.width / 2
  const sourceCenterY = y + sourceSize.height / 2

  // Horizontal center
  if (Math.abs(sourceCenterX - containerCenterX) <= threshold) {
    x = containerCenterX - sourceSize.width / 2
    guides.push({ axis: 'x', position: containerCenterX, type: 'center' })
  }

  // Vertical center
  if (Math.abs(sourceCenterY - containerCenterY) <= threshold) {
    y = containerCenterY - sourceSize.height / 2
    guides.push({ axis: 'y', position: containerCenterY, type: 'center' })
  }

  return { x, y, guides }
}

/**
 * Snap to sibling elements
 */
function snapToSiblings(
  x: number,
  y: number,
  sourceSize: Size,
  siblings: Rect[],
  threshold: number
): { x: number; y: number; guides: SnapGuide[] } {
  const guides: SnapGuide[] = []

  for (const sibling of siblings) {
    // Skip if already snapped on this axis
    const hasXSnap = guides.some(g => g.axis === 'x')
    const hasYSnap = guides.some(g => g.axis === 'y')

    if (!hasXSnap) {
      // Left edge alignment
      if (Math.abs(x - sibling.x) <= threshold) {
        x = sibling.x
        guides.push({ axis: 'x', position: sibling.x, type: 'sibling' })
      }
      // Right edge alignment
      else if (Math.abs((x + sourceSize.width) - (sibling.x + sibling.width)) <= threshold) {
        x = sibling.x + sibling.width - sourceSize.width
        guides.push({ axis: 'x', position: sibling.x + sibling.width, type: 'sibling' })
      }
      // Source left to sibling right
      else if (Math.abs(x - (sibling.x + sibling.width)) <= threshold) {
        x = sibling.x + sibling.width
        guides.push({ axis: 'x', position: sibling.x + sibling.width, type: 'sibling' })
      }
      // Source right to sibling left
      else if (Math.abs((x + sourceSize.width) - sibling.x) <= threshold) {
        x = sibling.x - sourceSize.width
        guides.push({ axis: 'x', position: sibling.x, type: 'sibling' })
      }
    }

    if (!hasYSnap) {
      // Top edge alignment
      if (Math.abs(y - sibling.y) <= threshold) {
        y = sibling.y
        guides.push({ axis: 'y', position: sibling.y, type: 'sibling' })
      }
      // Bottom edge alignment
      else if (Math.abs((y + sourceSize.height) - (sibling.y + sibling.height)) <= threshold) {
        y = sibling.y + sibling.height - sourceSize.height
        guides.push({ axis: 'y', position: sibling.y + sibling.height, type: 'sibling' })
      }
      // Source top to sibling bottom
      else if (Math.abs(y - (sibling.y + sibling.height)) <= threshold) {
        y = sibling.y + sibling.height
        guides.push({ axis: 'y', position: sibling.y + sibling.height, type: 'sibling' })
      }
      // Source bottom to sibling top
      else if (Math.abs((y + sourceSize.height) - sibling.y) <= threshold) {
        y = sibling.y - sourceSize.height
        guides.push({ axis: 'y', position: sibling.y, type: 'sibling' })
      }
    }
  }

  return { x, y, guides }
}
