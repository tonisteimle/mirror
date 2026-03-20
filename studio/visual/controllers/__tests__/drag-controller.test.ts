/**
 * DragController Integration Tests
 *
 * Tests the controller's integration with models.
 * Uses jsdom for DOM simulation.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DragController, createDragController } from '../drag-controller'

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'preview'
  container.style.cssText = 'position: relative; width: 800px; height: 600px;'
  document.body.appendChild(container)
  return container
}

function createMockElement(nodeId: string, rect: { x: number; y: number; w: number; h: number }): HTMLElement {
  const el = document.createElement('div')
  el.dataset.mirrorId = nodeId
  el.style.cssText = `
    position: absolute;
    left: ${rect.x}px;
    top: ${rect.y}px;
    width: ${rect.w}px;
    height: ${rect.h}px;
  `
  // Mock getBoundingClientRect
  el.getBoundingClientRect = () => ({
    x: rect.x,
    y: rect.y,
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.w,
    bottom: rect.y + rect.h,
    width: rect.w,
    height: rect.h,
    toJSON: () => ({}),
  })
  return el
}

function createMouseEvent(type: string, x: number, y: number, options: Partial<MouseEventInit> = {}): MouseEvent {
  return new MouseEvent(type, {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
    ...options,
  })
}

// ============================================================================
// Tests
// ============================================================================

describe('DragController', () => {
  let container: HTMLElement
  let controller: DragController

  beforeEach(() => {
    container = createMockContainer()
  })

  afterEach(() => {
    controller?.dispose()
    container?.remove()
  })

  describe('initialization', () => {
    it('creates controller without errors', () => {
      controller = createDragController(container)
      expect(controller).toBeDefined()
      expect(controller.isDragging()).toBe(false)
    })

    it('accepts configuration', () => {
      controller = createDragController(container, {
        threshold: 5,
        gridSize: 8,
        enableGuides: true,
      })
      expect(controller).toBeDefined()
    })
  })

  describe('startElementDrag', () => {
    it('starts drag from element', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      const onDragStart = vi.fn()
      controller = createDragController(container, { threshold: 3 }, { onDragStart })

      // Start drag
      const mousedown = createMouseEvent('mousedown', 120, 110)
      controller.startElementDrag(element, mousedown)

      // Move past threshold
      const mousemove = createMouseEvent('mousemove', 130, 115)
      document.dispatchEvent(mousemove)

      expect(controller.isDragging()).toBe(true)
      expect(onDragStart).toHaveBeenCalled()
    })

    it('calculates grab offset correctly', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      controller = createDragController(container, { threshold: 3 })

      // Click at (120, 110) on element at (100, 100)
      // Grab offset should be (20, 10)
      const mousedown = createMouseEvent('mousedown', 120, 110)
      controller.startElementDrag(element, mousedown)

      const snapshot = controller.getSnapshot()
      expect(snapshot.source).not.toBeNull()
      if (snapshot.source?.type === 'element') {
        expect(snapshot.source.grabOffset).toEqual({ x: 20, y: 10 })
      }
    })

    it('ignores elements without mirror-id', () => {
      const element = document.createElement('div')
      container.appendChild(element)

      const onDragStart = vi.fn()
      controller = createDragController(container, {}, { onDragStart })

      const mousedown = createMouseEvent('mousedown', 100, 100)
      controller.startElementDrag(element, mousedown)

      expect(controller.isDragging()).toBe(false)
      expect(onDragStart).not.toHaveBeenCalled()
    })
  })

  describe('startPaletteDrag', () => {
    it('starts drag from palette', () => {
      const onDragStart = vi.fn()
      controller = createDragController(container, { threshold: 3 }, { onDragStart })

      // Start palette drag
      const mousedown = createMouseEvent('mousedown', 200, 200)
      controller.startPaletteDrag('Button', mousedown, {
        properties: 'bg #3B82F6',
        defaultSize: { width: 100, height: 40 },
      })

      // Move past threshold
      const mousemove = createMouseEvent('mousemove', 210, 205)
      document.dispatchEvent(mousemove)

      expect(controller.isDragging()).toBe(true)
      expect(onDragStart).toHaveBeenCalled()
    })
  })

  describe('drag lifecycle', () => {
    it('calls onDragMove during drag', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      const onDragMove = vi.fn()
      controller = createDragController(container, { threshold: 3 }, { onDragMove })

      // Start drag
      controller.startElementDrag(element, createMouseEvent('mousedown', 120, 110))

      // Move past threshold
      document.dispatchEvent(createMouseEvent('mousemove', 130, 115))

      // Move more
      document.dispatchEvent(createMouseEvent('mousemove', 150, 130))

      expect(onDragMove).toHaveBeenCalled()
      const lastCall = onDragMove.mock.calls[onDragMove.mock.calls.length - 1][0]
      expect(lastCall.ghostRect).toBeDefined()
    })

    it('completes drag on mouseup', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      const onDragEnd = vi.fn()
      controller = createDragController(container, { threshold: 3 }, { onDragEnd })

      // Start and drag
      controller.startElementDrag(element, createMouseEvent('mousedown', 120, 110))
      document.dispatchEvent(createMouseEvent('mousemove', 150, 130))

      // End drag
      document.dispatchEvent(createMouseEvent('mouseup', 150, 130))

      expect(controller.isDragging()).toBe(false)
    })

    it('cancels drag on Escape', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      const onDragCancel = vi.fn()
      controller = createDragController(container, { threshold: 3 }, { onDragCancel })

      // Start and drag
      controller.startElementDrag(element, createMouseEvent('mousedown', 120, 110))
      document.dispatchEvent(createMouseEvent('mousemove', 150, 130))

      // Press Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

      expect(controller.isDragging()).toBe(false)
      expect(onDragCancel).toHaveBeenCalled()
    })
  })

  describe('duplicate mode', () => {
    it('sets duplicate mode when Alt is pressed', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      const onDragEnd = vi.fn()
      controller = createDragController(container, { threshold: 3 }, { onDragEnd })

      // Start drag
      controller.startElementDrag(element, createMouseEvent('mousedown', 120, 110))

      // Move with Alt pressed
      document.dispatchEvent(createMouseEvent('mousemove', 150, 130, { altKey: true }))

      // Check state
      const snapshot = controller.getSnapshot()
      expect(snapshot.isDuplicate).toBe(true)
    })
  })

  describe('threshold', () => {
    it('does not start drag below threshold', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      const onDragStart = vi.fn()
      controller = createDragController(container, { threshold: 10 }, { onDragStart })

      // Start drag
      controller.startElementDrag(element, createMouseEvent('mousedown', 120, 110))

      // Move less than threshold (< 10px)
      document.dispatchEvent(createMouseEvent('mousemove', 125, 112))

      expect(controller.isDragging()).toBe(false)
      expect(onDragStart).not.toHaveBeenCalled()
    })

    it('starts drag when threshold exceeded', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      const onDragStart = vi.fn()
      controller = createDragController(container, { threshold: 10 }, { onDragStart })

      // Start drag
      controller.startElementDrag(element, createMouseEvent('mousedown', 120, 110))

      // Move more than threshold (> 10px)
      document.dispatchEvent(createMouseEvent('mousemove', 135, 115))

      expect(controller.isDragging()).toBe(true)
      expect(onDragStart).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('removes event listeners on dispose', () => {
      const element = createMockElement('node-1', { x: 100, y: 100, w: 80, h: 40 })
      container.appendChild(element)

      const onDragMove = vi.fn()
      controller = createDragController(container, { threshold: 3 }, { onDragMove })

      // Start drag
      controller.startElementDrag(element, createMouseEvent('mousedown', 120, 110))
      document.dispatchEvent(createMouseEvent('mousemove', 130, 115))

      // Dispose
      controller.dispose()

      // Further moves should not trigger callback
      const callCount = onDragMove.mock.calls.length
      document.dispatchEvent(createMouseEvent('mousemove', 150, 130))

      expect(onDragMove.mock.calls.length).toBe(callCount)
    })
  })
})
