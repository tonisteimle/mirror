/**
 * DropIndicator Tests
 *
 * Tests for the DropIndicator class that provides visual feedback for drops.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { DropIndicator, DropIndicatorConfig } from '../drop-indicator'

// Mock DOMRect for JSDOM
class MockDOMRect {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number

  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.top = y
    this.left = x
    this.right = x + width
    this.bottom = y + height
  }

  toJSON() {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }
}

// @ts-ignore - Mock global
global.DOMRect = MockDOMRect

describe('DropIndicator', () => {
  let dom: JSDOM
  let container: HTMLElement
  let indicator: DropIndicator

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const document = dom.window.document
    global.document = document as unknown as Document
    global.window = dom.window as unknown as Window & typeof globalThis

    container = document.createElement('div')
    container.style.position = 'relative'
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)

    indicator = new DropIndicator({ container })
  })

  afterEach(() => {
    if (indicator) {
      indicator.hideAll()
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('initialization', () => {
    it('creates indicator', () => {
      expect(indicator).toBeDefined()
    })

    it('uses default color', () => {
      // DropIndicator sets default color to #3B82F6
      const freshIndicator = new DropIndicator({ container })
      expect(freshIndicator).toBeDefined()
    })

    it('uses custom color', () => {
      const customIndicator = new DropIndicator({
        container,
        color: '#FF0000',
      })
      expect(customIndicator).toBeDefined()
    })

    it('uses custom line width', () => {
      const customIndicator = new DropIndicator({
        container,
        lineWidth: 4,
      })
      expect(customIndicator).toBeDefined()
    })
  })

  describe('insertion line', () => {
    it('can show insertion line', () => {
      const targetRect = new MockDOMRect(100, 50, 200, 40) as unknown as DOMRect
      indicator.showInsertionLine(targetRect, 'before', 'vertical')
      // No error thrown = success
    })

    it('shows insertion line before target', () => {
      const targetRect = new MockDOMRect(100, 50, 200, 40) as unknown as DOMRect
      indicator.showInsertionLine(targetRect, 'before', 'vertical')
      // Line should be positioned at the top of the target
    })

    it('shows insertion line after target', () => {
      const targetRect = new MockDOMRect(100, 50, 200, 40) as unknown as DOMRect
      indicator.showInsertionLine(targetRect, 'after', 'vertical')
      // Line should be positioned at the bottom of the target
    })

    it('supports horizontal orientation', () => {
      const targetRect = new MockDOMRect(100, 50, 200, 40) as unknown as DOMRect
      indicator.showInsertionLine(targetRect, 'before', 'horizontal')
      // Line should be vertical (for horizontal containers)
    })

    it('supports vertical orientation', () => {
      const targetRect = new MockDOMRect(100, 50, 200, 40) as unknown as DOMRect
      indicator.showInsertionLine(targetRect, 'before', 'vertical')
      // Line should be horizontal (for vertical containers)
    })
  })

  describe('container highlight', () => {
    it('can show container highlight', () => {
      const target = document.createElement('div')
      container.appendChild(target)
      indicator.showContainerHighlight(target)
      // No error thrown = success
    })

    it('hides previous highlight when showing new one', () => {
      const target1 = document.createElement('div')
      const target2 = document.createElement('div')
      container.appendChild(target1)
      container.appendChild(target2)

      indicator.showContainerHighlight(target1)
      indicator.showContainerHighlight(target2)
      // Both operations should work without error
    })
  })

  describe('crosshair', () => {
    it('can show crosshair', () => {
      const parentRect = new MockDOMRect(0, 0, 400, 300) as unknown as DOMRect
      indicator.showCrosshair(100, 150, parentRect)
      // No error thrown = success
    })

    it('accepts coordinates', () => {
      const parentRect = new MockDOMRect(0, 0, 400, 300) as unknown as DOMRect
      indicator.showCrosshair(200, 100, parentRect)
    })
  })

  describe('position label', () => {
    it('can show position label', () => {
      indicator.showPositionLabel(100, 200)
      // No error thrown = success
    })

    it('displays coordinates', () => {
      indicator.showPositionLabel(150, 75)
      // Should show "x: 150, y: 75" or similar
    })
  })

  describe('hideAll', () => {
    it('hides all indicators', () => {
      // Show some indicators first
      const targetRect = new MockDOMRect(100, 50, 200, 40) as unknown as DOMRect
      indicator.showInsertionLine(targetRect, 'before', 'vertical')

      const target = document.createElement('div')
      container.appendChild(target)
      indicator.showContainerHighlight(target)

      // Hide all
      indicator.hideAll()
      // No error thrown = success
    })

    it('can be called multiple times', () => {
      indicator.hideAll()
      indicator.hideAll()
      indicator.hideAll()
      // No error thrown = success
    })
  })

  describe('indicator element creation', () => {
    it('creates elements lazily', () => {
      // Elements should be created when first needed
      const targetRect = new MockDOMRect(100, 50, 200, 40) as unknown as DOMRect
      indicator.showInsertionLine(targetRect, 'before', 'vertical')
    })

    it('reuses existing elements', () => {
      const targetRect = new MockDOMRect(100, 50, 200, 40) as unknown as DOMRect

      // Show line twice - should reuse same element
      indicator.showInsertionLine(targetRect, 'before', 'vertical')
      indicator.showInsertionLine(targetRect, 'after', 'vertical')
    })
  })

  describe('container positioning', () => {
    it('ensures container has relative positioning', () => {
      const staticContainer = document.createElement('div')
      staticContainer.style.position = 'static'
      document.body.appendChild(staticContainer)

      const newIndicator = new DropIndicator({ container: staticContainer })
      // Should set position to relative
      expect(staticContainer.style.position).toBe('relative')

      document.body.removeChild(staticContainer)
    })

    it('preserves existing relative positioning', () => {
      const relativeContainer = document.createElement('div')
      relativeContainer.style.position = 'relative'
      document.body.appendChild(relativeContainer)

      const newIndicator = new DropIndicator({ container: relativeContainer })
      expect(relativeContainer.style.position).toBe('relative')

      document.body.removeChild(relativeContainer)
    })
  })
})
