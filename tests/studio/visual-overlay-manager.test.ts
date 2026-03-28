/**
 * OverlayManager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { OverlayManager, createOverlayManager } from '../../studio/visual/overlay-manager'

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
})
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
global.window = dom.window as unknown as Window & typeof globalThis

describe('OverlayManager', () => {
  let container: HTMLElement
  let manager: OverlayManager

  beforeEach(() => {
    container = document.createElement('div')
    container.style.position = 'relative'
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)

    manager = createOverlayManager({ container })
  })

  afterEach(() => {
    manager.dispose()
    container.remove()
  })

  describe('creation', () => {
    it('creates overlay element in container', () => {
      expect(container.querySelector('.visual-overlay')).not.toBeNull()
    })

    it('creates all overlay sub-elements', () => {
      expect(container.querySelector('.resize-handles')).not.toBeNull()
      expect(container.querySelector('.drop-zone-highlight')).not.toBeNull()
      expect(container.querySelector('.semantic-dots')).not.toBeNull()
      expect(container.querySelector('.sibling-line')).not.toBeNull()
      expect(container.querySelector('.zone-indicator')).not.toBeNull()
      expect(container.querySelector('.size-indicator')).not.toBeNull()
    })

    it('sets container position to relative if static', () => {
      const staticContainer = document.createElement('div')
      // Explicitly set position to static (JSDOM default may be empty)
      staticContainer.style.position = 'static'
      document.body.appendChild(staticContainer)

      const mgr = createOverlayManager({ container: staticContainer })

      // The OverlayManager should have set position to relative
      expect(staticContainer.style.position).toBe('relative')

      mgr.dispose()
      staticContainer.remove()
    })
  })

  describe('ensureOverlay()', () => {
    it('re-appends overlay if removed', () => {
      const overlay = container.querySelector('.visual-overlay')
      overlay?.remove()

      expect(container.querySelector('.visual-overlay')).toBeNull()

      manager.ensureOverlay()

      expect(container.querySelector('.visual-overlay')).not.toBeNull()
    })
  })

  describe('resize handles', () => {
    it('returns resize handles container', () => {
      const handles = manager.getResizeHandlesContainer()
      expect(handles).toBeDefined()
      expect(handles.classList.contains('resize-handles')).toBe(true)
    })

    it('clears resize handles', () => {
      const handles = manager.getResizeHandlesContainer()
      handles.innerHTML = '<div class="test-handle"></div>'

      manager.clearResizeHandles()

      expect(handles.innerHTML).toBe('')
    })
  })

  describe('size indicator', () => {
    it('shows size indicator at position', () => {
      manager.showSizeIndicator(100, 50, '200px', '100px')

      const indicator = container.querySelector('.size-indicator') as HTMLElement
      expect(indicator.style.display).toBe('block')
      expect(indicator.style.left).toBe('100px')
      expect(indicator.style.top).toBe('50px')
      expect(indicator.textContent).toBe('200px × 100px')
    })

    it('hides size indicator', () => {
      manager.showSizeIndicator(100, 50, '200px', '100px')
      manager.hideSizeIndicator()

      const indicator = container.querySelector('.size-indicator') as HTMLElement
      expect(indicator.style.display).toBe('none')
    })
  })

  describe('semantic dots', () => {
    it('shows semantic dots with 9 zones', () => {
      const rect = { left: 100, top: 50, width: 200, height: 150 }
      manager.showSemanticDots(rect, null)

      const dotsContainer = container.querySelector('.semantic-dots') as HTMLElement
      expect(dotsContainer.style.display).toBe('block')
      expect(dotsContainer.querySelectorAll('.zone-dot').length).toBe(9)
    })

    it('marks active zone', () => {
      const rect = { left: 100, top: 50, width: 200, height: 150 }
      manager.showSemanticDots(rect, 'center')

      const activeDot = container.querySelector('.zone-dot.center.active')
      expect(activeDot).not.toBeNull()
    })

    it('positions container correctly', () => {
      const rect = { left: 100, top: 50, width: 200, height: 150 }
      manager.showSemanticDots(rect, null)

      const dotsContainer = container.querySelector('.semantic-dots') as HTMLElement
      expect(dotsContainer.style.left).toBe('100px')
      expect(dotsContainer.style.top).toBe('50px')
      expect(dotsContainer.style.width).toBe('200px')
      expect(dotsContainer.style.height).toBe('150px')
    })

    it('hides semantic dots', () => {
      const rect = { left: 100, top: 50, width: 200, height: 150 }
      manager.showSemanticDots(rect, null)
      manager.hideSemanticDots()

      const dotsContainer = container.querySelector('.semantic-dots') as HTMLElement
      expect(dotsContainer.style.display).toBe('none')
      expect(dotsContainer.innerHTML).toBe('')
    })
  })

  describe('sibling line', () => {
    it('shows horizontal sibling line (before)', () => {
      const rect = { left: 100, top: 50, width: 200, height: 80 }
      manager.showSiblingLine(rect, 'before', 'horizontal')

      const line = container.querySelector('.sibling-line') as HTMLElement
      expect(line.style.display).toBe('block')
      expect(line.style.left).toBe('98px') // 100 - 2
      expect(line.style.top).toBe('50px')
      expect(line.style.width).toBe('4px')
      expect(line.style.height).toBe('80px')
    })

    it('shows horizontal sibling line (after)', () => {
      const rect = { left: 100, top: 50, width: 200, height: 80 }
      manager.showSiblingLine(rect, 'after', 'horizontal')

      const line = container.querySelector('.sibling-line') as HTMLElement
      expect(line.style.left).toBe('298px') // 100 + 200 - 2
    })

    it('shows vertical sibling line (before)', () => {
      const rect = { left: 100, top: 50, width: 200, height: 80 }
      manager.showSiblingLine(rect, 'before', 'vertical')

      const line = container.querySelector('.sibling-line') as HTMLElement
      expect(line.style.display).toBe('block')
      expect(line.style.left).toBe('100px')
      expect(line.style.top).toBe('48px') // 50 - 2
      expect(line.style.width).toBe('200px')
      expect(line.style.height).toBe('4px')
    })

    it('shows vertical sibling line (after)', () => {
      const rect = { left: 100, top: 50, width: 200, height: 80 }
      manager.showSiblingLine(rect, 'after', 'vertical')

      const line = container.querySelector('.sibling-line') as HTMLElement
      expect(line.style.top).toBe('128px') // 50 + 80 - 2
    })

    it('hides sibling line', () => {
      const rect = { left: 100, top: 50, width: 200, height: 80 }
      manager.showSiblingLine(rect, 'before', 'horizontal')
      manager.hideSiblingLine()

      const line = container.querySelector('.sibling-line') as HTMLElement
      expect(line.style.display).toBe('none')
    })
  })

  describe('zone indicator', () => {
    it('shows zone indicator with container and zone names', () => {
      manager.showZoneIndicator('Header', 'top-center')

      const indicator = container.querySelector('.zone-indicator') as HTMLElement
      const nameEl = indicator.querySelector('.zone-name') as HTMLElement

      expect(indicator.classList.contains('visible')).toBe(true)
      expect(nameEl.textContent).toBe('Header | top-center')
    })

    it('hides zone indicator', () => {
      manager.showZoneIndicator('Header', 'top-center')
      manager.hideZoneIndicator()

      const indicator = container.querySelector('.zone-indicator') as HTMLElement
      expect(indicator.classList.contains('visible')).toBe(false)
    })
  })

  describe('hideAll()', () => {
    it('hides all overlay elements', () => {
      // Show everything
      const rect = { left: 100, top: 50, width: 200, height: 150 }
      manager.showSizeIndicator(100, 50, '200px', '100px')
      manager.showSemanticDots(rect, 'center')
      manager.showSiblingLine(rect, 'before', 'horizontal')
      manager.showZoneIndicator('Container', 'center')

      // Hide all
      manager.hideAll()

      const sizeIndicator = container.querySelector('.size-indicator') as HTMLElement
      const semanticDots = container.querySelector('.semantic-dots') as HTMLElement
      const siblingLine = container.querySelector('.sibling-line') as HTMLElement
      const zoneIndicator = container.querySelector('.zone-indicator') as HTMLElement

      expect(sizeIndicator.style.display).toBe('none')
      expect(semanticDots.style.display).toBe('none')
      expect(siblingLine.style.display).toBe('none')
      expect(zoneIndicator.classList.contains('visible')).toBe(false)
    })
  })

  describe('dispose()', () => {
    it('removes overlay from DOM', () => {
      expect(container.querySelector('.visual-overlay')).not.toBeNull()

      manager.dispose()

      expect(container.querySelector('.visual-overlay')).toBeNull()
    })
  })
})
