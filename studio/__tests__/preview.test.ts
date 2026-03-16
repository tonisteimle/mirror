/**
 * Comprehensive Tests for PreviewController
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PreviewController, createPreviewController } from '../preview'
import { events } from '../core'

// Mock DOM environment
function createMockContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'preview'
  document.body.appendChild(container)
  return container
}

function createMockElement(nodeId: string, parent: HTMLElement): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-mirror-id', nodeId)
  parent.appendChild(el)
  return el
}

describe('PreviewController', () => {
  let container: HTMLElement
  let controller: PreviewController

  beforeEach(() => {
    container = createMockContainer()
  })

  afterEach(() => {
    if (controller) {
      controller.dispose()
    }
    document.body.innerHTML = ''
  })

  describe('Creation', () => {
    it('should create with default config', () => {
      controller = createPreviewController({ container })
      expect(controller).toBeDefined()
    })

    it('should accept custom selectedClass', () => {
      controller = new PreviewController({
        container,
        selectedClass: 'custom-selected',
      })
      expect(controller).toBeDefined()
    })

    it('should accept custom hoverClass', () => {
      controller = new PreviewController({
        container,
        hoverClass: 'custom-hover',
      })
      expect(controller).toBeDefined()
    })

    it('should accept custom nodeIdAttribute', () => {
      controller = new PreviewController({
        container,
        nodeIdAttribute: 'data-custom-id',
      })
      expect(controller).toBeDefined()
    })
  })

  describe('Attach/Detach', () => {
    it('should attach event listeners', () => {
      controller = createPreviewController({ container })
      const addEventSpy = vi.spyOn(container, 'addEventListener')

      controller.attach()

      expect(addEventSpy).toHaveBeenCalled()
    })

    it('should detach event listeners', () => {
      controller = createPreviewController({ container })
      const removeEventSpy = vi.spyOn(container, 'removeEventListener')

      controller.attach()
      controller.detach()

      expect(removeEventSpy).toHaveBeenCalled()
    })
  })

  describe('Selection', () => {
    beforeEach(() => {
      controller = createPreviewController({ container })
      controller.attach()
    })

    it('should select element by nodeId', () => {
      const element = createMockElement('box-1', container)

      controller.select('box-1')

      expect(element.classList.contains('studio-selected')).toBe(true)
    })

    it('should deselect previous element when selecting new one', () => {
      const element1 = createMockElement('box-1', container)
      const element2 = createMockElement('box-2', container)

      controller.select('box-1')
      controller.select('box-2')

      expect(element1.classList.contains('studio-selected')).toBe(false)
      expect(element2.classList.contains('studio-selected')).toBe(true)
    })

    it('should clear selection with null', () => {
      const element = createMockElement('box-1', container)

      controller.select('box-1')
      controller.select(null)

      expect(element.classList.contains('studio-selected')).toBe(false)
    })

    it('should call selection callbacks', () => {
      createMockElement('box-1', container)
      const callback = vi.fn()

      controller.onSelect(callback)
      controller.select('box-1')

      expect(callback).toHaveBeenCalledWith('box-1', expect.any(HTMLElement))
    })

    it('should call selection callbacks with null on clear', () => {
      createMockElement('box-1', container)
      const callback = vi.fn()

      controller.onSelect(callback)
      controller.select('box-1')
      controller.clearSelection()

      expect(callback).toHaveBeenLastCalledWith(null, null)
    })

    it('should not reselect same element', () => {
      createMockElement('box-1', container)
      const callback = vi.fn()

      controller.onSelect(callback)
      controller.select('box-1')
      controller.select('box-1') // Same selection

      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should unsubscribe selection callback', () => {
      createMockElement('box-1', container)
      const callback = vi.fn()

      const unsubscribe = controller.onSelect(callback)
      unsubscribe()
      controller.select('box-1')

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Click Handling', () => {
    beforeEach(() => {
      controller = createPreviewController({ container })
      controller.attach()
    })

    it('should select element on click', () => {
      const element = createMockElement('box-1', container)
      const callback = vi.fn()
      controller.onSelect(callback)

      element.click()

      expect(callback).toHaveBeenCalledWith('box-1', element)
    })

    it('should select parent element when clicking nested element', () => {
      const parent = createMockElement('parent-1', container)
      const child = document.createElement('span')
      child.textContent = 'Click me'
      parent.appendChild(child)

      const callback = vi.fn()
      controller.onSelect(callback)

      child.click()

      expect(callback).toHaveBeenCalledWith('parent-1', parent)
    })
  })

  describe('Hover Handling', () => {
    beforeEach(() => {
      controller = createPreviewController({ container, enableHover: true })
      controller.attach()
    })

    it('should add hover class on mouseover', () => {
      const element = createMockElement('box-1', container)

      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

      expect(element.classList.contains('studio-hover')).toBe(true)
    })

    it('should remove hover class on mouseout', () => {
      const element = createMockElement('box-1', container)

      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      element.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: container }))

      expect(element.classList.contains('studio-hover')).toBe(false)
    })

    it('should call hover callbacks', () => {
      const element = createMockElement('box-1', container)
      const callback = vi.fn()

      controller.onHover(callback)
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

      expect(callback).toHaveBeenCalledWith('box-1', element)
    })

    it('should emit preview:element-hovered event', () => {
      const element = createMockElement('box-1', container)
      const handler = vi.fn()
      const unsub = events.on('preview:element-hovered', handler)

      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

      expect(handler).toHaveBeenCalledWith({ nodeId: 'box-1', element })
      unsub()
    })

    it('should unsubscribe hover callback', () => {
      createMockElement('box-1', container)
      const callback = vi.fn()

      const unsubscribe = controller.onHover(callback)
      unsubscribe()

      container.querySelector('[data-mirror-id]')!.dispatchEvent(
        new MouseEvent('mouseover', { bubbles: true })
      )

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Refresh', () => {
    beforeEach(() => {
      controller = createPreviewController({ container })
      controller.attach()
    })

    it('should re-apply selection after refresh', () => {
      const element = createMockElement('box-1', container)
      controller.select('box-1')

      // Simulate DOM update that removes classes
      element.classList.remove('studio-selected')

      controller.refresh()

      expect(element.classList.contains('studio-selected')).toBe(true)
    })

    it('should handle refresh with no selection', () => {
      expect(() => controller.refresh()).not.toThrow()
    })

    it('should handle refresh when element no longer exists', () => {
      const element = createMockElement('box-1', container)
      controller.select('box-1')

      // Remove element from DOM
      element.remove()

      expect(() => controller.refresh()).not.toThrow()
    })
  })

  describe('Dispose', () => {
    it('should clean up on dispose', () => {
      controller = createPreviewController({ container })
      controller.attach()

      const element = createMockElement('box-1', container)
      controller.select('box-1')

      controller.dispose()

      expect(element.classList.contains('studio-selected')).toBe(false)
    })

    it('should clear all callbacks on dispose', () => {
      controller = createPreviewController({ container })
      const selectCallback = vi.fn()
      const hoverCallback = vi.fn()

      controller.onSelect(selectCallback)
      controller.onHover(hoverCallback)
      controller.attach()
      controller.dispose()

      // Try to trigger callbacks (should not work)
      const element = createMockElement('box-2', container)
      element.click()
      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

      expect(selectCallback).not.toHaveBeenCalled()
      expect(hoverCallback).not.toHaveBeenCalled()
    })
  })

  describe('getElementByNodeId', () => {
    beforeEach(() => {
      controller = createPreviewController({ container })
    })

    it('should find element by nodeId', () => {
      const element = createMockElement('test-node', container)

      const found = controller.getElementByNodeId('test-node')

      expect(found).toBe(element)
    })

    it('should return null for non-existent nodeId', () => {
      const found = controller.getElementByNodeId('non-existent')

      expect(found).toBeNull()
    })

    it('should use custom nodeIdAttribute', () => {
      controller = new PreviewController({
        container,
        nodeIdAttribute: 'data-custom-id',
      })

      const element = document.createElement('div')
      element.setAttribute('data-custom-id', 'custom-node')
      container.appendChild(element)

      const found = controller.getElementByNodeId('custom-node')

      expect(found).toBe(element)
    })
  })

  describe('SourceMap Integration', () => {
    beforeEach(() => {
      controller = createPreviewController({ container })
    })

    it('should accept sourceMap', () => {
      const mockSourceMap = { nodes: new Map() }

      expect(() => controller.setSourceMap(mockSourceMap as any)).not.toThrow()
    })

    it('should accept null sourceMap', () => {
      expect(() => controller.setSourceMap(null)).not.toThrow()
    })
  })

  describe('Disable Selection', () => {
    it('should not respond to clicks when selection disabled', () => {
      controller = new PreviewController({
        container,
        enableSelection: false,
      })
      controller.attach()

      const element = createMockElement('box-1', container)
      const callback = vi.fn()
      controller.onSelect(callback)

      element.click()

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Disable Hover', () => {
    it('should not respond to hover when hover disabled', () => {
      controller = new PreviewController({
        container,
        enableHover: false,
      })
      controller.attach()

      const element = createMockElement('box-1', container)
      const callback = vi.fn()
      controller.onHover(callback)

      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))

      expect(callback).not.toHaveBeenCalled()
    })
  })
})

describe('createPreviewController', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should be a factory function', () => {
    expect(typeof createPreviewController).toBe('function')
  })

  it('should return PreviewController instance', () => {
    const controller = createPreviewController({ container })
    expect(controller).toBeInstanceOf(PreviewController)
    controller.dispose()
  })
})
