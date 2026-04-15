/**
 * Nested Container Tests
 *
 * Tests for edge cases involving nested scrollable containers,
 * position: fixed elements, and mixed layout types.
 *
 * These scenarios were identified as test gaps in the drag-drop system.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AbsolutePositionStrategy } from '../../../studio/drag-drop/strategies/absolute-position'
import { FlexWithChildrenStrategy } from '../../../studio/drag-drop/strategies/flex-with-children'
import { SimpleInsideStrategy } from '../../../studio/drag-drop/strategies/simple-inside'
import {
  createMockDropTarget,
  createMockFlexTarget,
  createMockPaletteSource,
  createMockElement,
  createRect,
} from '../../utils/mocks/drag-drop-mocks'
import type { DropTarget, Point, Rect } from '../../../studio/drag-drop/types'
import type { ChildRect } from '../../../studio/drag-drop/strategies/types'

// ============================================
// Nested Scrollable Container Tests
// ============================================

describe('Nested Scrollable Containers', () => {
  let absoluteStrategy: AbsolutePositionStrategy

  beforeEach(() => {
    absoluteStrategy = new AbsolutePositionStrategy()
  })

  describe('Scroll compensation with nested containers', () => {
    /**
     * Scenario: Outer container scrolled, inner container also scrolled
     *
     * +------ Outer (scrolled 100, 50) ------+
     * |                                       |
     * |  +-- Inner (scrolled 30, 20) --+     |
     * |  |                             |     |
     * |  |     Drop Target             |     |
     * |  |                             |     |
     * |  +-----------------------------+     |
     * +---------------------------------------+
     *
     * The key insight: getBoundingClientRect() already accounts for all parent scrolling,
     * so the visual position is correct. But for code generation, we only need to add
     * the direct container's scroll, not accumulated scroll.
     */
    it('handles directly scrolled container (single level)', () => {
      // Container at viewport (100, 100), scrolled by (50, 30)
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 50, top: 30 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 200, y: 180 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      // Position relative to container: (200 - 100) + 50 = 150 for x
      // Centered: 150 - 50 = 100
      // For y: (180 - 100) + 30 = 110, centered: 110 - 20 = 90
      expect(result.position!.x).toBe(100)
      expect(result.position!.y).toBe(90)
    })

    it('visual hint shows correct viewport position despite scroll', () => {
      // Container scrolled
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 50, top: 30 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 200, y: 180 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = absoluteStrategy.calculate(cursor, target, source)
      const hint = absoluteStrategy.getVisualHint(result)

      // Visual hint should be at cursor position (centered by ghost)
      // The scroll compensation should be reversed for visual display
      expect(hint).not.toBeNull()
      expect(hint!.type).toBe('ghost')
      // Visual x: containerLeft + posX - scrollLeft = 100 + 100 - 50 = 150
      // Visual y: containerTop + posY - scrollTop = 100 + 90 - 30 = 160
      expect(hint!.rect.x).toBe(150)
      expect(hint!.rect.y).toBe(160)
    })

    it('handles container with large scroll offset (scrolled past viewport)', () => {
      // Container with content scrolled significantly
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 500, top: 400 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 200, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      // Large scroll creates large code positions
      // x: (200 - 100 + 500) - 50 = 550
      // y: (200 - 100 + 400) - 20 = 480
      expect(result.position!.x).toBe(550)
      expect(result.position!.y).toBe(480)
    })
  })

  describe('getBoundingClientRect already accounts for parent scroll', () => {
    /**
     * This test documents the expected behavior:
     * When an element is inside a scrolled parent, getBoundingClientRect()
     * returns the visual viewport position, which already accounts for
     * all parent scrolling.
     */
    it('viewport rect already includes parent scroll effects', () => {
      // In a real DOM, if parent is scrolled, the child's getBoundingClientRect
      // would return a different position. We simulate this by setting the
      // rect to reflect the visual position.

      // Outer scrolled 100px left, inner at visual position (50, 100)
      // In real DOM: inner.getBoundingClientRect().left = 50 (not 150)
      const element = createMockElement(
        createRect(50, 100, 200, 150), // Visual position in viewport
        { left: 0, top: 0 } // No direct scroll
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 150, y: 175 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      // Position should be relative to the visual rect
      // x: 150 - 50 - 50 = 50, y: 175 - 100 - 20 = 55
      expect(result.position!.x).toBe(50)
      expect(result.position!.y).toBe(55)
    })
  })
})

// ============================================
// Position Fixed Container Tests
// ============================================

