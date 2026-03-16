/**
 * Comprehensive Tests for DropZoneCalculator
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DropZoneCalculator,
  createDropZoneCalculator,
  type DropZone,
  type DropPlacement,
} from '../drop-zone-calculator'

// ===========================================
// TEST HELPERS
// ===========================================

// Mock elementFromPoint since jsdom doesn't implement it
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

// Mock getBoundingClientRect for consistent tests
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
      expect(dots.length).toBe(2) // Start and end dots
    })
  })

  describe('calculateFromPoint', () => {
    it('should return null for point outside container', () => {
      const result = calculator.calculateFromPoint(-100, -100)
      expect(result).toBeNull()
    })

    it('should return null when no node element at point', () => {
      // Container is empty except for indicators
      const result = calculator.calculateFromPoint(50, 50)
      expect(result).toBeNull()
    })

    it('should find node element at point', () => {
      const node = createNodeElement('box-1', { top: 10, left: 10, width: 100, height: 50 })
      container.appendChild(node)

      // Mock elementFromPoint to return our node
      setMockElementAtPoint(node)

      const result = calculator.calculateFromPoint(50, 30)

      expect(result).not.toBeNull()
      expect(result!.targetId).toBe('box-1')
    })

    it('should determine "before" placement at top edge', () => {
      const node = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      // Click at top 10% (0.1 < 0.25 threshold)
      const result = calculator.calculateFromPoint(50, 10)

      expect(result?.placement).toBe('before')
    })

    it('should determine "after" placement at bottom edge', () => {
      const node = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      // Click at bottom 10% (0.9 > 0.75 threshold)
      const result = calculator.calculateFromPoint(50, 90)

      expect(result?.placement).toBe('after')
    })

    it('should determine "inside" placement at center', () => {
      const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      // Click at center (0.5 is between 0.25 and 0.75)
      const result = calculator.calculateFromPoint(50, 50)

      expect(result?.placement).toBe('inside')
    })

    it('should not allow "inside" for default leaf elements (Icon, Input, Text, etc.)', () => {
      // Default leaf elements cannot have children
      // With default leafElements=['Input', 'Icon', 'Text', ...], Icon is a leaf
      const node = createNodeElement('icon-1', { name: 'Icon', top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      // Icon is a leaf element - only before/after placement allowed
      const result = calculator.calculateFromPoint(50, 50)

      // Center of element with leaf = after (since relativePos > 0.5)
      expect(result?.placement).toBe('after')
    })

    it('should not allow "inside" for explicitly configured leaf elements', () => {
      // When leafElements is explicitly configured, those elements can't have children
      const leafCalculator = new DropZoneCalculator(container, { leafElements: ['Icon'] })
      const node = createNodeElement('icon-1', { name: 'Icon', top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      // With explicit leafElements, should not be "inside"
      const result = leafCalculator.calculateFromPoint(50, 50)

      expect(result?.placement).not.toBe('inside')
    })

    it('should prevent self-drop', () => {
      const node = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 100 })
      container.appendChild(node)

      mockElementRect(node, new DOMRect(0, 0, 100, 100))
      setMockElementAtPoint(node)

      // Try to drop on itself
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

      // Try to drop parent into its own child
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

    it('should clear indicators when zone changes', () => {
      const node1 = createNodeElement('box-1', { top: 0, left: 0, width: 100, height: 50 })
      const node2 = createNodeElement('box-2', { top: 60, left: 0, width: 100, height: 50 })
      container.appendChild(node1)
      container.appendChild(node2)

      // First zone
      mockElementRect(node1, new DOMRect(0, 0, 100, 50))
      setMockElementAtPoint(node1)
      calculator.updateDropZone(50, 25)

      expect(calculator.getCurrentDropZone()!.targetId).toBe('box-1')

      // Change to second zone
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
      // Remove indicators
      const indicators = container.querySelectorAll('.mirror-drop-indicator, .mirror-drop-indicator-dot')
      indicators.forEach(el => el.remove())

      expect(container.querySelectorAll('.mirror-drop-indicator').length).toBe(0)

      // Ensure indicators
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
// DYNAMIC EDGE THRESHOLD
// ===========================================

describe('Dynamic Edge Threshold', () => {
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

  it('should use smaller threshold for small elements (min 6px)', () => {
    // Small element: 40px wide → 15% = 6px → threshold = 6/40 = 0.15
    const parent = createNodeElement('parent', {
      top: 0,
      left: 0,
      width: 200,
      height: 100,
      display: 'flex',
      flexDirection: 'row',
    })
    const child = createNodeElement('child', { name: 'Box', top: 0, left: 0, width: 40, height: 100 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(child, new DOMRect(0, 0, 40, 100))
    setMockElementAtPoint(child)

    // Click at 5px from left edge (12.5% < 15% threshold) → should be "before"
    const result = calculator.calculateFromPoint(5, 50)
    expect(result?.placement).toBe('before')

    // Click at 7px from left edge (17.5% > 15% threshold) → should be "inside"
    const resultInside = calculator.calculateFromPoint(7, 50)
    expect(resultInside?.placement).toBe('inside')
  })

  it('should use larger threshold for large elements (max 16px)', () => {
    // Large element: 200px wide → 15% = 30px, but capped at 16px → threshold = 16/200 = 0.08
    const parent = createNodeElement('parent', {
      top: 0,
      left: 0,
      width: 400,
      height: 100,
      display: 'flex',
      flexDirection: 'row',
    })
    const child = createNodeElement('child', { name: 'Box', top: 0, left: 0, width: 200, height: 100 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(child, new DOMRect(0, 0, 200, 100))
    setMockElementAtPoint(child)

    // Click at 10px from left edge (5% < 8% threshold) → should be "before"
    const result = calculator.calculateFromPoint(10, 50)
    expect(result?.placement).toBe('before')

    // Click at 20px from left edge (10% > 8% threshold) → should be "inside"
    const resultInside = calculator.calculateFromPoint(20, 50)
    expect(resultInside?.placement).toBe('inside')
  })

  it('should respect layout direction for threshold calculation', () => {
    // Vertical layout: use height for threshold
    const parent = createNodeElement('parent', {
      top: 0,
      left: 0,
      width: 100,
      height: 200,
      display: 'flex',
      flexDirection: 'column',
    })
    const child = createNodeElement('child', { name: 'Box', top: 0, left: 0, width: 100, height: 40 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(child, new DOMRect(0, 0, 100, 40))
    setMockElementAtPoint(child)

    // 40px height → 15% = 6px → threshold = 6/40 = 0.15
    // Click at 5px from top (12.5% < 15% threshold) → should be "before"
    const result = calculator.calculateFromPoint(50, 5)
    expect(result?.placement).toBe('before')

    // Click at 7px from top (17.5% > 15% threshold) → should be "inside"
    const resultInside = calculator.calculateFromPoint(50, 7)
    expect(resultInside?.placement).toBe('inside')
  })

  it('should handle medium-sized elements (15% of size)', () => {
    // Medium element: 100px wide → 15% = 15px (within 6-16 range)
    const parent = createNodeElement('parent', {
      top: 0,
      left: 0,
      width: 300,
      height: 100,
      display: 'flex',
      flexDirection: 'row',
    })
    const child = createNodeElement('child', { name: 'Box', top: 0, left: 0, width: 100, height: 100 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(child, new DOMRect(0, 0, 100, 100))
    setMockElementAtPoint(child)

    // 100px width → 15% = 15px → threshold = 15/100 = 0.15
    // Click at 10px from left edge (10% < 15% threshold) → should be "before"
    const result = calculator.calculateFromPoint(10, 50)
    expect(result?.placement).toBe('before')

    // Click at 20px from left edge (20% > 15% threshold) → should be "inside"
    const resultInside = calculator.calculateFromPoint(20, 50)
    expect(resultInside?.placement).toBe('inside')
  })
})

// ===========================================
// LAYOUT DETECTION
// ===========================================

describe('Layout Detection', () => {
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

  it('should detect horizontal layout (flex-row)', () => {
    const parent = createNodeElement('parent', {
      top: 0,
      left: 0,
      width: 300,
      height: 100,
      display: 'flex',
      flexDirection: 'row',
    })
    const child = createNodeElement('child', { name: 'Box', top: 0, left: 0, width: 100, height: 100 })
    parent.appendChild(child)
    container.appendChild(parent)

    // In horizontal layout, left edge should be "before"
    mockElementRect(child, new DOMRect(0, 0, 100, 100))
    setMockElementAtPoint(child)

    // Click at left 10% of child
    const result = calculator.calculateFromPoint(10, 50)

    expect(result?.placement).toBe('before')
  })

  it('should detect vertical layout (flex-column)', () => {
    const parent = createNodeElement('parent', {
      top: 0,
      left: 0,
      width: 100,
      height: 300,
      display: 'flex',
      flexDirection: 'column',
    })
    const child = createNodeElement('child', { name: 'Box', top: 0, left: 0, width: 100, height: 100 })
    parent.appendChild(child)
    container.appendChild(parent)

    // In vertical layout, top edge should be "before"
    mockElementRect(child, new DOMRect(0, 0, 100, 100))
    setMockElementAtPoint(child)

    // Click at top 10% of child
    const result = calculator.calculateFromPoint(50, 10)

    expect(result?.placement).toBe('before')
  })
})

// ===========================================
// SEMANTIC ZONES (9-ZONE MODEL)
// ===========================================

describe('Semantic Zones', () => {
  let container: HTMLElement
  let calculator: DropZoneCalculator

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
    calculator = new DropZoneCalculator(container, { enableSemanticZones: true })
  })

  afterEach(() => {
    calculator.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  it('should calculate top-left zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 10% x, 10% y (top-left zone)
    const result = calculator.calculateFromPoint(30, 30)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('top-left')
  })

  it('should calculate top-center zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 50% x, 10% y (top-center zone)
    const result = calculator.calculateFromPoint(150, 30)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('top-center')
  })

  it('should calculate top-right zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 90% x, 10% y (top-right zone)
    const result = calculator.calculateFromPoint(270, 30)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('top-right')
  })

  it('should calculate mid-left zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 10% x, 50% y (mid-left zone)
    const result = calculator.calculateFromPoint(30, 150)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('mid-left')
  })

  it('should calculate mid-center zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 50% x, 50% y (mid-center zone)
    const result = calculator.calculateFromPoint(150, 150)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('mid-center')
  })

  it('should calculate mid-right zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 90% x, 50% y (mid-right zone)
    const result = calculator.calculateFromPoint(270, 150)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('mid-right')
  })

  it('should calculate bot-left zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 10% x, 90% y (bot-left zone)
    const result = calculator.calculateFromPoint(30, 270)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('bot-left')
  })

  it('should calculate bot-center zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 50% x, 90% y (bot-center zone)
    const result = calculator.calculateFromPoint(150, 270)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('bot-center')
  })

  it('should calculate bot-right zone', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    // Click at 90% x, 90% y (bot-right zone)
    const result = calculator.calculateFromPoint(270, 270)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('bot-right')
  })

  it('should not include semanticZone when enableSemanticZones is false', () => {
    // Create calculator without semantic zones
    const calcWithoutZones = new DropZoneCalculator(container, { enableSemanticZones: false })

    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(node)

    const result = calcWithoutZones.calculateFromPoint(150, 150)

    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBeUndefined()

    calcWithoutZones.dispose()
  })

  it('should only include semanticZone for inside placement on empty containers', () => {
    // Semantic zones are only shown for 'inside' placement on EMPTY containers
    // This provides 9-zone positioning for empty containers
    const parent = createNodeElement('parent', {
      top: 0,
      left: 0,
      width: 300,
      height: 100,
      display: 'flex',
      flexDirection: 'column',
    })
    const child = createNodeElement('child', { name: 'Box', top: 0, left: 0, width: 300, height: 100 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(child, new DOMRect(0, 0, 300, 100))
    setMockElementAtPoint(child)

    // Click at top edge (should be 'before' placement)
    const result = calculator.calculateFromPoint(150, 5)

    expect(result?.placement).toBe('before')
    // semanticZone is NOT set for before/after placements
    expect(result?.semanticZone).toBeUndefined()
  })

  it('should show semantic zones for empty containers', () => {
    // Empty container should show semantic zones
    const emptyContainer = createNodeElement('empty-box', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    container.appendChild(emptyContainer)

    mockElementRect(emptyContainer, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(emptyContainer)

    // Click in center (should be 'inside' placement)
    const result = calculator.calculateFromPoint(150, 150)

    expect(result?.placement).toBe('inside')
    // semanticZone IS set for inside placement on empty container
    expect(result?.semanticZone).toBe('mid-center')
  })

  it('should NOT show semantic zones for containers with children', () => {
    // Container with children should NOT show semantic zones
    const parentBox = createNodeElement('parent-box', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    const childBox = createNodeElement('child-box', { name: 'Box', top: 50, left: 50, width: 100, height: 100 })
    parentBox.appendChild(childBox)
    container.appendChild(parentBox)

    mockElementRect(parentBox, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(parentBox)

    // Click in center (should be 'inside' placement)
    const result = calculator.calculateFromPoint(150, 150)

    expect(result?.placement).toBe('inside')
    // semanticZone is NOT set because container has children
    expect(result?.semanticZone).toBeUndefined()
  })

  it('should exclude dragged element when checking for children', () => {
    // When dragging an element within its parent, exclude it from child count
    const parentBox = createNodeElement('parent-box', { name: 'Box', top: 0, left: 0, width: 300, height: 300 })
    const childBox = createNodeElement('child-box', { name: 'Box', top: 50, left: 50, width: 100, height: 100 })
    parentBox.appendChild(childBox)
    container.appendChild(parentBox)

    mockElementRect(parentBox, new DOMRect(0, 0, 300, 300))
    setMockElementAtPoint(parentBox)

    // When dragging child-box, it should be excluded from child count
    // So parent-box appears empty and should show semantic zones
    const result = calculator.calculateFromPoint(150, 150, 'child-box')

    expect(result?.placement).toBe('inside')
    // semanticZone IS set because the only child is the one being dragged
    expect(result?.semanticZone).toBe('mid-center')
  })
})

// ===========================================
// DROP ZONE TYPES
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

  it('should include siblingId for before/after placements', () => {
    const node = createNodeElement('box-1', { name: 'Input', top: 0, left: 0, width: 100, height: 100 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 100, 100))
    setMockElementAtPoint(node)

    // Input is a leaf, so should be before/after
    const result = calculator.calculateFromPoint(50, 10)

    expect(result?.placement).not.toBe('inside')
    expect(result?.siblingId).toBe('box-1')
  })

  it('should not include siblingId for inside placement', () => {
    const node = createNodeElement('box-1', { name: 'Box', top: 0, left: 0, width: 100, height: 100 })
    container.appendChild(node)

    mockElementRect(node, new DOMRect(0, 0, 100, 100))
    setMockElementAtPoint(node)

    // Center click for inside
    const result = calculator.calculateFromPoint(50, 50)

    expect(result?.placement).toBe('inside')
    expect(result?.siblingId).toBeUndefined()
  })
})
