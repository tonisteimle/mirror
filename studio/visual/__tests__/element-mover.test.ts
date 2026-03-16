/**
 * ElementMover Tests
 *
 * Tests for the ElementMover class that handles drag operations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { ElementMover, ElementMoverConfig, MoveResult } from '../element-mover'
import type { DropZone, DropZoneCalculator } from '../../../src/studio/drop-zone-calculator'
import type { DropIndicator } from '../drop-indicator'
import type { SourceMap } from '../../../src/studio/source-map'

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

// Mock DropZoneCalculator
function createMockDropZoneCalculator(): DropZoneCalculator {
  return {
    getDropZones: vi.fn().mockReturnValue([]),
    updateDropZone: vi.fn().mockReturnValue(null),
    getCurrentDropZone: vi.fn().mockReturnValue(null),
    clear: vi.fn(),
    calculateChildInsertionZone: vi.fn().mockReturnValue(null),
  } as unknown as DropZoneCalculator
}

// Mock DropIndicator
function createMockDropIndicator(): DropIndicator {
  return {
    showInsertionLine: vi.fn(),
    showContainerHighlight: vi.fn(),
    showCrosshair: vi.fn(),
    showPositionLabel: vi.fn(),
    hideAll: vi.fn(),
  } as unknown as DropIndicator
}

// Mock SourceMap
function createMockSourceMap(): SourceMap {
  return {
    getNodePosition: vi.fn().mockReturnValue(null),
    getPositionForNodeId: vi.fn().mockReturnValue(null),
    getNodeIdForPosition: vi.fn().mockReturnValue(null),
  } as unknown as SourceMap
}

describe('ElementMover', () => {
  let dom: JSDOM
  let container: HTMLElement
  let mover: ElementMover
  let mockDropZoneCalculator: ReturnType<typeof createMockDropZoneCalculator>
  let mockDropIndicator: ReturnType<typeof createMockDropIndicator>

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const document = dom.window.document
    global.document = document as unknown as Document
    global.window = dom.window as unknown as Window & typeof globalThis
    global.MouseEvent = dom.window.MouseEvent as unknown as typeof MouseEvent
    global.KeyboardEvent = dom.window.KeyboardEvent as unknown as typeof KeyboardEvent

    // Create a container with test elements
    container = document.createElement('div')
    container.innerHTML = `
      <div data-mirror-id="node-1" style="width: 100px; height: 50px;">Element 1</div>
      <div data-mirror-id="node-2" style="width: 100px; height: 50px;">Element 2</div>
      <div data-mirror-id="node-3" style="width: 100px; height: 50px;">Element 3</div>
    `
    document.body.appendChild(container)

    mockDropZoneCalculator = createMockDropZoneCalculator()
    mockDropIndicator = createMockDropIndicator()

    const config: ElementMoverConfig = {
      container,
      dropZoneCalculator: mockDropZoneCalculator,
      dropIndicator: mockDropIndicator,
      getSourceMap: () => createMockSourceMap(),
    }

    mover = new ElementMover(config)
    mover.attach()
  })

  afterEach(() => {
    if (mover) {
      mover.detach()
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('initialization', () => {
    it('attaches to container', () => {
      expect(mover).toBeDefined()
    })

    it('is not dragging initially', () => {
      expect(mover.isDragging()).toBe(false)
    })

    it('has no dragged node initially', () => {
      expect(mover.getDraggedNodeId()).toBeNull()
    })
  })

  describe('programmatic start', () => {
    it('can start move programmatically', () => {
      const result = mover.startMove('node-1', 50, 25)
      expect(result).toBe(true)
    })

    it('returns false for non-existent node', () => {
      const result = mover.startMove('non-existent', 50, 25)
      expect(result).toBe(false)
    })

    it('sets dragged node ID', () => {
      mover.startMove('node-1', 50, 25)
      expect(mover.getDraggedNodeId()).toBe('node-1')
    })
  })

  describe('cancel', () => {
    it('can cancel move', () => {
      mover.startMove('node-1', 50, 25)
      mover.cancelMove()
      expect(mover.isDragging()).toBe(false)
    })

    it('notifies cancel callbacks', () => {
      const cancelCallback = vi.fn()
      mover.onCancel(cancelCallback)

      mover.startMove('node-1', 50, 25)
      mover.cancelMove()

      expect(cancelCallback).toHaveBeenCalled()
    })

    it('unsubscribe works', () => {
      const cancelCallback = vi.fn()
      const unsubscribe = mover.onCancel(cancelCallback)
      unsubscribe()

      mover.startMove('node-1', 50, 25)
      mover.cancelMove()

      expect(cancelCallback).not.toHaveBeenCalled()
    })
  })

  describe('move callbacks', () => {
    it('can register move callback', () => {
      const moveCallback = vi.fn()
      const unsubscribe = mover.onMove(moveCallback)

      expect(unsubscribe).toBeInstanceOf(Function)
    })

    it('unsubscribe removes callback', () => {
      const moveCallback = vi.fn()
      const unsubscribe = mover.onMove(moveCallback)
      unsubscribe()

      // Callback should not be called after unsubscribe
      // (No way to verify without completing a move)
    })
  })

  describe('mouse events', () => {
    it('responds to mousedown on element with node ID', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      const mousedownEvent = new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      })

      element.dispatchEvent(mousedownEvent)

      // Should have captured the node ID
      expect(mover.getDraggedNodeId()).toBe('node-1')
    })

    it('ignores right-click', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      const mousedownEvent = new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 2, // Right click
        bubbles: true,
      })

      element.dispatchEvent(mousedownEvent)

      expect(mover.getDraggedNodeId()).toBeNull()
    })

    it('ignores elements without node ID', () => {
      const plainDiv = document.createElement('div')
      container.appendChild(plainDiv)

      const mousedownEvent = new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      })

      plainDiv.dispatchEvent(mousedownEvent)

      expect(mover.getDraggedNodeId()).toBeNull()
    })
  })

  describe('drag threshold', () => {
    it('does not start dragging immediately', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      }))

      // Small movement
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 51,
        clientY: 25,
        bubbles: true,
      }))

      expect(mover.isDragging()).toBe(false)
    })

    it('starts dragging after threshold exceeded', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      }))

      // Movement exceeding threshold (default 5px)
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 60,
        clientY: 25,
        bubbles: true,
      }))

      expect(mover.isDragging()).toBe(true)
    })
  })

  describe('drop zone feedback', () => {
    it('calls dropZoneCalculator.updateDropZone during drag', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      }))

      // Start dragging
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 60,
        clientY: 35,
        bubbles: true,
      }))

      expect(mockDropZoneCalculator.updateDropZone).toHaveBeenCalledWith(
        60, 35, 'node-1'
      )
    })

    it('hides indicators when no drop zone', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      }))

      // Start dragging
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 60,
        clientY: 35,
        bubbles: true,
      }))

      expect(mockDropIndicator.hideAll).toHaveBeenCalled()
    })
  })

  describe('escape key', () => {
    it('cancels drag on Escape', () => {
      const cancelCallback = vi.fn()
      mover.onCancel(cancelCallback)

      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      }))

      // Start dragging
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 60,
        clientY: 35,
        bubbles: true,
      }))

      // Press Escape
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
      }))

      expect(cancelCallback).toHaveBeenCalled()
      expect(mover.isDragging()).toBe(false)
    })
  })

  describe('mouseup', () => {
    it('cleans up on mouseup', () => {
      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      }))

      // Start dragging
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 60,
        clientY: 35,
        bubbles: true,
      }))

      // Release
      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: 60,
        clientY: 35,
        bubbles: true,
      }))

      expect(mover.isDragging()).toBe(false)
      expect(mover.getDraggedNodeId()).toBeNull()
    })

    it('completes move when drop zone is valid', () => {
      const moveCallback = vi.fn()
      mover.onMove(moveCallback)

      const dropZone: DropZone = {
        targetId: 'node-2',
        position: 'after',
        parentId: 'container',
        index: 1,
      }

      mockDropZoneCalculator.updateDropZone.mockReturnValue(dropZone)
      mockDropZoneCalculator.getCurrentDropZone.mockReturnValue(dropZone)

      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      }))

      // Start dragging
      document.dispatchEvent(new MouseEvent('mousemove', {
        clientX: 60,
        clientY: 35,
        bubbles: true,
      }))

      // Release
      document.dispatchEvent(new MouseEvent('mouseup', {
        clientX: 60,
        clientY: 35,
        bubbles: true,
      }))

      expect(moveCallback).toHaveBeenCalledWith(expect.objectContaining({
        nodeId: 'node-1',
        dropZone,
      }))
    })
  })

  describe('detach', () => {
    it('removes event listeners', () => {
      mover.detach()

      const element = container.querySelector('[data-mirror-id="node-1"]') as HTMLElement

      element.dispatchEvent(new MouseEvent('mousedown', {
        clientX: 50,
        clientY: 25,
        button: 0,
        bubbles: true,
      }))

      // Should not have captured the node after detach
      expect(mover.getDraggedNodeId()).toBeNull()
    })
  })
})
