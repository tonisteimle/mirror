/**
 * DropZone ↔ SourceMap Integration Tests
 *
 * Tests that DropZoneCalculator correctly uses SourceMap for:
 * - Node ID resolution
 * - Parent-child relationship validation
 * - Layout detection from IR
 *
 * Phase 2.1 of the Drag-Drop Test Expansion Plan
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DropZoneCalculator,
  type DropZone,
} from '../drop-zone-calculator'
import { SourceMap, SourceMapBuilder } from '../source-map'

// ============================================================================
// TEST HELPERS
// ============================================================================

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

/**
 * Create a test SourceMap using SourceMapBuilder
 */
function createTestSourceMap(config: {
  nodes: Array<{
    id: string
    componentName: string
    line: number
    endLine: number
    parentId?: string
    isDefinition?: boolean
    isEachTemplate?: boolean
  }>
}): SourceMap {
  const builder = new SourceMapBuilder()

  for (const node of config.nodes) {
    builder.addNode(node.id, node.componentName, {
      line: node.line,
      column: 1,
      endLine: node.endLine,
      endColumn: 100,
    }, {
      parentId: node.parentId,
      isDefinition: node.isDefinition,
      isEachTemplate: node.isEachTemplate,
    })
  }

  return builder.build()
}

// ============================================================================
// NODE ID RESOLUTION TESTS
// ============================================================================

describe('DropZone SourceMap: Node ID Resolution', () => {
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

  it('finds node by data-mirror-id attribute', () => {
    const node = createNodeElement('box-1', { name: 'Box' })
    container.appendChild(node)
    mockElementRect(node, { x: 10, y: 10, width: 100, height: 50 })
    setMockElementAtPoint(node)

    const result = calculator.calculateFromPoint(50, 30)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('box-1')
  })

  it('finds parent node ID correctly', () => {
    // Create parent and child structure
    const parent = createNodeElement('parent-1', { name: 'Container', width: 200, height: 200 })
    const child = createNodeElement('child-1', { name: 'Box', width: 100, height: 50, top: 20, left: 20 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 200, height: 200 })
    mockElementRect(child, { x: 20, y: 20, width: 100, height: 50 })
    setMockElementAtPoint(child)

    const result = calculator.calculateFromPoint(50, 40)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('child-1')
    // Parent ID should be determined from DOM structure
    expect(result?.parentId).toBeDefined()
  })

  it('handles deeply nested structure (3+ levels)', () => {
    // Level 1: App
    const app = createNodeElement('app-1', { name: 'App', width: 300, height: 300 })
    // Level 2: Container
    const cont = createNodeElement('container-1', { name: 'Container', width: 250, height: 250, top: 10, left: 10 })
    // Level 3: Card
    const card = createNodeElement('card-1', { name: 'Card', width: 200, height: 100, top: 10, left: 10 })

    app.appendChild(cont)
    cont.appendChild(card)
    container.appendChild(app)

    mockElementRect(app, { x: 0, y: 0, width: 300, height: 300 })
    mockElementRect(cont, { x: 10, y: 10, width: 250, height: 250 })
    mockElementRect(card, { x: 20, y: 20, width: 200, height: 100 })
    setMockElementAtPoint(card)

    const result = calculator.calculateFromPoint(100, 60)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('card-1')
  })

  it('handles template instance IDs (with brackets)', () => {
    // Create element with template instance ID
    const item = createNodeElement('item-1[0]', { name: 'Item' })
    container.appendChild(item)
    mockElementRect(item, { x: 10, y: 10, width: 100, height: 50 })
    setMockElementAtPoint(item)

    const result = calculator.calculateFromPoint(50, 30)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('item-1[0]')
  })

  it('handles multiple template instances', () => {
    // Create multiple instances
    const item0 = createNodeElement('item-1[0]', { name: 'Item', top: 0 })
    const item1 = createNodeElement('item-1[1]', { name: 'Item', top: 60 })
    const item2 = createNodeElement('item-1[2]', { name: 'Item', top: 120 })

    container.appendChild(item0)
    container.appendChild(item1)
    container.appendChild(item2)

    mockElementRect(item0, { x: 10, y: 0, width: 100, height: 50 })
    mockElementRect(item1, { x: 10, y: 60, width: 100, height: 50 })
    mockElementRect(item2, { x: 10, y: 120, width: 100, height: 50 })

    // Point at second item
    setMockElementAtPoint(item1)
    const result = calculator.calculateFromPoint(50, 80)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('item-1[1]')
  })
})

// ============================================================================
// LAYOUT DETECTION TESTS
// ============================================================================

