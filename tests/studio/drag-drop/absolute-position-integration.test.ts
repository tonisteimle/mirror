/**
 * Absolute Position Integration Tests
 *
 * End-to-end tests for the complete absolute positioning flow:
 * Drag → Strategy Selection → Visual Feedback → Code Modification
 *
 * Note: These tests require the full DragDropSystem which has complex
 * dependencies. Tests are skipped if the system fails to initialize.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CodeExecutor, createCodeExecutor } from '../../../studio/drag-drop/executor/code-executor'
import { VisualSystem, createVisualSystem } from '../../../studio/drag-drop/visual/system'
import { AbsolutePositionStrategy } from '../../../studio/drag-drop/strategies/absolute-position'
import { VISUAL_IDS } from '../../../studio/drag-drop/visual/types'
import {
  createMockCodeExecutorDeps,
  createMockCodeModifier,
  createMockDropTarget,
  createMockPaletteSource,
  createMockAbsoluteDropResult,
} from '../../utils/mocks/drag-drop-mocks'
import type { DragSource, DropResult, Point } from '../../../studio/drag-drop/types'

/**
 * Integration test helper that simulates the drag-drop flow
 * without needing the full DragDropSystem.
 */
class IntegrationTestHelper {
  private container: HTMLElement
  private visual: VisualSystem
  private strategy: AbsolutePositionStrategy
  private executor: CodeExecutor
  private mockDeps: ReturnType<typeof createMockCodeExecutorDeps>

  constructor(container: HTMLElement) {
    this.container = container
    this.visual = createVisualSystem(container)
    this.strategy = new AbsolutePositionStrategy()
    this.mockDeps = createMockCodeExecutorDeps()
    this.executor = createCodeExecutor(this.mockDeps)
  }

  getMockDeps() {
    return this.mockDeps
  }

  getVisual() {
    return this.visual
  }

  /**
   * Simulate dragging to a position and getting the drop result
   */
  simulateDrag(cursor: Point, target: ReturnType<typeof createMockDropTarget>, source: DragSource): DropResult | null {
    if (!this.strategy.matches(target)) {
      return null
    }

    const result = this.strategy.calculate(cursor, target, source)
    const hint = this.strategy.getVisualHint(result)

    if (hint) {
      this.visual.showIndicator(hint)
    }

    return result
  }

  /**
   * Execute a drop
   */
  executeDrop(source: DragSource, result: DropResult) {
    return this.executor.execute(source, result)
  }

  /**
   * Clear visual state
   */
  clear() {
    this.visual.clear()
  }

  dispose() {
    this.visual.dispose()
  }
}

