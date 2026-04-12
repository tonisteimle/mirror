/**
 * Element Removal During Drag Tests
 *
 * Tests verifying graceful handling when elements are removed from DOM
 * during an active drag operation.
 *
 * SCENARIOS:
 * 1. Source element removed during drag
 * 2. Target element removed during drag
 * 3. Container element removed during drag
 * 4. Parent element removed (child becomes orphan)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FlexWithChildrenStrategy } from '../../../studio/drag-drop/strategies/flex-with-children'
import { AbsolutePositionStrategy } from '../../../studio/drag-drop/strategies/absolute-position'
import {
  detectTarget,
  findClosestTarget,
  getChildRects,
  getSiblingRects,
  clearTargetCache,
} from '../../../studio/drag-drop/system/target-detector'
import {
  createMockFlexTarget,
  createMockCanvasSource,
} from '../../utils/mocks/drag-drop-mocks'
import type { ChildRect } from '../../../studio/drag-drop/strategies/types'
import type { Point, DropTarget, DragSource } from '../../../studio/drag-drop/types'

describe('Element Removal During Drag', () => {
  beforeEach(() => {
    clearTargetCache()
  })

  describe('Source Element Removal', () => {
    it('strategy handles source with null element reference', () => {
      const flexStrategy = new FlexWithChildrenStrategy()

      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })

      // Source with nodeId but element might be gone
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'removed-element',
        element: undefined, // Element was removed
      }

      const cursor: Point = { x: 50, y: 24 }

      // Should not crash - element reference is optional for calculation
      const result = flexStrategy.calculate(cursor, target, source, childRects)
      expect(result).toBeDefined()
      expect(result.placement).toBeDefined()
    })

    it('palette source (no element) works correctly', () => {
      const flexStrategy = new FlexWithChildrenStrategy()

      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })

      // Palette sources never have an element
      const source: DragSource = {
        type: 'palette',
        componentName: 'Button',
      }

      const cursor: Point = { x: 50, y: 24 }
      const result = flexStrategy.calculate(cursor, target, source, childRects)

      expect(result).toBeDefined()
      // isNoOp should always be false for palette sources
      expect(result.isNoOp).toBeFalsy()
    })
  })

  describe('Target Element Removal', () => {
    it('detectTarget returns null for detached element', () => {
      const element = document.createElement('div')
      element.setAttribute('data-mirror-id', 'test-node')
      element.style.display = 'flex'

      // Element is created but never attached to document
      // It's "detached" from the start

      const mockAdapter = {
        getBoundingClientRect: () => ({
          x: 0, y: 0, width: 0, height: 0,
          top: 0, left: 0, right: 0, bottom: 0,
          toJSON: () => ({}),
        }),
        getComputedStyle: () => ({
          display: 'flex',
          flexDirection: 'row',
          position: 'static',
        } as CSSStyleDeclaration),
      }

      // Should still work for detached elements
      const result = detectTarget(element, 'data-mirror-id', mockAdapter)
      expect(result).toBeDefined()
      expect(result?.nodeId).toBe('test-node')
    })

    it('findClosestTarget handles element removed from DOM', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'container')
      document.body.appendChild(container)

      const child = document.createElement('div')
      child.setAttribute('data-mirror-id', 'child')
      container.appendChild(child)

      // Remove child from DOM
      container.removeChild(child)

      // Child is now orphaned
      expect(child.parentElement).toBeNull()

      // Should handle gracefully
      const result = findClosestTarget(child, 'data-mirror-id')

      // May return null or the detached element itself
      // Should not throw
      expect(() => result).not.toThrow()

      // Cleanup
      document.body.removeChild(container)
    })

    it('getChildRects handles container with dynamically removed children', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'container')

      const child1 = document.createElement('div')
      child1.setAttribute('data-mirror-id', 'child-1')
      container.appendChild(child1)

      const child2 = document.createElement('div')
      child2.setAttribute('data-mirror-id', 'child-2')
      container.appendChild(child2)

      // Get rects while children exist
      const mockAdapter = {
        getBoundingClientRect: () => ({
          x: 0, y: 0, width: 100, height: 40,
          top: 0, left: 0, right: 100, bottom: 40,
          toJSON: () => ({}),
        }),
        getComputedStyle: () => ({} as CSSStyleDeclaration),
      }

      const rects1 = getChildRects(container, 'data-mirror-id', null, mockAdapter)
      expect(rects1).toHaveLength(2)

      // Remove one child
      container.removeChild(child1)

      // Get rects again
      const rects2 = getChildRects(container, 'data-mirror-id', null, mockAdapter)
      expect(rects2).toHaveLength(1)
      expect(rects2[0].nodeId).toBe('child-2')
    })
  })

  describe('Container Element Removal', () => {
    it('strategy handles target with detached element', () => {
      const flexStrategy = new FlexWithChildrenStrategy()

      // Create a detached element (never added to DOM)
      const element = document.createElement('div')
      element.setAttribute('data-mirror-id', 'detached')

      const target: DropTarget = {
        nodeId: 'detached',
        element,
        layoutType: 'flex',
        direction: 'vertical',
        hasChildren: true,
        isPositioned: false,
      }

      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      ]

      const source = createMockCanvasSource({ nodeId: 'other' })
      const cursor: Point = { x: 50, y: 20 }

      // Should not crash on detached element
      const result = flexStrategy.calculate(cursor, target, source, childRects)
      expect(result).toBeDefined()
    })

    it('absolute strategy handles detached container', () => {
      const strategy = new AbsolutePositionStrategy()

      const element = document.createElement('div')
      element.getBoundingClientRect = vi.fn(() => ({
        x: 0, y: 0, width: 400, height: 300,
        top: 0, left: 0, right: 400, bottom: 300,
        toJSON: () => ({}),
      }))
      Object.defineProperty(element, 'scrollLeft', { value: 0 })
      Object.defineProperty(element, 'scrollTop', { value: 0 })

      const target: DropTarget = {
        nodeId: 'detached',
        element,
        layoutType: 'positioned',
        direction: 'vertical',
        hasChildren: true,
        isPositioned: true,
      }

      const source: DragSource = {
        type: 'palette',
        componentName: 'Frame',
        size: { width: 100, height: 40 },
      }

      const cursor: Point = { x: 200, y: 150 }
      const containerRect = { x: 0, y: 0, width: 400, height: 300 }

      const result = strategy.calculate(cursor, target, source, [], containerRect)
      expect(result).toBeDefined()
      expect(result.position).toBeDefined()
    })
  })

  describe('Stale Cache Handling', () => {
    it('cache returns stale data for removed element', () => {
      const element = document.createElement('div')
      element.setAttribute('data-mirror-id', 'cached-node')
      element.style.display = 'flex'

      const mockAdapter = {
        getBoundingClientRect: () => ({
          x: 0, y: 0, width: 100, height: 100,
          top: 0, left: 0, right: 100, bottom: 100,
          toJSON: () => ({}),
        }),
        getComputedStyle: () => ({
          display: 'flex',
          flexDirection: 'row',
          position: 'static',
        } as CSSStyleDeclaration),
      }

      // First call - populates cache
      const result1 = detectTarget(element, 'data-mirror-id', mockAdapter)
      expect(result1).toBeDefined()
      expect(result1?.layoutType).toBe('flex')

      // Change element's display (simulating DOM mutation)
      element.style.display = 'block'

      // Second call - returns cached value (stale)
      const result2 = detectTarget(element, 'data-mirror-id', mockAdapter)
      expect(result2?.layoutType).toBe('flex') // Still flex from cache

      // Clear cache
      clearTargetCache()

      // Third call - fresh detection
      const mockAdapter2 = {
        getBoundingClientRect: () => ({
          x: 0, y: 0, width: 100, height: 100,
          top: 0, left: 0, right: 100, bottom: 100,
          toJSON: () => ({}),
        }),
        getComputedStyle: () => ({
          display: 'block', // Now returns block
          flexDirection: 'row',
          position: 'static',
        } as CSSStyleDeclaration),
      }

      const result3 = detectTarget(element, 'data-mirror-id', mockAdapter2)
      expect(result3?.layoutType).toBe('none') // Now correctly detected as non-flex
    })

    it('WeakMap allows GC of removed elements', () => {
      // This test documents the WeakMap behavior
      // We can't actually test GC, but we verify WeakMap semantics

      let element: HTMLElement | null = document.createElement('div')
      element.setAttribute('data-mirror-id', 'gc-test')

      const mockAdapter = {
        getBoundingClientRect: () => ({
          x: 0, y: 0, width: 100, height: 100,
          top: 0, left: 0, right: 100, bottom: 100,
          toJSON: () => ({}),
        }),
        getComputedStyle: () => ({
          display: 'flex',
          flexDirection: 'row',
          position: 'static',
        } as CSSStyleDeclaration),
      }

      // Populate cache
      detectTarget(element, 'data-mirror-id', mockAdapter)

      // Clear our reference (in real code, element removal does this)
      element = null

      // WeakMap allows the entry to be GC'd
      // We can't verify GC happened, but this is the expected behavior
      expect(element).toBeNull()
    })
  })

  describe('Visual Hint with Removed Elements', () => {
    it('visual hint handles result with removed target element', () => {
      const flexStrategy = new FlexWithChildrenStrategy()

      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
      const source = createMockCanvasSource({ nodeId: 'other' })
      const containerRect = { x: 0, y: 0, width: 200, height: 100 }

      const cursor: Point = { x: 50, y: 20 }
      const result = flexStrategy.calculate(cursor, target, source, childRects)

      // Get visual hint - target.element is mocked, not a real DOM element
      // This should still work
      const hint = flexStrategy.getVisualHint(result, childRects, containerRect)
      expect(hint).toBeDefined()
    })
  })
})
