/**
 * DropZone Model Tests
 *
 * Tests pure drop zone detection and placement calculations.
 */

import { describe, it, expect } from 'vitest'
import {
  findDropZone,
  calculatePlacement,
  getEdgeInfo,
  findInsertionPoint,
  createEdgeIndicator,
  createInsideIndicator,
  createInsertionIndicator,
  createDropZoneConfig,
  type DropCandidate,
  type DropZoneConfig,
} from '../drop-zone'
import type { Point, Rect } from '../coordinate'

// ==========================================================================
// findDropZone
// ==========================================================================

describe('findDropZone()', () => {
  it('returns null when cursor is outside all candidates', () => {
    const cursor: Point = { x: 500, y: 500 }
    const candidates: DropCandidate[] = [
      { nodeId: 'box1', rect: { x: 0, y: 0, width: 100, height: 100 }, acceptsChildren: true, isPositioned: false },
    ]

    const result = findDropZone(cursor, candidates)

    expect(result).toBeNull()
  })

  it('returns drop zone for single candidate', () => {
    const cursor: Point = { x: 50, y: 50 }
    const candidates: DropCandidate[] = [
      { nodeId: 'box1', rect: { x: 0, y: 0, width: 100, height: 100 }, acceptsChildren: true, isPositioned: false },
    ]

    const result = findDropZone(cursor, candidates)

    expect(result).not.toBeNull()
    expect(result!.nodeId).toBe('box1')
    expect(result!.placement).toBe('inside')
  })

  it('prefers smaller (more specific) targets', () => {
    const cursor: Point = { x: 75, y: 75 }
    const candidates: DropCandidate[] = [
      { nodeId: 'parent', rect: { x: 0, y: 0, width: 200, height: 200 }, acceptsChildren: true, isPositioned: false },
      { nodeId: 'child', rect: { x: 50, y: 50, width: 100, height: 100 }, acceptsChildren: true, isPositioned: false },
    ]

    const result = findDropZone(cursor, candidates)

    expect(result!.nodeId).toBe('child')
  })
})

// ==========================================================================
// calculatePlacement
// ==========================================================================

describe('calculatePlacement()', () => {
  const config = createDropZoneConfig()

  describe('positioned containers', () => {
    it('returns absolute placement with relative position', () => {
      const cursor: Point = { x: 150, y: 175 }
      const target: DropCandidate = {
        nodeId: 'positioned',
        rect: { x: 100, y: 100, width: 200, height: 200 },
        acceptsChildren: true,
        isPositioned: true,
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.placement).toBe('absolute')
      expect(result.absolutePosition).toEqual({ x: 50, y: 75 })
    })
  })

  describe('direction propagation', () => {
    it('includes direction in result for horizontal containers', () => {
      const cursor: Point = { x: 50, y: 50 }
      const target: DropCandidate = {
        nodeId: 'hbox',
        rect: { x: 0, y: 0, width: 200, height: 100 },
        acceptsChildren: true,
        isPositioned: false,
        direction: 'horizontal',
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.direction).toBe('horizontal')
    })

    it('includes direction in result for vertical containers', () => {
      const cursor: Point = { x: 50, y: 50 }
      const target: DropCandidate = {
        nodeId: 'vbox',
        rect: { x: 0, y: 0, width: 100, height: 200 },
        acceptsChildren: true,
        isPositioned: false,
        direction: 'vertical',
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.direction).toBe('vertical')
    })

    it('defaults to vertical when direction not specified', () => {
      const cursor: Point = { x: 50, y: 50 }
      const target: DropCandidate = {
        nodeId: 'box',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        acceptsChildren: true,
        isPositioned: false,
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.direction).toBe('vertical')
    })
  })

  describe('non-containers (leaf elements)', () => {
    it('returns before when near top edge', () => {
      const cursor: Point = { x: 50, y: 5 }
      const target: DropCandidate = {
        nodeId: 'leaf',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        acceptsChildren: false,
        isPositioned: false,
        direction: 'vertical',
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.placement).toBe('before')
    })

    it('returns after when near bottom edge', () => {
      const cursor: Point = { x: 50, y: 95 }
      const target: DropCandidate = {
        nodeId: 'leaf',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        acceptsChildren: false,
        isPositioned: false,
        direction: 'vertical',
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.placement).toBe('after')
    })

    it('defaults to after when in center', () => {
      const cursor: Point = { x: 50, y: 50 }
      const target: DropCandidate = {
        nodeId: 'leaf',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        acceptsChildren: false,
        isPositioned: false,
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.placement).toBe('after')
    })
  })

  describe('containers with children', () => {
    it('returns inside placement with insertion index', () => {
      const cursor: Point = { x: 50, y: 60 }
      const target: DropCandidate = {
        nodeId: 'container',
        rect: { x: 0, y: 0, width: 100, height: 200 },
        acceptsChildren: true,
        isPositioned: false,
        direction: 'vertical',
        childRects: [
          { nodeId: 'child1', rect: { x: 10, y: 10, width: 80, height: 30 } },
          { nodeId: 'child2', rect: { x: 10, y: 50, width: 80, height: 30 } },
          { nodeId: 'child3', rect: { x: 10, y: 90, width: 80, height: 30 } },
        ],
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.placement).toBe('inside')
      expect(result.insertionIndex).toBeDefined()
    })
  })

  describe('empty containers', () => {
    it('returns inside placement at index 0', () => {
      const cursor: Point = { x: 50, y: 50 }
      const target: DropCandidate = {
        nodeId: 'empty',
        rect: { x: 0, y: 0, width: 100, height: 100 },
        acceptsChildren: true,
        isPositioned: false,
      }

      const result = calculatePlacement(cursor, target, config)

      expect(result.placement).toBe('inside')
      expect(result.insertionIndex).toBe(0)
    })
  })
})

