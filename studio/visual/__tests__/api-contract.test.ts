/**
 * Visual Module API Contract Tests
 *
 * Tests that OverlayManager and ResizeManager expose expected APIs.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OverlayManager, createOverlayManager } from '../overlay-manager'
import { ResizeManager, createResizeManager } from '../resize-manager'

describe('OverlayManager API Contract', () => {
  let container: HTMLElement
  let manager: OverlayManager

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.style.cssText = 'position: relative; width: 400px; height: 400px;'
    document.body.appendChild(container)

    manager = createOverlayManager({ container })
  })

  describe('required methods', () => {
    it('exposes showDropZone method', () => {
      expect(typeof manager.showDropZone).toBe('function')
    })

    it('exposes hideDropZone method', () => {
      expect(typeof manager.hideDropZone).toBe('function')
    })

    it('exposes showSemanticDots method', () => {
      expect(typeof manager.showSemanticDots).toBe('function')
    })

    it('exposes hideSemanticDots method', () => {
      expect(typeof manager.hideSemanticDots).toBe('function')
    })

    it('exposes showSiblingLine method', () => {
      expect(typeof manager.showSiblingLine).toBe('function')
    })

    it('exposes hideSiblingLine method', () => {
      expect(typeof manager.hideSiblingLine).toBe('function')
    })

    it('exposes showZoneIndicator method', () => {
      expect(typeof manager.showZoneIndicator).toBe('function')
    })

    it('exposes hideZoneIndicator method', () => {
      expect(typeof manager.hideZoneIndicator).toBe('function')
    })

    it('exposes showSizeIndicator method', () => {
      expect(typeof manager.showSizeIndicator).toBe('function')
    })

    it('exposes hideSizeIndicator method', () => {
      expect(typeof manager.hideSizeIndicator).toBe('function')
    })

    it('exposes ensureOverlay method', () => {
      expect(typeof manager.ensureOverlay).toBe('function')
    })

    it('exposes getResizeHandlesContainer method', () => {
      expect(typeof manager.getResizeHandlesContainer).toBe('function')
    })

    it('exposes clearResizeHandles method', () => {
      expect(typeof manager.clearResizeHandles).toBe('function')
    })

    it('exposes hideAll method', () => {
      expect(typeof manager.hideAll).toBe('function')
    })

    it('exposes dispose method', () => {
      expect(typeof manager.dispose).toBe('function')
    })
  })

  describe('showDropZone functionality', () => {
    it('accepts rect parameter', () => {
      expect(() => {
        manager.showDropZone({
          left: 10,
          top: 10,
          width: 100,
          height: 50,
        })
      }).not.toThrow()
    })

    it('multiple calls update position', () => {
      expect(() => {
        manager.showDropZone({ left: 0, top: 0, width: 50, height: 50 })
        manager.showDropZone({ left: 100, top: 100, width: 100, height: 100 })
        manager.showDropZone({ left: 50, top: 50, width: 75, height: 75 })
      }).not.toThrow()
    })
  })

  describe('hideDropZone functionality', () => {
    it('can be called without showDropZone', () => {
      expect(() => {
        manager.hideDropZone()
      }).not.toThrow()
    })

    it('can be called multiple times', () => {
      expect(() => {
        manager.hideDropZone()
        manager.hideDropZone()
        manager.hideDropZone()
      }).not.toThrow()
    })
  })

  describe('semantic dots', () => {
    it('showSemanticDots accepts rect and activeZone', () => {
      expect(() => {
        manager.showSemanticDots(
          { left: 10, top: 10, width: 200, height: 200 },
          'center'
        )
      }).not.toThrow()
    })

    it('showSemanticDots works with null activeZone', () => {
      expect(() => {
        manager.showSemanticDots(
          { left: 10, top: 10, width: 200, height: 200 },
          null
        )
      }).not.toThrow()
    })

    it('hideSemanticDots works', () => {
      manager.showSemanticDots({ left: 0, top: 0, width: 100, height: 100 }, 'top-left')
      expect(() => {
        manager.hideSemanticDots()
      }).not.toThrow()
    })
  })

  describe('sibling line', () => {
    it('showSiblingLine accepts rect, position, and direction', () => {
      expect(() => {
        manager.showSiblingLine(
          { left: 10, top: 10, width: 100, height: 50 },
          'before',
          'horizontal'
        )
      }).not.toThrow()
    })

    it('hideSiblingLine works', () => {
      manager.showSiblingLine({ left: 0, top: 0, width: 100, height: 50 }, 'after', 'vertical')
      expect(() => {
        manager.hideSiblingLine()
      }).not.toThrow()
    })
  })

  describe('zone indicator', () => {
    it('showZoneIndicator accepts container and zone names', () => {
      expect(() => {
        manager.showZoneIndicator('Box', 'top-left')
      }).not.toThrow()
    })

    it('hideZoneIndicator works', () => {
      manager.showZoneIndicator('Box', 'center')
      expect(() => {
        manager.hideZoneIndicator()
      }).not.toThrow()
    })
  })

  describe('size indicator', () => {
    it('showSizeIndicator accepts position and size strings', () => {
      expect(() => {
        manager.showSizeIndicator(100, 100, '200px', '150px')
      }).not.toThrow()
    })

    it('showSizeIndicator works with fill/hug strings', () => {
      expect(() => {
        manager.showSizeIndicator(100, 100, 'fill', 'hug')
      }).not.toThrow()
    })

    it('hideSizeIndicator works', () => {
      manager.showSizeIndicator(100, 100, '200px', '150px')
      expect(() => {
        manager.hideSizeIndicator()
      }).not.toThrow()
    })
  })

  describe('ensureOverlay', () => {
    it('ensures overlay element exists', () => {
      // Remove overlay
      const overlay = container.querySelector('.visual-overlay')
      overlay?.remove()

      manager.ensureOverlay()

      // Overlay should be recreated
      const newOverlay = container.querySelector('.visual-overlay')
      expect(newOverlay).not.toBeNull()
    })

    it('can be called multiple times safely', () => {
      expect(() => {
        manager.ensureOverlay()
        manager.ensureOverlay()
        manager.ensureOverlay()
      }).not.toThrow()
    })
  })

  describe('resize handles container', () => {
    it('getResizeHandlesContainer returns an HTMLElement', () => {
      const handlesContainer = manager.getResizeHandlesContainer()
      expect(handlesContainer).toBeInstanceOf(HTMLElement)
    })

    it('clearResizeHandles empties the container', () => {
      const handlesContainer = manager.getResizeHandlesContainer()
      handlesContainer.innerHTML = '<div>test</div>'
      expect(handlesContainer.children.length).toBeGreaterThan(0)

      manager.clearResizeHandles()
      expect(handlesContainer.children.length).toBe(0)
    })
  })

  describe('hideAll', () => {
    it('hides all visual elements', () => {
      manager.showDropZone({ left: 0, top: 0, width: 100, height: 50 })
      manager.showSemanticDots({ left: 0, top: 0, width: 200, height: 200 }, 'center')
      manager.showSiblingLine({ left: 0, top: 0, width: 100, height: 50 }, 'before', 'horizontal')
      manager.showZoneIndicator('Box', 'top-left')
      manager.showSizeIndicator(100, 100, '200px', '150px')

      expect(() => {
        manager.hideAll()
      }).not.toThrow()
    })
  })

  describe('dispose', () => {
    it('cleans up resources', () => {
      manager.showDropZone({ left: 0, top: 0, width: 100, height: 50 })
      manager.showSemanticDots({ left: 0, top: 0, width: 200, height: 200 }, 'center')

      expect(() => {
        manager.dispose()
      }).not.toThrow()
    })

    it('removes overlay from DOM', () => {
      expect(container.querySelector('.visual-overlay')).not.toBeNull()

      manager.dispose()

      expect(container.querySelector('.visual-overlay')).toBeNull()
    })
  })
})

describe('ResizeManager API Contract', () => {
  let container: HTMLElement
  let overlayManager: OverlayManager
  let resizeManager: ResizeManager

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.style.cssText = 'position: relative; width: 400px; height: 400px;'
    document.body.appendChild(container)

    // Add an element to resize
    const element = document.createElement('div')
    element.setAttribute('data-mirror-id', 'test-node')
    element.style.cssText = 'width: 100px; height: 100px;'
    container.appendChild(element)

    overlayManager = createOverlayManager({ container })
    resizeManager = createResizeManager({
      container,
      overlayManager,
      getSourceMap: () => null,
    })
  })

  describe('required methods', () => {
    it('exposes showHandles method', () => {
      expect(typeof resizeManager.showHandles).toBe('function')
    })

    it('exposes hideHandles method', () => {
      expect(typeof resizeManager.hideHandles).toBe('function')
    })

    it('exposes refresh method', () => {
      expect(typeof resizeManager.refresh).toBe('function')
    })

    it('exposes dispose method', () => {
      expect(typeof resizeManager.dispose).toBe('function')
    })
  })

  describe('showHandles functionality', () => {
    it('accepts nodeId parameter', () => {
      expect(() => {
        resizeManager.showHandles('test-node')
      }).not.toThrow()
    })

    it('handles non-existent nodeId gracefully', () => {
      expect(() => {
        resizeManager.showHandles('nonexistent-node')
      }).not.toThrow()
    })

    it('creates 8 resize handles', () => {
      resizeManager.showHandles('test-node')

      const handlesContainer = overlayManager.getResizeHandlesContainer()
      const handles = handlesContainer.querySelectorAll('.resize-handle')
      expect(handles.length).toBe(8)
    })
  })

  describe('hideHandles functionality', () => {
    it('can be called without showHandles', () => {
      expect(() => {
        resizeManager.hideHandles()
      }).not.toThrow()
    })

    it('can be called multiple times', () => {
      expect(() => {
        resizeManager.hideHandles()
        resizeManager.hideHandles()
      }).not.toThrow()
    })

    it('removes handles from DOM', () => {
      resizeManager.showHandles('test-node')
      const handlesContainer = overlayManager.getResizeHandlesContainer()
      expect(handlesContainer.querySelectorAll('.resize-handle').length).toBe(8)

      resizeManager.hideHandles()
      expect(handlesContainer.querySelectorAll('.resize-handle').length).toBe(0)
    })
  })

  describe('refresh functionality', () => {
    it('can be called at any time', () => {
      expect(() => {
        resizeManager.refresh()
      }).not.toThrow()
    })

    it('updates handles if shown', () => {
      resizeManager.showHandles('test-node')
      expect(() => {
        resizeManager.refresh()
      }).not.toThrow()
    })
  })

  describe('dispose', () => {
    it('cleans up resources', () => {
      resizeManager.showHandles('test-node')

      expect(() => {
        resizeManager.dispose()
      }).not.toThrow()
    })

    it('can be called multiple times', () => {
      expect(() => {
        resizeManager.dispose()
        resizeManager.dispose()
      }).not.toThrow()
    })
  })
})

describe('Visual Module Factory Functions', () => {
  let container: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  it('createOverlayManager returns OverlayManager instance', () => {
    const manager = createOverlayManager({ container })
    expect(manager).toBeInstanceOf(OverlayManager)
  })

  it('createResizeManager returns ResizeManager instance', () => {
    const overlayManager = createOverlayManager({ container })
    const manager = createResizeManager({
      container,
      overlayManager,
      getSourceMap: () => null,
    })
    expect(manager).toBeInstanceOf(ResizeManager)
  })
})
