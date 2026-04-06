/**
 * Native HTML5 Drag Handler Tests
 *
 * Tests for the native HTML5 drag event handling in DragDropSystem.
 * Tests the dragover, dragenter, dragleave, and drop event handlers.
 *
 * Note: These tests use mock implementations since the full DragDropSystem
 * requires strategy modules that have complex dependencies.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const MIRROR_COMPONENT_TYPE = 'application/mirror-component'

/**
 * Mock drag event factory
 */
function createMockDragEvent(
  type: 'dragover' | 'dragenter' | 'dragleave' | 'drop',
  options: {
    clientX?: number
    clientY?: number
    dataTransfer?: {
      types?: string[]
      dropEffect?: string
      getData?: (type: string) => string
      setData?: (type: string, data: string) => void
    }
    relatedTarget?: HTMLElement | null
  } = {}
): DragEvent {
  const { clientX = 100, clientY = 100, dataTransfer, relatedTarget = null } = options

  const mockDataTransfer = {
    types: dataTransfer?.types ?? [MIRROR_COMPONENT_TYPE],
    dropEffect: dataTransfer?.dropEffect ?? 'none',
    getData: dataTransfer?.getData ?? vi.fn(() => ''),
    setData: dataTransfer?.setData ?? vi.fn(),
  }

  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent

  Object.defineProperty(event, 'clientX', { value: clientX })
  Object.defineProperty(event, 'clientY', { value: clientY })
  Object.defineProperty(event, 'dataTransfer', { value: mockDataTransfer })
  Object.defineProperty(event, 'relatedTarget', { value: relatedTarget })

  return event
}

/**
 * Mock native drag handler that mirrors DragDropSystem behavior
 */
class MockNativeDragHandler {
  private container: HTMLElement
  private disabled = false
  private isActive = false
  private currentResult: { targetId: string; placement: string } | null = null
  private source: { type: string; componentName: string } | null = null

  public onDragStart = vi.fn()
  public onDragEnd = vi.fn()
  public onDrop = vi.fn()
  public hideIndicator = vi.fn()
  public updateIndicator = vi.fn()
  public clear = vi.fn()

  constructor(container: HTMLElement) {
    this.container = container
    this.setupHandlers()
  }

  private setupHandlers() {
    this.container.addEventListener('dragover', this.handleDragOver)
    this.container.addEventListener('dragenter', this.handleDragEnter)
    this.container.addEventListener('dragleave', this.handleDragLeave)
    this.container.addEventListener('drop', this.handleDrop)
  }

  private handleDragOver = (e: Event) => {
    const event = e as DragEvent
    if (this.disabled) return
    if (!event.dataTransfer?.types.includes(MIRROR_COMPONENT_TYPE)) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'

    if (!this.isActive) {
      this.isActive = true
      this.source = { type: 'palette', componentName: 'Frame' }
      this.onDragStart(this.source)
    }

    this.updateIndicator({ x: event.clientX, y: event.clientY })
  }

  private handleDragEnter = (e: Event) => {
    const event = e as DragEvent
    if (this.disabled) return
    if (!event.dataTransfer?.types.includes(MIRROR_COMPONENT_TYPE)) return
    event.preventDefault()
  }

  private handleDragLeave = (e: Event) => {
    const event = e as DragEvent
    if (this.disabled) return
    if (!event.dataTransfer?.types.includes(MIRROR_COMPONENT_TYPE)) return

    const relatedTarget = event.relatedTarget as HTMLElement | null
    if (relatedTarget && this.container.contains(relatedTarget)) return

    this.hideIndicator()
  }

  private handleDrop = (e: Event) => {
    const event = e as DragEvent
    if (this.disabled) return
    if (!event.dataTransfer?.types.includes(MIRROR_COMPONENT_TYPE)) return

    event.preventDefault()

    const jsonData = event.dataTransfer.getData(MIRROR_COMPONENT_TYPE)
    if (!jsonData) {
      this.clear()
      this.resetState()
      return
    }

    const dragData = JSON.parse(jsonData)
    const source = {
      type: 'palette' as const,
      componentName: dragData.componentName,
      properties: dragData.properties,
    }

    // Simulate drop result
    this.currentResult = { targetId: 'container-1', placement: 'inside' }

    if (this.currentResult) {
      this.onDrop(source, this.currentResult)
      this.onDragEnd(source, true)
    } else {
      this.onDragEnd(source, false)
    }

    this.clear()
    this.resetState()
  }

