/**
 * Distribution Calculator Tests
 * Feature 7: Smart Distribution
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  calculateDistribution,
  detectDistributionDirection,
  type DistributionType,
  type Rect,
} from '../../../studio/preview/distribution'

describe('distribution', () => {
  describe('calculateDistribution', () => {
    describe('horizontal distribution', () => {
      it('distributes 3 elements with equal spacing', () => {
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 0, y: 0, width: 40, height: 40 }],
          ['b', { x: 60, y: 0, width: 40, height: 40 }],
          ['c', { x: 200, y: 0, width: 40, height: 40 }],
        ])

        const result = calculateDistribution(['a', 'b', 'c'], 'horizontal', layoutInfo)

        expect(result.length).toBe(3)
        // First element stays at 0
        expect(result.find(r => r.nodeId === 'a')?.x).toBe(0)
        // Last element stays at 200
        expect(result.find(r => r.nodeId === 'c')?.x).toBe(200)
        // Middle element should be evenly distributed
        // endX = 200 + 40 = 240, startX = 0
        // Total widths = 40 * 3 = 120
        // Available space = 240 - 0 - 120 = 120
        // Gap = 120 / 2 = 60
        // Element b: 0 + 40 (width of a) + 60 (gap) = 100
        expect(result.find(r => r.nodeId === 'b')?.x).toBe(100)
      })

      it('keeps y positions unchanged', () => {
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 0, y: 10, width: 30, height: 30 }],
          ['b', { x: 50, y: 20, width: 30, height: 30 }],
          ['c', { x: 100, y: 15, width: 30, height: 30 }],
        ])

        const result = calculateDistribution(['a', 'b', 'c'], 'horizontal', layoutInfo)

        expect(result.find(r => r.nodeId === 'a')?.y).toBe(10)
        expect(result.find(r => r.nodeId === 'b')?.y).toBe(20)
        expect(result.find(r => r.nodeId === 'c')?.y).toBe(15)
      })

      it('handles 2 elements (no spacing needed)', () => {
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 0, y: 0, width: 50, height: 50 }],
          ['b', { x: 100, y: 0, width: 50, height: 50 }],
        ])

        const result = calculateDistribution(['a', 'b'], 'horizontal', layoutInfo)

        expect(result.length).toBe(2)
        expect(result.find(r => r.nodeId === 'a')?.x).toBe(0)
        expect(result.find(r => r.nodeId === 'b')?.x).toBe(100)
      })
    })

    describe('vertical distribution', () => {
      it('distributes 3 elements with equal spacing', () => {
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 0, y: 0, width: 40, height: 40 }],
          ['b', { x: 0, y: 60, width: 40, height: 40 }],
          ['c', { x: 0, y: 200, width: 40, height: 40 }],
        ])

        const result = calculateDistribution(['a', 'b', 'c'], 'vertical', layoutInfo)

        expect(result.length).toBe(3)
        // First element stays at 0
        expect(result.find(r => r.nodeId === 'a')?.y).toBe(0)
        // Last element stays at 200
        expect(result.find(r => r.nodeId === 'c')?.y).toBe(200)
        // Middle element should be evenly distributed
        // endY = 200 + 40 = 240, startY = 0
        // Total heights = 40 * 3 = 120
        // Available space = 240 - 0 - 120 = 120
        // Gap = 120 / 2 = 60
        // Element b: 0 + 40 (height of a) + 60 (gap) = 100
        expect(result.find(r => r.nodeId === 'b')?.y).toBe(100)
      })

      it('keeps x positions unchanged', () => {
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 10, y: 0, width: 30, height: 30 }],
          ['b', { x: 20, y: 50, width: 30, height: 30 }],
          ['c', { x: 15, y: 100, width: 30, height: 30 }],
        ])

        const result = calculateDistribution(['a', 'b', 'c'], 'vertical', layoutInfo)

        expect(result.find(r => r.nodeId === 'a')?.x).toBe(10)
        expect(result.find(r => r.nodeId === 'b')?.x).toBe(20)
        expect(result.find(r => r.nodeId === 'c')?.x).toBe(15)
      })
    })

    describe('space-between', () => {
      it('uses dominant axis for distribution', () => {
        // Elements spread more horizontally
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 0, y: 0, width: 40, height: 40 }],
          ['b', { x: 100, y: 10, width: 40, height: 40 }],
          ['c', { x: 200, y: 5, width: 40, height: 40 }],
        ])

        const result = calculateDistribution(['a', 'b', 'c'], 'space-between', layoutInfo)

        // Should distribute horizontally since x range > y range
        expect(result.length).toBe(3)
        expect(result.find(r => r.nodeId === 'a')?.x).toBe(0)
        expect(result.find(r => r.nodeId === 'c')?.x).toBe(200)
      })
    })

    describe('edge cases', () => {
      it('returns empty for less than 2 nodes', () => {
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 0, y: 0, width: 40, height: 40 }],
        ])

        const result = calculateDistribution(['a'], 'horizontal', layoutInfo)
        expect(result.length).toBe(0)
      })

      it('returns empty for missing nodes in layoutInfo', () => {
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 0, y: 0, width: 40, height: 40 }],
        ])

        const result = calculateDistribution(['a', 'b', 'c'], 'horizontal', layoutInfo)
        expect(result.length).toBe(0)
      })

      it('handles elements with different sizes', () => {
        const layoutInfo = new Map<string, Rect>([
          ['a', { x: 0, y: 0, width: 20, height: 40 }],
          ['b', { x: 50, y: 0, width: 60, height: 40 }],
          ['c', { x: 200, y: 0, width: 40, height: 40 }],
        ])

        const result = calculateDistribution(['a', 'b', 'c'], 'horizontal', layoutInfo)

        expect(result.length).toBe(3)
        // Total width: 200 + 40 - 0 = 240
        // Sum of widths: 20 + 60 + 40 = 120
        // Available space: 240 - 120 = 120
        // Gap: 120 / 2 = 60
        expect(result.find(r => r.nodeId === 'a')?.x).toBe(0)
        expect(result.find(r => r.nodeId === 'b')?.x).toBe(80) // 0 + 20 (width a) + 60 (gap)
        expect(result.find(r => r.nodeId === 'c')?.x).toBe(200) // 80 + 60 (width b) + 60 (gap)
      })
    })
  })

  describe('detectDistributionDirection', () => {
    it('returns horizontal when elements are in a row', () => {
      const layoutInfo = new Map<string, Rect>([
        ['a', { x: 0, y: 50, width: 40, height: 40 }],
        ['b', { x: 60, y: 50, width: 40, height: 40 }],
        ['c', { x: 120, y: 50, width: 40, height: 40 }],
      ])

      const direction = detectDistributionDirection(['a', 'b', 'c'], layoutInfo)
      expect(direction).toBe('horizontal')
    })

    it('returns vertical when elements are in a column', () => {
      const layoutInfo = new Map<string, Rect>([
        ['a', { x: 50, y: 0, width: 40, height: 40 }],
        ['b', { x: 50, y: 60, width: 40, height: 40 }],
        ['c', { x: 50, y: 120, width: 40, height: 40 }],
      ])

      const direction = detectDistributionDirection(['a', 'b', 'c'], layoutInfo)
      expect(direction).toBe('vertical')
    })

    it('returns null for less than 2 nodes', () => {
      const layoutInfo = new Map<string, Rect>([
        ['a', { x: 0, y: 0, width: 40, height: 40 }],
      ])

      const direction = detectDistributionDirection(['a'], layoutInfo)
      expect(direction).toBeNull()
    })

    it('returns horizontal when x variance is smaller', () => {
      // Elements roughly aligned horizontally with more x spread
      const layoutInfo = new Map<string, Rect>([
        ['a', { x: 0, y: 50, width: 40, height: 40 }],
        ['b', { x: 100, y: 55, width: 40, height: 40 }],
        ['c', { x: 200, y: 48, width: 40, height: 40 }],
      ])

      const direction = detectDistributionDirection(['a', 'b', 'c'], layoutInfo)
      expect(direction).toBe('horizontal')
    })

    it('returns vertical when y variance is smaller', () => {
      // Elements roughly aligned vertically with more y spread
      const layoutInfo = new Map<string, Rect>([
        ['a', { x: 50, y: 0, width: 40, height: 40 }],
        ['b', { x: 55, y: 100, width: 40, height: 40 }],
        ['c', { x: 48, y: 200, width: 40, height: 40 }],
      ])

      const direction = detectDistributionDirection(['a', 'b', 'c'], layoutInfo)
      expect(direction).toBe('vertical')
    })
  })
})
