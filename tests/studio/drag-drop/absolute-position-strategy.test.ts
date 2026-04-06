/**
 * AbsolutePositionStrategy Tests
 *
 * Tests for the strategy that handles drops on positioned (stacked) containers.
 * Verifies cursor-to-position calculation, scroll compensation, and visual hints.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AbsolutePositionStrategy } from '../../../studio/drag-drop/strategies/absolute-position'
import {
  createMockDropTarget,
  createMockFlexTarget,
  createMockPaletteSource,
  createMockCanvasSource,
  createMockElement,
  createRect,
} from '../../utils/mocks/drag-drop-mocks'
import type { DropTarget, DragSource, Point, Size } from '../../../studio/drag-drop/types'

describe('AbsolutePositionStrategy', () => {
  let strategy: AbsolutePositionStrategy

  beforeEach(() => {
    strategy = new AbsolutePositionStrategy()
  })

  // ============================================
  // matches() tests
  // ============================================

  describe('matches()', () => {
    it('returns true for positioned containers', () => {
      const target = createMockDropTarget({ layoutType: 'positioned' })
      expect(strategy.matches(target)).toBe(true)
    })

    it('returns false for flex containers', () => {
      const target = createMockFlexTarget({ layoutType: 'flex' })
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns false for non-container elements', () => {
      const target = createMockDropTarget({ layoutType: 'none' })
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns true for stacked containers with children', () => {
      const target = createMockDropTarget({
        layoutType: 'positioned',
        hasChildren: true,
      })
      expect(strategy.matches(target)).toBe(true)
    })

    it('returns true for stacked containers without children', () => {
      const target = createMockDropTarget({
        layoutType: 'positioned',
        hasChildren: false,
      })
      expect(strategy.matches(target)).toBe(true)
    })
  })

  // ============================================
  // calculate() tests
  // ============================================

  describe('calculate()', () => {
    it('calculates position relative to container', () => {
      // Container at (100, 100) with 400x300 size
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      // Cursor at (300, 200) - center of container
      const cursor: Point = { x: 300, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)

      // Expected: x = 300 - 100 - 50 = 150, y = 200 - 100 - 20 = 80
      // (cursor - container.left - ghostWidth/2, cursor - container.top - ghostHeight/2)
      expect(result.placement).toBe('absolute')
      expect(result.position).toBeDefined()
      expect(result.position!.x).toBe(150)
      expect(result.position!.y).toBe(80)
    })

    it('centers ghost on cursor position', () => {
      const element = createMockElement(
        createRect(0, 0, 500, 400),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const cursor: Point = { x: 200, y: 150 }
      const ghostSize: Size = { width: 80, height: 60 }
      const source = createMockPaletteSource({ size: ghostSize })

      const result = strategy.calculate(cursor, target, source)

      // Ghost should be centered: x = 200 - 40 = 160, y = 150 - 30 = 120
      expect(result.position!.x).toBe(160)
      expect(result.position!.y).toBe(120)
    })

    it('compensates for container scroll offset', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 50, top: 30 } // Container is scrolled
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const cursor: Point = { x: 200, y: 180 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)

      // Position should include scroll offset
      // x = (200 - 100 + 50) - 50 = 100
      // y = (180 - 100 + 30) - 20 = 90
      expect(result.position!.x).toBe(100)
      expect(result.position!.y).toBe(90)
    })

    it('clamps position to non-negative values', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      // Cursor near container edge
      const cursor: Point = { x: 110, y: 110 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)

      // Would be negative without clamping: x = 10 - 50 = -40
      // Should be clamped to 0
      expect(result.position!.x).toBeGreaterThanOrEqual(0)
      expect(result.position!.y).toBeGreaterThanOrEqual(0)
    })

    it('uses default ghost size when source has no size', () => {
      const element = createMockElement(
        createRect(0, 0, 400, 300),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const cursor: Point = { x: 200, y: 150 }
      const source = createMockPaletteSource({ size: undefined })

      const result = strategy.calculate(cursor, target, source)

      // Default ghost size is 100x40
      // x = 200 - 50 = 150, y = 150 - 20 = 130
      expect(result.position!.x).toBe(150)
      expect(result.position!.y).toBe(130)
      expect(result.ghostSize).toEqual({ width: 100, height: 40 })
    })

    it('returns target nodeId in result', () => {
      const target = createMockDropTarget({ nodeId: 'stacked-container-1' })
      const cursor: Point = { x: 200, y: 200 }
      const source = createMockPaletteSource()

      const result = strategy.calculate(cursor, target, source)

      expect(result.targetId).toBe('stacked-container-1')
    })

    it('includes target in result', () => {
      const target = createMockDropTarget()
      const cursor: Point = { x: 200, y: 200 }
      const source = createMockPaletteSource()

      const result = strategy.calculate(cursor, target, source)

      expect(result.target).toBe(target)
    })

    it('stores ghostSize in result for visual hint', () => {
      const target = createMockDropTarget()
      const cursor: Point = { x: 200, y: 200 }
      const ghostSize: Size = { width: 120, height: 80 }
      const source = createMockPaletteSource({ size: ghostSize })

      const result = strategy.calculate(cursor, target, source)

      expect(result.ghostSize).toEqual(ghostSize)
    })
  })

  // ============================================
  // getVisualHint() tests
  // ============================================

  describe('getVisualHint()', () => {
    it('returns ghost type hint for absolute placement', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })
      const cursor: Point = { x: 250, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)
      const hint = strategy.getVisualHint(result)

      expect(hint).not.toBeNull()
      expect(hint!.type).toBe('ghost')
    })

    it('returns null for non-absolute placements', () => {
      const target = createMockDropTarget()
      const result = {
        target,
        placement: 'inside' as const,
        targetId: '1',
      }

      const hint = strategy.getVisualHint(result)

      expect(hint).toBeNull()
    })

    it('returns null when position is missing', () => {
      const target = createMockDropTarget()
      const result = {
        target,
        placement: 'absolute' as const,
        targetId: '1',
        position: undefined,
      }

      const hint = strategy.getVisualHint(result)

      expect(hint).toBeNull()
    })

    it('calculates viewport coordinates for ghost rect', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })
      const cursor: Point = { x: 250, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)
      const hint = strategy.getVisualHint(result)

      // The hint rect should be in viewport coordinates
      // position.x = 100, position.y = 80 (from calculate)
      // viewport.x = 100 + 100 - 0 = 200, viewport.y = 100 + 80 - 0 = 180
      expect(hint!.rect.x).toBe(200)
      expect(hint!.rect.y).toBe(180)
    })

    it('includes ghost size in hint', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })
      const cursor: Point = { x: 250, y: 200 }
      const ghostSize: Size = { width: 120, height: 60 }
      const source = createMockPaletteSource({ size: ghostSize })

      const result = strategy.calculate(cursor, target, source)
      const hint = strategy.getVisualHint(result)

      expect(hint!.rect.width).toBe(120)
      expect(hint!.rect.height).toBe(60)
      expect(hint!.ghostSize).toEqual(ghostSize)
    })

    it('adjusts viewport coordinates for scroll offset', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 20, top: 15 } // Container is scrolled
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })
      const cursor: Point = { x: 250, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)
      const hint = strategy.getVisualHint(result)

      // The result.position includes scroll (for code)
      // But hint rect should be in viewport coordinates (subtract scroll back)
      // So ghost appears where cursor is, not shifted by scroll
      expect(hint).not.toBeNull()
    })
  })
})
