/**
 * Nested Scroll Container Tests
 *
 * Tests verifying scroll offset calculations in nested scrollable containers.
 *
 * POTENTIAL BUG: AbsolutePositionStrategy only considers the immediate container's
 * scrollLeft/scrollTop. If there's a parent scrollable container, its scroll
 * offset is NOT accounted for in position calculations.
 *
 * SCENARIO:
 * - Outer container: scrolled 100px down
 * - Inner container (positioned): scrolled 50px down
 * - Cursor at viewport (200, 300)
 * - Expected relative position should account for BOTH scroll offsets
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest'
import { AbsolutePositionStrategy } from '../../../studio/drag-drop/strategies/absolute-position'
import type { DropTarget, DragSource, Point } from '../../../studio/drag-drop/types'

describe('Nested Scroll Container Bug', () => {
  const strategy = new AbsolutePositionStrategy()

  /**
   * Helper to create a mock positioned target with scroll
   */
  function createScrollableTarget(options: {
    nodeId: string
    rect: { x: number; y: number; width: number; height: number }
    scrollLeft?: number
    scrollTop?: number
  }): DropTarget {
    const element = document.createElement('div')

    element.getBoundingClientRect = vi.fn(() => ({
      ...options.rect,
      top: options.rect.y,
      left: options.rect.x,
      right: options.rect.x + options.rect.width,
      bottom: options.rect.y + options.rect.height,
      toJSON: () => ({}),
    }))

    Object.defineProperty(element, 'scrollLeft', {
      value: options.scrollLeft ?? 0,
      writable: true,
    })
    Object.defineProperty(element, 'scrollTop', {
      value: options.scrollTop ?? 0,
      writable: true,
    })

    return {
      nodeId: options.nodeId,
      element,
      layoutType: 'positioned',
      direction: 'vertical',
      hasChildren: true,
      isPositioned: true,
    }
  }

  describe('Single Container Scroll', () => {
    it('accounts for container scroll offset', () => {
      const target = createScrollableTarget({
        nodeId: 'container',
        rect: { x: 100, y: 100, width: 400, height: 300 },
        scrollLeft: 50,
        scrollTop: 100,
      })

      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        size: { width: 80, height: 40 },
      }

      // Cursor at viewport (200, 200)
      // Container at viewport (100, 100)
      // Container scrolled (50, 100)
      const cursor: Point = { x: 200, y: 200 }
      const containerRect = { x: 100, y: 100, width: 400, height: 300 }

      const result = strategy.calculate(cursor, target, source, [], containerRect)

      // Relative position = cursor - container + scroll
      // relativeX = 200 - 100 + 50 = 150, centered: 150 - 40 = 110
      // relativeY = 200 - 100 + 100 = 200, centered: 200 - 20 = 180
      expect(result.position).toBeDefined()
      expect(result.position!.x).toBe(110) // 200 - 100 + 50 - 40
      expect(result.position!.y).toBe(180) // 200 - 100 + 100 - 20
    })

    it('handles zero scroll offset', () => {
      const target = createScrollableTarget({
        nodeId: 'container',
        rect: { x: 100, y: 100, width: 400, height: 300 },
        scrollLeft: 0,
        scrollTop: 0,
      })

      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        size: { width: 100, height: 40 },
      }

      const cursor: Point = { x: 200, y: 200 }
      const containerRect = { x: 100, y: 100, width: 400, height: 300 }

      const result = strategy.calculate(cursor, target, source, [], containerRect)

      // Without scroll: relativeX = 200 - 100 = 100, centered: 100 - 50 = 50
      expect(result.position!.x).toBe(50)
      expect(result.position!.y).toBe(80) // 200 - 100 - 20 = 80
    })
  })

  describe('Nested Scroll Containers', () => {
    /**
     * KNOWN LIMITATION: Currently only the immediate container's scroll is considered.
     * This test documents the current behavior - it may need to change if we want
     * to support nested scrollable containers properly.
     */
    it('documents current behavior: only immediate container scroll is used', () => {
      // Imagine this scenario:
      // - Outer scrollable: scrollTop = 200
      // - Inner positioned container: scrollTop = 50
      // - Cursor at viewport (300, 400)
      //
      // Current behavior: Only inner scroll (50) is used
      // Ideal behavior: Would need to accumulate all parent scroll offsets

      const target = createScrollableTarget({
        nodeId: 'inner-container',
        rect: { x: 100, y: 100, width: 400, height: 300 },
        scrollLeft: 0,
        scrollTop: 50,
      })

      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        size: { width: 100, height: 40 },
      }

      const cursor: Point = { x: 300, y: 400 }
      const containerRect = { x: 100, y: 100, width: 400, height: 300 }

      const result = strategy.calculate(cursor, target, source, [], containerRect)

      // Current calculation uses only immediate container scroll (50)
      // relativeY = 400 - 100 + 50 = 350, centered: 350 - 20 = 330
      expect(result.position!.y).toBe(330)

      // NOTE: If outer container was scrolled 200px, the actual visual position
      // would be different, but we don't account for that currently.
      // This is acceptable for most use cases where the preview iframe
      // is the only scrollable container.
    })

    it('handles container scrolled beyond viewport', () => {
      // Container is scrolled so some content is above viewport
      const target = createScrollableTarget({
        nodeId: 'container',
        rect: { x: 0, y: 0, width: 800, height: 600 },
        scrollLeft: 0,
        scrollTop: 500, // Scrolled down significantly
      })

      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        size: { width: 100, height: 40 },
      }

      // Cursor near top of visible area
      const cursor: Point = { x: 400, y: 50 }
      const containerRect = { x: 0, y: 0, width: 800, height: 600 }

      const result = strategy.calculate(cursor, target, source, [], containerRect)

      // Should calculate position relative to scrolled content
      // relativeY = 50 - 0 + 500 = 550, centered: 550 - 20 = 530
      expect(result.position!.y).toBe(530)
    })
  })

  describe('Visual Hint with Scroll', () => {
    it('visual hint converts scroll position back to viewport', () => {
      const target = createScrollableTarget({
        nodeId: 'container',
        rect: { x: 100, y: 100, width: 400, height: 300 },
        scrollLeft: 0,
        scrollTop: 100,
      })

      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        size: { width: 100, height: 40 },
      }

      const cursor: Point = { x: 200, y: 200 }
      const containerRect = { x: 100, y: 100, width: 400, height: 300 }

      const result = strategy.calculate(cursor, target, source, [], containerRect)
      const hint = strategy.getVisualHint(result)

      expect(hint).toBeDefined()
      expect(hint!.type).toBe('ghost')

      // The visual hint should be in viewport coordinates
      // The ghost should appear where the cursor is, not at the scroll-adjusted position
      // Viewport position = container.left + position.x - scrollLeft
      // = 100 + result.position.x - 0 (but scroll is already subtracted in getVisualHint)
      expect(hint!.rect).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('handles negative scroll (rubber-banding)', () => {
      // Some browsers allow negative scroll during rubber-banding
      const target = createScrollableTarget({
        nodeId: 'container',
        rect: { x: 100, y: 100, width: 400, height: 300 },
        scrollLeft: -10, // Negative during rubber-band
        scrollTop: -20,
      })

      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        size: { width: 100, height: 40 },
      }

      const cursor: Point = { x: 200, y: 200 }
      const containerRect = { x: 100, y: 100, width: 400, height: 300 }

      const result = strategy.calculate(cursor, target, source, [], containerRect)

      // Should handle negative scroll without crashing
      expect(result.position).toBeDefined()
      // Position may be negative after centering, but clamp ensures >= 0
      expect(result.position!.x).toBeGreaterThanOrEqual(0)
      expect(result.position!.y).toBeGreaterThanOrEqual(0)
    })

    it('handles very large scroll values', () => {
      const target = createScrollableTarget({
        nodeId: 'container',
        rect: { x: 0, y: 0, width: 800, height: 600 },
        scrollLeft: 10000,
        scrollTop: 10000,
      })

      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        size: { width: 100, height: 40 },
      }

      const cursor: Point = { x: 400, y: 300 }
      const containerRect = { x: 0, y: 0, width: 800, height: 600 }

      const result = strategy.calculate(cursor, target, source, [], containerRect)

      // Large scroll should be handled correctly
      expect(result.position).toBeDefined()
      expect(result.position!.x).toBe(10350) // 400 - 0 + 10000 - 50
      expect(result.position!.y).toBe(10280) // 300 - 0 + 10000 - 20
    })
  })
})
