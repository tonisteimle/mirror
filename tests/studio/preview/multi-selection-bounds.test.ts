/**
 * Multi-Selection Bounds Tests
 * Feature 4: Multi-Element Manipulation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  calculateBoundingBox,
  calculateRelativePositions,
  calculateMovedPositions,
  calculateResizedPositions,
  type Rect,
  type BoundingBox,
} from '../../../studio/preview/multi-selection-bounds'

describe('multi-selection-bounds', () => {
  describe('calculateBoundingBox', () => {
    it('calculates bounding box for 2 elements', () => {
      const getRect = (nodeId: string): Rect | null => {
        const rects: Record<string, Rect> = {
          'a': { x: 10, y: 20, width: 50, height: 30 },
          'b': { x: 100, y: 80, width: 40, height: 60 },
        }
        return rects[nodeId] || null
      }

      const result = calculateBoundingBox(['a', 'b'], getRect)

      expect(result).not.toBeNull()
      expect(result!.x).toBe(10)
      expect(result!.y).toBe(20)
      expect(result!.width).toBe(130) // 100 + 40 - 10
      expect(result!.height).toBe(120) // 80 + 60 - 20
      expect(result!.nodeIds).toEqual(['a', 'b'])
    })

    it('calculates bounding box for 3 elements', () => {
      const getRect = (nodeId: string): Rect | null => {
        const rects: Record<string, Rect> = {
          'a': { x: 0, y: 0, width: 50, height: 50 },
          'b': { x: 100, y: 50, width: 50, height: 50 },
          'c': { x: 50, y: 100, width: 50, height: 50 },
        }
        return rects[nodeId] || null
      }

      const result = calculateBoundingBox(['a', 'b', 'c'], getRect)

      expect(result).not.toBeNull()
      expect(result!.x).toBe(0)
      expect(result!.y).toBe(0)
      expect(result!.width).toBe(150) // 100 + 50
      expect(result!.height).toBe(150) // 100 + 50
    })

    it('returns null for empty nodeIds', () => {
      const getRect = () => null
      const result = calculateBoundingBox([], getRect)
      expect(result).toBeNull()
    })

    it('returns null when no rects are found', () => {
      const getRect = () => null
      const result = calculateBoundingBox(['a', 'b'], getRect)
      expect(result).toBeNull()
    })

    it('handles single element', () => {
      const getRect = (nodeId: string): Rect | null => {
        if (nodeId === 'a') return { x: 50, y: 50, width: 100, height: 80 }
        return null
      }

      const result = calculateBoundingBox(['a'], getRect)

      expect(result).not.toBeNull()
      expect(result!.x).toBe(50)
      expect(result!.y).toBe(50)
      expect(result!.width).toBe(100)
      expect(result!.height).toBe(80)
    })

    it('stores individual rects in result', () => {
      const getRect = (nodeId: string): Rect | null => {
        const rects: Record<string, Rect> = {
          'a': { x: 10, y: 20, width: 50, height: 30 },
          'b': { x: 100, y: 80, width: 40, height: 60 },
        }
        return rects[nodeId] || null
      }

      const result = calculateBoundingBox(['a', 'b'], getRect)

      expect(result!.rects.get('a')).toEqual({ x: 10, y: 20, width: 50, height: 30 })
      expect(result!.rects.get('b')).toEqual({ x: 100, y: 80, width: 40, height: 60 })
    })
  })

  describe('calculateRelativePositions', () => {
    it('calculates relative positions within bounding box', () => {
      const boundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        nodeIds: ['a', 'b'],
        rects: new Map([
          ['a', { x: 0, y: 0, width: 50, height: 50 }],
          ['b', { x: 100, y: 50, width: 100, height: 50 }],
        ]),
      }

      const result = calculateRelativePositions(boundingBox)

      expect(result.get('a')).toEqual({
        relX: 0,
        relY: 0,
        relWidth: 0.25, // 50/200
        relHeight: 0.5, // 50/100
      })
      expect(result.get('b')).toEqual({
        relX: 0.5, // 100/200
        relY: 0.5, // 50/100
        relWidth: 0.5, // 100/200
        relHeight: 0.5, // 50/100
      })
    })

    it('handles zero-size bounding box', () => {
      const boundingBox: BoundingBox = {
        x: 50,
        y: 50,
        width: 0,
        height: 0,
        nodeIds: ['a'],
        rects: new Map([
          ['a', { x: 50, y: 50, width: 0, height: 0 }],
        ]),
      }

      const result = calculateRelativePositions(boundingBox)

      expect(result.get('a')).toEqual({
        relX: 0,
        relY: 0,
        relWidth: 1,
        relHeight: 1,
      })
    })
  })

  describe('calculateMovedPositions', () => {
    it('calculates new positions after moving', () => {
      const boundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        nodeIds: ['a', 'b'],
        rects: new Map([
          ['a', { x: 0, y: 0, width: 50, height: 50 }],
          ['b', { x: 100, y: 50, width: 100, height: 50 }],
        ]),
      }

      const result = calculateMovedPositions(boundingBox, 20, 30)

      expect(result.get('a')).toEqual({ x: 20, y: 30 })
      expect(result.get('b')).toEqual({ x: 120, y: 80 })
    })

    it('handles negative delta', () => {
      const boundingBox: BoundingBox = {
        x: 100,
        y: 100,
        width: 50,
        height: 50,
        nodeIds: ['a'],
        rects: new Map([
          ['a', { x: 100, y: 100, width: 50, height: 50 }],
        ]),
      }

      const result = calculateMovedPositions(boundingBox, -50, -25)

      expect(result.get('a')).toEqual({ x: 50, y: 75 })
    })

    it('rounds positions to integers', () => {
      const boundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        nodeIds: ['a'],
        rects: new Map([
          ['a', { x: 10.5, y: 20.7, width: 50, height: 50 }],
        ]),
      }

      const result = calculateMovedPositions(boundingBox, 5.3, 3.8)

      expect(result.get('a')).toEqual({ x: 16, y: 25 })
    })
  })

  describe('calculateResizedPositions', () => {
    it('scales elements proportionally with top-left anchor', () => {
      const boundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        nodeIds: ['a', 'b'],
        rects: new Map([
          ['a', { x: 0, y: 0, width: 50, height: 50 }],
          ['b', { x: 50, y: 50, width: 50, height: 50 }],
        ]),
      }

      const result = calculateResizedPositions(boundingBox, 200, 200, 'top-left')

      expect(result.get('a')).toEqual({ x: 0, y: 0, width: 100, height: 100 })
      expect(result.get('b')).toEqual({ x: 100, y: 100, width: 100, height: 100 })
    })

    it('scales elements with center anchor', () => {
      const boundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        nodeIds: ['a'],
        rects: new Map([
          ['a', { x: 25, y: 25, width: 50, height: 50 }],
        ]),
      }

      // Double the size, centered
      const result = calculateResizedPositions(boundingBox, 200, 200, 'center')

      // Original center: 50, 50
      // New bounding box offset: (100 - 200) / 2 = -50
      // New element position: 0 + -50 + (25/100 * 200) = -50 + 50 = 0
      expect(result.get('a')?.x).toBe(0)
      expect(result.get('a')?.y).toBe(0)
      expect(result.get('a')?.width).toBe(100)
      expect(result.get('a')?.height).toBe(100)
    })

    it('scales elements with bottom-right anchor', () => {
      const boundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        nodeIds: ['a'],
        rects: new Map([
          ['a', { x: 0, y: 0, width: 50, height: 50 }],
        ]),
      }

      // Shrink to half size, anchored at bottom-right
      const result = calculateResizedPositions(boundingBox, 50, 50, 'bottom-right')

      // Anchor offset: (100 - 50) = 50
      expect(result.get('a')).toEqual({ x: 50, y: 50, width: 25, height: 25 })
    })

    it('handles non-uniform scaling', () => {
      const boundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        nodeIds: ['a'],
        rects: new Map([
          ['a', { x: 0, y: 0, width: 100, height: 100 }],
        ]),
      }

      const result = calculateResizedPositions(boundingBox, 200, 50, 'top-left')

      expect(result.get('a')).toEqual({ x: 0, y: 0, width: 200, height: 50 })
    })

    it('rounds to integers', () => {
      const boundingBox: BoundingBox = {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        nodeIds: ['a'],
        rects: new Map([
          ['a', { x: 33, y: 33, width: 34, height: 34 }],
        ]),
      }

      const result = calculateResizedPositions(boundingBox, 150, 150, 'top-left')

      // All values should be integers
      expect(Number.isInteger(result.get('a')!.x)).toBe(true)
      expect(Number.isInteger(result.get('a')!.y)).toBe(true)
      expect(Number.isInteger(result.get('a')!.width)).toBe(true)
      expect(Number.isInteger(result.get('a')!.height)).toBe(true)
    })
  })
})
