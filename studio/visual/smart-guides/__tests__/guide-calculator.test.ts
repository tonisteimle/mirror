/**
 * GuideCalculator Tests
 *
 * Tests for the smart guides alignment calculation:
 * - Edge detection (left, right, top, bottom, center)
 * - Snap threshold behavior
 * - Multiple alignment scenarios
 * - Container vs sibling alignment
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GuideCalculator, createGuideCalculator } from '../guide-calculator'
import { smartGuidesSettings } from '../../../core/settings'

// Mock DOMRect
class MockDOMRect implements DOMRect {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.left = x
    this.top = y
    this.right = x + width
    this.bottom = y + height
  }

  toJSON() {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }
}

describe('GuideCalculator', () => {
  let calculator: GuideCalculator
  let containerRect: DOMRect

  beforeEach(() => {
    // Reset and enable smart guides
    smartGuidesSettings.reset()
    smartGuidesSettings.set({ enabled: true, threshold: 4 })

    calculator = new GuideCalculator(4)
    // Container at (100, 100) with size 400x300
    containerRect = new MockDOMRect(100, 100, 400, 300)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('creates calculator with default threshold', () => {
      const calc = createGuideCalculator()
      expect(calc).toBeInstanceOf(GuideCalculator)
    })

    it('creates calculator with custom threshold', () => {
      const calc = createGuideCalculator(8)
      expect(calc).toBeInstanceOf(GuideCalculator)
    })
  })

  describe('container edge alignment', () => {
    it('snaps to container left edge', () => {
      // Moving element slightly off left edge
      const movingRect = new MockDOMRect(102, 150, 50, 30) // 2px from left

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedX).toBe(true)
      expect(result.x).toBe(0) // Snapped to left edge
      expect(result.guides.length).toBeGreaterThan(0)
      expect(result.guides[0].axis).toBe('vertical')
    })

    it('snaps to container right edge', () => {
      // Moving element slightly off right edge (container right = 500)
      const movingRect = new MockDOMRect(448, 150, 50, 30) // right edge at 498

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedX).toBe(true)
      expect(result.x).toBe(350) // 400 - 50 = 350 (container width - element width)
    })

    it('snaps to container top edge', () => {
      const movingRect = new MockDOMRect(200, 102, 50, 30) // 2px from top

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedY).toBe(true)
      expect(result.y).toBe(0) // Snapped to top
    })

    it('snaps to container bottom edge', () => {
      const movingRect = new MockDOMRect(200, 368, 50, 30) // bottom at 398, container bottom at 400

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedY).toBe(true)
      expect(result.y).toBe(270) // 300 - 30 = 270 (container height - element height)
    })

    it('snaps to container horizontal center', () => {
      // Container center X is at 200 (relative)
      // Element center should be at 200, so left = 200 - 25 = 175
      const movingRect = new MockDOMRect(273, 150, 50, 30) // center at 298, container center at 300

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedX).toBe(true)
      expect(result.x).toBe(175) // 200 - 25 = center
    })

    it('snaps to container vertical center', () => {
      // Container center Y is at 150 (relative)
      const movingRect = new MockDOMRect(200, 233, 50, 30) // center at 248, container center at 250

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedY).toBe(true)
      expect(result.y).toBe(135) // 150 - 15 = center
    })
  })

  describe('sibling alignment', () => {
    it('snaps to sibling left edge', () => {
      const siblings = new Map<string, DOMRect>()
      siblings.set('sibling-1', new MockDOMRect(150, 200, 80, 40))

      // Moving element near sibling's left edge
      const movingRect = new MockDOMRect(152, 250, 50, 30) // left at 52 (relative)

      const result = calculator.calculate(movingRect, siblings, containerRect)

      expect(result.snappedX).toBe(true)
      expect(result.x).toBe(50) // Aligned with sibling left
    })

    it('snaps to sibling right edge', () => {
      const siblings = new Map<string, DOMRect>()
      // Sibling at absolute (150, 200), right edge at 230 absolute = 130 relative
      siblings.set('sibling-1', new MockDOMRect(150, 200, 80, 40))

      // Moving element with right edge near sibling's right edge
      // Right edge at 232 absolute = 132 relative (2px from sibling's 130)
      const movingRect = new MockDOMRect(182, 250, 50, 30)

      const result = calculator.calculate(movingRect, siblings, containerRect)

      // Should snap right edge to sibling right (130)
      // So left edge should be at 130 - 50 = 80
      expect(result.snappedX).toBe(true)
      expect(result.x).toBe(80)
    })

    it('snaps to sibling top edge', () => {
      const siblings = new Map<string, DOMRect>()
      siblings.set('sibling-1', new MockDOMRect(150, 200, 80, 40))

      // Moving element near sibling's top edge
      const movingRect = new MockDOMRect(250, 202, 50, 30) // top at 102

      const result = calculator.calculate(movingRect, siblings, containerRect)

      expect(result.snappedY).toBe(true)
      expect(result.y).toBe(100) // Aligned with sibling top
    })

    it('aligns with multiple siblings', () => {
      const siblings = new Map<string, DOMRect>()
      siblings.set('sibling-1', new MockDOMRect(150, 200, 80, 40))
      siblings.set('sibling-2', new MockDOMRect(150, 300, 80, 40))

      // Both siblings have same left edge
      const movingRect = new MockDOMRect(152, 350, 50, 30)

      const result = calculator.calculate(movingRect, siblings, containerRect)

      expect(result.snappedX).toBe(true)
      expect(result.x).toBe(50) // Aligned with both siblings
    })
  })

  describe('threshold behavior', () => {
    it('does not snap when outside threshold', () => {
      // Moving element far from any edge
      const movingRect = new MockDOMRect(200, 200, 50, 30)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedX).toBe(false)
      expect(result.snappedY).toBe(false)
      expect(result.guides).toHaveLength(0)
    })

    it('respects custom threshold', () => {
      // Set both calculator and settings threshold to 10
      calculator.setThreshold(10)
      smartGuidesSettings.set({ enabled: true, threshold: 10 })

      // Moving element 8px from left edge (within 10px threshold)
      // Absolute: 108, relative to container: 8
      const movingRect = new MockDOMRect(108, 200, 50, 30)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedX).toBe(true)
    })

    it('uses threshold from settings', () => {
      smartGuidesSettings.set({ enabled: true, threshold: 10 })

      const movingRect = new MockDOMRect(108, 200, 50, 30)
      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedX).toBe(true)
    })
  })

  describe('disabled state', () => {
    it('returns unsnapped position when disabled', () => {
      smartGuidesSettings.set({ enabled: false })

      const movingRect = new MockDOMRect(102, 150, 50, 30)
      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedX).toBe(false)
      expect(result.snappedY).toBe(false)
      expect(result.guides).toHaveLength(0)
    })
  })

  describe('guide generation', () => {
    it('creates vertical guide for X alignment', () => {
      const movingRect = new MockDOMRect(102, 200, 50, 30)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      const verticalGuide = result.guides.find(g => g.axis === 'vertical')
      expect(verticalGuide).toBeDefined()
      expect(verticalGuide?.position).toBe(0) // Container left edge
    })

    it('creates horizontal guide for Y alignment', () => {
      const movingRect = new MockDOMRect(200, 102, 50, 30)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      const horizontalGuide = result.guides.find(g => g.axis === 'horizontal')
      expect(horizontalGuide).toBeDefined()
      expect(horizontalGuide?.position).toBe(0) // Container top edge
    })

    it('includes aligned edge info in guide', () => {
      const movingRect = new MockDOMRect(102, 200, 50, 30)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.guides[0].alignedEdges).toBeDefined()
      expect(result.guides[0].alignedEdges.length).toBeGreaterThan(0)
      expect(result.guides[0].alignedEdges[0].type).toBe('left')
      expect(result.guides[0].alignedEdges[0].elementId).toBe('container')
    })
  })

  describe('edge cases', () => {
    it('handles empty siblings map', () => {
      const movingRect = new MockDOMRect(200, 200, 50, 30)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result).toBeDefined()
      expect(result.x).toBeDefined()
      expect(result.y).toBeDefined()
    })

    it('handles moving element at container origin', () => {
      const movingRect = new MockDOMRect(100, 100, 50, 30)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result.snappedX).toBe(true)
      expect(result.snappedY).toBe(true)
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('handles very small moving element', () => {
      const movingRect = new MockDOMRect(102, 102, 1, 1)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result).toBeDefined()
    })

    it('handles very large moving element', () => {
      const movingRect = new MockDOMRect(102, 102, 398, 298)

      const result = calculator.calculate(movingRect, new Map(), containerRect)

      expect(result).toBeDefined()
    })
  })
})
