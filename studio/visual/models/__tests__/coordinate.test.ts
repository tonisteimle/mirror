/**
 * Coordinate Model Tests
 *
 * Tests pure coordinate transformations and utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  // Coordinate transformations
  clientToCanvas,
  canvasToClient,
  elementToCanvas,
  canvasToElement,
  createCoordinateContext,
  // Rect utilities
  getCenter,
  rectToBounds,
  boundsToRect,
  pointInRect,
  rectsIntersect,
  getIntersection,
  getUnion,
  expandRect,
  contractRect,
  // Point utilities
  distance,
  delta,
  addPoints,
  subtractPoints,
  scalePoint,
  roundPoint,
  clampPoint,
  // Grid utilities
  snapToGrid,
  snapPointToGrid,
  snapRectToGrid,
  type Point,
  type Rect,
  type Bounds,
  type CoordinateContext,
} from '../coordinate'

// ==========================================================================
// Coordinate Transformations
// ==========================================================================

describe('Coordinate Transformations', () => {
  describe('clientToCanvas()', () => {
    it('converts client to canvas at 1x scale', () => {
      const context = createCoordinateContext({ x: 100, y: 50 })
      const client: Point = { x: 200, y: 150 }

      const result = clientToCanvas(client, context)

      expect(result).toEqual({ x: 100, y: 100 })
    })

    it('handles scale factor', () => {
      const context = createCoordinateContext({ x: 100, y: 50 }, 2)
      const client: Point = { x: 200, y: 150 }

      const result = clientToCanvas(client, context)

      expect(result).toEqual({ x: 50, y: 50 })
    })

    it('handles scroll offset', () => {
      const context = createCoordinateContext({ x: 100, y: 50 }, 1, { x: 20, y: 30 })
      const client: Point = { x: 200, y: 150 }

      const result = clientToCanvas(client, context)

      expect(result).toEqual({ x: 120, y: 130 })
    })

    it('handles scale and scroll combined', () => {
      const context = createCoordinateContext({ x: 0, y: 0 }, 0.5, { x: 100, y: 100 })
      const client: Point = { x: 50, y: 50 }

      const result = clientToCanvas(client, context)

      expect(result).toEqual({ x: 300, y: 300 }) // (50 + 100) / 0.5 = 300
    })
  })

  describe('canvasToClient()', () => {
    it('converts canvas to client at 1x scale', () => {
      const context = createCoordinateContext({ x: 100, y: 50 })
      const canvas: Point = { x: 100, y: 100 }

      const result = canvasToClient(canvas, context)

      expect(result).toEqual({ x: 200, y: 150 })
    })

    it('handles scale factor', () => {
      const context = createCoordinateContext({ x: 100, y: 50 }, 2)
      const canvas: Point = { x: 50, y: 50 }

      const result = canvasToClient(canvas, context)

      expect(result).toEqual({ x: 200, y: 150 })
    })

    it('is inverse of clientToCanvas', () => {
      const context = createCoordinateContext({ x: 100, y: 50 }, 1.5, { x: 20, y: 30 })
      const original: Point = { x: 250, y: 175 }

      const canvas = clientToCanvas(original, context)
      const backToClient = canvasToClient(canvas, context)

      expect(backToClient.x).toBeCloseTo(original.x)
      expect(backToClient.y).toBeCloseTo(original.y)
    })
  })

  describe('elementToCanvas()', () => {
    it('converts element-relative to canvas coordinates', () => {
      const elementRect: Rect = { x: 100, y: 200, width: 50, height: 30 }
      const point: Point = { x: 10, y: 15 }

      const result = elementToCanvas(point, elementRect)

      expect(result).toEqual({ x: 110, y: 215 })
    })
  })

  describe('canvasToElement()', () => {
    it('converts canvas to element-relative coordinates', () => {
      const elementRect: Rect = { x: 100, y: 200, width: 50, height: 30 }
      const point: Point = { x: 110, y: 215 }

      const result = canvasToElement(point, elementRect)

      expect(result).toEqual({ x: 10, y: 15 })
    })

    it('is inverse of elementToCanvas', () => {
      const elementRect: Rect = { x: 100, y: 200, width: 50, height: 30 }
      const original: Point = { x: 25, y: 10 }

      const canvas = elementToCanvas(original, elementRect)
      const backToElement = canvasToElement(canvas, elementRect)

      expect(backToElement).toEqual(original)
    })
  })
})

// ==========================================================================
// Rect Utilities
// ==========================================================================

describe('Rect Utilities', () => {
  describe('getCenter()', () => {
    it('calculates center of rect', () => {
      const rect: Rect = { x: 100, y: 100, width: 50, height: 30 }

      const center = getCenter(rect)

      expect(center).toEqual({ x: 125, y: 115 })
    })

    it('works with rect at origin', () => {
      const rect: Rect = { x: 0, y: 0, width: 100, height: 100 }

      const center = getCenter(rect)

      expect(center).toEqual({ x: 50, y: 50 })
    })
  })

  describe('rectToBounds() and boundsToRect()', () => {
    it('converts rect to bounds', () => {
      const rect: Rect = { x: 10, y: 20, width: 30, height: 40 }

      const bounds = rectToBounds(rect)

      expect(bounds).toEqual({ left: 10, top: 20, right: 40, bottom: 60 })
    })

    it('converts bounds to rect', () => {
      const bounds: Bounds = { left: 10, top: 20, right: 40, bottom: 60 }

      const rect = boundsToRect(bounds)

      expect(rect).toEqual({ x: 10, y: 20, width: 30, height: 40 })
    })

    it('round-trips correctly', () => {
      const original: Rect = { x: 15, y: 25, width: 100, height: 75 }

      const bounds = rectToBounds(original)
      const back = boundsToRect(bounds)

      expect(back).toEqual(original)
    })
  })

  describe('pointInRect()', () => {
    const rect: Rect = { x: 100, y: 100, width: 50, height: 50 }

    it('returns true for point inside', () => {
      expect(pointInRect({ x: 125, y: 125 }, rect)).toBe(true)
    })

    it('returns true for point on edge', () => {
      expect(pointInRect({ x: 100, y: 100 }, rect)).toBe(true)
      expect(pointInRect({ x: 150, y: 150 }, rect)).toBe(true)
    })

    it('returns false for point outside', () => {
      expect(pointInRect({ x: 99, y: 125 }, rect)).toBe(false)
      expect(pointInRect({ x: 151, y: 125 }, rect)).toBe(false)
      expect(pointInRect({ x: 125, y: 99 }, rect)).toBe(false)
      expect(pointInRect({ x: 125, y: 151 }, rect)).toBe(false)
    })
  })

  describe('rectsIntersect()', () => {
    const rectA: Rect = { x: 0, y: 0, width: 100, height: 100 }

    it('returns true for overlapping rects', () => {
      const rectB: Rect = { x: 50, y: 50, width: 100, height: 100 }
      expect(rectsIntersect(rectA, rectB)).toBe(true)
    })

    it('returns true for touching rects', () => {
      const rectB: Rect = { x: 100, y: 0, width: 50, height: 50 }
      expect(rectsIntersect(rectA, rectB)).toBe(true)
    })

    it('returns true for contained rect', () => {
      const rectB: Rect = { x: 25, y: 25, width: 50, height: 50 }
      expect(rectsIntersect(rectA, rectB)).toBe(true)
    })

    it('returns false for non-overlapping rects', () => {
      const rectB: Rect = { x: 200, y: 200, width: 50, height: 50 }
      expect(rectsIntersect(rectA, rectB)).toBe(false)
    })
  })

  describe('getIntersection()', () => {
    it('returns intersection rect', () => {
      const rectA: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const rectB: Rect = { x: 50, y: 50, width: 100, height: 100 }

      const intersection = getIntersection(rectA, rectB)

      expect(intersection).toEqual({ x: 50, y: 50, width: 50, height: 50 })
    })

    it('returns null for non-overlapping rects', () => {
      const rectA: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const rectB: Rect = { x: 200, y: 200, width: 50, height: 50 }

      const intersection = getIntersection(rectA, rectB)

      expect(intersection).toBeNull()
    })

    it('returns null for touching but not overlapping', () => {
      const rectA: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const rectB: Rect = { x: 100, y: 100, width: 50, height: 50 }

      const intersection = getIntersection(rectA, rectB)

      expect(intersection).toBeNull()
    })
  })

  describe('getUnion()', () => {
    it('returns bounding box of two rects', () => {
      const rectA: Rect = { x: 0, y: 0, width: 50, height: 50 }
      const rectB: Rect = { x: 100, y: 100, width: 50, height: 50 }

      const union = getUnion(rectA, rectB)

      expect(union).toEqual({ x: 0, y: 0, width: 150, height: 150 })
    })

    it('handles overlapping rects', () => {
      const rectA: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const rectB: Rect = { x: 50, y: 50, width: 100, height: 100 }

      const union = getUnion(rectA, rectB)

      expect(union).toEqual({ x: 0, y: 0, width: 150, height: 150 })
    })
  })

  describe('expandRect() and contractRect()', () => {
    const rect: Rect = { x: 100, y: 100, width: 50, height: 50 }

    it('expands rect by padding', () => {
      const expanded = expandRect(rect, 10)

      expect(expanded).toEqual({ x: 90, y: 90, width: 70, height: 70 })
    })

    it('contracts rect by padding', () => {
      const contracted = contractRect(rect, 10)

      expect(contracted).toEqual({ x: 110, y: 110, width: 30, height: 30 })
    })
  })
})

// ==========================================================================
// Point Utilities
// ==========================================================================

describe('Point Utilities', () => {
  describe('distance()', () => {
    it('calculates distance between two points', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
    })

    it('returns 0 for same point', () => {
      expect(distance({ x: 10, y: 20 }, { x: 10, y: 20 })).toBe(0)
    })
  })

  describe('delta()', () => {
    it('calculates delta between two points', () => {
      const result = delta({ x: 10, y: 20 }, { x: 15, y: 25 })

      expect(result).toEqual({ x: 5, y: 5 })
    })

    it('handles negative deltas', () => {
      const result = delta({ x: 20, y: 30 }, { x: 10, y: 15 })

      expect(result).toEqual({ x: -10, y: -15 })
    })
  })

  describe('addPoints()', () => {
    it('adds two points', () => {
      const result = addPoints({ x: 10, y: 20 }, { x: 5, y: 15 })

      expect(result).toEqual({ x: 15, y: 35 })
    })
  })

  describe('subtractPoints()', () => {
    it('subtracts point b from point a', () => {
      const result = subtractPoints({ x: 10, y: 20 }, { x: 5, y: 15 })

      expect(result).toEqual({ x: 5, y: 5 })
    })
  })

  describe('scalePoint()', () => {
    it('scales a point by factor', () => {
      const result = scalePoint({ x: 10, y: 20 }, 2)

      expect(result).toEqual({ x: 20, y: 40 })
    })

    it('handles fractional scaling', () => {
      const result = scalePoint({ x: 10, y: 20 }, 0.5)

      expect(result).toEqual({ x: 5, y: 10 })
    })
  })

  describe('roundPoint()', () => {
    it('rounds point coordinates', () => {
      const result = roundPoint({ x: 10.4, y: 20.6 })

      expect(result).toEqual({ x: 10, y: 21 })
    })
  })

  describe('clampPoint()', () => {
    const bounds: Bounds = { left: 0, top: 0, right: 100, bottom: 100 }

    it('keeps point inside bounds', () => {
      const result = clampPoint({ x: 50, y: 50 }, bounds)

      expect(result).toEqual({ x: 50, y: 50 })
    })

    it('clamps to left edge', () => {
      const result = clampPoint({ x: -10, y: 50 }, bounds)

      expect(result).toEqual({ x: 0, y: 50 })
    })

    it('clamps to right edge', () => {
      const result = clampPoint({ x: 150, y: 50 }, bounds)

      expect(result).toEqual({ x: 100, y: 50 })
    })

    it('clamps to corners', () => {
      const result = clampPoint({ x: -10, y: -20 }, bounds)

      expect(result).toEqual({ x: 0, y: 0 })
    })
  })
})

// ==========================================================================
// Grid Utilities
// ==========================================================================

describe('Grid Utilities', () => {
  describe('snapToGrid()', () => {
    it('snaps value to nearest grid line', () => {
      expect(snapToGrid(13, 8)).toBe(16)
      expect(snapToGrid(11, 8)).toBe(8)
      expect(snapToGrid(12, 8)).toBe(16) // 12 is exactly in middle, rounds up
    })

    it('returns original when grid is 0', () => {
      expect(snapToGrid(13, 0)).toBe(13)
    })

    it('returns original when grid is negative', () => {
      expect(snapToGrid(13, -8)).toBe(13)
    })
  })

  describe('snapPointToGrid()', () => {
    it('snaps point to grid', () => {
      const result = snapPointToGrid({ x: 13, y: 22 }, 8)

      expect(result).toEqual({ x: 16, y: 24 })
    })
  })

  describe('snapRectToGrid()', () => {
    it('snaps rect position but not size', () => {
      const rect: Rect = { x: 13, y: 22, width: 45, height: 33 }

      const result = snapRectToGrid(rect, 8)

      expect(result).toEqual({ x: 16, y: 24, width: 45, height: 33 })
    })
  })
})

// ==========================================================================
// Factory
// ==========================================================================

describe('createCoordinateContext()', () => {
  it('creates context with defaults', () => {
    const context = createCoordinateContext()

    expect(context).toEqual({
      canvasOffset: { x: 0, y: 0 },
      scale: 1,
      scrollOffset: { x: 0, y: 0 },
    })
  })

  it('creates context with custom values', () => {
    const context = createCoordinateContext({ x: 100, y: 50 }, 2, { x: 10, y: 20 })

    expect(context).toEqual({
      canvasOffset: { x: 100, y: 50 },
      scale: 2,
      scrollOffset: { x: 10, y: 20 },
    })
  })
})
