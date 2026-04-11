/**
 * Native Drag Adapter Tests
 *
 * Tests for the NativeDragAdapter that bridges HTML5 drag events
 * from ComponentPanel to the EventPort interface.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createNativeDragAdapter,
  createMockDragEvent,
  createMockComponentData,
  MIRROR_COMPONENT_MIME,
  type NativeDragAdapter,
} from '../../../studio/drag-drop/system/adapters/native-drag-adapter'

// ============================================
// Test Setup
// ============================================

function createTestContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
  return container
}

function cleanupTestContainer(): void {
  const container = document.getElementById('test-container')
  if (container) {
    container.remove()
  }
}

function createMockEventPort() {
  return {
    onDragStart: vi.fn(() => () => {}),
    onDragMove: vi.fn(() => () => {}),
    onDragEnd: vi.fn(() => () => {}),
    onDragCancel: vi.fn(() => () => {}),
    onKeyDown: vi.fn(() => () => {}),
    onKeyUp: vi.fn(() => () => {}),
    triggerDragStart: vi.fn(),
    triggerDragMove: vi.fn(),
    triggerDragEnd: vi.fn(),
    triggerDragCancel: vi.fn(),
  }
}

// ============================================
// Initialization Tests
// ============================================

describe('NativeDragAdapter', () => {
  let container: HTMLElement
  let eventPort: ReturnType<typeof createMockEventPort>
  let adapter: NativeDragAdapter

  beforeEach(() => {
    container = createTestContainer()
    eventPort = createMockEventPort()
  })

  afterEach(() => {
    adapter?.dispose()
    cleanupTestContainer()
  })

  describe('Initialization', () => {
    it('creates adapter without starting', () => {
      adapter = createNativeDragAdapter({ container, eventPort })
      expect(adapter.isActive()).toBe(false)
    })

    it('init() sets up event listeners', () => {
      adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()

      // Verify by triggering an event
      const event = createMockDragEvent('dragover')
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).toHaveBeenCalled()
    })

    it('dispose() removes event listeners', () => {
      adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()
      adapter.dispose()

      // Events should no longer trigger
      const event = createMockDragEvent('dragover')
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).not.toHaveBeenCalled()
    })

    it('dispose() resets active state', () => {
      adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()

      // Start a drag
      container.dispatchEvent(createMockDragEvent('dragover'))
      expect(adapter.isActive()).toBe(true)

      // Dispose
      adapter.dispose()
      expect(adapter.isActive()).toBe(false)
    })
  })

  describe('Drag Start', () => {
    beforeEach(() => {
      adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()
    })

    it('first dragover triggers dragStart', () => {
      const event = createMockDragEvent('dragover', { clientX: 100, clientY: 150 })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).toHaveBeenCalledTimes(1)
      expect(eventPort.triggerDragStart).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'palette' }),
        { x: 100, y: 150 }
      )
    })

    it('sets isActive to true on dragStart', () => {
      expect(adapter.isActive()).toBe(false)

      container.dispatchEvent(createMockDragEvent('dragover'))

      expect(adapter.isActive()).toBe(true)
    })

    it('extracts component data from dataTransfer', () => {
      const componentData = createMockComponentData('Button', {
        properties: 'bg #2271C1, col white',
        textContent: 'Click me',
      })

      const event = createMockDragEvent('dragover', {
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'palette',
          componentName: 'Button',
          properties: 'bg #2271C1, col white',
          textContent: 'Click me',
        }),
        expect.any(Object)
      )
    })

    it('includes default size for known components', () => {
      const componentData = createMockComponentData('Button')
      const event = createMockDragEvent('dragover', {
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          size: { width: 100, height: 40 }, // Button default size
        }),
        expect.any(Object)
      )
    })
  })

  describe('Drag Move', () => {
    beforeEach(() => {
      adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()
      // Start drag
      container.dispatchEvent(createMockDragEvent('dragover', { clientX: 100, clientY: 100 }))
    })

    it('subsequent dragover triggers dragMove', () => {
      container.dispatchEvent(createMockDragEvent('dragover', { clientX: 150, clientY: 200 }))

      expect(eventPort.triggerDragMove).toHaveBeenCalledWith({ x: 150, y: 200 })
    })

    it('multiple moves are tracked', () => {
      container.dispatchEvent(createMockDragEvent('dragover', { clientX: 110, clientY: 110 }))
      container.dispatchEvent(createMockDragEvent('dragover', { clientX: 120, clientY: 120 }))
      container.dispatchEvent(createMockDragEvent('dragover', { clientX: 130, clientY: 130 }))

      expect(eventPort.triggerDragMove).toHaveBeenCalledTimes(3)
    })

    it('does not trigger additional dragStart', () => {
      container.dispatchEvent(createMockDragEvent('dragover', { clientX: 150, clientY: 200 }))
      container.dispatchEvent(createMockDragEvent('dragover', { clientX: 160, clientY: 210 }))

      // Only the initial dragStart from beforeEach
      expect(eventPort.triggerDragStart).toHaveBeenCalledTimes(1)
    })
  })

  describe('Drag End (Drop)', () => {
    beforeEach(() => {
      adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()
      // Start drag
      container.dispatchEvent(createMockDragEvent('dragover'))
    })

    it('drop triggers dragEnd', () => {
      container.dispatchEvent(createMockDragEvent('drop'))

      expect(eventPort.triggerDragEnd).toHaveBeenCalledTimes(1)
    })

    it('resets isActive after drop', () => {
      expect(adapter.isActive()).toBe(true)

      container.dispatchEvent(createMockDragEvent('drop'))

      expect(adapter.isActive()).toBe(false)
    })

    it('drop without active drag does nothing', () => {
      // Cancel the drag first
      container.dispatchEvent(createMockDragEvent('dragleave'))
      eventPort.triggerDragEnd.mockClear()

      // Try to drop
      container.dispatchEvent(createMockDragEvent('drop'))

      expect(eventPort.triggerDragEnd).not.toHaveBeenCalled()
    })
  })

  describe('Drag Cancel', () => {
    beforeEach(() => {
      adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()
      // Start drag
      container.dispatchEvent(createMockDragEvent('dragover'))
    })

    it('dragleave outside container triggers dragCancel', () => {
      // relatedTarget = null means leaving to outside
      const event = createMockDragEvent('dragleave', { relatedTarget: null })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragCancel).toHaveBeenCalledTimes(1)
    })

    it('resets isActive after cancel', () => {
      expect(adapter.isActive()).toBe(true)

      container.dispatchEvent(createMockDragEvent('dragleave', { relatedTarget: null }))

      expect(adapter.isActive()).toBe(false)
    })

    it('dragleave to child element does NOT cancel', () => {
      // Create a child element
      const child = document.createElement('div')
      container.appendChild(child)

      // relatedTarget = child means moving to a child
      const event = createMockDragEvent('dragleave', { relatedTarget: child })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragCancel).not.toHaveBeenCalled()
      expect(adapter.isActive()).toBe(true)
    })
  })

  describe('Disabled State', () => {
    it('ignores events when disabled', () => {
      let disabled = false
      adapter = createNativeDragAdapter({
        container,
        eventPort,
        isDisabled: () => disabled,
      })
      adapter.init()

      // Enable, start drag
      container.dispatchEvent(createMockDragEvent('dragover'))
      expect(eventPort.triggerDragStart).toHaveBeenCalled()

      // Reset and disable
      eventPort.triggerDragStart.mockClear()
      adapter.dispose()
      adapter = createNativeDragAdapter({
        container,
        eventPort,
        isDisabled: () => true,
      })
      adapter.init()

      // Try to start drag while disabled
      container.dispatchEvent(createMockDragEvent('dragover'))
      expect(eventPort.triggerDragStart).not.toHaveBeenCalled()
    })
  })

  describe('Non-Mirror Drags', () => {
    beforeEach(() => {
      adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()
    })

    it('ignores dragover without mirror-component type', () => {
      const event = createMockDragEvent('dragover', {
        types: ['text/plain'], // Not a mirror-component
      })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).not.toHaveBeenCalled()
    })

    it('ignores drop without mirror-component type', () => {
      // First start a valid drag
      container.dispatchEvent(createMockDragEvent('dragover'))

      // Then try a drop with wrong type
      const dropEvent = createMockDragEvent('drop', {
        types: ['text/plain'],
      })
      container.dispatchEvent(dropEvent)

      // dragEnd should not be called for wrong type
      expect(eventPort.triggerDragEnd).not.toHaveBeenCalled()
    })
  })

  describe('Custom Size Provider', () => {
    it('uses custom size provider', () => {
      const customSizes: Record<string, { width: number; height: number }> = {
        CustomComponent: { width: 300, height: 200 },
      }

      adapter = createNativeDragAdapter({
        container,
        eventPort,
        getDefaultSize: (name) => customSizes[name] ?? { width: 50, height: 50 },
      })
      adapter.init()

      const componentData = createMockComponentData('CustomComponent')
      const event = createMockDragEvent('dragover', {
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).toHaveBeenCalledWith(
        expect.objectContaining({
          size: { width: 300, height: 200 },
        }),
        expect.any(Object)
      )
    })
  })
})

// ============================================
// Integration with DragDropController
// ============================================

describe('NativeDragAdapter + DragDropController Integration', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createTestContainer()
  })

  afterEach(() => {
    cleanupTestContainer()
  })

  it('can be used with DOMEventPort', async () => {
    // This test verifies the adapter works with the DOM EventPort
    const { createDOMEventPort } = await import(
      '../../../studio/drag-drop/system/adapters/dom-adapters'
    )
    const { DragDropController } = await import(
      '../../../studio/drag-drop/system/drag-drop-controller'
    )
    const { createMockPorts } = await import(
      '../../../studio/drag-drop/system/adapters/mock-adapters'
    )

    // Use mock ports but replace events with DOM event port
    const mockPorts = createMockPorts()
    const domEventPort = createDOMEventPort()

    const controller = new DragDropController({
      ...mockPorts,
      events: domEventPort,
    })
    controller.init()

    // Create adapter using the DOM event port
    const adapter = createNativeDragAdapter({
      container,
      eventPort: domEventPort,
    })
    adapter.init()

    // Simulate a drag from ComponentPanel
    const componentData = createMockComponentData('Frame', {
      properties: 'bg #1a1a1a',
    })

    container.dispatchEvent(
      createMockDragEvent('dragover', {
        clientX: 100,
        clientY: 100,
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
    )

    // Controller should be in dragging state
    expect(controller.getState().type).toBe('dragging')

    // Simulate drop
    container.dispatchEvent(
      createMockDragEvent('drop', {
        clientX: 150,
        clientY: 150,
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
    )

    // Controller should be back to idle (or dropped)
    const finalState = controller.getState().type
    expect(['idle', 'dropped']).toContain(finalState)

    // Clean up
    adapter.dispose()
    controller.dispose()
  })

  it('full drag flow: start → move → drop', async () => {
    const { createDOMEventPort } = await import(
      '../../../studio/drag-drop/system/adapters/dom-adapters'
    )

    const domEventPort = createDOMEventPort()

    // Track events
    const events: string[] = []
    domEventPort.onDragStart(() => events.push('start'))
    domEventPort.onDragMove(() => events.push('move'))
    domEventPort.onDragEnd(() => events.push('end'))

    const adapter = createNativeDragAdapter({
      container,
      eventPort: domEventPort,
    })
    adapter.init()

    const componentData = createMockComponentData('Button')

    // Start
    container.dispatchEvent(
      createMockDragEvent('dragover', {
        clientX: 100,
        clientY: 100,
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
    )

    // Move
    container.dispatchEvent(
      createMockDragEvent('dragover', {
        clientX: 150,
        clientY: 150,
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
    )

    // Drop
    container.dispatchEvent(
      createMockDragEvent('drop', {
        clientX: 200,
        clientY: 200,
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
    )

    expect(events).toEqual(['start', 'move', 'end'])

    adapter.dispose()
  })

  it('drag cancel flow: start → move → leave', async () => {
    const { createDOMEventPort } = await import(
      '../../../studio/drag-drop/system/adapters/dom-adapters'
    )

    const domEventPort = createDOMEventPort()

    const events: string[] = []
    domEventPort.onDragStart(() => events.push('start'))
    domEventPort.onDragMove(() => events.push('move'))
    domEventPort.onDragCancel(() => events.push('cancel'))

    const adapter = createNativeDragAdapter({
      container,
      eventPort: domEventPort,
    })
    adapter.init()

    const componentData = createMockComponentData('Input')

    // Start
    container.dispatchEvent(
      createMockDragEvent('dragover', {
        clientX: 100,
        clientY: 100,
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
    )

    // Move
    container.dispatchEvent(
      createMockDragEvent('dragover', {
        clientX: 150,
        clientY: 150,
        data: { [MIRROR_COMPONENT_MIME]: componentData },
      })
    )

    // Leave container
    container.dispatchEvent(
      createMockDragEvent('dragleave', {
        relatedTarget: null, // Leaving to outside
      })
    )

    expect(events).toEqual(['start', 'move', 'cancel'])

    adapter.dispose()
  })
})
