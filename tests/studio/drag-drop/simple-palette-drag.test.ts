/**
 * Simple Palette Drag Test
 *
 * Testet einen einfachen Button-Drop in einen leeren Container.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DragController, resetDragController } from '../../../studio/preview/drag/drag-controller'

describe('Simple Palette Drag', () => {
  let controller: DragController
  let dropCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    resetDragController()
    controller = new DragController()
    dropCallback = vi.fn().mockResolvedValue(undefined)
    controller.setCallbacks({ onDrop: dropCallback })
  })

  afterEach(() => {
    controller.destroy()
  })

  it('should call onDrop with correct source and target', async () => {
    // Arrange: Button von Palette
    const source = {
      type: 'palette' as const,
      componentName: 'Button',
      template: 'Button',
    }

    // Arrange: Ziel-Container
    const target = {
      containerId: 'node-1',
      insertionIndex: 0,
    }

    // Act: Drop simulieren
    await controller.simulateDrop(source, target)

    // Assert: Callback wurde mit korrekten Parametern aufgerufen
    expect(dropCallback).toHaveBeenCalledTimes(1)
    expect(dropCallback).toHaveBeenCalledWith(source, target)
  })

  it('should reset state after drop', async () => {
    const source = { type: 'palette' as const, componentName: 'Text' }
    const target = { containerId: 'node-1', insertionIndex: 0 }

    await controller.simulateDrop(source, target)

    // State sollte zurückgesetzt sein
    expect(controller.isDragging()).toBe(false)
    expect(controller.getSource()).toBeNull()
    expect(controller.getTarget()).toBeNull()
  })

  it('should handle canvas element move', async () => {
    const source = {
      type: 'canvas' as const,
      nodeId: 'node-2', // Element das verschoben wird
    }
    const target = {
      containerId: 'node-1', // Ziel-Container
      insertionIndex: 1, // Nach erstem Kind
    }

    await controller.simulateDrop(source, target)

    expect(dropCallback).toHaveBeenCalledWith(source, target)
  })

  it('should work without callbacks', async () => {
    // Controller ohne Callbacks
    const emptyController = new DragController()

    // Sollte nicht werfen
    await expect(
      emptyController.simulateDrop(
        { type: 'palette', componentName: 'Frame' },
        { containerId: 'node-1', insertionIndex: 0 }
      )
    ).resolves.not.toThrow()

    emptyController.destroy()
  })
})
