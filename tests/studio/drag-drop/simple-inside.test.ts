/**
 * SimpleInsideStrategy Tests
 *
 * Tests for the strategy that handles drops on empty flex containers.
 * Covers UC-ADD-01, UC-CHILD-04 from drag-drop-use-cases.md.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SimpleInsideStrategy } from '../../../studio/drag-drop/strategies/simple-inside'
import {
  createMockFlexTarget,
  createMockDropTarget,
  createMockPaletteSource,
  createMockElement,
  createRect,
} from '../../utils/mocks/drag-drop-mocks'
import type { Point, Rect } from '../../../studio/drag-drop/types'

describe('SimpleInsideStrategy', () => {
  let strategy: SimpleInsideStrategy

  beforeEach(() => {
    strategy = new SimpleInsideStrategy()
  })

  // ============================================
  // matches() tests
  // ============================================

  describe('matches()', () => {
    it('returns true for empty flex containers', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
      })
      expect(strategy.matches(target)).toBe(true)
    })

    it('returns false for flex containers with children', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
      })
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns false for positioned containers (even if empty)', () => {
      const target = createMockDropTarget({
        layoutType: 'positioned',
        hasChildren: false,
      })
      expect(strategy.matches(target)).toBe(false)
    })

    it('returns false for positioned containers with children', () => {
      const target = createMockDropTarget({
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
  // UC-ADD-01: Primitives in leeren Container droppen
  // ============================================

  describe('UC-ADD-01: Drop primitive in empty flex container', () => {
    it('always returns inside placement with insertionIndex 0', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
        nodeId: 'empty-frame',
      })
      const source = createMockPaletteSource({ componentName: 'Button' })

      // Test with various cursor positions
      const positions: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 50 },
        { x: 200, y: 200 },
        { x: -10, y: -10 },
      ]

      for (const cursor of positions) {
        const result = strategy.calculate(cursor, target, source)

        expect(result.placement).toBe('inside')
        expect(result.targetId).toBe('empty-frame')
        expect(result.insertionIndex).toBe(0)
      }
    })

    it('ignores cursor position completely', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
      })
      const source = createMockPaletteSource()

      // Two very different cursor positions should produce same result
      const result1 = strategy.calculate({ x: 0, y: 0 }, target, source)
      const result2 = strategy.calculate({ x: 1000, y: 1000 }, target, source)

      expect(result1.placement).toBe(result2.placement)
      expect(result1.insertionIndex).toBe(result2.insertionIndex)
    })

    it('returns correct target in result', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
        nodeId: 'my-empty-container',
      })
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 50 }, target, source)

      expect(result.target).toBe(target)
      expect(result.targetId).toBe('my-empty-container')
    })
  })

  // ============================================
  // UC-CHILD-04: Leerer Container
  // ============================================

  describe('UC-CHILD-04: Empty container always uses index 0', () => {
    it('returns insertionIndex 0 regardless of container size', () => {
      // Small container
      const smallElement = createMockElement(
        createRect(0, 0, 50, 50),
        { left: 0, top: 0 }
      )
      const smallTarget = createMockFlexTarget({
        element: smallElement as unknown as HTMLElement,
        hasChildren: false,
      })

      // Large container
      const largeElement = createMockElement(
        createRect(0, 0, 1000, 1000),
        { left: 0, top: 0 }
      )
      const largeTarget = createMockFlexTarget({
        element: largeElement as unknown as HTMLElement,
        hasChildren: false,
      })

      const source = createMockPaletteSource()
      const cursor: Point = { x: 50, y: 50 }

      const smallResult = strategy.calculate(cursor, smallTarget, source)
      const largeResult = strategy.calculate(cursor, largeTarget, source)

      expect(smallResult.insertionIndex).toBe(0)
      expect(largeResult.insertionIndex).toBe(0)
    })

    it('returns insertionIndex 0 for both vertical and horizontal containers', () => {
      const vertTarget = createMockFlexTarget({
        direction: 'vertical',
        hasChildren: false,
      })
      const horTarget = createMockFlexTarget({
        direction: 'horizontal',
        hasChildren: false,
      })
      const source = createMockPaletteSource()
      const cursor: Point = { x: 50, y: 50 }

      const vertResult = strategy.calculate(cursor, vertTarget, source)
      const horResult = strategy.calculate(cursor, horTarget, source)

      expect(vertResult.insertionIndex).toBe(0)
      expect(horResult.insertionIndex).toBe(0)
    })
  })

  // ============================================
  // getVisualHint() tests
  // ============================================

  describe('getVisualHint()', () => {
    it('returns outline type hint', () => {
      const element = createMockElement(
        createRect(100, 100, 200, 150),
        { left: 0, top: 0 }
      )
      const target = createMockFlexTarget({
        element: element as unknown as HTMLElement,
        hasChildren: false,
      })
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 150, y: 150 }, target, source)
      const containerRect: Rect = { x: 100, y: 100, width: 200, height: 150 }
      const hint = strategy.getVisualHint(result, undefined, containerRect)

      expect(hint.type).toBe('outline')
      expect(hint.rect).toEqual(containerRect)
    })

    it('uses containerRect when provided', () => {
      const element = createMockElement(
        createRect(0, 0, 100, 100),
        { left: 0, top: 0 }
      )
      const target = createMockFlexTarget({
        element: element as unknown as HTMLElement,
        hasChildren: false,
      })
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 50 }, target, source)
      const containerRect: Rect = { x: 50, y: 50, width: 300, height: 200 }
      const hint = strategy.getVisualHint(result, undefined, containerRect)

      expect(hint.rect).toEqual(containerRect)
    })

    it('uses layoutInfo when available and no containerRect', () => {
      const element = createMockElement(
        createRect(0, 0, 100, 100),
        { left: 0, top: 0 }
      )
      const target = createMockFlexTarget({
        element: element as unknown as HTMLElement,
        hasChildren: false,
        nodeId: 'my-container',
      })
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 50 }, target, source)

      // Create layoutInfo with cached rect
      const layoutInfo = new Map([
        ['my-container', { x: 25, y: 25, width: 250, height: 175, children: [] }],
      ])

      const hint = strategy.getVisualHint(result, undefined, undefined, layoutInfo)

      expect(hint.type).toBe('outline')
      expect(hint.rect).toEqual({ x: 25, y: 25, width: 250, height: 175 })
    })

    it('falls back to DOM rect when no containerRect or layoutInfo', () => {
      const element = createMockElement(
        createRect(10, 20, 80, 60),
        { left: 0, top: 0 }
      )
      const target = createMockFlexTarget({
        element: element as unknown as HTMLElement,
        hasChildren: false,
      })
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 50, y: 50 }, target, source)
      const hint = strategy.getVisualHint(result)

      expect(hint.type).toBe('outline')
      expect(hint.rect.x).toBe(10)
      expect(hint.rect.y).toBe(20)
      expect(hint.rect.width).toBe(80)
      expect(hint.rect.height).toBe(60)
    })
  })

  // ============================================
  // Edge cases
  // ============================================

  describe('Edge cases', () => {
    it('handles container with zero dimensions', () => {
      const element = createMockElement(
        createRect(100, 100, 0, 0),
        { left: 0, top: 0 }
      )
      const target = createMockFlexTarget({
        element: element as unknown as HTMLElement,
        hasChildren: false,
      })
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 100, y: 100 }, target, source)

      expect(result.placement).toBe('inside')
      expect(result.insertionIndex).toBe(0)
    })

    it('handles negative container positions', () => {
      const element = createMockElement(
        createRect(-50, -50, 100, 100),
        { left: 0, top: 0 }
      )
      const target = createMockFlexTarget({
        element: element as unknown as HTMLElement,
        hasChildren: false,
      })
      const source = createMockPaletteSource()

      const result = strategy.calculate({ x: 0, y: 0 }, target, source)

      expect(result.placement).toBe('inside')
      expect(result.insertionIndex).toBe(0)
    })

    it('works with different source types', () => {
      const target = createMockFlexTarget({
        hasChildren: false,
      })

      // Palette source
      const paletteSource = createMockPaletteSource({ componentName: 'Frame' })
      const paletteResult = strategy.calculate({ x: 50, y: 50 }, target, paletteSource)
      expect(paletteResult.insertionIndex).toBe(0)

      // Different component names
      const buttonSource = createMockPaletteSource({ componentName: 'Button' })
      const textSource = createMockPaletteSource({ componentName: 'Text' })

      const buttonResult = strategy.calculate({ x: 50, y: 50 }, target, buttonSource)
      const textResult = strategy.calculate({ x: 50, y: 50 }, target, textSource)

      expect(buttonResult.insertionIndex).toBe(0)
      expect(textResult.insertionIndex).toBe(0)
    })
  })
})
