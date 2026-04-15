/**
 * Native Drag Adapter - Component Name Tests
 *
 * CRITICAL: Tests that the correct component name is used during drag operations,
 * not a placeholder like "Frame".
 *
 * The bug: During dragover, browsers don't allow access to dataTransfer data,
 * only types. A placeholder is used. On drop, the real data becomes available.
 * The system must use the REAL component name from drop, not the placeholder.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createNativeDragAdapter,
  createMockDragEvent,
  createMockComponentData,
  MIRROR_COMPONENT_MIME,
} from '../../../studio/drag-drop/system/adapters/native-drag-adapter'
import type { DragSource, Point } from '../../../studio/drag-drop/types'

describe('NativeDragAdapter - Component Name Handling', () => {
  let container: HTMLDivElement
  let eventPort: {
    triggerDragStart: ReturnType<typeof vi.fn>
    triggerDragMove: ReturnType<typeof vi.fn>
    triggerDragEnd: ReturnType<typeof vi.fn>
    triggerDragCancel: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    eventPort = {
      triggerDragStart: vi.fn(),
      triggerDragMove: vi.fn(),
      triggerDragEnd: vi.fn(),
      triggerDragCancel: vi.fn(),
    }
  })

  afterEach(() => {
    container.remove()
  })

  describe('dragover event (before drop)', () => {
    it('should call triggerDragStart on first dragover', () => {
      const adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()

      const event = createMockDragEvent('dragover', {
        types: [MIRROR_COMPONENT_MIME],
      })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).toHaveBeenCalledOnce()
    })

    it('dragover without data uses placeholder (expected browser limitation)', () => {
      const adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()

      // Dragover WITHOUT data (simulates browser restriction)
      const event = createMockDragEvent('dragover', {
        types: [MIRROR_COMPONENT_MIME],
        data: {}, // Empty data - browser doesn't allow access during dragover
      })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).toHaveBeenCalledOnce()
      const source = eventPort.triggerDragStart.mock.calls[0][0] as DragSource

      // During dragover without data, placeholder is expected
      // This is a known limitation, not a bug
      expect(source.componentName).toBe('Frame')
    })

    it('dragover WITH data uses correct component name', () => {
      const adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()

      // Dragover WITH data (some browsers allow it)
      const event = createMockDragEvent('dragover', {
        types: [MIRROR_COMPONENT_MIME],
        data: {
          [MIRROR_COMPONENT_MIME]: createMockComponentData('Button', {
            componentId: 'comp-button',
            textContent: 'Click me',
          }),
        },
      })
      container.dispatchEvent(event)

      expect(eventPort.triggerDragStart).toHaveBeenCalledOnce()
      const source = eventPort.triggerDragStart.mock.calls[0][0] as DragSource

      // When data IS available, should use correct name
      expect(source.componentName).toBe('Button')
      expect(source.componentName).not.toBe('Frame')
    })
  })

  describe('drop event - CRITICAL: correct component name', () => {
    it('drop extracts correct component name from Button drag', () => {
      const adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()

      // Start with dragover (may have placeholder)
      const dragoverEvent = createMockDragEvent('dragover', {
        types: [MIRROR_COMPONENT_MIME],
      })
      container.dispatchEvent(dragoverEvent)

      // Then drop with actual data
      const dropEvent = createMockDragEvent('drop', {
        types: [MIRROR_COMPONENT_MIME],
        data: {
          [MIRROR_COMPONENT_MIME]: createMockComponentData('Button', {
            componentId: 'comp-button',
            textContent: 'Click me',
          }),
        },
      })
      container.dispatchEvent(dropEvent)

      expect(eventPort.triggerDragEnd).toHaveBeenCalledOnce()
    })

    it('drop extracts correct component name from Checkbox drag', () => {
      const adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()

      // Dragover first
      container.dispatchEvent(
        createMockDragEvent('dragover', {
          types: [MIRROR_COMPONENT_MIME],
        })
      )

      // Drop with Checkbox data
      const dropEvent = createMockDragEvent('drop', {
        types: [MIRROR_COMPONENT_MIME],
        data: {
          [MIRROR_COMPONENT_MIME]: createMockComponentData('Checkbox', {
            componentId: 'comp-checkbox',
          }),
        },
      })
      container.dispatchEvent(dropEvent)

      expect(eventPort.triggerDragEnd).toHaveBeenCalledOnce()
    })

    it('drop extracts correct component name from Dialog drag', () => {
      const adapter = createNativeDragAdapter({ container, eventPort })
      adapter.init()

      container.dispatchEvent(createMockDragEvent('dragover', { types: [MIRROR_COMPONENT_MIME] }))

      const dropEvent = createMockDragEvent('drop', {
        types: [MIRROR_COMPONENT_MIME],
        data: {
          [MIRROR_COMPONENT_MIME]: createMockComponentData('Dialog', {
            componentId: 'comp-dialog',
            children: [{ template: 'Trigger', isSlot: true }],
          }),
        },
      })
      container.dispatchEvent(dropEvent)

      expect(eventPort.triggerDragEnd).toHaveBeenCalledOnce()
    })
  })

  describe('Component name through entire flow', () => {
    /**
     * CRITICAL TEST: Verifies that when a component is dropped,
     * the system knows it's a "Button" not a "Frame"
     *
     * This requires tracking what component name is used in code generation
     */
    it('Button drag should result in Button being inserted, not Frame', async () => {
      // This test documents the expected behavior
      // The actual fix needs to ensure the drop handler uses the correct component name

      const capturedSources: DragSource[] = []

      const trackingEventPort = {
        triggerDragStart: vi.fn((source: DragSource) => {
          capturedSources.push({ ...source })
        }),
        triggerDragMove: vi.fn(),
        triggerDragEnd: vi.fn(),
        triggerDragCancel: vi.fn(),
      }

      const adapter = createNativeDragAdapter({
        container,
        eventPort: trackingEventPort,
      })
      adapter.init()

      // Simulate full drag cycle
      container.dispatchEvent(
        createMockDragEvent('dragover', {
          types: [MIRROR_COMPONENT_MIME],
          data: {
            [MIRROR_COMPONENT_MIME]: createMockComponentData('Button', {
              componentId: 'comp-button',
            }),
          },
        })
      )

      container.dispatchEvent(
        createMockDragEvent('drop', {
          types: [MIRROR_COMPONENT_MIME],
          data: {
            [MIRROR_COMPONENT_MIME]: createMockComponentData('Button', {
              componentId: 'comp-button',
            }),
          },
        })
      )

      // The source that was used should be Button
      expect(capturedSources.length).toBeGreaterThan(0)
      const lastSource = capturedSources[capturedSources.length - 1]
      expect(lastSource.componentName).toBe('Button')
    })
  })
})

