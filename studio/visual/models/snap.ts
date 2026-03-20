/**
 * Snap Model - Pure snap calculations
 *
 * No DOM dependencies. Calculates snap positions based on:
 * - Grid snapping
 * - Guide snapping (alignment to other elements)
 * - Edge snapping (container bounds)
 */

import type { Point, Rect } from './coordinate'

// ============================================================================
// Types
// ============================================================================

export type SnapAxis = 'x' | 'y' | 'both'

export interface SnapResult {
  /** Snapped position */
  position: Point
  /** Active guides (for visualization) */
  guides: Guide[]
  /** Whether snap was applied */
  snapped: boolean
  /** Snap details per axis */
  snapInfo: {
    x: SnapAxisInfo | null
    y: SnapAxisInfo | null
  }
}

export interface SnapAxisInfo {
  /** Original value before snap */
  original: number
  /** Snapped value */
  snapped: number
  /** Type of snap */
  type: 'grid' | 'guide' | 'edge'
  /** Reference element (if guide snap) */
  referenceId?: string
}

export interface Guide {
  /** Guide type for styling */
  type: 'edge' | 'center' | 'spacing'
  /** Axis of the guide */
  axis: 'x' | 'y'
  /** Position on axis */
  position: number
  /** Start and end for rendering */
  start: number
  end: number
  /** Reference element ID */
  referenceId?: string
}

export interface SnapConfig {
  /** Whether snapping is enabled */
  enabled: boolean
  /** Grid size (0 = no grid snap) */
  gridSize: number
  /** Snap threshold in pixels */
  threshold: number
  /** Whether to snap to element guides */
  snapToGuides: boolean
  /** Whether to snap to container edges */
  snapToEdges: boolean
  /** Whether to show spacing guides */
  showSpacing: boolean
}

export interface SnapContext {
  /** Rect being dragged */
  dragRect: Rect
  /** Other element rects for guide calculation */
  siblingRects: Array<{ nodeId: string; rect: Rect }>
  /** Container bounds */
  containerRect?: Rect
  /** Configuration */
  config: SnapConfig
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: SnapConfig = {
  enabled: true,
  gridSize: 0,
  threshold: 5,
  snapToGuides: true,
  snapToEdges: true,
  showSpacing: true,
}

// ============================================================================
// Core Snap Calculation
// ============================================================================

/**
 * Calculate snapped position and active guides
 */
export function calculateSnap(
  position: Point,
  context: SnapContext
): SnapResult {
  const { config, dragRect, siblingRects, containerRect } = context

  if (!config.enabled) {
    return {
      position,
      guides: [],
      snapped: false,
      snapInfo: { x: null, y: null },
    }
  }

  // Collect all potential snap targets
  const targets = collectSnapTargets(dragRect, siblingRects, containerRect, config)

  // Find best snap for each axis
  const xSnap = findBestSnap(position.x, targets.x, config.threshold)
  const ySnap = findBestSnap(position.y, targets.y, config.threshold)

  // Apply grid snap if no guide snap found
  const gridX = config.gridSize > 0 && !xSnap ? snapToGrid(position.x, config.gridSize) : null
  const gridY = config.gridSize > 0 && !ySnap ? snapToGrid(position.y, config.gridSize) : null

  // Determine final position
  const snappedX = xSnap?.snapped ?? gridX ?? position.x
  const snappedY = ySnap?.snapped ?? gridY ?? position.y

  // Build guides for visualization
  const guides = buildGuides(xSnap, ySnap, dragRect, siblingRects, containerRect)

  return {
    position: { x: snappedX, y: snappedY },
    guides,
    snapped: xSnap !== null || ySnap !== null || gridX !== null || gridY !== null,
    snapInfo: {
      x: xSnap ?? (gridX !== null ? { original: position.x, snapped: gridX, type: 'grid' } : null),
      y: ySnap ?? (gridY !== null ? { original: position.y, snapped: gridY, type: 'grid' } : null),
    },
  }
}

// ============================================================================
// Snap Target Collection
// ============================================================================

interface SnapTarget {
  position: number
  type: 'edge' | 'center' | 'spacing'
  referenceId?: string
}

interface SnapTargets {
  x: SnapTarget[]
  y: SnapTarget[]
}

function collectSnapTargets(
  dragRect: Rect,
  siblings: Array<{ nodeId: string; rect: Rect }>,
  containerRect: Rect | undefined,
  config: SnapConfig
): SnapTargets {
  const targets: SnapTargets = { x: [], y: [] }

  // Add sibling edge and center guides
  if (config.snapToGuides) {
    for (const sibling of siblings) {
      const r = sibling.rect

      // Vertical guides (for X alignment)
      targets.x.push(
        { position: r.x, type: 'edge', referenceId: sibling.nodeId },
        { position: r.x + r.width, type: 'edge', referenceId: sibling.nodeId },
        { position: r.x + r.width / 2, type: 'center', referenceId: sibling.nodeId }
      )

      // Horizontal guides (for Y alignment)
      targets.y.push(
        { position: r.y, type: 'edge', referenceId: sibling.nodeId },
        { position: r.y + r.height, type: 'edge', referenceId: sibling.nodeId },
        { position: r.y + r.height / 2, type: 'center', referenceId: sibling.nodeId }
      )
    }
  }

  // Add container edge guides
  if (config.snapToEdges && containerRect) {
    targets.x.push(
      { position: containerRect.x, type: 'edge' },
      { position: containerRect.x + containerRect.width, type: 'edge' },
      { position: containerRect.x + containerRect.width / 2, type: 'center' }
    )
    targets.y.push(
      { position: containerRect.y, type: 'edge' },
      { position: containerRect.y + containerRect.height, type: 'edge' },
      { position: containerRect.y + containerRect.height / 2, type: 'center' }
    )
  }

  return targets
}

// ============================================================================
// Best Snap Finding
// ============================================================================

function findBestSnap(
  value: number,
  targets: SnapTarget[],
  threshold: number
): SnapAxisInfo | null {
  let best: { target: SnapTarget; distance: number } | null = null

  for (const target of targets) {
    const distance = Math.abs(value - target.position)
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { target, distance }
    }
  }

