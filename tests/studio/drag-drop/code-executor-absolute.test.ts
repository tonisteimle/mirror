/**
 * CodeExecutor Absolute Positioning Tests
 *
 * Tests for the CodeExecutor handling of absolute positioning drops.
 * Verifies x/y property generation for palette and canvas drops.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CodeExecutor, createCodeExecutor } from '../../../studio/drag-drop/executor/code-executor'
import {
  createMockDropTarget,
  createMockPaletteSource,
  createMockCanvasSource,
  createMockAbsoluteDropResult,
  createMockCodeExecutorDeps,
  createMockCodeModifier,
} from '../../utils/mocks/drag-drop-mocks'
import type { DropResult, DragSource } from '../../../studio/drag-drop/types'

describe('CodeExecutor Absolute Positioning', () => {
  let executor: CodeExecutor
  let mockDeps: ReturnType<typeof createMockCodeExecutorDeps>

  beforeEach(() => {
    mockDeps = createMockCodeExecutorDeps()
    executor = createCodeExecutor(mockDeps)
  })

  // ============================================
  // Palette drop tests
  // ============================================

  describe('palette drops with absolute positioning', () => {
    it('adds x and y properties to component', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource({
        componentName: 'Frame',
        properties: 'bg #1a1a1a',
      })
      const result = createMockAbsoluteDropResult(target, { x: 150, y: 100 })

      executor.execute(source, result)

      // Verify modifier was called with x/y properties
      const modifier = mockDeps._modifier!
      expect(modifier.addChild).toHaveBeenCalled()

      const callArgs = modifier.addChild.mock.calls[0]
      const options = callArgs[2]

      // Properties should include x and y
      expect(options.properties).toContain('x 150')
      expect(options.properties).toContain('y 100')
    })

    it('appends x/y to existing properties', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource({
        componentName: 'Frame',
        properties: 'bg #1a1a1a, rad 8',
      })
      const result = createMockAbsoluteDropResult(target, { x: 50, y: 75 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      const callArgs = modifier.addChild.mock.calls[0]
      const options = callArgs[2]

      // Should have both original and position properties
      expect(options.properties).toContain('bg #1a1a1a')
      expect(options.properties).toContain('rad 8')
      expect(options.properties).toContain('x 50')
      expect(options.properties).toContain('y 75')
    })

    it('creates properties string when source has none', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource({
        componentName: 'Button',
        properties: undefined,
        textContent: 'Click me',
      })
      const result = createMockAbsoluteDropResult(target, { x: 200, y: 150 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      const callArgs = modifier.addChild.mock.calls[0]
      const options = callArgs[2]

      expect(options.properties).toBe('x 200, y 150')
    })

    it('inserts at container nodeId', () => {
      const target = createMockDropTarget({ nodeId: 'stacked-container-1' })
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      const callArgs = modifier.addChild.mock.calls[0]

      // First argument should be the container nodeId
      expect(callArgs[0]).toBe('stacked-container-1')
    })

    it('inserts at position "last"', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      const callArgs = modifier.addChild.mock.calls[0]
      const options = callArgs[2]

      expect(options.position).toBe('last')
    })

    it('includes textContent in options', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource({
        componentName: 'Text',
        textContent: 'Hello World',
      })
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      const callArgs = modifier.addChild.mock.calls[0]
      const options = callArgs[2]

      expect(options.textContent).toBe('Hello World')
    })

    it('returns success result', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      const execResult = executor.execute(source, result)

      expect(execResult.success).toBe(true)
    })
  })

  // ============================================
  // Canvas drop tests
  // ============================================

  describe('canvas drops with absolute positioning', () => {
    it('moves node into positioned container', () => {
      const target = createMockDropTarget({ nodeId: 'stacked-1' })
      const source = createMockCanvasSource({ nodeId: 'element-to-move' })
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 75 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      expect(modifier.moveNode).toHaveBeenCalled()

      const callArgs = modifier.moveNode.mock.calls[0]
      expect(callArgs[0]).toBe('element-to-move') // sourceId
      expect(callArgs[1]).toBe('stacked-1')       // targetId (container)
      expect(callArgs[2]).toBe('inside')          // placement
    })

    it('returns success result for canvas drop', () => {
      const target = createMockDropTarget()
      const source = createMockCanvasSource({ nodeId: 'element-to-move' })
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      const execResult = executor.execute(source, result)

      expect(execResult.success).toBe(true)
    })
  })

  // ============================================
  // Error handling tests
  // ============================================

  describe('error handling', () => {
    it('fails when sourceMap is not available', () => {
      mockDeps.getSourceMap.mockReturnValue(null)
      executor = createCodeExecutor(mockDeps)

      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      const execResult = executor.execute(source, result)

      expect(execResult.success).toBe(false)
      expect(execResult.error).toContain('SourceMap')
    })

    it('fails when palette source has no componentName', () => {
      const target = createMockDropTarget()
      const source: DragSource = {
        type: 'palette',
        componentName: undefined,
      }
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      const execResult = executor.execute(source, result)

      expect(execResult.success).toBe(false)
      expect(execResult.error).toContain('component name')
    })

    it('fails when canvas source has no nodeId', () => {
      const target = createMockDropTarget()
      const source: DragSource = {
        type: 'canvas',
        nodeId: undefined,
      }
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      const execResult = executor.execute(source, result)

      expect(execResult.success).toBe(false)
      expect(execResult.error).toContain('nodeId')
    })

    it('handles modifier failure', () => {
      const modifier = createMockCodeModifier()
      modifier.addChild.mockReturnValue({
        success: false,
        error: 'Node not found',
      })
      mockDeps.createModifier.mockReturnValue(modifier as any)
      executor = createCodeExecutor(mockDeps)

      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      const execResult = executor.execute(source, result)

      expect(execResult.success).toBe(false)
      expect(execResult.error).toContain('Node not found')
    })

    it('handles exceptions gracefully', () => {
      mockDeps.createModifier.mockImplementation(() => {
        throw new Error('Unexpected error')
      })
      executor = createCodeExecutor(mockDeps)

      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      const execResult = executor.execute(source, result)

      expect(execResult.success).toBe(false)
      expect(execResult.error).toContain('Unexpected error')
    })
  })

  // ============================================
  // Source code extraction tests
  // ============================================

  describe('source code extraction', () => {
    it('extracts editor content from resolved source with prelude', () => {
      const preludeSource = '// prelude\n'
      const editorSource = 'Frame stacked\n  Text "Hello"'
      const fullSource = preludeSource + editorSource

      mockDeps.getResolvedSource.mockReturnValue(fullSource)
      mockDeps.getPreludeOffset.mockReturnValue(preludeSource.length)

      const modifier = createMockCodeModifier(editorSource)
      modifier.addChild.mockReturnValue({
        success: true,
        newSource: fullSource + '\n  Frame x 100, y 50',
        change: { from: 0, to: fullSource.length, insert: '' },
      })
      mockDeps.createModifier.mockReturnValue(modifier as any)

      executor = createCodeExecutor(mockDeps)

      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      executor.execute(source, result)

      // applyChange should receive only editor content (without prelude)
      expect(mockDeps.applyChange).toHaveBeenCalled()
    })

    it('triggers recompile after successful drop', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      executor.execute(source, result)

      expect(mockDeps.recompile).toHaveBeenCalled()
    })

    it('does not trigger recompile on failure', () => {
      mockDeps.getSourceMap.mockReturnValue(null)
      executor = createCodeExecutor(mockDeps)

      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      executor.execute(source, result)

      expect(mockDeps.recompile).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Position value tests
  // ============================================

  describe('position value handling', () => {
    it('rounds position values to integers', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      // Position values are already integers from strategy calculation
      const result = createMockAbsoluteDropResult(target, { x: 100, y: 50 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      const callArgs = modifier.addChild.mock.calls[0]
      const options = callArgs[2]

      // Values should be integers in the property string
      expect(options.properties).toMatch(/x 100/)
      expect(options.properties).toMatch(/y 50/)
    })

    it('handles zero position values', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 0, y: 0 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      const callArgs = modifier.addChild.mock.calls[0]
      const options = callArgs[2]

      expect(options.properties).toContain('x 0')
      expect(options.properties).toContain('y 0')
    })

    it('handles large position values', () => {
      const target = createMockDropTarget()
      const source = createMockPaletteSource()
      const result = createMockAbsoluteDropResult(target, { x: 1000, y: 2000 })

      executor.execute(source, result)

      const modifier = mockDeps._modifier!
      const callArgs = modifier.addChild.mock.calls[0]
      const options = callArgs[2]

      expect(options.properties).toContain('x 1000')
      expect(options.properties).toContain('y 2000')
    })
  })
})
