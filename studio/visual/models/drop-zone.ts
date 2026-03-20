/**
 * DropZone Model - Pure drop zone detection and placement calculations
 *
 * No DOM dependencies. Determines where an element should be placed
 * based on cursor position relative to potential drop targets.
 */

import type { Point, Rect } from './coordinate'

// ============================================================================
// Types
// ============================================================================

export type Placement = 'before' | 'after' | 'inside' | 'absolute'

export interface DropZone {
  /** Node ID of the drop target */
  nodeId: string
  /** Where to place relative to target */
  placement: Placement
  /** Index within parent (for before/after) */
  insertionIndex?: number
  /** Absolute position within target (for absolute placement) */
  absolutePosition?: Point
  /** Visual indicator rect */
  indicatorRect?: Rect
}

export interface DropCandidate {
  nodeId: string
  rect: Rect
  /** Whether this container accepts children */
  acceptsChildren: boolean
  /** Whether this is a positioned container (absolute/relative) */
  isPositioned: boolean
  /** Layout direction of container */
  direction?: 'horizontal' | 'vertical'
  /** Existing child rects for insertion calculation */
  childRects?: Array<{ nodeId: string; rect: Rect }>
}

export interface DropZoneConfig {
  /** Edge threshold for before/after detection (default: 0.25 = 25% of element) */
  edgeThreshold: number
  /** Minimum pixels for edge detection */
  minEdgePixels: number
  /** Whether to prefer inside placement for containers */
  preferInside: boolean
}

const DEFAULT_CONFIG: DropZoneConfig = {
  edgeThreshold: 0.25,
  minEdgePixels: 8,
  preferInside: true,
}

// ============================================================================
// Core Detection
// ============================================================================

/**
 * Find the best drop zone for a cursor position
 */
export function findDropZone(
  cursor: Point,
  candidates: DropCandidate[],
  config: Partial<DropZoneConfig> = {}
): DropZone | null {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  // Find deepest (most specific) candidate containing the cursor
  const containingCandidates = candidates
    .filter((c) => isPointInRect(cursor, c.rect))
    .sort((a, b) => {
      // Prefer smaller rects (more specific targets)
      const areaA = a.rect.width * a.rect.height
      const areaB = b.rect.width * b.rect.height
      return areaA - areaB
    })

  if (containingCandidates.length === 0) {
    return null
  }

  const target = containingCandidates[0]

  // Determine placement based on cursor position within target
  return calculatePlacement(cursor, target, cfg)
}

/**
 * Calculate placement within a single target
 */
export function calculatePlacement(
  cursor: Point,
  target: DropCandidate,
  config: DropZoneConfig = DEFAULT_CONFIG
): DropZone {
  // For positioned containers, return absolute placement
  if (target.isPositioned) {
    return {
      nodeId: target.nodeId,
      placement: 'absolute',
      absolutePosition: {
        x: cursor.x - target.rect.x,
        y: cursor.y - target.rect.y,
      },
    }
  }

  // For non-containers, return inside (will be converted to sibling later)
  if (!target.acceptsChildren) {
    const edgeInfo = getEdgeInfo(cursor, target.rect, config)
    if (edgeInfo.isOnEdge) {
      return {
        nodeId: target.nodeId,
        placement: edgeInfo.placement,
        indicatorRect: createEdgeIndicator(target.rect, edgeInfo.placement, target.direction),
      }
    }
    // Default: insert after
    return {
      nodeId: target.nodeId,
      placement: 'after',
      indicatorRect: createEdgeIndicator(target.rect, 'after', target.direction),
    }
  }

  // For containers with children, find insertion point
  if (target.childRects && target.childRects.length > 0) {
    const insertion = findInsertionPoint(cursor, target.childRects, target.direction || 'vertical')
    return {
      nodeId: target.nodeId,
      placement: 'inside',
      insertionIndex: insertion.index,
      indicatorRect: insertion.indicatorRect,
    }
  }

  // Empty container - place inside
  return {
    nodeId: target.nodeId,
    placement: 'inside',
    insertionIndex: 0,
    indicatorRect: createInsideIndicator(target.rect),
  }
}

// ============================================================================
// Edge Detection
// ============================================================================

