/**
 * Pattern Detector - Auto-Layout Suggestions
 * Feature 8: Auto-Layout Suggestions
 *
 * Detects layout patterns in multi-selected elements and suggests
 * appropriate layout properties (hor, ver, wrap, grid).
 */

/**
 * Layout rectangle with position and size
 */
export interface LayoutRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Pattern types that can be detected
 */
export type LayoutPattern = 'horizontal-stack' | 'vertical-stack' | 'grid' | 'wrap'

/**
 * Layout suggestion returned by the detector
 */
export interface LayoutSuggestion {
  /** IDs of nodes that form the pattern */
  nodeIds: string[]
  /** Detected layout pattern */
  pattern: LayoutPattern
  /** Confidence score (0-1) */
  confidence: number
  /** Suggested DSL preview, e.g., "hor, gap 8" */
  preview: string
  /** Inferred gap between elements */
  inferredGap: number
  /** For grid pattern: number of columns */
  gridColumns?: number
}

/**
 * Configuration for pattern detection
 */
export interface PatternDetectorConfig {
  /** Tolerance for alignment detection (default: 10px) */
  alignmentTolerance?: number
  /** Tolerance for gap variance (default: 8px) */
  gapTolerance?: number
  /** Minimum confidence to return a suggestion (default: 0.6) */
  minConfidence?: number
}

const DEFAULT_ALIGNMENT_TOLERANCE = 10
const DEFAULT_GAP_TOLERANCE = 8
const DEFAULT_MIN_CONFIDENCE = 0.6

/**
 * Detect layout pattern from selected node positions
 */
export function detectLayoutPattern(
  nodeIds: string[],
  layoutInfo: Map<string, LayoutRect>,
  config: PatternDetectorConfig = {}
): LayoutSuggestion | null {
  const {
    alignmentTolerance = DEFAULT_ALIGNMENT_TOLERANCE,
    gapTolerance = DEFAULT_GAP_TOLERANCE,
    minConfidence = DEFAULT_MIN_CONFIDENCE,
  } = config

  // Need at least 2 elements
  if (nodeIds.length < 2) {
    return null
  }

  // Get rects for all nodes
  const rects: Array<{ nodeId: string; rect: LayoutRect }> = []
  for (const nodeId of nodeIds) {
    const rect = layoutInfo.get(nodeId)
    if (rect) {
      rects.push({ nodeId, rect })
    }
  }

  if (rects.length < 2) {
    return null
  }

  // Try detecting patterns - grid first since it's more specific
  const gridResult = detectGrid(rects, alignmentTolerance, gapTolerance)

  // If we have a valid grid pattern, prefer it for 4+ elements in a 2D arrangement
  if (gridResult !== null && gridResult.confidence >= minConfidence && gridResult.gridColumns && gridResult.gridColumns >= 2) {
    // Check if this is truly a 2D grid (has multiple rows)
    const numRows = Math.ceil(rects.length / gridResult.gridColumns)
    if (numRows >= 2) {
      return gridResult
    }
  }

  // Try linear patterns
  const horizontalResult = detectHorizontalStack(rects, alignmentTolerance, gapTolerance)
  const verticalResult = detectVerticalStack(rects, alignmentTolerance, gapTolerance)

  // Pick the best result among linear patterns
  const results = [horizontalResult, verticalResult].filter(
    (r): r is LayoutSuggestion => r !== null && r.confidence >= minConfidence
  )

  if (results.length === 0) {
    // Fall back to grid if it was valid but not preferred
    if (gridResult !== null && gridResult.confidence >= minConfidence) {
      return gridResult
    }
    return null
  }

  // Return highest confidence result
  results.sort((a, b) => b.confidence - a.confidence)
  return results[0]
}

/**
 * Detect horizontal stack pattern
 * Elements are aligned vertically (same Y center) and arranged horizontally
 */
