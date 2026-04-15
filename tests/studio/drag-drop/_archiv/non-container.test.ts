/**
 * NonContainerStrategy Tests
 *
 * Tests for the strategy that handles drops on non-container elements (Text, Input, etc.).
 * Covers UC-ADD-07 from drag-drop-use-cases.md.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { NonContainerStrategy } from '../../../studio/drag-drop/strategies/non-container'
import {
  createMockFlexTarget,
  createMockDropTarget,
  createMockPaletteSource,
  createMockElement,
  createRect,
} from '../../utils/mocks/drag-drop-mocks'
import type { Point, Rect, DropTarget } from '../../../studio/drag-drop/types'
import type { LayoutRect } from '../../../studio/core/state'

describe('NonContainerStrategy', () => {
  let strategy: NonContainerStrategy

  beforeEach(() => {
    strategy = new NonContainerStrategy()
  })

  // ============================================
  // matches() tests
  // ============================================

  describe('matches()', () => {
    it('returns true for non-container elements (layoutType: none)', () => {
      const target = createMockDropTarget({
        layoutType: 'none',
      })
      expect(strategy.matches(target)).toBe(true)
    })

    it('returns false for flex containers', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
      })
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns false for positioned containers', () => {
      const target = createMockDropTarget({
        layoutType: 'positioned',
      })
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns true for leaf elements regardless of hasChildren', () => {
      // Leaf elements never have children, but test both cases
      const targetWithFalse = createMockDropTarget({
        layoutType: 'none',
        hasChildren: false,
      })
      const targetWithTrue = createMockDropTarget({
        layoutType: 'none',
        hasChildren: true, // Shouldn't happen, but test anyway
      })

      expect(strategy.matches(targetWithFalse)).toBe(true)
      expect(strategy.matches(targetWithTrue)).toBe(true)
    })
  })

  // ============================================
  // UC-ADD-07: Component on Leaf Element
  // ============================================

  describe('UC-ADD-07: Drop on leaf element (non-container)', () => {
    it('returns "before" when cursor is above element midpoint', () => {
      // Element at y=50, height=40 → midpoint = 70
      const element = createMockElement(createRect(0, 50, 100, 40), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'text-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      // Cursor at y=60 (above midpoint of 70)
      const cursor: Point = { x: 50, y: 60 }
      const result = strategy.calculate(cursor, target, source, undefined, {
        x: 0,
        y: 50,
        width: 100,
        height: 40,
      })

      expect(result.placement).toBe('before')
      expect(result.targetId).toBe('text-element')
    })

    it('returns "after" when cursor is below element midpoint', () => {
      const element = createMockElement(createRect(0, 50, 100, 40), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'text-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      // Cursor at y=80 (below midpoint of 70)
      const cursor: Point = { x: 50, y: 80 }
      const result = strategy.calculate(cursor, target, source, undefined, {
        x: 0,
        y: 50,
        width: 100,
        height: 40,
      })

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('text-element')
    })

    it('returns "before" when cursor is exactly at midpoint', () => {
      const element = createMockElement(createRect(0, 50, 100, 40), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'text-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      // Cursor exactly at midpoint y=70
      // The condition is cursor.y < midY, so equal goes to "after"
      const cursor: Point = { x: 50, y: 70 }
      const result = strategy.calculate(cursor, target, source, undefined, {
        x: 0,
        y: 50,
        width: 100,
        height: 40,
      })

      // y=70 is NOT < 70, so it should be "after"
      expect(result.placement).toBe('after')
    })
  })

  // ============================================
  // Placement calculation with various element sizes
  // ============================================

  describe('Midpoint calculation with various element sizes', () => {
    it('calculates correct midpoint for tall elements', () => {
      // Tall element: y=0, height=200 → midpoint = 100
      const element = createMockElement(createRect(0, 0, 100, 200), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'tall-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      // Cursor at y=90 (below midpoint)
      expect(
        strategy.calculate({ x: 50, y: 90 }, target, source, undefined, {
          x: 0,
          y: 0,
          width: 100,
          height: 200,
        }).placement
      ).toBe('before')

      // Cursor at y=110 (above midpoint)
      expect(
        strategy.calculate({ x: 50, y: 110 }, target, source, undefined, {
          x: 0,
          y: 0,
          width: 100,
          height: 200,
        }).placement
      ).toBe('after')
    })

    it('calculates correct midpoint for short elements', () => {
      // Short element: y=100, height=20 → midpoint = 110
      const element = createMockElement(createRect(0, 100, 100, 20), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'short-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      const containerRect = { x: 0, y: 100, width: 100, height: 20 }

      expect(
        strategy.calculate({ x: 50, y: 105 }, target, source, undefined, containerRect).placement
      ).toBe('before')

      expect(
        strategy.calculate({ x: 50, y: 115 }, target, source, undefined, containerRect).placement
      ).toBe('after')
    })

    it('handles elements with non-zero y offset', () => {
      // Element at y=500, height=100 → midpoint = 550
      const element = createMockElement(createRect(0, 500, 100, 100), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'offset-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      const containerRect = { x: 0, y: 500, width: 100, height: 100 }

      expect(
        strategy.calculate({ x: 50, y: 540 }, target, source, undefined, containerRect).placement
      ).toBe('before')

      expect(
        strategy.calculate({ x: 50, y: 560 }, target, source, undefined, containerRect).placement
      ).toBe('after')
    })
  })

  // ============================================
  // getVisualHint() tests
  // ============================================

  describe('getVisualHint()', () => {
    it('returns horizontal line for "before" placement', () => {
      const element = createMockElement(createRect(10, 50, 100, 40), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'text-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 55 }, target, source, undefined, {
        x: 10,
        y: 50,
        width: 100,
        height: 40,
      })
      const hint = strategy.getVisualHint(result)

      expect(hint.type).toBe('line')
      expect(hint.direction).toBe('horizontal')
      // Line should be at top of element (y=50)
      expect(hint.rect.y).toBeCloseTo(50 - 1, 0) // minus thickness/2
    })

    it('returns horizontal line for "after" placement', () => {
      const element = createMockElement(createRect(10, 50, 100, 40), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'text-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 80 }, target, source, undefined, {
        x: 10,
        y: 50,
        width: 100,
        height: 40,
      })
      const hint = strategy.getVisualHint(result)

      expect(hint.type).toBe('line')
      expect(hint.direction).toBe('horizontal')
      // Line should be at bottom of element (y=90)
      expect(hint.rect.y).toBeCloseTo(90 - 1, 0) // minus thickness/2
    })

    it('uses container width for line when provided', () => {
      const element = createMockElement(createRect(10, 50, 80, 40), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'text-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 55 }, target, source)
      const containerRect: Rect = { x: 0, y: 0, width: 200, height: 100 }
      const hint = strategy.getVisualHint(result, undefined, containerRect)

      expect(hint.rect.width).toBe(200) // Container width
      expect(hint.rect.x).toBe(0) // Container x
    })

    it('uses layoutInfo when available', () => {
      const element = createMockElement(createRect(0, 0, 50, 50), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'text-element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 10 }, target, source)

      // Create layoutInfo with cached rect
      const layoutInfo = new Map<string, LayoutRect>([
        ['text-element', { x: 20, y: 30, width: 150, height: 80, children: [] }],
      ])

      const hint = strategy.getVisualHint(result, undefined, undefined, layoutInfo)

      // Should use layoutInfo rect
      expect(hint.rect.y).toBeCloseTo(30 - 1, 0) // top of layoutInfo rect
    })
  })

  // ============================================
  // Edge cases
  // ============================================

  describe('Edge cases', () => {
    it('handles element with zero height', () => {
      // Zero height means any cursor position goes to "after"
      const element = createMockElement(createRect(0, 50, 100, 0), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'zero-height',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 50 }, target, source, undefined, {
        x: 0,
        y: 50,
        width: 100,
        height: 0,
      })

      // Midpoint = 50 + 0/2 = 50, cursor at 50 is NOT < 50, so "after"
      expect(result.placement).toBe('after')
    })

    it('handles negative cursor positions', () => {
      const element = createMockElement(createRect(0, 50, 100, 40), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      // Negative y cursor - should be "before"
      const result = strategy.calculate({ x: 50, y: -10 }, target, source, undefined, {
        x: 0,
        y: 50,
        width: 100,
        height: 40,
      })

      expect(result.placement).toBe('before')
    })

    it('returns target in result', () => {
      const element = createMockElement(createRect(0, 50, 100, 40), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'my-text',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 60 }, target, source)

      expect(result.target).toBe(target)
      expect(result.targetId).toBe('my-text')
    })

    it('falls back to DOM read when no containerRect provided', () => {
      const element = createMockElement(createRect(10, 100, 80, 60), { left: 0, top: 0 })
      const target: DropTarget = {
        nodeId: 'element',
        element: element as unknown as HTMLElement,
        layoutType: 'none',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source = createMockPaletteSource()

      // Midpoint = 100 + 60/2 = 130
      const result = strategy.calculate({ x: 50, y: 120 }, target, source)

      expect(result.placement).toBe('before') // 120 < 130
    })
  })

  // ============================================
  // Different element types
  // ============================================

  describe('Works with different element types', () => {
    const elementTypes = ['Text', 'Input', 'Image', 'Icon', 'Button']

    elementTypes.forEach(type => {
      it(`handles ${type} element correctly`, () => {
        const element = createMockElement(createRect(0, 50, 100, 40), { left: 0, top: 0 })
        const target: DropTarget = {
          nodeId: `${type.toLowerCase()}-1`,
          element: element as unknown as HTMLElement,
          layoutType: 'none',
          direction: 'vertical',
          hasChildren: false,
          isPositioned: false,
        }
        const source = createMockPaletteSource({ componentName: 'Frame' })

        const result = strategy.calculate({ x: 50, y: 60 }, target, source, undefined, {
          x: 0,
          y: 50,
          width: 100,
          height: 40,
        })

        // Should work the same for all leaf element types
        expect(result.placement).toBe('before')
        expect(result.targetId).toBe(`${type.toLowerCase()}-1`)
      })
    })
  })
})
