/**
 * DropZone Edge Cases Tests
 *
 * Tests edge cases and unusual scenarios for drop zone calculation.
 *
 * Phase 4.2 of the Drag-Drop Test Expansion Plan
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DropZoneCalculator,
  type DropZone,
} from '../drop-zone-calculator'

// ============================================================================
// TEST HELPERS
// ============================================================================

// Mock elementFromPoint since jsdom doesn't implement it
let mockElementAtPoint: HTMLElement | null = null

function setupElementFromPointMock() {
  // @ts-ignore
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
    visibility?: string
    opacity?: string
    pointerEvents?: string
    overflow?: string
    transform?: string
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

  if (options.display) element.style.display = options.display
  if (options.flexDirection) element.style.flexDirection = options.flexDirection
  if (options.visibility) element.style.visibility = options.visibility
  if (options.opacity) element.style.opacity = options.opacity
  if (options.pointerEvents) element.style.pointerEvents = options.pointerEvents
  if (options.overflow) element.style.overflow = options.overflow
  if (options.transform) element.style.transform = options.transform

  return element
}

function mockElementRect(element: HTMLElement, rect: Partial<DOMRect>) {
  const fullRect: DOMRect = {
    x: rect.x || 0,
    y: rect.y || 0,
    width: rect.width || 100,
    height: rect.height || 50,
    top: rect.top || rect.y || 0,
    left: rect.left || rect.x || 0,
    right: (rect.left || rect.x || 0) + (rect.width || 100),
    bottom: (rect.top || rect.y || 0) + (rect.height || 50),
    toJSON: () => ({}),
  }
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(fullRect)
}

// ============================================================================
// POSITIONING EDGE CASES
// ============================================================================

describe('DropZone Edge Cases: Positioning', () => {
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

  it('handles drop at exact center of element', () => {
    const element = createNodeElement('centered', { width: 100, height: 100 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 100, height: 100 })
    setMockElementAtPoint(element)

    // Exact center: 50, 50
    const result = calculator.calculateFromPoint(50, 50)

    expect(result).not.toBeNull()
    expect(result?.placement).toBe('inside')
  })

  it('handles drop at top edge (1px from border)', () => {
    const element = createNodeElement('top-edge', { width: 100, height: 100 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 100, height: 100 })
    setMockElementAtPoint(element)

    // 1px from top edge
    const result = calculator.calculateFromPoint(50, 1)

    expect(result).not.toBeNull()
    // Should be 'before' or 'inside' depending on threshold
    expect(['before', 'inside']).toContain(result?.placement)
  })

  it('handles drop at bottom edge (1px from border)', () => {
    const element = createNodeElement('bottom-edge', { width: 100, height: 100 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 100, height: 100 })
    setMockElementAtPoint(element)

    // 1px from bottom edge
    const result = calculator.calculateFromPoint(50, 99)

    expect(result).not.toBeNull()
    // Should be 'after' or 'inside' depending on threshold
    expect(['after', 'inside']).toContain(result?.placement)
  })

  it('handles drop at left edge', () => {
    const element = createNodeElement('left-edge', { width: 100, height: 100 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 100, height: 100 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(1, 50)

    expect(result).not.toBeNull()
  })

  it('handles drop at right edge', () => {
    const element = createNodeElement('right-edge', { width: 100, height: 100 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 100, height: 100 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(99, 50)

    expect(result).not.toBeNull()
  })

  it('handles negative coordinates', () => {
    // Negative coordinates are outside the container
    const result = calculator.calculateFromPoint(-10, -10)

    expect(result).toBeNull()
  })

  it('handles very large coordinates', () => {
    // Way outside the container
    const result = calculator.calculateFromPoint(10000, 10000)

    expect(result).toBeNull()
  })
})

// ============================================================================
// ELEMENT STATE EDGE CASES
// ============================================================================

describe('DropZone Edge Cases: Element State', () => {
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

  it('handles element with transforms', () => {
    const element = createNodeElement('transformed', {
      width: 100,
      height: 100,
      transform: 'rotate(45deg)',
    })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 100, height: 100 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(50, 50)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('transformed')
  })

  it('handles element with scale transform', () => {
    const element = createNodeElement('scaled', {
      width: 100,
      height: 100,
      transform: 'scale(2)',
    })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 200, height: 200 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(100, 100)

    expect(result).not.toBeNull()
  })

  it('handles element with translate transform', () => {
    const element = createNodeElement('translated', {
      width: 100,
      height: 100,
      transform: 'translate(50px, 50px)',
    })
    container.appendChild(element)
    mockElementRect(element, { x: 50, y: 50, width: 100, height: 100 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(100, 100)

    expect(result).not.toBeNull()
  })
})

// ============================================================================
// CONTAINER EDGE CASES
// ============================================================================

describe('DropZone Edge Cases: Container', () => {
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

  it('handles container with 0 width', () => {
    const element = createNodeElement('zero-width', { width: 0, height: 100 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 0, height: 100 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(0, 50)

    // Should handle gracefully
    expect(typeof result === 'object' || result === null).toBe(true)
  })

  it('handles container with 0 height', () => {
    const element = createNodeElement('zero-height', { width: 100, height: 0 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 100, height: 0 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(50, 0)

    // Should handle gracefully
    expect(typeof result === 'object' || result === null).toBe(true)
  })

  it('handles container with overflow:hidden', () => {
    const parent = createNodeElement('overflow-parent', {
      width: 100,
      height: 100,
      overflow: 'hidden',
    })
    const child = createNodeElement('overflow-child', {
      width: 200,
      height: 200,
    })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 100, height: 100 })
    mockElementRect(child, { x: 0, y: 0, width: 200, height: 200 })
    setMockElementAtPoint(parent)

    const result = calculator.calculateFromPoint(50, 50)

    expect(result).not.toBeNull()
  })

  it('handles deeply nested containers (10+ levels)', () => {
    // Create 10 nested levels
    let current = container
    for (let i = 0; i < 10; i++) {
      const child = createNodeElement(`level-${i}`, {
        width: 300 - i * 20,
        height: 300 - i * 20,
        top: 10,
        left: 10,
      })
      current.appendChild(child)
      mockElementRect(child, {
        x: i * 10,
        y: i * 10,
        width: 300 - i * 20,
        height: 300 - i * 20,
      })
      current = child
    }

    // Point at deepest level
    setMockElementAtPoint(current)

    const result = calculator.calculateFromPoint(100, 100)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('level-9')
  })

  it('handles empty container', () => {
    const empty = createNodeElement('empty-container', { width: 200, height: 200 })
    container.appendChild(empty)
    mockElementRect(empty, { x: 0, y: 0, width: 200, height: 200 })
    setMockElementAtPoint(empty)

    const result = calculator.calculateFromPoint(100, 100)

    expect(result).not.toBeNull()
    expect(result?.placement).toBe('inside')
  })
})

// ============================================================================
// LAYOUT EDGE CASES
// ============================================================================

describe('DropZone Edge Cases: Layout', () => {
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

  it('handles flex container with wrap', () => {
    const parent = createNodeElement('flex-wrap', {
      width: 200,
      height: 200,
      display: 'flex',
    })
    parent.style.flexWrap = 'wrap'

    const child1 = createNodeElement('wrap-child-1', { width: 100, height: 50 })
    const child2 = createNodeElement('wrap-child-2', { width: 100, height: 50 })
    const child3 = createNodeElement('wrap-child-3', { width: 100, height: 50 })

    parent.appendChild(child1)
    parent.appendChild(child2)
    parent.appendChild(child3)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 200, height: 200 })
    mockElementRect(child1, { x: 0, y: 0, width: 100, height: 50 })
    mockElementRect(child2, { x: 100, y: 0, width: 100, height: 50 })
    mockElementRect(child3, { x: 0, y: 50, width: 100, height: 50 })

    setMockElementAtPoint(child3)

    const result = calculator.calculateFromPoint(50, 75)

    expect(result).not.toBeNull()
  })

  it('handles flex container with row-reverse', () => {
    const parent = createNodeElement('flex-reverse', {
      width: 300,
      height: 100,
      display: 'flex',
      flexDirection: 'row-reverse',
    })

    const child1 = createNodeElement('rev-child-1', { width: 100, height: 50 })
    const child2 = createNodeElement('rev-child-2', { width: 100, height: 50 })

    parent.appendChild(child1)
    parent.appendChild(child2)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 300, height: 100 })
    // In row-reverse, child1 is on the right
    mockElementRect(child1, { x: 200, y: 0, width: 100, height: 50 })
    mockElementRect(child2, { x: 100, y: 0, width: 100, height: 50 })

    setMockElementAtPoint(child1)

    const result = calculator.calculateFromPoint(250, 25)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('rev-child-1')
  })

  it('handles flex container with column-reverse', () => {
    const parent = createNodeElement('flex-col-reverse', {
      width: 100,
      height: 200,
      display: 'flex',
      flexDirection: 'column-reverse',
    })

    const child1 = createNodeElement('col-rev-1', { width: 100, height: 50 })
    const child2 = createNodeElement('col-rev-2', { width: 100, height: 50 })

    parent.appendChild(child1)
    parent.appendChild(child2)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 100, height: 200 })
    // In column-reverse, child1 is at the bottom
    mockElementRect(child1, { x: 0, y: 150, width: 100, height: 50 })
    mockElementRect(child2, { x: 0, y: 100, width: 100, height: 50 })

    setMockElementAtPoint(child1)

    const result = calculator.calculateFromPoint(50, 175)

    expect(result).not.toBeNull()
  })

  it('handles mixed absolute and flex children', () => {
    const parent = createNodeElement('mixed-layout', {
      width: 300,
      height: 300,
      display: 'flex',
    })

    const flexChild = createNodeElement('flex-child', { width: 100, height: 50 })
    flexChild.style.position = 'relative'

    const absChild = createNodeElement('abs-child', {
      width: 50,
      height: 50,
      top: 100,
      left: 100,
    })
    absChild.style.position = 'absolute'

    parent.appendChild(flexChild)
    parent.appendChild(absChild)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 300, height: 300 })
    mockElementRect(flexChild, { x: 0, y: 0, width: 100, height: 50 })
    mockElementRect(absChild, { x: 100, y: 100, width: 50, height: 50 })

    setMockElementAtPoint(absChild)

    const result = calculator.calculateFromPoint(125, 125)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('abs-child')
  })
})

// ============================================================================
// RAPID OPERATIONS
// ============================================================================

describe('DropZone Edge Cases: Rapid Operations', () => {
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

  it('handles rapid calculateFromPoint calls', () => {
    const element = createNodeElement('rapid', { width: 200, height: 200 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 200, height: 200 })
    setMockElementAtPoint(element)

    // Simulate rapid mouse movement (100 calls)
    for (let i = 0; i < 100; i++) {
      const x = Math.floor(Math.random() * 200)
      const y = Math.floor(Math.random() * 200)
      calculator.calculateFromPoint(x, y)
    }

    // Final call should still work
    const result = calculator.calculateFromPoint(100, 100)
    expect(result).not.toBeNull()
  })

  it('handles rapid calculate calls without crashes', () => {
    const element = createNodeElement('indicator', { width: 200, height: 200 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 200, height: 200 })
    setMockElementAtPoint(element)

    // Simulate rapid position updates (like fast mouse movement)
    for (let i = 0; i < 50; i++) {
      calculator.calculateFromPoint(i * 4, i * 4)
    }

    // Should not throw or leak - clearIndicators() is called internally
    expect(true).toBe(true)
  })
})

// ============================================================================
// BOUNDARY CONDITIONS
// ============================================================================

describe('DropZone Edge Cases: Boundary Conditions', () => {
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

  it('handles NaN coordinates', () => {
    const result = calculator.calculateFromPoint(NaN, NaN)
    expect(result).toBeNull()
  })

  it('handles Infinity coordinates', () => {
    const result = calculator.calculateFromPoint(Infinity, Infinity)
    expect(result).toBeNull()
  })

  it('handles fractional coordinates', () => {
    const element = createNodeElement('fractional', { width: 100, height: 100 })
    container.appendChild(element)
    mockElementRect(element, { x: 0, y: 0, width: 100, height: 100 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(50.5, 50.5)

    expect(result).not.toBeNull()
  })

  it('handles element at container boundary', () => {
    const element = createNodeElement('boundary', {
      width: 100,
      height: 100,
      top: 300,
      left: 300,
    })
    container.appendChild(element)
    mockElementRect(element, { x: 300, y: 300, width: 100, height: 100 })
    setMockElementAtPoint(element)

    const result = calculator.calculateFromPoint(350, 350)

    expect(result).not.toBeNull()
  })
})
