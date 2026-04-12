/**
 * Drag & Drop Integration Tests
 *
 * Tests for the complete drag-drop flow with DOMAdapter mock:
 * - Palette Drop → Target Detection → Visual Update → Code Execution
 * - Canvas Move with Flex-to-Absolute Transition
 * - Target detection with various layout types
 *
 * These tests demonstrate how DOMAdapter enables isolated testing
 * without full DOM environment dependencies.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  detectTarget,
  findClosestTarget,
  getChildRects,
  getContainerRect,
} from '../../../studio/drag-drop/system/target-detector'
import {
  createMockDOMAdapter,
  createMockRect,
  createFlexDOMAdapter,
  createPositionedDOMAdapter,
} from '../../utils/mocks'
import {
  createMockCodeExecutorDeps,
  createMockDropTarget,
  createMockFlexTarget,
  createMockPaletteSource,
  createMockCanvasSource,
  createMockAbsoluteDropResult,
  createMockFlexDropResult,
  createMockElement,
  createRect,
} from '../../utils/mocks/drag-drop-mocks'
import { CodeExecutor, createCodeExecutor } from '../../../studio/drag-drop/executor/code-executor'
import type { DropTarget, DragSource, DropResult } from '../../../studio/drag-drop/types'

const NODE_ID_ATTR = 'data-mirror-id'

// ============================================
// Helper to create real DOM elements for tests
// ============================================

function createTestElement(
  tagName: string,
  attrs: Record<string, string> = {},
  dataset: Record<string, string> = {},
  children: HTMLElement[] = []
): HTMLElement {
  const el = document.createElement(tagName)

  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }

  for (const [key, value] of Object.entries(dataset)) {
    el.dataset[key] = value
  }

  for (const child of children) {
    el.appendChild(child)
  }

  return el
}

// ============================================
// Target Detection with DOMAdapter
// ============================================

describe('Target Detection with DOMAdapter', () => {
  let container: HTMLElement
  let mockAdapter: ReturnType<typeof createMockDOMAdapter>

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'preview-container'
    document.body.appendChild(container)
    mockAdapter = createMockDOMAdapter()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('flex container detection', () => {
    it('detects vertical flex container', () => {
      const element = createTestElement('div', { [NODE_ID_ATTR]: 'flex-v' })
      mockAdapter.setComputedStyle({
        display: 'flex',
        flexDirection: 'column',
      })

      const target = detectTarget(element, NODE_ID_ATTR, mockAdapter)

      expect(target).not.toBeNull()
      expect(target?.layoutType).toBe('flex')
      expect(target?.direction).toBe('vertical')
      expect(target?.isPositioned).toBe(false)
    })

    it('detects horizontal flex container', () => {
      const element = createTestElement('div', { [NODE_ID_ATTR]: 'flex-h' })
      mockAdapter.setComputedStyle({
        display: 'flex',
        flexDirection: 'row',
      })

      const target = detectTarget(element, NODE_ID_ATTR, mockAdapter)

      expect(target?.layoutType).toBe('flex')
      expect(target?.direction).toBe('horizontal')
    })

    it('detects grid as flex', () => {
      const element = createTestElement('div', { [NODE_ID_ATTR]: 'grid' })
      mockAdapter.setComputedStyle({
        display: 'grid',
      })

      const target = detectTarget(element, NODE_ID_ATTR, mockAdapter)

      expect(target?.layoutType).toBe('flex')
    })
  })

  describe('positioned container detection', () => {
    it('detects stacked container by data-layout attribute', () => {
      const element = createTestElement(
        'div',
        { [NODE_ID_ATTR]: 'stacked-1' },
        { layout: 'stacked' }
      )
      mockAdapter.setComputedStyle({
        display: 'block',
        position: 'relative',
      })

      const target = detectTarget(element, NODE_ID_ATTR, mockAdapter)

      expect(target?.layoutType).toBe('positioned')
      expect(target?.isPositioned).toBe(true)
    })

    it('detects ZStack component', () => {
      const element = createTestElement(
        'div',
        { [NODE_ID_ATTR]: 'zstack-1' },
        { mirrorName: 'ZStack' }
      )
      mockAdapter.setComputedStyle({
        position: 'relative',
      })

      const target = detectTarget(element, NODE_ID_ATTR, mockAdapter)

      expect(target?.layoutType).toBe('positioned')
    })
  })

  describe('leaf element detection', () => {
    it('returns layoutType "none" for Text component', () => {
      const element = createTestElement(
        'span',
        { [NODE_ID_ATTR]: 'text-1' },
        { mirrorName: 'Text' }
      )

      const target = detectTarget(element, NODE_ID_ATTR, mockAdapter)

      expect(target?.layoutType).toBe('none')
      expect(target?.hasChildren).toBe(false)
    })

    it('returns layoutType "none" for Button component', () => {
      const element = createTestElement(
        'button',
        { [NODE_ID_ATTR]: 'btn-1' },
        { mirrorName: 'Button' }
      )

      const target = detectTarget(element, NODE_ID_ATTR, mockAdapter)

      expect(target?.layoutType).toBe('none')
    })
  })

  describe('findClosestTarget with hierarchy', () => {
    it('finds parent container when starting from leaf element', () => {
      // Create hierarchy: container > text
      const text = createTestElement(
        'span',
        { [NODE_ID_ATTR]: 'text-1' },
        { mirrorName: 'Text' }
      )
      const container = createTestElement(
        'div',
        { [NODE_ID_ATTR]: 'container-1' },
        {},
        [text]
      )
      document.body.appendChild(container)

      mockAdapter.setComputedStyle({
        display: 'flex',
        flexDirection: 'column',
      })

      const target = findClosestTarget(text, NODE_ID_ATTR, mockAdapter)

      // Should find the parent container, not the text element
      expect(target).not.toBeNull()
      expect(target?.nodeId).toBe('container-1')
      expect(target?.layoutType).toBe('flex')
    })

    it('returns target directly if not a leaf', () => {
      const frame = createTestElement('div', { [NODE_ID_ATTR]: 'frame-1' })
      document.body.appendChild(frame)

      mockAdapter.setComputedStyle({
        display: 'flex',
      })

      const target = findClosestTarget(frame, NODE_ID_ATTR, mockAdapter)

      expect(target?.nodeId).toBe('frame-1')
    })
  })
})

// ============================================
// getChildRects with DOMAdapter
// ============================================

describe('getChildRects with DOMAdapter', () => {
  let mockAdapter: ReturnType<typeof createMockDOMAdapter>

  beforeEach(() => {
    mockAdapter = createMockDOMAdapter()
  })

  it('returns child rects using domAdapter.getBoundingClientRect', () => {
    const child1 = createTestElement('div', { [NODE_ID_ATTR]: 'child-1' })
    const child2 = createTestElement('div', { [NODE_ID_ATTR]: 'child-2' })
    const container = createTestElement('div', { [NODE_ID_ATTR]: 'parent' }, {}, [child1, child2])

    // Set different rects for each child
    mockAdapter.setBoundingClientRectForElement(child1, createMockRect(0, 0, 100, 50))
    mockAdapter.setBoundingClientRectForElement(child2, createMockRect(0, 60, 100, 50))

    const rects = getChildRects(container, NODE_ID_ATTR, null, mockAdapter)

    expect(rects).toHaveLength(2)
    expect(rects[0].nodeId).toBe('child-1')
    expect(rects[0].rect.y).toBe(0)
    expect(rects[1].nodeId).toBe('child-2')
    expect(rects[1].rect.y).toBe(60)
  })

  it('uses layoutInfo when available instead of DOM', () => {
    const child = createTestElement('div', { [NODE_ID_ATTR]: 'child-1' })
    const container = createTestElement('div', { [NODE_ID_ATTR]: 'parent' }, {}, [child])

    // Set up mock layoutInfo
    const layoutInfo = new Map([
      ['child-1', { x: 10, y: 20, width: 100, height: 50, parentId: 'parent' }],
    ])

    // Mock adapter should NOT be called when layoutInfo is used
    const rects = getChildRects(container, NODE_ID_ATTR, layoutInfo, mockAdapter)

    expect(rects).toHaveLength(1)
    expect(rects[0].rect.x).toBe(10)
    expect(rects[0].rect.y).toBe(20)
    // DOM adapter should not be called for children when layoutInfo is used
  })
})

// ============================================
// getContainerRect with DOMAdapter
// ============================================

describe('getContainerRect with DOMAdapter', () => {
  let mockAdapter: ReturnType<typeof createMockDOMAdapter>

  beforeEach(() => {
    mockAdapter = createMockDOMAdapter()
  })

  it('returns rect using domAdapter.getBoundingClientRect', () => {
    const element = createTestElement('div', { [NODE_ID_ATTR]: 'container' })
    mockAdapter.setBoundingClientRectForElement(element, createMockRect(100, 100, 400, 300))

    const rect = getContainerRect(element, null, NODE_ID_ATTR, mockAdapter)

    expect(rect.x).toBe(100)
    expect(rect.y).toBe(100)
    expect(rect.width).toBe(400)
    expect(rect.height).toBe(300)
  })

  it('uses layoutInfo when available', () => {
    const element = createTestElement('div', { [NODE_ID_ATTR]: 'container' })
    const layoutInfo = new Map([
      ['container', { x: 50, y: 50, width: 200, height: 150, parentId: null }],
    ])

    const rect = getContainerRect(element, layoutInfo, NODE_ID_ATTR, mockAdapter)

    expect(rect.x).toBe(50)
    expect(rect.y).toBe(50)
    // DOM adapter should not be called when layoutInfo is available
  })
})

// ============================================
// Complete Drag-Drop Flow Integration
// ============================================

describe('Complete Drag-Drop Flow', () => {
  let container: HTMLElement
  let mockAdapter: ReturnType<typeof createMockDOMAdapter>
  let mockDeps: ReturnType<typeof createMockCodeExecutorDeps>
  let executor: CodeExecutor

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'preview-container'
    document.body.appendChild(container)

    mockAdapter = createMockDOMAdapter()
    mockDeps = createMockCodeExecutorDeps()
    executor = createCodeExecutor(mockDeps)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('palette drop to flex container', () => {
    it('completes full flow: detect → calculate → execute', () => {
      // 1. Create target element
      const targetElement = createTestElement(
        'div',
        { [NODE_ID_ATTR]: 'flex-container' },
        {}
      )
      container.appendChild(targetElement)

      // 2. Configure mock adapter for flex detection
      mockAdapter.setComputedStyle({
        display: 'flex',
        flexDirection: 'column',
      })

      // 3. Detect target using DOMAdapter
      const target = detectTarget(targetElement, NODE_ID_ATTR, mockAdapter)
      expect(target).not.toBeNull()
      expect(target?.layoutType).toBe('flex')

      // 4. Create palette source and drop result
      const source = createMockPaletteSource({ componentName: 'Button' })
      const dropResult = createMockFlexDropResult(target!, 'inside', target!.nodeId, 0)

      // 5. Execute the drop
      const result = executor.execute(source, dropResult)

      // 6. Verify execution
      expect(result.success).toBe(true)
      expect(mockDeps.createModifier).toHaveBeenCalled()
    })
  })

  describe('palette drop to positioned container', () => {
    it('completes full flow with absolute positioning', () => {
      // 1. Create positioned container
      const targetElement = createTestElement(
        'div',
        { [NODE_ID_ATTR]: 'stacked-container' },
        { layout: 'stacked' }
      )
      container.appendChild(targetElement)

      // 2. Configure mock adapter
      mockAdapter.setComputedStyle({
        display: 'block',
        position: 'relative',
      })
      mockAdapter.setBoundingClientRectForElement(
        targetElement,
        createMockRect(100, 100, 400, 300)
      )

      // 3. Detect target
      const target = detectTarget(targetElement, NODE_ID_ATTR, mockAdapter)
      expect(target?.layoutType).toBe('positioned')
      expect(target?.isPositioned).toBe(true)

      // 4. Create drop with absolute position
      const source = createMockPaletteSource({ componentName: 'Frame' })
      const dropResult = createMockAbsoluteDropResult(
        target!,
        { x: 150, y: 120 }, // Position relative to container
        { width: 100, height: 40 }
      )

      // 5. Execute
      const result = executor.execute(source, dropResult)

      expect(result.success).toBe(true)
    })
  })

  describe('canvas element move', () => {
    it('handles moving element within same container', () => {
      // 1. Create container with child
      const child = createTestElement(
        'div',
        { [NODE_ID_ATTR]: 'child-1' },
        { mirrorName: 'Frame' }
      )
      const targetElement = createTestElement(
        'div',
        { [NODE_ID_ATTR]: 'container-1' },
        {},
        [child]
      )
      container.appendChild(targetElement)

      // 2. Configure mock
      mockAdapter.setComputedStyle({
        display: 'flex',
        flexDirection: 'column',
      })

      // 3. Detect target
      const target = detectTarget(targetElement, NODE_ID_ATTR, mockAdapter)
      expect(target?.hasChildren).toBe(true)

      // 4. Create canvas source (moving existing element)
      const source = createMockCanvasSource({
        nodeId: 'child-1',
        element: child,
      })

      // 5. Create drop result
      const dropResult = createMockFlexDropResult(target!, 'inside', target!.nodeId, 0)

      // 6. Execute move
      const result = executor.execute(source, dropResult)

      expect(result.success).toBe(true)
    })
  })
})

// ============================================
// Mode Transition Integration
// ============================================

describe('Mode Transition Integration', () => {
  let mockAdapter: ReturnType<typeof createMockDOMAdapter>

  beforeEach(() => {
    mockAdapter = createMockDOMAdapter()
  })

  it('detects transition from flex to positioned container', () => {
    const element = createTestElement('div', { [NODE_ID_ATTR]: 'transitioning' })

    // First detection: flex mode
    mockAdapter.setComputedStyle({
      display: 'flex',
      flexDirection: 'column',
    })

    const flexTarget = detectTarget(element, NODE_ID_ATTR, mockAdapter)
    expect(flexTarget?.layoutType).toBe('flex')

    // Simulate transition: add stacked layout attribute
    element.dataset.layout = 'stacked'

    // Second detection: positioned mode
    mockAdapter.setComputedStyle({
      display: 'block',
      position: 'relative',
    })

    const positionedTarget = detectTarget(element, NODE_ID_ATTR, mockAdapter)
    expect(positionedTarget?.layoutType).toBe('positioned')
  })

  it('consistently detects leaf elements regardless of style', () => {
    const textElement = createTestElement(
      'span',
      { [NODE_ID_ATTR]: 'text-1' },
      { mirrorName: 'Text' }
    )

    // Even with flex style, Text should be detected as leaf
    mockAdapter.setComputedStyle({
      display: 'flex',
    })

    const target1 = detectTarget(textElement, NODE_ID_ATTR, mockAdapter)
    expect(target1?.layoutType).toBe('none')

    // Same with block style
    mockAdapter.setComputedStyle({
      display: 'block',
    })

    const target2 = detectTarget(textElement, NODE_ID_ATTR, mockAdapter)
    expect(target2?.layoutType).toBe('none')
  })
})

// ============================================
// DOMAdapter Verification
// ============================================

describe('DOMAdapter usage verification', () => {
  it('calls getComputedStyle through adapter, not window', () => {
    const element = createTestElement('div', { [NODE_ID_ATTR]: 'test' })
    const mockAdapter = createMockDOMAdapter()
    mockAdapter.setComputedStyle({ display: 'flex' })

    detectTarget(element, NODE_ID_ATTR, mockAdapter)

    expect(mockAdapter.spies.getComputedStyle).toHaveBeenCalledTimes(1)
    expect(mockAdapter.spies.getComputedStyle).toHaveBeenCalledWith(element)
  })

  it('calls getBoundingClientRect through adapter for child rects', () => {
    const child = createTestElement('div', { [NODE_ID_ATTR]: 'child' })
    const parent = createTestElement('div', { [NODE_ID_ATTR]: 'parent' }, {}, [child])

    const mockAdapter = createMockDOMAdapter()
    mockAdapter.setBoundingClientRect(createMockRect(0, 0, 100, 100))

    getChildRects(parent, NODE_ID_ATTR, null, mockAdapter)

    expect(mockAdapter.spies.getBoundingClientRect).toHaveBeenCalledWith(child)
  })
})
