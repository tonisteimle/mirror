/**
 * Snap Model Tests
 *
 * Tests pure snap calculations for guides, grid, and edges.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSnap,
  snapPointToGrid,
  snapRectToGrid,
  createSnapConfig,
  createSnapContext,
  type SnapConfig,
  type SnapContext,
} from '../snap'
import type { Point, Rect } from '../coordinate'

// ==========================================================================
// calculateSnap
// ==========================================================================

describe('calculateSnap()', () => {
  describe('disabled snapping', () => {
    it('returns original position when disabled', () => {
      const context = createSnapContext(
        { x: 50, y: 50, width: 100, height: 100 },
        [],
        undefined,
        { enabled: false }
      )

      const result = calculateSnap({ x: 53, y: 47 }, context)

      expect(result.position).toEqual({ x: 53, y: 47 })
      expect(result.snapped).toBe(false)
      expect(result.guides).toEqual([])
    })
  })

  describe('guide snapping', () => {
    it('snaps to sibling left edge', () => {
      const dragRect: Rect = { x: 0, y: 100, width: 50, height: 50 }
      const siblings = [{ nodeId: 'sibling', rect: { x: 100, y: 0, width: 50, height: 50 } }]
      const context = createSnapContext(dragRect, siblings, undefined, { threshold: 5 })

      const result = calculateSnap({ x: 98, y: 100 }, context)

      expect(result.position.x).toBe(100)
      expect(result.snapped).toBe(true)
      expect(result.snapInfo.x).not.toBeNull()
      expect(result.snapInfo.x!.snapped).toBe(100)
    })

    it('snaps to sibling center', () => {
      const dragRect: Rect = { x: 0, y: 100, width: 50, height: 50 }
      const siblings = [{ nodeId: 'sibling', rect: { x: 100, y: 0, width: 100, height: 50 } }]
      // Sibling center is at x=150
      const context = createSnapContext(dragRect, siblings, undefined, { threshold: 5 })

      const result = calculateSnap({ x: 148, y: 100 }, context)

      expect(result.position.x).toBe(150)
    })

    it('snaps to sibling right edge', () => {
      const dragRect: Rect = { x: 0, y: 100, width: 50, height: 50 }
      const siblings = [{ nodeId: 'sibling', rect: { x: 100, y: 0, width: 50, height: 50 } }]
      // Right edge is at x=150
      const context = createSnapContext(dragRect, siblings, undefined, { threshold: 5 })

      const result = calculateSnap({ x: 152, y: 100 }, context)

      expect(result.position.x).toBe(150)
    })

    it('snaps to sibling top edge', () => {
      const dragRect: Rect = { x: 100, y: 0, width: 50, height: 50 }
      const siblings = [{ nodeId: 'sibling', rect: { x: 0, y: 100, width: 50, height: 50 } }]
      const context = createSnapContext(dragRect, siblings, undefined, { threshold: 5 })

      const result = calculateSnap({ x: 100, y: 98 }, context)

      expect(result.position.y).toBe(100)
    })

    it('does not snap when outside threshold', () => {
      const dragRect: Rect = { x: 0, y: 100, width: 50, height: 50 }
      const siblings = [{ nodeId: 'sibling', rect: { x: 100, y: 0, width: 50, height: 50 } }]
      const context = createSnapContext(dragRect, siblings, undefined, { threshold: 5 })

      const result = calculateSnap({ x: 90, y: 100 }, context)

      expect(result.position.x).toBe(90) // Not snapped
      expect(result.snapInfo.x).toBeNull()
    })

    it('snaps both axes independently', () => {
      const dragRect: Rect = { x: 0, y: 0, width: 50, height: 50 }
      const siblings = [{ nodeId: 's1', rect: { x: 100, y: 200, width: 50, height: 50 } }]
      const context = createSnapContext(dragRect, siblings, undefined, { threshold: 5 })

      const result = calculateSnap({ x: 102, y: 198 }, context)

      expect(result.position.x).toBe(100)
      expect(result.position.y).toBe(200)
    })
  })

  describe('edge snapping to container', () => {
    it('snaps to container left edge', () => {
      const dragRect: Rect = { x: 0, y: 50, width: 50, height: 50 }
      const containerRect: Rect = { x: 0, y: 0, width: 400, height: 400 }
      const context = createSnapContext(dragRect, [], containerRect, { threshold: 5 })

      const result = calculateSnap({ x: 2, y: 50 }, context)

      expect(result.position.x).toBe(0)
    })

    it('snaps to container center', () => {
      const dragRect: Rect = { x: 0, y: 50, width: 50, height: 50 }
      const containerRect: Rect = { x: 0, y: 0, width: 400, height: 400 }
      const context = createSnapContext(dragRect, [], containerRect, { threshold: 5 })

      const result = calculateSnap({ x: 198, y: 50 }, context)

      expect(result.position.x).toBe(200) // Center of 400px container
    })

    it('does not snap to container when disabled', () => {
      const dragRect: Rect = { x: 0, y: 50, width: 50, height: 50 }
      const containerRect: Rect = { x: 0, y: 0, width: 400, height: 400 }
      const context = createSnapContext(dragRect, [], containerRect, { threshold: 5, snapToEdges: false })

      const result = calculateSnap({ x: 2, y: 50 }, context)

      expect(result.position.x).toBe(2) // Not snapped
    })
  })

  describe('grid snapping', () => {
    it('snaps to grid when no guide matches', () => {
      const dragRect: Rect = { x: 0, y: 0, width: 50, height: 50 }
      const context = createSnapContext(dragRect, [], undefined, { gridSize: 8, threshold: 5 })

      const result = calculateSnap({ x: 25, y: 30 }, context)

      expect(result.position.x).toBe(24) // Snapped to 8-grid
      expect(result.position.y).toBe(32) // Snapped to 8-grid
    })

    it('prefers guide over grid when both match', () => {
      const dragRect: Rect = { x: 0, y: 0, width: 50, height: 50 }
      const siblings = [{ nodeId: 'sibling', rect: { x: 100, y: 0, width: 50, height: 50 } }]
      const context = createSnapContext(dragRect, siblings, undefined, { gridSize: 8, threshold: 5 })

      // 98 is closer to guide at 100 than grid at 96
      const result = calculateSnap({ x: 98, y: 25 }, context)

      expect(result.position.x).toBe(100) // Guide wins
      expect(result.snapInfo.x!.type).toBe('guide')
    })
  })

  describe('guide generation', () => {
    it('generates vertical guide when snapping X', () => {
      const dragRect: Rect = { x: 0, y: 100, width: 50, height: 50 }
      const siblings = [{ nodeId: 'sibling', rect: { x: 100, y: 0, width: 50, height: 50 } }]
      const context = createSnapContext(dragRect, siblings, undefined, { threshold: 5 })

      const result = calculateSnap({ x: 102, y: 100 }, context)

      expect(result.guides.length).toBeGreaterThan(0)
      const xGuide = result.guides.find((g) => g.axis === 'x')
      expect(xGuide).toBeDefined()
      expect(xGuide!.position).toBe(100)
    })

    it('generates horizontal guide when snapping Y', () => {
      const dragRect: Rect = { x: 100, y: 0, width: 50, height: 50 }
      const siblings = [{ nodeId: 'sibling', rect: { x: 0, y: 100, width: 50, height: 50 } }]
      const context = createSnapContext(dragRect, siblings, undefined, { threshold: 5 })

      const result = calculateSnap({ x: 100, y: 102 }, context)

      expect(result.guides.length).toBeGreaterThan(0)
      const yGuide = result.guides.find((g) => g.axis === 'y')
      expect(yGuide).toBeDefined()
      expect(yGuide!.position).toBe(100)
    })
  })
})

// ==========================================================================
// Grid Snap Utilities
// ==========================================================================

describe('snapPointToGrid()', () => {
  it('snaps point to grid', () => {
    const result = snapPointToGrid({ x: 13, y: 22 }, 8)

    expect(result).toEqual({ x: 16, y: 24 })
  })

  it('returns original when grid is 0', () => {
    const result = snapPointToGrid({ x: 13, y: 22 }, 0)

    expect(result).toEqual({ x: 13, y: 22 })
  })

  it('returns original when grid is negative', () => {
    const result = snapPointToGrid({ x: 13, y: 22 }, -8)

    expect(result).toEqual({ x: 13, y: 22 })
  })
})

describe('snapRectToGrid()', () => {
  it('snaps rect position but not size', () => {
    const rect: Rect = { x: 13, y: 22, width: 45, height: 33 }

    const result = snapRectToGrid(rect, 8)

    expect(result.x).toBe(16)
    expect(result.y).toBe(24)
    expect(result.width).toBe(45)
    expect(result.height).toBe(33)
  })

  it('returns original when grid is 0', () => {
    const rect: Rect = { x: 13, y: 22, width: 45, height: 33 }

    const result = snapRectToGrid(rect, 0)

    expect(result).toEqual(rect)
  })
})

// ==========================================================================
// Factory Functions
// ==========================================================================

describe('createSnapConfig()', () => {
  it('creates config with defaults', () => {
    const config = createSnapConfig()

    expect(config.enabled).toBe(true)
    expect(config.gridSize).toBe(0)
    expect(config.threshold).toBe(5)
    expect(config.snapToGuides).toBe(true)
    expect(config.snapToEdges).toBe(true)
  })

  it('merges custom values', () => {
    const config = createSnapConfig({ gridSize: 8, threshold: 10 })

    expect(config.gridSize).toBe(8)
    expect(config.threshold).toBe(10)
    expect(config.enabled).toBe(true) // Default preserved
  })
})

describe('createSnapContext()', () => {
  it('creates context with required fields', () => {
    const dragRect: Rect = { x: 0, y: 0, width: 50, height: 50 }

    const context = createSnapContext(dragRect)

    expect(context.dragRect).toEqual(dragRect)
    expect(context.siblingRects).toEqual([])
    expect(context.containerRect).toBeUndefined()
    expect(context.config.enabled).toBe(true)
  })

  it('creates context with all fields', () => {
    const dragRect: Rect = { x: 0, y: 0, width: 50, height: 50 }
    const siblings = [{ nodeId: 's1', rect: { x: 100, y: 0, width: 50, height: 50 } }]
    const container: Rect = { x: 0, y: 0, width: 400, height: 400 }

    const context = createSnapContext(dragRect, siblings, container, { gridSize: 8 })

    expect(context.dragRect).toEqual(dragRect)
    expect(context.siblingRects).toEqual(siblings)
    expect(context.containerRect).toEqual(container)
    expect(context.config.gridSize).toBe(8)
  })
})

// ==========================================================================
// Edge Cases
// ==========================================================================

describe('edge cases', () => {
  it('handles empty siblings array', () => {
    const context = createSnapContext({ x: 0, y: 0, width: 50, height: 50 }, [], undefined, {
      gridSize: 0,
    })

    const result = calculateSnap({ x: 25, y: 25 }, context)

    expect(result.position).toEqual({ x: 25, y: 25 })
    expect(result.snapped).toBe(false)
  })

  it('handles multiple siblings at same position', () => {
    const siblings = [
      { nodeId: 's1', rect: { x: 100, y: 0, width: 50, height: 50 } },
      { nodeId: 's2', rect: { x: 100, y: 60, width: 50, height: 50 } },
    ]
    const context = createSnapContext({ x: 0, y: 0, width: 50, height: 50 }, siblings, undefined, {
      threshold: 5,
    })

    const result = calculateSnap({ x: 102, y: 25 }, context)

    expect(result.position.x).toBe(100)
  })

  it('handles very small threshold', () => {
    const siblings = [{ nodeId: 's1', rect: { x: 100, y: 0, width: 50, height: 50 } }]
    const context = createSnapContext({ x: 0, y: 0, width: 50, height: 50 }, siblings, undefined, {
      threshold: 1,
    })

    // 2px away should not snap with 1px threshold
    // Use y=80 to avoid coincidentally matching sibling edges (0, 25, 50)
    const result = calculateSnap({ x: 98, y: 80 }, context)

    expect(result.position.x).toBe(98)
    expect(result.position.y).toBe(80)
    expect(result.snapped).toBe(false)
  })

  it('handles zero-size rect', () => {
    const siblings = [{ nodeId: 's1', rect: { x: 100, y: 100, width: 0, height: 0 } }]
    const context = createSnapContext({ x: 0, y: 0, width: 50, height: 50 }, siblings, undefined, {
      threshold: 5,
    })

    const result = calculateSnap({ x: 102, y: 102 }, context)

    expect(result.position.x).toBe(100)
    expect(result.position.y).toBe(100)
  })
})