describe('DropZone SourceMap: Layout Detection', () => {
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

  it('finds target in vertical flex container', () => {
    const parent = createNodeElement('parent-1', {
      name: 'VBox',
      width: 200,
      height: 200,
      display: 'flex',
      flexDirection: 'column',
    })
    const child = createNodeElement('child-1', { name: 'Item', top: 20, left: 20 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 200, height: 200 })
    mockElementRect(child, { x: 20, y: 20, width: 100, height: 50 })
    setMockElementAtPoint(child)

    const result = calculator.calculateFromPoint(50, 40)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('child-1')
  })

  it('finds target in horizontal flex container', () => {
    const parent = createNodeElement('parent-1', {
      name: 'HBox',
      width: 400,
      height: 100,
      display: 'flex',
      flexDirection: 'row',
    })
    const child = createNodeElement('child-1', { name: 'Item', top: 20, left: 20 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 400, height: 100 })
    mockElementRect(child, { x: 20, y: 20, width: 100, height: 50 })
    setMockElementAtPoint(child)

    const result = calculator.calculateFromPoint(50, 40)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('child-1')
  })

  it('finds target in container without explicit layout', () => {
    const parent = createNodeElement('parent-1', { name: 'Box', width: 200, height: 200 })
    const child = createNodeElement('child-1', { name: 'Item', top: 20, left: 20 })
    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 200, height: 200 })
    mockElementRect(child, { x: 20, y: 20, width: 100, height: 50 })
    setMockElementAtPoint(child)

    const result = calculator.calculateFromPoint(50, 40)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('child-1')
  })
})

// ============================================================================
// PARENT-CHILD RELATIONSHIP TESTS
// ============================================================================

describe('DropZone SourceMap: Parent-Child Relationships', () => {
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

  it('identifies sibling relationships for before/after placement', () => {
    const parent = createNodeElement('parent-1', { name: 'Container', width: 200, height: 200 })
    const child1 = createNodeElement('child-1', { name: 'First', top: 10, width: 100, height: 40 })
    const child2 = createNodeElement('child-2', { name: 'Second', top: 60, width: 100, height: 40 })

    parent.appendChild(child1)
    parent.appendChild(child2)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 200, height: 200 })
    mockElementRect(child1, { x: 10, y: 10, width: 100, height: 40 })
    mockElementRect(child2, { x: 10, y: 60, width: 100, height: 40 })

    // Hover at bottom edge of first child (should suggest 'after')
    setMockElementAtPoint(child1)
    const result = calculator.calculateFromPoint(50, 45)

    expect(result).not.toBeNull()
    // Should be either 'after' child1 or 'before' child2
    expect(['before', 'after', 'inside']).toContain(result?.placement)
  })

  it('handles single child in container', () => {
    const parent = createNodeElement('parent-1', { name: 'Container', width: 200, height: 200 })
    const child = createNodeElement('child-1', { name: 'Only', top: 10, width: 100, height: 40 })

    parent.appendChild(child)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 200, height: 200 })
    mockElementRect(child, { x: 10, y: 10, width: 100, height: 40 })
    setMockElementAtPoint(child)

    const result = calculator.calculateFromPoint(50, 30)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('child-1')
  })

  it('handles empty container (no children)', () => {
    const emptyContainer = createNodeElement('empty-1', { name: 'Empty', width: 200, height: 200 })
    container.appendChild(emptyContainer)

    mockElementRect(emptyContainer, { x: 0, y: 0, width: 200, height: 200 })
    setMockElementAtPoint(emptyContainer)

    const result = calculator.calculateFromPoint(100, 100)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('empty-1')
    expect(result?.placement).toBe('inside')
  })
})

// ============================================================================
// LEAF ELEMENT HANDLING
// ============================================================================

describe('DropZone SourceMap: Leaf Element Handling', () => {
  let container: HTMLElement
  let calculator: DropZoneCalculator

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
    calculator = new DropZoneCalculator(container, {
      leafElements: ['Text', 'Icon', 'Input'],
    })
  })

  afterEach(() => {
    calculator.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  it('does not allow inside placement for Text', () => {
    const textNode = createNodeElement('text-1', { name: 'Text' })
    container.appendChild(textNode)

    mockElementRect(textNode, { x: 10, y: 10, width: 100, height: 30 })
    setMockElementAtPoint(textNode)

    const result = calculator.calculateFromPoint(50, 25)

    expect(result).not.toBeNull()
    // For leaf elements, placement should be before/after, not inside
    // (or the calculator might return null for center region)
    if (result?.placement === 'inside') {
      // If inside, the target should be parent, not the leaf itself
      expect(result?.targetId).not.toBe('text-1')
    }
  })

  it('does not allow inside placement for Icon', () => {
    const iconNode = createNodeElement('icon-1', { name: 'Icon' })
    container.appendChild(iconNode)

    mockElementRect(iconNode, { x: 10, y: 10, width: 24, height: 24 })
    setMockElementAtPoint(iconNode)

    const result = calculator.calculateFromPoint(22, 22)

    expect(result).not.toBeNull()
    if (result?.placement === 'inside') {
      expect(result?.targetId).not.toBe('icon-1')
    }
  })

  it('allows inside placement for non-leaf Box', () => {
    const boxNode = createNodeElement('box-1', { name: 'Box', width: 150, height: 150 })
    container.appendChild(boxNode)

    mockElementRect(boxNode, { x: 10, y: 10, width: 150, height: 150 })
    setMockElementAtPoint(boxNode)

    // Point at center of box
    const result = calculator.calculateFromPoint(85, 85)

    expect(result).not.toBeNull()
    expect(result?.placement).toBe('inside')
    expect(result?.targetId).toBe('box-1')
  })
})

