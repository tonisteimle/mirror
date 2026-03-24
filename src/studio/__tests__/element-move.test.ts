/**
 * E2E Test: Element Move Operations
 *
 * Tests the complete flow of moving existing elements within the preview canvas.
 * This validates the integration of:
 * - makeCanvasElementDraggable setup
 * - Drag events firing correctly
 * - Drop handling with isMove flag
 * - CodeModifier.moveNode execution
 * - Source code updates
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  StudioDragDropService,
  createStudioDragDropService,
  makeCanvasElementDraggable,
} from '../../../studio/visual/services/studio-drag-drop-service'
import { SourceMapBuilder } from '../../ir/source-map'
import { CodeModifier } from '../code-modifier'

/**
 * Mock DataTransfer for JSDOM (which doesn't implement it)
 */
class MockDataTransfer {
  private data: Map<string, string> = new Map()
  public effectAllowed: string = 'none'
  public dropEffect: string = 'none'
  public types: string[] = []

  setData(type: string, data: string): void {
    this.data.set(type, data)
    if (!this.types.includes(type)) {
      this.types.push(type)
    }
  }

  getData(type: string): string {
    return this.data.get(type) || ''
  }

  clearData(type?: string): void {
    if (type) {
      this.data.delete(type)
      this.types = this.types.filter(t => t !== type)
    } else {
      this.data.clear()
      this.types = []
    }
  }

  setDragImage(_img: Element, _xOffset: number, _yOffset: number): void {
    // Mock implementation
  }
}