// ==========================================================================
// getEdgeInfo
// ==========================================================================

describe('getEdgeInfo()', () => {
  const config = createDropZoneConfig({ edgeThreshold: 0.25, minEdgePixels: 8 })
  const rect: Rect = { x: 0, y: 0, width: 100, height: 100 }

  it('detects top edge', () => {
    const result = getEdgeInfo({ x: 50, y: 5 }, rect, config)

    expect(result.isOnEdge).toBe(true)
    expect(result.placement).toBe('before')
    expect(result.edgeName).toBe('top')
  })

  it('detects bottom edge', () => {
    const result = getEdgeInfo({ x: 50, y: 95 }, rect, config)

    expect(result.isOnEdge).toBe(true)
    expect(result.placement).toBe('after')
    expect(result.edgeName).toBe('bottom')
  })

  it('detects left edge', () => {
    const result = getEdgeInfo({ x: 5, y: 50 }, rect, config)

    expect(result.isOnEdge).toBe(true)
    expect(result.placement).toBe('before')
    expect(result.edgeName).toBe('left')
  })

  it('detects right edge', () => {
    const result = getEdgeInfo({ x: 95, y: 50 }, rect, config)

    expect(result.isOnEdge).toBe(true)
    expect(result.placement).toBe('after')
    expect(result.edgeName).toBe('right')
  })

  it('returns not on edge for center', () => {
    const result = getEdgeInfo({ x: 50, y: 50 }, rect, config)

    expect(result.isOnEdge).toBe(false)
  })

  it('respects minimum edge pixels', () => {
    const smallRect: Rect = { x: 0, y: 0, width: 20, height: 20 }
    // With 25% threshold, edge would be 5px, but min is 8px
    // So 6px from edge should still be "on edge"
    const result = getEdgeInfo({ x: 10, y: 6 }, smallRect, config)

    expect(result.isOnEdge).toBe(true)
  })
})

// ==========================================================================
// findInsertionPoint
// ==========================================================================

describe('findInsertionPoint()', () => {
  describe('vertical layout', () => {
    const children = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 30 } },
      { nodeId: 'b', rect: { x: 0, y: 40, width: 100, height: 30 } },
      { nodeId: 'c', rect: { x: 0, y: 80, width: 100, height: 30 } },
    ]

    it('returns 0 when cursor above first child', () => {
      const result = findInsertionPoint({ x: 50, y: 10 }, children, 'vertical')
      expect(result.index).toBe(0)
    })

    it('returns 1 when cursor between first and second', () => {
      const result = findInsertionPoint({ x: 50, y: 35 }, children, 'vertical')
      expect(result.index).toBe(1)
    })

    it('returns 2 when cursor between second and third', () => {
      const result = findInsertionPoint({ x: 50, y: 75 }, children, 'vertical')
      expect(result.index).toBe(2)
    })

    it('returns 3 when cursor below last child', () => {
      const result = findInsertionPoint({ x: 50, y: 100 }, children, 'vertical')
      expect(result.index).toBe(3)
    })
  })

  describe('horizontal layout', () => {
    const children = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 30, height: 100 } },
      { nodeId: 'b', rect: { x: 40, y: 0, width: 30, height: 100 } },
      { nodeId: 'c', rect: { x: 80, y: 0, width: 30, height: 100 } },
    ]

    it('returns 0 when cursor left of first child', () => {
      const result = findInsertionPoint({ x: 10, y: 50 }, children, 'horizontal')
      expect(result.index).toBe(0)
    })

    it('returns 1 when cursor between first and second', () => {
      const result = findInsertionPoint({ x: 35, y: 50 }, children, 'horizontal')
      expect(result.index).toBe(1)
    })

    it('returns 3 when cursor right of last child', () => {
      const result = findInsertionPoint({ x: 120, y: 50 }, children, 'horizontal')
      expect(result.index).toBe(3)
    })
  })

  it('handles empty children array', () => {
    const result = findInsertionPoint({ x: 50, y: 50 }, [], 'vertical')
    expect(result.index).toBe(0)
  })
})