function detectHorizontalStack(
  rects: Array<{ nodeId: string; rect: LayoutRect }>,
  alignmentTolerance: number,
  gapTolerance: number
): LayoutSuggestion | null {
  if (rects.length < 2) return null

  // Sort by X position
  const sorted = [...rects].sort((a, b) => a.rect.x - b.rect.x)

  // Check Y center alignment
  const centers = sorted.map(r => r.rect.y + r.rect.height / 2)
  const avgCenterY = centers.reduce((sum, c) => sum + c, 0) / centers.length
  const maxYDeviation = Math.max(...centers.map(c => Math.abs(c - avgCenterY)))

  if (maxYDeviation > alignmentTolerance) {
    return null
  }

  // Check for non-overlapping horizontal arrangement
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].rect
    const next = sorted[i + 1].rect
    if (current.x + current.width > next.x) {
      // Overlapping
      return null
    }
  }

  // Calculate gaps
  const gaps: number[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].rect
    const next = sorted[i + 1].rect
    gaps.push(next.x - (current.x + current.width))
  }

  // Check gap consistency
  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length
  const maxGapDeviation = Math.max(...gaps.map(g => Math.abs(g - avgGap)))
  const gapConsistency = maxGapDeviation <= gapTolerance ? 1 : Math.max(0, 1 - maxGapDeviation / 50)

  // Calculate confidence
  const alignmentScore = 1 - maxYDeviation / alignmentTolerance
  const confidence = (alignmentScore + gapConsistency) / 2

  // Round gap to 4px grid
  const roundedGap = Math.round(avgGap / 4) * 4

  return {
    nodeIds: sorted.map(r => r.nodeId),
    pattern: 'horizontal-stack',
    confidence: Math.min(1, Math.max(0, confidence)),
    preview: `hor, gap ${roundedGap}`,
    inferredGap: roundedGap,
  }
}

/**
 * Detect vertical stack pattern
 * Elements are aligned horizontally (same X center) and arranged vertically
 */
function detectVerticalStack(
  rects: Array<{ nodeId: string; rect: LayoutRect }>,
  alignmentTolerance: number,
  gapTolerance: number
): LayoutSuggestion | null {
  if (rects.length < 2) return null

  // Sort by Y position
  const sorted = [...rects].sort((a, b) => a.rect.y - b.rect.y)

  // Check X center alignment
  const centers = sorted.map(r => r.rect.x + r.rect.width / 2)
  const avgCenterX = centers.reduce((sum, c) => sum + c, 0) / centers.length
  const maxXDeviation = Math.max(...centers.map(c => Math.abs(c - avgCenterX)))

  if (maxXDeviation > alignmentTolerance) {
    return null
  }

  // Check for non-overlapping vertical arrangement
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].rect
    const next = sorted[i + 1].rect
    if (current.y + current.height > next.y) {
      // Overlapping
      return null
    }
  }

  // Calculate gaps
  const gaps: number[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].rect
    const next = sorted[i + 1].rect
    gaps.push(next.y - (current.y + current.height))
  }

  // Check gap consistency
  const avgGap = gaps.reduce((sum, g) => sum + g, 0) / gaps.length
  const maxGapDeviation = Math.max(...gaps.map(g => Math.abs(g - avgGap)))
  const gapConsistency = maxGapDeviation <= gapTolerance ? 1 : Math.max(0, 1 - maxGapDeviation / 50)

  // Calculate confidence
  const alignmentScore = 1 - maxXDeviation / alignmentTolerance
  const confidence = (alignmentScore + gapConsistency) / 2

  // Round gap to 4px grid
  const roundedGap = Math.round(avgGap / 4) * 4

  return {
    nodeIds: sorted.map(r => r.nodeId),
    pattern: 'vertical-stack',
    confidence: Math.min(1, Math.max(0, confidence)),
    preview: `ver, gap ${roundedGap}`,
    inferredGap: roundedGap,
  }
}

/**
 * Detect grid pattern
 * Elements are arranged in rows and columns
 */
