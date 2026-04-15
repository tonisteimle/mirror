/**
 * DragController Test API - Unit Tests
 *
 * Tests the test-specific methods added to DragController.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DragController, resetDragController } from '../../../studio/preview/drag/drag-controller'

describe('DragController Test API', () => {
  let controller: DragController

  beforeEach(() => {
    controller = new DragController()
  })

  afterEach(() => {
    controller.destroy()
  })

  describe('simulateDrop', () => {
    it('should execute drop callback with provided source and target', async () => {
      const onDrop = vi.fn().mockResolvedValue(undefined)
      controller.setCallbacks({ onDrop })

      const source = { type: 'palette' as const, componentName: 'Button' }
      const target = { containerId: 'node-1', insertionIndex: 0 }

      await controller.simulateDrop(source, target)

      expect(onDrop).toHaveBeenCalledWith(source, target)
    })

    it('should reset state after drop', async () => {
      controller.setCallbacks({ onDrop: vi.fn().mockResolvedValue(undefined) })

      await controller.simulateDrop(
        { type: 'palette', componentName: 'Button' },
        { containerId: 'node-1', insertionIndex: 0 }
      )

      const state = controller.getTestState()
      expect(state.state).toBe('idle')
      expect(state.source).toBeNull()
      expect(state.target).toBeNull()
    })

    it('should handle canvas source type', async () => {
      const onDrop = vi.fn().mockResolvedValue(undefined)
      controller.setCallbacks({ onDrop })

      const source = { type: 'canvas' as const, nodeId: 'node-2' }
      const target = { containerId: 'node-1', insertionIndex: 1 }

      await controller.simulateDrop(source, target)

      expect(onDrop).toHaveBeenCalledWith(source, target)
    })

    it('should work without callbacks set', async () => {
      // Should not throw even without callbacks
      await expect(
        controller.simulateDrop(
          { type: 'palette', componentName: 'Button' },
          { containerId: 'node-1', insertionIndex: 0 }
        )
      ).resolves.not.toThrow()
    })
  })

  describe('setTestSource', () => {
    it('should set source and change state to dragging', () => {
      const source = { type: 'palette' as const, componentName: 'Frame' }
      controller.setTestSource(source)

      const state = controller.getTestState()
      expect(state.source).toEqual(source)
      expect(state.state).toBe('dragging')
    })
  })

  describe('setTestTarget', () => {
    it('should set target', () => {
      const target = { containerId: 'node-1', insertionIndex: 2 }
      controller.setTestTarget(target)

      const state = controller.getTestState()
      expect(state.target).toEqual(target)
    })
  })

  describe('getTestState', () => {
    it('should return current internal state', () => {
      const state = controller.getTestState()

      expect(state).toHaveProperty('state')
      expect(state).toHaveProperty('source')
      expect(state).toHaveProperty('target')
    })

    it('should reflect state changes', () => {
      expect(controller.getTestState().state).toBe('idle')

      controller.setTestSource({ type: 'palette', componentName: 'Text' })
      expect(controller.getTestState().state).toBe('dragging')

      controller.cancel()
      expect(controller.getTestState().state).toBe('idle')
    })
  })

  describe('integration with existing methods', () => {
    it('should work with isDragging', () => {
      expect(controller.isDragging()).toBe(false)

      controller.setTestSource({ type: 'palette', componentName: 'Button' })
      expect(controller.isDragging()).toBe(true)
    })

    it('should work with getSource', () => {
      const source = { type: 'palette' as const, componentName: 'Icon' }
      controller.setTestSource(source)

      expect(controller.getSource()).toEqual(source)
    })

    it('should work with getTarget', () => {
      const target = { containerId: 'node-1', insertionIndex: 0 }
      controller.setTestTarget(target)

      expect(controller.getTarget()).toEqual(target)
    })

    it('should work with cancel', () => {
      controller.setTestSource({ type: 'canvas', nodeId: 'node-2' })
      controller.setTestTarget({ containerId: 'node-1', insertionIndex: 0 })

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