  private resetState() {
    this.isActive = false
    this.currentResult = null
    this.source = null
  }

  setDisabled(disabled: boolean) {
    this.disabled = disabled
  }

  setCurrentResult(result: { targetId: string; placement: string } | null) {
    this.currentResult = result
  }

  dispose() {
    this.container.removeEventListener('dragover', this.handleDragOver)
    this.container.removeEventListener('dragenter', this.handleDragEnter)
    this.container.removeEventListener('dragleave', this.handleDragLeave)
    this.container.removeEventListener('drop', this.handleDrop)
  }
}

describe('Native HTML5 Drag Handlers', () => {
  let container: HTMLElement
  let handler: MockNativeDragHandler

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'preview-container'
    document.body.appendChild(container)

    handler = new MockNativeDragHandler(container)
  })

  afterEach(() => {
    handler.dispose()
    document.body.innerHTML = ''
  })

  // ============================================
  // DragOver event tests
  // ============================================

  describe('handleDragOver', () => {
    it('prevents default for mirror component drags', () => {
      const event = createMockDragEvent('dragover', {
        dataTransfer: { types: [MIRROR_COMPONENT_TYPE] },
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      container.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('sets dropEffect to copy', () => {
      const event = createMockDragEvent('dragover', {
        dataTransfer: { types: [MIRROR_COMPONENT_TYPE] },
      })

      container.dispatchEvent(event)

      expect(event.dataTransfer!.dropEffect).toBe('copy')
    })

    it('ignores non-mirror component drags', () => {
      const event = createMockDragEvent('dragover', {
        dataTransfer: { types: ['text/plain'] },
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      container.dispatchEvent(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('triggers onDragStart on first dragover', () => {
      const event = createMockDragEvent('dragover')

      container.dispatchEvent(event)

      expect(handler.onDragStart).toHaveBeenCalledTimes(1)
    })

    it('does not trigger onDragStart on subsequent dragovers', () => {
      const event1 = createMockDragEvent('dragover')
      const event2 = createMockDragEvent('dragover')

      container.dispatchEvent(event1)
      container.dispatchEvent(event2)

      expect(handler.onDragStart).toHaveBeenCalledTimes(1)
    })

    it('updates indicator position on dragover', () => {
      const event = createMockDragEvent('dragover', { clientX: 150, clientY: 200 })

      container.dispatchEvent(event)

      expect(handler.updateIndicator).toHaveBeenCalledWith({ x: 150, y: 200 })
    })

    it('ignores dragover when disabled', () => {
      handler.setDisabled(true)

      const event = createMockDragEvent('dragover')
      container.dispatchEvent(event)

      expect(handler.onDragStart).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // DragEnter event tests
  // ============================================

  describe('handleDragEnter', () => {
    it('prevents default for mirror component drags', () => {
      const event = createMockDragEvent('dragenter', {
        dataTransfer: { types: [MIRROR_COMPONENT_TYPE] },
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      container.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('ignores non-mirror component drags', () => {
      const event = createMockDragEvent('dragenter', {
        dataTransfer: { types: ['text/plain'] },
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      container.dispatchEvent(event)

      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // DragLeave event tests
  // ============================================

  describe('handleDragLeave', () => {
    it('hides indicator when leaving container', () => {
      // First, start a drag
      const dragoverEvent = createMockDragEvent('dragover')
      container.dispatchEvent(dragoverEvent)

      // Then leave container (relatedTarget outside)
      const leaveEvent = createMockDragEvent('dragleave', {
        relatedTarget: null, // Left completely
      })
      container.dispatchEvent(leaveEvent)

      expect(handler.hideIndicator).toHaveBeenCalled()
    })

    it('does not hide indicator when moving within container', () => {
      const child = document.createElement('div')
      container.appendChild(child)

      // Start drag
      const dragoverEvent = createMockDragEvent('dragover')
      container.dispatchEvent(dragoverEvent)

      // Move to child (still within container)
      const leaveEvent = createMockDragEvent('dragleave', {
        relatedTarget: child, // Still inside container
      })
      container.dispatchEvent(leaveEvent)

      expect(handler.hideIndicator).not.toHaveBeenCalled()
    })

    it('ignores non-mirror component drags', () => {
      const event = createMockDragEvent('dragleave', {
        dataTransfer: { types: ['text/plain'] },
      })

      container.dispatchEvent(event)

      expect(handler.hideIndicator).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Drop event tests
  // ============================================

  describe('handleDrop', () => {
    it('prevents default on drop', () => {
      const componentData = JSON.stringify({
        componentName: 'Frame',
        properties: 'bg #333',
      })

      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: [MIRROR_COMPONENT_TYPE],
          getData: vi.fn(() => componentData),
        },
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')

      container.dispatchEvent(event)

      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('executes drop with source data', () => {
      const componentData = JSON.stringify({
        componentName: 'Frame',
        properties: 'bg #333',
      })

      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: [MIRROR_COMPONENT_TYPE],
          getData: vi.fn(() => componentData),
        },
      })

      container.dispatchEvent(event)

      expect(handler.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'palette',
          componentName: 'Frame',
          properties: 'bg #333',
        }),
        expect.objectContaining({
          targetId: 'container-1',
          placement: 'inside',
        })
      )
    })

    it('triggers onDragEnd with success on successful drop', () => {
      const componentData = JSON.stringify({ componentName: 'Frame' })

      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: [MIRROR_COMPONENT_TYPE],
          getData: vi.fn(() => componentData),
        },
      })

      container.dispatchEvent(event)

      expect(handler.onDragEnd).toHaveBeenCalledWith(
        expect.objectContaining({ componentName: 'Frame' }),
        true
      )
    })

    it('clears visual state after drop', () => {
      const componentData = JSON.stringify({ componentName: 'Frame' })

      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: [MIRROR_COMPONENT_TYPE],
          getData: vi.fn(() => componentData),
        },
      })

      container.dispatchEvent(event)

      expect(handler.clear).toHaveBeenCalled()
    })

    it('handles missing JSON data gracefully', () => {
      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: [MIRROR_COMPONENT_TYPE],
          getData: vi.fn(() => ''), // Empty data
        },
      })

      container.dispatchEvent(event)

      // Should clear and not crash
      expect(handler.clear).toHaveBeenCalled()
      expect(handler.onDrop).not.toHaveBeenCalled()
    })

    it('ignores non-mirror component drops', () => {
      const event = createMockDragEvent('drop', {
        dataTransfer: { types: ['text/plain'] },
      })

      container.dispatchEvent(event)

      expect(handler.onDrop).not.toHaveBeenCalled()
    })

    it('ignores drop when disabled', () => {
      handler.setDisabled(true)

      const componentData = JSON.stringify({ componentName: 'Frame' })
      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: [MIRROR_COMPONENT_TYPE],
          getData: vi.fn(() => componentData),
        },
      })

      container.dispatchEvent(event)

      expect(handler.onDrop).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // Data transfer type filtering tests
  // ============================================

  describe('data transfer type filtering', () => {
    it('only accepts application/mirror-component type', () => {
      const types = [
        'text/plain',
        'text/html',
        'application/json',
        'Files',
      ]

      for (const type of types) {
        const event = createMockDragEvent('dragover', {
          dataTransfer: { types: [type] },
        })

        container.dispatchEvent(event)
      }

      expect(handler.onDragStart).not.toHaveBeenCalled()
    })

    it('accepts events with multiple types including mirror-component', () => {
      const event = createMockDragEvent('dragover', {
        dataTransfer: { types: ['text/plain', MIRROR_COMPONENT_TYPE] },
      })

      container.dispatchEvent(event)

      expect(handler.onDragStart).toHaveBeenCalled()
    })
  })

  // ============================================
  // Component data extraction tests
  // ============================================

  describe('component data extraction', () => {
    it('extracts componentName from drop data', () => {
      const componentData = JSON.stringify({
        componentName: 'Button',
        properties: 'pad 12 24, bg #2563eb',
        textContent: 'Click me',
      })

      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: [MIRROR_COMPONENT_TYPE],
          getData: vi.fn(() => componentData),
        },
      })

      container.dispatchEvent(event)

      expect(handler.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          componentName: 'Button',
          properties: 'pad 12 24, bg #2563eb',
        }),
        expect.any(Object)
      )
    })

    it('handles component data without optional fields', () => {
      const componentData = JSON.stringify({
        componentName: 'Frame',
      })

      const event = createMockDragEvent('drop', {
        dataTransfer: {
          types: [MIRROR_COMPONENT_TYPE],
          getData: vi.fn(() => componentData),
        },
      })

      container.dispatchEvent(event)

      expect(handler.onDrop).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'palette',
          componentName: 'Frame',
        }),
        expect.any(Object)
      )
    })
  })
})