describe('Position Fixed Containers', () => {
  let absoluteStrategy: AbsolutePositionStrategy

  beforeEach(() => {
    absoluteStrategy = new AbsolutePositionStrategy()
  })

  describe('Fixed position containers', () => {
    /**
     * When a container has position: fixed, it's positioned relative to
     * the viewport, not the document. This means:
     * 1. Scrolling the page doesn't affect its position
     * 2. getBoundingClientRect() returns consistent values regardless of scroll
     */
    it('fixed container ignores page scroll', () => {
      // Fixed container at (100, 100), page might be scrolled but it doesn't matter
      const element = createMockElement(createRect(100, 100, 300, 200), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 200, y: 150 }
      const source = createMockPaletteSource({ size: { width: 80, height: 40 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      // Calculation is same as normal - the key is that getBoundingClientRect
      // returns viewport coordinates which are stable for fixed elements
      expect(result.position!.x).toBe(60) // 200 - 100 - 40
      expect(result.position!.y).toBe(30) // 150 - 100 - 20
    })

    it('drop inside fixed element calculates correct position', () => {
      // Fixed modal-like container
      const element = createMockElement(createRect(200, 100, 400, 300), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
        nodeId: 'fixed-modal',
      })

      const cursor: Point = { x: 300, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 50 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      expect(result.targetId).toBe('fixed-modal')
      expect(result.position!.x).toBe(50) // 300 - 200 - 50
      expect(result.position!.y).toBe(75) // 200 - 100 - 25
    })

    it('visual hint for fixed container uses viewport coordinates', () => {
      const element = createMockElement(createRect(150, 80, 300, 250), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 250, y: 180 }
      const source = createMockPaletteSource({ size: { width: 60, height: 30 } })

      const result = absoluteStrategy.calculate(cursor, target, source)
      const hint = absoluteStrategy.getVisualHint(result)

      expect(hint).not.toBeNull()
      // Hint position is viewport coords: container.left + pos.x
      // x: 150 + 70 = 220, y: 80 + 85 = 165
      expect(hint!.rect.x).toBe(220)
      expect(hint!.rect.y).toBe(165)
    })
  })

  describe('Fixed container with internal scroll', () => {
    it('fixed container can still have scrollable content', () => {
      // Fixed dialog with scrollable content area
      const element = createMockElement(
        createRect(100, 100, 300, 400),
        { left: 0, top: 50 } // Content scrolled 50px down
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 200, y: 250 }
      const source = createMockPaletteSource({ size: { width: 80, height: 40 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      // x: (200 - 100 + 0) - 40 = 60
      // y: (250 - 100 + 50) - 20 = 180
      expect(result.position!.x).toBe(60)
      expect(result.position!.y).toBe(180)
    })
  })
})

// ============================================
// Mixed Layout Type Tests
// ============================================

describe('Nested Layout Type Mixing', () => {
  let flexStrategy: FlexWithChildrenStrategy
  let simpleInsideStrategy: SimpleInsideStrategy
  let absoluteStrategy: AbsolutePositionStrategy

  beforeEach(() => {
    flexStrategy = new FlexWithChildrenStrategy()
    simpleInsideStrategy = new SimpleInsideStrategy()
    absoluteStrategy = new AbsolutePositionStrategy()
  })

  describe('Flex inside positioned container', () => {
    it('flex child in positioned parent calculates correctly', () => {
      // Flex container inside a positioned (stacked) container
      const element = createMockElement(createRect(150, 150, 300, 200), { left: 0, top: 0 })
      const target = createMockFlexTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'flex',
        direction: 'vertical',
        hasChildren: true,
      })

      // Child rects in VIEWPORT coordinates (same as cursor)
      // child-1: y = 150 to 200, midpoint = 175
      // child-2: y = 210 to 260, midpoint = 235
      const childRects: ChildRect[] = [
        { nodeId: 'child-1', rect: { x: 150, y: 150, width: 300, height: 50 } },
        { nodeId: 'child-2', rect: { x: 150, y: 210, width: 300, height: 50 } },
      ]

      // Cursor at y=180 is below midpoint of child-1 (175), so 'after' child-1
      const cursor: Point = { x: 200, y: 180 }
      const source = createMockPaletteSource()

      const containerRect: Rect = { x: 150, y: 150, width: 300, height: 200 }
      const result = flexStrategy.calculate(cursor, target, source, childRects, containerRect)

      // 'after' child-1 because cursor y=180 > midpoint 175
      expect(result.placement).toBe('after')
      expect(result.insertionIndex).toBeDefined()
      expect(result.insertionIndex).toBe(1) // Insert after first child (index 0)
    })

    it('strategy selection works for nested flex', () => {
      const flexTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
      })

      const positionedTarget = createMockDropTarget({
        layoutType: 'positioned',
      })

      expect(flexStrategy.matches(flexTarget)).toBe(true)
      expect(flexStrategy.matches(positionedTarget)).toBe(false)
      expect(absoluteStrategy.matches(positionedTarget)).toBe(true)
      expect(absoluteStrategy.matches(flexTarget)).toBe(false)
    })
  })

  describe('Positioned inside flex container', () => {
    it('positioned child in flex parent calculates absolutely', () => {
      // Positioned (stacked) container as a child of flex layout
      const element = createMockElement(createRect(200, 200, 200, 150), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 280, y: 260 }
      const source = createMockPaletteSource({ size: { width: 60, height: 30 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      expect(result.placement).toBe('absolute')
      expect(result.position!.x).toBe(50) // 280 - 200 - 30
      expect(result.position!.y).toBe(45) // 260 - 200 - 15
    })
  })

  describe('Empty flex inside positioned container', () => {
    it('empty flex in positioned parent uses simple inside strategy', () => {
      const element = createMockElement(createRect(100, 100, 200, 150), { left: 0, top: 0 })
      const target = createMockFlexTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'flex',
        hasChildren: false,
      })

      const cursor: Point = { x: 150, y: 150 }
      const source = createMockPaletteSource()

      // Simple inside strategy should match empty flex
      expect(simpleInsideStrategy.matches(target)).toBe(true)

      const result = simpleInsideStrategy.calculate(cursor, target, source)

      expect(result.placement).toBe('inside')
      expect(result.insertionIndex).toBe(0)
    })
  })

  describe('Deeply nested mixed layouts', () => {
    /**
     * Scenario:
     * - Positioned root
     *   - Flex container
     *     - Positioned container (drop target)
     */
    it('deeply nested positioned container calculates correct position', () => {
      // The innermost positioned container - its getBoundingClientRect
      // reflects its final viewport position regardless of parent layout
      const element = createMockElement(createRect(250, 300, 150, 100), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
        nodeId: 'deep-positioned',
      })

      const cursor: Point = { x: 300, y: 340 }
      const source = createMockPaletteSource({ size: { width: 40, height: 30 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      expect(result.targetId).toBe('deep-positioned')
      expect(result.position!.x).toBe(30) // 300 - 250 - 20
      expect(result.position!.y).toBe(25) // 340 - 300 - 15
    })

    it('strategy correctly identifies layout type regardless of nesting', () => {
      // Create targets with different layout types
      const flexTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
      })

      const emptyFlexTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
      })

      const positionedTarget = createMockDropTarget({
        layoutType: 'positioned',
      })

      const leafTarget = createMockDropTarget({
        layoutType: 'none',
      })

      // Each strategy only matches its own type
      expect(flexStrategy.matches(flexTarget)).toBe(true)
      expect(flexStrategy.matches(emptyFlexTarget)).toBe(false)
      expect(flexStrategy.matches(positionedTarget)).toBe(false)
      expect(flexStrategy.matches(leafTarget)).toBe(false)

      expect(simpleInsideStrategy.matches(emptyFlexTarget)).toBe(true)
      expect(simpleInsideStrategy.matches(flexTarget)).toBe(false)

      expect(absoluteStrategy.matches(positionedTarget)).toBe(true)
      expect(absoluteStrategy.matches(flexTarget)).toBe(false)
    })
  })
})

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
  let absoluteStrategy: AbsolutePositionStrategy

  beforeEach(() => {
    absoluteStrategy = new AbsolutePositionStrategy()
  })

  describe('Container at viewport origin', () => {
    it('handles container at (0, 0)', () => {
      const element = createMockElement(createRect(0, 0, 400, 300), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 100, y: 75 }
      const source = createMockPaletteSource({ size: { width: 100, height: 50 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      expect(result.position!.x).toBe(50) // 100 - 0 - 50
      expect(result.position!.y).toBe(50) // 75 - 0 - 25
    })
  })

  describe('Very small containers', () => {
    it('handles container smaller than ghost size', () => {
      const element = createMockElement(
        createRect(100, 100, 50, 30), // Smaller than default ghost
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 125, y: 115 } // Center of container
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      // Position would be negative but clamped to 0
      expect(result.position!.x).toBe(0)
      expect(result.position!.y).toBe(0)
    })
  })

  describe('Container partially off-screen', () => {
    it('handles container with negative viewport position', () => {
      // Container is partially scrolled off the left side
      const element = createMockElement(createRect(-50, 100, 200, 150), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 50, y: 150 }
      const source = createMockPaletteSource({ size: { width: 60, height: 30 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      // x: 50 - (-50) - 30 = 70
      // y: 150 - 100 - 15 = 35
      expect(result.position!.x).toBe(70)
      expect(result.position!.y).toBe(35)
    })
  })

  describe('Zero-size containers', () => {
    it('handles container with zero width', () => {
      const element = createMockElement(createRect(100, 100, 0, 200), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 100, y: 150 }
      const source = createMockPaletteSource({ size: { width: 50, height: 30 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      // Clamped to 0
      expect(result.position!.x).toBe(0)
      expect(result.position!.y).toBe(35)
    })

    it('handles container with zero height', () => {
      const element = createMockElement(createRect(100, 100, 200, 0), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 150, y: 100 }
      const source = createMockPaletteSource({ size: { width: 50, height: 30 } })

      const result = absoluteStrategy.calculate(cursor, target, source)

      expect(result.position!.x).toBe(25)
      expect(result.position!.y).toBe(0) // Clamped
    })
  })
})
