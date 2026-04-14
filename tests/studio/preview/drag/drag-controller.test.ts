/**
 * @vitest-environment jsdom
 *
 * Tests for DragController
 * Orchestrates the drag & drop system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DragController,
  resetDragController,
  getDragController,
} from '../../../../studio/preview/drag/drag-controller'

// Mock DOMRect
const mockRect = (x: number, y: number, width: number, height: number): DOMRect => ({
  x,
  y,
  width,
  height,
  top: y,
  left: x,
  right: x + width,
  bottom: y + height,
  toJSON: () => ({}),
})

describe('DragController', () => {
  let controller: DragController
  let originalElementFromPoint: typeof document.elementFromPoint

  beforeEach(() => {
    controller = new DragController()
    // Mock elementFromPoint
    originalElementFromPoint = document.elementFromPoint
    document.elementFromPoint = vi.fn()
  })

  afterEach(() => {
    controller.destroy()
    resetDragController()
    document.elementFromPoint = originalElementFromPoint
    vi.restoreAllMocks()
  })

  describe('startDrag', () => {
    it('sets dragging state', () => {
      const container = document.createElement('div')

      expect(controller.isDragging()).toBe(false)

      controller.startDrag({ type: 'palette', componentName: 'Button' }, container)

      expect(controller.isDragging()).toBe(true)
    })

    it('stores source', () => {
      const container = document.createElement('div')
      const source = {
        type: 'palette' as const,
        componentName: 'Button',
        template: 'Button "Click"',
      }

      controller.startDrag(source, container)

      expect(controller.getSource()).toEqual(source)
    })
  })

  describe('updatePosition', () => {
    it('does nothing when not dragging', () => {
      // Should not throw
      expect(() => controller.updatePosition({ x: 100, y: 100 })).not.toThrow()
    })

    it('clears target when no hit detected', () => {
      const container = document.createElement('div')
      controller.startDrag({ type: 'palette', componentName: 'Button' }, container)

      // Mock elementFromPoint to return null (no element under cursor)
      ;(document.elementFromPoint as ReturnType<typeof vi.fn>).mockReturnValue(null)

      controller.updatePosition({ x: 100, y: 100 })

      expect(controller.getTarget()).toBeNull()
    })
  })

  describe('drop', () => {
    it('calls onDrop callback with source and target', async () => {
      const onDrop = vi.fn().mockResolvedValue(undefined)
      controller.setCallbacks({ onDrop })

      // Create a wrapper so querySelectorAll finds the target element
      const wrapper = document.createElement('div')
      const target = document.createElement('div')
      target.setAttribute('data-mirror-id', 'root')
      target.getBoundingClientRect = () => mockRect(0, 0, 400, 300)
      wrapper.appendChild(target)

      // Mock for flex container detection
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        display: 'flex',
        flexDirection: 'column',
        position: 'static',
      } as CSSStyleDeclaration)
      ;(document.elementFromPoint as ReturnType<typeof vi.fn>).mockReturnValue(target)

      controller.startDrag({ type: 'palette', componentName: 'Button' }, wrapper)
      controller.updatePosition({ x: 100, y: 100 })
      await controller.drop()

      expect(onDrop).toHaveBeenCalled()
      expect(onDrop.mock.calls[0][0]).toEqual({ type: 'palette', componentName: 'Button' })
      expect(onDrop.mock.calls[0][1]).toHaveProperty('containerId', 'root')
    })

    it('resets state after drop', async () => {
      const container = document.createElement('div')
      controller.startDrag({ type: 'palette', componentName: 'Button' }, container)

      await controller.drop()

      expect(controller.isDragging()).toBe(false)
      expect(controller.getSource()).toBeNull()
      expect(controller.getTarget()).toBeNull()
    })

    it('handles drop without target gracefully', async () => {
      const onDrop = vi.fn()
      controller.setCallbacks({ onDrop })

      await controller.drop()

      expect(onDrop).not.toHaveBeenCalled()
    })

    it('handles drop callback errors', async () => {
      const error = new Error('Drop failed')
      const onDrop = vi.fn().mockRejectedValue(error)
      controller.setCallbacks({ onDrop })

      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'root')
      container.getBoundingClientRect = () => mockRect(0, 0, 400, 300)

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        display: 'flex',
        flexDirection: 'column',
        position: 'static',
      } as CSSStyleDeclaration)
      ;(document.elementFromPoint as ReturnType<typeof vi.fn>).mockReturnValue(container)

      controller.startDrag({ type: 'palette', componentName: 'Button' }, container)
      controller.updatePosition({ x: 100, y: 100 })

      // Should not throw
      await expect(controller.drop()).resolves.not.toThrow()
    })
  })

  describe('cancel', () => {
    it('resets state', () => {
      const container = document.createElement('div')
      controller.startDrag({ type: 'palette', componentName: 'Button' }, container)

      controller.cancel()

      expect(controller.isDragging()).toBe(false)
      expect(controller.getSource()).toBeNull()
    })
  })

  describe('singleton', () => {
    it('getDragController returns same instance', () => {
      const instance1 = getDragController()
      const instance2 = getDragController()

      expect(instance1).toBe(instance2)
    })

    it('resetDragController destroys and clears instance', () => {
      const instance1 = getDragController()
      resetDragController()
      const instance2 = getDragController()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('canvas drag', () => {
    it('stores canvas source correctly', () => {
      const container = document.createElement('div')
      const source = { type: 'canvas' as const, nodeId: 'node-123' }

      controller.startDrag(source, container)

      expect(controller.getSource()).toEqual(source)
      expect(controller.getSource()?.type).toBe('canvas')
    })
  })
})
