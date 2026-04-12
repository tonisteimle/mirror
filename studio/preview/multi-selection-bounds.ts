/**
 * Multi-Selection Bounds Calculator
 * Feature 4: Multi-Element Manipulation
 *
 * Calculates bounding box for multiple selected elements.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface BoundingBox extends Rect {
  /** Node IDs included in this bounding box */
  nodeIds: string[]
  /** Individual rects for each node */
  rects: Map<string, Rect>
}

/**
 * Calculate the combined bounding box for multiple nodes
 */
export function calculateBoundingBox(
  nodeIds: string[],
  getRect: (nodeId: string) => Rect | null
): BoundingBox | null {
  if (nodeIds.length === 0) {
    return null
  }

  const rects = new Map<string, Rect>()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const nodeId of nodeIds) {
    const rect = getRect(nodeId)
    if (!rect) continue

    rects.set(nodeId, rect)
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }

  if (rects.size === 0) {
    return null
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    nodeIds: [...rects.keys()],
    rects,
  }
}

/**
 * Calculate bounding box from DOM elements
 */
export function calculateBoundingBoxFromDOM(
  nodeIds: string[],
  containerElement?: HTMLElement
): BoundingBox | null {
  const container = containerElement || document.body
  const containerRect = container.getBoundingClientRect()

  return calculateBoundingBox(nodeIds, (nodeId) => {
    const element = container.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement
    if (!element) return null

    const rect = element.getBoundingClientRect()
    return {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top,
      width: rect.width,
      height: rect.height,
    }
  })
}

/**
 * Calculate relative positions of nodes within the bounding box
 * Useful for proportional resizing
 */
export function calculateRelativePositions(
  boundingBox: BoundingBox
): Map<string, { relX: number; relY: number; relWidth: number; relHeight: number }> {
  const relative = new Map<string, { relX: number; relY: number; relWidth: number; relHeight: number }>()

  if (boundingBox.width === 0 || boundingBox.height === 0) {
    // Degenerate case: all nodes at same position
    for (const nodeId of boundingBox.nodeIds) {
      relative.set(nodeId, { relX: 0, relY: 0, relWidth: 1, relHeight: 1 })
    }
    return relative
  }

  for (const [nodeId, rect] of boundingBox.rects) {
    relative.set(nodeId, {
      relX: (rect.x - boundingBox.x) / boundingBox.width,
      relY: (rect.y - boundingBox.y) / boundingBox.height,
      relWidth: rect.width / boundingBox.width,
      relHeight: rect.height / boundingBox.height,
    })
  }

  return relative
}

/**
 * Calculate new positions after moving the bounding box
 */
export function calculateMovedPositions(
  boundingBox: BoundingBox,
  deltaX: number,
  deltaY: number
): Map<string, { x: number; y: number }> {
  const newPositions = new Map<string, { x: number; y: number }>()

  for (const [nodeId, rect] of boundingBox.rects) {
    newPositions.set(nodeId, {
      x: Math.round(rect.x + deltaX),
      y: Math.round(rect.y + deltaY),
    })
  }

  return newPositions
}

/**
 * Calculate new positions and sizes after resizing the bounding box
 */
export function calculateResizedPositions(
  boundingBox: BoundingBox,
  newWidth: number,
  newHeight: number,
  anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' = 'top-left'
): Map<string, { x: number; y: number; width: number; height: number }> {
  const newPositions = new Map<string, { x: number; y: number; width: number; height: number }>()
  const relativePositions = calculateRelativePositions(boundingBox)

  // Calculate anchor offset
  let anchorOffsetX = 0
  let anchorOffsetY = 0

  switch (anchor) {
    case 'top-right':
      anchorOffsetX = boundingBox.width - newWidth
      break
    case 'bottom-left':
      anchorOffsetY = boundingBox.height - newHeight
      break
    case 'bottom-right':
      anchorOffsetX = boundingBox.width - newWidth
      anchorOffsetY = boundingBox.height - newHeight
      break
    case 'center':
      anchorOffsetX = (boundingBox.width - newWidth) / 2
      anchorOffsetY = (boundingBox.height - newHeight) / 2
      break
  }

  for (const [nodeId, rel] of relativePositions) {
    newPositions.set(nodeId, {
      x: Math.round(boundingBox.x + anchorOffsetX + rel.relX * newWidth),
      y: Math.round(boundingBox.y + anchorOffsetY + rel.relY * newHeight),
      width: Math.round(rel.relWidth * newWidth),
      height: Math.round(rel.relHeight * newHeight),
    })
  }

  return newPositions
}