  if (!best) return null

  return {
    original: value,
    snapped: best.target.position,
    type: 'guide',
    referenceId: best.target.referenceId,
  }
}

// ============================================================================
// Grid Snap
// ============================================================================

function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

/**
 * Snap a point to grid
 */
export function snapPointToGrid(point: Point, gridSize: number): Point {
  if (gridSize <= 0) return point
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  }
}

/**
 * Snap a rect position to grid (preserves size)
 */
export function snapRectToGrid(rect: Rect, gridSize: number): Rect {
  if (gridSize <= 0) return rect
  return {
    x: snapToGrid(rect.x, gridSize),
    y: snapToGrid(rect.y, gridSize),
    width: rect.width,
    height: rect.height,
  }
}

// ============================================================================
// Guide Building
// ============================================================================

function buildGuides(
  xSnap: SnapAxisInfo | null,
  ySnap: SnapAxisInfo | null,
  dragRect: Rect,
  siblings: Array<{ nodeId: string; rect: Rect }>,
  containerRect: Rect | undefined
): Guide[] {
  const guides: Guide[] = []

  if (xSnap && xSnap.type === 'guide') {
    const guide = buildVerticalGuide(xSnap, dragRect, siblings, containerRect)
    if (guide) guides.push(guide)
  }

  if (ySnap && ySnap.type === 'guide') {
    const guide = buildHorizontalGuide(ySnap, dragRect, siblings, containerRect)
    if (guide) guides.push(guide)
  }

  return guides
}

function buildVerticalGuide(
  snap: SnapAxisInfo,
  dragRect: Rect,
  siblings: Array<{ nodeId: string; rect: Rect }>,
  containerRect: Rect | undefined
): Guide | null {
  // Find all rects that align at this X position
  const alignedRects = siblings
    .filter((s) => {
      const r = s.rect
      return (
        Math.abs(r.x - snap.snapped) < 1 ||
        Math.abs(r.x + r.width - snap.snapped) < 1 ||
        Math.abs(r.x + r.width / 2 - snap.snapped) < 1
      )
    })
    .map((s) => s.rect)

  // Calculate guide extent
  const allRects = [...alignedRects, dragRect]
  const minY = Math.min(...allRects.map((r) => r.y))
  const maxY = Math.max(...allRects.map((r) => r.y + r.height))

  return {
    type: snap.referenceId ? 'center' : 'edge',
    axis: 'x',
    position: snap.snapped,
    start: minY,
    end: maxY,
    referenceId: snap.referenceId,
  }
}

function buildHorizontalGuide(
  snap: SnapAxisInfo,
  dragRect: Rect,
  siblings: Array<{ nodeId: string; rect: Rect }>,
  containerRect: Rect | undefined
): Guide | null {
  // Find all rects that align at this Y position
  const alignedRects = siblings
    .filter((s) => {
      const r = s.rect
      return (
        Math.abs(r.y - snap.snapped) < 1 ||
        Math.abs(r.y + r.height - snap.snapped) < 1 ||
        Math.abs(r.y + r.height / 2 - snap.snapped) < 1
      )
    })
    .map((s) => s.rect)

  // Calculate guide extent
  const allRects = [...alignedRects, dragRect]
  const minX = Math.min(...allRects.map((r) => r.x))
  const maxX = Math.max(...allRects.map((r) => r.x + r.width))

  return {
    type: snap.referenceId ? 'center' : 'edge',
    axis: 'y',
    position: snap.snapped,
    start: minX,
    end: maxX,
    referenceId: snap.referenceId,
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createSnapConfig(config?: Partial<SnapConfig>): SnapConfig {
  return { ...DEFAULT_CONFIG, ...config }
}

export function createSnapContext(
  dragRect: Rect,
  siblingRects: Array<{ nodeId: string; rect: Rect }> = [],
  containerRect?: Rect,
  config?: Partial<SnapConfig>
): SnapContext {
  return {
    dragRect,
    siblingRects,
    containerRect,
    config: createSnapConfig(config),
  }
}
