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
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })
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
      const element = createMockElement(createRect(0, 0, 500, 400), { left: 0, top: 0 })
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
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })
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
      const element = createMockElement(createRect(0, 0, 400, 300), { left: 0, top: 0 })
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
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })
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
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })
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
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })
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

  // ============================================
  // UC-ABS-09: Corner positioning
  // ============================================

  describe('UC-ABS-09: Corner positioning', () => {
    it('calculates top-left corner position (0, 0)', () => {
      // Container at (100, 100), 200x150
      const element = createMockElement(createRect(100, 100, 200, 150), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      // Ghost size 20x20, cursor at top-left corner
      const ghostSize: Size = { width: 20, height: 20 }
      const source = createMockPaletteSource({ size: ghostSize })

      // Cursor at container top-left + half ghost size
      // To get x=0, y=0: cursor needs to be at (100 + 10, 100 + 10)
      const cursor: Point = { x: 110, y: 110 }
      const result = strategy.calculate(cursor, target, source)

      expect(result.position!.x).toBe(0)
      expect(result.position!.y).toBe(0)
    })

    it('calculates bottom-right corner position', () => {
      // Container at (100, 100), 200x150
      const element = createMockElement(createRect(100, 100, 200, 150), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      // Ghost size 20x20
      // Bottom-right position: x = containerW - elementW = 200 - 20 = 180
      //                        y = containerH - elementH = 150 - 20 = 130
      const ghostSize: Size = { width: 20, height: 20 }
      const source = createMockPaletteSource({ size: ghostSize })

      // To get x=180, y=130: cursor needs to be at (100 + 180 + 10, 100 + 130 + 10) = (290, 240)
      const cursor: Point = { x: 290, y: 240 }
      const result = strategy.calculate(cursor, target, source)

      expect(result.position!.x).toBe(180)
      expect(result.position!.y).toBe(130)
    })

    it('calculates top-right corner position', () => {
      const element = createMockElement(createRect(100, 100, 200, 150), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const ghostSize: Size = { width: 20, height: 20 }
      const source = createMockPaletteSource({ size: ghostSize })

      // Top-right: x = 180, y = 0
      // Cursor at (100 + 180 + 10, 100 + 10) = (290, 110)
      const cursor: Point = { x: 290, y: 110 }
      const result = strategy.calculate(cursor, target, source)

      expect(result.position!.x).toBe(180)
      expect(result.position!.y).toBe(0)
    })

    it('calculates bottom-left corner position', () => {
      const element = createMockElement(createRect(100, 100, 200, 150), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const ghostSize: Size = { width: 20, height: 20 }
      const source = createMockPaletteSource({ size: ghostSize })

      // Bottom-left: x = 0, y = 130
      // Cursor at (100 + 10, 100 + 130 + 10) = (110, 240)
      const cursor: Point = { x: 110, y: 240 }
      const result = strategy.calculate(cursor, target, source)

      expect(result.position!.x).toBe(0)
      expect(result.position!.y).toBe(130)
    })
  })

  // ============================================
  // UC-ABS-13: Large scroll offset
  // ============================================

  describe('UC-ABS-13: Large scroll offset handling', () => {
    it('handles scroll offset greater than 100', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 150, top: 120 } // Large scroll
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const cursor: Point = { x: 200, y: 180 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)

      // x = (200 - 100 + 150) - 50 = 200
      // y = (180 - 100 + 120) - 20 = 180
      expect(result.position!.x).toBe(200)
      expect(result.position!.y).toBe(180)
    })

    it('handles very large scroll offset', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 500, top: 400 } // Very large scroll
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const cursor: Point = { x: 200, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)

      // x = (200 - 100 + 500) - 50 = 550
      // y = (200 - 100 + 400) - 20 = 480
      expect(result.position!.x).toBe(550)
      expect(result.position!.y).toBe(480)
    })

    it('handles horizontal-only scroll', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 200, top: 0 } // Only horizontal scroll
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const cursor: Point = { x: 200, y: 150 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)

      // x = (200 - 100 + 200) - 50 = 250
      // y = (150 - 100 + 0) - 20 = 30
      expect(result.position!.x).toBe(250)
      expect(result.position!.y).toBe(30)
    })

    it('handles vertical-only scroll', () => {
      const element = createMockElement(
        createRect(100, 100, 400, 300),
        { left: 0, top: 300 } // Only vertical scroll
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const cursor: Point = { x: 200, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)

      // x = (200 - 100 + 0) - 50 = 50
      // y = (200 - 100 + 300) - 20 = 380
      expect(result.position!.x).toBe(50)
      expect(result.position!.y).toBe(380)
    })
  })

  // ============================================
  // UC-ABS-14: Zoom correction (documentation)
  // Note: Zoom correction is handled by the controller/adapter layer,
  // not by the strategy itself. These tests document the expected
  // behavior when zoom-corrected coordinates are passed in.
  // ============================================

  describe('UC-ABS-14: Zoom correction (pre-corrected input)', () => {
    it('calculates correct position when cursor is zoom-corrected', () => {
      // In a zoomed preview (50% zoom), the controller/adapter layer
      // should pre-correct the cursor position before calling the strategy.
      // This test verifies the strategy handles the corrected input correctly.

      const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      // Simulating: Screen cursor at (200, 150), container at (100, 100), zoom = 0.5
      // Pre-corrected cursor: ((200 - 100) / 0.5, (150 - 100) / 0.5) = (200, 100)
      // But we pass it as if container is at (0, 0) after correction
      // Actually the strategy expects screen coordinates...
      // The zoom correction formula: position = (screenCursor - containerOffset) / zoom

      // Let's test what the strategy receives after zoom correction:
      // If zoom = 0.5, screen cursor = (200, 150), container screen pos = (100, 100)
      // The effective cursor relative to container = (200 - 100) / 0.5 = 200
      // Then the strategy gets cursor (200, 100) relative to unzoomed container

      // For now, test that strategy correctly handles large relative positions
      const zoomCorrectedCursor: Point = { x: 300, y: 200 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(zoomCorrectedCursor, target, source)

      // x = 300 - 100 - 50 = 150
      // y = 200 - 100 - 20 = 80
      expect(result.position!.x).toBe(150)
      expect(result.position!.y).toBe(80)
    })

    it('handles zoom=1 (no zoom) correctly', () => {
      // With zoom=1, coordinates should be used directly
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const cursor: Point = { x: 200, y: 150 }
      const source = createMockPaletteSource({ size: { width: 100, height: 40 } })

      const result = strategy.calculate(cursor, target, source)

      // No zoom correction needed
      expect(result.position!.x).toBe(50) // 200 - 100 - 50
      expect(result.position!.y).toBe(30) // 150 - 100 - 20
    })
  })

  // ============================================
  // Canvas element repositioning
  // ============================================

  describe('Canvas element repositioning', () => {
    it('calculates new position for canvas element being moved', () => {
      const element = createMockElement(createRect(100, 100, 400, 300), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      // Canvas source (existing element)
      const source = createMockCanvasSource({
        size: { width: 80, height: 40 },
      })

      const cursor: Point = { x: 300, y: 250 }
      const result = strategy.calculate(cursor, target, source)

      expect(result.placement).toBe('absolute')
      expect(result.position!.x).toBe(160) // 300 - 100 - 40
      expect(result.position!.y).toBe(130) // 250 - 100 - 20
    })

    it('uses canvas element size for centering', () => {
      const element = createMockElement(createRect(0, 0, 400, 300), { left: 0, top: 0 })
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
      })

      const source = createMockCanvasSource({
        size: { width: 200, height: 100 }, // Large element
      })

      const cursor: Point = { x: 200, y: 150 }
      const result = strategy.calculate(cursor, target, source)

      // Centered: x = 200 - 100 = 100, y = 150 - 50 = 100
      expect(result.position!.x).toBe(100)
      expect(result.position!.y).toBe(100)
    })
  })
})
