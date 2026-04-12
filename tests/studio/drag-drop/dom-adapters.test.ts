/**
 * @vitest-environment jsdom
 *
 * DOM Adapters Tests
 *
 * Tests for the production DOM adapters.
 * Uses JSDOM environment to test DOM interactions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createDOMLayoutPort,
  createDOMStylePort,
  createDOMEventPort,
  createDOMVisualPort,
  createDOMTargetDetectionPort,
  createDOMPorts,
} from '../../../studio/drag-drop/system/adapters/dom-adapters'
import type { DragSource, DropTarget, Rect } from '../../../studio/drag-drop/types'
import type { LayoutRect } from '../../../studio/core/state'

// ============================================
// Test Setup
// ============================================

function createTestContainer(): HTMLElement {
  const container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)
  return container
}

function cleanupTestContainer(): void {
  const container = document.getElementById('test-container')
  if (container) {
    container.remove()
  }
  // Clean up any visual elements
  document.querySelectorAll('[id^="mirror-"]').forEach((el) => el.remove())
}

// ============================================
// DOM Layout Port Tests
// ============================================

describe('DOMLayoutPort', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createTestContainer()
  })

  afterEach(() => {
    cleanupTestContainer()
  })

  describe('getRect', () => {
    it('returns null for unknown nodeId', () => {
      const port = createDOMLayoutPort({ container })
      expect(port.getRect('unknown')).toBeNull()
    })

    it('returns rect from layoutInfo when available', () => {
      const layoutInfo = new Map<string, LayoutRect>([
        ['node-1', { x: 100, y: 50, width: 200, height: 100, parentId: null }],
      ])

      const port = createDOMLayoutPort({
        container,
        getLayoutInfo: () => layoutInfo,
      })

      const rect = port.getRect('node-1')
      expect(rect).toEqual({ x: 100, y: 50, width: 200, height: 100 })
    })

    it('falls back to DOM when layoutInfo not available', () => {
      const child = document.createElement('div')
      child.setAttribute('data-mirror-id', 'child-1')
      child.style.position = 'absolute'
      child.style.left = '10px'
      child.style.top = '20px'
      child.style.width = '100px'
      child.style.height = '50px'
      container.appendChild(child)

      const port = createDOMLayoutPort({ container })
      const rect = port.getRect('child-1')

      // JSDOM doesn't compute actual layout, so we just check it returns something
      expect(rect).not.toBeNull()
    })
  })

  describe('getChildRects', () => {
    it('returns empty array for element without children', () => {
      const port = createDOMLayoutPort({ container })
      expect(port.getChildRects(container)).toEqual([])
    })

    it('returns child rects with nodeIds', () => {
      const child1 = document.createElement('div')
      child1.setAttribute('data-mirror-id', 'child-1')
      container.appendChild(child1)

      const child2 = document.createElement('div')
      child2.setAttribute('data-mirror-id', 'child-2')
      container.appendChild(child2)

      const port = createDOMLayoutPort({ container })
      const rects = port.getChildRects(container)

      expect(rects).toHaveLength(2)
      expect(rects[0].nodeId).toBe('child-1')
      expect(rects[1].nodeId).toBe('child-2')
    })

    it('skips children without nodeId', () => {
      const child1 = document.createElement('div')
      child1.setAttribute('data-mirror-id', 'child-1')
      container.appendChild(child1)

      const child2 = document.createElement('div')
      // No nodeId
      container.appendChild(child2)

      const port = createDOMLayoutPort({ container })
      const rects = port.getChildRects(container)

      expect(rects).toHaveLength(1)
      expect(rects[0].nodeId).toBe('child-1')
    })
  })

  describe('getContainerRect', () => {
    it('returns rect for element', () => {
      const port = createDOMLayoutPort({ container })
      const rect = port.getContainerRect(container)

      expect(rect).not.toBeNull()
      expect(rect).toHaveProperty('x')
      expect(rect).toHaveProperty('y')
      expect(rect).toHaveProperty('width')
      expect(rect).toHaveProperty('height')
    })
  })
})

// ============================================
// DOM Style Port Tests
// ============================================

describe('DOMStylePort', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createTestContainer()
  })

  afterEach(() => {
    cleanupTestContainer()
  })

  describe('getLayoutType', () => {
    it('returns flex for display: flex', () => {
      container.style.display = 'flex'

      const port = createDOMStylePort({ container })
      expect(port.getLayoutType(container)).toBe('flex')
    })

    it('returns positioned for data-layout: stacked', () => {
      container.dataset.layout = 'stacked'

      const port = createDOMStylePort({ container })
      expect(port.getLayoutType(container)).toBe('positioned')
    })

    it('returns positioned for data-layout: absolute', () => {
      container.dataset.layout = 'absolute'

      const port = createDOMStylePort({ container })
      expect(port.getLayoutType(container)).toBe('positioned')
    })

    it('returns none for regular divs', () => {
      container.style.display = 'block'

      const port = createDOMStylePort({ container })
      expect(port.getLayoutType(container)).toBe('none')
    })
  })

  describe('getDirection', () => {
    it('returns vertical for flex-direction: column', () => {
      container.style.display = 'flex'
      container.style.flexDirection = 'column'

      const port = createDOMStylePort({ container })
      expect(port.getDirection(container)).toBe('vertical')
    })

    it('returns horizontal for flex-direction: row', () => {
      container.style.display = 'flex'
      container.style.flexDirection = 'row'

      const port = createDOMStylePort({ container })
      expect(port.getDirection(container)).toBe('horizontal')
    })

    it('returns horizontal by default', () => {
      const port = createDOMStylePort({ container })
      expect(port.getDirection(container)).toBe('horizontal')
    })
  })

  describe('getComputedStyle', () => {
    it('returns CSSStyleDeclaration', () => {
      container.style.backgroundColor = 'red'

      const port = createDOMStylePort({ container })
      const style = port.getComputedStyle(container)

      expect(style).toHaveProperty('backgroundColor')
    })
  })
})

// ============================================
// DOM Event Port Tests
// ============================================

describe('DOMEventPort', () => {
  describe('drag event handlers', () => {
    it('registers and calls dragStart handlers', () => {
      const port = createDOMEventPort()
      const handler = vi.fn()
      port.onDragStart(handler)

      const source: DragSource = { type: 'palette', componentName: 'Frame' }
      port.triggerDragStart(source, { x: 100, y: 100 })

      expect(handler).toHaveBeenCalledWith(source, { x: 100, y: 100 })
    })

    it('registers and calls dragMove handlers', () => {
      const port = createDOMEventPort()
      const handler = vi.fn()
      port.onDragMove(handler)

      port.triggerDragMove({ x: 200, y: 200 })

      expect(handler).toHaveBeenCalledWith({ x: 200, y: 200 })
    })

    it('registers and calls dragEnd handlers', () => {
      const port = createDOMEventPort()
      const handler = vi.fn()
      port.onDragEnd(handler)

      port.triggerDragEnd()

      expect(handler).toHaveBeenCalled()
    })

    it('registers and calls dragCancel handlers', () => {
      const port = createDOMEventPort()
      const handler = vi.fn()
      port.onDragCancel(handler)

      port.triggerDragCancel()

      expect(handler).toHaveBeenCalled()
    })

    it('cleanup removes handlers', () => {
      const port = createDOMEventPort()
      const handler = vi.fn()
      const cleanup = port.onDragStart(handler)

      cleanup()
      const source: DragSource = { type: 'palette', componentName: 'Frame' }
      port.triggerDragStart(source, { x: 100, y: 100 })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('keyboard event handlers', () => {
    it('registers keyDown handlers', () => {
      const port = createDOMEventPort()
      const handler = vi.fn()
      port.onKeyDown('Alt', handler)

      // Simulate keydown event
      const event = new KeyboardEvent('keydown', { key: 'Alt' })
      document.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })

    it('registers keyUp handlers', () => {
      const port = createDOMEventPort()
      const handler = vi.fn()
      port.onKeyUp('Alt', handler)

      // Simulate keyup event
      const event = new KeyboardEvent('keyup', { key: 'Alt' })
      document.dispatchEvent(event)

      expect(handler).toHaveBeenCalled()
    })

    it('cleanup removes keyboard handlers', () => {
      const port = createDOMEventPort()
      const handler = vi.fn()
      const cleanup = port.onKeyDown('Alt', handler)

      cleanup()

      const event = new KeyboardEvent('keydown', { key: 'Alt' })
      document.dispatchEvent(event)

      expect(handler).not.toHaveBeenCalled()
    })
  })
})

// ============================================
// DOM Visual Port Tests
// ============================================

describe('DOMVisualPort', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createTestContainer()
  })

  afterEach(() => {
    cleanupTestContainer()
  })

  describe('showIndicator', () => {
    it('creates indicator element for line type', () => {
      const port = createDOMVisualPort(container)

      port.showIndicator({
        type: 'line',
        rect: { x: 100, y: 100, width: 200, height: 2 },
        direction: 'horizontal',
      })

      const indicator = document.getElementById('mirror-drop-indicator')
      expect(indicator).not.toBeNull()
    })

    it('creates ghost element for ghost type', () => {
      const port = createDOMVisualPort(container)

      port.showIndicator({
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 50 },
        direction: 'horizontal',
      })

      const ghost = document.getElementById('mirror-drop-ghost')
      expect(ghost).not.toBeNull()
    })
  })

  describe('showOutline', () => {
    it('creates outline element', () => {
      const port = createDOMVisualPort(container)

      port.showOutline({ x: 50, y: 50, width: 300, height: 200 })

      const outline = document.getElementById('mirror-drop-parent-outline')
      expect(outline).not.toBeNull()
    })
  })

  describe('hideAll', () => {
    it('removes all visual elements', () => {
      const port = createDOMVisualPort(container)

      port.showIndicator({
        type: 'line',
        rect: { x: 100, y: 100, width: 200, height: 2 },
        direction: 'horizontal',
      })
      port.showOutline({ x: 50, y: 50, width: 300, height: 200 })

      port.hideAll()

      expect(document.getElementById('mirror-drop-indicator')).toBeNull()
      expect(document.getElementById('mirror-parent-outline')).toBeNull()
    })
  })
})

// ============================================
// DOM Target Detection Port Tests
// ============================================

describe('DOMTargetDetectionPort', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createTestContainer()
    container.setAttribute('data-mirror-id', 'container-1')
    container.style.display = 'flex'
    container.style.flexDirection = 'column'
  })

  afterEach(() => {
    cleanupTestContainer()
  })

  describe('findTarget', () => {
    it('returns null when no element at point', () => {
      // Mock elementFromPoint since JSDOM doesn't support it
      const originalElementFromPoint = document.elementFromPoint
      document.elementFromPoint = vi.fn().mockReturnValue(null)

      try {
        const port = createDOMTargetDetectionPort({ container })
        const source: DragSource = { type: 'palette', componentName: 'Frame' }

        // Point outside any element
        const target = port.findTarget({ x: -1000, y: -1000 }, source)

        expect(target).toBeNull()
      } finally {
        document.elementFromPoint = originalElementFromPoint
      }
    })

    // Note: elementFromPoint in JSDOM doesn't work well, so we test the interface
  })

  describe('calculateResult', () => {
    it('returns a valid DropResult', () => {
      const port = createDOMTargetDetectionPort({ container })

      const target: DropTarget = {
        nodeId: 'container-1',
        element: container,
        layoutType: 'flex',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const source: DragSource = { type: 'palette', componentName: 'Frame' }
      const containerRect: Rect = { x: 0, y: 0, width: 400, height: 300 }

      const result = port.calculateResult(
        { x: 200, y: 150 },
        target,
        source,
        [],
        containerRect
      )

      expect(result).toHaveProperty('target')
      expect(result).toHaveProperty('placement')
      expect(result).toHaveProperty('targetId')
    })
  })

  describe('getVisualHint', () => {
    it('returns null for no-op result', () => {
      const port = createDOMTargetDetectionPort({ container })

      const target: DropTarget = {
        nodeId: 'container-1',
        element: container,
        layoutType: 'flex',
        direction: 'vertical',
        hasChildren: false,
        isPositioned: false,
      }
      const containerRect: Rect = { x: 0, y: 0, width: 400, height: 300 }

      const hint = port.getVisualHint(
        { target, placement: 'inside', targetId: 'container-1', isNoOp: true },
        [],
        containerRect
      )

      expect(hint).toBeNull()
    })
  })
})

// ============================================
// Combined DOM Ports Tests
// ============================================

describe('createDOMPorts', () => {
  let container: HTMLElement

  beforeEach(() => {
    container = createTestContainer()
  })

  afterEach(() => {
    cleanupTestContainer()
  })

  it('creates all ports', () => {
    const mockExecutorDeps = {
      getSource: () => '',
      getResolvedSource: () => '',
      getPreludeOffset: () => 0,
      getSourceMap: () => null,
      applyChange: vi.fn(),
      recompile: vi.fn().mockResolvedValue(undefined),
    }

    const ports = createDOMPorts({
      container,
      executorDeps: mockExecutorDeps,
    })

    expect(ports.layout).toBeDefined()
    expect(ports.style).toBeDefined()
    expect(ports.events).toBeDefined()
    expect(ports.visual).toBeDefined()
    expect(ports.execution).toBeDefined()
    expect(ports.targetDetection).toBeDefined()
  })
})
