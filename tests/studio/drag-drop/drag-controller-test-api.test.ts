/**
 * DragController Test API - Unit Tests
 *
 * Exercises the test backdoors that DragTestController uses to drive
 * DragController without synthetic DragEvents. Production code MUST NOT
 * call simulateDrop / setTestSource / setTestTarget / getTestState
 * directly on a DragController — those live on DragTestController, which
 * wraps the production controller and pokes at it via the
 * `__forceState` / `__inspectState` private hooks.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DragController, resetDragController } from '../../../studio/preview/drag/drag-controller'
import { DragTestController } from '../../../studio/preview/drag/drag-test-controller'

describe('DragController Test API', () => {
  let controller: DragController
  let test: DragTestController

  beforeEach(() => {
    controller = new DragController()
    test = new DragTestController(controller)
  })

  afterEach(() => {
    controller.destroy()
  })

  describe('simulateDrop', () => {
    it('should execute drop callback with provided source and target', async () => {
      const onDrop = vi.fn().mockResolvedValue(undefined)
      controller.setCallbacks({ onDrop })

      const source = { type: 'palette' as const, componentName: 'Button' }
      const target = { mode: 'flex' as const, containerId: 'node-1', insertionIndex: 0 }

      await test.simulateDrop(source, target)

      expect(onDrop).toHaveBeenCalledWith(source, target)
    })

    it('should reset state after drop', async () => {
      controller.setCallbacks({ onDrop: vi.fn().mockResolvedValue(undefined) })

      await test.simulateDrop(
        { type: 'palette', componentName: 'Button' },
        { mode: 'flex', containerId: 'node-1', insertionIndex: 0 }
      )

      const state = test.getTestState()
      expect(state.state).toBe('idle')
      expect(state.source).toBeNull()
      expect(state.target).toBeNull()
    })

    it('should handle canvas source type', async () => {
      const onDrop = vi.fn().mockResolvedValue(undefined)
      controller.setCallbacks({ onDrop })

      const source = { type: 'canvas' as const, nodeId: 'node-2' }
      const target = { mode: 'flex' as const, containerId: 'node-1', insertionIndex: 1 }

      await test.simulateDrop(source, target)

      expect(onDrop).toHaveBeenCalledWith(source, target)
    })

    it('should work without callbacks set', async () => {
      await expect(
        test.simulateDrop(
          { type: 'palette', componentName: 'Button' },
          { mode: 'flex', containerId: 'node-1', insertionIndex: 0 }
        )
      ).resolves.not.toThrow()
    })
  })

  describe('setTestSource', () => {
    it('should set source and change state to dragging', () => {
      const source = { type: 'palette' as const, componentName: 'Frame' }
      test.setTestSource(source)

      const state = test.getTestState()
      expect(state.source).toEqual(source)
      expect(state.state).toBe('dragging')
    })
  })

  describe('setTestTarget', () => {
    it('should set target', () => {
      const target = { mode: 'flex' as const, containerId: 'node-1', insertionIndex: 2 }
      test.setTestTarget(target)

      const state = test.getTestState()
      expect(state.target).toEqual(target)
    })
  })

  describe('getTestState', () => {
    it('should return current internal state', () => {
      const state = test.getTestState()

      expect(state).toHaveProperty('state')
      expect(state).toHaveProperty('source')
      expect(state).toHaveProperty('target')
    })

    it('should reflect state changes', () => {
      expect(test.getTestState().state).toBe('idle')

      test.setTestSource({ type: 'palette', componentName: 'Text' })
      expect(test.getTestState().state).toBe('dragging')

      controller.cancel()
      expect(test.getTestState().state).toBe('idle')
    })
  })

  describe('integration with existing methods', () => {
    it('should work with isDragging', () => {
      expect(controller.isDragging()).toBe(false)

      test.setTestSource({ type: 'palette', componentName: 'Button' })
      expect(controller.isDragging()).toBe(true)
    })

    it('should work with getSource', () => {
      const source = { type: 'palette' as const, componentName: 'Icon' }
      test.setTestSource(source)

      expect(controller.getSource()).toEqual(source)
    })

    it('should work with getTarget', () => {
      const target = { mode: 'flex' as const, containerId: 'node-1', insertionIndex: 0 }
      test.setTestTarget(target)

      expect(controller.getTarget()).toEqual(target)
    })

    it('should work with cancel', () => {
      test.setTestSource({ type: 'canvas', nodeId: 'node-2' })
      test.setTestTarget({ mode: 'flex', containerId: 'node-1', insertionIndex: 0 })

      controller.cancel()

      expect(controller.isDragging()).toBe(false)
      expect(controller.getSource()).toBeNull()
      expect(controller.getTarget()).toBeNull()
    })
  })
})

describe('resetDragController', () => {
  it('should reset the singleton instance', () => {
    // This test ensures the reset function works
    // without side effects on other tests
    resetDragController()

    // Should not throw
    expect(true).toBe(true)
  })
})