describe('Element Move E2E', () => {
  let dom: JSDOM

  /**
   * Create a DragEvent with MockDataTransfer
   * Must be defined inside describe to access dom variable
   */
  function createDragEvent(
    type: string,
    dataTransfer: MockDataTransfer,
    options: Partial<{ bubbles: boolean; cancelable: boolean; clientX: number; clientY: number }> = {}
  ): Event {
    // Use dom.window.Event to create events that JSDOM accepts
    const EventConstructor = dom.window.Event
    const event = new EventConstructor(type, {
      bubbles: options.bubbles ?? true,
      cancelable: options.cancelable ?? true,
    }) as any

    // Add DragEvent properties
    event.dataTransfer = dataTransfer
    event.clientX = options.clientX ?? 0
    event.clientY = options.clientY ?? 0

    return event
  }
  let container: HTMLElement
  let manager: StudioDragDropService
  let sourceMap: ReturnType<typeof SourceMapBuilder.prototype.build>
  let codeModifier: CodeModifier

  // Store original globals
  let originalDocument: any
  let originalWindow: any

  // Test source code with multiple elements
  const testSource = `App
  Box named header
  Box named content
  Box named footer`

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      pretendToBeVisual: true,
    })

    // Set global document and window for modules that depend on them
    originalDocument = globalThis.document
    originalWindow = globalThis.window
    globalThis.document = dom.window.document
    globalThis.window = dom.window as any

    // Mock Image constructor for JSDOM (used for transparent drag image)
    ;(globalThis as any).Image = class MockImage {
      src = ''
    }

    // Create preview container
    container = document.createElement('div')
    container.id = 'preview'
    document.body.appendChild(container)

    // Create DOM structure matching the source
    const app = document.createElement('div')
    app.dataset.mirrorId = 'node-1'
    app.dataset.mirrorName = 'App'
    app.dataset.mirrorRoot = 'true'
    app.style.display = 'flex'
    app.style.flexDirection = 'column'
    container.appendChild(app)

    const header = document.createElement('div')
    header.dataset.mirrorId = 'node-2'
    header.dataset.mirrorName = 'Box'
    header.textContent = 'Header'
    app.appendChild(header)

    const content = document.createElement('div')
    content.dataset.mirrorId = 'node-3'
    content.dataset.mirrorName = 'Box'
    content.textContent = 'Content'
    app.appendChild(content)

    const footer = document.createElement('div')
    footer.dataset.mirrorId = 'node-4'
    footer.dataset.mirrorName = 'Box'
    footer.textContent = 'Footer'
    app.appendChild(footer)

    // Build source map
    const builder = new SourceMapBuilder()
    builder.addNode('node-1', 'App', { line: 1, column: 1, endLine: 4, endColumn: 1 })
    builder.addNode('node-2', 'Box', { line: 2, column: 3, endLine: 2, endColumn: 20 }, 'node-1')
    builder.addNode('node-3', 'Box', { line: 3, column: 3, endLine: 3, endColumn: 21 }, 'node-1')
    builder.addNode('node-4', 'Box', { line: 4, column: 3, endLine: 4, endColumn: 20 }, 'node-1')
    sourceMap = builder.build()

    // Create code modifier
    codeModifier = new CodeModifier(testSource, sourceMap)

    // Create drag drop manager
    manager = createStudioDragDropService(container)
    manager.setCodeModifier(testSource, sourceMap)
  })

  afterEach(() => {
    // Restore original globals
    globalThis.document = originalDocument
    globalThis.window = originalWindow
    manager?.dispose()
  })

  describe('makeCanvasElementDraggable', () => {
    it('should set draggable attribute on element', () => {
      const element = container.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      makeCanvasElementDraggable(element, 'node-2', manager)

      expect(element.draggable).toBe(true)
    })

    it('should set drag source on manager during dragstart', () => {
      const element = container.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const setDragSourceSpy = vi.spyOn(manager, 'setDragSource')

      makeCanvasElementDraggable(element, 'node-2', manager)

      // Simulate dragstart
      const dataTransfer = new MockDataTransfer()
      const dragEvent = createDragEvent('dragstart', dataTransfer)
      element.dispatchEvent(dragEvent)

      expect(setDragSourceSpy).toHaveBeenCalledWith('node-2')
    })

    it('should set correct drag data with isMove flag', () => {
      const element = container.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      makeCanvasElementDraggable(element, 'node-2', manager)

      // Simulate dragstart
      const dataTransfer = new MockDataTransfer()
      const dragEvent = createDragEvent('dragstart', dataTransfer)
      element.dispatchEvent(dragEvent)

      // Check drag data
      const data = JSON.parse(dataTransfer.getData('application/mirror-component'))
      expect(data.componentName).toBe('Box')
      expect(data.sourceNodeId).toBe('node-2')
      expect(data.isMove).toBe(true)
    })

    it('should clear drag source on dragend', () => {
      const element = container.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const setDragSourceSpy = vi.spyOn(manager, 'setDragSource')

      makeCanvasElementDraggable(element, 'node-2', manager)

      // Start drag
      const dataTransfer = new MockDataTransfer()
      const dragStartEvent = createDragEvent('dragstart', dataTransfer)
      element.dispatchEvent(dragStartEvent)

      // End drag - dragend doesn't need dataTransfer but we pass empty one
      const dragEndEvent = createDragEvent('dragend', new MockDataTransfer())
      element.dispatchEvent(dragEndEvent)

      expect(setDragSourceSpy).toHaveBeenLastCalledWith(undefined)
    })
  })

  describe('Move operation via CodeModifier', () => {
    it('should move element before sibling', () => {
      // Move footer (node-4) before header (node-2)
      const result = codeModifier.moveNode('node-4', 'node-2', 'before')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Box named footer')

      // Footer should now be before header in the source
      const footerIndex = result.newSource.indexOf('Box named footer')
      const headerIndex = result.newSource.indexOf('Box named header')
      expect(footerIndex).toBeLessThan(headerIndex)
    })

    it('should move element after sibling', () => {
      // Move header (node-2) after footer (node-4)
      const result = codeModifier.moveNode('node-2', 'node-4', 'after')

      expect(result.success).toBe(true)

      // Header should now be after footer in the source
      const footerIndex = result.newSource.indexOf('Box named footer')
      const headerIndex = result.newSource.indexOf('Box named header')
      expect(headerIndex).toBeGreaterThan(footerIndex)
    })

    it('should reject move onto self', () => {
      const result = codeModifier.moveNode('node-2', 'node-2', 'before')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Cannot move node onto itself')
    })
  })

  describe('Full drop flow with move', () => {
    it('should execute move when drop has isMove flag', () => {
      let dropResult: any = null

      // Create manager with drop callback
      manager.dispose()
      manager = createStudioDragDropService(container, {}, {
        onDrop: (result) => {
          dropResult = result
        },
      })
      manager.setCodeModifier(testSource, sourceMap)

      const element = container.querySelector('[data-mirror-id="node-4"]') as HTMLElement
      makeCanvasElementDraggable(element, 'node-4', manager)

      // Simulate full drag-drop sequence
      // 1. Start drag
      const dataTransfer = new MockDataTransfer()
      const dragStartEvent = createDragEvent('dragstart', dataTransfer)
      element.dispatchEvent(dragStartEvent)

      // 2. Simulate drop on container
      const dropEvent = createDragEvent('drop', dataTransfer, {
        clientX: 100,
        clientY: 50,
      })
      container.dispatchEvent(dropEvent)

      // Check result - drop was processed (even if zone calculation is limited in JSDOM)
      expect(dropResult).not.toBeNull()
    })
  })

  describe('Integration: Setup and drag data flow', () => {
    it('should preserve component name from data-mirror-name', () => {
      const element = container.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      // Verify the element has the correct name attribute
      expect(element.dataset.mirrorName).toBe('Box')

      makeCanvasElementDraggable(element, 'node-2', manager)

      const dataTransfer = new MockDataTransfer()
      const dragEvent = createDragEvent('dragstart', dataTransfer)
      element.dispatchEvent(dragEvent)

      const data = JSON.parse(dataTransfer.getData('application/mirror-component'))
      expect(data.componentName).toBe('Box')
    })

    it('should fall back to tagName when data-mirror-name is missing', () => {
      const element = container.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      delete element.dataset.mirrorName

      makeCanvasElementDraggable(element, 'node-2', manager)

      const dataTransfer = new MockDataTransfer()
      const dragEvent = createDragEvent('dragstart', dataTransfer)
      element.dispatchEvent(dragEvent)

      const data = JSON.parse(dataTransfer.getData('application/mirror-component'))
      expect(data.componentName).toBe('div')
    })
  })
})
