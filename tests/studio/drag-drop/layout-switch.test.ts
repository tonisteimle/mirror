/**
 * Layout Switch Tests
 *
 * Tests for layout context switching during drag operations.
 * Covers UC-ABS-07, UC-ABS-08 from drag-drop-use-cases.md.
 *
 * These tests verify behavior when elements move between different
 * layout contexts (flex ↔ positioned).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FlexWithChildrenStrategy } from '../../../studio/drag-drop/strategies/flex-with-children'
import { SimpleInsideStrategy } from '../../../studio/drag-drop/strategies/simple-inside'
import { AbsolutePositionStrategy } from '../../../studio/drag-drop/strategies/absolute-position'
import { StrategyRegistry } from '../../../studio/drag-drop/strategies/registry'
import {
  createMockFlexTarget,
  createMockDropTarget,
  createMockPaletteSource,
  createMockCanvasSource,
  createMockElement,
  createRect,
} from '../../utils/mocks/drag-drop-mocks'
import type { ChildRect } from '../../../studio/drag-drop/strategies/types'
import type { Point, DropTarget, DropResult } from '../../../studio/drag-drop/types'

describe('Layout Context Switching', () => {
  let flexStrategy: FlexWithChildrenStrategy
  let simpleInsideStrategy: SimpleInsideStrategy
  let absoluteStrategy: AbsolutePositionStrategy
  let registry: StrategyRegistry

  beforeEach(() => {
    flexStrategy = new FlexWithChildrenStrategy()
    simpleInsideStrategy = new SimpleInsideStrategy()
    absoluteStrategy = new AbsolutePositionStrategy()

    registry = new StrategyRegistry()
    registry.register(absoluteStrategy)
    registry.register(flexStrategy)
    registry.register(simpleInsideStrategy)
  })

  // ============================================
  // UC-ABS-07: flex → positioned (adds x/y)
  // ============================================

  describe('UC-ABS-07: Flex to positioned (adds x/y)', () => {
    it('selects AbsolutePositionStrategy for positioned target', () => {
      const target = createMockDropTarget({
        layoutType: 'positioned',
        hasChildren: false,
      })

      const strategy = registry.findStrategy(target)
      expect(strategy?.name).toBe('AbsolutePositionStrategy')
    })

    it('returns absolute placement with position for positioned target', () => {
      const element = createMockElement(
        createRect(0, 0, 300, 200),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      // Canvas source from flex container
      const source = createMockCanvasSource({
        nodeId: 'flex-element',
        size: { width: 100, height: 40 },
      })

      const cursor: Point = { x: 150, y: 100 }
      const result = absoluteStrategy.calculate(cursor, target, source)

      expect(result.placement).toBe('absolute')
      expect(result.position).toBeDefined()
      expect(result.position!.x).toBe(100) // 150 - 50
      expect(result.position!.y).toBe(80)  // 100 - 20
    })

    it('generates ghost visual hint for positioned target', () => {
      const element = createMockElement(
        createRect(0, 0, 300, 200),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const source = createMockCanvasSource({
        size: { width: 100, height: 40 },
      })

      const cursor: Point = { x: 150, y: 100 }
      const result = absoluteStrategy.calculate(cursor, target, source)
      const hint = absoluteStrategy.getVisualHint(result)

      expect(hint?.type).toBe('ghost')
    })

    it('position indicates element needs x/y properties', () => {
      const element = createMockElement(
        createRect(50, 50, 300, 200),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
        nodeId: 'stacked-container',
      })

      const source = createMockCanvasSource({
        nodeId: 'button-from-flex',
        size: { width: 100, height: 40 },
      })

      const cursor: Point = { x: 200, y: 150 }
      const result = absoluteStrategy.calculate(cursor, target, source)

      // The result should indicate absolute positioning
      expect(result.placement).toBe('absolute')
      expect(result.targetId).toBe('stacked-container')

      // Position values that should become x/y properties
      expect(result.position!.x).toBeGreaterThanOrEqual(0)
      expect(result.position!.y).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================
  // UC-ABS-08: positioned → flex (removes x/y)
  // ============================================

  describe('UC-ABS-08: Positioned to flex (removes x/y)', () => {
    it('selects FlexWithChildrenStrategy for flex target with children', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
      })

      const strategy = registry.findStrategy(target)
      expect(strategy?.name).toBe('FlexWithChildrenStrategy')
    })

    it('selects SimpleInsideStrategy for empty flex target', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
      })

      const strategy = registry.findStrategy(target)
      expect(strategy?.name).toBe('SimpleInsideStrategy')
    })

    it('returns inside/before/after placement for flex target (not absolute)', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'item-1', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'item-2', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
        direction: 'vertical',
      })

      // Canvas source from positioned container (has x/y)
      const source = createMockCanvasSource({
        nodeId: 'button-x-100-y-50',
        size: { width: 100, height: 40 },
      })

      const cursor: Point = { x: 50, y: 44 } // Between children
      const result = flexStrategy.calculate(cursor, target, source, childRects)

      // Should NOT be absolute placement
      expect(result.placement).not.toBe('absolute')
      expect(['before', 'after', 'inside']).toContain(result.placement)

      // Should NOT have position (x/y to be removed)
      expect(result.position).toBeUndefined()
    })

    it('generates line visual hint for flex target (not ghost)', () => {
      const childRects: ChildRect[] = [
        { nodeId: 'item-1', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'item-2', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const containerRect = { x: 0, y: 0, width: 100, height: 100 }
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
        direction: 'vertical',
      })

      const source = createMockCanvasSource({
        size: { width: 100, height: 40 },
      })

      const cursor: Point = { x: 50, y: 44 }
      const result = flexStrategy.calculate(cursor, target, source, childRects)
      const hint = flexStrategy.getVisualHint(result, childRects, containerRect)

      // Should be line, not ghost
      expect(hint?.type).toBe('line')
    })

    it('generates outline visual for empty flex target', () => {
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
      })

      const source = createMockCanvasSource({
        nodeId: 'positioned-element',
        size: { width: 100, height: 40 },
      })

      const cursor: Point = { x: 50, y: 50 }
      const result = simpleInsideStrategy.calculate(cursor, target, source)
      const containerRect = { x: 0, y: 0, width: 100, height: 100 }
      const hint = simpleInsideStrategy.getVisualHint(result, undefined, containerRect)

      expect(hint.type).toBe('outline')
    })
  })

  // ============================================
  // Strategy selection based on target layout
  // ============================================

  describe('Strategy selection based on layout type', () => {
    it('correctly routes to different strategies based on layout', () => {
      // Positioned container → AbsolutePositionStrategy
      const positionedTarget = createMockDropTarget({ layoutType: 'positioned' })
      expect(registry.findStrategy(positionedTarget)?.name).toBe('AbsolutePositionStrategy')

      // Flex with children → FlexWithChildrenStrategy
      const flexWithChildrenTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
      })
      expect(registry.findStrategy(flexWithChildrenTarget)?.name).toBe('FlexWithChildrenStrategy')

      // Empty flex → SimpleInsideStrategy
      const emptyFlexTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
      })
      expect(registry.findStrategy(emptyFlexTarget)?.name).toBe('SimpleInsideStrategy')
    })

    it('first matching strategy wins in registration order', () => {
      // AbsolutePositionStrategy is registered first, should match positioned first
      const positioned = createMockDropTarget({ layoutType: 'positioned' })
      const strategy = registry.findStrategy(positioned)
      expect(strategy?.name).toBe('AbsolutePositionStrategy')
    })
  })

  // ============================================
  // Visual feedback switching during drag
  // ============================================

  describe('Visual feedback switching during drag', () => {
    it('ghost hint becomes line hint when moving to flex', () => {
      // Start: Over positioned container → ghost
      const positionedElement = createMockElement(
        createRect(0, 0, 300, 200),
        { left: 0, top: 0 }
      )
      const positionedTarget = createMockDropTarget({
        element: positionedElement as unknown as HTMLElement,
        layoutType: 'positioned',
      })
      const source = createMockCanvasSource({ size: { width: 100, height: 40 } })

      const cursor: Point = { x: 150, y: 100 }
      const absoluteResult = absoluteStrategy.calculate(cursor, positionedTarget, source)
      const ghostHint = absoluteStrategy.getVisualHint(absoluteResult)

      expect(ghostHint?.type).toBe('ghost')

      // Then: Over flex container → line
      const childRects: ChildRect[] = [
        { nodeId: 'item-1', rect: { x: 0, y: 0, width: 100, height: 40 } },
        { nodeId: 'item-2', rect: { x: 0, y: 48, width: 100, height: 40 } },
      ]
      const containerRect = { x: 0, y: 0, width: 100, height: 100 }
      const flexTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
        direction: 'vertical',
      })

      const flexCursor: Point = { x: 50, y: 44 }
      const flexResult = flexStrategy.calculate(flexCursor, flexTarget, source, childRects)
      const lineHint = flexStrategy.getVisualHint(flexResult, childRects, containerRect)

      expect(lineHint?.type).toBe('line')
    })

    it('line hint becomes ghost hint when moving to positioned', () => {
      // Start: Over flex container → line
      const childRects: ChildRect[] = [
        { nodeId: 'item-1', rect: { x: 0, y: 0, width: 100, height: 40 } },
      ]
      const containerRect = { x: 0, y: 0, width: 100, height: 100 }
      const flexTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
        direction: 'vertical',
      })
      const source = createMockCanvasSource({ size: { width: 100, height: 40 } })

      const flexCursor: Point = { x: 50, y: 50 }
      const flexResult = flexStrategy.calculate(flexCursor, flexTarget, source, childRects)
      const lineHint = flexStrategy.getVisualHint(flexResult, childRects, containerRect)

      expect(lineHint?.type).toBe('line')

      // Then: Over positioned container → ghost
      const positionedElement = createMockElement(
        createRect(0, 0, 300, 200),
        { left: 0, top: 0 }
      )
      const positionedTarget = createMockDropTarget({
        element: positionedElement as unknown as HTMLElement,
        layoutType: 'positioned',
      })

      const cursor: Point = { x: 150, y: 100 }
      const absoluteResult = absoluteStrategy.calculate(cursor, positionedTarget, source)
      const ghostHint = absoluteStrategy.getVisualHint(absoluteResult)

      expect(ghostHint?.type).toBe('ghost')
    })
  })

  // ============================================
  // Result structure differences
  // ============================================

  describe('Result structure differences between layouts', () => {
    it('positioned result has position, flex result has insertionIndex', () => {
      const source = createMockCanvasSource({ size: { width: 100, height: 40 } })

      // Positioned result
      const positionedElement = createMockElement(
        createRect(0, 0, 300, 200),
        { left: 0, top: 0 }
      )
      const positionedTarget = createMockDropTarget({
        element: positionedElement as unknown as HTMLElement,
        layoutType: 'positioned',
      })
      const absoluteResult = absoluteStrategy.calculate(
        { x: 150, y: 100 },
        positionedTarget,
        source
      )

      expect(absoluteResult.position).toBeDefined()
      expect(absoluteResult.insertionIndex).toBeUndefined()

      // Flex result
      const childRects: ChildRect[] = [
        { nodeId: 'item-1', rect: { x: 0, y: 0, width: 100, height: 40 } },
      ]
      const flexTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
      })
      const flexResult = flexStrategy.calculate(
        { x: 50, y: 50 },
        flexTarget,
        source,
        childRects
      )

      expect(flexResult.position).toBeUndefined()
      expect(flexResult.insertionIndex).toBeDefined()
    })

    it('empty flex result has insertionIndex 0', () => {
      const source = createMockCanvasSource({ size: { width: 100, height: 40 } })

      const emptyFlexTarget = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: false,
      })
      const result = simpleInsideStrategy.calculate(
        { x: 50, y: 50 },
        emptyFlexTarget,
        source
      )

      expect(result.insertionIndex).toBe(0)
      expect(result.position).toBeUndefined()
    })
  })

  // ============================================
  // Cross-container move scenarios
  // ============================================

  describe('Cross-container move scenarios', () => {
    it('element from flex can be placed in positioned container', () => {
      // Source element is in a flex container (no x/y)
      const source = createMockCanvasSource({
        nodeId: 'button-in-flex',
        size: { width: 100, height: 40 },
      })

      // Target is positioned container
      const element = createMockElement(
        createRect(100, 100, 300, 200),
        { left: 0, top: 0 }
      )
      const target = createMockDropTarget({
        element: element as unknown as HTMLElement,
        layoutType: 'positioned',
        nodeId: 'stacked-frame',
      })

      const cursor: Point = { x: 250, y: 200 }
      const result = absoluteStrategy.calculate(cursor, target, source)

      expect(result.placement).toBe('absolute')
      expect(result.targetId).toBe('stacked-frame')
      expect(result.position).toBeDefined()
    })

    it('element from positioned can be placed in flex container', () => {
      // Source element is in positioned container (has x/y)
      const source = createMockCanvasSource({
        nodeId: 'button-x-100-y-50',
        size: { width: 100, height: 40 },
      })

      // Target is flex container with children
      const childRects: ChildRect[] = [
        { nodeId: 'text-1', rect: { x: 0, y: 0, width: 200, height: 24 } },
        { nodeId: 'text-2', rect: { x: 0, y: 32, width: 200, height: 24 } },
      ]
      const target = createMockFlexTarget({
        layoutType: 'flex',
        hasChildren: true,
        direction: 'vertical',
        nodeId: 'flex-frame',
      })

      const cursor: Point = { x: 100, y: 28 } // Between text-1 and text-2
      const result = flexStrategy.calculate(cursor, target, source, childRects)

      // Should get flex-style placement, not absolute
      expect(['before', 'after', 'inside']).toContain(result.placement)
      expect(result.position).toBeUndefined() // No x/y
      expect(result.insertionIndex).toBeDefined()
    })
  })
})
