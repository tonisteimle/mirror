/**
 * AlignmentDetector Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { AlignmentDetector, createAlignmentDetector } from '../alignment-detector'

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

describe('AlignmentDetector', () => {
  let dom: JSDOM
  let container: HTMLElement

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const document = dom.window.document
    global.document = document as unknown as Document
    global.window = dom.window as unknown as Window & typeof globalThis

    container = document.createElement('div')
    container.style.position = 'relative'
    container.style.width = '400px'
    container.style.height = '300px'
    document.body.appendChild(container)
  })

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  /**
   * Helper to create an absolutely positioned element with mocked getBoundingClientRect
   */
  function createAbsoluteElement(
    nodeId: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): HTMLElement {
    const el = global.document.createElement('div')
    el.setAttribute('data-mirror-id', nodeId)
    Object.assign(el.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    })

    // Mock getBoundingClientRect since JSDOM doesn't compute layout
    el.getBoundingClientRect = () => new MockDOMRect(x, y, width, height) as DOMRect

    // Mock getComputedStyle
    const originalGetComputedStyle = global.window.getComputedStyle
    global.window.getComputedStyle = (element: Element) => {
      if (element === el) {
        return { position: 'absolute' } as CSSStyleDeclaration
      }
      return originalGetComputedStyle(element)
    }

    container.appendChild(el)
    return el
  }

  describe('detect()', () => {
    it('returns empty groups when no absolute elements exist', () => {
      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      expect(result.groups).toHaveLength(0)
      expect(result.timestamp).toBeDefined()
    })

    it('returns empty groups when only one absolute element exists', () => {
      createAbsoluteElement('node-1', 10, 50, 50, 30)

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      expect(result.groups).toHaveLength(0)
    })

    it('detects horizontal alignment of two elements', () => {
      // Two elements at same Y position, separated horizontally
      createAbsoluteElement('icon-1', 10, 50, 24, 24)
      createAbsoluteElement('text-1', 50, 52, 60, 20) // Y within 10px tolerance

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      expect(result.groups).toHaveLength(1)
      expect(result.groups[0].type).toBe('horizontal')
      expect(result.groups[0].elements).toHaveLength(2)
      expect(result.groups[0].elements[0].nodeId).toBe('icon-1')
      expect(result.groups[0].elements[1].nodeId).toBe('text-1')
    })

    it('calculates correct gap between elements', () => {
      // Elements with 8px gap between them
      // el-1: x=10, width=30, right=40
      // el-2: x=48, gap = 48 - 40 = 8px
      createAbsoluteElement('el-1', 10, 50, 30, 24)
      createAbsoluteElement('el-2', 48, 52, 30, 24)

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      expect(result.groups[0].inferredGap).toBe(8)
    })

    it('rounds gap to 4px grid', () => {
      // Elements with 10px gap → should round to 12
      // el-1: x=10, width=30, right=40
      // el-2: x=50, gap = 50 - 40 = 10px
      createAbsoluteElement('el-1', 10, 50, 30, 24)
      createAbsoluteElement('el-2', 50, 50, 30, 24)

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      // 10 rounded to nearest 4 = 12
      expect(result.groups[0].inferredGap).toBe(12)
    })

    it('does not group elements with Y difference > tolerance', () => {
      // centerY of el-1 = 50 + 12 = 62
      // centerY of el-2 = 80 + 12 = 92
      // diff = 30 > 10px tolerance
      createAbsoluteElement('el-1', 10, 50, 30, 24)
      createAbsoluteElement('el-2', 60, 80, 30, 24)

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      expect(result.groups).toHaveLength(0)
    })

    it('does not group overlapping elements', () => {
      // el-1: x=10, width=50, right=60
      // el-2: x=40, starts before el-1 ends
      createAbsoluteElement('el-1', 10, 50, 50, 24)
      createAbsoluteElement('el-2', 40, 52, 30, 24)

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      expect(result.groups).toHaveLength(0)
    })

    it('groups three aligned elements', () => {
      createAbsoluteElement('el-1', 10, 50, 24, 24)
      createAbsoluteElement('el-2', 50, 52, 24, 24)
      createAbsoluteElement('el-3', 90, 51, 24, 24)

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      expect(result.groups).toHaveLength(1)
      expect(result.groups[0].elements).toHaveLength(3)
    })

    it('generates correct suggestedDSL for horizontal alignment', () => {
      // el-1: x=10, width=24, right=34
      // el-2: x=50, gap = 50 - 34 = 16
      createAbsoluteElement('el-1', 10, 50, 24, 24)
      createAbsoluteElement('el-2', 50, 52, 24, 24)

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      expect(result.groups[0].suggestedDSL).toBe('hor, gap 16')
    })

    it('ignores non-absolute elements', () => {
      // Create a static positioned element
      const staticEl = global.document.createElement('div')
      staticEl.setAttribute('data-mirror-id', 'static-1')
      staticEl.style.position = 'static'
      staticEl.getBoundingClientRect = () => new MockDOMRect(10, 50, 30, 24) as DOMRect
      const originalGetComputedStyle = global.window.getComputedStyle
      global.window.getComputedStyle = (element: Element) => {
        if (element === staticEl) {
          return { position: 'static' } as CSSStyleDeclaration
        }
        return originalGetComputedStyle(element)
      }
      container.appendChild(staticEl)

      createAbsoluteElement('el-1', 60, 50, 24, 24)

      const detector = createAlignmentDetector({ container })
      const result = detector.detect()

      // Only one absolute element, so no groups
      expect(result.groups).toHaveLength(0)
    })

    it('respects custom tolerance', () => {
      // Elements with Y center diff = 8px
      // el-1: centerY = 50 + 12 = 62
      // el-2: centerY = 58 + 12 = 70
      // diff = 8
      createAbsoluteElement('el-1', 10, 50, 24, 24)
      createAbsoluteElement('el-2', 50, 58, 24, 24)

      // Default tolerance (10px) - should group
      const detector1 = createAlignmentDetector({ container, tolerance: 10 })
      expect(detector1.detect().groups).toHaveLength(1)

      // Smaller tolerance (5px) - should not group
      const detector2 = createAlignmentDetector({ container, tolerance: 5 })
      expect(detector2.detect().groups).toHaveLength(0)
    })
  })

  describe('setTolerance()', () => {
    it('updates the tolerance', () => {
      // centerY diff = 15
      // el-1: centerY = 50 + 12 = 62
      // el-2: centerY = 65 + 12 = 77
      // diff = 15
      createAbsoluteElement('el-1', 10, 50, 24, 24)
      createAbsoluteElement('el-2', 50, 65, 24, 24)

      const detector = createAlignmentDetector({ container })

      // Default tolerance (10px) - should not group
      expect(detector.detect().groups).toHaveLength(0)

      // Increase tolerance
      detector.setTolerance(20)
      expect(detector.detect().groups).toHaveLength(1)
    })
  })
})
