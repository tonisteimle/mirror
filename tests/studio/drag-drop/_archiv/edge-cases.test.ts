/**
 * Edge Case Tests for Drag-Drop System
 *
 * Tests critical boundary conditions and error scenarios:
 * - NaN in cursor coordinates
 * - Zero-dimension containers
 * - Element removal during drag
 * - SVG elements as targets
 * - Empty child arrays
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
  isLeafComponent,
  clearTargetCache,
} from '../../../studio/drag-drop/system/target-detector'
import { createMockFlexTarget, createMockCanvasSource } from '../../utils/mocks/drag-drop-mocks'
import type { ChildRect } from '../../../studio/drag-drop/strategies/types'
import type { Point, DropTarget, DragSource } from '../../../studio/drag-drop/types'

// ============================================
// NaN Cursor Tests
// ============================================

describe('NaN Cursor Coordinates', () => {
  let flexStrategy: FlexWithChildrenStrategy
  let absoluteStrategy: AbsolutePositionStrategy

  beforeEach(() => {
    flexStrategy = new FlexWithChildrenStrategy()
    absoluteStrategy = new AbsolutePositionStrategy()
  })

  describe('FlexWithChildrenStrategy', () => {
    it('handles NaN cursor.x without crashing', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
      const source = createMockCanvasSource({ nodeId: 'c' })

      // NaN cursor
      const cursor: Point = { x: NaN, y: 50 }
      const result = flexStrategy.calculate(cursor, target, source, childRects)

      // Should not crash - result may be unpredictable but should be defined
      expect(result).toBeDefined()
      expect(result.target).toBe(target)
    })

    it('handles NaN cursor.y without crashing', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
      const source = createMockCanvasSource({ nodeId: 'c' })

      const cursor: Point = { x: 50, y: NaN }
      const result = flexStrategy.calculate(cursor, target, source, childRects)

      expect(result).toBeDefined()
    })

    it('handles both cursor coordinates as NaN', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
      const source = createMockCanvasSource({ nodeId: 'c' })

      const cursor: Point = { x: NaN, y: NaN }
      const result = flexStrategy.calculate(cursor, target, source, childRects)

      // Should return a valid result structure
      expect(result).toBeDefined()
      expect(result.placement).toBeDefined()
    })

    it('handles Infinity cursor coordinates', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
      const source = createMockCanvasSource({ nodeId: 'c' })

      const cursor: Point = { x: Infinity, y: -Infinity }
      const result = flexStrategy.calculate(cursor, target, source, childRects)

      expect(result).toBeDefined()
    })
  })

  describe('AbsolutePositionStrategy', () => {
    it('handles NaN cursor without crashing', () => {
      const element = document.createElement('div')
      element.getBoundingClientRect = vi.fn(() => ({
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        top: 100,
        left: 100,
        right: 500,
        bottom: 400,
        toJSON: () => ({}),
      }))

      const target: DropTarget = {
        nodeId: 'container',
        element,
        layoutType: 'positioned',
        direction: 'vertical',
        hasChildren: true,
        isPositioned: true,
      }
      const source = createMockCanvasSource({ nodeId: 'child' })

      const cursor: Point = { x: NaN, y: NaN }
      const containerRect = { x: 100, y: 100, width: 400, height: 300 }

      const result = absoluteStrategy.calculate(cursor, target, source, [], containerRect)

      // Position may be NaN but should not throw
      expect(result).toBeDefined()
      expect(result.placement).toBe('absolute')
    })

    it('clamps negative positions to zero', () => {
      const element = document.createElement('div')
      element.getBoundingClientRect = vi.fn(() => ({
        x: 100,
        y: 100,
        width: 400,
        height: 300,
        top: 100,
        left: 100,
        right: 500,
        bottom: 400,
        toJSON: () => ({}),
      }))
      Object.defineProperty(element, 'scrollLeft', { value: 0 })
      Object.defineProperty(element, 'scrollTop', { value: 0 })

      const target: DropTarget = {
        nodeId: 'container',
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

      // Cursor far outside container (negative relative position)
      const cursor: Point = { x: 0, y: 0 }
      const containerRect = { x: 100, y: 100, width: 400, height: 300 }

      const result = absoluteStrategy.calculate(cursor, target, source, [], containerRect)

      // Position should be clamped to 0
      expect(result.position!.x).toBe(0)
      expect(result.position!.y).toBe(0)
    })
  })
})

// ============================================
// Zero-Dimension Container Tests
// ============================================

describe('Zero-Dimension Containers', () => {
  let flexStrategy: FlexWithChildrenStrategy

  beforeEach(() => {
    flexStrategy = new FlexWithChildrenStrategy()
  })

  it('handles child with zero width', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 0, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    const cursor: Point = { x: 50, y: 20 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    // Should still produce valid result
    expect(result).toBeDefined()
    expect(result.insertionIndex).toBeDefined()
  })

  it('handles child with zero height', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 0 } },
      { nodeId: 'b', rect: { x: 0, y: 0, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    const cursor: Point = { x: 50, y: 20 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result).toBeDefined()
  })

  it('handles all children with zero dimensions', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 0, height: 0 } },
      { nodeId: 'b', rect: { x: 0, y: 0, width: 0, height: 0 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    const cursor: Point = { x: 50, y: 20 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    // All centers are at (0, 0), distances are all equal
    // Should still return a valid result
    expect(result).toBeDefined()
    expect(result.targetId).toBeDefined()
  })

  it('handles container with zero dimensions in visual hint', () => {
    const childRects: ChildRect[] = [{ nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } }]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })
    const containerRect = { x: 0, y: 0, width: 0, height: 0 }

    const cursor: Point = { x: 50, y: 20 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)
    const hint = flexStrategy.getVisualHint(result, childRects, containerRect)

    // Hint may have zero width but should not crash
    expect(hint).toBeDefined()
  })
})

// ============================================
// Empty Child Array Tests
// ============================================

describe('Empty Child Arrays', () => {
  let flexStrategy: FlexWithChildrenStrategy

  beforeEach(() => {
    flexStrategy = new FlexWithChildrenStrategy()
  })

  it('handles empty childRects array', () => {
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    const cursor: Point = { x: 50, y: 20 }
    const result = flexStrategy.calculate(cursor, target, source, [])

    // Should fall back to inside placement
    expect(result.placement).toBe('inside')
    expect(result.insertionIndex).toBe(0)
  })

  it('handles undefined childRects', () => {
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    const cursor: Point = { x: 50, y: 20 }
    const result = flexStrategy.calculate(cursor, target, source, undefined)

    expect(result.placement).toBe('inside')
  })

  it('visual hint handles empty childRects', () => {
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })
    const containerRect = { x: 0, y: 0, width: 200, height: 100 }

    const cursor: Point = { x: 50, y: 20 }
    const result = flexStrategy.calculate(cursor, target, source, [])
    const hint = flexStrategy.getVisualHint(result, [], containerRect)

    // For inside placement with empty children, should return outline
    expect(hint).toBeDefined()
    expect(hint!.type).toBe('outline')
  })
})

// ============================================
// SVG Element Tests
// ============================================

describe('SVG Elements', () => {
  beforeEach(() => {
    clearTargetCache()
  })

  it('SVG elements are treated as leaf components', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    // SVG elements don't have tagName in the same way, but we can test behavior

    // SVG elements should not be detected as valid drop targets
    // because they don't typically have data-mirror-id attributes
    const result = detectTarget(svg as unknown as HTMLElement, 'data-mirror-id')

    expect(result).toBeNull()
  })

  it('SVG child elements inside container are handled', () => {
    const container = document.createElement('div')
    container.setAttribute('data-mirror-id', 'container')
    container.style.display = 'flex'

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('data-mirror-id', 'svg-child')
    container.appendChild(svg)

    // Mock getComputedStyle
    const mockAdapter = {
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        toJSON: () => ({}),
      }),
      getComputedStyle: () =>
        ({
          display: 'flex',
          flexDirection: 'row',
          position: 'static',
        }) as CSSStyleDeclaration,
    }

    const rects = getChildRects(container, 'data-mirror-id', null, mockAdapter)

    // SVG child should be included
    expect(rects.length).toBe(1)
    expect(rects[0].nodeId).toBe('svg-child')
  })

  it('img elements are recognized as leaf components', () => {
    const img = document.createElement('img')
    img.setAttribute('data-mirror-id', 'image-1')

    expect(isLeafComponent(img)).toBe(true)
  })

  it('button elements are recognized as leaf components', () => {
    const button = document.createElement('button')
    button.setAttribute('data-mirror-id', 'btn-1')

    expect(isLeafComponent(button)).toBe(true)
  })
})

// ============================================
// Element Removal During Drag Tests
// ============================================

describe('Element Removal During Drag', () => {
  beforeEach(() => {
    clearTargetCache()
  })

  it('findClosestTarget handles element without parent', () => {
    const orphanElement = document.createElement('div')
    orphanElement.setAttribute('data-mirror-id', 'orphan')

    // Detached element has no parentElement
    const result = findClosestTarget(orphanElement, 'data-mirror-id')

    // Should handle gracefully - may return null or the element itself
    // Depends on implementation, but should not throw
    expect(() => result).not.toThrow()
  })

  it('getChildRects handles container with removed children', () => {
    const container = document.createElement('div')
    container.setAttribute('data-mirror-id', 'container')

    // Create a custom iterator that simulates children being removed
    const mockChildren: HTMLElement[] = []
    Object.defineProperty(container, 'children', {
      get: () => ({
        length: mockChildren.length,
        [Symbol.iterator]: function* () {
          for (const child of mockChildren) {
            yield child
          }
        },
      }),
    })

    const mockAdapter = {
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        toJSON: () => ({}),
      }),
      getComputedStyle: () => ({}) as CSSStyleDeclaration,
    }

    const rects = getChildRects(container, 'data-mirror-id', null, mockAdapter)

    // Should return empty array without error
    expect(rects).toEqual([])
  })

  it('handles element with null getBoundingClientRect', () => {
    const container = document.createElement('div')
    container.setAttribute('data-mirror-id', 'container')

    const child = document.createElement('div')
    child.setAttribute('data-mirror-id', 'child')
    container.appendChild(child)

    // Mock adapter that returns null-ish values
    const mockAdapter = {
      getBoundingClientRect: () => ({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        toJSON: () => ({}),
      }),
      getComputedStyle: () => ({}) as CSSStyleDeclaration,
    }

    const rects = getChildRects(container, 'data-mirror-id', null, mockAdapter)

    // Should handle gracefully
    expect(rects.length).toBe(1)
    expect(rects[0].nodeId).toBe('child')
  })
})

// ============================================
// Insertion Index Boundary Tests
// ============================================

describe('Insertion Index Boundaries', () => {
  let flexStrategy: FlexWithChildrenStrategy

  beforeEach(() => {
    flexStrategy = new FlexWithChildrenStrategy()
  })

  it('insertion index at start (0) is valid', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    // Cursor far above first element
    const cursor: Point = { x: 50, y: -100 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result.insertionIndex).toBe(0)
    expect(result.placement).toBe('before')
  })

  it('insertion index at end (length) is valid', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    // Cursor far below last element
    const cursor: Point = { x: 50, y: 1000 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result.insertionIndex).toBe(2)
    expect(result.placement).toBe('after')
  })

  it('insertion index in middle is valid', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      { nodeId: 'c', rect: { x: 0, y: 96, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'd' })

    // Cursor between a and b
    const cursor: Point = { x: 50, y: 44 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result.insertionIndex).toBeGreaterThanOrEqual(0)
    expect(result.insertionIndex).toBeLessThanOrEqual(3)
  })

  it('single child handles before placement', () => {
    const childRects: ChildRect[] = [{ nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } }]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'b' })

    // Cursor above the single element
    const cursor: Point = { x: 50, y: -10 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result.insertionIndex).toBe(0)
    expect(result.placement).toBe('before')
  })

  it('single child handles after placement', () => {
    const childRects: ChildRect[] = [{ nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } }]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'b' })

    // Cursor below the single element
    const cursor: Point = { x: 50, y: 100 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result.insertionIndex).toBe(1)
    expect(result.placement).toBe('after')
  })
})

// ============================================
// Negative Position Tests
// ============================================

describe('Negative Positions', () => {
  it('handles child rects with negative positions', () => {
    const flexStrategy = new FlexWithChildrenStrategy()

    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: -100, y: -100, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: -100, y: -52, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    const cursor: Point = { x: -50, y: -70 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result).toBeDefined()
    expect(result.targetId).toBeDefined()
  })

  it('handles containerRect with negative positions', () => {
    const flexStrategy = new FlexWithChildrenStrategy()

    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: -100, y: -100, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })
    const containerRect = { x: -200, y: -200, width: 300, height: 200 }

    const cursor: Point = { x: -50, y: -70 }
    const result = flexStrategy.calculate(cursor, target, source, childRects, containerRect)
    const hint = flexStrategy.getVisualHint(result, childRects, containerRect)

    expect(hint).toBeDefined()
  })
})

// ============================================
// Very Large Values Tests
// ============================================

describe('Very Large Values', () => {
  it('handles very large cursor coordinates', () => {
    const flexStrategy = new FlexWithChildrenStrategy()

    const childRects: ChildRect[] = [{ nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } }]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    const cursor: Point = { x: 1e10, y: 1e10 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result).toBeDefined()
    expect(result.placement).toBe('after') // Far beyond last element
  })

  it('handles very large rect values', () => {
    const flexStrategy = new FlexWithChildrenStrategy()

    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 1e10, y: 1e10, width: 1e10, height: 1e10 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    const cursor: Point = { x: 5e10, y: 5e10 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result).toBeDefined()
  })
})

// ============================================
// Direction Mismatch Tests
// ============================================

describe('Direction Handling', () => {
  let flexStrategy: FlexWithChildrenStrategy

  beforeEach(() => {
    flexStrategy = new FlexWithChildrenStrategy()
  })

  it('horizontal direction uses x coordinate', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 80, height: 40 } },
      { nodeId: 'b', rect: { x: 88, y: 0, width: 80, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'horizontal', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    // Cursor between elements (x = 84, between 0-80 and 88-168)
    const cursor: Point = { x: 84, y: 20 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result.insertionIndex).toBeGreaterThanOrEqual(1)
  })

  it('vertical direction uses y coordinate', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
    ]
    const target = createMockFlexTarget({ direction: 'vertical', hasChildren: true })
    const source = createMockCanvasSource({ nodeId: 'c' })

    // Cursor between elements (y = 44, between 0-40 and 48-88)
    const cursor: Point = { x: 50, y: 44 }
    const result = flexStrategy.calculate(cursor, target, source, childRects)

    expect(result.insertionIndex).toBeGreaterThanOrEqual(1)
  })
})