// ==========================================================================
// Indicator Creation
// ==========================================================================

describe('createEdgeIndicator()', () => {
  const rect: Rect = { x: 100, y: 100, width: 50, height: 50 }

  describe('vertical direction', () => {
    it('creates indicator at top for before', () => {
      const indicator = createEdgeIndicator(rect, 'before', 'vertical')

      expect(indicator.y).toBeLessThan(rect.y)
      expect(indicator.width).toBe(rect.width)
      expect(indicator.height).toBe(2) // INDICATOR_THICKNESS
    })

    it('creates indicator at bottom for after', () => {
      const indicator = createEdgeIndicator(rect, 'after', 'vertical')

      expect(indicator.y).toBeGreaterThan(rect.y + rect.height - 10)
      expect(indicator.width).toBe(rect.width)
    })
  })

  describe('horizontal direction', () => {
    it('creates indicator at left for before', () => {
      const indicator = createEdgeIndicator(rect, 'before', 'horizontal')

      expect(indicator.x).toBeLessThan(rect.x)
      expect(indicator.height).toBe(rect.height)
      expect(indicator.width).toBe(2)
    })

    it('creates indicator at right for after', () => {
      const indicator = createEdgeIndicator(rect, 'after', 'horizontal')

      expect(indicator.x).toBeGreaterThan(rect.x + rect.width - 10)
      expect(indicator.height).toBe(rect.height)
    })
  })
})

describe('createInsideIndicator()', () => {
  it('creates inset indicator rect', () => {
    const container: Rect = { x: 0, y: 0, width: 100, height: 100 }

    const indicator = createInsideIndicator(container)

    expect(indicator.x).toBeGreaterThan(container.x)
    expect(indicator.y).toBeGreaterThan(container.y)
    expect(indicator.width).toBeLessThan(container.width)
    expect(indicator.height).toBeLessThan(container.height)
  })
})

describe('createInsertionIndicator()', () => {
  const children = [
    { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 30 } },
    { nodeId: 'b', rect: { x: 0, y: 40, width: 100, height: 30 } },
    { nodeId: 'c', rect: { x: 0, y: 80, width: 100, height: 30 } },
  ]

  it('creates indicator before first child', () => {
    const indicator = createInsertionIndicator(children, 0, 'vertical')

    expect(indicator.y).toBeLessThan(children[0].rect.y)
  })

  it('creates indicator between children', () => {
    const indicator = createInsertionIndicator(children, 1, 'vertical')

    expect(indicator.y).toBeGreaterThan(children[0].rect.y)
    expect(indicator.y).toBeLessThan(children[1].rect.y + children[1].rect.height)
  })

  it('creates indicator after last child', () => {
    const indicator = createInsertionIndicator(children, 3, 'vertical')

    expect(indicator.y).toBeGreaterThan(children[2].rect.y)
  })

  it('handles empty children', () => {
    const indicator = createInsertionIndicator([], 0, 'vertical')

    expect(indicator).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})

// ==========================================================================
// Config Factory
// ==========================================================================

describe('createDropZoneConfig()', () => {
  it('creates config with defaults', () => {
    const config = createDropZoneConfig()

    expect(config.edgeThreshold).toBe(0.25)
    expect(config.minEdgePixels).toBe(8)
    expect(config.preferInside).toBe(true)
  })

  it('merges custom values', () => {
    const config = createDropZoneConfig({ edgeThreshold: 0.3, minEdgePixels: 10 })

    expect(config.edgeThreshold).toBe(0.3)
    expect(config.minEdgePixels).toBe(10)
    expect(config.preferInside).toBe(true)
  })
})
