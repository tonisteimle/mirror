/**
 * FlexWithChildrenStrategy Tests
 *
 * Tests for the strategy that handles drops on flex containers with children.
 * Covers UC-ADD-02, UC-ADD-03, UC-ADD-04, UC-CHILD-02 from drag-drop-use-cases.md.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  FlexWithChildrenStrategy,
  calculateGapMidpointRect,
} from '../../../studio/drag-drop/strategies/flex-with-children'
import {
  createMockFlexTarget,
  createMockPaletteSource,
  createMockCanvasSource,
  createMockElement,
  createRect,
} from '../../utils/mocks/drag-drop-mocks'
import type { ChildRect } from '../../../studio/drag-drop/strategies/types'
import type { Point, Rect } from '../../../studio/drag-drop/types'

describe('FlexWithChildrenStrategy', () => {
  let strategy: FlexWithChildrenStrategy

  beforeEach(() => {
    strategy = new FlexWithChildrenStrategy()
  })

  // ============================================
  // matches() tests
  // ============================================

  describe('matches()', () => {
    it('returns true for flex containers with children', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
      })
      expect(strategy.matches(target)).toBe(true)
    })

    it('returns false for flex containers without children', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
      })
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns false for positioned containers', () => {
      const target = createMockFlexTarget({
        layoutType: 'positioned',
        hasChildren: true,
      })
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns false for non-container elements', () => {
      const target = createMockFlexTarget({
        layoutType: 'none',
        hasChildren: false,
      })
      expect(strategy.matches(target)).toBe(false)
    })
  })

  // ============================================
  // UC-ADD-02: Insert between children (vertical)
  // ============================================

  describe('UC-ADD-02: Insert between children (vertical)', () => {
    it('calculates insertionIndex=1 when cursor is between first two children', () => {
      // ARRANGE: Two children stacked vertically with gap
      // Child A: y=0, height=40 (midpoint = 20)
      // Child B: y=48, height=40 (midpoint = 68)
      const childRects: ChildRect[] = [
        { nodeId: 'btn-a', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'btn-b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // ACT: Cursor at y=44 (between children, in the gap area)
      const cursor: Point = { x: 50, y: 44 }
      const result = strategy.calculate(cursor, target, source, childRects)

      // ASSERT: Should insert after child A (index 0), making insertionIndex = 1
      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('btn-a')
      expect(result.insertionIndex).toBe(1)
    })

    it('calculates insertionIndex=0 when cursor is above first child', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'btn-a', rect: { x: 0, y: 20, width: 100, height: 40 } },
        { nodeId: 'btn-b', rect: { x: 0, y: 68, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at y=10 (above first child's midpoint of 40)
      const cursor: Point = { x: 50, y: 10 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('before')
      expect(result.targetId).toBe('btn-a')
      expect(result.insertionIndex).toBe(0)
    })

    it('calculates insertionIndex=2 when cursor is between second and third child', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'child-0', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'child-1', rect: { x: 0, y: 48, width: 100, height: 40 } },
        { nodeId: 'child-2', rect: { x: 0, y: 96, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at y=92 (between child-1 and child-2)
      const cursor: Point = { x: 50, y: 92 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('child-1')
      expect(result.insertionIndex).toBe(2)
    })
  })

  // ============================================
  // UC-ADD-03: Insert at end
  // ============================================

  describe('UC-ADD-03: Insert at end of list', () => {
    it('calculates insertionIndex=N when cursor is below last child', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'item-0', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'item-1', rect: { x: 0, y: 48, width: 100, height: 40 } },
        { nodeId: 'item-2', rect: { x: 0, y: 96, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at y=150 (below last child's midpoint of 116)
      const cursor: Point = { x: 50, y: 150 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('item-2')
      expect(result.insertionIndex).toBe(3) // N = 3 children
    })

    it('places after last child when cursor is just below its midpoint', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'item-0', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'item-1', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at y=70 (just above last child's midpoint of 68)
      // Should still be "after" child-1 since closest child is child-1
      const cursor: Point = { x: 50, y: 70 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.targetId).toBe('item-1')
      expect(result.placement).toBe('after')
      expect(result.insertionIndex).toBe(2)
    })
  })

  // ============================================
  // UC-ADD-04: Horizontal insertion
  // ============================================

  describe('UC-ADD-04: Horizontal container insertion', () => {
    it('calculates insertionIndex based on x-axis for horizontal layout', () => {
      // Horizontal layout: children side by side
      const childRects: ChildRect[] = [
        { nodeId: 'btn-a', rect: { x: 0, y: 0, width: 80, height: 40 } },
        { nodeId: 'btn-b', rect: { x: 88, y: 0, width: 80, height: 40 } },
        { nodeId: 'btn-c', rect: { x: 176, y: 0, width: 80, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'horizontal',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at x=84 (between btn-a and btn-b, in the gap)
      const cursor: Point = { x: 84, y: 20 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('btn-a')
      expect(result.insertionIndex).toBe(1)
    })

    it('inserts at beginning when cursor is left of first child', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'btn-a', rect: { x: 20, y: 0, width: 80, height: 40 } },
        { nodeId: 'btn-b', rect: { x: 108, y: 0, width: 80, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'horizontal',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at x=10 (left of first child's midpoint of 60)
      const cursor: Point = { x: 10, y: 20 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('before')
      expect(result.targetId).toBe('btn-a')
      expect(result.insertionIndex).toBe(0)
    })

    it('inserts at end when cursor is right of last child', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'btn-a', rect: { x: 0, y: 0, width: 80, height: 40 } },
        { nodeId: 'btn-b', rect: { x: 88, y: 0, width: 80, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'horizontal',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at x=200 (right of last child's midpoint of 128)
      const cursor: Point = { x: 200, y: 20 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.placement).toBe('after')
      expect(result.targetId).toBe('btn-b')
      expect(result.insertionIndex).toBe(2)
    })
  })

  // ============================================
  // UC-CHILD-02: Midpoint calculation
  // ============================================

  describe('UC-CHILD-02: Midpoint-based index calculation', () => {
    it('determines before/after based on child midpoint (vertical)', () => {
      // Child at y=50, height=40 → midpoint = 70
      const childRects: ChildRect[] = [
        { nodeId: 'child', rect: { x: 0, y: 50, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at y=65 (before midpoint of 70)
      let cursor: Point = { x: 50, y: 65 }
      let result = strategy.calculate(cursor, target, source, childRects)
      expect(result.placement).toBe('before')
      expect(result.insertionIndex).toBe(0)

      // Cursor at y=75 (after midpoint of 70)
      cursor = { x: 50, y: 75 }
      result = strategy.calculate(cursor, target, source, childRects)
      expect(result.placement).toBe('after')
      expect(result.insertionIndex).toBe(1)
    })

    it('determines before/after based on child midpoint (horizontal)', () => {
      // Child at x=100, width=80 → midpoint = 140
      const childRects: ChildRect[] = [
        { nodeId: 'child', rect: { x: 100, y: 0, width: 80, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'horizontal',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at x=130 (before midpoint of 140)
      let cursor: Point = { x: 130, y: 20 }
      let result = strategy.calculate(cursor, target, source, childRects)
      expect(result.placement).toBe('before')
      expect(result.insertionIndex).toBe(0)

      // Cursor at x=150 (after midpoint of 140)
      cursor = { x: 150, y: 20 }
      result = strategy.calculate(cursor, target, source, childRects)
      expect(result.placement).toBe('after')
      expect(result.insertionIndex).toBe(1)
    })

    it('finds closest child when multiple children exist', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } }, // midpoint y=20
        { nodeId: 'b', rect: { x: 0, y: 60, width: 100, height: 40 } }, // midpoint y=80
        { nodeId: 'c', rect: { x: 0, y: 120, width: 100, height: 40 } }, // midpoint y=140
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      // Cursor at y=90 - closest to child 'b' (midpoint 80)
      const cursor: Point = { x: 50, y: 90 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.targetId).toBe('b')
      expect(result.placement).toBe('after') // y=90 > midpoint 80
    })
  })

  // ============================================
  // No-op detection
  // ============================================

  describe('No-op detection (same position moves)', () => {
    it('detects no-op when moving element to same position', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
        { nodeId: 'c', rect: { x: 0, y: 96, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })

      // Source is 'b' (index 1)
      const source = createMockCanvasSource({ nodeId: 'b' })

      // Cursor at y=68 (on child 'b' midpoint) → would insert at index 1 or 2
      // This is a no-op since 'b' is already at index 1
      const cursor: Point = { x: 50, y: 68 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.isNoOp).toBe(true)
    })

    it('detects no-op when moving element just after itself', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
        { nodeId: 'c', rect: { x: 0, y: 96, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })

      // Source is 'b' (index 1)
      const source = createMockCanvasSource({ nodeId: 'b' })

      // Cursor at y=70 (just after 'b' midpoint) → insertionIndex = 2
      // This is a no-op since inserting at index 2 when source is at 1 means same position
      const cursor: Point = { x: 50, y: 70 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.isNoOp).toBe(true)
    })

    it('does not mark as no-op when actually moving element', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
        { nodeId: 'c', rect: { x: 0, y: 96, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })

      // Source is 'a' (index 0)
      const source = createMockCanvasSource({ nodeId: 'a' })

      // Cursor at y=116 (on child 'c' midpoint) → insertionIndex = 3
      // This is NOT a no-op since 'a' would move from 0 to 3
      const cursor: Point = { x: 50, y: 120 }
      const result = strategy.calculate(cursor, target, source, childRects)

      expect(result.isNoOp).toBe(false)
    })

    it('does not mark palette drops as no-op', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })

      // Palette source (new element, not existing)
      const source = createMockPaletteSource()

      const cursor: Point = { x: 50, y: 44 }
      const result = strategy.calculate(cursor, target, source, childRects)

      // For palette sources, isNoOp is false (not true) since it's not moving an existing element
      expect(result.isNoOp).toBeFalsy()
    })
  })

  // ============================================
  // getVisualHint() tests
  // ============================================

  describe('getVisualHint()', () => {
    it('returns line type hint for vertical layout', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 10, y: 10, width: 100, height: 40 } },
        { nodeId: 'b', rect: { x: 10, y: 58, width: 100, height: 40 } },
      ]
      const containerRect: Rect = { x: 0, y: 0, width: 120, height: 120 }
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      const cursor: Point = { x: 50, y: 54 }
      const result = strategy.calculate(cursor, target, source, childRects)
      const hint = strategy.getVisualHint(result, childRects, containerRect)

      expect(hint).not.toBeNull()
      expect(hint!.type).toBe('line')
      expect(hint!.direction).toBe('horizontal')
    })

    it('returns line type hint for horizontal layout', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 10, y: 10, width: 80, height: 40 } },
        { nodeId: 'b', rect: { x: 98, y: 10, width: 80, height: 40 } },
      ]
      const containerRect: Rect = { x: 0, y: 0, width: 200, height: 60 }
      const target = createMockFlexTarget({
        direction: 'horizontal',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      const cursor: Point = { x: 94, y: 30 }
      const result = strategy.calculate(cursor, target, source, childRects)
      const hint = strategy.getVisualHint(result, childRects, containerRect)

      expect(hint).not.toBeNull()
      expect(hint!.type).toBe('line')
      expect(hint!.direction).toBe('vertical')
    })

    it('returns null for no-op positions', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'a', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'b', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockCanvasSource({ nodeId: 'a' })

      // Moving 'a' to position after 'a' (no-op)
      const cursor: Point = { x: 50, y: 25 }
      const result = strategy.calculate(cursor, target, source, childRects)
      const hint = strategy.getVisualHint(result, childRects, containerRect)

      expect(hint).toBeNull()
    })

    it('returns outline hint when no child rects available', () => {
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      const cursor: Point = { x: 50, y: 50 }
      const result = strategy.calculate(cursor, target, source, [])
      const containerRect: Rect = { x: 0, y: 0, width: 100, height: 100 }
      const hint = strategy.getVisualHint(result, [], containerRect)

      expect(hint!.type).toBe('outline')
    })
  })

  // ============================================
  // Fallback behavior
  // ============================================

  describe('Fallback behavior', () => {
    it('returns inside placement with index 0 when no child rects', () => {
      const target = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: true,
      })
      const source = createMockPaletteSource()

      const cursor: Point = { x: 50, y: 50 }
      const result = strategy.calculate(cursor, target, source, [])

      expect(result.placement).toBe('inside')
      expect(result.insertionIndex).toBe(0)
    })
  })
})

// ============================================
// calculateGapMidpointRect() tests
// ============================================

describe('calculateGapMidpointRect()', () => {
  it('calculates line at first child edge for insertionIndex 0', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 10, y: 20, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 10, y: 68, width: 100, height: 40 } },
    ]
    const containerRect: Rect = { x: 0, y: 0, width: 120, height: 120 }

    const lineRect = calculateGapMidpointRect(childRects, 0, true, containerRect)

    // Line should be at top edge of first child (y=20)
    expect(lineRect.y).toBeCloseTo(20 - 1, 0) // thickness/2 = 1
    expect(lineRect.width).toBe(containerRect.width)
    expect(lineRect.height).toBe(2) // default thickness
  })

  it('calculates line at gap midpoint for middle insertion', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 10, y: 10, width: 100, height: 40 } }, // bottom at 50
      { nodeId: 'b', rect: { x: 10, y: 58, width: 100, height: 40 } }, // top at 58
    ]
    const containerRect: Rect = { x: 0, y: 0, width: 120, height: 120 }

    const lineRect = calculateGapMidpointRect(childRects, 1, true, containerRect)

    // Gap midpoint = (50 + 58) / 2 = 54
    expect(lineRect.y).toBeCloseTo(54 - 1, 0)
  })

  it('calculates line at last child edge for insertionIndex N', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 10, y: 10, width: 100, height: 40 } },
      { nodeId: 'b', rect: { x: 10, y: 58, width: 100, height: 40 } }, // bottom at 98
    ]
    const containerRect: Rect = { x: 0, y: 0, width: 120, height: 120 }

    const lineRect = calculateGapMidpointRect(childRects, 2, true, containerRect)

    // Line should be at bottom edge of last child (y=98)
    expect(lineRect.y).toBeCloseTo(98 - 1, 0)
  })

  it('calculates vertical line for horizontal layout', () => {
    const childRects: ChildRect[] = [
      { nodeId: 'a', rect: { x: 10, y: 10, width: 80, height: 40 } }, // right at 90
      { nodeId: 'b', rect: { x: 98, y: 10, width: 80, height: 40 } }, // left at 98
    ]
    const containerRect: Rect = { x: 0, y: 0, width: 200, height: 60 }

    const lineRect = calculateGapMidpointRect(childRects, 1, false, containerRect)

    // Gap midpoint = (90 + 98) / 2 = 94
    expect(lineRect.x).toBeCloseTo(94 - 1, 0)
    expect(lineRect.height).toBe(containerRect.height)
    expect(lineRect.width).toBe(2) // default thickness
  })
})