function detectGrid(
  rects: Array<{ nodeId: string; rect: LayoutRect }>,
  alignmentTolerance: number,
  gapTolerance: number
): LayoutSuggestion | null {
  // Need at least 4 elements for a grid (2x2)
  if (rects.length < 4) return null

  // Find unique Y positions (rows)
  const yPositions = rects.map(r => r.rect.y)
  const uniqueYPositions = findUniquePositions(yPositions, alignmentTolerance)

  // Need at least 2 rows
  if (uniqueYPositions.length < 2) return null

  // Find unique X positions (columns)
  const xPositions = rects.map(r => r.rect.x)
  const uniqueXPositions = findUniquePositions(xPositions, alignmentTolerance)

  // Need at least 2 columns
  if (uniqueXPositions.length < 2) return null

  // Check if elements fit into grid cells
  const gridRows = uniqueYPositions.length
  const gridCols = uniqueXPositions.length
  const expectedCells = gridRows * gridCols

  // Allow for incomplete grids (at least 75% filled)
  if (rects.length < expectedCells * 0.5) return null

  // Calculate gaps
  const colGaps: number[] = []
  const sortedX = [...uniqueXPositions].sort((a, b) => a - b)
  for (let i = 0; i < sortedX.length - 1; i++) {
    // Find elements at these X positions
    const elemsAtX = rects.filter(r => Math.abs(r.rect.x - sortedX[i]) <= alignmentTolerance)
    if (elemsAtX.length > 0) {
      const maxRight = Math.max(...elemsAtX.map(r => r.rect.x + r.rect.width))
      colGaps.push(sortedX[i + 1] - maxRight)
    }
  }

  const rowGaps: number[] = []
  const sortedY = [...uniqueYPositions].sort((a, b) => a - b)
  for (let i = 0; i < sortedY.length - 1; i++) {
    const elemsAtY = rects.filter(r => Math.abs(r.rect.y - sortedY[i]) <= alignmentTolerance)
    if (elemsAtY.length > 0) {
      const maxBottom = Math.max(...elemsAtY.map(r => r.rect.y + r.rect.height))
      rowGaps.push(sortedY[i + 1] - maxBottom)
    }
  }

  // Average gap
  const allGaps = [...colGaps, ...rowGaps].filter(g => g > 0)
  if (allGaps.length === 0) return null

  const avgGap = allGaps.reduce((sum, g) => sum + g, 0) / allGaps.length
  const maxGapDeviation = Math.max(...allGaps.map(g => Math.abs(g - avgGap)))
  const gapConsistency = maxGapDeviation <= gapTolerance * 2 ? 1 : Math.max(0, 1 - maxGapDeviation / 50)

  // Calculate confidence based on grid fill and gap consistency
  const fillRatio = rects.length / expectedCells
  const confidence = (fillRatio + gapConsistency) / 2

  // Round gap to 4px grid
  const roundedGap = Math.round(avgGap / 4) * 4

  return {
    nodeIds: rects.map(r => r.nodeId),
    pattern: 'grid',
    confidence: Math.min(1, Math.max(0, confidence)),
    preview: `grid ${gridCols}, gap ${roundedGap}`,
    inferredGap: roundedGap,
    gridColumns: gridCols,
  }
}

/**
 * Find unique positions within tolerance
 */
function findUniquePositions(positions: number[], tolerance: number): number[] {
  const sorted = [...positions].sort((a, b) => a - b)
  const unique: number[] = []

  for (const pos of sorted) {
    // Check if there's already a position close enough
    const hasExisting = unique.some(u => Math.abs(u - pos) <= tolerance)
    if (!hasExisting) {
      unique.push(pos)
    }
  }

  return unique
}

/**
 * Get rects from DOM elements
 */
export function getLayoutRectsFromDOM(
  nodeIds: string[],
  containerElement?: HTMLElement
): Map<string, LayoutRect> {
  const container = containerElement || document.body
  const containerRect = container.getBoundingClientRect()
  const rects = new Map<string, LayoutRect>()

  for (const nodeId of nodeIds) {
    const element = container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (!element) continue

    const rect = element.getBoundingClientRect()
    rects.set(nodeId, {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    })
  }

  return rects
}
