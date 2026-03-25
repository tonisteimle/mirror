/**
 * FlexWithChildrenStrategy Tests
 */

import { describe, it, expect } from 'vitest'
import { FlexWithChildrenStrategy, calculateInsertionLineRect } from '../../strategies/flex-with-children'
import type { DropTarget, DragSource, Rect } from '../../types'
import type { ChildRect } from '../../strategies/types'

describe('FlexWithChildrenStrategy', () => {
  const strategy = new FlexWithChildrenStrategy()

  // Mock element that doesn't require DOM
  const mockElement = {} as HTMLElement

  const createMockTarget = (direction: 'horizontal' | 'vertical', hasChildren = true): DropTarget => ({
    nodeId: 'container-1',
    element: mockElement,
    layoutType: 'flex',
    direction,
    hasChildren,
    isPositioned: false,
  })

  const createMockSource = (): DragSource => ({
    type: 'palette',
    componentName: 'Button',
  })

  describe('matches', () => {
    it('returns true for flex container with children', () => {
      const target = createMockTarget('vertical', true)
      expect(strategy.matches(target)).toBe(true)
    })

    it('returns false for empty flex container', () => {
      const target = createMockTarget('vertical', false)
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns false for positioned container', () => {
      const target: DropTarget = {
        ...createMockTarget('vertical'),
        layoutType: 'positioned',
        isPositioned: true,
      }
      expect(strategy.matches(target)).toBe(false)
    })
  })

  describe('calculate - vertical direction', () => {
    const target = createMockTarget('vertical')
    const source = createMockSource()

    const childRects: ChildRect[] = [
      { nodeId: 'child-1', rect: { x: 0, y: 0, width: 200, height: 40 } },
      { nodeId: 'child-2', rect: { x: 0, y: 50, width: 200, height: 40 } },
      { nodeId: 'child-3', rect: { x: 0, y: 100, width: 200, height: 40 } },
    ]

    it('returns "before" when cursor in top half of first child', () => {
      const cursor = { x: 100, y: 15 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('before')
      expect(result.targetId).toBe('child-1')
      expect(result.insertionIndex).toBe(0)
    })

    it('returns "after" when cursor in bottom half of first child', () => {
      const cursor = { x: 100, y: 35 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('child-1')
      expect(result.insertionIndex).toBe(1)
    })

    it('returns "before" when cursor in top half of middle child', () => {
      const cursor = { x: 100, y: 55 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('before')
      expect(result.targetId).toBe('child-2')
      expect(result.insertionIndex).toBe(1)
    })

    it('returns "after" when cursor in bottom half of last child', () => {
      const cursor = { x: 100, y: 130 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('child-3')
      expect(result.insertionIndex).toBe(3)
    })
  })

  describe('calculate - horizontal direction', () => {
    const target = createMockTarget('horizontal')
    const source = createMockSource()

    const childRects: ChildRect[] = [
      { nodeId: 'child-1', rect: { x: 0, y: 0, width: 80, height: 100 } },
      { nodeId: 'child-2', rect: { x: 90, y: 0, width: 80, height: 100 } },
    ]

    it('returns "before" when cursor in left half of first child', () => {
      const cursor = { x: 30, y: 50 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('before')
      expect(result.targetId).toBe('child-1')
    })

    it('returns "after" when cursor in right half of first child', () => {
      const cursor = { x: 60, y: 50 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('child-1')
    })

    it('returns "before" when cursor in left half of second child', () => {
      const cursor = { x: 110, y: 50 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('before')
      expect(result.targetId).toBe('child-2')
    })
  })

  describe('calculate - empty childRects fallback', () => {
    it('returns inside at index 0 when no children', () => {
      const target = createMockTarget('vertical')
      const source = createMockSource()
      const cursor = { x: 100, y: 100 }

      const result = strategy.calculate(cursor, target, source, [])

      expect(result.placement).toBe('inside')
      expect(result.insertionIndex).toBe(0)
    })
  })
})

describe('calculateInsertionLineRect', () => {
  const targetRect: Rect = { x: 50, y: 100, width: 200, height: 40 }

  describe('vertical direction (horizontal line)', () => {
    it('calculates line above element for "before"', () => {
      const rect = calculateInsertionLineRect(targetRect, 'before', 'vertical', 2)

      expect(rect.x).toBe(50)
      expect(rect.y).toBe(99) // 100 - 1
      expect(rect.width).toBe(200)
      expect(rect.height).toBe(2)
    })

    it('calculates line below element for "after"', () => {
      const rect = calculateInsertionLineRect(targetRect, 'after', 'vertical', 2)

      expect(rect.x).toBe(50)
      expect(rect.y).toBe(139) // 100 + 40 - 1
      expect(rect.width).toBe(200)
      expect(rect.height).toBe(2)
    })
  })

  describe('horizontal direction (vertical line)', () => {
    it('calculates line to the left for "before"', () => {
      const rect = calculateInsertionLineRect(targetRect, 'before', 'horizontal', 2)

      expect(rect.x).toBe(49) // 50 - 1
      expect(rect.y).toBe(100)
      expect(rect.width).toBe(2)
      expect(rect.height).toBe(40)
    })

    it('calculates line to the right for "after"', () => {
      const rect = calculateInsertionLineRect(targetRect, 'after', 'horizontal', 2)

      expect(rect.x).toBe(249) // 50 + 200 - 1
      expect(rect.y).toBe(100)
      expect(rect.width).toBe(2)
      expect(rect.height).toBe(40)
    })
  })
})
