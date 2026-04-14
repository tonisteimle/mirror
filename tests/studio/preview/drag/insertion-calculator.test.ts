/**
 * Tests for InsertionCalculator
 * Pure geometry calculations - no DOM, no side effects
 */

import { describe, it, expect } from 'vitest'
import { InsertionCalculator } from '../../../../studio/preview/drag/insertion-calculator'
import type { ChildInfo, FlexLayout } from '../../../../studio/preview/drag/types'

describe('InsertionCalculator', () => {
  const calculator = new InsertionCalculator()

  // Helper to create DOMRect
  const rect = (x: number, y: number, width: number, height: number): DOMRect => ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  })

  const containerRect = rect(0, 0, 400, 300)

  describe('empty container', () => {
    it('returns index 0 for empty container', () => {
      const result = calculator.calculate({ x: 100, y: 100 }, [], 'flex-column', containerRect)
      expect(result.index).toBe(0)
    })

    it('positions indicator at container origin for vertical layout', () => {
      const result = calculator.calculate({ x: 100, y: 100 }, [], 'flex-column', containerRect)
      expect(result.linePosition).toEqual({ x: 0, y: 0 })
      expect(result.orientation).toBe('horizontal')
    })

    it('positions indicator at container origin for horizontal layout', () => {
      const result = calculator.calculate({ x: 100, y: 100 }, [], 'flex-row', containerRect)
      expect(result.linePosition).toEqual({ x: 0, y: 0 })
      expect(result.orientation).toBe('vertical')
    })
  })

  describe('vertical layout (flex-column)', () => {
    const children: ChildInfo[] = [
      { nodeId: 'a', rect: rect(0, 0, 400, 50) },
      { nodeId: 'b', rect: rect(0, 60, 400, 50) },
      { nodeId: 'c', rect: rect(0, 120, 400, 50) },
    ]
    const layout: FlexLayout = 'flex-column'

    it('inserts before first child when cursor above midpoint', () => {
      const result = calculator.calculate({ x: 200, y: 10 }, children, layout, containerRect)
      expect(result.index).toBe(0)
      expect(result.linePosition.y).toBe(0)
    })

    it('inserts between children when cursor between midpoints', () => {
      const result = calculator.calculate({ x: 200, y: 55 }, children, layout, containerRect)
      expect(result.index).toBe(1)
      expect(result.linePosition.y).toBe(60)
    })

    it('inserts after last child when cursor below last midpoint', () => {
      const result = calculator.calculate({ x: 200, y: 200 }, children, layout, containerRect)
      expect(result.index).toBe(3)
      expect(result.linePosition.y).toBe(170) // last.y + last.height
    })

    it('uses horizontal indicator for vertical layout', () => {
      const result = calculator.calculate({ x: 200, y: 55 }, children, layout, containerRect)
      expect(result.orientation).toBe('horizontal')
      expect(result.lineSize).toBe(400) // container width
    })
  })

  describe('horizontal layout (flex-row)', () => {
    const children: ChildInfo[] = [
      { nodeId: 'a', rect: rect(0, 0, 100, 50) },
      { nodeId: 'b', rect: rect(110, 0, 100, 50) },
      { nodeId: 'c', rect: rect(220, 0, 100, 50) },
    ]
    const layout: FlexLayout = 'flex-row'

    it('inserts before first child when cursor left of midpoint', () => {
      const result = calculator.calculate({ x: 30, y: 25 }, children, layout, containerRect)
      expect(result.index).toBe(0)
      expect(result.linePosition.x).toBe(0)
    })

    it('inserts between children when cursor between midpoints', () => {
      const result = calculator.calculate({ x: 105, y: 25 }, children, layout, containerRect)
      expect(result.index).toBe(1)
      expect(result.linePosition.x).toBe(110)
    })

    it('inserts after last child when cursor right of last midpoint', () => {
      const result = calculator.calculate({ x: 350, y: 25 }, children, layout, containerRect)
      expect(result.index).toBe(3)
      expect(result.linePosition.x).toBe(320) // last.x + last.width
    })

    it('uses vertical indicator for horizontal layout', () => {
      const result = calculator.calculate({ x: 105, y: 25 }, children, layout, containerRect)
      expect(result.orientation).toBe('vertical')
      expect(result.lineSize).toBe(300) // container height
    })
  })

  describe('edge cases', () => {
    it('handles single child', () => {
      const children: ChildInfo[] = [{ nodeId: 'only', rect: rect(0, 0, 400, 100) }]

      // Before midpoint
      const before = calculator.calculate({ x: 200, y: 30 }, children, 'flex-column', containerRect)
      expect(before.index).toBe(0)

      // After midpoint
      const after = calculator.calculate({ x: 200, y: 70 }, children, 'flex-column', containerRect)
      expect(after.index).toBe(1)
    })

    it('handles cursor exactly at midpoint', () => {
      const children: ChildInfo[] = [{ nodeId: 'a', rect: rect(0, 0, 400, 100) }]
      // Exactly at midpoint (y=50), should go after (not < mid)
      const result = calculator.calculate({ x: 200, y: 50 }, children, 'flex-column', containerRect)
      expect(result.index).toBe(1)
    })
  })
})
