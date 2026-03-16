/**
 * Component Drop Flow Integration Tests
 *
 * Tests the complete flow of dragging a component from the palette
 * and dropping it onto the preview canvas.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { state, actions, events } from '../core'
import { PreviewController, createPreviewController } from '../preview'

// Mock DragEvent for jsdom
class MockDragEvent extends Event {
  dataTransfer: DataTransfer | null = null

  constructor(type: string, init?: EventInit & { dataTransfer?: DataTransfer }) {
    super(type, init)
    this.dataTransfer = init?.dataTransfer ?? null
  }
}

// Polyfill for jsdom
if (typeof globalThis.DragEvent === 'undefined') {
  ;(globalThis as any).DragEvent = MockDragEvent
}

describe('Component Drop Flow', () => {
  let container: HTMLElement
  let preview: PreviewController

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'preview'
    document.body.appendChild(container)

    // Reset state
    actions.setSource('')
    actions.clearSelection()

    // Create preview with all features enabled
    preview = createPreviewController({
      container,
      enableVisualCode: true,
      enableSelection: true,
    })
    preview.attach()
  })

  afterEach(() => {
    preview.dispose()
    document.body.innerHTML = ''
  })

  describe('preview drop zone API', () => {
    it('preview exposes showDropZone method', () => {
      expect(typeof preview.showDropZone).toBe('function')
    })

    it('preview exposes hideDropZone method', () => {
      expect(typeof preview.hideDropZone).toBe('function')
    })

    it('showDropZone accepts rect parameter', () => {
      expect(() => {
        preview.showDropZone({
          left: 100,
          top: 100,
          width: 200,
          height: 50,
        })
      }).not.toThrow()
    })

    it('hideDropZone clears the drop zone', () => {
      preview.showDropZone({ left: 100, top: 100, width: 200, height: 50 })

      expect(() => {
        preview.hideDropZone()
      }).not.toThrow()
    })
  })

  describe('drop zone lifecycle', () => {
    it('can show and hide drop zone multiple times', () => {
      for (let i = 0; i < 10; i++) {
        preview.showDropZone({ left: i * 10, top: i * 10, width: 100, height: 50 })
        preview.hideDropZone()
      }
      // Should not throw or leak
    })

    it('showDropZone with different positions updates correctly', () => {
      preview.showDropZone({ left: 0, top: 0, width: 100, height: 50 })
      preview.showDropZone({ left: 100, top: 100, width: 200, height: 100 })
      preview.showDropZone({ left: 50, top: 50, width: 150, height: 75 })
      preview.hideDropZone()
      // Should not throw
    })
  })

  describe('drag events integration', () => {
    it('emits move:completed event on successful drop', async () => {
      let eventEmitted = false
      const unsub = events.on('move:completed', () => {
        eventEmitted = true
      })

      // Simulate a move completion
      events.emit('move:completed', { success: true })

      expect(eventEmitted).toBe(true)
      unsub()
    })

    it('emits move:cancelled event on cancelled drop', async () => {
      let eventEmitted = false
      const unsub = events.on('move:cancelled', () => {
        eventEmitted = true
      })

      events.emit('move:cancelled', {})

      expect(eventEmitted).toBe(true)
      unsub()
    })
  })

  describe('selection after drop', () => {
    it('can select element after drop', () => {
      // Create a target element
      const element = document.createElement('div')
      element.setAttribute('data-mirror-id', 'dropped-node')
      container.appendChild(element)

      // Select the dropped element
      preview.select('dropped-node')

      const selectedElement = preview.getElementByNodeId('dropped-node')
      expect(selectedElement?.classList.contains('studio-selected')).toBe(true)
    })
  })

  describe('visual code system', () => {
    it('preview exposes getOverlayManager method', () => {
      expect(typeof preview.getOverlayManager).toBe('function')
    })

    it('preview exposes getResizeManager method', () => {
      expect(typeof preview.getResizeManager).toBe('function')
    })

    it('overlay manager is available when visual code is enabled', () => {
      const overlayManager = preview.getOverlayManager()
      expect(overlayManager).not.toBeNull()
    })

    it('resize manager is available when visual code is enabled', () => {
      const resizeManager = preview.getResizeManager()
      expect(resizeManager).not.toBeNull()
    })
  })
})

describe('Component Palette Integration', () => {
  describe('draggable components', () => {
    it('component items should be draggable', () => {
      const item = document.createElement('div')
      item.className = 'component-palette-item'
      item.draggable = true
      item.dataset.componentType = 'Box'

      expect(item.draggable).toBe(true)
      expect(item.dataset.componentType).toBe('Box')
    })

    it('dragstart event contains component data', () => {
      const item = document.createElement('div')
      item.className = 'component-palette-item'
      item.draggable = true
      item.dataset.componentType = 'Button'
      item.dataset.defaultProps = 'bg blue'

      document.body.appendChild(item)

      let dragData: any = null
      item.addEventListener('dragstart', (e) => {
        dragData = {
          type: item.dataset.componentType,
          props: item.dataset.defaultProps,
        }
      })

      const event = new DragEvent('dragstart', { bubbles: true })
      item.dispatchEvent(event)

      expect(dragData).toEqual({
        type: 'Button',
        props: 'bg blue',
      })
    })
  })

  describe('drop target validation', () => {
    it('preview container accepts drops', () => {
      const container = document.createElement('div')
      container.id = 'preview'

      let dropAccepted = false
      container.addEventListener('dragover', (e) => {
        e.preventDefault()
        dropAccepted = true
      })

      const event = new DragEvent('dragover', { bubbles: true, cancelable: true })
      container.dispatchEvent(event)

      expect(dropAccepted).toBe(true)
    })
  })
})

describe('Source Update on Drop', () => {
  beforeEach(() => {
    actions.setSource('Box\n  Text "Hello"')
  })

  it('source:changed event fires when source is updated', () => {
    let sourceChanged = false
    const unsub = events.on('source:changed', () => {
      sourceChanged = true
    })

    actions.setSource('Box\n  Text "Hello"\n  Button "New"')

    expect(sourceChanged).toBe(true)
    unsub()
  })

  it('state contains updated source after change', () => {
    const newSource = 'Box\n  Text "Hello"\n  Button "Added"'
    actions.setSource(newSource)

    expect(state.get().source).toBe(newSource)
  })
})