describe('Absolute Position Integration', () => {
  let container: HTMLElement
  let helper: IntegrationTestHelper

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'preview-container'
    document.body.appendChild(container)

    helper = new IntegrationTestHelper(container)
  })

  afterEach(() => {
    helper.dispose()
    document.body.innerHTML = ''
  })

  // ============================================
  // Full flow tests
  // ============================================

  describe('complete drag-drop flow', () => {
    it('drag → strategy → visual → code for palette drop', () => {
      // Create a mock target
      const target = createMockDropTarget({ nodeId: 'stacked-1' })

      // 1. Create source
      const source = createMockPaletteSource({
        componentName: 'Frame',
        properties: 'bg #333',
        size: { width: 100, height: 40 },
      })

      // 2. Simulate drag to positioned container
      const cursor = { x: 250, y: 200 }
      const result = helper.simulateDrag(cursor, target, source)

      // 3. Verify strategy produced absolute placement
      expect(result).not.toBeNull()
      expect(result!.placement).toBe('absolute')
      expect(result!.position).toBeDefined()

      // 4. Verify visual ghost is shown
      const visualState = helper.getVisual().getState()
      expect(visualState.ghostVisible).toBe(true)

      // 5. Execute the drop
      const execResult = helper.executeDrop(source, result!)

      // 6. Verify code was modified with x/y
      expect(execResult.success).toBe(true)
      const modifier = helper.getMockDeps()._modifier!
      expect(modifier.addChild).toHaveBeenCalled()
    })

    it('drag → strategy → visual → code for canvas move', () => {
      // Create a mock target
      const target = createMockDropTarget({ nodeId: 'stacked-1' })

      // Create canvas source (moving existing element)
      const source: DragSource = {
        type: 'canvas',
        nodeId: 'element-1',
        size: { width: 80, height: 40 },
      }

      // Simulate drag
      const cursor = { x: 250, y: 200 }
      const result = helper.simulateDrag(cursor, target, source)

      expect(result).not.toBeNull()
      expect(result!.placement).toBe('absolute')

      // Execute move
      const execResult = helper.executeDrop(source, result!)

      // Verify moveNode was called
      expect(execResult.success).toBe(true)
      const modifier = helper.getMockDeps()._modifier!
      expect(modifier.moveNode).toHaveBeenCalledWith(
        'element-1',
        'stacked-1',
        'inside',
        undefined,
        { properties: 'x 110, y 80' }
      )
    })
  })

  // ============================================
  // Multiple drops tests
  // ============================================

  describe('multiple drops in same container', () => {
    it('handles multiple consecutive drops', () => {
      const target = createMockDropTarget({ nodeId: 'stacked-1' })
      const positions = [
        { x: 150, y: 150 },
        { x: 200, y: 200 },
        { x: 250, y: 180 },
      ]

      for (const pos of positions) {
        const source = createMockPaletteSource({
          componentName: 'Frame',
          size: { width: 80, height: 40 },
        })

        const result = helper.simulateDrag(pos, target, source)
        expect(result).not.toBeNull()

        const execResult = helper.executeDrop(source, result!)
        expect(execResult.success).toBe(true)
      }

      // Verify modifier was called multiple times
      const modifier = helper.getMockDeps()._modifier!
      expect(modifier.addChild).toHaveBeenCalledTimes(3)
    })

    it('maintains visual system state between drops', () => {
      const target = createMockDropTarget({ nodeId: 'stacked-1' })

      // First drop
      const source1 = createMockPaletteSource({
        componentName: 'Frame',
        size: { width: 100, height: 40 },
      })

      const result1 = helper.simulateDrag({ x: 200, y: 200 }, target, source1)
      helper.executeDrop(source1, result1!)

      // Clear visual state (simulating end of drag)
      helper.clear()

      // Visual should be cleared
      const stateAfterFirst = helper.getVisual().getState()
      expect(stateAfterFirst.ghostVisible).toBe(false)

      // Second drop
      const source2 = createMockPaletteSource({
        componentName: 'Text',
        textContent: 'Hello',
        size: { width: 60, height: 30 },
      })

      const result2 = helper.simulateDrag({ x: 250, y: 180 }, target, source2)
      expect(result2).not.toBeNull()

      // Ghost should be visible again
      const stateAfterDrag = helper.getVisual().getState()
      expect(stateAfterDrag.ghostVisible).toBe(true)
    })
  })

  // ============================================
  // Container switching tests
  // ============================================

  describe('switching between containers', () => {
    it('drops in correct container when switching', () => {
      const target1 = createMockDropTarget({ nodeId: 'stacked-1' })
      const target2 = createMockDropTarget({ nodeId: 'stacked-2' })

      // Drop in first container
      const source1 = createMockPaletteSource({ componentName: 'Frame' })
      const result1 = helper.simulateDrag({ x: 200, y: 200 }, target1, source1)
      helper.executeDrop(source1, result1!)

      // Drop in second container
      const source2 = createMockPaletteSource({
        componentName: 'Text',
        textContent: 'In container 2',
      })
      const result2 = helper.simulateDrag({ x: 200, y: 200 }, target2, source2)
      helper.executeDrop(source2, result2!)

      // Verify both drops targeted correct containers
      const modifier = helper.getMockDeps()._modifier!
      const calls = modifier.addChild.mock.calls

      expect(calls.length).toBe(2)
      expect(calls[0][0]).toBe('stacked-1')
      expect(calls[1][0]).toBe('stacked-2')
    })
  })

  // ============================================
  // Visual feedback integration tests
  // ============================================

  describe('visual feedback integration', () => {
    it('shows and hides ghost during drag lifecycle', () => {
      const target = createMockDropTarget({ nodeId: 'stacked-1' })
      const source = createMockPaletteSource({ componentName: 'Frame' })

      // Before drag - no ghost
      expect(helper.getVisual().getState().ghostVisible).toBe(false)

      // During drag - ghost visible
      const result = helper.simulateDrag({ x: 200, y: 200 }, target, source)
      expect(helper.getVisual().getState().ghostVisible).toBe(true)

      // After clear - ghost hidden
      helper.clear()
      expect(helper.getVisual().getState().ghostVisible).toBe(false)
    })

    it('clears visual state on dispose', () => {
      const target = createMockDropTarget({ nodeId: 'stacked-1' })
      const source = createMockPaletteSource({ componentName: 'Frame' })

      // Show ghost
      helper.simulateDrag({ x: 200, y: 200 }, target, source)
      expect(document.getElementById(VISUAL_IDS.ghost)).not.toBeNull()

      // Dispose
      helper.dispose()

      // All visual elements should be removed
      expect(document.getElementById(VISUAL_IDS.ghost)).toBeNull()
      expect(document.getElementById(VISUAL_IDS.indicator)).toBeNull()
      expect(document.getElementById(VISUAL_IDS.parentOutline)).toBeNull()
    })
  })

  // ============================================
  // Error recovery tests
  // ============================================

  describe('error recovery', () => {
    it('handles invalid drop result gracefully', () => {
      const source = createMockPaletteSource({ componentName: undefined })
      const target = createMockDropTarget({ nodeId: 'stacked-1' })

      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      // Should fail due to missing componentName
      const execResult = helper.executeDrop(source, result)
      expect(execResult.success).toBe(false)
      expect(execResult.error).toContain('component name')
    })

    it('handles SourceMap unavailable', () => {
      const mockDeps = helper.getMockDeps()
      mockDeps.getSourceMap.mockReturnValue(null)

      const source = createMockPaletteSource({ componentName: 'Frame' })
      const target = createMockDropTarget({ nodeId: 'stacked-1' })
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      const execResult = helper.executeDrop(source, result)
      expect(execResult.success).toBe(false)
      expect(execResult.error).toContain('SourceMap')
    })
  })
})
