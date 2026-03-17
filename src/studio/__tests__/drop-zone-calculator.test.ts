/**
 * Tests for DropZoneCalculator
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DropZoneCalculator,
  createDropZoneCalculator,
} from '../drop-zone-calculator'

// ===========================================
// TEST HELPERS
// ===========================================

let mockElementAtPoint: HTMLElement | null = null

function setupElementFromPointMock() {
  // @ts-ignore - jsdom doesn't have this
  document.elementFromPoint = vi.fn(() => mockElementAtPoint)
}

function setMockElementAtPoint(element: HTMLElement | null) {
  mockElementAtPoint = element
}

function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.style.position = 'relative'
  container.style.width = '400px'
  container.style.height = '400px'
  document.body.appendChild(container)
  return container
}

function createNodeElement(
  nodeId: string,
  options: {
    name?: string
    width?: number
    height?: number
    top?: number
    left?: number
    display?: string
    flexDirection?: string
  } = {}
): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute('data-mirror-id', nodeId)
  if (options.name) {
    element.dataset.mirrorName = options.name
  }

  element.style.position = 'absolute'
  element.style.width = `${options.width || 100}px`
  element.style.height = `${options.height || 50}px`
  element.style.top = `${options.top || 0}px`
  element.style.left = `${options.left || 0}px`

  if (options.display) {
    element.style.display = options.display
  }
  if (options.flexDirection) {
    element.style.flexDirection = options.flexDirection
  }

  return element
}

function mockElementRect(element: HTMLElement, rect: DOMRect) {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(rect)
}

// ===========================================
// DROP ZONE CALCULATOR CLASS
// ===========================================

describe('DropZoneCalculator', () => {
  let container: HTMLElement
  let calculator: DropZoneCalculator

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
    calculator = new DropZoneCalculator(container)
  })

  afterEach(() => {
    calculator.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  describe('Construction', () => {
    it('should create with default options', () => {
      expect(calculator).toBeDefined()
    })

    it('should accept custom options', () => {
      const customCalc = new DropZoneCalculator(container, {
        nodeIdAttribute: 'data-custom-id',
        edgeThreshold: 0.3,
        allowInside: false,
        leafElements: ['Custom'],
      })
      expect(customCalc).toBeDefined()
      customCalc.dispose()
    })

    it('should create indicator elements', () => {
      const indicators = container.querySelectorAll('.mirror-drop-indicator')
      expect(indicators.length).toBeGreaterThan(0)
    })

    it('should create dot elements', () => {
      const dots = container.querySelectorAll('.mirror-drop-indicator-dot')
      expect(dots.length).toBe(2)
    })
  })

  describe('calculateFromPoint', () => {
    it('should return null for point outside container', () => {
      const result = calculator.calculateFromPoint(-100, -100)
      expect(result).toBeNull()
    })

    it('should return null when no node element at point', () => {
      const result = calculator.calculateFromPoint(50, 50)
      expect(result).toBeNull()
    })

    it('should find node element at point', () => {
      const node = createNodeElement('box-1', { top: 10, left: 10, width: 100, height: 50 })
      container.appendChild(node)
      setMockElementAtPoint(node)

      const result = calculator.calculateFromPoint(50, 30)

      expect(result).not.toBeNull()
      expect(result!.targetId).toBe('box-1')
    })

    it('should determine placement for containers', () => {
      const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      const result = calculator.calculateFromPoint(50, 50)

      expect(result).not.toBeNull()
      expect(['inside', 'before', 'after']).toContain(result?.placement)
    })

    it('should prevent self-drop', () => {
      const node = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      const result = calculator.calculateFromPoint(50, 50, 'box-1')

      expect(result).toBeNull()
    })

    it('should prevent dropping into descendants', () => {
      const parent = createNodeElement('parent', { top: 0, left: 0, width: 200, height: 200 })
      const child = createNodeElement('child', { top: 10, left: 10, width: 100, height: 100 })
      parent.appendChild(child)
      container.appendChild(parent)

      mockElementRect(child, new DOMRect(10, 10, 100, 100))
      setMockElementAtPoint(child)

      const result = calculator.calculateFromPoint(50, 50, 'parent')

      expect(result).toBeNull()
    })
  })

  describe('updateDropZone', () => {
    it('should update current drop zone', () => {
      const node = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      calculator.updateDropZone(50, 50)

      expect(calculator.getCurrentDropZone()).not.toBeNull()
      expect(calculator.getCurrentDropZone()!.targetId).toBe('box-1')
    })

    it('should update when zone changes', () => {
      const node1 = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 50 })
      const node2 = createNodeElement('box-2', { top: 60, left: 0, width: 100, height: 50 })
      container.appendChild(node1)
      container.appendChild(node2)

      mockElementRect(node1, new DOMRect(0, 0, 100, 50))
      setMockElementAtPoint(node1)
      calculator.updateDropZone(50, 25)

      expect(calculator.getCurrentDropZone()!.targetId).toBe('box-1')

      mockElementRect(node2, new DOMRect(0, 60, 100, 50))
      setMockElementAtPoint(node2)
      calculator.updateDropZone(50, 80)

      expect(calculator.getCurrentDropZone()!.targetId).toBe('box-2')
    })
  })

  describe('getCurrentDropZone', () => {
    it('should return null when no drop zone', () => {
      expect(calculator.getCurrentDropZone()).toBeNull()
    })

    it('should return current drop zone after update', () => {
      const node = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      calculator.updateDropZone(50, 50)

      const zone = calculator.getCurrentDropZone()
      expect(zone).not.toBeNull()
      expect(zone!.targetId).toBe('box-1')
      expect(zone!.element).toBe(node)
    })
  })

  describe('clear', () => {
    it('should clear current drop zone', () => {
      const node = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      calculator.updateDropZone(50, 50)
      expect(calculator.getCurrentDropZone()).not.toBeNull()

      calculator.clear()
      expect(calculator.getCurrentDropZone()).toBeNull()
    })

    it('should hide indicators', () => {
      calculator.clear()

      const indicator = container.querySelector('.mirror-drop-indicator') as HTMLElement
      expect(indicator?.style.display).toBe('none')
    })
  })

  describe('ensureIndicators', () => {
    it('should recreate indicators if removed', () => {
      const indicators = container.querySelectorAll('.mirror-drop-indicator, .mirror-drop-indicator-dot')
      indicators.forEach(el => el.remove())

      expect(container.querySelectorAll('.mirror-drop-indicator').length).toBe(0)

      calculator.ensureIndicators()

      expect(container.querySelectorAll('.mirror-drop-indicator').length).toBe(1)
      expect(container.querySelectorAll('.mirror-drop-indicator-dot').length).toBe(2)
    })

    it('should not duplicate indicators if already present', () => {
      const initialCount = container.querySelectorAll('.mirror-drop-indicator').length

      calculator.ensureIndicators()

      expect(container.querySelectorAll('.mirror-drop-indicator').length).toBe(initialCount)
    })
  })

  describe('dispose', () => {
    it('should remove indicator elements', () => {
      calculator.dispose()

      expect(container.querySelectorAll('.mirror-drop-indicator').length).toBe(0)
      expect(container.querySelectorAll('.mirror-drop-indicator-dot').length).toBe(0)
    })

    it('should clear drop zone', () => {
      const node = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      calculator.updateDropZone(50, 50)
      calculator.dispose()

      expect(calculator.getCurrentDropZone()).toBeNull()
    })
  })
})

// ===========================================
// FACTORY FUNCTION
// ===========================================

describe('createDropZoneCalculator', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createContainer()
  })

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('should create DropZoneCalculator instance', () => {
    const calculator = createDropZoneCalculator(container)
    expect(calculator).toBeInstanceOf(DropZoneCalculator)
    calculator.dispose()
  })

  it('should pass options to constructor', () => {
    const calculator = createDropZoneCalculator(container, {
      edgeThreshold: 0.4,
      allowInside: false,
    })
    expect(calculator).toBeDefined()
    calculator.dispose()
  })
})

// ===========================================
// DROP ZONE INTERFACE
// ===========================================

describe('DropZone Interface', () => {
  let container: HTMLElement
  let calculator: DropZoneCalculator

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
    calculator = new DropZoneCalculator(container)
  })

  afterEach(() => {
    calculator.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  it('should include all required fields', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 100, height: 100 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 100, 100))
    setMockElementAtPoint(node)

    const result = calculator.calculateFromPoint(50, 50)

    expect(result).toMatchObject({
      targetId: 'box-1',
      placement: expect.any(String),
      element: node,
      parentId: expect.any(String),
    })
  })
})