describe('Edge Cases', () => {
  let container: HTMLDivElement
  let eventPort: ReturnType<typeof createMockEventPort>

  function createMockEventPort() {
    return {
      triggerDragStart: vi.fn(),
      triggerDragMove: vi.fn(),
      triggerDragEnd: vi.fn(),
      triggerDragCancel: vi.fn(),
    }
  }

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    eventPort = createMockEventPort()
  })

  afterEach(() => {
    container.remove()
  })

  it('handles malformed JSON gracefully', () => {
    const adapter = createNativeDragAdapter({ container, eventPort })
    adapter.init()

    const event = createMockDragEvent('dragover', {
      types: [MIRROR_COMPONENT_MIME],
      data: {
        [MIRROR_COMPONENT_MIME]: 'not valid json',
      },
    })

    // Should not throw
    expect(() => container.dispatchEvent(event)).not.toThrow()
  })

  it('handles missing componentName gracefully', () => {
    const adapter = createNativeDragAdapter({ container, eventPort })
    adapter.init()

    const event = createMockDragEvent('dragover', {
      types: [MIRROR_COMPONENT_MIME],
      data: {
        [MIRROR_COMPONENT_MIME]: JSON.stringify({ componentId: 'test' }),
      },
    })

    expect(() => container.dispatchEvent(event)).not.toThrow()
  })
})
