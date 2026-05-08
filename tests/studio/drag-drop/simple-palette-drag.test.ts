/**
 * Simple Palette Drag Test
 *
 * Tests a simple Button-drop into an empty container via DragTestController.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DragController, resetDragController } from '../../../studio/preview/drag/drag-controller'
import { DragTestController } from '../../../studio/preview/drag/drag-test-controller'

describe('Simple Palette Drag', () => {
  let controller: DragController
  let test: DragTestController
  let dropCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetDragController()
    controller = new DragController()
    test = new DragTestController(controller)
    dropCallback = vi.fn().mockResolvedValue(undefined)
    controller.setCallbacks({ onDrop: dropCallback })
  })

  afterEach(() => {
    controller.destroy()
  })

  it('should call onDrop with correct source and target', async () => {
    const source = {
      type: 'palette' as const,
      componentName: 'Button',
      template: 'Button',
    }
    const target = {
      mode: 'flex' as const,
      containerId: 'node-1',
      insertionIndex: 0,
    }

    await test.simulateDrop(source, target)

    expect(dropCallback).toHaveBeenCalledTimes(1)
    expect(dropCallback).toHaveBeenCalledWith(source, target)
  })

  it('should reset state after drop', async () => {
    const source = { type: 'palette' as const, componentName: 'Text' }
    const target = { mode: 'flex' as const, containerId: 'node-1', insertionIndex: 0 }

    await test.simulateDrop(source, target)

    expect(controller.isDragging()).toBe(false)
    expect(controller.getSource()).toBeNull()
    expect(controller.getTarget()).toBeNull()
  })

  it('should handle canvas element move', async () => {
    const source = {
      type: 'canvas' as const,
      nodeId: 'node-2',
    }
    const target = {
      mode: 'flex' as const,
      containerId: 'node-1',
      insertionIndex: 1,
    }

    await test.simulateDrop(source, target)

    expect(dropCallback).toHaveBeenCalledWith(source, target)
  })

  it('should work without callbacks', async () => {
    const emptyController = new DragController()
    const emptyTest = new DragTestController(emptyController)

    await expect(
      emptyTest.simulateDrop(
        { type: 'palette', componentName: 'Frame' },
        { mode: 'flex', containerId: 'node-1', insertionIndex: 0 }
      )
    ).resolves.not.toThrow()

    emptyController.destroy()
  })
})