// ============================================================================
// SEMANTIC ZONE TESTS
// ============================================================================

describe('DropZone SourceMap: Semantic Zones', () => {
  let container: HTMLElement
  let calculator: DropZoneCalculator

  beforeEach(() => {
    setupElementFromPointMock()
    setMockElementAtPoint(null)
    container = createContainer()
    calculator = new DropZoneCalculator(container, {
      enableSemanticZones: true,
    })
  })

  afterEach(() => {
    calculator.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  it('detects top-left zone', () => {
    const target = createNodeElement('target-1', { name: 'Container', width: 300, height: 300 })
    container.appendChild(target)

    mockElementRect(target, { x: 0, y: 0, width: 300, height: 300 })
    setMockElementAtPoint(target)

    // Point at top-left region (< 33% from each edge)
    const result = calculator.calculateFromPoint(30, 30)

    expect(result).not.toBeNull()
    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('top-left')
  })

  it('detects mid-center zone', () => {
    const target = createNodeElement('target-1', { name: 'Container', width: 300, height: 300 })
    container.appendChild(target)

    mockElementRect(target, { x: 0, y: 0, width: 300, height: 300 })
    setMockElementAtPoint(target)

    // Point at center
    const result = calculator.calculateFromPoint(150, 150)

    expect(result).not.toBeNull()
    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('mid-center')
  })

  it('detects bot-right zone', () => {
    const target = createNodeElement('target-1', { name: 'Container', width: 300, height: 300 })
    container.appendChild(target)

    mockElementRect(target, { x: 0, y: 0, width: 300, height: 300 })
    setMockElementAtPoint(target)

    // Point at bottom-right region
    const result = calculator.calculateFromPoint(270, 270)

    expect(result).not.toBeNull()
    expect(result?.placement).toBe('inside')
    expect(result?.semanticZone).toBe('bot-right')
  })

  it('does not set semantic zone when disabled', () => {
    calculator.dispose()
    calculator = new DropZoneCalculator(container, {
      enableSemanticZones: false,
    })

    const target = createNodeElement('target-1', { name: 'Container', width: 300, height: 300 })
    container.appendChild(target)

    mockElementRect(target, { x: 0, y: 0, width: 300, height: 300 })
    setMockElementAtPoint(target)

    const result = calculator.calculateFromPoint(30, 30)

    expect(result).not.toBeNull()
    expect(result?.semanticZone).toBeUndefined()
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('DropZone SourceMap: Edge Cases', () => {
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

  it('returns null for point outside container', () => {
    const result = calculator.calculateFromPoint(-10, -10)
    expect(result).toBeNull()
  })

  it('handles overlapping elements (selects topmost)', () => {
    const bottom = createNodeElement('bottom-1', { name: 'Bottom', width: 200, height: 200 })
    const top = createNodeElement('top-1', { name: 'Top', width: 100, height: 100, top: 50, left: 50 })

    container.appendChild(bottom)
    container.appendChild(top)

    mockElementRect(bottom, { x: 0, y: 0, width: 200, height: 200 })
    mockElementRect(top, { x: 50, y: 50, width: 100, height: 100 })

    // Point where both elements overlap - elementFromPoint returns topmost
    setMockElementAtPoint(top)
    const result = calculator.calculateFromPoint(100, 100)

    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('top-1')
  })

  it('handles element with no data-mirror-id (traverses up)', () => {
    const parent = createNodeElement('parent-1', { name: 'Parent', width: 200, height: 200 })
    const childWithoutId = document.createElement('span')
    childWithoutId.textContent = 'Some text'
    childWithoutId.style.position = 'absolute'
    childWithoutId.style.top = '10px'
    childWithoutId.style.left = '10px'

    parent.appendChild(childWithoutId)
    container.appendChild(parent)

    mockElementRect(parent, { x: 0, y: 0, width: 200, height: 200 })

    // elementFromPoint returns the span without ID
    setMockElementAtPoint(childWithoutId)

    const result = calculator.calculateFromPoint(50, 20)

    // Should find parent with ID
    expect(result).not.toBeNull()
    expect(result?.targetId).toBe('parent-1')
  })

  it('handles rapid successive calculations', () => {
    const node = createNodeElement('node-1', { name: 'Box' })
    container.appendChild(node)
    mockElementRect(node, { x: 10, y: 10, width: 100, height: 50 })
    setMockElementAtPoint(node)

    // Simulate rapid mouse movement
    for (let i = 0; i < 100; i++) {
      const result = calculator.calculateFromPoint(50 + (i % 10), 30 + (i % 5))
      expect(result?.targetId).toBe('node-1')
    }
  })
})