interface EdgeInfo {
  isOnEdge: boolean
  placement: 'before' | 'after'
  edgeName: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Detect if cursor is near edge of rect
 */
export function getEdgeInfo(
  cursor: Point,
  rect: Rect,
  config: DropZoneConfig = DEFAULT_CONFIG
): EdgeInfo {
  const { edgeThreshold, minEdgePixels } = config

  const edgeWidth = Math.max(rect.width * edgeThreshold, minEdgePixels)
  const edgeHeight = Math.max(rect.height * edgeThreshold, minEdgePixels)

  const relX = cursor.x - rect.x
  const relY = cursor.y - rect.y

  // Check horizontal edges (top/bottom)
  if (relY < edgeHeight) {
    return { isOnEdge: true, placement: 'before', edgeName: 'top' }
  }
  if (relY > rect.height - edgeHeight) {
    return { isOnEdge: true, placement: 'after', edgeName: 'bottom' }
  }

  // Check vertical edges (left/right) for horizontal layouts
  if (relX < edgeWidth) {
    return { isOnEdge: true, placement: 'before', edgeName: 'left' }
  }
  if (relX > rect.width - edgeWidth) {
    return { isOnEdge: true, placement: 'after', edgeName: 'right' }
  }

  return { isOnEdge: false, placement: 'after', edgeName: 'bottom' }
}

// ============================================================================
// Insertion Point Calculation
// ============================================================================

interface InsertionResult {
  index: number
  indicatorRect: Rect
}

/**
 * Find insertion point among children
 */
export function findInsertionPoint(
  cursor: Point,
  children: Array<{ nodeId: string; rect: Rect }>,
  direction: 'horizontal' | 'vertical'
): InsertionResult {
  if (children.length === 0) {
    return { index: 0, indicatorRect: { x: 0, y: 0, width: 0, height: 0 } }
  }

  // Sort children by position
  const sorted = [...children].sort((a, b) => {
    return direction === 'horizontal' ? a.rect.x - b.rect.x : a.rect.y - b.rect.y
  })

  // Find where cursor falls
  for (let i = 0; i < sorted.length; i++) {
    const child = sorted[i]
    const midpoint =
      direction === 'horizontal'
        ? child.rect.x + child.rect.width / 2
        : child.rect.y + child.rect.height / 2

    const cursorPos = direction === 'horizontal' ? cursor.x : cursor.y

    if (cursorPos < midpoint) {
      // Insert before this child
      return {
        index: i,
        indicatorRect: createInsertionIndicator(sorted, i, direction),
      }
    }
  }

  // Insert after last child
  return {
    index: sorted.length,
    indicatorRect: createInsertionIndicator(sorted, sorted.length, direction),
  }
}

// ============================================================================
// Visual Indicators
// ============================================================================

const INDICATOR_THICKNESS = 2

/**
 * Create indicator rect for edge placement
 */
export function createEdgeIndicator(
  rect: Rect,
  placement: 'before' | 'after',
  direction: 'horizontal' | 'vertical' = 'vertical'
): Rect {
  if (direction === 'horizontal') {
    return placement === 'before'
      ? { x: rect.x - INDICATOR_THICKNESS / 2, y: rect.y, width: INDICATOR_THICKNESS, height: rect.height }
      : { x: rect.x + rect.width - INDICATOR_THICKNESS / 2, y: rect.y, width: INDICATOR_THICKNESS, height: rect.height }
  }
  return placement === 'before'
    ? { x: rect.x, y: rect.y - INDICATOR_THICKNESS / 2, width: rect.width, height: INDICATOR_THICKNESS }
    : { x: rect.x, y: rect.y + rect.height - INDICATOR_THICKNESS / 2, width: rect.width, height: INDICATOR_THICKNESS }
}

/**
 * Create indicator rect for inside placement (empty container)
 */
export function createInsideIndicator(containerRect: Rect): Rect {
  const padding = 8
  return {
    x: containerRect.x + padding,
    y: containerRect.y + padding,
    width: containerRect.width - padding * 2,
    height: containerRect.height - padding * 2,
  }
}

/**
 * Create indicator for insertion between children
 */
export function createInsertionIndicator(
  children: Array<{ nodeId: string; rect: Rect }>,
  index: number,
  direction: 'horizontal' | 'vertical'
): Rect {
  if (children.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  if (index === 0) {
    // Before first child
    const first = children[0]
    return direction === 'horizontal'
      ? { x: first.rect.x - INDICATOR_THICKNESS / 2, y: first.rect.y, width: INDICATOR_THICKNESS, height: first.rect.height }
      : { x: first.rect.x, y: first.rect.y - INDICATOR_THICKNESS / 2, width: first.rect.width, height: INDICATOR_THICKNESS }
  }

  if (index >= children.length) {
    // After last child
    const last = children[children.length - 1]
    return direction === 'horizontal'
      ? { x: last.rect.x + last.rect.width - INDICATOR_THICKNESS / 2, y: last.rect.y, width: INDICATOR_THICKNESS, height: last.rect.height }
      : { x: last.rect.x, y: last.rect.y + last.rect.height - INDICATOR_THICKNESS / 2, width: last.rect.width, height: INDICATOR_THICKNESS }
  }

  // Between two children
  const before = children[index - 1]
  const after = children[index]

  if (direction === 'horizontal') {
    const x = (before.rect.x + before.rect.width + after.rect.x) / 2 - INDICATOR_THICKNESS / 2
    const y = Math.min(before.rect.y, after.rect.y)
    const height = Math.max(before.rect.height, after.rect.height)
    return { x, y, width: INDICATOR_THICKNESS, height }
  }

  const y = (before.rect.y + before.rect.height + after.rect.y) / 2 - INDICATOR_THICKNESS / 2
  const x = Math.min(before.rect.x, after.rect.x)
  const width = Math.max(before.rect.width, after.rect.width)
  return { x, y, width, height: INDICATOR_THICKNESS }
}

// ============================================================================
// Utilities
// ============================================================================

function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  )
}

// ============================================================================
// Exports
// ============================================================================

export function createDropZoneConfig(config?: Partial<DropZoneConfig>): DropZoneConfig {
  return { ...DEFAULT_CONFIG, ...config }
}
