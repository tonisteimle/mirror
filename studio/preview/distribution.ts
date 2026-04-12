/**
 * Distribution Calculator
 * Feature 7: Smart Distribution
 *
 * Calculates positions for distributing elements evenly.
 */

export type DistributionType = 'horizontal' | 'vertical' | 'space-between' | 'space-evenly'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface DistributionResult {
  nodeId: string
  x: number
  y: number
}

/**
 * Calculate new positions to distribute elements evenly
 */
export function calculateDistribution(
  nodeIds: string[],
  type: DistributionType,
  layoutInfo: Map<string, Rect>
): DistributionResult[] {
  if (nodeIds.length < 2) {
    return []
  }

  // Get rects for all nodes and sort by position
  const rects: Array<{ id: string; rect: Rect }> = []
  for (const id of nodeIds) {
    const rect = layoutInfo.get(id)
    if (rect) {
      rects.push({ id, rect })
    }
  }

  if (rects.length < 2) {
    return []
  }

  switch (type) {
    case 'horizontal':
      return distributeHorizontal(rects)
    case 'vertical':
      return distributeVertical(rects)
    case 'space-between':
      return distributeSpaceBetween(rects)
    case 'space-evenly':
      return distributeSpaceEvenly(rects)
    default:
      return []
  }
}

/**
 * Distribute elements horizontally with equal spacing
 */
function distributeHorizontal(rects: Array<{ id: string; rect: Rect }>): DistributionResult[] {
  // Sort by x position
  const sorted = [...rects].sort((a, b) => a.rect.x - b.rect.x)

  // Get bounds
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const startX = first.rect.x
  const endX = last.rect.x + last.rect.width

  // Calculate total width of all elements
  const totalWidth = sorted.reduce((sum, r) => sum + r.rect.width, 0)

  // Calculate available space for gaps
  const availableSpace = endX - startX - totalWidth
  const gap = availableSpace / (sorted.length - 1)

  // Calculate new positions
  const results: DistributionResult[] = []
  let currentX = startX

  for (const item of sorted) {
    results.push({
      nodeId: item.id,
      x: Math.round(currentX),
      y: item.rect.y, // Keep Y unchanged
    })
    currentX += item.rect.width + gap
  }

  return results
}

/**
 * Distribute elements vertically with equal spacing
 */
function distributeVertical(rects: Array<{ id: string; rect: Rect }>): DistributionResult[] {
  // Sort by y position
  const sorted = [...rects].sort((a, b) => a.rect.y - b.rect.y)

  // Get bounds
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const startY = first.rect.y
  const endY = last.rect.y + last.rect.height

  // Calculate total height of all elements
  const totalHeight = sorted.reduce((sum, r) => sum + r.rect.height, 0)

  // Calculate available space for gaps
  const availableSpace = endY - startY - totalHeight
  const gap = availableSpace / (sorted.length - 1)

  // Calculate new positions
  const results: DistributionResult[] = []
  let currentY = startY

  for (const item of sorted) {
    results.push({
      nodeId: item.id,
      x: item.rect.x, // Keep X unchanged
      y: Math.round(currentY),
    })
    currentY += item.rect.height + gap
  }

  return results
}

/**
 * Distribute with space between (first and last stay in place)
 */
function distributeSpaceBetween(rects: Array<{ id: string; rect: Rect }>): DistributionResult[] {
  // Determine dominant direction
  const sorted = [...rects].sort((a, b) => a.rect.x - b.rect.x)
  const xRange = sorted[sorted.length - 1].rect.x - sorted[0].rect.x

  const sortedY = [...rects].sort((a, b) => a.rect.y - b.rect.y)
  const yRange = sortedY[sortedY.length - 1].rect.y - sortedY[0].rect.y

  if (xRange >= yRange) {
    return distributeHorizontal(rects)
  } else {
    return distributeVertical(rects)
  }
}

/**
 * Distribute with equal space around all elements
 */
function distributeSpaceEvenly(rects: Array<{ id: string; rect: Rect }>): DistributionResult[] {
  // Determine dominant direction and distribute
  // For space-evenly, we center the group and distribute evenly
  const sorted = [...rects].sort((a, b) => a.rect.x - b.rect.x)
  const xRange = sorted[sorted.length - 1].rect.x - sorted[0].rect.x

  const sortedY = [...rects].sort((a, b) => a.rect.y - b.rect.y)
  const yRange = sortedY[sortedY.length - 1].rect.y - sortedY[0].rect.y

  if (xRange >= yRange) {
    return distributeHorizontal(rects)
  } else {
    return distributeVertical(rects)
  }
}

/**
 * Detect if elements are roughly aligned horizontally or vertically
 */
export function detectDistributionDirection(
  nodeIds: string[],
  layoutInfo: Map<string, Rect>
): 'horizontal' | 'vertical' | null {
  if (nodeIds.length < 2) return null

  const rects: Rect[] = []
  for (const id of nodeIds) {
    const rect = layoutInfo.get(id)
    if (rect) rects.push(rect)
  }

  if (rects.length < 2) return null

  // Calculate average center Y and check vertical alignment
  const avgCenterY = rects.reduce((sum, r) => sum + r.y + r.height / 2, 0) / rects.length
  const yVariance = rects.reduce((sum, r) => {
    const centerY = r.y + r.height / 2
    return sum + Math.abs(centerY - avgCenterY)
  }, 0) / rects.length

  // Calculate average center X and check horizontal alignment
  const avgCenterX = rects.reduce((sum, r) => sum + r.x + r.width / 2, 0) / rects.length
  const xVariance = rects.reduce((sum, r) => {
    const centerX = r.x + r.width / 2
    return sum + Math.abs(centerX - avgCenterX)
  }, 0) / rects.length

  // If elements are more aligned vertically (low Y variance), distribute horizontally
  // If elements are more aligned horizontally (low X variance), distribute vertically
  const threshold = 20 // px tolerance for alignment

  if (yVariance < threshold && xVariance > threshold) {
    return 'horizontal' // Elements are in a row, distribute horizontally
  } else if (xVariance < threshold && yVariance > threshold) {
    return 'vertical' // Elements are in a column, distribute vertically
  }

  // Default based on which variance is smaller
  return yVariance < xVariance ? 'horizontal' : 'vertical'
}
